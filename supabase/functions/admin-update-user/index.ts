import { createClient } from '@supabase/supabase-js'

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Content-Type': 'application/json' }
const reply = (body: unknown, status=200) => new Response(JSON.stringify(body), { status, headers: cors })

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (request.method !== 'POST') return reply({ error: 'Método no permitido' }, 405)
  const url=Deno.env.get('SUPABASE_URL'), anon=Deno.env.get('SUPABASE_ANON_KEY'), service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const authorization=request.headers.get('Authorization')
  if (!url || !anon || !service || !authorization) return reply({ error:'Sesión requerida' },401)
  const userClient=createClient(url,anon,{global:{headers:{Authorization:authorization}},auth:{persistSession:false}})
  const {data:auth}=await userClient.auth.getUser()
  if (!auth.user) return reply({error:'Sesión vencida'},401)
  const {data:actor}=await userClient.from('profiles').select('id,role,is_superadmin,account_status').eq('user_id',auth.user.id).maybeSingle()
  if (actor?.role!=='admin' || !actor?.is_superadmin || actor?.account_status==='suspended') return reply({error:'Acceso de superadministrador requerido'},403)
  const body=await request.json().catch(()=>({}))
  const targetId=String(body.target_profile_id||'')
  const changes=(body.changes && typeof body.changes==='object') ? body.changes : {}
  const password=String(body.new_password||'')
  const reason=String(body.reason||'Actualización administrativa').trim()
  const serviceClient=createClient(url,service,{auth:{persistSession:false}})
  const {data:target,error:targetError}=await serviceClient.from('profiles').select('id,user_id,email').eq('id',targetId).maybeSingle()
  if (targetError || !target?.user_id) return reply({error:'Usuario no encontrado'},404)
  if (password && password.length<8) return reply({error:'La contraseña debe tener al menos 8 caracteres'},400)
  const authChanges: Record<string,unknown>={}
  if (Object.hasOwn(changes,'email') && String(changes.email||'').trim()) authChanges.email=String(changes.email).trim().toLowerCase()
  if (password) authChanges.password=password
  if (Object.keys(authChanges).length) {
    const {error}=await serviceClient.auth.admin.updateUserById(target.user_id,authChanges)
    if (error) return reply({error:error.message},400)
  }
  const {data:updated,error:updateError}=await userClient.rpc('admin_update_profile_details',{p_target_profile_id:targetId,p_changes:changes,p_reason:reason})
  if (updateError) {
    if (authChanges.email && target.email) await serviceClient.auth.admin.updateUserById(target.user_id,{email:target.email})
    return reply({error:updateError.message},400)
  }
  return reply({ok:true,profile:updated,password_updated:Boolean(password)})
})
