import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase.js'

const TYPE_LABELS = { event: 'Panorama', news: 'Dato útil', sell: 'Mercado', gift: 'Regalo', trade: 'Trueque', general: 'Comunidad', service: 'Servicio' }

export default function HomeCarouselManager({ profile }) {
  const isSuperadmin = profile?.is_superadmin === true
  const [neighborhoods, setNeighborhoods] = useState([])
  const [neighborhoodId, setNeighborhoodId] = useState(isSuperadmin ? '' : (profile?.neighborhood_id || ''))
  const [posts, setPosts] = useState([])
  const [selected, setSelected] = useState([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!isSuperadmin) return
    supabase.from('neighborhoods').select('id,name,uv_code').order('name').then(({ data, error: loadError }) => {
      if (loadError) setError(loadError.message)
      setNeighborhoods(data || [])
    })
  }, [isSuperadmin])

  const load = useCallback(async () => {
    if (!neighborhoodId) { setPosts([]); setSelected([]); return }
    setLoading(true); setError('')
    const { data, error: loadError } = await supabase.from('posts')
      .select('id,title,type,images,status,created_at,starts_at,home_carousel_order')
      .eq('neighborhood_id', neighborhoodId)
      .eq('status', 'active')
      .in('type', Object.keys(TYPE_LABELS))
      .order('created_at', { ascending: false })
      .limit(150)
    setLoading(false)
    if (loadError) return setError(`No fue posible cargar la portada: ${loadError.message}`)
    const eligible = (data || []).filter(item => item.images?.[0])
    setPosts(eligible)
    setSelected(eligible.filter(item => item.home_carousel_order != null).sort((a, b) => a.home_carousel_order - b.home_carousel_order))
  }, [neighborhoodId])

  // Carga remota al cambiar el barrio; los estados representan esa consulta.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [load])

  const available = useMemo(() => posts.filter(item => !selected.some(chosen => chosen.id === item.id) && (!query.trim() || `${item.title} ${TYPE_LABELS[item.type]}`.toLowerCase().includes(query.toLowerCase()))), [posts, query, selected])
  const add = post => { if (selected.length < 15) setSelected(current => [...current, post]) }
  const remove = id => setSelected(current => current.filter(item => item.id !== id))
  const move = (index, direction) => setSelected(current => {
    const target = index + direction
    if (target < 0 || target >= current.length) return current
    const next = [...current]; [next[index], next[target]] = [next[target], next[index]]; return next
  })
  const save = async () => {
    setSaving(true); setError(''); setNotice('')
    const { error: saveError } = await supabase.rpc('admin_set_home_discovery_carousel', { p_neighborhood_id: neighborhoodId, p_post_ids: selected.map(item => item.id) })
    setSaving(false)
    if (saveError) return setError(`No fue posible guardar: ${saveError.message}`)
    setNotice(`Portada actualizada con ${selected.length} ${selected.length === 1 ? 'tarjeta' : 'tarjetas'}.`)
    await load()
  }

  return <div className="home-carousel-manager">
    <header className="page-heading"><div><p className="eyebrow">Primera impresión</p><h1>Portada de Inicio</h1><p>Selecciona hasta quince contenidos con fotografía. La app mezclará el conjunto y mostrará hasta diez por sesión.</p></div><span className="status-pill">{selected.length}/15 seleccionados</span></header>
    {error && <div className="admin-message error">{error}</div>}{notice && <div className="admin-message success">{notice}</div>}
    {isSuperadmin && <label className="field home-carousel-neighborhood">Barrio<select value={neighborhoodId} onChange={event => setNeighborhoodId(event.target.value)}><option value="">Selecciona un barrio</option>{neighborhoods.map(item => <option key={item.id} value={item.id}>{item.name}{item.uv_code ? ` · UV ${item.uv_code}` : ''}</option>)}</select></label>}
    {neighborhoodId && <div className="home-carousel-layout">
      <section className="home-carousel-selected"><div className="home-carousel-section-title"><div><span>1</span><div><h2>Selección editorial</h2><p>La app mezclará estas tarjetas al entrar.</p></div></div><button type="button" onClick={save} disabled={saving}>{saving ? 'Guardando…' : 'Guardar portada'}</button></div>
        {selected.length === 0 && <p className="home-carousel-empty">No hay contenidos seleccionados.</p>}
        {selected.map((item, index) => <article className="home-carousel-selected-card" key={item.id}><img src={item.images[0]} alt=""/><b>{index + 1}</b><div><small>{TYPE_LABELS[item.type] || item.type}</small><strong>{item.title}</strong></div><span><button type="button" disabled={index === 0} onClick={() => move(index, -1)}>↑</button><button type="button" disabled={index === selected.length - 1} onClick={() => move(index, 1)}>↓</button><button type="button" onClick={() => remove(item.id)}>Quitar</button></span></article>)}
      </section>
      <section className="home-carousel-library"><div className="home-carousel-section-title"><div><span>2</span><div><h2>Contenido disponible</h2><p>Solo publicaciones activas con fotografía.</p></div></div></div><input className="home-carousel-search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar contenido…"/>
        {loading && <p className="home-carousel-empty">Cargando…</p>}{!loading && available.map(item => <button className="home-carousel-library-card" type="button" key={item.id} onClick={() => add(item)} disabled={selected.length >= 15}><img src={item.images[0]} alt=""/><span><small>{TYPE_LABELS[item.type] || item.type}</small><strong>{item.title}</strong></span><b>+</b></button>)}
      </section>
    </div>}
  </div>
}
