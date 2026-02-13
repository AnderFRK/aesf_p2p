import { 
  SignalIcon, 
  PhoneXMarkIcon, 
  MicrophoneIcon, 
  VideoCameraIcon,
  VideoCameraSlashIcon, 
  Cog6ToothIcon // El engranaje
} from '@heroicons/react/24/solid';

export default function Call({ 
    channelName, 
    onLeave, 
    onToggleMic, 
    onToggleCam, 
    micOn = true, 
    cameraOn = false 
}) {
  return (
    <div className="bg-gray-850 border-t border-gray-700 p-2 pb-1">
        {/* Cabecera Verde */}
        <div className="flex items-center justify-between mb-1 px-1">
            <span className="text-emerald-400 text-[10px] font-bold flex items-center gap-1 uppercase tracking-wide">
                <SignalIcon className="w-3 h-3" />
                Voz Conectada
            </span>
            <span className="text-[10px] text-emerald-600/70 font-mono">RTC Connected</span>
        </div>
        
        {/* Tarjeta de Controles */}
        <div className="bg-gray-900 p-2 rounded border border-gray-700/50 flex flex-col gap-2">
            
            {/* Nombre del Canal */}
            <div className="flex items-center justify-between">
                <div className="flex flex-col min-w-0">
                    <span className="text-white text-xs font-bold truncate">
                        {channelName || 'Sala de Voz'}
                    </span>
                    <span className="text-[10px] text-gray-400 truncate">
                        En directo
                    </span>
                </div>
            </div>

            {/* BOTONES DE CONTROL */}
            <div className="flex items-center justify-between pt-1">
                <div className="flex gap-1">
                    {/* Botón Micrófono */}
                    <button 
                        onClick={onToggleMic}
                        className={`p-1.5 rounded transition-colors ${micOn ? 'text-gray-400 hover:bg-gray-700 hover:text-white' : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'}`}
                        title={micOn ? "Silenciar" : "Activar Micro"}
                    >
                        {/* Aquí podrías poner el icono tachado si micOn es false */}
                        <MicrophoneIcon className="w-5 h-5" /> 
                    </button>

                    {/* Botón Cámara */}
                    <button 
                        onClick={onToggleCam}
                        className={`p-1.5 rounded transition-colors ${cameraOn ? 'text-emerald-400 hover:bg-gray-700' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}
                        title="Alternar Cámara"
                    >
                        {cameraOn ? <VideoCameraIcon className="w-5 h-5" /> : <VideoCameraSlashIcon className="w-5 h-5" />}
                    </button>

                     {/* Botón Configuración de Llamada */}
                     <button 
                        className="p-1.5 rounded text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
                        title="Configuración de Voz"
                    >
                        <Cog6ToothIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Botón Colgar (Rojo) */}
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