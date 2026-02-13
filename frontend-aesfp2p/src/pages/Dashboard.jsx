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
import VideoCall from '../components/layout/VideoCall'; // Asegúrate de que la ruta sea correcta

export default function Dashboard() {
  const [profile, setProfile] = useState(null);
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // ESTADO PARA LA VOZ GLOBAL
  const [activeVoiceId, setActiveVoiceId] = useState(null); 
  // Opcional: Para salas temporales si las usas, sino puedes quitarlo
  const [activeVoiceRooms, setActiveVoiceRooms] = useState([]);

  const navigate = useNavigate();
  const { roomId } = useParams(); // URL actual (Chat de texto)

  // 1. CARGA DE DATOS (Restaurada del código anterior)
  useEffect(() => {
    const getData = async () => {
      try {
        // A. Verificar Usuario
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate('/login');
          return;
        }

        // B. Cargar Perfil
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        setProfile(profileData);

        // C. Cargar Canales
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

  // 2. FUNCIONES DE UTILIDAD
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const crearSalaTemporal = () => {
    const randomId = Math.random().toString(36).substring(2, 7);
    const newId = `voice-temp-${randomId}`;
    // Agregamos la sala temporal a la lista local
    setActiveVoiceRooms(prev => [...prev, { id: newId, name: 'Sala Privada', type: 'voice' }]);
    // Nos unimos automáticamente a la voz
    setActiveVoiceId(newId);
  };

  const textChannels = channels.filter(c => c.type === 'text');
  const dbVoiceChannels = channels.filter(c => c.type === 'voice');

  // 3. HANDLERS DE VOZ
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
                    activeId={roomId} // Texto usa la URL
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
              {/* Canales de base de datos */}
              {dbVoiceChannels.map((canal) => (
                <CanalItem 
                    key={canal.id} 
                    canal={canal} 
                    activeId={activeVoiceId} // Voz usa el estado local
                    onJoinVoice={handleJoinVoice}
                />
              ))}
              {/* Salas temporales */}
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

        {/* COMPONENTE DE VIDEO (OCULTO EN SIDEBAR PARA MANTENER LÓGICA) */}
        {activeVoiceId && profile && (
            <div className="absolute bottom-14 left-0 w-64 bg-gray-850 border-t border-gray-700 p-2 z-50 shadow-xl">
                 <div className="text-xs text-green-400 font-bold mb-1 flex justify-between">
                    <span>🔊 Conectado: {channels.find(c=>c.id===activeVoiceId)?.name || activeVoiceRooms.find(c=>c.id===activeVoiceId)?.name || 'Voz'}</span>
                    <button onClick={handleLeaveVoice} className="text-red-400 hover:text-red-300">Desc.</button>
                 </div>
                 {/* Renderizamos VideoCall pero escondido (altura 0) para que procese el audio */}
                 <div className="h-0 overflow-hidden"> 
                     <VideoCall 
                        roomId={activeVoiceId}
                        session={{ user: profile, user_metadata: profile }} 
                        onLeave={handleLeaveVoice}
                    />
                 </div>
                 <div className="text-[10px] text-gray-500">La llamada sigue activa.</div>
            </div>
        )}

      </aside>

      {/* MAIN CONTENT + VIDEO FLOTANTE */}
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

  // Si es TEXTO
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