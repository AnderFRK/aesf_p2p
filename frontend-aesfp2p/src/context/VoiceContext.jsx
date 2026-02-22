import { createContext, useContext, useEffect, useState, useRef } from 'react';
import Peer from 'peerjs';
import { supabase } from '../lib/supabase'; 

const VoiceContext = createContext();

export function useVoice() {
  return useContext(VoiceContext);
}

export function VoiceProvider({ children, session }) {
  const [activeRoomId, setActiveRoomId] = useState(null); 
  
  const [statusMsg, setStatusMsg] = useState('Desconectado');
  const [isHost, setIsHost] = useState(false);
  const [detectedUsers, setDetectedUsers] = useState([]); 
  const [remoteStreams, setRemoteStreams] = useState({});
  const [localStream, setLocalStream] = useState(null);
  
  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [hasWebcam, setHasWebcam] = useState(true);
  const [hasMic, setHasMic] = useState(true);

  const peerRef = useRef(null);
  const channelRef = useRef(null);
  const streamRef = useRef(null);
  const callsRef = useRef({});
  const myJoinTime = useRef(null); 
  const isConnectingRef = useRef(false);

  const myUserId = session?.user?.id || `guest-${Math.floor(Math.random() * 10000)}`;
  const myUsername = session?.user?.user_metadata?.username || 'Usuario';
  const myAvatar = session?.user?.user_metadata?.avatar_url;



  const joinRoom = async (roomId) => {
    if (activeRoomId === roomId) return;
    if (activeRoomId) await leaveRoom(); 

    setActiveRoomId(roomId);
    myJoinTime.current = new Date().toISOString(); 
    
    if (isConnectingRef.current) return;
    isConnectingRef.current = true;

    try {
        setStatusMsg('Hardware...');
        let stream = new MediaStream();
        try {
            const vStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
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
            const aTrack = aStream.getAudioTracks()[0];
            stream.addTrack(aTrack);
            setHasMic(true);
            setMicOn(true);
        } catch (e) {
            setHasMic(false);
            setMicOn(false);
            stream.addTrack(createFakeAudioTrack());
        }

        setLocalStream(stream);
        streamRef.current = stream;
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
            console.log("PeerID:", id);
            setStatusMsg('Conectando Sala...');
            joinSupabaseRoom(roomId, id);
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


  const joinSupabaseRoom = (roomId, peerId) => {
      const topic = `room_${roomId}`;
      const uniqueKey = `${myUserId}-${peerId}`;
      const allChannels = supabase.getChannels();
      let channel = allChannels.find(c => c.topic === topic || c.topic === `realtime:${topic}`);

      if (channel) {
          channel.unsubscribe(); 
      }

      channel = supabase.channel(topic, {
          config: { presence: { key: uniqueKey } }
      });
      channelRef.current = channel;

      channel
        .on('presence', { event: 'sync' }, () => {
            const state = channel.presenceState();
            const users = [];
            for (const k in state) {
                state[k].forEach(u => {
                    if(u && u.peerId && u.online_at) users.push(u);
                });
            }

            users.sort((a, b) => {
                const timeA = new Date(a.online_at).getTime();
                const timeB = new Date(b.online_at).getTime();
                if (timeA !== timeB) return timeA - timeB;
                return a.peerId.localeCompare(b.peerId);
            });

            const amIHost = users.length > 0 && users[0].peerId === peerId;
            setIsHost(amIHost);
            
            const others = users.filter(u => u.peerId !== peerId);
            setDetectedUsers(others); 

            const role = amIHost ? 'HOST' : 'GUEST';
            setStatusMsg(others.length > 0 ? `En línea (${role})` : `Esperando (${role})`);
        })
        .on('presence', { event: 'leave' }, ({ leftPresences }) => {
            leftPresences.forEach(p => removeRemoteStream(p.peerId));
        })
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                const trackData = {
                    userId: myUserId,
                    username: myUsername,
                    avatar_url: myAvatar,
                    peerId: peerId,
                    online_at: myJoinTime.current
                };
                
                await channel.track(trackData);

                const interval = setInterval(() => {
                    if (channelRef.current === channel && channel.state === 'joined') {
                        channel.track(trackData);
                    } else {
                        clearInterval(interval);
                    }
                }, 5000);
            }
        });
  };

  const leaveRoom = async () => {
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
      setActiveRoomId(null);
      setIsHost(false);
      setStatusMsg('Desconectado');
      setCameraOn(false);
  };

  const setupCallEvents = (call, pid) => {
      callsRef.current[pid] = call;
      call.on('stream', (s) => setRemoteStreams(prev => ({...prev, [pid]: s})));
      call.on('close', () => removeRemoteStream(pid));
      call.on('error', () => removeRemoteStream(pid));
  };

  const removeRemoteStream = (pid) => {
      setRemoteStreams(prev => { const n = {...prev}; delete n[pid]; return n; });
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
      if (!activeRoomId || !streamRef.current || !peerRef.current) return;

      const interval = setInterval(() => {
          detectedUsers.forEach(u => {
              const targetId = u.peerId;
              if (remoteStreams[targetId] || callsRef.current[targetId]) return;
              
              const myTime = new Date(myJoinTime.current).getTime();
              const targetTime = new Date(u.online_at).getTime();
              
              if (myTime > targetTime) callUser(targetId);
          });
      }, 2000);
      return () => clearInterval(interval);
  }, [detectedUsers, remoteStreams, activeRoomId]);

  const createFakeVideoTrack = () => {
    const c = document.createElement('canvas'); c.width=640; c.height=480;
    c.getContext('2d').fillRect(0,0,640,480);
    const t = c.captureStream(1).getVideoTracks()[0]; t.enabled=false; return t;
  };
  const createFakeAudioTrack = () => {
     const ctx = new AudioContext(); const d = ctx.createMediaStreamDestination();
     const t = d.stream.getAudioTracks()[0]; t.enabled=false; return t;
  };

  const toggleMic = () => {
      if(streamRef.current) {
          const t = streamRef.current.getAudioTracks()[0];
          if(t) { t.enabled = !t.enabled; setMicOn(t.enabled); }
      }
  };
  const toggleCam = () => {
      if(streamRef.current) {
          const t = streamRef.current.getVideoTracks()[0];
          if(t) { t.enabled = !t.enabled; setCameraOn(t.enabled); }
      }
  };

  const value = {
      activeRoomId,
      joinRoom,
      leaveRoom,
      handleManualDisconnect: leaveRoom,

      voiceUsers: detectedUsers, 
      detectedUsers, 
      localStream,
      remoteStreams,
      
      isHost,
      statusMsg,
      supabaseStatus: 'SUBSCRIBED', 
      
      micOn,
      cameraOn,
      hasMic,
      hasWebcam,
      toggleMic,
      toggleCam: toggleCam,
      toggleCamera: toggleCam 
  };

  return <VoiceContext.Provider value={value}>{children}</VoiceContext.Provider>;
}