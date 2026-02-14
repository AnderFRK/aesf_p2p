import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { PaperAirplaneIcon } from '@heroicons/react/24/solid';
import { supabase } from '../../lib/supabase';

export default function Room() {
  const { roomId } = useParams();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  
  // Estados de usuario
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);

  const messagesEndRef = useRef(null);

  // 1. CARGAR USUARIO Y PERFIL
  useEffect(() => {
    const getProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUser(user);

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      setUserProfile(profile);
    };
    getProfile();
  }, []);

  // 2. CARGAR HISTORIAL Y REALTIME
  useEffect(() => {
    if (!roomId) return;
    setMessages([]); // Limpiar mensajes al cambiar de sala
    
    // A. Cargar historial
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('message')
        .select('*, sender:profiles(username, avatar_url)')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });
      if (!error) setMessages(data || []);
    };
    fetchMessages();

    // B. Conexión Realtime
    const channel = supabase
      .channel(`room:${roomId}`)
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'message', filter: `room_id=eq.${roomId}` }, 
        async (payload) => {
          // Buscamos los datos del usuario que envió el mensaje para tener su foto/nombre
          const { data: sender } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', payload.new.sender_id)
            .single();
          
          const newMsg = { ...payload.new, sender };
          setMessages(prev => [...prev, newMsg]);
        }
      )
      .subscribe(status => setIsConnected(status === 'SUBSCRIBED'));

    return () => channel.unsubscribe();
  }, [roomId]);

  // 3. AUTO SCROLL AL FINAL
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 4. FUNCIÓN PARA ENVIAR MENSAJE (¡ESTA ES LA QUE TE FALTABA!)
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser) return;

    const content = newMessage;
    setNewMessage(''); // Limpiar input inmediatamente

    const { error } = await supabase
      .from('message')
      .insert({
        content,
        room_id: roomId,
        sender_id: currentUser.id,
        type: 'text'
      });

    if (error) console.error('Error enviando mensaje:', error);
  };

  // RENDERIZADO
  return (
    <div className="flex flex-col h-full bg-gray-700">
      {/* HEADER */}
      <header className="h-12 border-b border-gray-600 flex items-center justify-between px-4 bg-gray-750 shrink-0">
        <h3 className="font-bold text-white flex items-center gap-2">
          <span className="text-gray-400">#</span> {roomId}
        </h3>
        <div className="flex items-center gap-2 text-xs font-medium">
             {/* Indicador de conexión */}
             <span className={`h-2.5 w-2.5 rounded-full ${isConnected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500'}`}></span>
        </div>
      </header>

      {/* LISTA DE MENSAJES */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.map(msg => (
          <div key={msg.id} className="flex gap-3 group hover:bg-gray-600/30 p-2 -mx-2 rounded transition-colors">
            <img
              src={msg.sender?.avatar_url || `https://ui-avatars.com/api/?name=${msg.sender?.username || 'U'}`}
              className="w-10 h-10 rounded-full bg-gray-600 object-cover shrink-0"
              alt="avatar"
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

      {/* INPUT */}
      <form onSubmit={sendMessage} className="p-4 flex gap-2 bg-gray-600 shrink-0">
        <input
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          placeholder={`Enviar a #${roomId}`}
          className="flex-1 bg-transparent text-white outline-none placeholder-gray-400"
        />
        <button type="submit" disabled={!newMessage.trim()} className="hover:bg-gray-700 p-1 rounded transition-colors">
          <PaperAirplaneIcon className={`w-5 h-5 ${newMessage.trim() ? 'text-emerald-400' : 'text-gray-500'}`} />
        </button>
      </form>
    </div>
  );
}