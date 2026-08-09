import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase.js'

const TYPES = { sell: 'Venta', gift: 'Regalo', trade: 'Trueque', request: 'Pedido', service: 'Servicio', event: 'Evento', news: 'Noticia', general: 'Publicación' }
const STATUS = { active: 'Visible', pending: 'Pendiente', closed: 'Cerrada', sold: 'Finalizada', rejected: 'Oculta', removed: 'Retirada', cancelled: 'Cancelada' }
const imageOf = post => Array.isArray(post?.images) ? post.images.find(Boolean) : post?.image_url
const dateLabel = value => value ? new Date(value).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' }) : 'Sin fecha'

export default function PostManager({ profile }) {
  const [posts, setPosts] = useState([]); const [selectedId, setSelectedId] = useState(null)
  const [actions, setActions] = useState([]); const [query, setQuery] = useState(''); const [type, setType] = useState('all'); const [status, setStatus] = useState('all')
  const [loading, setLoading] = useState(true); const [changing, setChanging] = useState(''); const [error, setError] = useState(''); const [notice, setNotice] = useState('')
  const [editing, setEditing] = useState(false); const [editDraft, setEditDraft] = useState({}); const [editReason, setEditReason] = useState('')
  const selected = posts.find(item => item.id === selectedId) || null

  const load = useCallback(async preferredId => {
    setLoading(true); setError('')
    const { data, error: loadError } = await supabase.from('posts').select('*, author:profiles!author_id(id, full_name, avatar_url, neighborhood_id)').order('created_at', { ascending: false }).limit(700)
    if (loadError) { setPosts([]); setError(`No fue posible cargar las publicaciones: ${loadError.message}`) }
    else { const next = data || []; setPosts(next); setSelectedId(current => next.some(p => p.id === (preferredId || current)) ? (preferredId || current) : next[0]?.id || null) }
    setLoading(false)
  }, [])
  useEffect(() => { if (profile?.is_superadmin) Promise.resolve().then(load) }, [load, profile?.is_superadmin])
  useEffect(() => {
    if (!selectedId) return undefined
    supabase.from('post_admin_actions').select('*, admin:profiles!admin_profile_id(full_name)').eq('post_id', selectedId).order('created_at', { ascending: false }).then(({ data }) => setActions(data || []))
  }, [selectedId])
  useEffect(() => {
    if (!selected) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- prepara el editor al cambiar la publicación seleccionada
    setEditDraft({ title:selected.title||'', content:selected.content||selected.description||'', category:selected.category||'', price:selected.price??'', budget:selected.budget??'', looking_for:selected.looking_for||'', is_negotiable:selected.is_negotiable===true, status:selected.status||'active', show_in_activity:selected.show_in_activity===true, news_source:selected.news_source||'', news_url:selected.news_url||'', news_is_official:selected.news_is_official===true, service_phone:selected.service_phone||'', service_whatsapp:selected.service_whatsapp||'', service_instagram:selected.service_instagram||'', location_text:selected.location_text||'' })
    setEditReason(''); setEditing(false)
  }, [selected])

  const filtered = useMemo(() => posts.filter(post => {
    const needle = query.trim().toLowerCase()
    return (type === 'all' || post.type === type) && (status === 'all' || post.status === status)
      && (!needle || [post.title, post.content, post.category, post.author?.full_name].some(value => String(value || '').toLowerCase().includes(needle)))
  }), [posts, query, status, type])

  const moderate = async action => {
    if (!selected) return
    const labels = { hide: 'ocultar', restore: 'restaurar', close: 'cerrar', remove: 'retirar' }
    const reason = window.prompt(`Motivo para ${labels[action]} esta publicación:`)?.trim()
    if (!reason) return
    if (action === 'remove' && !window.confirm('La publicación quedará retirada de circulación y conservará su evidencia. ¿Continuar?')) return
    setChanging(action); setError('')
    const { error: actionError } = await supabase.rpc('admin_moderate_post', { p_post_id: selected.id, p_action: action, p_reason: reason })
    setChanging('')
    if (actionError) return setError(`No fue posible moderar: ${actionError.message}`)
    setNotice('Acción registrada correctamente'); setTimeout(() => setNotice(''), 2200); await load(selected.id)
    const { data } = await supabase.from('post_admin_actions').select('*, admin:profiles!admin_profile_id(full_name)').eq('post_id', selected.id).order('created_at', { ascending: false }); setActions(data || [])
  }

  const saveEdit = async event => {
    event.preventDefault()
    if (!selected || changing) return
    if (!String(editDraft.title||'').trim()) return setError('El título no puede quedar vacío.')
    if (editReason.trim().length<3) return setError('Indica el motivo de la edición.')
    setChanging('edit'); setError('')
    const { error: editError } = await supabase.rpc('admin_edit_post',{p_post_id:selected.id,p_changes:editDraft,p_reason:editReason.trim()})
    setChanging('')
    if (editError) return setError(`No fue posible editar: ${editError.message}`)
    setEditing(false); setNotice('Publicación actualizada y acción registrada'); setTimeout(()=>setNotice(''),2500); await load(selected.id)
  }

  if (!profile?.is_superadmin) return <div className="panel-empty"><strong>Acceso exclusivo del superadministrador</strong></div>
  return <div className="post-manager-page">
    <section className="page-heading commerce-page-heading"><div><p className="eyebrow">Control global</p><h1>Publicaciones</h1><p>Supervisa el contenido vecinal y retíralo inmediatamente cuando vulnere las reglas.</p></div><div className="service-metrics"><span><strong>{posts.length}</strong>Total</span><span><strong>{posts.filter(p => p.status === 'active').length}</strong>Visibles</span><span><strong>{posts.filter(p => ['rejected','removed'].includes(p.status)).length}</strong>Retiradas</span></div></section>
    {error && <div className="admin-alert"><span>⚠️</span><p>{error}</p><button onClick={() => setError('')}>×</button></div>}{notice && <div className="admin-toast">✓ {notice}</div>}
    <section className="post-moderation-tools"><label className="admin-search"><span>⌕</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar título, contenido, categoría o autor…" /></label><select value={type} onChange={e => setType(e.target.value)}><option value="all">Todos los tipos</option>{Object.entries(TYPES).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select><select value={status} onChange={e => setStatus(e.target.value)}><option value="all">Todos los estados</option>{Object.entries(STATUS).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></section>
    <section className="post-moderation-workspace"><aside className="post-moderation-list">{loading ? <div className="panel-loading">Cargando publicaciones…</div> : filtered.map(post => <button key={post.id} className={post.id === selectedId ? 'is-selected' : ''} onClick={() => setSelectedId(post.id)}>{imageOf(post) ? <img src={imageOf(post)} alt="" /> : <span>📄</span>}<div><strong>{post.title || 'Sin título'}</strong><small>{TYPES[post.type] || post.type} · {post.author?.full_name || 'Sin autor'}</small><em>{STATUS[post.status] || post.status} · {dateLabel(post.created_at)}</em></div></button>)}</aside>
      <article className="post-moderation-detail">{!selected ? <div className="panel-empty"><strong>Selecciona una publicación</strong></div> : <><header><div><span>{TYPES[selected.type] || selected.type} · {selected.category || 'Sin categoría'}</span><h2>{selected.title || 'Sin título'}</h2><small>{STATUS[selected.status] || selected.status} · {dateLabel(selected.created_at)}</small></div><div><button className="approve" disabled={!!changing} onClick={() => setEditing(value=>!value)}>{editing?'Cancelar edición':'Editar contenido'}</button>{selected.status !== 'active' && <button className="approve" disabled={!!changing} onClick={() => moderate('restore')}>Restaurar</button>}{selected.status === 'active' && <button disabled={!!changing} onClick={() => moderate('close')}>Cerrar</button>}<button className="reject" disabled={!!changing} onClick={() => moderate('hide')}>Ocultar</button><button className="danger" disabled={!!changing} onClick={() => moderate('remove')}>Retirar</button></div></header>
        {editing && <form className="post-global-editor" onSubmit={saveEdit}><label>Título<input value={editDraft.title||''} onChange={e=>setEditDraft(d=>({...d,title:e.target.value}))} /></label><label>Categoría<input value={editDraft.category||''} onChange={e=>setEditDraft(d=>({...d,category:e.target.value}))} /></label><label className="wide">Contenido<textarea rows="6" value={editDraft.content||''} onChange={e=>setEditDraft(d=>({...d,content:e.target.value}))} /></label>{selected.type==='sell'&&<><label>Precio<input type="number" min="0" value={editDraft.price} onChange={e=>setEditDraft(d=>({...d,price:e.target.value}))} /></label><label className="check"><input type="checkbox" checked={editDraft.is_negotiable} onChange={e=>setEditDraft(d=>({...d,is_negotiable:e.target.checked}))} /> Conversable</label></>}{selected.type==='trade'&&<label>Busca a cambio<input value={editDraft.looking_for||''} onChange={e=>setEditDraft(d=>({...d,looking_for:e.target.value}))} /></label>}{selected.type==='request'&&<label>Presupuesto<input type="number" min="0" value={editDraft.budget} onChange={e=>setEditDraft(d=>({...d,budget:e.target.value}))} /></label>}{selected.type==='news'&&<><label>Fuente<input value={editDraft.news_source||''} onChange={e=>setEditDraft(d=>({...d,news_source:e.target.value}))} /></label><label>Enlace<input type="url" value={editDraft.news_url||''} onChange={e=>setEditDraft(d=>({...d,news_url:e.target.value}))} /></label><label className="check"><input type="checkbox" checked={editDraft.show_in_activity} onChange={e=>setEditDraft(d=>({...d,show_in_activity:e.target.checked}))} /> Mostrar en Actividad</label></>}{selected.type==='service'&&<><label>Teléfono<input value={editDraft.service_phone||''} onChange={e=>setEditDraft(d=>({...d,service_phone:e.target.value}))} /></label><label>WhatsApp<input value={editDraft.service_whatsapp||''} onChange={e=>setEditDraft(d=>({...d,service_whatsapp:e.target.value}))} /></label></>}<label>Estado<select value={editDraft.status||'active'} onChange={e=>setEditDraft(d=>({...d,status:e.target.value}))}>{Object.entries(STATUS).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label><label className="wide">Motivo de edición<input value={editReason} onChange={e=>setEditReason(e.target.value)} placeholder="Quedará registrado en el historial" required /></label><footer className="wide"><button type="button" onClick={()=>setEditing(false)}>Cancelar</button><button type="submit" disabled={changing==='edit'}>{changing==='edit'?'Guardando…':'Guardar cambios'}</button></footer></form>}
        <section className="post-author-card">{selected.author?.avatar_url ? <img src={selected.author.avatar_url} alt="" /> : <span>{(selected.author?.full_name || 'V')[0]}</span>}<div><small>Publicado por</small><strong>{selected.author?.full_name || 'Vecino sin nombre'}</strong><em>ID de perfil: {selected.author_id}</em></div></section>
        {imageOf(selected) && <img className="post-moderation-cover" src={imageOf(selected)} alt="" />}<h3>Contenido</h3><p className="post-moderation-copy">{selected.content || selected.description || 'Sin descripción.'}</p>
        <h3>Historial administrativo</h3><div className="post-action-history">{actions.length ? actions.map(item => <div key={item.id}><strong>{item.action.toUpperCase()} · {item.admin?.full_name || 'Administrador'}</strong><span>{item.reason}</span><small>{item.previous_status} → {item.new_status} · {dateLabel(item.created_at)}</small></div>) : <p>Sin acciones administrativas.</p>}</div></>}
      </article></section>
  </div>
}
