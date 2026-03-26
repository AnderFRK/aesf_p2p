import { useState } from 'react'; 
import VideoGrid from './VideoGrid';
import Controls from './Controls'; 
import ChatPanel from './ChatPanel';
import { 
    ArrowsPointingOutIcon, 
    ArrowsPointingInIcon, 
    ChatBubbleLeftEllipsisIcon 
} from '@heroicons/react/24/solid';

import { useVoice } from '../../../context/VoiceContext';

export default function VideoCall({ 
    isExpanded, 
    onToggleExpand,
    profile
}) {
  const { 
      localStream, 
      remoteStreams, 
      detectedUsers = [],
      supabaseStatus, 
      isHost, 
      cameraOn, 
      micOn, 
      hasWebcam, 
      hasMic, 
      toggleMic, 
      toggleCam,
      handleManualDisconnect, 
      messages,
      sendChatMessage
  } = useVoice();

  const realAvatar = profile?.avatar_url;
  const myUsername = profile?.username || "Yo";
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <div className="bg-gray-900 h-full flex flex-col overflow-hidden">
      
      {/* HEADER RESPONSIVO */}
      <div className={`bg-gray-800 p-2 sm:p-3 border-b border-gray-700 flex justify-between items-center shrink-0 shadow-md z-10 drag-handle ${!isExpanded ? 'cursor-move' : ''}`}>
        
        {/* LADO IZQUIERDO: Textos e Info */}
        <div className="flex flex-col gap-0.5 pointer-events-none select-none min-w-0 pr-2">
            <div className="flex items-center gap-1.5 sm:gap-2">
                <h3 className="text-emerald-400 font-bold flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs uppercase tracking-wide truncate">
                   🔊 <span className="hidden sm:inline">Voz Activa</span>
                </h3>
                <span className={`shrink-0 text-[8px] sm:text-[9px] px-1 sm:px-1.5 rounded-sm border font-bold tracking-wider ${
                    isHost ? 'border-yellow-500/50 text-yellow-400 bg-yellow-900/20' : 'border-blue-500/50 text-blue-400 bg-blue-900/20'
                }`}>
                    {isHost ? 'HOST' : 'GUEST'}
                </span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 text-[9px] sm:text-[10px] text-gray-400 font-mono mt-0.5">
                <span className={`shrink-0 ${supabaseStatus === 'SUBSCRIBED' ? 'text-emerald-500' : 'text-red-400'}`}>
                    {supabaseStatus === 'SUBSCRIBED' ? '● LIVE' : '○ ...'}
                </span>
                <span className="shrink-0">👥 {(detectedUsers?.length || 0) + 1}</span>
            </div>
        </div>

        {/* LADO DERECHO: Controles (Blindados con shrink-0 para no deformarse) */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0" onMouseDown={(e) => e.stopPropagation()}>
            
            {/* Controles de Hardware (Micro/Cam/Colgar) */}
             <div className="scale-75 sm:scale-90 origin-right shrink-0"> 
                <Controls 
                    micOn={micOn} 
                    cameraOn={cameraOn} 
                    toggleMic={toggleMic} 
                    toggleCamera={toggleCam}
                    handleManualDisconnect={handleManualDisconnect} 
                    hasWebcam={hasWebcam} 
                    hasMic={hasMic}
                />
            </div>
            
            <div className="h-5 sm:h-6 w-px bg-gray-600 mx-0.5 sm:mx-1 shrink-0"></div>

            {/* BOTÓN CHAT */}
            <button 
                onClick={() => setIsChatOpen(!isChatOpen)}
                className={`shrink-0 p-1.5 sm:p-2 rounded-lg transition-colors border ${
                  isChatOpen 
                    ? 'bg-emerald-600 text-white border-emerald-500' 
                    : 'text-gray-400 hover:text-white bg-gray-700/50 hover:bg-gray-600 border-gray-600'
                }`}
                title="Abrir Chat"
            >
                <ChatBubbleLeftEllipsisIcon className="w-4 h-4" />
            </button>

            {/* BOTÓN EXPANDIR */}
            <button 
                onClick={onToggleExpand}
                className="shrink-0 p-1.5 sm:p-2 text-gray-400 hover:text-white bg-gray-700/50 hover:bg-gray-600 rounded-lg transition-colors border border-gray-600"
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

      {/* BODY (Video + Chat) */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* ZONA DE VIDEOS */}
        <div className="flex-1 bg-black relative overflow-hidden transition-all duration-300">
          <VideoGrid 
              localStream={localStream} 
              remoteStreams={remoteStreams} 
              detectedUsers={detectedUsers || []}
              cameraOn={cameraOn} 
              micOn={micOn} 
              myAvatar={realAvatar} 
              myUsername={myUsername}
          />
        </div>

        <ChatPanel 
            isOpen={isChatOpen} 
            onClose={() => setIsChatOpen(false)}
            messages={messages}
            onSendMessage={sendChatMessage}
            onExport={() => alert("Pronto exportaremos esto a un TXT!")}
            detectedUsers={detectedUsers}
            myAvatar={realAvatar} 
            myUsername={myUsername}
            isHost={isHost}
        />

      </div>
    </div>
  );
}