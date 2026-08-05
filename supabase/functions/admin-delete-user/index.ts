import { createClient } from '@supabase/supabase-js'

const FUNCTION_NAME = 'admin-delete-user'
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Expose-Headers': 'x-el-barrio-function',
  'Content-Type': 'application/json',
  'x-el-barrio-function': FUNCTION_NAME,
}

const respond = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: corsHeaders })

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

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return respond({ error: { message: 'Método no permitido.' } }, 405)

  let payload: Record<string, unknown>
  try {
    payload = await request.json()
  } catch {
    return respond({ error: { message: 'Solicitud inválida.' } }, 400)
  }

  const targetProfileId = String(payload.target_profile_id || '')
  if (!targetProfileId || payload.confirmation !== 'ELIMINAR') {
    return respond({ error: { message: 'Falta la confirmación de eliminación.' } }, 400)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const authorization = request.headers.get('Authorization')
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

  const { data: userData } = await sessionClient.auth.getUser()
  if (!userData?.user) return respond({ error: { message: 'La sesión administrativa venció.' } }, 401)

  const { data: admin } = await serviceClient
    .from('profiles')
    .select('id, role, is_superadmin, account_status')
    .eq('user_id', userData.user.id)
    .maybeSingle()
  if (!admin || admin.role !== 'admin' || !admin.is_superadmin || admin.account_status !== 'active') {
    return respond({ error: { message: 'Solo un superadministrador activo puede eliminar cuentas.' } }, 403)
  }

  const { data: target } = await serviceClient
    .from('profiles')
    .select('id, user_id, avatar_url, full_name, role, is_superadmin, account_status')
    .eq('id', targetProfileId)
    .maybeSingle()
  if (!target?.id || !target.user_id) return respond({ error: { message: 'No encontramos la cuenta solicitada.' } }, 404)
  if (target.id === admin.id) return respond({ error: { message: 'No puedes eliminar tu propia cuenta administrativa.' } }, 409)
  if (target.is_superadmin) return respond({ error: { message: 'Primero debes retirar el nivel de superadministrador.' } }, 409)
  if (target.role === 'admin') return respond({ error: { message: 'Primero debes retirar los permisos de administrador territorial.' } }, 409)
  if (target.account_status === 'deleted') return respond({ error: { message: 'Esta cuenta ya fue eliminada.' } }, 409)

  const userHash = await sha256(target.user_id)
  const { data: audit, error: auditError } = await serviceClient
    .from('account_deletion_events')
    .insert({
      user_hash: userHash,
      profile_id: target.id,
      requested_by_profile_id: admin.id,
      source: 'superadmin',
      status: 'started',
    })
    .select('id')
    .single()
  if (auditError || !audit?.id) return respond({ error: { message: 'No pudimos iniciar la auditoría de eliminación.' } }, 500)

  const fail = async (detail: string) => {
    await serviceClient.from('account_deletion_events').update({
      status: 'failed',
      error_message: detail.slice(0, 400),
      completed_at: new Date().toISOString(),
    }).eq('id', audit.id)
    return respond({ error: { message: 'La cuenta quedó bloqueada, pero falta completar su anonimización.' } }, 500)
  }

  const { error: deleteAuthError } = await serviceClient.auth.admin.deleteUser(target.user_id, true)
  if (deleteAuthError) return fail(`auth: ${deleteAuthError.message}`)

  let cleanupWarning: string | null = null
  const path = avatarObjectPath(target.avatar_url)
  if (path) {
    const { error: avatarError } = await serviceClient.storage.from('avatars').remove([path])
    if (avatarError) cleanupWarning = `avatar: ${avatarError.message}`
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
    suspended_at: new Date().toISOString(),
    suspended_by: admin.id,
  }).eq('id', target.id)
  if (anonymizeError) return fail(`profile: ${anonymizeError.message}`)

  await serviceClient.from('push_device_tokens').update({ is_active: false }).eq('profile_id', target.id)
  await serviceClient.from('account_deletion_events').update({
    status: 'completed',
    completed_at: new Date().toISOString(),
    error_message: cleanupWarning,
  }).eq('id', audit.id)

  return respond({ deleted: true, profile_id: target.id })
})
