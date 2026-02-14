import { useChannelPresence } from '../../hooks/useChannelPresence';

export default function VoiceUsers({ roomId }) {
  // Ya no necesitamos activeRoomId porque el hook es "inmortal" (no desconecta)
  const users = useChannelPresence(roomId);

  if (!users || users.length === 0) return null;

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