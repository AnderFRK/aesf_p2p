import { useEffect, useState, useRef } from 'react';
import Peer from 'peerjs';
import { supabase } from '../lib/supabase'; 

export function useVideoLogic(roomId, session, onLeave) {
  // 1. Datos de Usuario (Protegidos)
  const myUserId = session?.user?.id || `guest-${Math.floor(Math.random() * 10000)}`;
  const myUsername = session?.user?.user_metadata?.username || 'Usuario';
  const myAvatar = session?.user?.user_metadata?.avatar_url;

  // Estados
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
  
  // Hardware
  const [hasWebcam, setHasWebcam] = useState(true);
  const [hasMic, setHasMic] = useState(true);

  // Refs
  const peerRef = useRef(null);
  const channelRef = useRef(null);
  const streamRef = useRef(null);
  const callsRef = useRef({});
  const myJoinTime = useRef(Date.now()); 
  const mountedRef = useRef(true); // --- FIX: Para evitar actualizaciones en componentes desmontados

  // --- FUNCIONES HARDWARE FALSO (Igual que antes) ---
  const createFakeVideoTrack = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 640; canvas.height = 480;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'black'; ctx.fillRect(0, 0, 640, 480);
    const stream = canvas.captureStream(1); 
    const track = stream.getVideoTracks()[0];
    track.enabled = false; 
    return track;
  };

  const createFakeAudioTrack = () => {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const dst = ctx.createMediaStreamDestination();
    osc.connect(dst); osc.start();
    const track = dst.stream.getAudioTracks()[0];
    track.enabled = false;
    return track;
  };

  // --- INIT PRINCIPAL ---
  useEffect(() => {
    if (!roomId) return;
    mountedRef.current = true; // --- FIX: Marcar como montado

    const init = async () => {
      try {
        setStatusMsg('1. Hardware...');
        
        let stream = new MediaStream();
        
        // Video
        try {
            const videoStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            const videoTrack = videoStream.getVideoTracks()[0];
            videoTrack.enabled = false;
            stream.addTrack(videoTrack);
            setHasWebcam(true);
        } catch (e) {
            console.warn("📷 Sin cámara: Usando video fantasma.");
            setHasWebcam(false);
            stream.addTrack(createFakeVideoTrack());
        }

        // Audio
        try {
            const audioStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
            const audioTrack = audioStream.getAudioTracks()[0];
            stream.addTrack(audioTrack);
            setHasMic(true);
            setMicOn(true);
        } catch (e) {
            console.warn("🎤 Sin micrófono: Modo Espectador.");
            setHasMic(false);
            setMicOn(false);
            stream.addTrack(createFakeAudioTrack());
        }

        if (!mountedRef.current) return; // --- FIX: Si se desmontó, parar aquí
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
          if (!mountedRef.current) return; // --- FIX
          console.log("✅ Mi ID:", id);
          setMyPeerId(id);
          setStatusMsg('3. Sincronizando...');
          joinRoomPresence(id); // Conectar a Supabase solo cuando tengamos ID
        });

        peer.on('call', (call) => {
           console.log("📞 Recibiendo llamada de:", call.peer);
           if (callsRef.current[call.peer]) return;
           call.answer(streamRef.current);
           setupCallEvents(call, call.peer);
        });
        
        peer.on('error', (err) => console.error("PeerJS Error:", err));

      } catch (err) {
        console.error("Error Fatal:", err);
        setStatusMsg('Error Crítico');
      }
    };

    init();

    // --- FIX: Cleanup robusto al desmontar ---
    return () => { 
      mountedRef.current = false; 
      safeCleanup(); 
    };
  }, [roomId]); // Dependencias mínimas

  // --- FUNCIONES AUXILIARES ---

  const setupCallEvents = (call, peerId) => {
      callsRef.current[peerId] = call;
      call.on('stream', (rs) => setRemoteStreams(prev => ({ ...prev, [peerId]: rs })));
      call.on('close', () => removeRemoteStream(peerId));
      call.on('error', () => removeRemoteStream(peerId));
  };

  const joinRoomPresence = (peerId) => {
    // --- FIX: Limpiar canal previo antes de crear uno nuevo ---
    if (channelRef.current) {
        supabase.removeChannel(channelRef.current).catch(()=>{});
        channelRef.current = null;
    }

    // --- FIX: Usar ID único basado en peerId para evitar colisiones ---
    const uniqueKey = `${myUserId}-${peerId}`; 
    const myOnlineAt = new Date(myJoinTime.current).toISOString();

    const channel = supabase.channel(`room_${roomId}`, {
      config: { presence: { key: uniqueKey } },
    });
    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        if (!mountedRef.current) return; // --- FIX
        const newState = channel.presenceState();
        const users = [];
        
        for (const key in newState) {
           // Supabase devuelve array, tomamos el primero
           const u = newState[key][0]; 
           if (u && u.peerId) users.push(u);
        }
        
        // Ordenar por antigüedad
        users.sort((a, b) => new Date(a.online_at) - new Date(b.online_at));
        
        // Determinar Host
        const amIHost = users.length > 0 && users[0].peerId === peerId;
        setIsHost(amIHost);
        
        // Filtrar otros
        const others = users.filter(u => u.peerId !== peerId);
        setDetectedUsers(others);
        
        const role = amIHost ? 'HOST' : 'GUEST';
        setStatusMsg(others.length > 0 ? `Conectado (${role})` : `🟢 Esperando (${role})`);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
         leftPresences.forEach(left => removeRemoteStream(left.peerId));
      })
      .subscribe(async (status) => {
        if (!mountedRef.current) return; // --- FIX
        setSupabaseStatus(status);
        
        if (status === 'SUBSCRIBED') {
           const trackData = {
                 userId: myUserId,
                 username: myUsername,
                 avatar_url: myAvatar,
                 peerId: peerId,
                 online_at: myOnlineAt
           };
           
           await channel.track(trackData);
           
           // Heartbeat para mantener viva la conexión
           // --- FIX: Limpiamos intervalo al desmontar ---
           const interval = setInterval(async () => { 
               if(channelRef.current && mountedRef.current) {
                   await channel.track(trackData); 
               } else {
                   clearInterval(interval);
               }
           }, 5000);
        }
      });
  };

  // --- FIX: Loop de llamadas más seguro ---
  useEffect(() => {
    if (!myPeerId || !streamRef.current) return;
    
    const interval = setInterval(() => {
      if (!mountedRef.current) return;
      
      detectedUsers.forEach(user => {
        const targetId = user.peerId;
        // Si ya tengo stream o ya estoy llamando, ignorar
        if (remoteStreams[targetId] || callsRef.current[targetId]) return;

        const myTime = myJoinTime.current;
        const targetTime = new Date(user.online_at).getTime();
        
        // Solo el "nuevo" llama al "viejo"
        if (myTime > targetTime) {
            console.log(`📞 Llamando a: ${user.username}`);
            callUser(targetId);
        }
      });
    }, 3000);
    
    return () => clearInterval(interval);
  }, [detectedUsers, myPeerId, remoteStreams]);

  // --- CLEANUP ---
  const safeCleanup = async () => {
      console.log("🧹 Limpiando recursos...");
      if (channelRef.current) {
          await supabase.removeChannel(channelRef.current);
          channelRef.current = null;
      }
      if (peerRef.current) {
          peerRef.current.destroy();
          peerRef.current = null;
      }
      if (streamRef.current) {
          streamRef.current.getTracks().forEach(t => t.stop());
          streamRef.current = null;
      }
      setRemoteStreams({});
      setDetectedUsers([]);
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

  const handleManualDisconnect = () => { safeCleanup(); if (onLeave) onLeave(); };
  
  const toggleMic = () => {
    if (!hasMic) { alert("Sin micrófono."); return; }
    if (streamRef.current) {
      const t = streamRef.current.getAudioTracks()[0];
      if (t) { t.enabled = !t.enabled; setMicOn(t.enabled); }
    }
  };

  const toggleCamera = () => {
    if (!hasWebcam) { alert("Sin cámara."); return; }
    if (streamRef.current) {
        const t = streamRef.current.getVideoTracks()[0];
        if (t) { t.enabled = !t.enabled; setCameraOn(t.enabled); }
    }
  };

  const handleRefresh = () => { 
      if(myPeerId) joinRoomPresence(myPeerId); 
  };

  return {
    localStream, remoteStreams, detectedUsers,
    statusMsg, supabaseStatus, 
    cameraOn, micOn, 
    hasWebcam, hasMic,
    isHost, 
    myAvatar,
    toggleMic, toggleCamera, handleManualDisconnect, handleRefresh
  };
}