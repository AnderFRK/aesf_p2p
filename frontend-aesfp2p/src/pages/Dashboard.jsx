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

export default function Dashboard() {
  const [profile, setProfile] = useState(null);
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeVoiceRooms, setActiveVoiceRooms] = useState([]);
  const navigate = useNavigate();
  const { roomId } = useParams();

  useEffect(() => {
    const getData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      setProfile(profileData);
      const { data: channelsData, error } = await supabase
        .from('channels')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) console.error("Error cargando canales:", error);
      else setChannels(channelsData || []);

      setLoading(false);
    };

    getData();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const crearSalaTemporal = () => {
    const randomId = Math.random().toString(36).substring(2, 7);
    const newId = `voice-temp-${randomId}`;
    navigate(`/channels/${newId}`);
    setActiveVoiceRooms(prev => [...prev, { id: newId, name: 'Sala Privada', type: 'voice' }]);
  };

  const textChannels = channels.filter(c => c.type === 'text');
  const dbVoiceChannels = channels.filter(c => c.type === 'voice');

  if (loading) return <div className="h-screen bg-gray-900 flex items-center justify-center text-emerald-500">Cargando servidor...</div>;

  return (
    <div className="flex h-screen bg-gray-900 text-white overflow-hidden font-sans">
      
      <aside className="w-64 bg-gray-800 flex flex-col border-r border-gray-700">
        
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
                <CanalItem key={canal.id} canal={canal} activeId={roomId} />
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between px-2 mb-2 group">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                <span className="text-gray-600">v</span> Voz
              </h3>
              <button onClick={crearSalaTemporal} className="text-gray-400 hover:text-white" title="Crear sala temporal">
                <PlusIcon className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-0.5">
              {dbVoiceChannels.map((canal) => (
                <CanalItem key={canal.id} canal={canal} activeId={roomId} />
              ))}
              {activeVoiceRooms.map((canal) => (
                 <CanalItem key={canal.id} canal={canal} activeId={roomId} />
              ))}
              {roomId?.startsWith('voice-temp-') && !activeVoiceRooms.find(c => c.id === roomId) && (
                 <CanalItem canal={{ id: roomId, name: '🔊 Sala Temporal', type: 'voice' }} activeId={roomId} />
              )}
            </div>
          </div>

        </nav>
        {profile && (
          <div className="bg-gray-900/60 p-2 flex items-center gap-2 border-t border-gray-700">
            <img 
              src={profile.avatar_url || `https://cdn.discordapp.com/icons/880623226584195102/e7d8ddbd0c7fef34fccfe1a7830f3ad2.png?size=1024`} 
              alt="avatar" 
              className="w-8 h-8 rounded-full bg-gray-700 object-cover" 
            />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-white truncate">{profile.username}</div>
              <div className="text-xs text-emerald-400 flex items-center gap-1">
                <SignalIcon className="w-3 h-3" />
                <span>En línea</span>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="p-1.5 hover:bg-red-900/30 text-gray-400 hover:text-red-400 rounded transition-colors"
              title="Cerrar sesión"
            >
              <ArrowRightOnRectangleIcon className="w-5 h-5" />
            </button>
          </div>
        )}
      </aside>
      <main className="flex-1 flex flex-col bg-gray-700 min-w-0">
        <Outlet />
      </main>

    </div>
  );
}
function CanalItem({ canal, activeId }) {
  const isActive = activeId === canal.id;
  
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
        {canal.type === 'voice' ? (
          <SpeakerWaveIcon className={`mr-2 h-4 w-4 ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-400'}`} />
        ) : (
          <HashtagIcon className={`mr-2 h-5 w-5 ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-400'}`} />
        )}
        <span className={`truncate font-medium ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-300'}`}>
          {canal.name}
        </span>
      </Link>

      {canal.type === 'voice' && (
         <VoiceUsers roomId={canal.id} />
      )}
    </div>
  );
}