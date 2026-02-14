import { useEffect, useState } from 'react';
import { Outlet, useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

import Sidebar from '../components/layout/Sidebar';
import VideoCall from '../components/layout/VideoCall'; 
// 👇 1. IMPORTAR EL COMPONENTE DRAGGABLE
import DraggableWindow from '../components/layout/DraggableWindow';
import { useVideoLogic } from '../hooks/useVideoLogic';

export default function Dashboard() {
  const [profile, setProfile] = useState(null);
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [activeVoiceId, setActiveVoiceId] = useState(null); 
  const [activeVoiceRooms, setActiveVoiceRooms] = useState([]);

  const [isVideoExpanded, setIsVideoExpanded] = useState(false);

  const navigate = useNavigate();
  const { roomId } = useParams(); 

  const handleLeaveVoice = () => {
    setActiveVoiceId(null);
    setIsVideoExpanded(false);
  };

  const sessionObject = profile ? { user: { id: profile.id, user_metadata: profile } } : null;

  const {
    localStream, remoteStreams, detectedUsers,
    micOn, cameraOn, hasMic, hasWebcam,
    toggleMic, toggleCamera, handleManualDisconnect,
    statusMsg, supabaseStatus, isHost
  } = useVideoLogic(activeVoiceId, sessionObject, handleLeaveVoice);

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

  const crearSalaTemporal = () => {
    const newId = `voice-temp-${Math.random().toString(36).substring(2, 7)}`;
    setActiveVoiceRooms(prev => [...prev, { id: newId, name: 'Sala Privada', type: 'voice' }]);
    setActiveVoiceId(newId);
  };

  const handleJoinVoice = (channelId) => {
    if (activeVoiceId === channelId) return;
    setActiveVoiceId(channelId);
  };

  const textChannels = channels.filter(c => c.type === 'text');
  const dbVoiceChannels = channels.filter(c => c.type === 'voice');

  if (loading) return <div className="h-screen bg-gray-900 flex items-center justify-center text-emerald-500">Cargando...</div>;

  return (
    <div className="flex h-screen bg-gray-900 text-white overflow-hidden font-sans relative">
      
      <Sidebar 
          profile={profile}
          textChannels={textChannels}
          dbVoiceChannels={dbVoiceChannels}
          activeVoiceRooms={activeVoiceRooms}
          activeVoiceId={activeVoiceId}
          roomId={roomId}
          
          onJoinVoice={handleJoinVoice}
          onCreateTempRoom={crearSalaTemporal}
          onLogout={handleLogout}
          
          onLeaveVoice={handleManualDisconnect}
          micOn={micOn}
          cameraOn={cameraOn}
          hasMic={hasMic}
          hasWebcam={hasWebcam}
          onToggleMic={toggleMic}
          onToggleCam={toggleCamera}
          isHost={isHost}
          statusMsg={statusMsg}
          supabaseStatus={supabaseStatus}
      />

      <main className="flex-1 flex flex-col bg-gray-700 min-w-0 relative z-10">
        <Outlet />
      </main>

      {activeVoiceId && profile && (
        <DraggableWindow 
            isExpanded={isVideoExpanded}
            onToggleExpand={() => setIsVideoExpanded(!isVideoExpanded)}
        >
             <VideoCall 
                localStream={localStream}
                remoteStreams={remoteStreams}
                detectedUsers={detectedUsers}
                cameraOn={cameraOn}
                micOn={micOn}
                myAvatar={profile.avatar_url}
                statusMsg={statusMsg}
                supabaseStatus={supabaseStatus}
                isHost={isHost}
                hasMic={hasMic}
                hasWebcam={hasWebcam}
                toggleMic={toggleMic}
                toggleCamera={toggleCamera}
                handleManualDisconnect={handleManualDisconnect}
                isExpanded={isVideoExpanded}
                onToggleExpand={() => setIsVideoExpanded(!isVideoExpanded)}
            />
        </DraggableWindow>
      )}

    </div>
  );
}