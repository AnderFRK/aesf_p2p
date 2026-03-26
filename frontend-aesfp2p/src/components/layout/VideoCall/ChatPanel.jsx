import { useState, useRef, useEffect } from 'react';
import { PaperAirplaneIcon, XMarkIcon, ArrowDownTrayIcon, UsersIcon, ChatBubbleLeftIcon } from '@heroicons/react/24/solid';

export default function ChatPanel({ isOpen, onClose, messages = [], onSendMessage, onExport, detectedUsers = [], myAvatar, isHost }) {
  const [text, setText] = useState('');
  
  const [activeTab, setActiveTab] = useState('chat'); 
  
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (activeTab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, activeTab]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (text.trim() === '') return;
    onSendMessage(text.trim());
    setText('');
  };

  if (!isOpen) return null;

  return (
    <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col h-full shrink-0 animate-in slide-in-from-right-8 duration-300">
      
      {/* HEADER CON PESTAÑAS (TABS) */}
      <div className="h-14 flex items-center justify-between px-3 border-b border-gray-700 bg-gray-800/95 shrink-0">
        
        {/* Pestañas (Cambian entre Chat y Gente) */}
        <div className="flex gap-1 bg-gray-900/50 p-1 rounded-lg">
          <button 
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
              activeTab === 'chat' ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-400 hover:text-white'
            }`}
          >
            <ChatBubbleLeftIcon className="w-4 h-4" />
            Chat
          </button>
          
          <button 
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
              activeTab === 'users' ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-400 hover:text-white'
            }`}
          >
            <UsersIcon className="w-4 h-4" />
            User
            <span className="bg-emerald-600/20 text-emerald-400 px-1.5 py-0.5 rounded-full text-[10px]">
              {detectedUsers.length + 1}
            </span>
          </button>
        </div>

        {/* Botones de acción (Exportar y Cerrar Panel) */}
        <div className="flex items-center gap-1">
          {activeTab === 'chat' && (
            <button onClick={onExport} className="p-1.5 text-gray-400 hover:text-emerald-400 hover:bg-gray-700 rounded-lg transition-colors" title="Exportar Chat">
              <ArrowDownTrayIcon className="w-4 h-4" />
            </button>
          )}
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg transition-colors" title="Cerrar Panel">
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* --- CONTENIDO DE LA PESTAÑA CHAT --- */}
      {activeTab === 'chat' && (
        <>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-gray-900/50">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 text-xs mt-10">
                No hay mensajes aún.<br/>¡Sé el primero en escribir!
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div key={idx} className={`flex flex-col ${msg.isMine ? 'items-end' : 'items-start'}`}>
                  <span className="text-[10px] text-gray-500 mb-1 px-1">{msg.sender} • {msg.time}</span>
                  <div className={`px-3 py-2 rounded-xl text-sm max-w-[90%] break-words shadow-sm ${
                    msg.isMine 
                      ? 'bg-emerald-600 text-white rounded-tr-none' 
                      : 'bg-gray-700 text-gray-100 rounded-tl-none'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 bg-gray-800 border-t border-gray-700 shrink-0">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Escribe un mensaje..."
                className="flex-1 bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                autoComplete="off"
              />
              <button type="submit" disabled={!text.trim()} className="p-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg transition-colors shadow-md">
                <PaperAirplaneIcon className="w-4 h-4" />
              </button>
            </form>
          </div>
        </>
      )}

      {/* --- CONTENIDO DE LA PESTAÑA PARTICIPANTES --- */}
      {activeTab === 'users' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar bg-gray-900/50">
          
          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">En la sala</h4>
          
          {/* 1. Mi Propio Usuario */}
          <div className="flex items-center gap-3 p-3 bg-gray-800/80 rounded-xl border border-emerald-500/30 shadow-sm">
            <img 
              src={myAvatar || `https://ui-avatars.com/api/?name=Yo&background=10b981&color=fff`} 
              alt="Mi Avatar" 
              className="w-10 h-10 rounded-full object-cover border-2 border-emerald-500/50"
            />
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-sm font-semibold text-white truncate">Yo (Tú)</span>
              <span className={`text-[10px] font-bold tracking-wider uppercase ${isHost ? 'text-yellow-400' : 'text-blue-400'}`}>
                {isHost ? '👑 Host' : '👤 Guest'}
              </span>
            </div>
          </div>

          {/* 2. Lista de Invitados */}
          {detectedUsers.map((u, idx) => (
            <div key={idx} className="flex items-center gap-3 p-3 bg-gray-800/30 rounded-xl border border-transparent hover:border-gray-700 transition-colors group">
              <img 
                src={u.avatar_url || `https://ui-avatars.com/api/?name=${u.username}&background=random`} 
                alt={u.username} 
                className="w-10 h-10 rounded-full object-cover border-2 border-gray-700 group-hover:border-gray-500 transition-colors"
              />
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-sm font-medium text-gray-200 truncate">{u.username}</span>
                <span className="text-[10px] text-gray-500 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Conectado
                </span>
              </div>
            </div>
          ))}

        </div>
      )}

    </div>
  );
}