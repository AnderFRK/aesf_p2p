import { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';

export default function VoiceUsers({ roomId }) {
  const [users, setUsers] = useState([]);
  const channelRef = useRef(null);

  useEffect(() => {
    if (!roomId) return;
    let isMounted = true;

    const setupPresence = () => {
      // 1. En lugar de remover, simplemente creamos/reutilizamos el canal
      // Usamos un nombre de tópico muy específico
      const channel = supabase.channel(`sidebar_presence_${roomId}`, {
        config: {
          presence: { key: roomId } 
        }
      });
      
      channelRef.current = channel;

      channel
        .on('presence', { event: 'sync' }, () => {
          if (!isMounted) return;
          const state = channel.presenceState();
          // Transformación segura de los datos de presencia
          const usersList = Object.values(state)
            .flat()
            .filter(u => u && (u.peerId || u.userId));
          
          setUsers(usersList);
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log(`🟢 Sidebar: ${roomId}`);
          }
        });
    };

    setupPresence();

    return () => {
      isMounted = false;
      const chan = channelRef.current;
      
      if (chan) {
        // --- LA CORRECCIÓN CLAVE ---
        // Usamos un debounce o simplemente desuscribimos sin esperar el cierre del socket
        // Esto evita el error "WebSocket is closed before connection is established"
        chan.unsubscribe().catch(() => {}); 
        
        // NO llamamos a removeChannel inmediatamente aquí, 
        // permitimos que la recolección de basura de Supabase lo gestione
        channelRef.current = null;
      }
    };
  }, [roomId]);

  if (users.length === 0) return null;

  return (
    <div className="pl-6 pb-2 space-y-1">
      {users.map((u, idx) => (
        <div key={u.peerId || u.userId || idx} className="flex items-center gap-2 group">
          <img 
            src={u.avatar_url || `https://ui-avatars.com/api/?name=${u.username}`} 
            className="w-4 h-4 rounded-full border border-gray-600 object-cover"
            alt=""
          />
          <span className="text-gray-400 text-[11px] group-hover:text-white truncate">
            {u.username}
          </span>
        </div>
      ))}
    </div>
  );
}