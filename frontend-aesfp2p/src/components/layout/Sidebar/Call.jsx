import { 
  SignalIcon, 
  PhoneXMarkIcon, 
  MicrophoneIcon, 
  VideoCameraIcon,
  VideoCameraSlashIcon, 
  Cog6ToothIcon 
} from '@heroicons/react/24/solid';

export default function Call({ 
    channelName, 
    onLeave, 
    onToggleMic, 
    onToggleCam, 
    micOn = true, 
    cameraOn = false,
    isHost,
    statusMsg,
    supabaseStatus
}) {
  return (
    <div className="bg-gray-850 border-t border-gray-700 p-2 pb-1">
        <div className="flex items-center justify-between mb-1 px-1">
            <div className="flex items-center gap-2">
                <span className="text-emerald-400 text-[10px] font-bold flex items-center gap-1 uppercase tracking-wide">
                    <SignalIcon className="w-3 h-3" />
                    Voz
                </span>
                <span className={`text-[9px] px-1 py-px rounded border font-bold tracking-wider ${
                    isHost 
                    ? 'border-yellow-500/50 text-yellow-400 bg-yellow-900/20' 
                    : 'border-blue-500/50 text-blue-400 bg-blue-900/20'
                }`}>
                    {isHost ? 'HOST' : 'GUEST'}
                </span>
            </div>
            <span className={`text-[9px] font-mono truncate max-w-[80px] ${
                supabaseStatus === 'SUBSCRIBED' ? 'text-emerald-500' : 'text-gray-500'
            }`}>
                {supabaseStatus === 'SUBSCRIBED' ? 'Conectado' : statusMsg || '...'}
            </span>
        </div>
        
        <div className="bg-gray-900 p-2 rounded border border-gray-700/50 flex flex-col gap-2">
            
            <div className="flex items-center justify-between">
                <div className="flex flex-col min-w-0">
                    <span className="text-white text-xs font-bold truncate">
                        {channelName || 'Sala de Voz'}
                    </span>
                    <span className="text-[10px] text-gray-400 truncate flex items-center gap-1">
                         <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                         En directo
                    </span>
                </div>
            </div>
            <div className="flex items-center justify-between pt-1">
                <div className="flex gap-1">
                    <button 
                        onClick={onToggleMic}
                        className={`p-1.5 rounded transition-colors ${micOn ? 'text-gray-400 hover:bg-gray-700 hover:text-white' : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'}`}
                        title={micOn ? "Silenciar" : "Activar Micro"}
                    >
                        <MicrophoneIcon className="w-5 h-5" /> 
                    </button>
                    <button 
                        onClick={onToggleCam}
                        className={`p-1.5 rounded transition-colors ${cameraOn ? 'text-emerald-400 hover:bg-gray-700' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}
                        title="Alternar Cámara"
                    >
                        {cameraOn ? <VideoCameraIcon className="w-5 h-5" /> : <VideoCameraSlashIcon className="w-5 h-5" />}
                    </button>
                     <button 
                        className="p-1.5 rounded text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
                        title="Configuración"
                    >
                        <Cog6ToothIcon className="w-5 h-5" />
                    </button>
                </div>
                <button 
                    onClick={onLeave}
                    className="p-1.5 rounded hover:bg-red-500 text-gray-400 hover:text-white transition-colors"
                    title="Desconectar"
                >
                    <PhoneXMarkIcon className="w-5 h-5" />
                </button>
            </div>
        </div>
    </div>
  );
}