import { useVideoLogic } from './useVideoLogic';
import VideoGrid from './VideoGrid';
import Controls from './Controls';

export default function VideoCall({ roomId, session, onLeave }) {
    const {
        localStream, remoteStreams, detectedUsers,
        statusMsg, supabaseStatus, 
        cameraOn, micOn,
        myAvatar, 
        isHost,
        hasWebcam, 
        hasMic,
        toggleMic, toggleCamera, handleManualDisconnect, handleRefresh
    } = useVideoLogic(roomId, session, onLeave);

  return (
    <div className="bg-gray-800 p-4 border-b border-gray-600 flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
                <h3 className="text-emerald-400 font-bold flex items-center gap-2 text-sm">
                🔊 Voz Conectada
                </h3>
                <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold tracking-wider ${
                    isHost 
                    ? 'border-yellow-500 text-yellow-400 bg-yellow-900/20' 
                    : 'border-blue-500 text-blue-400 bg-blue-900/20'
                }`}>
                    {isHost ? 'HOST' : 'GUEST'}
                </span>
            </div>
            <div className="flex flex-col text-[10px] text-gray-400 font-mono">
                <span>Estado: {statusMsg}</span>
                <span className={supabaseStatus === 'SUBSCRIBED' ? 'text-green-500' : 'text-red-400'}>
                    Supabase: {supabaseStatus}
                </span>
                <span>Detectados: {detectedUsers.length}</span>
            </div>
        </div>
    <Controls 
        micOn={micOn} 
        cameraOn={cameraOn} 
        toggleMic={toggleMic} 
        toggleCamera={toggleCamera} 
        handleManualDisconnect={handleManualDisconnect}
        handleRefresh={handleRefresh}
        hasWebcam={hasWebcam}
        hasMic={hasMic}
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