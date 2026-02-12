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
  const [hasWebcam, setHasWebcam] = useState(true); // NUEVO: Para saber si bloquear el botón

  // Refs
  const peerRef = useRef(null);
  const channelRef = useRef(null);
  const streamRef = useRef(null);
  const callsRef = useRef({});
  const myJoinTime = useRef(Date.now()); 

  const myUsername = session.user.user_metadata?.username || 'Usuario';
  const myAvatar = session.user.user_metadata?.avatar_url;
  const myUserId = session.user.id;

  // 1. INICIALIZACIÓN
  useEffect(() => {
    if (!roomId || !session) return;
    let isMounted = true;

    const init = async () => {
      try {
        setStatusMsg('1. Hardware...');
        
        let stream;
        try {
            // INTENTO 1: Pedir Cámara y Micro reales
            stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            setHasWebcam(true);
        } catch (err) {
            console.warn("⚠️ No se detectó cámara real, usando modo fantasma.");
            setHasWebcam(false); // Desactivamos botón de cámara en UI
            
            // INTENTO 2: Pedir SOLO Audio y agregar Video Falso
            const audioStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
            
            // CREAR CÁMARA FANTASMA (CANVAS NEGRO)
            const canvas = document.createElement('canvas');
            canvas.width = 640;
            canvas.height = 480;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = 'black';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Generar stream de 30fps del cuadro negro
            const fakeStream = canvas.captureStream(30);
            const fakeVideoTrack = fakeStream.getVideoTracks()[0];
            fakeVideoTrack.enabled = false; // Lo apagamos para no gastar recursos
            
            // Combinar Audio Real + Video Falso
            audioStream.addTrack(fakeVideoTrack);
            stream = audioStream;
        }

        // Apagamos el video inicialmente (sea real o falso) para entrar en modo "Solo Audio"
        stream.getVideoTracks().forEach(track => {
            track.enabled = false; 
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
        console.error("Error Fatal:", err);
        setStatusMsg('Error: Se requiere al menos micrófono');
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

  // 3. CONEXIÓN JERÁRQUICA (IGUAL)
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
    if (!hasWebcam) {
        alert("No se detectó una cámara web conectada.");
        return;
    }
    if (streamRef.current) {
        const videoTrack = streamRef.current.getVideoTracks()[0];
        if (videoTrack) {
            videoTrack.enabled = !videoTrack.enabled;
            setCameraOn(videoTrack.enabled);
        }
    }
  };

  const handleRefresh = () => { if(myPeerId) joinRoomPresence(myPeerId); };

  return {
    localStream, remoteStreams, detectedUsers,
    statusMsg, supabaseStatus, cameraOn, micOn,
    isHost, hasWebcam, // <--- Exportamos esto para bloquear el botón en UI si quieres
    myAvatar,
    toggleMic, toggleCamera, handleManualDisconnect, handleRefresh
  };
}