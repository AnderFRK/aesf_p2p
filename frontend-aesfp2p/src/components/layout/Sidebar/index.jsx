import { Link } from 'react-router-dom';
import { HashtagIcon, SpeakerWaveIcon, PlusIcon } from '@heroicons/react/24/solid';

import Profile from './Profile';
import Call from './Call';
import VoiceUsers from '../VoiceUsers';

export default function Sidebar({ 
    profile, textChannels, dbVoiceChannels, activeVoiceRooms, activeVoiceId, roomId, 
    onJoinVoice, onLeaveVoice, onCreateTempRoom, onLogout,
    micOn, cameraOn, hasMic, hasWebcam, onToggleMic, onToggleCam,
    isHost, statusMsg, supabaseStatus
}) {

  const currentVoiceChannel = dbVoiceChannels.find(c => c.id === activeVoiceId) 
  || activeVoiceRooms.find(c => c.id === activeVoiceId);

  return (
    <aside className="w-64 bg-gray-800 flex flex-col border-r border-gray-700 relative z-20 shrink-0">
        {/* ... HEADER Y NAV DE TEXTO IGUAL ... */}
        <div className="h-12 flex items-center px-4 font-bold border-b border-gray-700 shadow-sm text-emerald-400">
          AESF P2P Alpha
        </div>
        
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-6 custom-scrollbar">
          {/* SECCIÓN TEXTO */}
          <div>
            <h3 className="px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
              <span className="text-gray-600">v</span> Texto
            </h3>
            <div className="space-y-0.5">
              {textChannels.map((canal) => (
                <CanalItem key={canal.id} canal={canal} activeId={roomId} onJoinVoice={onJoinVoice} />
              ))}
            </div>
          </div>

          {/* SECCIÓN VOZ */}
          <div>
            <div className="flex items-center justify-between px-2 mb-2 group">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                <span className="text-gray-600">v</span> Voz
              </h3>
              <button onClick={onCreateTempRoom} className="text-gray-400 hover:text-white" title="Crear sala">
                <PlusIcon className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-0.5">
              {dbVoiceChannels.map((canal) => (
                <CanalItem key={canal.id} canal={canal} activeId={activeVoiceId} onJoinVoice={onJoinVoice}/>
              ))}
              {activeVoiceRooms.map((canal) => (
                 <CanalItem key={canal.id} canal={canal} activeId={activeVoiceId} onJoinVoice={onJoinVoice}/>
              ))}
            </div>
          </div>
        </nav>

        {/* ... (Call y Profile se mantienen igual) ... */}
        {activeVoiceId && (
            <Call 
                channelName={currentVoiceChannel?.name}
                onLeave={onLeaveVoice}
                micOn={micOn} cameraOn={cameraOn} onToggleMic={onToggleMic} onToggleCam={onToggleCam}
                hasMic={hasMic} hasWebcam={hasWebcam}
                isHost={isHost} statusMsg={statusMsg} supabaseStatus={supabaseStatus}
            />
        )}
        <Profile user={profile} onLogout={onLogout} />
    </aside>
  );
}

// 👇 AQUÍ ESTÁ LA MAGIA DEL SIDEBAR
function CanalItem({ canal, activeId, onJoinVoice }) {
  const isActive = activeId === canal.id;
  const isVoice = canal.type === 'voice';

  if (isVoice) {
      return (
        <div className="mb-0.5">
          {/* Nombre del Canal (Clickeable) */}
          <div 
            onClick={() => onJoinVoice(canal.id)} 
            className={`group flex items-center px-2 py-1.5 rounded mx-1 transition-all duration-200 cursor-pointer ${isActive ? 'bg-gray-700/80 text-white shadow-sm' : 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-200'}`}
          >
            <SpeakerWaveIcon className={`mr-2 h-4 w-4 ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-400'}`} />
            <span className={`truncate font-medium ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-300'}`}>{canal.name}</span>
          </div>

          {/* 👇 LISTA DE USUARIOS CONECTADOS (Estilo Discord) */}
          <VoiceUsers roomId={canal.id} />
        </div>
      );
  }

  // Item de Texto
  return (
    <div className="mb-0.5">
      <Link to={`/channels/${canal.id}`} className={`group flex items-center px-2 py-1.5 rounded mx-1 transition-all duration-200 ${isActive ? 'bg-gray-600/80 text-white shadow-sm' : 'text-gray-400 hover:bg-gray-700 hover:text-gray-200'}`}>
         <HashtagIcon className={`mr-2 h-5 w-5 ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-400'}`} />
        <span className={`truncate font-medium ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-300'}`}>{canal.name}</span>
      </Link>
    </div>
  );
}