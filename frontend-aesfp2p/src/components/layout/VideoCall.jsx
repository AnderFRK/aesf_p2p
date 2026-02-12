import { useEffect, useState, useRef } from 'react';
import Peer from 'peerjs';
import { supabase } from '../../lib/supabase';
import { VideoCameraIcon, VideoCameraSlashIcon, MicrophoneIcon, PhoneXMarkIcon } from '@heroicons/react/24/solid';

export default function VideoCall({ roomId, session, onLeave }) {
  const [myPeerId, setMyPeerId] = useState('');
  const [remoteStreams, setRemoteStreams] = useState({}); 
  const [localStream, setLocalStream] = useState(null);
  const [detectedUsers, setDetectedUsers] = useState([]);
  
  // Estado visual
  const [statusMsg, setStatusMsg] = useState('Conectando...');
  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(true);

  // Referencias para persistencia sin re-render
  const peerRef = useRef(null);
  const channelRef = useRef(null);
  const streamRef = useRef(null);
  const callsRef = useRef({});

  // Datos del usuario
  const myUsername = session.user.user_metadata?.username || 'Usuario';
  const myAvatar = session.user.user_metadata?.avatar_url;
  const myUserId = session.user.id;

  // ==========================================
  // 1. INICIALIZACIÓN Y CICLO DE VIDA
  // ==========================================
  useEffect(() => {
    if (!roomId || !session) return;
    let isMounted = true;

    const init = async () => {
      try {
        // Pedimos SOLO AUDIO al inicio para carga rápida
        const stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
        
        if (!isMounted) return;
        setLocalStream(stream);
        streamRef.current = stream;

        // Configuración STUN para Vercel/Producción
        const peer = new Peer(undefined, {
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' },
              { urls: 'stun:stun2.l.google.com:19302' },
              { urls: 'stun:stun3.l.google.com:19302' },
              { urls: 'stun:stun4.l.google.com:19302' },
            ]
          }
        });
        peerRef.current = peer;

        peer.on('open', (id) => {
          if (!isMounted) return;
          console.log("✅ Mi ID P2P:", id);
          setMyPeerId(id);
          setStatusMsg('Entrando a sala...');
          joinRoomPresence(id);
        });

        peer.on('error', (err) => {
            console.warn("⚠️ PeerJS Warning:", err);
            // Si perdemos conexión con un par específico, limpiamos
            if (err.type === 'peer-unavailable') {
                const deadPeer = err.message.split(' ').pop();
                removeRemoteStream(deadPeer);
            }
        });

        peer.on('call', (call) => {
          console.log("📞 Llamada entrante de:", call.peer);
          call.answer(streamRef.current);
          callsRef.current[call.peer] = call;
          
          call.on('stream', (remoteStream) => {
            setRemoteStreams(prev => ({ ...prev, [call.peer]: remoteStream }));
          });

          // Limpieza si el otro cuelga
          call.on('close', () => removeRemoteStream(call.peer));
          call.on('error', () => removeRemoteStream(call.peer));
        });

      } catch (err) {
        console.error("❌ Error Media:", err);
        setStatusMsg('Error: Micro requerido');
      }
    };

    init();

    // Limpieza al desmontar componente
    return () => {
      isMounted = false;
      safeCleanup(); 
    };
  }, [roomId]);

  // ==========================================
  // 2. FUNCIÓN DE LIMPIEZA BLINDADA
  // ==========================================
  const safeCleanup = async () => {
    // 1. Desconectar Supabase
    const channelToClean = channelRef.current;
    channelRef.current = null; // Evitar doble ejecución

    if (channelToClean) {
        try {
            await channelToClean.untrack();
        } catch (e) { /* Ignorar si ya estaba cerrado */ }
        
        try {
            await supabase.removeChannel(channelToClean);
        } catch (e) { /* Ignorar */ }
    }

    // 2. Destruir PeerJS
    if (peerRef.current) {
        peerRef.current.destroy();
        peerRef.current = null;
    }

    // 3. Apagar Hardware (Cámara/Micro)
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

  // ==========================================
  // 3. SEÑALIZACIÓN (SUPABASE PRESENCE)
  // ==========================================
  const joinRoomPresence = (peerId) => {
    // Limpieza preventiva
    if (channelRef.current) {
        const old = channelRef.current;
        channelRef.current = null;
        supabase.removeChannel(old).catch(() => {});
    }

    // Clave única para evitar conflictos de sesiones fantasmas
    const uniquePresenceKey = `${myUserId}-${peerId}`;
    
    const channel = supabase.channel(`video_presence:${roomId}`, {
      config: { presence: { key: uniquePresenceKey } },
    });
    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState();
        const users = [];
        
        // Aplanar el estado de presence
        for (const key in newState) {
            const u = newState[key][0];
            if (u && u.peerId) users.push(u);
        }

        // Filtrar para no incluirme a mí mismo
        const others = users.filter(u => u.userId !== myUserId);
        setDetectedUsers(others);
        
        // Actualizar mensaje de estado
        if (others.length > 0) {
            setStatusMsg(`✅ Conectado con ${others.length}`);
        } else {
            setStatusMsg('🟢 En línea (Solo)');
        }
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
          leftPresences.forEach(left => {
              console.log("👋 Usuario salió:", left.username);
              removeRemoteStream(left.peerId);
          });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setStatusMsg('🟢 En línea (Solo)');
          await channel.track({
            userId: myUserId,
            username: myUsername,
            avatar_url: myAvatar,
            peerId: peerId, // Importante: enviamos el ID de PeerJS
            online_at: new Date().toISOString()
          });
        }
      });
  };

  // ==========================================
  // 4. RECONECTOR AUTOMÁTICO (Heartbeat)
  // ==========================================
  useEffect(() => {
    if (!myPeerId || !streamRef.current) return;
    
    const interval = setInterval(() => {
      detectedUsers.forEach(user => {
        // Lógica para no llamar si ya existe conexión
        if (remoteStreams[user.peerId]) return; // Ya tengo su video
        if (callsRef.current[user.peerId]?.open) return; // Ya estoy llamando

        console.log("🔄 Intentando conectar con:", user.username);
        callUser(user.peerId);
      });
    }, 4000); // Revisa cada 4 segundos

    return () => clearInterval(interval);
  }, [detectedUsers, myPeerId, remoteStreams]);

  const callUser = (remotePeerId) => {
    // Verificaciones de seguridad antes de llamar
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

  // ==========================================
  // 5. CONTROLES DE HARDWARE
  // ==========================================
  const handleManualDisconnect = async () => {
      await safeCleanup();
      if (onLeave) onLeave();
  };

  const toggleMic = () => {
    if (streamRef.current) {
      const track = streamRef.current.getAudioTracks()[0];
      if (track) { 
          track.enabled = !track.enabled; 
          setMicOn(track.enabled); 
      }
    }
  };

  const toggleCamera = async () => {
    if (cameraOn) {
      // APAGAR CÁMARA
      streamRef.current.getVideoTracks().forEach(t => {
          t.stop();         // Detener hardware
          t.enabled = false; // Señal lógica
      });
      
      // Volver a stream solo audio para limpiar el canal
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        updateStream(audioStream);
        setCameraOn(false);
      } catch(e) { console.error(e); }

    } else {
      // ENCENDER CÁMARA
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setCameraOn(true);
        setMicOn(true); // El nuevo stream resetea el micro a activo
        updateStream(newStream);
      } catch (err) { alert("Permiso de cámara denegado"); }
    }
  };
  
  // Actualiza el stream local y lo reemplaza en las llamadas activas
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
              
              // Si agregamos video donde no había, a veces es necesario rellamar
              if (!vSender && newStream.getVideoTracks()[0]) callUser(call.peer);
          }
      });
  };

  // ==========================================
  // 6. RENDERIZADO
  // ==========================================
  return (
    <div className="bg-gray-800 p-4 border-b border-gray-600 flex flex-col gap-4">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div className="flex flex-col">
            <h3 className="text-emerald-400 font-bold flex items-center gap-2 text-sm">
            🔊 Voz Conectada
            </h3>
            <span className="text-[10px] text-gray-400 font-mono">{statusMsg}</span>
        </div>
        
        <div className="flex gap-2">
            <button onClick={toggleMic} className={`p-2 rounded-full transition-colors ${micOn ? 'bg-gray-600 hover:bg-gray-500' : 'bg-red-500 text-white'}`}>
                <MicrophoneIcon className="w-5 h-5"/>
            </button>
            <button onClick={toggleCamera} className={`p-2 rounded-full transition-colors ${cameraOn ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-gray-600 text-gray-400'}`}>
                {cameraOn ? <VideoCameraIcon className="w-5 h-5 text-white"/> : <VideoCameraSlashIcon className="w-5 h-5"/>}
            </button>
            <button onClick={handleManualDisconnect} title="Salir" className="p-2 rounded-full bg-red-600 hover:bg-red-500 text-white ml-2">
                <PhoneXMarkIcon className="w-5 h-5" />
            </button>
        </div>
      </div>
      
      {/* GRID DE VIDEOS */}
      <div className="flex flex-wrap gap-4 justify-center md:justify-start">
        {/* MI VIDEO LOCAL */}
        <div className="relative w-40 h-28 bg-black rounded-lg overflow-hidden border border-emerald-500/50 flex items-center justify-center">
          <video 
             ref={v => {if(v) v.srcObject = localStream}} 
             autoPlay muted playsInline 
             className={`w-full h-full object-cover transform scale-x-[-1] ${!cameraOn ? 'hidden' : ''}`} 
          />
          {!cameraOn && (
              <div className="flex flex-col items-center">
                  <img src={myAvatar} className="w-10 h-10 rounded-full opacity-50 mb-1" alt="Avatar"/>
                  <span className="text-[10px] text-gray-500">Tú</span>
              </div>
          )}
          <div className={`absolute top-2 right-2 w-2.5 h-2.5 rounded-full border border-black ${micOn ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
        </div>

        {/* VIDEOS REMOTOS */}
        {Object.entries(remoteStreams).map(([peerId, stream]) => {
           const userInfo = detectedUsers.find(u => u.peerId === peerId) || { username: 'Usuario' };
           return <RemoteVideo key={peerId} stream={stream} username={userInfo.username} avatar={userInfo.avatar_url} />
        })}
      </div>
    </div>
  );
}

// COMPONENTE AUXILIAR PARA VIDEO REMOTO
function RemoteVideo({ stream, username, avatar }) {
    const videoRef = useRef(null);
    const [hasVideo, setHasVideo] = useState(false);

    useEffect(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
        
        // Intervalo para detectar si el video está realmente activo o congelado/muteado
        const interval = setInterval(() => {
            const track = stream.getVideoTracks()[0];
            // !track.muted es la clave para detectar si apagaron la cámara
            setHasVideo(track && track.enabled && track.readyState === 'live' && !track.muted);
        }, 500);
        return () => clearInterval(interval);
    }, [stream]);

    return (
        <div className="relative w-40 h-28 bg-black rounded-lg overflow-hidden border border-gray-600 flex items-center justify-center shadow-sm animate-in fade-in duration-300">
            <video 
                ref={videoRef} 
                autoPlay playsInline 
                className={`w-full h-full object-cover ${!hasVideo ? 'hidden' : ''}`} 
            />
            
            {!hasVideo && (
                <div className="flex flex-col items-center">
                    <img src={avatar || `https://ui-avatars.com/api/?name=${username}`} className="w-10 h-10 rounded-full opacity-60 mb-1" alt="User"/>
                    <span className="text-gray-500 text-[10px]">Solo Audio</span>
                </div>
            )}
            <span className="absolute bottom-1 left-1 text-[10px] bg-black/60 text-white px-1.5 rounded max-w-[90%] truncate">
                {username}
            </span>
        </div>
    );
}