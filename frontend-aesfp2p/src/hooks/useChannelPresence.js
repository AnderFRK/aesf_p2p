import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';

export function useChannelPresence(roomId) {
  const [users, setUsers] = useState([]);
  const channelRef = useRef(null);

  useEffect(() => {
    if (!roomId) return;

    const topic = `room_${roomId}`;
    let channel = supabase.channel(topic); // Siempre obtenemos la referencia, exista o no.
    channelRef.current = channel;

    const updateState = () => {
        const state = channel.presenceState();
        const usersList = [];
        
        Object.keys(state).forEach(key => {
            state[key].forEach(user => {
                if (user && (user.userId || user.peerId)) {
                    usersList.push(user);
                }
            });
        });

        // Ordenar por antigüedad
        usersList.sort((a, b) => new Date(a.online_at || 0) - new Date(b.online_at || 0));
        
        const uniqueUsers = Array.from(new Map(usersList.map(u => [u.userId || u.peerId, u])).values());
        setUsers(uniqueUsers);
    };

    // Listeners universales
    channel.on('presence', { event: 'sync' }, updateState);
    channel.on('presence', { event: 'join' }, updateState);
    channel.on('presence', { event: 'leave' }, updateState);

    // INTENTO DE SUSCRIPCIÓN "SEGURA"
    // Si el canal ya estaba suscrito por el Host, esto no hace nada malo.
    // Si no estaba suscrito, nos suscribe.
    channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
            updateState();
        }
    });

    return () => {
      channelRef.current = null;
    };
  }, [roomId]);

  return users;
}