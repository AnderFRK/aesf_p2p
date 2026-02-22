// CODIGO INSERVIBLE, SOLO REFERENCIA PARA EL USO DE PRESENCE EN OTROS COMPONENTES
import { useEffect, useState, useRef } from 'react';
// import { supabase } from '../lib/supabase';

export function useChannelPresence(roomId) {
  const [users, setUsers] = useState([]);
  const channelRef = useRef(null);

  useEffect(() => {
    if (!roomId) return;

    const topic = `room_${roomId}`;
    
    const channels = supabase.getChannels();
    let channel = channels.find(c => c.topic === topic || c.topic === `realtime:${topic}`);

    if (!channel) {
        channel = supabase.channel(topic);
    }
    channelRef.current = channel;

    // FUNCIÓN PARA LEER TODO EL ESTADO (Sin filtros)
    const updateUsers = () => {
        const state = channel.presenceState();
        const rawUsers = [];
        
        Object.keys(state).forEach(key => {
            state[key].forEach(u => {
                if (u && (u.peerId || u.userId)) {
                    rawUsers.push(u);
                }
            });
        });

        // Ordenamos por fecha (Host primero)
        rawUsers.sort((a, b) => {
            const timeA = new Date(a.online_at || 0).getTime();
            const timeB = new Date(b.online_at || 0).getTime();
            return timeA - timeB;
        });
        
        // Eliminamos duplicados visuales por PeerID
        const unique = Array.from(new Map(rawUsers.map(u => [u.peerId, u])).values());
        
        // Actualizamos estado
        setUsers(unique);
    };

    // LISTENERS
    // 'sync': Se dispara cuando te conectas y recibes el estado inicial (o tu propio track)
    channel.on('presence', { event: 'sync' }, updateUsers);
    
    // 'join': Se dispara cuando entra OTRO
    channel.on('presence', { event: 'join' }, updateUsers);
    
    // 'leave': Se dispara cuando alguien sale
    channel.on('presence', { event: 'leave' }, ({ leftPresences }) => {
        // Opción A: Esperar al sync (a veces lento)
        // Opción B: Filtrar manual (Rápido y visualmente mejor)
        setUsers(currentList => {
            const leftIds = leftPresences.map(u => u.peerId);
            return currentList.filter(u => !leftIds.includes(u.peerId));
        });
    });

    // SUSCRIPCIÓN (Solo si es nuevo)
    if (channel.state !== 'joined' && channel.state !== 'joining') {
        channel.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                updateUsers();
            }
        });
    } else {
        updateUsers();
    }

    return () => {
        channelRef.current = null;
    };
  }, [roomId]);

  return users;
}