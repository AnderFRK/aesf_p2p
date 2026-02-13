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
  
  // ESTADOS DE HARDWARE (Para saber qué botones bloquear)
  const [hasWebcam, setHasWebcam] = useState(true);
  const [hasMic, setHasMic] = useState(true); // <--- NUEVO

  // Refs
  const peerRef = useRef(null);
  const channelRef = useRef(null);
  const streamRef = useRef(null);
  const callsRef = useRef({});
  const myJoinTime = useRef(Date.now()); 

  const myUsername = session.user.user_metadata?.username || 'Usuario';
  const myAvatar = session.user.user_metadata?.avatar_url;
  const myUserId = session.user.id;

  // --- FUNCIONES AUXILIARES DE HARDWARE FALSO ---

  // Genera un video negro a 1 FPS (Ahorro máximo de recursos)
  const createFakeVideoTrack = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // OPTIMIZACIÓN: 1 FPS es suficiente para una imagen estática
    const stream = canvas.captureStream(1); 
    const track = stream.getVideoTracks()[0];
    track.enabled = false; // Empezamos con "cámara apagada"
    return track;
  };

  // Genera un audio silencioso (Para usuarios sin micro)
  const createFakeAudioTrack = () => {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const dst = ctx.createMediaStreamDestination();
    oscillator.connect(dst);
    oscillator.start();
    const track = dst.stream.getAudioTracks()[0];
    track.enabled = false;
    return track;
  };

  // INICIALIZACIÓN ROBUSTA
  useEffect(() => {
    if (!roomId || !session) return;
    let isMounted = true;

    const init = async () => {
      try {
        setStatusMsg('1. Hardware...');
        
        let stream = new MediaStream(); // Empezamos con un stream vacío
        
        // --- INTENTO DE VIDEO ---
        try {
            const videoStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            const videoTrack = videoStream.getVideoTracks()[0];
            videoTrack.enabled = false; // Apagado por defecto
            stream.addTrack(videoTrack);
            setHasWebcam(true);
        } catch (e) {
            console.warn("📷 Sin cámara: Usando video fantasma (1 FPS).");
            setHasWebcam(false);
            stream.addTrack(createFakeVideoTrack());
        }

        // --- INTENTO DE AUDIO ---
        try {
            const audioStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
            const audioTrack = audioStream.getAudioTracks()[0];
            stream.addTrack(audioTrack);
            setHasMic(true);
            setMicOn(true);
        } catch (e) {
            console.warn("🎤 Sin micrófono: Usando audio silencioso (Modo Espectador).");
            setHasMic(false);
            setMicOn(false);
            stream.addTrack(createFakeAudioTrack());
        }

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
        setStatusMsg('Error Crítico');
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

  // CONEXIÓN JERÁRQUICA
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
    // Si no tiene micro real, no hacemos nada o mostramos alerta
    if (!hasMic) {
        alert("No se detectó micrófono. Estás en modo espectador.");
        return;
    }
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
    statusMsg, supabaseStatus, 
    cameraOn, micOn, 
    hasWebcam, hasMic,
    isHost, 
    myAvatar,
    toggleMic, toggleCamera, handleManualDisconnect, handleRefresh
  };
}