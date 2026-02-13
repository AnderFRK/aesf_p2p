import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { PaperAirplaneIcon } from '@heroicons/react/24/solid'; // Quitamos VideoCameraIcon
import { supabase } from '../../lib/supabase';
// Quitamos import VideoCall

export default function Room() {
  const { roomId } = useParams();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  
  // Quitamos estado showVideo

  const [isConnected, setIsConnected] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);

  const messagesEndRef = useRef(null);

  /* ... (TODA LA LÓGICA DE USUARIO, PERFIL, HISTORIAL Y REALTIME SE QUEDA IGUAL) ... */
  // Copia tu useEffect de getProfile y fetchMessages aquí, son idénticos.

  // ... (Lógica de Auto Scroll y Send Message igual) ...

  // RENDERIZADO SIMPLIFICADO
  return (
    <div className="flex flex-col h-full bg-gray-700">
      <header className="h-12 border-b border-gray-600 flex items-center justify-between px-4 bg-gray-750 shrink-0">
        <h3 className="font-bold text-white flex items-center gap-2">
          <span className="text-gray-400">#</span> {roomId}
        </h3>
        <div className="flex items-center gap-4">
            {/* ELIMINAMOS EL BOTÓN DE VIDEO DE AQUÍ */}
            <div className="flex items-center gap-2 text-xs font-medium">
                <span className={`h-2.5 w-2.5 rounded-full ${isConnected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500'}`}></span>
            </div>
        </div>
      </header>

      {/* ELIMINAMOS EL BLOQUE {showVideo && <VideoCall ... />} DE AQUÍ */}

      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.map(msg => (
          <div key={msg.id} className="flex gap-3 group hover:bg-gray-600/30 p-2 -mx-2 rounded transition-colors">
            <img
              src={msg.sender?.avatar_url || `https://ui-avatars.com/api/?name=${msg.sender?.username || 'U'}`}
              className="w-10 h-10 rounded-full bg-gray-600 object-cover shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="text-white font-bold flex items-baseline gap-2">
                {msg.sender?.username || 'Usuario'}
                <span className="text-xs text-gray-400 font-normal">
                  {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                </span>
              </div>
              <p className="text-gray-300 break-words whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} /* ... El form se queda igual ... */>
        {/* ... inputs ... */}
      </form>
    </div>
  );
}