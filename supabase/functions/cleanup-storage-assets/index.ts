import { createClient } from '@supabase/supabase-js'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors })

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (request.method !== 'POST') return reply({ error: 'Método no permitido.' }, 405)

  const url = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const authorization = request.headers.get('Authorization')
  if (!url || !anonKey || !serviceKey || !authorization?.startsWith('Bearer ')) {
    return reply({ error: 'Configuración o sesión incompleta.' }, 401)
  }

  const token = authorization.slice(7)
  const serviceClient = createClient(url, serviceKey, { auth: { persistSession: false } })
  const calledByServiceRole = token === serviceKey
  if (!calledByServiceRole) {
    const sessionClient = createClient(url, anonKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } })
    const { data: authData } = await sessionClient.auth.getUser()
    if (!authData.user) return reply({ error: 'Sesión vencida.' }, 401)
    const { data: profile } = await serviceClient.from('profiles')
      .select('role, is_superadmin, account_status').eq('user_id', authData.user.id).maybeSingle()
    if (profile?.role !== 'admin' || !profile?.is_superadmin || profile?.account_status === 'suspended') {
      return reply({ error: 'Acceso de superadministrador requerido.' }, 403)
    }
  }

  const retention = await serviceClient.rpc('apply_basic_content_retention')
  const { data: pending, error: queueError } = await serviceClient.from('storage_cleanup_queue')
    .select('id, bucket, object_path')
    .is('processed_at', null)
    .lte('delete_after', new Date().toISOString())
    .order('created_at', { ascending: true })
    .limit(100)
  if (queueError) return reply({ error: queueError.message }, 500)

  let deleted = 0
  let failed = 0
  for (const item of pending || []) {
    const { error } = await serviceClient.storage.from(item.bucket).remove([item.object_path])
    if (error) {
      failed += 1
      await serviceClient.from('storage_cleanup_queue').update({ last_error: error.message }).eq('id', item.id)
    } else {
      deleted += 1
      await serviceClient.from('storage_cleanup_queue').update({ processed_at: new Date().toISOString(), last_error: null }).eq('id', item.id)
    }
  }

  await serviceClient.from('service_usage_events').insert({
    service: 'supabase', operation: 'storage_cleanup', success: failed === 0,
    quantity: deleted, metadata: { attempted: pending?.length || 0, failed },
  })

  return reply({ deleted, failed, pending_processed: pending?.length || 0, retention: retention.data || null })
})
