import { createClient } from '@supabase/supabase-js'

const FUNCTION_NAME = 'delete-my-account'
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Expose-Headers': 'x-el-barrio-function',
  'x-el-barrio-function': FUNCTION_NAME,
}

function respond(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, '0')).join('')
}

function avatarObjectPath(publicUrl: unknown) {
  if (typeof publicUrl !== 'string' || !publicUrl) return null
  const marker = '/storage/v1/object/public/avatars/'
  const index = publicUrl.indexOf(marker)
  if (index < 0) return null
  try {
    return decodeURIComponent(publicUrl.slice(index + marker.length))
  } catch {
    return null
  }
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return respond({ error: { message: 'Método no permitido.' } }, 405)

  let payload: Record<string, unknown>
  try {
    payload = await req.json()
  } catch {
    return respond({ error: { message: 'Solicitud inválida.' } }, 400)
  }
  if (payload.confirmation !== 'ELIMINAR') {
    return respond({ error: { message: 'Falta la confirmación de eliminación.' } }, 400)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const authorization = req.headers.get('Authorization')
  if (!supabaseUrl || !anonKey || !serviceKey || !authorization?.startsWith('Bearer ')) {
    return respond({ error: { message: 'Configuración o sesión no válida.' } }, 401)
  }

  const sessionClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const serviceClient = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: userData, error: userError } = await sessionClient.auth.getUser()
  const user = userData?.user
  if (userError || !user) return respond({ error: { message: 'Tu sesión venció. Vuelve a ingresar.' } }, 401)

  const { data: profile, error: profileError } = await serviceClient
    .from('profiles')
    .select('id, avatar_url, is_superadmin')
    .eq('user_id', user.id)
    .maybeSingle()
  if (profileError || !profile?.id) {
    return respond({ error: { message: 'No encontramos el perfil asociado a tu cuenta.' } }, 404)
  }
  if (profile.is_superadmin) {
    return respond({
      error: { message: 'Transfiere primero la superadministración a otra cuenta. Así evitamos dejar El Barrio sin administración.' },
    }, 409)
  }

  const userHash = await sha256(user.id)
  const { data: audit } = await serviceClient
    .from('account_deletion_events')
    .insert({ user_hash: userHash, profile_id: profile.id, status: 'started' })
    .select('id')
    .single()

  const fail = async (message: string) => {
    if (audit?.id) {
      await serviceClient.from('account_deletion_events').update({
        status: 'failed', error_message: message.slice(0, 400), completed_at: new Date().toISOString(),
      }).eq('id', audit.id)
    }
    return respond({ error: { message: 'La cuenta quedó bloqueada, pero falta completar la limpieza. Contacta a soporte@elbarrio.lat.' } }, 500)
  }

  // El borrado suave invalida definitivamente el acceso sin arriesgar las
  // relaciones comunitarias que dependen del perfil.
  const { error: deleteAuthError } = await serviceClient.auth.admin.deleteUser(user.id, true)
  if (deleteAuthError) return fail(deleteAuthError.message)

  const path = avatarObjectPath(profile.avatar_url)
  if (path) {
    const { error: avatarError } = await serviceClient.storage.from('avatars').remove([path])
    if (avatarError) return fail(`avatar: ${avatarError.message}`)
  }

  const { error: anonymizeError } = await serviceClient.from('profiles').update({
    full_name: 'Vecino eliminado',
    rut: null,
    phone: null,
    email: null,
    avatar_url: null,
    address: null,
    comuna: null,
    lat: null,
    lng: null,
    address_lat: null,
    address_lng: null,
    address_match_distance_m: null,
    verified: false,
    verification_status: 'pending',
    verification_method: null,
    verified_at: null,
    can_publish_events: false,
    is_superadmin: false,
    role: 'vecino',
    account_status: 'deleted',
  }).eq('id', profile.id)
  if (anonymizeError) return fail(`profile: ${anonymizeError.message}`)

  if (audit?.id) {
    await serviceClient.from('account_deletion_events').update({
      status: 'completed', completed_at: new Date().toISOString(), error_message: null,
    }).eq('id', audit.id)
  }

  return respond({ deleted: true })
})
