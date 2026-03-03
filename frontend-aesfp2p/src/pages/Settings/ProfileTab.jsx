import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { PhotoIcon, KeyIcon, UserIcon } from '@heroicons/react/24/outline';

export default function ProfileTab({ session, profile, setProfile }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (profile) {
      setUsername(profile.username || '');
      setAvatarUrl(profile.avatar_url || '');
    }
  }, [profile]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      if (password) {
        if (password !== confirmPassword) throw new Error("Las contraseñas no coinciden.");
        if (password.length < 6) throw new Error("La contraseña debe tener al menos 6 caracteres.");
        const { error: passError } = await supabase.auth.updateUser({ password });
        if (passError) throw passError;
      }

      const { error: authError } = await supabase.auth.updateUser({
        data: { username, avatar_url: avatarUrl }
      });
      if (authError) throw authError;

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ username, avatar_url: avatarUrl })
        .eq('id', session.user.id);

      if (profileError) throw profileError;
      
      if (setProfile) {
        setProfile(prev => ({ ...prev, username: username, avatar_url: avatarUrl }));
      }

      setMessage({ type: 'success', text: '¡Perfil actualizado correctamente!' });
      setPassword('');
      setConfirmPassword('');

    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-in fade-in duration-300">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Perfil de Usuario</h2>
        <p className="text-gray-400">Actualiza tu identidad pública y seguridad.</p>
      </div>

      {message.text && (
        <div className={`p-4 rounded-lg mb-6 border ${
          message.type === 'success' 
            ? 'bg-emerald-900/20 border-emerald-500/50 text-emerald-400' 
            : 'bg-red-900/20 border-red-500/50 text-red-400'
        }`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleUpdateProfile} className="space-y-8">
        <section className="bg-gray-800/50 rounded-2xl border border-gray-700 overflow-hidden">
          <div className="p-4 bg-gray-800/80 border-b border-gray-700 flex items-center gap-2">
            <UserIcon className="w-5 h-5 text-emerald-500" />
            <h2 className="text-lg font-semibold text-white">Perfil Público</h2>
          </div>
          
          <div className="p-6 flex flex-col md:flex-row gap-8">
            <div className="flex flex-col items-center gap-3 shrink-0">
              <div className="w-32 h-32 rounded-full border-4 border-gray-700 overflow-hidden bg-gray-900 relative group">
                <img 
                  src={avatarUrl || `https://ui-avatars.com/api/?name=${username || 'U'}&background=random&size=128`} 
                  alt="Preview" 
                  className="w-full h-full object-cover"
                  onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${username || 'U'}&size=128` }}
                />
              </div>
            </div>

            <div className="flex-1 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Nombre de Usuario</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">URL de Foto de Perfil</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <PhotoIcon className="h-5 w-5 text-gray-500" />
                  </div>
                  <input
                    type="url"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-10 px-4 py-2.5 text-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-gray-800/50 rounded-2xl border border-gray-700 overflow-hidden">
          <div className="p-4 bg-gray-800/80 border-b border-gray-700 flex items-center gap-2">
            <KeyIcon className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-white">Seguridad</h2>
          </div>
          
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Nueva Contraseña</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Confirmar Contraseña</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </section>

        <div className="flex justify-end pt-4">
          <button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-3 px-8 rounded-xl shadow-lg transition-all active:scale-95">
            {loading ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </form>
    </div>
  );
}