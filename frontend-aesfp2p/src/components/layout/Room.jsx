import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { PaperAirplaneIcon, VideoCameraIcon } from '@heroicons/react/24/solid';
import { supabase } from '../../lib/supabase';
import VideoCall from './VideoCall';

export default function Room() {
  const { roomId } = useParams();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  
  const [showVideo, setShowVideo] = useState(false); 

  const [isConnected, setIsConnected] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);

  const messagesEndRef = useRef(null);

  /* =========================
     USUARIO + PERFIL
  ========================= */
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

  /* =========================
     HISTORIAL + REALTIME
  ========================= */
  useEffect(() => {
    if (!roomId) return;

    setMessages([]); 
    setIsConnected(false);

    // 1. Cargar Historial
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('message')
        .select('*, sender:profiles(username, avatar_url)')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });

      if (error) console.error('Error historial:', error);
      else setMessages(data || []);
    };

    fetchMessages();
    const channelName = `room:${roomId}:${Date.now()}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message',
          filter: `room_id=eq.${roomId}`
        },
        async (payload) => {
          const { data: senderProfile } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', payload.new.sender_id)
            .single();

          const newMessageReceived = {
            ...payload.new,
            sender: senderProfile
          };

          setMessages((prev) => {
            if (prev.some(m => m.id === newMessageReceived.id)) {
              return prev;
            }
            return [...prev, newMessageReceived];
          });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setIsConnected(true);
        else setIsConnected(false);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  /* =========================
    AUTO SCROLL
  ========================= */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /* =========================
     ENVIAR MENSAJE
  ========================= */
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser) return;

    const texto = newMessage;
    setNewMessage(''); 

    const { data: msgGuardado, error } = await supabase
      .from('message')
      .insert({
        content: texto,
        room_id: roomId,
        sender_id: currentUser.id,
        type: 'text'
      })
      .select()
      .single();

    if (error) {
      console.error('Error al enviar:', error);
      return;
    }

    if (msgGuardado) {
      const mensajeCompleto = {
        ...msgGuardado,
        sender: userProfile 
      };

      setMessages(prev => {
        if (prev.some(m => m.id === msgGuardado.id)) return prev;
        return [...prev, mensajeCompleto];
      });
    }
  };
  return (
    <div className="flex flex-col h-full bg-gray-700">
      <header className="h-12 border-b border-gray-600 flex items-center justify-between px-4 bg-gray-750 shrink-0">
        <h3 className="font-bold text-white flex items-center gap-2">
          <span className="text-gray-400">#</span> {roomId}
        </h3>
        <div className="flex items-center gap-4">
            <button 
                onClick={() => setShowVideo(!showVideo)}
                className={`flex items-center gap-2 px-3 py-1 rounded text-xs font-bold transition-colors ${
                    showVideo 
                    ? 'bg-red-500 text-white hover:bg-red-600' 
                    : 'bg-emerald-600 text-white hover:bg-emerald-500'
                }`}
            >
                <VideoCameraIcon className="w-4 h-4" />
                {showVideo ? 'Cerrar Panel' : 'Entrar a Voz'}
            </button>
            <div className="flex items-center gap-2 text-xs font-medium">
                <span className={`h-2.5 w-2.5 rounded-full ${isConnected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500'}`}></span>
            </div>
        </div>
      </header>
      {showVideo && currentUser && (
        <VideoCall 
            roomId={roomId} 
            session={{ user: currentUser, user_metadata: userProfile }} 
            onLeave={() => setShowVideo(false)} 
        />
      )}
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

      <form onSubmit={sendMessage} className="p-4 flex gap-2 bg-gray-600 shrink-0">
        <input
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          placeholder={`Enviar a #${roomId}`}
          className="flex-1 bg-transparent text-white outline-none placeholder-gray-400"
        />
        <button type="submit" disabled={!newMessage.trim()}>
          <PaperAirplaneIcon className={`w-5 h-5 ${newMessage.trim() ? 'text-emerald-400' : 'text-gray-500'}`} />
        </button>
      </form>
    </div>
  );
}