import { useEffect, useState } from 'react';
import { Link, Outlet, useParams, useNavigate } from 'react-router-dom';
import { 
  HashtagIcon, 
  SpeakerWaveIcon, 
  ArrowRightOnRectangleIcon, 
  PlusIcon,
  SignalIcon
} from '@heroicons/react/24/solid';
import { supabase } from '../lib/supabase';
import VoiceUsers from '../components/layout/VoiceUsers';
import VideoCall from '../components/layout/VideoCall';

export default function Dashboard() {
  const [profile, setProfile] = useState(null);
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeVoiceRooms, setActiveVoiceRooms] = useState([]);
  
  // ESTADO PARA LA VOZ GLOBAL
  const [activeVoiceId, setActiveVoiceId] = useState(null); 

  const navigate = useNavigate();
  const { roomId } = useParams(); 

  useEffect(() => {
  }, [navigate]);

  const textChannels = channels.filter(c => c.type === 'text');
  const dbVoiceChannels = channels.filter(c => c.type === 'voice');

  const handleJoinVoice = (channelId) => {
    if (activeVoiceId === channelId) return;
    setActiveVoiceId(channelId);
  };

  const handleLeaveVoice = () => {
    setActiveVoiceId(null);
  };

  if (loading) return <div className="h-screen bg-gray-900 flex items-center justify-center text-emerald-500">Cargando servidor...</div>;

  return (
    <div className="flex h-screen bg-gray-900 text-white overflow-hidden font-sans">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-gray-800 flex flex-col border-r border-gray-700 relative z-20">
        
        <div className="h-12 flex items-center px-4 font-bold border-b border-gray-700 shadow-sm text-emerald-400">
          AESF P2P Alpha
        </div>
        
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-6">
          <div>
            <h3 className="px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
              <span className="text-gray-600">v</span> Texto
            </h3>
            <div className="space-y-0.5">
              {textChannels.map((canal) => (
                <CanalItem 
                    key={canal.id} 
                    canal={canal} 
                    activeId={roomId}
                    onJoinVoice={handleJoinVoice} 
                />
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between px-2 mb-2 group">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                <span className="text-gray-600">v</span> Voz
              </h3>
              <button onClick={crearSalaTemporal} className="text-gray-400 hover:text-white">
                <PlusIcon className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-0.5">
              {dbVoiceChannels.map((canal) => (
                <CanalItem 
                    key={canal.id} 
                    canal={canal} 
                    activeId={activeVoiceId}
                    onJoinVoice={handleJoinVoice}
                />
              ))}
            </div>
          </div>
        </nav>

        {profile && (
            <div className="bg-gray-900/60 p-2 flex items-center gap-2 border-t border-gray-700">
            </div>
        )}
        {activeVoiceId && profile && (
            <div className="absolute bottom-14 left-0 w-64 bg-gray-850 border-t border-gray-700 p-2 z-50 shadow-xl">
                 <div className="text-xs text-green-400 font-bold mb-1 flex justify-between">
                    <span>🔊 Conectado: {channels.find(c=>c.id===activeVoiceId)?.name || 'Voz'}</span>
                    <button onClick={handleLeaveVoice} className="text-red-400 hover:text-red-300">Desc.</button>
                 </div>
                 <div className="h-0 overflow-hidden"> 
                     <VideoCall 
                        roomId={activeVoiceId}
                        session={{ user: profile, user_metadata: profile }} // Ajuste: pasamos el perfil directo
                        onLeave={handleLeaveVoice}
                    />
                 </div>
                 <div className="text-[10px] text-gray-500">La llamada sigue activa mientras navegas.</div>
            </div>
        )}

      </aside>

      <main className="flex-1 flex flex-col bg-gray-700 min-w-0 relative">
        {activeVoiceId && profile && (
            <div className="absolute top-2 right-2 z-50 w-64 h-48 bg-black border border-gray-600 shadow-2xl rounded-lg overflow-hidden resize-y">
                 <VideoCall 
                    roomId={activeVoiceId}
                    session={{ user: { id: profile.id, user_metadata: profile } }} 
                    onLeave={handleLeaveVoice}
                />
            </div>
        )}
        <Outlet />
      </main>

    </div>
  );
}

// COMPONENTE CANAL ITEM MODIFICADO
function CanalItem({ canal, activeId, onJoinVoice }) {
  const isActive = activeId === canal.id;
  const isVoice = canal.type === 'voice';

  if (isVoice) {
      return (
        <div className="mb-0.5 cursor-pointer">
          <div
            onClick={() => onJoinVoice(canal.id)}
            className={`group flex items-center px-2 py-1.5 rounded mx-1 transition-all duration-200 ${
              isActive 
                ? 'bg-gray-600/80 text-white shadow-sm' 
                : 'text-gray-400 hover:bg-gray-700 hover:text-gray-200'
            }`}
          >
            <SpeakerWaveIcon className={`mr-2 h-4 w-4 ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-400'}`} />
            <span className={`truncate font-medium ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-300'}`}>
              {canal.name}
            </span>
          </div>
          <VoiceUsers roomId={canal.id} />
        </div>
      );
  }

  // Si es TEXTO (Comportamiento normal de Router)
  return (
    <div className="mb-0.5">
      <Link
        to={`/channels/${canal.id}`}
        className={`group flex items-center px-2 py-1.5 rounded mx-1 transition-all duration-200 ${
          isActive 
            ? 'bg-gray-600/80 text-white shadow-sm' 
            : 'text-gray-400 hover:bg-gray-700 hover:text-gray-200'
        }`}
      >
         <HashtagIcon className={`mr-2 h-5 w-5 ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-400'}`} />
        <span className={`truncate font-medium ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-300'}`}>
          {canal.name}
        </span>
      </Link>
    </div>
  );
}