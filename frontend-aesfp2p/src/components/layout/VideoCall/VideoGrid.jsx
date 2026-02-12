import { useEffect, useRef, useState } from 'react';

export default function VideoGrid({ localStream, remoteStreams, detectedUsers, cameraOn, micOn, myAvatar }) {
  return (
    <div className="flex flex-wrap gap-4 justify-center md:justify-start">
      {/* VIDEO LOCAL */}
      <div className="relative w-40 h-28 bg-black rounded-lg overflow-hidden border border-emerald-500/50 flex items-center justify-center">
         <video 
            ref={v => {if(v) v.srcObject = localStream}} 
            autoPlay muted playsInline 
            className={`w-full h-full object-cover transform scale-x-[-1] ${!cameraOn ? 'hidden' : ''}`} 
         />
         {!cameraOn && (
             <div className="flex flex-col items-center">
                 <img src={myAvatar} className="w-10 h-10 rounded-full opacity-50 mb-1" alt="Tú"/>
                 <span className="text-[10px] text-gray-500">Tú</span>
             </div>
         )}
         <div className={`absolute top-2 right-2 w-2.5 h-2.5 rounded-full border border-black ${micOn ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
      </div>

      {/* VIDEOS REMOTOS */}
      {Object.entries(remoteStreams).map(([peerId, stream]) => {
         const userInfo = detectedUsers.find(u => u.peerId === peerId) || { username: 'Conectando...' };
         return <RemoteVideo key={peerId} stream={stream} username={userInfo.username} avatar={userInfo.avatar_url} />
      })}
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
            {!hasVideo && (
                <div className="flex flex-col items-center">
                    <img src={avatar || `https://ui-avatars.com/api/?name=${username}`} className="w-10 h-10 rounded-full opacity-60 mb-1" alt="User"/>
                    <span className="text-gray-500 text-[10px]">Solo Audio</span>
                </div>
            )}
            <span className="absolute bottom-1 left-1 text-[10px] bg-black/60 text-white px-1.5 rounded max-w-[90%] truncate">{username}</span>
        </div>
    );
}