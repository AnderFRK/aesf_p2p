import { VideoCameraIcon, VideoCameraSlashIcon, MicrophoneIcon, PhoneXMarkIcon, ArrowPathIcon } from '@heroicons/react/24/solid';

export default function Controls({ micOn, cameraOn, toggleMic, toggleCamera, handleManualDisconnect, handleRefresh }) {
  return (
    <div className="flex gap-2 items-center">
        <button onClick={handleRefresh} title="Reconectar Señal" className="p-2 rounded-full bg-blue-600 hover:bg-blue-500 text-white mr-2">
            <ArrowPathIcon className="w-4 h-4" />
        </button>

        <button onClick={toggleMic} className={`p-2 rounded-full ${micOn ? 'bg-gray-600' : 'bg-red-500 text-white'}`}>
            <MicrophoneIcon className="w-5 h-5"/>
        </button>
        <button onClick={toggleCamera} className={`p-2 rounded-full ${cameraOn ? 'bg-emerald-600' : 'bg-gray-600 text-gray-400'}`}>
            {cameraOn ? <VideoCameraIcon className="w-5 h-5 text-white"/> : <VideoCameraSlashIcon className="w-5 h-5"/>}
        </button>
        <button onClick={handleManualDisconnect} title="Salir" className="p-2 rounded-full bg-red-600 hover:bg-red-500 text-white ml-2">
            <PhoneXMarkIcon className="w-5 h-5" />
        </button>
    </div>
  );
}