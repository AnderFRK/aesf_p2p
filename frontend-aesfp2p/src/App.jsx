import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'

import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Room from './components/layout/Room'
import Settings from './pages/Settings'

import { VoiceProvider } from './context/VoiceContext';

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return <div className="h-screen bg-gray-900 flex items-center justify-center text-emerald-500 font-bold">Cargando servidor...</div>
  }

  return (
    <VoiceProvider session={session}>
        <Routes>
          <Route path="/login" element={!session ? <Login /> : <Navigate to="/" />} />
          
          <Route path="/" element={session ? <Dashboard session={session} /> : <Navigate to="/login" />}>
            
            <Route path="channels/:roomId" element={<Room session={session} />} />
            
            <Route path="settings" element={<Settings session={session} />} />
            <Route path="profile" element={<Settings session={session} />} /> 
            <Route index element={
              <div className="flex-1 flex flex-col items-center justify-center text-gray-500 bg-gray-700 h-full">
                <p className="text-xl">Welcon 2 AESF P2P PROJECT</p>
                <p className="text-sm">Selecciona un canal a la izquierda.</p>
                <p className="text-xs mt-4 text-gray-400">Proyecto en desarrollo - Fase Pre-Alpha</p>
              </div>
            } />
          </Route>
        </Routes>
    </VoiceProvider>
  )
}

export default App