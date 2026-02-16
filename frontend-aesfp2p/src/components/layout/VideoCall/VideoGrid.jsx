import { useEffect, useRef, useState } from 'react';

export default function VideoGrid({ localStream, remoteStreams, detectedUsers, cameraOn, micOn, myAvatar }) {
  return (
    <div className="flex flex-wrap gap-4 justify-center md:justify-start p-2">
      <div className="relative w-40 h-28 bg-gray-900 rounded-lg overflow-hidden border border-emerald-500/50 flex items-center justify-center shadow-lg">
          <video 
            ref={v => { if (v && localStream) v.srcObject = localStream; }} 
            autoPlay 
            muted 
            playsInline 
            className={`w-full h-full object-cover transform scale-x-[-1] ${!cameraOn ? 'hidden' : ''}`} 
          />
          {!cameraOn && (
              <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
                  <img 
                    src={myAvatar || `https://ui-avatars.com/api/?name=Yo&background=10b981&color=fff`} 
                    className="w-12 h-12 rounded-full border-2 border-emerald-500/20 mb-1 object-cover" 
                    alt="Tú"
                  />
                  <span className="text-[10px] text-emerald-500 font-bold tracking-wider uppercase">Tú</span>
              </div>
          )}
          <div className={`absolute top-2 right-2 w-2.5 h-2.5 rounded-full border border-black shadow-sm ${micOn ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
      </div>
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

function RemoteVideo({ stream, username, avatar }) {
    const videoRef = useRef(null);
    const [hasVideo, setHasVideo] = useState(false);

    useEffect(() => {
        let isMounted = true;
        
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }

        // Monitor de tracks para detectar cambios de cámara en tiempo real
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
        <div className="relative w-40 h-28 bg-gray-900 rounded-lg overflow-hidden border border-gray-700 flex items-center justify-center shadow-md animate-in fade-in slide-in-from-bottom-2 duration-500">
            <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                className={`w-full h-full object-cover ${!hasVideo ? 'hidden' : ''}`} 
            />
            
            {!hasVideo && (
                <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
                    <img 
                        src={avatar || `https://ui-avatars.com/api/?name=${username}&background=random`} 
                        className="w-12 h-12 rounded-full border-2 border-gray-700 mb-1 object-cover" 
                        alt={username}
                    />
                    <span className="text-gray-400 text-[10px] font-medium uppercase tracking-tighter">Solo Audio</span>
                </div>
            )}
            
            <div className="absolute bottom-1 left-1 right-1">
                <span className="block text-[9px] bg-black/70 backdrop-blur-sm text-white px-2 py-0.5 rounded shadow-sm truncate max-w-fit">
                    {username}
                </span>
            </div>
        </div>
    );
}