import { VideoCameraIcon, VideoCameraSlashIcon, MicrophoneIcon, PhoneXMarkIcon, ArrowPathIcon } from '@heroicons/react/24/solid';

export default function Controls({ 
        micOn, 
        cameraOn, 
        toggleMic, 
        toggleCamera, 
        handleManualDisconnect, 
        handleRefresh,
        hasWebcam,
        hasMic 
    }) {
  return (
    <div className="flex gap-2 items-center">
        <button 
            onClick={handleRefresh} 
            title="Reconectar Señal" 
            className="p-2 rounded-full bg-blue-600 hover:bg-blue-500 text-white mr-2 transition-colors"
        >
            <ArrowPathIcon className="w-4 h-4" />
        </button>
        <button 
            onClick={hasMic ? toggleMic : undefined} 
            disabled={!hasMic}
            title={hasMic ? (micOn ? "Silenciar" : "Activar Micrófono") : "No se detectó micrófono"}
            className={`p-2 rounded-full transition-all ${
                !hasMic 
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed opacity-50'
                    : micOn 
                        ? 'bg-gray-600 hover:bg-gray-500 text-white'
                        : 'bg-red-500 hover:bg-red-600 text-white'
            }`}
        >
            <MicrophoneIcon className="w-5 h-5"/>
        </button>

        <button 
            onClick={hasWebcam ? toggleCamera : undefined} 
            disabled={!hasWebcam}
            title={hasWebcam ? (cameraOn ? "Apagar Cámara" : "Encender Cámara") : "No se detectó cámara"}
            className={`p-2 rounded-full transition-all ${
                !hasWebcam 
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed opacity-50'
                    : cameraOn 
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        : 'bg-gray-600 hover:bg-gray-500 text-gray-400'
            }`}
        >
            {cameraOn ? <VideoCameraIcon className="w-5 h-5 text-white"/> : <VideoCameraSlashIcon className="w-5 h-5"/>}
        </button>
        <button 
            onClick={handleManualDisconnect} 
            title="Salir" 
            className="p-2 rounded-full bg-red-600 hover:bg-red-500 text-white ml-2 transition-colors"
        >
            <PhoneXMarkIcon className="w-5 h-5" />
        </button>
    </div>
  );
}