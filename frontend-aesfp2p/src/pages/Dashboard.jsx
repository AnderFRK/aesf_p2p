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
  
  // ESTADO PARA LA VOZ GLOBAL
  const [activeVoiceId, setActiveVoiceId] = useState(null); 
  const [activeVoiceRooms, setActiveVoiceRooms] = useState([]);

  const navigate = useNavigate();
  const { roomId } = useParams(); 

  // CARGA DE DATOS
  useEffect(() => {
    const getData = async () => {
      try {
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

      } catch (err) {
        console.error("Error crítico en Dashboard:", err);
      } finally {
        setLoading(false);
      }
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
    setActiveVoiceRooms(prev => [...prev, { id: newId, name: 'Sala Privada', type: 'voice' }]);
    setActiveVoiceId(newId);
  };

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
    <div className="flex h-screen bg-gray-900 text-white overflow-hidden font-sans relative">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-gray-800 flex flex-col border-r border-gray-700 relative z-20">
        
        <div className="h-12 flex items-center px-4 font-bold border-b border-gray-700 shadow-sm text-emerald-400">
          AESF P2P Alpha
        </div>
        
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-6">
          {/* CANALES DE TEXTO */}
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

          {/* CANALES DE VOZ */}
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
              {activeVoiceRooms.map((canal) => (
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

        {/* BARRA DE USUARIO */}
        {profile && (
            <div className="bg-gray-900/60 p-2 flex items-center gap-2 border-t border-gray-700">
                <img 
                  src={profile.avatar_url || `https://ui-avatars.com/api/?name=${profile.username}&background=random`} 
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
        {activeVoiceId && (
            <div className="bg-gray-900/90 p-1 text-center border-t border-gray-600">
                <span className="text-[10px] text-emerald-400 animate-pulse">
                    🔊 Voz Activa: {channels.find(c=>c.id===activeVoiceId)?.name || 'Sala'}
                </span>
            </div>
        )}

      </aside>
      <main className="flex-1 flex flex-col bg-gray-700 min-w-0 relative z-10">
        <Outlet />
      </main>
      {activeVoiceId && profile && (
        <div className="absolute top-4 right-4 z-50 w-72 bg-gray-900 border border-gray-600 shadow-2xl rounded-lg overflow-hidden flex flex-col">
             <div className="bg-gray-800 p-2 flex justify-between items-center border-b border-gray-700 cursor-move">
                <span className="text-xs font-bold text-white flex items-center gap-2">
                    <SpeakerWaveIcon className="w-3 h-3 text-emerald-400"/>
                    {channels.find(c=>c.id===activeVoiceId)?.name || 'Sala de Voz'}
                </span>
                <button onClick={handleLeaveVoice} className="text-gray-400 hover:text-red-400 transition-colors">
                    ✖
                </button>
             </div>
             <div className="h-64 relative bg-black"> 
                 <VideoCall 
                    roomId={activeVoiceId}
                    session={{ user: { id: profile.id, user_metadata: profile } }} 
                    onLeave={handleLeaveVoice}
                />
             </div>
        </div>
      )}

    </div>
  );
}

// COMPONENTE CANAL ITEM
function CanalItem({ canal, activeId, onJoinVoice }) {
  const isActive = activeId === canal.id;
  const isVoice = canal.type === 'voice';

  if (isVoice) {
      return (
        <div className="mb-0.5">
          <div
            onClick={() => onJoinVoice(canal.id)}
            className={`group flex items-center px-2 py-1.5 rounded mx-1 transition-all duration-200 cursor-pointer ${
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