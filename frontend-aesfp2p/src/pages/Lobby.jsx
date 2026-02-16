import { useState } from 'react';
import { useVoice } from '../context/VoiceContext';
import { VideoCameraIcon, UserGroupIcon, ClipboardDocumentIcon } from '@heroicons/react/24/solid';

export default function Lobby() {
  const { joinRoom } = useVoice();
  const [inputCode, setInputCode] = useState('');

  // Generar ID aleatorio (ej: "abc-123")
  const createNewMeeting = () => {
    const randomId = Math.random().toString(36).substring(2, 5) + '-' + Math.random().toString(36).substring(2, 5);
    joinRoom(randomId);
  };

  const joinExistingMeeting = (e) => {
    e.preventDefault();
    if (inputCode.trim()) {
      joinRoom(inputCode.trim());
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center bg-gray-900 text-white p-4">
      
      <div className="max-w-md w-full bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-700">
        <h1 className="text-3xl font-bold text-center text-emerald-400 mb-2">AESF Meet</h1>
        <p className="text-gray-400 text-center mb-8">Videollamadas P2P Seguras y Rápidas</p>

        {/* --- OPCIÓN 1: CREAR --- */}
        <button 
          onClick={createNewMeeting}
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-3 transition-transform hover:scale-[1.02] active:scale-95 mb-6 shadow-lg shadow-emerald-900/20"
        >
          <VideoCameraIcon className="w-6 h-6" />
          <span>Crear Nueva Reunión</span>
        </button>

        <div className="flex items-center gap-4 mb-6">
          <div className="h-px bg-gray-700 flex-1"></div>
          <span className="text-gray-500 text-sm">O únete a una</span>
          <div className="h-px bg-gray-700 flex-1"></div>
        </div>

        {/* --- OPCIÓN 2: UNIRSE --- */}
        <form onSubmit={joinExistingMeeting} className="flex gap-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <UserGroupIcon className="h-5 w-5 text-gray-500" />
            </div>
            <input
              type="text"
              placeholder="Ingresa el código (ej: abc-xyz)"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block pl-10 p-3"
            />
          </div>
          <button 
            type="submit"
            disabled={!inputCode}
            className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-lg transition-colors"
          >
            Unirse
          </button>
        </form>
      </div>

    </div>
  );
}