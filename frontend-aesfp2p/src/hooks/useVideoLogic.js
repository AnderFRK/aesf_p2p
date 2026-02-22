// Codigo inservible, solo referencia para la logica de video en useVideoLogic.js
import { useEffect, useState, useRef } from 'react';
import Peer from 'peerjs';
// import { supabase } from '../lib/supabase'; 

export function useVideoLogic(roomId, session, onLeave) {
  // Datos
  const myUserId = session?.user?.id || `guest-${Math.floor(Math.random() * 10000)}`;
  const myUsername = session?.user?.user_metadata?.username || 'Usuario';
  const myAvatar = session?.user?.user_metadata?.avatar_url;

  // Estados
  const [statusMsg, setStatusMsg] = useState('Iniciando...');
  const [isHost, setIsHost] = useState(false);
  const [detectedUsers, setDetectedUsers] = useState([]);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [localStream, setLocalStream] = useState(null);
  
  // Controles UI
  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [hasWebcam, setHasWebcam] = useState(true);
  const [hasMic, setHasMic] = useState(true);

  // Referencias (No causan re-renders)
  const peerRef = useRef(null);
  const channelRef = useRef(null);
  const streamRef = useRef(null);
  const callsRef = useRef({});
  const myJoinTime = useRef(new Date().toISOString()); 
  const mountedRef = useRef(true);
  const isConnectingRef = useRef(false);

  // --- EFECTO PRINCIPAL ---
  useEffect(() => {
    if (!roomId) return;
    mountedRef.current = true;

    const init = async () => {
      if (isConnectingRef.current) return;
      isConnectingRef.current = true;

      try {
        setStatusMsg('Hardware...');
        
        // --- MEDIA SETUP ---
        let stream = new MediaStream();
        try {
            const vStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            if (!mountedRef.current) { vStream.getTracks().forEach(t => t.stop()); return; }
            const vTrack = vStream.getVideoTracks()[0];
            vTrack.enabled = false; 
            stream.addTrack(vTrack);
            setHasWebcam(true);
        } catch (e) {
            setHasWebcam(false);
            stream.addTrack(createFakeVideoTrack());
        }

        try {
            const aStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
            if (!mountedRef.current) { aStream.getTracks().forEach(t => t.stop()); return; }
            const aTrack = aStream.getAudioTracks()[0];
            stream.addTrack(aTrack);
            setHasMic(true);
            setMicOn(true);
        } catch (e) {
            setHasMic(false);
            setMicOn(false);
            stream.addTrack(createFakeAudioTrack());
        }

        if (!mountedRef.current) return;
        setLocalStream(stream);
        streamRef.current = stream;

        // --- PEERJS SETUP ---
        setStatusMsg('PeerJS...');
        if (peerRef.current) peerRef.current.destroy();

        const peer = new Peer(undefined, {
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' }
            ]
          }
        });
        peerRef.current = peer;

        peer.on('open', (id) => {
          if (!mountedRef.current) return;
          console.log("PeerID:", id);
          setStatusMsg('Conectando Sala...');
          joinSupabaseRoom(id);
        });

        peer.on('call', (call) => {
           call.answer(streamRef.current);
           setupCallEvents(call, call.peer);
        });
        
        peer.on('error', (err) => console.error("Peer Error:", err));

      } catch (err) {
        console.error("Error Init:", err);
        setStatusMsg('Error de conexión');
      } finally {
        isConnectingRef.current = false;
      }
    };

    init();

    // --- CLEANUP AL SALIR ---
    return () => {
      mountedRef.current = false;
      isConnectingRef.current = false;
      cleanupResources();
    };
  }, [roomId]); 

  const joinSupabaseRoom = (peerId) => {
      const topic = `room_${roomId}`;
      const uniqueKey = `${myUserId}-${peerId}`;
      const allChannels = supabase.getChannels();
      let channel = allChannels.find(c => c.topic === topic || c.topic === `realtime:${topic}`);

      if (channel) {
          channel.unsubscribe(); 
      }

      // CREACIÓN NUEVA
      channel = supabase.channel(topic, {
          config: { presence: { key: uniqueKey } }
      });
      channelRef.current = channel;

      channel
        .on('presence', { event: 'sync' }, () => {
            if (!mountedRef.current) return;
            const state = channel.presenceState();
            const users = [];
            for (const k in state) {
                state[k].forEach(u => {
                    if(u && u.peerId && u.online_at) users.push(u);
                });
            }

            // ORDENAMIENTO POR FECHA Y PEERID (Consistente para Host y Guests)
            users.sort((a, b) => {
                const timeA = new Date(a.online_at).getTime();
                const timeB = new Date(b.online_at).getTime();
                
                if (timeA !== timeB) {
                    return timeA - timeB;
                }
                return a.peerId.localeCompare(b.peerId);
            });

            // LOGICA HOST
            const amIHost = users.length > 0 && users[0].peerId === peerId;
            setIsHost(amIHost);
            
            // OTHERS
            const others = users.filter(u => u.peerId !== peerId);
            setDetectedUsers(others);

            const role = amIHost ? 'HOST' : 'GUEST';
            setStatusMsg(others.length > 0 ? `En línea (${role})` : `Esperando (${role})`);
        })
        .on('presence', { event: 'leave' }, ({ leftPresences }) => {
            leftPresences.forEach(p => removeRemoteStream(p.peerId));
        })
        .subscribe(async (status) => {
            if (!mountedRef.current) return;
            
            if (status === 'SUBSCRIBED') {
                const trackData = {
                    userId: myUserId,
                    username: myUsername,
                    avatar_url: myAvatar,
                    peerId: peerId,
                    online_at: myJoinTime.current
                };
                
                await channel.track(trackData);

                // Heartbeat para mantener viva la conexión
                // Solo enviamos si el canal está en estado 'joined'
                const interval = setInterval(() => {
                    if (channelRef.current?.state === 'joined' && mountedRef.current) {
                        channel.track(trackData);
                    } else {
                        clearInterval(interval);
                    }
                }, 5000);
            }
        });
  };


  // --- HELPERS ---
  const cleanupResources = async () => {
      console.log("Limpieza suave...");
      
      if (channelRef.current) {
          await channelRef.current.unsubscribe().catch(() => {});
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

  const setupCallEvents = (call, pid) => {
      callsRef.current[pid] = call;
      call.on('stream', (s) => setRemoteStreams(prev => ({...prev, [pid]: s})));
      call.on('close', () => removeRemoteStream(pid));
      call.on('error', () => removeRemoteStream(pid));
  };

  const removeRemoteStream = (pid) => {
      setRemoteStreams(prev => {
          const n = {...prev};
          delete n[pid];
          return n;
      });
      if (callsRef.current[pid]) {
          callsRef.current[pid].close();
          delete callsRef.current[pid];
      }
  };

  const callUser = (pid) => {
      if (!peerRef.current) return;
      try {
          const call = peerRef.current.call(pid, streamRef.current);
          if (call) setupCallEvents(call, pid);
      } catch(e) { console.error(e); }
  };
  
  useEffect(() => {
      if (!streamRef.current || !peerRef.current) return;
      const interval = setInterval(() => {
          if (!mountedRef.current) return;
          detectedUsers.forEach(u => {
              const targetId = u.peerId;
              if (remoteStreams[targetId] || callsRef.current[targetId]) return;
              
              const myTime = new Date(myJoinTime.current).getTime();
              const targetTime = new Date(u.online_at).getTime();
              
              if (myTime > targetTime) callUser(targetId);
          });
      }, 2000);
      return () => clearInterval(interval);
  }, [detectedUsers, remoteStreams]);

  // Helpers de Hardware
  const createFakeVideoTrack = () => {
    const c = document.createElement('canvas'); c.width=640; c.height=480;
    c.getContext('2d').fillRect(0,0,640,480);
    const t = c.captureStream(1).getVideoTracks()[0]; t.enabled=false; return t;
  };
  const createFakeAudioTrack = () => {
     const ctx = new AudioContext(); const d = ctx.createMediaStreamDestination();
     const t = d.stream.getAudioTracks()[0]; t.enabled=false; return t;
  };

  const handleManualDisconnect = () => { cleanupResources(); if(onLeave) onLeave(); };
  
  const toggleMic = () => {
      if(streamRef.current) {
          const t = streamRef.current.getAudioTracks()[0];
          if(t) { t.enabled = !t.enabled; setMicOn(t.enabled); }
      }
  };
  const toggleCamera = () => {
      if(streamRef.current) {
          const t = streamRef.current.getVideoTracks()[0];
          if(t) { t.enabled = !t.enabled; setCameraOn(t.enabled); }
      }
  };

  return {
      localStream, remoteStreams, detectedUsers, statusMsg, isHost,
      cameraOn, micOn, hasWebcam, hasMic, myAvatar,
      toggleMic, toggleCamera, handleManualDisconnect
  };
}