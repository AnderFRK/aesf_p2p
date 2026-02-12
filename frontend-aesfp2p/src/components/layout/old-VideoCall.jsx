import { useEffect, useState, useRef } from 'react';
import Peer from 'peerjs';
import { supabase } from '../../lib/supabase';
import { VideoCameraIcon, VideoCameraSlashIcon, MicrophoneIcon, PhoneXMarkIcon, ArrowPathIcon } from '@heroicons/react/24/solid';

export default function VideoCall({ roomId, session, onLeave }) {
  const [myPeerId, setMyPeerId] = useState('');
  const [remoteStreams, setRemoteStreams] = useState({}); 
  const [localStream, setLocalStream] = useState(null);
  const [detectedUsers, setDetectedUsers] = useState([]);
  
  const [statusMsg, setStatusMsg] = useState('Iniciando motores...');
  const [supabaseStatus, setSupabaseStatus] = useState('DISCONNECTED');
  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(true);

  const peerRef = useRef(null);
  const channelRef = useRef(null);
  const streamRef = useRef(null);
  const callsRef = useRef({});
  const retryInterval = useRef(null);

  const myUsername = session.user.user_metadata?.username || 'Usuario';
  const myAvatar = session.user.user_metadata?.avatar_url;
  const myUserId = session.user.id;

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
        
        const peer = new Peer(undefined, {
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' },
              { urls: 'stun:stun2.l.google.com:19302' },
              { urls: 'stun:stun3.l.google.com:19302' },
            ]
          }
        });
        peerRef.current = peer;

        peer.on('open', (id) => {
          if (!isMounted) return;
          console.log("PeerJS Listo. ID:", id);
          setMyPeerId(id);
          setStatusMsg('3. Conectando a Sala...');
          joinRoomPresence(id);
        });

        peer.on('error', (err) => {
            console.warn("Error PeerJS:", err);
            setStatusMsg(`Error P2P: ${err.type}`);
            if (err.type === 'peer-unavailable') {
                const deadPeer = err.message.split(' ').pop();
                removeRemoteStream(deadPeer);
            }
        });

        peer.on('call', (call) => {
          console.log("Recibiendo llamada de:", call.peer);
          call.answer(streamRef.current);
          callsRef.current[call.peer] = call;
          
          call.on('stream', (remoteStream) => {
            setRemoteStreams(prev => ({ ...prev, [call.peer]: remoteStream }));
          });

          call.on('close', () => removeRemoteStream(call.peer));
          call.on('error', () => removeRemoteStream(call.peer));
        });

      } catch (err) {
        console.error("Error Fatal:", err);
        setStatusMsg('Error: No se pudo acceder al micrófono');
      }
    };

    init();

    return () => {
      isMounted = false;
      safeCleanup();
    };
  }, [roomId]);

  const safeCleanup = async () => {
      if (retryInterval.current) clearInterval(retryInterval.current);
      
      if (channelRef.current) {
          const ch = channelRef.current;
          channelRef.current = null;
          try { await ch.untrack(); } catch(e){}
          try { await supabase.removeChannel(ch); } catch(e){}
      }

      if (peerRef.current) {
          peerRef.current.destroy();
          peerRef.current = null;
      }

      if (streamRef.current) {
          streamRef.current.getTracks().forEach(t => t.stop());
          streamRef.current = null;
      }
  };

  const removeRemoteStream = (peerId) => {
      setRemoteStreams(prev => {
          const newSt = { ...prev };
          delete newSt[peerId];
          return newSt;
      });
      if (callsRef.current[peerId]) {
          callsRef.current[peerId].close();
          delete callsRef.current[peerId];
      }
  };

  const joinRoomPresence = (peerId) => {
    if (channelRef.current) {
         supabase.removeChannel(channelRef.current).catch(()=>{});
    }

    const uniquePresenceKey = `${myUserId}-${peerId}`;
    
    const channel = supabase.channel(`video_presence:${roomId}`, {
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
        
        console.log("👥 Sync recibido. Otros:", others.length);
        setDetectedUsers(others);

        if (others.length > 0) {
            setStatusMsg(`✅ Conectado con ${others.length}`);
        } else {
            setStatusMsg('🟢 En línea (Esperando a otros...)');
        }
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          console.log('Usuario entró:', newPresences);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
          leftPresences.forEach(left => {
              console.log("👋 Usuario salió:", left.username);
              removeRemoteStream(left.peerId);
          });
      })
      .subscribe(async (status) => {
        setSupabaseStatus(status);
        
        if (status === 'SUBSCRIBED') {
          setStatusMsg('Canal Abierto. Enviando señal...');
          
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
          retryInterval.current = setInterval(() => {
             if(channelRef.current) sendTrack();
          }, 10000);
        }
      });
  };

  useEffect(() => {
    if (!myPeerId || !streamRef.current) return;

    const interval = setInterval(() => {
      detectedUsers.forEach(user => {
        if (remoteStreams[user.peerId]) return;
        
        if (callsRef.current[user.peerId]?.open) return;
        
        console.log("Intentando conectar con:", user.username);
        callUser(user.peerId);
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [detectedUsers, myPeerId, remoteStreams]);

  const callUser = (remotePeerId) => {
    if (!peerRef.current || !streamRef.current || peerRef.current.disconnected) return;
    
    try {
        const call = peerRef.current.call(remotePeerId, streamRef.current);
        if (!call) return;

        callsRef.current[remotePeerId] = call;
        
        call.on('stream', (remoteStream) => {
            setRemoteStreams(prev => ({ ...prev, [remotePeerId]: remoteStream }));
        });
        call.on('close', () => removeRemoteStream(remotePeerId));
        call.on('error', () => removeRemoteStream(remotePeerId));
    } catch (e) { console.error("Error al llamar:", e); }
  };
  const handleManualDisconnect = async () => {
      await safeCleanup();
      if (onLeave) onLeave();
  };

  const toggleMic = () => {
    if (streamRef.current) {
      const track = streamRef.current.getAudioTracks()[0];
      if (track) { track.enabled = !track.enabled; setMicOn(track.enabled); }
    }
  };

  const toggleCamera = async () => {
    if (cameraOn) {
      streamRef.current.getVideoTracks().forEach(t => { t.stop(); t.enabled = false; });
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        updateStream(audioStream);
        setCameraOn(false);
      } catch(e) { console.error(e); }
    } else {
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setCameraOn(true);
        setMicOn(true);
        updateStream(newStream);
      } catch (err) { alert("Permiso denegado"); }
    }
  };
  
  const updateStream = (newStream) => {
      setLocalStream(newStream);
      streamRef.current = newStream;
      Object.values(callsRef.current).forEach(call => {
          if (call.peerConnection) {
              const senders = call.peerConnection.getSenders();
              const vSender = senders.find(s => s.track?.kind === 'video');
              const aSender = senders.find(s => s.track?.kind === 'audio');
              
              if (vSender && newStream.getVideoTracks()[0]) vSender.replaceTrack(newStream.getVideoTracks()[0]);
              if (aSender && newStream.getAudioTracks()[0]) aSender.replaceTrack(newStream.getAudioTracks()[0]);
              
              if (!vSender && newStream.getVideoTracks()[0]) callUser(call.peer);
          }
      });
  };

  const handleRefresh = () => {
      if(myPeerId) joinRoomPresence(myPeerId);
  };

  return (
    <div className="bg-gray-800 p-4 border-b border-gray-600 flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <div className="flex flex-col">
            <h3 className="text-emerald-400 font-bold flex items-center gap-2 text-sm">
            🔊 Voz Conectada
            </h3>
            <div className="flex flex-col text-[10px] text-gray-400 font-mono mt-1">
                <span>Estado: {statusMsg}</span>
                <span className={supabaseStatus === 'SUBSCRIBED' ? 'text-green-500' : 'text-red-400'}>
                    Supabase: {supabaseStatus}
                </span>
                <span>Detectados: {detectedUsers.length}</span>
            </div>
        </div>
        
        <div className="flex gap-2 items-center">
            <button onClick={handleRefresh} title="Reconectar Señal" className="p-2 rounded-full bg-blue-600 hover:bg-blue-500 text-white mr-2">
                <ArrowPathIcon className="w-4 h-4" />
            </button>

            <button onClick={toggleMic} className={`p-2 rounded-full ${micOn ? 'bg-gray-600' : 'bg-red-500 text-white'}`}>
                <MicrophoneIcon className="w-5 h-5"/>
            </button>
            <button onClick={toggleCamera} className={`p-2 rounded-full ${cameraOn ? 'bg-emerald-600' : 'bg-gray-600 text-gray-400'}`}>
                {cameraOn ? <VideoCameraIcon className="w-5 h-5 text-white"/> : <VideoCameraSlashIcon className="w-5 h-5"/>}
            </button>
            <button onClick={handleManualDisconnect} title="Salir" className="p-2 rounded-full bg-red-600 hover:bg-red-500 text-white ml-2">
                <PhoneXMarkIcon className="w-5 h-5" />
            </button>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-4 justify-center md:justify-start">
        <div className="relative w-40 h-28 bg-black rounded-lg overflow-hidden border border-emerald-500/50 flex items-center justify-center">
          <video ref={v => {if(v) v.srcObject = localStream}} autoPlay muted playsInline className={`w-full h-full object-cover transform scale-x-[-1] ${!cameraOn ? 'hidden' : ''}`} />
          {!cameraOn && <div className="flex flex-col items-center"><img src={myAvatar} className="w-10 h-10 rounded-full opacity-50 mb-1"/><span className="text-[10px] text-gray-500">Tú</span></div>}
          <div className={`absolute top-2 right-2 w-2.5 h-2.5 rounded-full border border-black ${micOn ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
        </div>

        {Object.entries(remoteStreams).map(([peerId, stream]) => {
           const userInfo = detectedUsers.find(u => u.peerId === peerId) || { username: 'Conectando...' };
           return <RemoteVideo key={peerId} stream={stream} username={userInfo.username} avatar={userInfo.avatar_url} />
        })}
      </div>
    </div>
  );
}

function RemoteVideo({ stream, username, avatar }) {
    const videoRef = useRef(null);
    const [hasVideo, setHasVideo] = useState(false);
    useEffect(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
        const interval = setInterval(() => {
            const track = stream.getVideoTracks()[0];
            setHasVideo(track && track.enabled && track.readyState === 'live' && !track.muted);
        }, 500);
        return () => clearInterval(interval);
    }, [stream]);

    return (
        <div className="relative w-40 h-28 bg-black rounded-lg overflow-hidden border border-gray-600 flex items-center justify-center shadow-sm animate-in fade-in duration-300">
            <video ref={videoRef} autoPlay playsInline className={`w-full h-full object-cover ${!hasVideo ? 'hidden' : ''}`} />
            {!hasVideo && <div className="flex flex-col items-center"><img src={avatar || `https://ui-avatars.com/api/?name=${username}`} className="w-10 h-10 rounded-full opacity-60 mb-1"/><span className="text-gray-500 text-[10px]">Solo Audio</span></div>}
            <span className="absolute bottom-1 left-1 text-[10px] bg-black/60 text-white px-1.5 rounded max-w-[90%] truncate">{username}</span>
        </div>
    );
}
