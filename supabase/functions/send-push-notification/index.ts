import { createClient } from '@supabase/supabase-js'

const FUNCTION_NAME = 'send-push-notification'
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
  'x-el-barrio-function': FUNCTION_NAME,
}

const respond = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: corsHeaders })
const base64Url = (value: Uint8Array | string) => {
  const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value
  let binary = ''
  bytes.forEach(byte => { binary += String.fromCharCode(byte) })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function firebaseAccessToken(serviceAccount: { client_email: string; private_key: string; token_uri?: string }) {
  const now = Math.floor(Date.now() / 1000)
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claim = base64Url(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: serviceAccount.token_uri || 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }))
  const unsigned = `${header}.${claim}`
  const pem = serviceAccount.private_key.replace(/\\n/g, '\n')
  const der = Uint8Array.from(atob(pem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, '')), char => char.charCodeAt(0))
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign'])
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned))
  const assertion = `${unsigned}.${base64Url(new Uint8Array(signature))}`
  const response = await fetch(serviceAccount.token_uri || 'https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
  })
  const result = await response.json()
  if (!response.ok || !result.access_token) throw new Error('No fue posible autorizar el envío con Firebase.')
  return result.access_token as string
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return respond({ error: { message: 'Método no permitido.' } }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const firebaseJson = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_JSON')
  const authorization = request.headers.get('Authorization')
  if (!authorization?.startsWith('Bearer ')) return respond({ error: { message: 'Sesión requerida.' } }, 401)
  if (!supabaseUrl || !anonKey || !serviceKey || !firebaseJson) {
    return respond({ error: { message: 'Configuración segura incompleta.' } }, 503)
  }

  let campaignId = ''
  try {
    campaignId = String((await request.json())?.campaign_id || '')
  } catch {
    return respond({ error: { message: 'Solicitud inválida.' } }, 400)
  }
  if (!campaignId) return respond({ error: { message: 'Falta la campaña.' } }, 400)

  const sessionClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } })
  const serviceClient = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
  const { data: userData } = await sessionClient.auth.getUser()
  if (!userData?.user) return respond({ error: { message: 'Sesión vencida.' } }, 401)

  const { data: admin } = await serviceClient.from('profiles').select('id, role, is_superadmin, neighborhood_id, account_status').eq('user_id', userData.user.id).maybeSingle()
  if (!admin || admin.role !== 'admin' || admin.account_status === 'suspended') return respond({ error: { message: 'Acceso administrativo requerido.' } }, 403)

  const { data: campaign } = await serviceClient.from('notification_campaigns').select('id, admin_profile_id, neighborhood_id, title, body').eq('id', campaignId).maybeSingle()
  if (!campaign || campaign.admin_profile_id !== admin.id || (!admin.is_superadmin && campaign.neighborhood_id !== admin.neighborhood_id)) {
    return respond({ error: { message: 'Campaña no autorizada.' } }, 403)
  }

  const { data: recipients, error: recipientsError } = await serviceClient.from('notifications').select('user_id').eq('related_id', campaign.id)
  if (recipientsError) return respond({ error: { message: 'No fue posible resolver los destinatarios.' } }, 500)
  const profileIds = [...new Set((recipients || []).map(row => row.user_id).filter(Boolean))]
  if (!profileIds.length) return respond({ sent: 0, failed: 0, devices: 0 })

  const { data: devices, error: devicesError } = await serviceClient.from('push_device_tokens').select('id, token').in('profile_id', profileIds).eq('platform', 'android').eq('is_active', true)
  if (devicesError) return respond({ error: { message: 'No fue posible consultar los dispositivos.' } }, 500)
  if (!devices?.length) return respond({ sent: 0, failed: 0, devices: 0 })

  const serviceAccount = JSON.parse(firebaseJson)
  const accessToken = await firebaseAccessToken(serviceAccount)
  let sent = 0
  let failed = 0
  const invalidIds: string[] = []
  for (const device of devices) {
    const response = await fetch(`https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: {
          token: device.token,
          notification: { title: campaign.title, body: campaign.body },
          data: { screen: 'notificaciones', campaign_id: campaign.id },
          android: { priority: 'high', notification: { channel_id: 'el-barrio-general', sound: 'default', color: '#1B9E75' } },
        },
      }),
    })
    if (response.ok) sent += 1
    else {
      failed += 1
      const detail = await response.text()
      if (detail.includes('UNREGISTERED') || detail.includes('INVALID_ARGUMENT')) invalidIds.push(device.id)
    }
  }
  if (invalidIds.length) await serviceClient.from('push_device_tokens').update({ is_active: false }).in('id', invalidIds)
  await serviceClient.from('service_usage_events').insert({
    service: 'firebase', operation: 'push_delivery', success: failed === 0,
    quantity: sent, metadata: { campaign_id: campaign.id, devices: devices.length, failed },
  })
  return respond({ sent, failed, devices: devices.length })
})
