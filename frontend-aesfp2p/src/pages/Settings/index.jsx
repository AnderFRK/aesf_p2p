import { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { ArrowLeftIcon, UserIcon, SpeakerWaveIcon } from '@heroicons/react/24/outline';

import ProfileTab from './ProfileTab';
import HardwareTab from './HardwareTab';

export default function Settings() {
  const navigate = useNavigate();
  const { session, profile, setProfile } = useOutletContext(); 
  
  const [activeTab, setActiveTab] = useState('profile');

  return (
    <div className="flex-1 flex flex-col bg-gray-900 text-gray-200 overflow-hidden">
      
      {/* HEADER */}
      <div className="h-16 border-b border-gray-800 flex items-center px-6 shrink-0 bg-gray-900/95 backdrop-blur z-10">
        <button 
          onClick={() => navigate('/')}
          className="mr-4 p-2 hover:bg-gray-800 rounded-full transition-colors text-gray-400 hover:text-white"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-white">Ajustes</h1>
      </div>

      {/* LAYOUT PRINCIPAL */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* BARRA LATERAL DE AJUSTES */}
        <aside className="w-64 border-r border-gray-800 p-4 space-y-2 shrink-0 overflow-y-auto">
          <button
            onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${
              activeTab === 'profile' ? 'bg-emerald-600/10 text-emerald-400' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <UserIcon className="w-5 h-5" />
            Perfil de Usuario
          </button>

          <button
            onClick={() => setActiveTab('hardware')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${
              activeTab === 'hardware' ? 'bg-emerald-600/10 text-emerald-400' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <SpeakerWaveIcon className="w-5 h-5" />
            Voz y Video
          </button>
        </aside>

        {/* CONTENIDO DE LA PESTAÑA */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 relative">
          <div className="max-w-3xl mx-auto">
             {activeTab === 'profile' && (
               <ProfileTab session={session} profile={profile} setProfile={setProfile} />
             )}
             {activeTab === 'hardware' && <HardwareTab />}
          </div>
        </main>
        
      </div>
    </div>
  );
}