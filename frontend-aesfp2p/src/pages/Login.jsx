import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const [isRegister, setIsRegister] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const navigate = useNavigate()

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')

    if (isRegister) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username,
          },
        },
      })

      if (error) {
        setErrorMsg(error.message)
      } else {
        alert('¡Estas en la cima! de mi pinga')
        console.log('Revisar el correo por si pusiste tu correo real')
        if (data.session) navigate('/') 
      }

    } else {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setErrorMsg('Error: Credenciales incorrectas')
      } else {
        navigate('/')
      }
    }
    setLoading(false)
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white p-4">
      <div className="w-full max-w-md bg-gray-800 rounded-lg shadow-xl overflow-hidden border border-gray-700">
        <div className="flex text-center font-bold">
          <button 
            onClick={() => setIsRegister(false)}
            className={`flex-1 py-4 transition-colors ${!isRegister ? 'bg-emerald-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
          >
            Iniciar Sesión
          </button>
          <button 
            onClick={() => setIsRegister(true)}
            className={`flex-1 py-4 transition-colors ${isRegister ? 'bg-emerald-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
          >
            Registrarse
          </button>
        </div>

        <div className="p-8">
          <h2 className="text-2xl font-bold mb-6 text-center text-emerald-400">
            {isRegister ? 'Crea tu cuenta wanaso' : 'AESF P2P - c Login'}
          </h2>

          <form onSubmit={handleAuth} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-sm mb-1 text-gray-300">Nombre de Usuario</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2 bg-gray-700 rounded border border-gray-600 focus:border-emerald-500 focus:outline-none"
                  placeholder="Ej. Pepito"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            )}

            <div>
              <label className="block text-sm mb-1 text-gray-300">Correo Electrónico</label>
              <input
                type="email"
                required
                className="w-full px-4 py-2 bg-gray-700 rounded border border-gray-600 focus:border-emerald-500 focus:outline-none"
                placeholder="mongoldeportes@gmail.com (cuaquier correo falso no sean sanos)"
                value={email}
                onChange={(e) => setEmail(e.target.value.trim())}
              />
            </div>

            <div>
              <label className="block text-sm mb-1 text-gray-300">Contraseña</label>
              <input
                type="password"
                required
                minLength={6}
                className="w-full px-4 py-2 bg-gray-700 rounded border border-gray-600 focus:border-emerald-500 focus:outline-none"
                placeholder="******"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {errorMsg && (
              <p className="text-red-400 text-sm text-center bg-red-900/20 p-2 rounded">{errorMsg}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 rounded font-bold transition-transform active:scale-95 disabled:opacity-50"
            >
              {loading ? 'Procesando...' : (isRegister ? 'Crear Cuenta' : 'Entrar')}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}