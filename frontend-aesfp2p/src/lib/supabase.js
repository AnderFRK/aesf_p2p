import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
    // ESTA ES LA CLAVE:
    timeout: 30000, // Esperar 30 segundos en lugar de 10
    headers: {
        'apikey': supabaseAnonKey,
    }
  }
})