import { useNavigate } from 'react-router-dom';
import { 
  ArrowRightOnRectangleIcon, 
  Cog8ToothIcon
} from '@heroicons/react/24/solid';

export default function Profile({ user, onLogout }) {
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <div className="bg-gray-900/90 p-2 flex items-center gap-1 border-t border-gray-700 shrink-0">
        
        <div 
            className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer hover:bg-gray-800 p-1 rounded transition-colors group"
            onClick={() => navigate('/profile')} 
            title="Ir a mi perfil"
        >
            <div className="relative">
                <img 
                  src={user.avatar_url || `https://ui-avatars.com/api/?name=${user.username}&background=random`} 
                  alt="avatar" 
                  className="w-8 h-8 rounded-full bg-gray-700 object-cover" 
                />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-gray-900 rounded-full"></span>
            </div>
            
            <div className="flex-col min-w-0 hidden sm:flex">
              <div className="text-xs font-bold text-white truncate group-hover:text-gray-200">
                  {user.username}
              </div>
              <div className="text-[10px] text-gray-400 truncate">
                  #{user.id.slice(0, 4)}
              </div>
            </div>
        </div>
        
        <div className="flex items-center">
            <button 
              onClick={() => navigate('/settings')}
              className="p-2 hover:bg-gray-700 text-gray-400 hover:text-gray-200 rounded transition-colors"
              title="Ajustes de Usuario"
            >
              <Cog8ToothIcon className="w-5 h-5" />
            </button>

            <button 
              onClick={onLogout}
              className="p-2 hover:bg-red-900/30 text-gray-400 hover:text-red-400 rounded transition-colors"
              title="Cerrar sesión"
            >
              <ArrowRightOnRectangleIcon className="w-5 h-5" />
            </button>
        </div>
    </div>
  );
}