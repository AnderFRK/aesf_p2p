import { useVideoLogic } from './useVideoLogic';
import VideoGrid from './VideoGrid';
import Controls from './Controls';

export default function VideoCall({ roomId, session, onLeave }) {
  // Obtenemos todo el estado y funciones del hook
  const {
    localStream, remoteStreams, detectedUsers,
    statusMsg, supabaseStatus, cameraOn, micOn,
    myAvatar,
    toggleMic, toggleCamera, handleManualDisconnect, handleRefresh
  } = useVideoLogic(roomId, session, onLeave);

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
        
        {/* CONTROLES */}
        <Controls 
            micOn={micOn} 
            cameraOn={cameraOn} 
            toggleMic={toggleMic} 
            toggleCamera={toggleCamera} 
            handleManualDisconnect={handleManualDisconnect}
            handleRefresh={handleRefresh}
        />
      </div>
      
      <VideoGrid 
          localStream={localStream}
          remoteStreams={remoteStreams}
          detectedUsers={detectedUsers}
          cameraOn={cameraOn}
          micOn={micOn}
          myAvatar={myAvatar}
      />
    </div>
  );
}