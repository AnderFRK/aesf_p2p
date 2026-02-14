import { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';

export default function VoiceUsers({ roomId }) {
  const [users, setUsers] = useState([]);
  
  // ✅ 1. DECLARAMOS LAS REFERENCIAS
  const channelRef = useRef(null);
  const isBorrowing = useRef(false);

  useEffect(() => {
    if (!roomId) return;
    
    let isMounted = true;
    const topic = `room_${roomId}`;
    
    // 2. Detección de canal existente
    const allChannels = supabase.getChannels();
    const existingChannel = allChannels.find(c => c.topic === `realtime:${topic}`);

    let channel;

    if (existingChannel) {
      // MODO PASIVO (Prestado)
      channel = existingChannel;
      isBorrowing.current = true;
    } else {
      // MODO ACTIVO (Nuevo)
      channel = supabase.channel(topic);
      isBorrowing.current = false;
    }

    // ✅ 3. GUARDAMOS EL CANAL EN LA REF
    channelRef.current = channel;

    const updateState = () => {
        if (!isMounted) return;

        const state = channel.presenceState();
        const usersList = [];
        
        Object.keys(state).forEach(key => {
            state[key].forEach(user => {
                if (user && (user.userId || user.peerId)) {
                    usersList.push(user);
                }
            });
        });

        usersList.sort((a, b) => (a.username || 'Anon').localeCompare(b.username || 'Anon'));
        const uniqueUsers = Array.from(new Map(usersList.map(u => [u.userId || u.peerId, u])).values());
        
        setUsers(uniqueUsers);
    };

    channel.on('presence', { event: 'sync' }, updateState);
    channel.on('presence', { event: 'join' }, updateState);
    channel.on('presence', { event: 'leave' }, updateState);

    if (!isBorrowing.current) {
        channel.subscribe((status) => {
            if (status === 'SUBSCRIBED') updateState();
        });
    } else {
        updateState();
    }

    // ✅ 4. LIMPIEZA SEGURA
    return () => {
      isMounted = false; // Bloquea actualizaciones de estado

      if (!isBorrowing.current) {
         // Si el canal es NUESTRO (no prestado), lo limpiamos.
         // Usamos la variable local 'channel' o la ref, ambas sirven aquí.
         // El .catch evita errores si ya se cerró.
         if (channelRef.current) {
             channelRef.current.unsubscribe().catch(() => {});
         }
      }
      // Si es prestado, NO hacemos nada.
    };
  }, [roomId]);

  if (users.length === 0) return null;

  return (
    <div className="pl-8 pr-2 pb-1 space-y-1 mt-0.5">
      {users.map((u, idx) => (
        <div key={u.peerId || u.userId || idx} className="flex items-center gap-2 group cursor-pointer select-none py-0.5 animate-in fade-in duration-300">
          <div className="relative shrink-0">
              <img 
                src={u.avatar_url || `https://ui-avatars.com/api/?name=${u.username}&background=random`} 
                className="w-5 h-5 rounded-full border border-gray-700 object-cover bg-gray-600"
                alt={u.username}
                onError={(e) => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${u.username}` }}
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-500 border-2 border-gray-800 rounded-full"></span>
          </div>
          <div className="min-w-0 flex flex-col">
            <span className="text-gray-300 text-[13px] leading-none font-medium group-hover:text-white truncate">
                {u.username || 'Usuario'}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}