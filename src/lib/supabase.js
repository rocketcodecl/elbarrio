import { createClient } from '@supabase/supabase-js'

// Guard anti undefined: si las env vars no cargan, no crashea.
// En modo dev mostramos un warning claro en consola.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.warn(
    '[supabase] Faltan VITE_SUPABASE_URL o VITE_SUPABASE_KEY en .env. ' +
    'Revisa que el archivo .env exista en la raiz del proyecto y que ' +
    'Vite se haya reiniciado despues de crearlo.'
  )
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
)
