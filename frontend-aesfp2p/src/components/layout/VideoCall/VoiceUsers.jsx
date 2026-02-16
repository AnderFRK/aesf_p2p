import { useVoice } from '../../../context/VoiceContext';

export default function VoiceUsers({ roomId }) {
  const { activeRoomId, voiceUsers } = useVoice();

  if (activeRoomId !== roomId) return null;

  return (
    <div className="pl-8 pr-2 pb-1 space-y-1">
      {voiceUsers.map((u) => (
        <div key={u.peerId} className="flex items-center gap-2">
           <img src={u.avatar_url} className="w-5 h-5 rounded-full" />
           <span className="text-gray-300 text-xs">{u.username}</span>
        </div>
      ))}
    </div>
  );
}