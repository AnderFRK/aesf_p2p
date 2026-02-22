import { useState } from 'react'; 
import { Link } from 'react-router-dom';
import { HashtagIcon, UserGroupIcon, PlusIcon } from '@heroicons/react/24/solid';

import { useVoice } from '../../../context/VoiceContext';
import Profile from './Profile';
import Call from './Call';
import JoinRoomModal from '../../modals/JoinRoomModal'; 
import CreateRoomModal from '../../modals/CreateRoomModal';

export default function Sidebar({ 
    profile, 
    textChannels, 
    roomId, 
    onLogout
}) {
  const { 
    joinRoom,
    activeRoomId,
    leaveRoom,
    micOn, cameraOn, toggleMic, toggleCam, isHost, statusMsg, supabaseStatus, hasMic, hasWebcam 
  } = useVoice();

  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const openCreateModal = () => setIsCreateModalOpen(true);
  const openJoinModal = () => setIsJoinModalOpen(true);

  return (
    <>
        <aside className="w-64 bg-gray-800 flex flex-col border-r border-gray-700 relative z-20 shrink-0">
            <div className="h-12 flex items-center px-4 font-bold border-b border-gray-700 shadow-sm text-emerald-400">
              AESF P2P Alpha
            </div>
            <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-6 custom-scrollbar">
              <div>
                <h3 className="px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <span className="text-emerald-500">●</span> Salas Temporales
                </h3>
                
                <div className="space-y-1 px-1">
                    <button 
                        onClick={openCreateModal}
                        className="w-full flex items-center gap-2 px-2 py-1.5 text-gray-300 hover:text-white hover:bg-emerald-600/20 hover:border-emerald-500/50 border border-transparent rounded transition-all text-sm group"
                    >
                        <div className="p-1 bg-gray-700 rounded group-hover:bg-emerald-600 transition-colors">
                            <PlusIcon className="w-4 h-4" />
                        </div>
                        <span>Crear Nueva Sala</span>
                    </button>
                    
                    <button 
                        onClick={openJoinModal} 
                        className="w-full flex items-center gap-2 px-2 py-1.5 text-gray-300 hover:text-white hover:bg-blue-600/20 hover:border-blue-500/50 border border-transparent rounded transition-all text-sm group"
                    >
                        <div className="p-1 bg-gray-700 rounded group-hover:bg-blue-600 transition-colors">
                            <UserGroupIcon className="w-4 h-4" />
                        </div>
                        <span>Unirse con Código</span>
                    </button>
                </div>
              </div>

              <div className="border-t border-gray-700/50 mx-2"></div>
              <div>
                <h3 className="px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <span className="text-gray-600">#</span> Chat de Texto
                </h3>
                <div className="space-y-0.5">
                  {textChannels.map((canal) => (
                    <Link 
                        key={canal.id} 
                        to={`/channels/${canal.id}`} 
                        className={`group flex items-center px-2 py-1.5 rounded mx-1 transition-all duration-200 ${
                            roomId === canal.id 
                                ? 'bg-gray-600/80 text-white shadow-sm' 
                                : 'text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                        }`}
                    >
                        <HashtagIcon className={`mr-2 h-4 w-4 ${roomId === canal.id ? 'text-white' : 'text-gray-500 group-hover:text-gray-400'}`} />
                        <span className="truncate font-medium text-sm">{canal.name}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </nav>
            {activeRoomId && (
                <Call 
                    channelName={`Sala: ${activeRoomId}`}
                    onLeave={leaveRoom}
                    micOn={micOn} 
                    cameraOn={cameraOn} 
                    onToggleMic={toggleMic} 
                    onToggleCam={toggleCam}
                    hasMic={hasMic} 
                    hasWebcam={hasWebcam}
                    isHost={isHost} 
                    statusMsg={statusMsg} 
                    supabaseStatus={supabaseStatus}
                />
            )}
            <Profile user={profile} onLogout={onLogout} />
        </aside>
        <JoinRoomModal 
            isOpen={isJoinModalOpen}
            onClose={() => setIsJoinModalOpen(false)}
            onJoin={(code) => joinRoom(code)}
        />
        <CreateRoomModal 
            isOpen={isCreateModalOpen}
            onClose={() => setIsCreateModalOpen(false)}
            onCreate={(finalId) => joinRoom(finalId)}
        />
    </>
  );
}