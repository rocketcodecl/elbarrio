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

  if (!profile?.is_superadmin) return <div className="panel-empty"><strong>Acceso exclusivo del superadministrador</strong></div>
  return <div className="post-manager-page">
    <section className="page-heading commerce-page-heading"><div><p className="eyebrow">Control global</p><h1>Publicaciones</h1><p>Supervisa el contenido vecinal y retíralo inmediatamente cuando vulnere las reglas.</p></div><div className="service-metrics"><span><strong>{posts.length}</strong>Total</span><span><strong>{posts.filter(p => p.status === 'active').length}</strong>Visibles</span><span><strong>{posts.filter(p => ['rejected','removed'].includes(p.status)).length}</strong>Retiradas</span></div></section>
    {error && <div className="admin-alert"><span>⚠️</span><p>{error}</p><button onClick={() => setError('')}>×</button></div>}{notice && <div className="admin-toast">✓ {notice}</div>}
    <section className="post-moderation-tools"><label className="admin-search"><span>⌕</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar título, contenido, categoría o autor…" /></label><select value={type} onChange={e => setType(e.target.value)}><option value="all">Todos los tipos</option>{Object.entries(TYPES).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select><select value={status} onChange={e => setStatus(e.target.value)}><option value="all">Todos los estados</option>{Object.entries(STATUS).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></section>
    <section className="post-moderation-workspace"><aside className="post-moderation-list">{loading ? <div className="panel-loading">Cargando publicaciones…</div> : filtered.map(post => <button key={post.id} className={post.id === selectedId ? 'is-selected' : ''} onClick={() => setSelectedId(post.id)}>{imageOf(post) ? <img src={imageOf(post)} alt="" /> : <span>📄</span>}<div><strong>{post.title || 'Sin título'}</strong><small>{TYPES[post.type] || post.type} · {post.author?.full_name || 'Sin autor'}</small><em>{STATUS[post.status] || post.status} · {dateLabel(post.created_at)}</em></div></button>)}</aside>
      <article className="post-moderation-detail">{!selected ? <div className="panel-empty"><strong>Selecciona una publicación</strong></div> : <><header><div><span>{TYPES[selected.type] || selected.type} · {selected.category || 'Sin categoría'}</span><h2>{selected.title || 'Sin título'}</h2><small>{STATUS[selected.status] || selected.status} · {dateLabel(selected.created_at)}</small></div><div>{selected.status !== 'active' && <button className="approve" disabled={!!changing} onClick={() => moderate('restore')}>Restaurar</button>}{selected.status === 'active' && <button disabled={!!changing} onClick={() => moderate('close')}>Cerrar</button>}<button className="reject" disabled={!!changing} onClick={() => moderate('hide')}>Ocultar</button><button className="danger" disabled={!!changing} onClick={() => moderate('remove')}>Retirar</button></div></header>
        <section className="post-author-card">{selected.author?.avatar_url ? <img src={selected.author.avatar_url} alt="" /> : <span>{(selected.author?.full_name || 'V')[0]}</span>}<div><small>Publicado por</small><strong>{selected.author?.full_name || 'Vecino sin nombre'}</strong><em>ID de perfil: {selected.author_id}</em></div></section>
        {imageOf(selected) && <img className="post-moderation-cover" src={imageOf(selected)} alt="" />}<h3>Contenido</h3><p className="post-moderation-copy">{selected.content || selected.description || 'Sin descripción.'}</p>
        <h3>Historial administrativo</h3><div className="post-action-history">{actions.length ? actions.map(item => <div key={item.id}><strong>{item.action.toUpperCase()} · {item.admin?.full_name || 'Administrador'}</strong><span>{item.reason}</span><small>{item.previous_status} → {item.new_status} · {dateLabel(item.created_at)}</small></div>) : <p>Sin acciones administrativas.</p>}</div></>}
      </article></section>
  </div>
}
