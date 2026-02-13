import VideoGrid from './VideoGrid';
import Controls from './Controls';

export default function VideoCall({ 
    // Datos de Video
    localStream, 
    remoteStreams, 
    detectedUsers, 
    
    // Estado y UI
    statusMsg, 
    supabaseStatus, 
    isHost,
    myAvatar,
    
    // Estado de Hardware
    cameraOn, 
    micOn,
    hasWebcam, 
    hasMic,
    
    // Acciones (Funciones)
    toggleMic, 
    toggleCamera, 
    handleManualDisconnect, 
    handleRefresh 
}) {

  return (
    <div className="bg-gray-900 h-full flex flex-col overflow-hidden">
      
      {/* --- HEADER --- */}
      <div className="bg-gray-800 p-3 border-b border-gray-700 flex justify-between items-center shrink-0 shadow-md z-10">
        
        {/* Lado Izquierdo: Info de Estado */}
        <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
                <h3 className="text-emerald-400 font-bold flex items-center gap-1.5 text-xs uppercase tracking-wide">
                   🔊 Voz Activa
                </h3>
                
                {/* Badge de HOST/GUEST */}
                <span className={`text-[9px] px-1.5 rounded-sm border font-bold tracking-wider ${
                    isHost 
                    ? 'border-yellow-500/50 text-yellow-400 bg-yellow-900/20' 
                    : 'border-blue-500/50 text-blue-400 bg-blue-900/20'
                }`}>
                    {isHost ? 'HOST' : 'GUEST'}
                </span>
            </div>
            
            <div className="flex items-center gap-3 text-[10px] text-gray-400 font-mono">
                <span className="truncate max-w-[100px]">{statusMsg}</span>
                <span className={`flex items-center gap-1 ${supabaseStatus === 'SUBSCRIBED' ? 'text-emerald-500' : 'text-red-400'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${supabaseStatus === 'SUBSCRIBED' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                    {supabaseStatus === 'SUBSCRIBED' ? 'LIVE' : supabaseStatus}
                </span>
                <span>👥 {detectedUsers.length}</span>
            </div>
        </div>

        {/* Lado Derecho: Controles Compactos */}
        {/* Pasamos todas las props necesarias a Controls */}
        <div className="scale-90 origin-right"> 
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
      </div>
      
      {/* --- GRID DE VIDEO (Ocupa todo el espacio restante) --- */}
      <div className="flex-1 bg-black relative overflow-hidden">
        <VideoGrid 
            localStream={localStream}
            remoteStreams={remoteStreams}
            detectedUsers={detectedUsers}
            statusMsg={statusMsg} 
            supabaseStatus={supabaseStatus}
            isHost={isHost}
            cameraOn={cameraOn}
            micOn={micOn}
            hasMic={hasMic}
            hasWebcam={hasWebcam}
            toggleMic={toggleMic}
            toggleCamera={toggleCamera}
            handleManualDisconnect={handleManualDisconnect}
        />
      </div>

    </div>
  );
}