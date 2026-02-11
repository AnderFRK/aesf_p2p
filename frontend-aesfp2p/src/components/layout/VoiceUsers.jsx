import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function VoiceUsers({ roomId }) {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const channel = supabase.channel(`video_presence:${roomId}`)
      .on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState();
        const usersList = [];
        
        for (const key in newState) {
          usersList.push(newState[key][0]);
        }
        setUsers(usersList);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  if (users.length === 0) return null;

  return (
    <div className="pl-6 pb-2 space-y-1">
      {users.map((u) => (
        <div key={u.peerId} className="flex items-center gap-2 group cursor-pointer">
          <img 
            src={u.avatar_url || `https://ui-avatars.com/api/?name=${u.username}&background=random`} 
            className="w-5 h-5 rounded-full border border-gray-600 group-hover:border-gray-400"
          />
          <span className="text-gray-400 text-xs group-hover:text-white truncate">
            {u.username}
          </span>
        </div>
      ))}
    </div>
  );
}