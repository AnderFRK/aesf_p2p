import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useVoice } from '../context/VoiceContext';

import Sidebar from '../components/layout/Sidebar';
import VideoCall from '../components/layout/VideoCall'; 
import DraggableWindow from '../components/layout/DraggableWindow';

export default function Dashboard() {
  const [profile, setProfile] = useState(null);
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isVideoExpanded, setIsVideoExpanded] = useState(false);

  const navigate = useNavigate();
  const { roomId } = useParams(); 
  
  const { activeRoomId } = useVoice(); 

  useEffect(() => {
    const getData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { navigate('/login'); return; }

        const { data: profileData } = await supabase
          .from('profiles').select('*').eq('id', user.id).single();
        setProfile(profileData);

        const { data: channelsData } = await supabase
          .from('channels').select('*').order('created_at', { ascending: true });
        setChannels(channelsData || []);

      } catch (err) {
        console.error("Error Dashboard:", err);
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

  if (loading) return <div className="h-screen bg-gray-900 flex items-center justify-center text-emerald-500">Cargando...</div>;

  const textChannels = channels.filter(c => c.type === 'text');

  return (
    <div className="flex h-screen bg-gray-900 text-white overflow-hidden font-sans relative">
      
      {/* SIDEBAR */}
      <Sidebar 
          profile={profile}
          textChannels={textChannels} // Solo pasamos texto
          roomId={roomId}
          onLogout={handleLogout}
      />

      {/* ÁREA PRINCIPAL (CHAT DE TEXTO) */}
      <main className="flex-1 flex flex-col bg-gray-700 min-w-0 relative z-10">
        <Outlet />
      </main>

      {/* VENTANA FLOTANTE DE VIDEOLLAMADA */}
      {/* Se activa automáticamente cuando activeRoomId existe (al crear o unirse) */}
      {activeRoomId && (
        <DraggableWindow 
            isExpanded={isVideoExpanded}
            onToggleExpand={() => setIsVideoExpanded(!isVideoExpanded)}
        >
             <VideoCall 
                isExpanded={isVideoExpanded}
                onToggleExpand={() => setIsVideoExpanded(!isVideoExpanded)}
             />
        </DraggableWindow>
      )}

    </div>
  );
}