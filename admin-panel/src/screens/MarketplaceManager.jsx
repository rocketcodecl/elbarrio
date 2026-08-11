import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { prepareImageUpload } from '../../../shared/imageUpload.js'
import usePersistentDraft from '../hooks/usePersistentDraft.js'

const TYPES = [['sell', 'Venta'], ['gift', 'Regalo'], ['trade', 'Trueque']]
const STATUS_LABELS = { active: 'Visible', pending: 'Pendiente', closed: 'Pausada', rejected: 'Oculta', removed: 'Retirada', sold: 'Finalizada' }
const EMPTY = {
  neighborhoodId: '', authorId: '', type: 'sell', title: '', content: '',
  category: '', price: '', isNegotiable: false, lookingFor: '',
}

const imageOf = post => Array.isArray(post?.images) ? post.images.find(Boolean) : post?.image_url
const money = value => value === null || value === undefined ? '' : `$${Number(value).toLocaleString('es-CL')}`
const dateLabel = value => value ? new Date(value).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' }) : ''

export default function MarketplaceManager({ profile }) {
  const [posts, setPosts] = useState([])
  const [neighborhoods, setNeighborhoods] = useState([])
  const [authors, setAuthors] = useState([])
  const [categories, setCategories] = useState([])
  const [draft, setDraft, clearMarketplaceDraft] = usePersistentDraft(`marketplace:${profile?.id || 'admin'}:new`, EMPTY, 'v1')
  const [files, setFiles] = useState([])
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [creating, setCreating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [changingId, setChangingId] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    const [postResult, neighborhoodResult, categoryResult] = await Promise.all([
      supabase.from('posts').select('*, author:profiles!author_id(id,full_name,avatar_url)').in('type', ['sell', 'gift', 'trade']).order('created_at', { ascending: false }).limit(500),
      supabase.from('neighborhoods').select('id,name,uv_code').order('name'),
      supabase.from('content_categories').select('key,name,icon,is_active,sort_order').eq('scope', 'marketplace').eq('is_active', true).order('sort_order'),
    ])
    if (postResult.error) setError(`No fue posible cargar el Mercado: ${postResult.error.message}`)
    else if (neighborhoodResult.error) setError(`No fue posible cargar los barrios: ${neighborhoodResult.error.message}`)
    setPosts(postResult.data || [])
    setNeighborhoods(neighborhoodResult.data || [])
    setCategories(categoryResult.data || [])
    setDraft(current => ({
      ...current,
      neighborhoodId: current.neighborhoodId || profile?.neighborhood_id || neighborhoodResult.data?.[0]?.id || '',
    }))
    setLoading(false)
  }, [profile?.neighborhood_id, setDraft])

  useEffect(() => { Promise.resolve().then(load) }, [load])

  useEffect(() => {
    if (!draft.neighborhoodId) return undefined
    supabase.from('profiles').select('id,full_name,email').eq('neighborhood_id', draft.neighborhoodId).eq('account_status', 'active').order('full_name').then(({ data, error: authorError }) => {
      if (authorError) {
        setAuthors([])
        setError(`No fue posible cargar los vendedores: ${authorError.message}`)
        return
      }
      const next = data || []
      setAuthors(next)
      setDraft(current => ({
        ...current,
        authorId: next.some(item => item.id === current.authorId)
          ? current.authorId
          : (next.find(item => item.id === profile?.id)?.id || next[0]?.id || ''),
      }))
    })
  }, [draft.neighborhoodId, profile?.id, setDraft])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return posts.filter(post => (filter === 'all' || post.type === filter)
      && (!needle || [post.title, post.content, post.category, post.author?.full_name]
        .some(value => String(value || '').toLowerCase().includes(needle))))
  }, [filter, posts, query])

  const selectFiles = event => {
    const selected = Array.from(event.target.files || []).slice(0, 4)
    setFiles(selected)
    setError((event.target.files?.length || 0) > 4 ? 'Puedes cargar hasta cuatro fotografías.' : '')
  }

  const uploadImages = async () => {
    const urls = []
    for (const file of files) {
      const path = `admin-marketplace/${draft.neighborhoodId}/${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name}`
      const prepared = await prepareImageUpload(file, path, { maxWidth: 1600, maxHeight: 1600 })
      const { error: uploadError } = await supabase.storage.from('posts').upload(prepared.path, prepared.file, { contentType: prepared.file.type })
      if (uploadError) throw uploadError
      const { data } = supabase.storage.from('posts').getPublicUrl(prepared.path)
      if (data?.publicUrl) urls.push(data.publicUrl)
    }
    return urls
  }

  const publish = async event => {
    event.preventDefault()
    setError('')
    if (!draft.neighborhoodId || !draft.authorId) return setError('Selecciona el barrio y el vendedor.')
    if (draft.title.trim().length < 3 || draft.title.trim().length > 60) return setError('El título debe tener entre 3 y 60 caracteres.')
    if (!draft.content.trim() || draft.content.trim().length > 500) return setError('La descripción es obligatoria y admite hasta 500 caracteres.')
    if (draft.type === 'sell' && (draft.price === '' || Number(draft.price) < 0)) return setError('Indica un precio válido.')
    if (draft.type === 'trade' && !draft.lookingFor.trim()) return setError('Indica qué se busca a cambio.')

    setSaving(true)
    try {
      const images = await uploadImages()
      const { error: createError } = await supabase.rpc('admin_create_marketplace_post', {
        p_neighborhood_id: draft.neighborhoodId,
        p_author_id: draft.authorId,
        p_type: draft.type,
        p_title: draft.title.trim(),
        p_content: draft.content.trim(),
        p_category: draft.category || null,
        p_price: draft.type === 'sell' ? Number(draft.price) : null,
        p_is_negotiable: draft.type === 'sell' && draft.isNegotiable,
        p_looking_for: draft.type === 'trade' ? draft.lookingFor.trim() : null,
        p_images: images.length ? images : null,
      })
      if (createError) throw createError
      clearMarketplaceDraft()
      setDraft(current => ({ ...EMPTY, neighborhoodId: current.neighborhoodId, authorId: current.authorId }))
      setFiles([])
      setCreating(false)
      setNotice('Publicación creada y visible en Mercado')
      window.setTimeout(() => setNotice(''), 2600)
      await load()
    } catch (publishError) {
      setError(`No fue posible publicar: ${publishError.message}`)
    } finally {
      setSaving(false)
    }
  }

  const moderate = async (post, action) => {
    const actionKey = `${post.id}:${action}`
    let reason = {
      restore: post.status === 'pending' ? 'Publicación aceptada desde Mercado' : 'Publicación restaurada desde Mercado',
      close: 'Publicación pausada desde Mercado',
    }[action]
    if (action === 'hide') {
      reason = window.prompt('Motivo para ocultar esta publicación:')?.trim()
      if (!reason) return
    }
    if (action === 'remove') {
      if (!window.confirm('La publicación será retirada del Mercado y conservará su trazabilidad. ¿Continuar?')) return
      reason = window.prompt('Motivo para retirar esta publicación:')?.trim()
      if (!reason) return
    }
    setChangingId(actionKey)
    setError('')
    const { error: actionError } = await supabase.rpc('admin_moderate_post', {
      p_post_id: post.id,
      p_action: action,
      p_reason: reason,
    })
    setChangingId('')
    if (actionError) return setError(`No fue posible moderar: ${actionError.message}`)
    const messages = { restore: 'Publicación visible en Mercado', close: 'Publicación pausada', hide: 'Publicación oculta', remove: 'Publicación retirada' }
    setNotice(messages[action])
    window.setTimeout(() => setNotice(''), 2400)
    await load()
  }

  if (!profile?.is_superadmin) return <div className="panel-empty"><strong>Acceso exclusivo del superadministrador</strong></div>

  if (creating) return <div className="market-admin-editor">
    <header className="subpage-header">
      <button className="subpage-back" type="button" onClick={() => setCreating(false)}>←</button>
      <div><p className="eyebrow">Mercado</p><h1>Nueva publicación</h1><span>Publica en nombre de El Barrio o de un vendedor seleccionado.</span></div>
      <button className="button button-primary" type="submit" form="market-admin-form" disabled={saving}>{saving ? 'Publicando…' : 'Publicar'}</button>
    </header>
    {error && <div className="admin-alert" role="alert"><span>⚠️</span><p>{error}</p><button type="button" onClick={() => setError('')}>×</button></div>}
    <form id="market-admin-form" className="market-admin-form" onSubmit={publish}>
      <section><h2>Publicación</h2><p>La ficha aparecerá inmediatamente en Mercado y podrá recibir mensajes y ofertas.</p>
        <div className="market-admin-fields">
          <label>Barrio<select value={draft.neighborhoodId} onChange={event => setDraft(current => ({ ...current, neighborhoodId: event.target.value, authorId: '' }))} required><option value="">Selecciona un barrio</option>{neighborhoods.map(item => <option key={item.id} value={item.id}>{item.name}{item.uv_code ? ` · UV ${item.uv_code}` : ''}</option>)}</select></label>
          <label>Vendedor / autor<select value={draft.authorId} onChange={event => setDraft(current => ({ ...current, authorId: event.target.value }))} required><option value="">Selecciona un perfil</option>{authors.map(item => <option key={item.id} value={item.id}>{item.full_name || item.email || 'Vecino sin nombre'}{item.id === profile.id ? ' · tú' : ''}</option>)}</select><small>Los mensajes y ofertas llegarán a esta cuenta.</small></label>
          <label>Tipo<select value={draft.type} onChange={event => setDraft(current => ({ ...current, type: event.target.value }))}>{TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label>Categoría<select value={draft.category} onChange={event => setDraft(current => ({ ...current, category: event.target.value }))}><option value="">Sin categoría</option>{categories.map(item => <option key={item.key} value={item.key}>{item.icon} {item.name}</option>)}</select></label>
          <label className="wide">Título<input maxLength="60" value={draft.title} onChange={event => setDraft(current => ({ ...current, title: event.target.value }))} placeholder="Ej: Bicicleta urbana en excelente estado" required /><small>{draft.title.length}/60</small></label>
          <label className="wide">Descripción<textarea rows="6" maxLength="500" value={draft.content} onChange={event => setDraft(current => ({ ...current, content: event.target.value }))} placeholder="Describe el estado, medidas y detalles importantes" required /><small>{draft.content.length}/500</small></label>
          {draft.type === 'sell' && <><label>Precio<input type="number" min="0" step="1" value={draft.price} onChange={event => setDraft(current => ({ ...current, price: event.target.value }))} placeholder="0" required /></label><label className="market-admin-check"><input type="checkbox" checked={draft.isNegotiable} onChange={event => setDraft(current => ({ ...current, isNegotiable: event.target.checked }))} /> Precio conversable</label></>}
          {draft.type === 'trade' && <label className="wide">¿Qué busca a cambio?<input maxLength="120" value={draft.lookingFor} onChange={event => setDraft(current => ({ ...current, lookingFor: event.target.value }))} required /></label>}
          <label className="wide market-admin-images">Fotografías<input type="file" accept="image/*" multiple onChange={selectFiles} /><small>{files.length ? `${files.length} fotografía${files.length === 1 ? '' : 's'} seleccionada${files.length === 1 ? '' : 's'}` : 'Hasta cuatro imágenes. Se comprimen antes de subir.'}</small></label>
        </div>
      </section>
      <footer><button type="button" onClick={() => { clearMarketplaceDraft(); setDraft(EMPTY); setFiles([]); setCreating(false) }}>Descartar borrador</button><button className="button button-primary" type="submit" disabled={saving}>{saving ? 'Subiendo y publicando…' : 'Publicar en Mercado'}</button></footer>
    </form>
  </div>

  return <div className="market-admin-page">
    <section className="page-heading commerce-page-heading"><div><p className="eyebrow">Comunidad</p><h1>Mercado</h1><p>Crea, acepta, pausa, oculta o retira publicaciones directamente desde esta pantalla.</p></div><div className="service-heading-actions"><div className="service-metrics"><span><strong>{posts.length}</strong>Total</span><span><strong>{posts.filter(item => item.status === 'active').length}</strong>Visibles</span><span><strong>{posts.filter(item => item.type === 'sell').length}</strong>Ventas</span></div><button className="button button-primary" type="button" onClick={() => setCreating(true)}>＋ Nueva publicación</button></div></section>
    {error && <div className="admin-alert" role="alert"><span>⚠️</span><p>{error}</p><button type="button" onClick={() => setError('')}>×</button></div>}
    {notice && <div className="admin-toast">✓ {notice}</div>}
    <section className="market-admin-toolbar"><label className="admin-search"><span>⌕</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar producto, categoría o vendedor…" /></label><div className="filter-row"><button className={filter === 'all' ? 'is-active' : ''} onClick={() => setFilter('all')}>Todos</button>{TYPES.map(([value, label]) => <button key={value} className={filter === value ? 'is-active' : ''} onClick={() => setFilter(value)}>{label}</button>)}</div></section>
    {loading && <div className="panel-loading">Cargando Mercado…</div>}
    {!loading && !filtered.length && <div className="panel-empty"><span>◫</span><strong>No hay publicaciones en este filtro</strong><small>Crea la primera desde el panel.</small></div>}
    {!loading && !!filtered.length && <section className="market-admin-grid">{filtered.map(post => {
      const busy = changingId.startsWith(`${post.id}:`)
      return <article key={post.id} className="market-admin-card"><div className="market-admin-card-image">{imageOf(post) ? <img src={imageOf(post)} alt="" /> : <span>◫</span>}<em>{TYPES.find(([value]) => value === post.type)?.[1] || post.type}</em></div><div><small>{post.category || 'Sin categoría'} · {dateLabel(post.created_at)}</small><h2>{post.title}</h2><p>{post.content}</p>{post.type === 'sell' && <strong>{money(post.price)}{post.is_negotiable ? ' · conversable' : ''}</strong>}{post.type === 'trade' && <strong>Busca: {post.looking_for}</strong>}<footer><span>{post.author?.full_name || 'Sin autor'}</span><i className={post.status === 'active' ? 'is-active' : ''}>{STATUS_LABELS[post.status] || post.status}</i></footer><div className="market-admin-actions">{post.status !== 'active' && <button className="approve" type="button" disabled={busy} onClick={() => moderate(post, 'restore')}>{post.status === 'pending' ? '✓ Aceptar' : '↻ Restaurar'}</button>}{post.status === 'active' && <button type="button" disabled={busy} onClick={() => moderate(post, 'close')}>Pausar</button>}{!['rejected', 'removed'].includes(post.status) && <button className="hide" type="button" disabled={busy} onClick={() => moderate(post, 'hide')}>Ocultar</button>}{post.status !== 'removed' && <button className="remove" type="button" disabled={busy} onClick={() => moderate(post, 'remove')}>Retirar</button>}</div></div></article>
    })}</section>}
  </div>
}
