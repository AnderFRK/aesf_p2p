import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const createSupabaseClient = () => {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    // CONFIGURACIÓN NUEVA PARA EVITAR TIMED_OUT
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
      // Damos 30 segundos antes de rendirse (por defecto son 10)
      timeout: 30000, 
      // Latidos del corazón más frecuentes para mantener la conexión viva
      heartbeatIntervalMs: 5000, 
    },
  })
}

let supabase

if (import.meta.env.PROD) {
  supabase = createSupabaseClient()
} else {
  if (!globalThis.supabaseInstance) {
    globalThis.supabaseInstance = createSupabaseClient()
  }
  supabase = globalThis.supabaseInstance
}

export { supabase }