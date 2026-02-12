import { useEffect, useState, useRef } from 'react';
import Peer from 'peerjs';
import { supabase } from '../../../lib/supabase'; 

export function useVideoLogic(roomId, session, onLeave) {
  const [myPeerId, setMyPeerId] = useState('');
  const [remoteStreams, setRemoteStreams] = useState({});
  const [localStream, setLocalStream] = useState(null);
  const [detectedUsers, setDetectedUsers] = useState([]);
  
  // Estados de UI y Debug
  const [statusMsg, setStatusMsg] = useState('Iniciando motores...');
  const [supabaseStatus, setSupabaseStatus] = useState('DISCONNECTED');
  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(true);

  // Referencias
  const peerRef = useRef(null);
  const channelRef = useRef(null);
  const streamRef = useRef(null);
  const callsRef = useRef({});
  const retryInterval = useRef(null);
  
  // NUEVO: Evita llamar dos veces a la misma persona
  const pendingCalls = useRef({}); 

  const myUsername = session.user.user_metadata?.username || 'Usuario';
  const myAvatar = session.user.user_metadata?.avatar_url;
  const myUserId = session.user.id;

  // INICIALIZACIÓN
  useEffect(() => {
    if (!roomId || !session) return;
    let isMounted = true;

    const init = async () => {
      try {
        setStatusMsg('1. Accediendo a hardware...');
        const stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
        
        if (!isMounted) return;
        setLocalStream(stream);
        streamRef.current = stream;

        setStatusMsg('2. Conectando a PeerJS (Google STUN)...');
        
        // CONFIGURACIÓN DE ESTABILIDAD
        const peer = new Peer(undefined, {
          debug: 1, // Muestra errores leves
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' },
            ]
          },
          // Ping para mantener la conexión viva (Heartbeat de PeerJS)
          pingInterval: 5000, 
        });
        
        peerRef.current = peer;

        peer.on('open', (id) => {
          if (!isMounted) return;
          console.log("✅ PeerJS Listo. ID:", id);
          setMyPeerId(id);
          setStatusMsg('3. Conectando a Sala...');
          joinRoomPresence(id);
        });

        peer.on('disconnected', () => {
             console.warn("PeerJS desconectado. Intentando reconectar...");
             if(peer && !peer.destroyed) peer.reconnect();
        });

        peer.on('error', (err) => {
           console.warn("⚠️ Error PeerJS:", err);
           // Ignoramos errores menores de red
           if (err.type === 'peer-unavailable') {
               const deadPeer = err.message.split(' ').pop();
               removeRemoteStream(deadPeer);
           }
        });

        peer.on('call', (call) => {
           console.log("📞 Recibiendo llamada de:", call.peer);
           
           // Si ya estamos hablando con él, no contestar de nuevo para evitar ecos
           if (callsRef.current[call.peer]?.open) return;

           call.answer(streamRef.current);
           callsRef.current[call.peer] = call;
           
           call.on('stream', (rs) => {
               setRemoteStreams(prev => ({ ...prev, [call.peer]: rs }));
           });
           // Limpieza segura
           call.on('close', () => removeRemoteStream(call.peer));
           call.on('error', () => removeRemoteStream(call.peer));
        });

      } catch (err) {
        console.error("Error Fatal:", err);
        setStatusMsg('Error: No se pudo acceder al micrófono');
      }
    };

    init();
    return () => { isMounted = false; safeCleanup(); };
  }, [roomId]);

  // PRESENCE & CONEXIÓN
  const joinRoomPresence = (peerId) => {
    if (channelRef.current) supabase.removeChannel(channelRef.current).catch(()=>{});

    const uniquePresenceKey = `${myUserId}-${peerId}`;
    const cleanRoomId = roomId.replace(/[^a-zA-Z0-9]/g, '');
    const channel = supabase.channel(`room_${cleanRoomId}`, {
      config: { presence: { key: uniquePresenceKey } },
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
        const others = users.filter(u => u.userId !== myUserId);
        setDetectedUsers(others);
        
        if (others.length > 0) setStatusMsg(`✅ Conectado con ${others.length}`);
        else setStatusMsg('🟢 En línea (Esperando...)');
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
                 online_at: new Date().toISOString()
              });
           };
           await sendTrack();
           if (retryInterval.current) clearInterval(retryInterval.current);
           retryInterval.current = setInterval(() => { if(channelRef.current) sendTrack(); }, 10000);
        }
      });
  };

  // ============================================
  // EL RECONECTOR ESTABILIZADO (LA SOLUCIÓN)
  // ============================================
  useEffect(() => {
    if (!myPeerId || !streamRef.current) return;
    
    const interval = setInterval(() => {
      detectedUsers.forEach(user => {
        const targetId = user.peerId;

        // 1. Si ya tengo su video, todo bien.
        if (remoteStreams[targetId]) return;

        // 2. Si ya tengo una llamada abierta, todo bien.
        if (callsRef.current[targetId]?.open) return;

        // 3. NUEVO: Si ya estoy intentando llamar ("Timbrando"), ESPERAR.
        if (pendingCalls.current[targetId]) {
            // Check de seguridad: Si lleva "timbrando" más de 10 segundos, soltamos para reintentar
            if (Date.now() - pendingCalls.current[targetId] > 10000) {
                pendingCalls.current[targetId] = null;
            } else {
                return; // Todavía está intentando conectar, paciencia.
            }
        }

        console.log("🔄 Iniciando llamada estable a:", user.username);
        callUser(targetId);
      });
    }, 3000); // Revisar cada 3 segundos

    return () => clearInterval(interval);
  }, [detectedUsers, myPeerId, remoteStreams]);

  // FUNCIONES AUXILIARES
  const safeCleanup = async () => {
      if (retryInterval.current) clearInterval(retryInterval.current);
      if (channelRef.current) {
          const ch = channelRef.current; channelRef.current = null;
          try { await ch.untrack(); } catch(e){}
          try { await supabase.removeChannel(ch); } catch(e){}
      }
      if (peerRef.current) { peerRef.current.destroy(); peerRef.current = null; }
      if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
  };

  const removeRemoteStream = (peerId) => {
      // Limpiamos todo rastro de ese usuario
      setRemoteStreams(prev => { const n = { ...prev }; delete n[peerId]; return n; });
      if (callsRef.current[peerId]) { callsRef.current[peerId].close(); delete callsRef.current[peerId]; }
      if (pendingCalls.current[peerId]) delete pendingCalls.current[peerId];
  };

  const callUser = (remotePeerId) => {
    try {
        // Marcamos como "Llamando" para no spammear
        pendingCalls.current[remotePeerId] = Date.now();

        const call = peerRef.current.call(remotePeerId, streamRef.current);
        if (!call) {
            delete pendingCalls.current[remotePeerId];
            return;
        }

        callsRef.current[remotePeerId] = call;
        
        call.on('stream', (rs) => {
            // ¡ÉXITO! Ya tenemos video, borramos el estado de "pendiente"
            delete pendingCalls.current[remotePeerId];
            setRemoteStreams(prev => ({ ...prev, [remotePeerId]: rs }));
        });

        call.on('close', () => removeRemoteStream(remotePeerId));
        call.on('error', () => removeRemoteStream(remotePeerId));
    } catch (e) { 
        console.error("Error al llamar:", e); 
        delete pendingCalls.current[remotePeerId];
    }
  };

  // ... (El resto de funciones de controles sigue igual)
  const handleManualDisconnect = async () => { await safeCleanup(); if (onLeave) onLeave(); };
  
  const toggleMic = () => {
    if (streamRef.current) {
      const t = streamRef.current.getAudioTracks()[0];
      if (t) { t.enabled = !t.enabled; setMicOn(t.enabled); }
    }
  };

  const toggleCamera = async () => {
    if (cameraOn) {
      streamRef.current.getVideoTracks().forEach(t => { t.stop(); t.enabled = false; });
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        updateStream(audioStream);
        setCameraOn(false);
      } catch(e) {}
    } else {
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setCameraOn(true); setMicOn(true); updateStream(newStream);
      } catch (err) { alert("Permiso denegado"); }
    }
  };

  const updateStream = (newStream) => {
      setLocalStream(newStream); streamRef.current = newStream;
      Object.values(callsRef.current).forEach(call => {
          const vSender = call.peerConnection.getSenders().find(s => s.track?.kind === 'video');
          const aSender = call.peerConnection.getSenders().find(s => s.track?.kind === 'audio');
          if (vSender && newStream.getVideoTracks()[0]) vSender.replaceTrack(newStream.getVideoTracks()[0]);
          if (aSender && newStream.getAudioTracks()[0]) aSender.replaceTrack(newStream.getAudioTracks()[0]);
          if (!vSender && newStream.getVideoTracks()[0]) callUser(call.peer);
      });
  };

  const handleRefresh = () => { if(myPeerId) joinRoomPresence(myPeerId); };

  return {
    localStream, remoteStreams, detectedUsers,
    statusMsg, supabaseStatus, cameraOn, micOn,
    myAvatar,
    toggleMic, toggleCamera, handleManualDisconnect, handleRefresh
  };
}