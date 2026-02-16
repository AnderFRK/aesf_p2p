import VideoGrid from './VideoGrid';
import Controls from './Controls'; 
import { ArrowsPointingOutIcon, ArrowsPointingInIcon } from '@heroicons/react/24/solid';

import { useVoice } from '../../../context/VoiceContext';

export default function VideoCall({ 
    isExpanded, 
    onToggleExpand 
}) {
  const { 
      localStream, 
      remoteStreams, 
      detectedUsers = [],
      statusMsg, 
      supabaseStatus, 
      isHost, 
      myAvatar,
      cameraOn, 
      micOn, 
      hasWebcam, 
      hasMic, 
      toggleMic, 
      toggleCam,
      handleManualDisconnect, 
      joinRoom 
  } = useVoice();

  return (
    <div className="bg-gray-900 h-full flex flex-col overflow-hidden">
      
      {/* HEADER */}
      <div className={`bg-gray-800 p-3 border-b border-gray-700 flex justify-between items-center shrink-0 shadow-md z-10 drag-handle ${!isExpanded ? 'cursor-move' : ''}`}>
        
        <div className="flex flex-col gap-0.5 pointer-events-none select-none">
            <div className="flex items-center gap-2">
                <h3 className="text-emerald-400 font-bold flex items-center gap-1.5 text-xs uppercase tracking-wide">
                   🔊 Voz Activa
                </h3>
                <span className={`text-[9px] px-1.5 rounded-sm border font-bold tracking-wider ${
                    isHost ? 'border-yellow-500/50 text-yellow-400 bg-yellow-900/20' : 'border-blue-500/50 text-blue-400 bg-blue-900/20'
                }`}>
                    {isHost ? 'HOST' : 'GUEST'}
                </span>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-gray-400 font-mono">
                <span className={supabaseStatus === 'SUBSCRIBED' ? 'text-emerald-500' : 'text-red-400'}>
                    {supabaseStatus === 'SUBSCRIBED' ? '● LIVE' : '○ ...'}
                </span>
                <span>👥 {(detectedUsers?.length || 0) + 1}</span>
            </div>
        </div>

        <div className="flex items-center gap-2" onMouseDown={(e) => e.stopPropagation()}>
             <div className="scale-90 origin-right"> 
                <Controls 
                    micOn={micOn} 
                    cameraOn={cameraOn} 
                    toggleMic={toggleMic} 
                    toggleCamera={toggleCam}
                    handleManualDisconnect={handleManualDisconnect} 
                    handleRefresh={() => joinRoom(useVoice().activeRoomId)}
                    hasWebcam={hasWebcam} 
                    hasMic={hasMic}
                />
            </div>
            
            <button 
                onClick={onToggleExpand}
                className="p-1.5 text-gray-400 hover:text-white bg-gray-700/50 hover:bg-gray-600 rounded-lg transition-colors ml-1 border border-gray-600"
                title={isExpanded ? "Minimizar" : "Pantalla Completa"}
            >
                {isExpanded ? (
                    <ArrowsPointingInIcon className="w-4 h-4" />
                ) : (
                    <ArrowsPointingOutIcon className="w-4 h-4" />
                )}
            </button>
        </div>
      </div>

      {/* BODY */}
      <div className="flex-1 bg-black relative overflow-hidden">
        <VideoGrid 
            localStream={localStream} 
            remoteStreams={remoteStreams} 
            detectedUsers={detectedUsers || []}
            cameraOn={cameraOn} 
            micOn={micOn} 
            myAvatar={myAvatar}
        />
      </div>
    </div>
  );
}