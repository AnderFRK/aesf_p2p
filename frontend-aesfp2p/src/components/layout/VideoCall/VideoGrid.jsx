import { useEffect, useRef, useState } from 'react';

export default function VideoGrid({ localStream, remoteStreams, detectedUsers, cameraOn, micOn, myAvatar, myUsername }) {
  
  // Calculamos cuántos videos hay en total para ajustar el grid mejor
  const totalVideos = 1 + Object.keys(remoteStreams).length;

  return (
    // CONTENEDOR GRID PRINCIPAL
    <div className={`w-full h-full p-2 md:p-4 gap-2 md:gap-4 overflow-y-auto custom-scrollbar content-start grid
      ${totalVideos === 1 ? 'grid-cols-1 max-w-2xl mx-auto' : ''}
      ${totalVideos === 2 ? 'grid-cols-1 sm:grid-cols-2 max-w-4xl mx-auto' : ''}
      ${totalVideos > 2 ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : ''}
    `}>
      
      {/* --- MI VIDEO (LOCAL) --- */}
      <div className="relative w-full aspect-video bg-gray-900 rounded-xl overflow-hidden border-2 border-emerald-500/50 flex items-center justify-center shadow-lg group p-2">
          <video 
            ref={v => { if (v && localStream) v.srcObject = localStream; }} 
            autoPlay 
            muted 
            playsInline 
            className={`absolute inset-0 w-full h-full object-cover transform scale-x-[-1] ${!cameraOn ? 'hidden' : ''}`} 
          />
          
          {/* Si tengo la cámara apagada, muestro mi avatar */}
          {!cameraOn && (
              <div className="flex flex-col items-center justify-center w-full h-full animate-in fade-in zoom-in duration-300 z-10">
                  {/* CÍRCULO PEQUEÑO SIN TEXTO DEBAJO */}
                  <img 
                    src={myAvatar || `https://ui-avatars.com/api/?name=${myUsername || 'Yo'}&background=10b981&color=fff`} 
                    className="w-10 h-10 sm:w-16 sm:h-16 md:w-20 md:h-20 max-h-[70%] max-w-[70%] aspect-square rounded-full border-2 border-emerald-500/50 object-cover shadow-xl shrink-0" 
                    alt="Tú"
                  />
              </div>
          )}
          
          {/* Indicador de Micrófono Local */}
          <div className="absolute top-2 right-2 flex items-center gap-2 z-20">
             <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full shadow-md animate-pulse ${micOn ? 'bg-emerald-500 shadow-emerald-500/50' : 'bg-red-500 shadow-red-500/50'}`}></div>
          </div>
          
          {/* Etiqueta del Nombre del Usuario (Tú) - La volvemos a poner abajo a la izquierda para mantener la consistencia con los invitados */}
           <div className="absolute bottom-1.5 left-1.5 right-1.5 flex justify-start z-20">
                <span className="block text-[9px] sm:text-xs font-medium bg-black/60 backdrop-blur-md text-white px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-md shadow-sm truncate max-w-full border border-white/10">
                    {myUsername || "Tú"}
                </span>
            </div>
      </div>

      {/* --- VIDEOS DE LOS DEMÁS (REMOTOS) --- */}
      {Object.entries(remoteStreams).map(([peerId, stream]) => {
          const userInfo = detectedUsers.find(u => u.peerId === peerId) || { username: 'Conectando...' };
          return (
            <RemoteVideo 
                key={peerId} 
                stream={stream} 
                username={userInfo.username} 
                avatar={userInfo.avatar_url} 
            />
          );
      })}
    </div>
  );
}

// COMPONENTE PARA CADA VIDEO REMOTO
function RemoteVideo({ stream, username, avatar }) {
    const videoRef = useRef(null);
    const [hasVideo, setHasVideo] = useState(false);

    useEffect(() => {
        let isMounted = true;
        
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }

        const checkTracks = () => {
            if (!isMounted || !stream) return;
            const videoTrack = stream.getVideoTracks()[0];
            const active = videoTrack && videoTrack.enabled && videoTrack.readyState === 'live';
            if (hasVideo !== active) setHasVideo(active);
        };

        const interval = setInterval(checkTracks, 1000);
        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [stream, hasVideo]);

    return (
        <div className="relative w-full aspect-video bg-gray-800 rounded-xl overflow-hidden border border-gray-700 flex items-center justify-center shadow-md animate-in fade-in slide-in-from-bottom-2 duration-500 group transition-all hover:border-gray-500 p-2">
            <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                className={`absolute inset-0 w-full h-full object-cover ${!hasVideo ? 'hidden' : ''}`} 
            />
            
            {!hasVideo && (
                <div className="flex flex-col items-center justify-center w-full h-full animate-in fade-in zoom-in duration-300 z-10">
                     {/* CÍRCULO PEQUEÑO SIN TEXTO DEBAJO */}
                    <img 
                        src={avatar || `https://ui-avatars.com/api/?name=${username}&background=random`} 
                        className="w-10 h-10 sm:w-16 sm:h-16 md:w-20 md:h-20 max-h-[70%] max-w-[70%] aspect-square rounded-full border-2 border-gray-500 object-cover shadow-xl shrink-0" 
                        alt={username}
                    />
                </div>
            )}
            
            {/* Etiqueta del Nombre del Usuario */}
            <div className="absolute bottom-1.5 left-1.5 right-1.5 flex justify-start z-20">
                <span className="block text-[9px] sm:text-xs font-medium bg-black/60 backdrop-blur-md text-white px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-md shadow-sm truncate max-w-full border border-white/10">
                    {username}
                </span>
            </div>
        </div>
    );
}