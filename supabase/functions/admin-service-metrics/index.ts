import { createClient } from '@supabase/supabase-js'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors })

const externalJson = async (url: string, key: string, extraHeaders: Record<string, string> = {}) => {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${key}`, 'User-Agent': 'El-Barrio-Admin/1.0', ...extraHeaders },
    signal: AbortSignal.timeout(8_000),
  })
  let body: Record<string, unknown> = {}
  try { body = await response.json() } catch { /* respuesta no JSON */ }
  if (!response.ok) throw new Error(String((body.error as { message?: string })?.message || `HTTP ${response.status}`))
  return body
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (request.method !== 'POST') return reply({ error: 'Método no permitido.' }, 405)

  const url = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const authorization = request.headers.get('Authorization')
  if (!url || !anonKey || !serviceKey || !authorization?.startsWith('Bearer ')) return reply({ error: 'Sesión requerida.' }, 401)

  const client = createClient(url, anonKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } })
  const { data: authData } = await client.auth.getUser()
  if (!authData.user) return reply({ error: 'Sesión vencida.' }, 401)
  const { data: profile } = await client.from('profiles').select('role, is_superadmin, account_status').eq('user_id', authData.user.id).maybeSingle()
  if (profile?.role !== 'admin' || !profile?.is_superadmin || profile?.account_status === 'suspended') {
    return reply({ error: 'Acceso de superadministrador requerido.' }, 403)
  }

  const serviceClient = createClient(url, serviceKey, { auth: { persistSession: false } })
  await serviceClient.rpc('apply_basic_content_retention')

  const { data: internal, error: internalError } = await client.rpc('admin_get_platform_metrics')
  if (internalError) return reply({ error: internalError.message }, 500)

  const openRouterKey = Deno.env.get('OPENROUTER_API_KEY')
  const resendKey = Deno.env.get('RESEND_API_KEY')
  const firebaseConfigured = Boolean(Deno.env.get('FIREBASE_SERVICE_ACCOUNT_JSON'))
  const result: Record<string, unknown> = { internal, firebase: { configured: firebaseConfigured, ...(internal?.firebase || {}) } }

  if (openRouterKey) {
    try {
      try {
        const credits = await externalJson('https://openrouter.ai/api/v1/credits', openRouterKey)
        const data = credits.data as { total_credits?: number; total_usage?: number } | undefined
        result.openrouter = {
          configured: true, available: true, source: 'account_credits',
          total_credits: data?.total_credits ?? null,
          total_usage: data?.total_usage ?? null,
          remaining: data?.total_credits != null && data?.total_usage != null ? data.total_credits - data.total_usage : null,
        }
      } catch {
        const currentKey = await externalJson('https://openrouter.ai/api/v1/key', openRouterKey)
        const data = currentKey.data as { limit?: number; usage?: number; limit_remaining?: number } | undefined
        result.openrouter = {
          configured: true, available: true, source: 'api_key',
          total_credits: data?.limit ?? null,
          total_usage: data?.usage ?? null,
          remaining: data?.limit_remaining ?? null,
        }
      }
    } catch (error) {
      result.openrouter = { configured: true, available: false, message: error instanceof Error ? error.message : 'No disponible' }
    }
  } else result.openrouter = { configured: false, available: false }

  if (resendKey) {
    try {
      const emails = await externalJson('https://api.resend.com/emails?limit=100', resendKey)
      const rows = Array.isArray(emails.data) ? emails.data as Array<{ created_at?: string; last_event?: string }> : []
      const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
      const recent = rows.filter(email => email.created_at && new Date(email.created_at).getTime() >= monthAgo)
      const states = recent.reduce<Record<string, number>>((acc, email) => {
        const key = email.last_event || 'unknown'; acc[key] = (acc[key] || 0) + 1; return acc
      }, {})
      result.resend = { configured: true, available: true, sampled_emails_30d: recent.length, sample_limit: 100, states }
    } catch (error) {
      result.resend = { configured: true, available: false, message: error instanceof Error ? error.message : 'No disponible' }
    }
  } else result.resend = { configured: false, available: false }

  return reply(result)
})
