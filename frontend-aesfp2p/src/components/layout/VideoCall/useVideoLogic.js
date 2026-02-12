import { useEffect, useState, useRef } from 'react';
import Peer from 'peerjs';
import { supabase } from '../../../lib/supabase'; 

export function useVideoLogic(roomId, session, onLeave) {
  const [myPeerId, setMyPeerId] = useState('');
  const [remoteStreams, setRemoteStreams] = useState({});
  const [localStream, setLocalStream] = useState(null);
  const [detectedUsers, setDetectedUsers] = useState([]);
  
  // UI States
  const [statusMsg, setStatusMsg] = useState('Iniciando...');
  const [supabaseStatus, setSupabaseStatus] = useState('OFF');
  const [isHost, setIsHost] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(true);

  // Refs
  const peerRef = useRef(null);
  const channelRef = useRef(null);
  const streamRef = useRef(null);
  const callsRef = useRef({});
  
  const myJoinTime = useRef(Date.now()); 
  const myUsername = session.user.user_metadata?.username || 'Usuario';
  const myAvatar = session.user.user_metadata?.avatar_url;
  const myUserId = session.user.id;

  // 1. INICIALIZACIÓN (CAMBIO IMPORTANTE AQUÍ)
  useEffect(() => {
    if (!roomId || !session) return;
    let isMounted = true;

    const init = async () => {
      try {
        setStatusMsg('1. Hardware...');
        
        // TRUCO DE ESTABILIDAD:
        // Pedimos Video y Audio desde el inicio para crear la "tubería grande".
        // Pero inmediatamente APAGAMOS el video (enabled = false).
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        
        // Apagamos el video manualmente para entrar en modo "Solo Audio"
        stream.getVideoTracks().forEach(track => {
            track.enabled = false; // <-- Esto hace que se envíe "negro" pero mantiene la conexión viva
        });

        if (!isMounted) return;
        setLocalStream(stream);
        streamRef.current = stream;

        setStatusMsg('2. PeerJS...');
        const peer = new Peer(undefined, {
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' },
            ]
          }
        });
        peerRef.current = peer;

        peer.on('open', (id) => {
          if (!isMounted) return;
          console.log("✅ Mi ID:", id);
          setMyPeerId(id);
          setStatusMsg('3. Sincronizando...');
          joinRoomPresence(id);
        });

        peer.on('call', (call) => {
           console.log("📞 Recibiendo llamada de:", call.peer);
           if (callsRef.current[call.peer]) return;
           call.answer(streamRef.current);
           setupCallEvents(call, call.peer);
        });

      } catch (err) {
        console.error("Error:", err);
        // Si falla (ej: no tiene cámara), intentamos pedir SOLO audio
        try {
            const audioStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
            setLocalStream(audioStream);
            streamRef.current = audioStream;
            // ... (continuaría la lógica, pero simplifiquemos)
            alert("No se detectó cámara, entrando solo con audio.");
        } catch(e) {
            setStatusMsg('Error: Se requiere micrófono');
        }
      }
    };

    init();
    return () => { isMounted = false; safeCleanup(); };
  }, [roomId]);

  const setupCallEvents = (call, peerId) => {
      callsRef.current[peerId] = call;
      call.on('stream', (rs) => setRemoteStreams(prev => ({ ...prev, [peerId]: rs })));
      call.on('close', () => removeRemoteStream(peerId));
      call.on('error', () => removeRemoteStream(peerId));
  };

  // 2. PRESENCE (IGUAL)
  const joinRoomPresence = (peerId) => {
    if (channelRef.current) supabase.removeChannel(channelRef.current).catch(()=>{});

    const uniqueKey = `${myUserId}-${peerId}`;
    const myOnlineAt = new Date(myJoinTime.current).toISOString();

    const channel = supabase.channel(`room_${roomId}`, {
      config: { presence: { key: uniqueKey } },
    });
    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState();
        const users = [];
        for (const key in newState) {
           const u = newState[key][0]; 
           if (u && u.peerId) users.push(u);
        }
        users.sort((a, b) => new Date(a.online_at) - new Date(b.online_at));
        const amIHost = users.length > 0 && users[0].peerId === peerId;
        setIsHost(amIHost);
        const others = users.filter(u => u.peerId !== peerId);
        setDetectedUsers(others);
        
        const role = amIHost ? 'HOST' : 'GUEST';
        if (others.length > 0) setStatusMsg(`Conectado (${role})`);
        else setStatusMsg(`🟢 Esperando (${role})`);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
         leftPresences.forEach(left => removeRemoteStream(left.peerId));
      })
      .subscribe(async (status) => {
        setSupabaseStatus(status);
        if (status === 'SUBSCRIBED') {
           const sendTrack = async () => {
              if (!channelRef.current) return;
              await channel.track({
                 userId: myUserId,
                 username: myUsername,
                 avatar_url: myAvatar,
                 peerId: peerId,
                 online_at: myOnlineAt
              });
           };
           await sendTrack();
           const interval = setInterval(() => { if(channelRef.current) sendTrack(); }, 5000);
           return () => clearInterval(interval);
        }
      });
  };

  // 3. CONEXIÓN JERÁRQUICA (IGUAL - SIN TOCAR)
  useEffect(() => {
    if (!myPeerId || !streamRef.current) return;
    const interval = setInterval(() => {
      detectedUsers.forEach(user => {
        const targetId = user.peerId;
        if (remoteStreams[targetId]) return;
        if (callsRef.current[targetId]) return;

        const myTime = myJoinTime.current;
        const targetTime = new Date(user.online_at).getTime();
        
        if (myTime > targetTime) {
            console.log(`📞 Llamando a: ${user.username}`);
            callUser(targetId);
        }
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [detectedUsers, myPeerId, remoteStreams]);

  // AUXILIARES
  const safeCleanup = async () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      if (peerRef.current) peerRef.current.destroy();
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
  };

  const removeRemoteStream = (peerId) => {
      setRemoteStreams(prev => { const n = { ...prev }; delete n[peerId]; return n; });
      if (callsRef.current[peerId]) { 
          callsRef.current[peerId].close(); 
          delete callsRef.current[peerId]; 
      }
  };

  const callUser = (remotePeerId) => {
    try {
        const call = peerRef.current.call(remotePeerId, streamRef.current);
        if (!call) return;
        setupCallEvents(call, remotePeerId);
    } catch (e) { console.error(e); }
  };

  const handleManualDisconnect = async () => { await safeCleanup(); if (onLeave) onLeave(); };
  
  // ----------------------------------------------------
  // LOGICA SUPER SIMPLE DE CAMARA (SIN RECONEXIÓN)
  // ----------------------------------------------------
  
  const toggleMic = () => {
    if (streamRef.current) {
      const t = streamRef.current.getAudioTracks()[0];
      if (t) { 
          t.enabled = !t.enabled; 
          setMicOn(t.enabled); 
      }
    }
  };

  const toggleCamera = () => {
    if (streamRef.current) {
        const videoTrack = streamRef.current.getVideoTracks()[0];
        if (videoTrack) {
            // AQUÍ ESTÁ EL TRUCO: Solo prendemos/apagamos el interruptor
            // No colgamos, no reiniciamos, no renegociamos.
            videoTrack.enabled = !videoTrack.enabled;
            setCameraOn(videoTrack.enabled);
        } else {
            alert("No se detectó cámara al inicio.");
        }
    }
  };

  const handleRefresh = () => { if(myPeerId) joinRoomPresence(myPeerId); };

  return {
    localStream, remoteStreams, detectedUsers,
    statusMsg, supabaseStatus, cameraOn, micOn,
    isHost,
    myAvatar,
    toggleMic, toggleCamera, handleManualDisconnect, handleRefresh
  };
}