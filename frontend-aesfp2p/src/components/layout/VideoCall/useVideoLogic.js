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
  const [isHost, setIsHost] = useState(false); // ¿Soy el Host?
  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(true);

  // Refs
  const peerRef = useRef(null);
  const channelRef = useRef(null);
  const streamRef = useRef(null);
  const callsRef = useRef({});
  
  // Guardamos mi hora de llegada exacta para definir jerarquía
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
        const stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
        
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

        // SOLO CONTESTAMOS LLAMADAS (Los "Viejos" esperan aquí)
        peer.on('call', (call) => {
           console.log("📞 Recibiendo llamada de:", call.peer);
           if (callsRef.current[call.peer]) return; // Evitar duplicados

           call.answer(streamRef.current);
           setupCallEvents(call, call.peer);
        });

      } catch (err) {
        console.error("Error:", err);
        setStatusMsg('Error Acceso Mic/Cam');
      }
    };

    init();
    return () => { isMounted = false; safeCleanup(); };
  }, [roomId]);

  // CONFIGURACIÓN DE EVENTOS DE LLAMADA (MEJORADA PARA DETECTAR CAMBIOS DE VIDEO)
  const setupCallEvents = (call, peerId) => {
      callsRef.current[peerId] = call;

      call.on('stream', (rs) => {
          console.log("📺 Stream inicial recibido de:", peerId);
          setRemoteStreams(prev => ({ ...prev, [peerId]: rs }));
      });

      // IMPORTANTE: Escuchar cuando agregan video en vivo (Renegociación)
      if (call.peerConnection) {
          call.peerConnection.ontrack = (event) => {
              console.log("🔄 Nuevo Track detectado:", event.track.kind);
              if (event.streams && event.streams[0]) {
                  setRemoteStreams(prev => ({ ...prev, [peerId]: event.streams[0] }));
              }
          };
      }

      call.on('close', () => removeRemoteStream(peerId));
      call.on('error', () => removeRemoteStream(peerId));
  };

  // 2. PRESENCE (Aquí definimos quién es el Host)
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

        // Ordenamos por antigüedad: El más viejo es el primero (Host)
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
                 online_at: myOnlineAt // Clave para el orden
              });
           };
           await sendTrack();
           
           // Heartbeat cada 5s
           const interval = setInterval(() => { if(channelRef.current) sendTrack(); }, 5000);
           return () => clearInterval(interval);
        }
      });
  };

  // 3. CONEXIÓN JERÁRQUICA (SOLUCIÓN DEFINITIVA)
  useEffect(() => {
    if (!myPeerId || !streamRef.current) return;
    
    const interval = setInterval(() => {
      detectedUsers.forEach(user => {
        const targetId = user.peerId;

        if (remoteStreams[targetId]) return;
        if (callsRef.current[targetId]) return;

        const myTime = myJoinTime.current;
        const targetTime = new Date(user.online_at).getTime();
        
        // REGLA: El "Nuevo" (tiempo mayor) llama al "Viejo" (tiempo menor).
        if (myTime > targetTime) {
            console.log(`📞 Soy el nuevo. Llamando al veterano: ${user.username}`);
            callUser(targetId);
        } else {
            // Soy veterano, espero pacientemente.
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
      if (t) { t.enabled = !t.enabled; setMicOn(t.enabled); }
    }
  };

  const toggleCamera = async () => {
    if (cameraOn) {
      // APAGAR CÁMARA
      streamRef.current.getVideoTracks().forEach(t => { t.stop(); t.enabled = false; });
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        updateStream(audioStream);
        setCameraOn(false);
        handleRefresh(); // Avisar cambio
      } catch(e) {}
    } else {
      // PRENDER CÁMARA
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setCameraOn(true); 
        setMicOn(true); 
        updateStream(newStream);
        handleRefresh(); // Avisar cambio crítico
      } catch (err) { alert("Error: Cámara ocupada o denegada"); }
    }
  };

  const updateStream = (newStream) => {
      setLocalStream(newStream); 
      streamRef.current = newStream;
      
      Object.values(callsRef.current).forEach(call => {
          if(!call.peerConnection) return;
          
          const senders = call.peerConnection.getSenders();
          const vSender = senders.find(s => s.track?.kind === 'video');
          const aSender = senders.find(s => s.track?.kind === 'audio');
          
          if (vSender && newStream.getVideoTracks()[0]) {
              vSender.replaceTrack(newStream.getVideoTracks()[0]);
          }
          if (aSender && newStream.getAudioTracks()[0]) {
              aSender.replaceTrack(newStream.getAudioTracks()[0]);
          }
      });
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