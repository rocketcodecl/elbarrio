import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import ServiceEditor from './ServiceEditor.jsx'

const FILTERS = [
  ['all', 'Todos'],
  ['pending', 'Pendientes'],
  ['active', 'Publicados'],
  ['featured', 'Patrocinados'],
  ['closed', 'Pausados'],
  ['rejected', 'Rechazados'],
]

const RUBROS = {
  gasfiter: ['🔧', 'Gasfitería'], electrico: ['💡', 'Electricidad'], cerrajero: ['🔑', 'Cerrajería'],
  pintor: ['🎨', 'Pintura'], carpintero: ['🪚', 'Carpintería'], maestro: ['🧱', 'Maestro'],
  aseo: ['🧹', 'Limpieza'], jardinero: ['🌱', 'Jardinería'], peluqueria: ['💇', 'Peluquería'],
  mascotas: ['🐕', 'Mascotas'], ninera: ['👶', 'Niñera'], adulto_mayor: ['👵', 'Adulto mayor'],
  fletes: ['🚚', 'Fletes'], clases: ['📖', 'Clases'], internet: ['📶', 'Internet y redes'],
  aire: ['❄️', 'Aire acondicionado'], fumigacion: ['🐜', 'Fumigación'], otro: ['🛠️', 'Otro'],
}

const STATUS = {
  pending: ['Pendiente', 'pending'], active: ['Publicado', 'active'], closed: ['Pausado', 'closed'], rejected: ['Rechazado', 'rejected'],
}

const dateLabel = value => value
  ? new Date(value).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' })
  : 'Sin fecha'

const toInputDate = value => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

const addDays = days => {
  const date = new Date(Date.now() + days * 86400000)
  return toInputDate(date)
}

const categoryInfo = service => RUBROS[service?.service_key || service?.category] || ['🛠️', service?.category || 'Otro']
const serviceImage = service => Array.isArray(service?.images) ? service.images.find(Boolean) : null

function featureState(service) {
  if (!service?.is_featured) return 'normal'
  const now = Date.now()
  const starts = service.featured_starts_at ? new Date(service.featured_starts_at).getTime() : null
  const ends = service.featured_until ? new Date(service.featured_until).getTime() : null
  if (starts && starts > now) return 'scheduled'
  if (ends && ends <= now) return 'expired'
  return 'active'
}

function StatusBadge({ service }) {
  const [label, className] = STATUS[service.status] || [service.status || 'Pendiente', 'pending']
  return <span className={`service-status ${className}`}>{label}</span>
}

export default function ServiceManager({ profile }) {
  const isSuperadmin = profile?.is_superadmin === true
  const neighborhoodId = profile?.neighborhood_id
  const [services, setServices] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [changing, setChanging] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [featureDates, setFeatureDates] = useState({ starts: '', ends: '' })
  const [creating, setCreating] = useState(false)
  const [editingService, setEditingService] = useState(null)

  const selected = services.find(service => service.id === selectedId) || null

  const loadServices = useCallback(async preferredId => {
    setLoading(true)
    setError('')
    if (!isSuperadmin && !neighborhoodId) {
      setServices([])
      setSelectedId(null)
      setError('Tu cuenta administrativa no tiene un barrio asignado.')
      setLoading(false)
      return
    }
    let request = supabase
      .from('posts')
      .select('*, author:profiles!author_id(id, full_name, avatar_url, verified, verification_status, badge_founder)')
      .eq('type', 'service')
      .order('created_at', { ascending: false })
      .limit(500)
    if (!isSuperadmin) request = request.eq('neighborhood_id', neighborhoodId)
    const { data, error: loadError } = await request
    if (loadError) {
      setServices([])
      setError(`No fue posible cargar los servicios: ${loadError.message}`)
    } else {
      const next = data || []
      setServices(next)
      setSelectedId(current => {
        const target = preferredId || current
        return next.some(service => service.id === target) ? target : (next[0]?.id || null)
      })
    }
    setLoading(false)
  }, [isSuperadmin, neighborhoodId])

  useEffect(() => { loadServices() }, [loadServices])

  useEffect(() => {
    if (!selected) return setFeatureDates({ starts: '', ends: '' })
    setFeatureDates({
      starts: toInputDate(selected.featured_starts_at) || toInputDate(new Date()),
      ends: toInputDate(selected.featured_until) || addDays(30),
    })
  }, [selected?.id, selected?.featured_starts_at, selected?.featured_until])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return services.filter(service => {
      const matchesText = !needle || [service.title, service.content, service.category, service.service_key, service.author?.full_name]
        .some(value => String(value || '').toLowerCase().includes(needle))
      const matchesFilter = filter === 'all'
        || (filter === 'featured' ? featureState(service) === 'active' : service.status === filter)
      return matchesText && matchesFilter
    })
  }, [filter, query, services])

  const counts = useMemo(() => ({
    pending: services.filter(service => service.status === 'pending').length,
    active: services.filter(service => service.status === 'active').length,
    featured: services.filter(service => featureState(service) === 'active').length,
  }), [services])

  const updateService = async (patch, successMessage, action) => {
    if (!selected) return
    setChanging(action)
    setError('')
    const { error: updateError } = await supabase.from('posts').update(patch).eq('id', selected.id).eq('type', 'service')
    setChanging('')
    if (updateError) return setError(`No fue posible actualizar el servicio: ${updateError.message}`)
    setNotice(successMessage)
    window.setTimeout(() => setNotice(''), 2600)
    await loadServices(selected.id)
  }

  const moderate = action => {
    if (action === 'reject' && !window.confirm('¿Rechazar este servicio? No aparecerá en la aplicación.')) return
    const actions = {
      approve: [{ status: 'active' }, 'Servicio aprobado y publicado'],
      reject: [{ status: 'rejected', is_featured: false, featured_starts_at: null, featured_until: null, featured_by: null }, 'Servicio rechazado'],
      pause: [{ status: 'closed' }, 'Servicio pausado'],
      reactivate: [{ status: 'active' }, 'Servicio reactivado'],
    }
    const [patch, message] = actions[action]
    updateService(patch, message, action)
  }

  const saveFeature = () => {
    const starts = new Date(featureDates.starts)
    const ends = new Date(featureDates.ends)
    if (!featureDates.starts || !featureDates.ends || Number.isNaN(starts.getTime()) || Number.isNaN(ends.getTime())) {
      return setError('Indica el inicio y el término del patrocinio.')
    }
    if (ends <= starts) return setError('El término del patrocinio debe ser posterior al inicio.')
    updateService({
      status: 'active',
      is_featured: true,
      featured_starts_at: starts.toISOString(),
      featured_until: ends.toISOString(),
      featured_by: profile.id,
    }, 'Patrocinio programado', 'feature')
  }

  const removeFeature = () => updateService({
    is_featured: false,
    featured_starts_at: null,
    featured_until: null,
    featured_by: null,
  }, 'Patrocinio retirado', 'unfeature')

  const selectedCategory = categoryInfo(selected)
  const image = serviceImage(selected)
  const selectedFeatureState = featureState(selected)

  if (creating || editingService) return <ServiceEditor service={editingService} profile={profile} onBack={() => { setCreating(false); setEditingService(null) }} onSaved={async savedId => { setCreating(false); setEditingService(null); await loadServices(savedId) }} />

  return (
    <div className="service-manager">
      <section className="page-heading commerce-page-heading">
        <div><p className="eyebrow">Directorio de oficios</p><h1>Servicios</h1><p>Modera las publicaciones y administra la visibilidad patrocinada.</p></div>
        <div className="service-heading-actions"><div className="service-metrics"><span><strong>{counts.pending}</strong>Pendientes</span><span><strong>{counts.active}</strong>Publicados</span><span><strong>{counts.featured}</strong>Patrocinados</span></div><button className="button button-primary" type="button" onClick={() => setCreating(true)}>＋ Nuevo servicio</button></div>
      </section>

      {error && <div className="admin-alert" role="alert"><span>⚠️</span><p>{error}</p><button type="button" onClick={() => setError('')}>×</button></div>}
      {notice && <div className="admin-toast">✓ {notice}</div>}

      <section className="service-workspace">
        <aside className="service-list-panel">
          <div className="service-tools">
            <label className="admin-search"><span>⌕</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar servicio o prestador…" /></label>
            <div className="filter-row">{FILTERS.map(([value, label]) => <button key={value} type="button" className={filter === value ? 'is-active' : ''} onClick={() => setFilter(value)}>{label}</button>)}</div>
          </div>
          {loading && <div className="panel-loading">Cargando servicios…</div>}
          {!loading && filtered.length === 0 && <div className="panel-empty"><span>🧰</span><strong>Sin servicios en este filtro</strong><small>{services.length ? 'Prueba con otro estado.' : 'Las publicaciones aparecerán aquí.'}</small></div>}
          {!loading && <div className="service-list">{filtered.map(service => {
            const [emoji, label] = categoryInfo(service)
            const featured = featureState(service)
            return <button key={service.id} type="button" className={`service-list-item ${selectedId === service.id ? 'is-selected' : ''}`} onClick={() => setSelectedId(service.id)}>
              <span className="service-list-image">{serviceImage(service) ? <img src={serviceImage(service)} alt="" /> : emoji}</span>
              <span className="service-list-copy"><span><strong>{service.title || 'Servicio sin título'}</strong>{featured === 'active' && <em>★ Patrocinado</em>}</span><small>{label} · {service.author?.full_name || 'Vecino sin nombre'}</small><span><StatusBadge service={service} /><time>{dateLabel(service.created_at)}</time></span></span>
            </button>
          })}</div>}
        </aside>

        <div className="service-detail-panel">
          {!selected && <div className="panel-empty service-detail-empty"><span>👈</span><strong>Selecciona un servicio</strong><small>Revisa sus antecedentes antes de publicarlo.</small></div>}
          {selected && <>
            <header className="service-detail-header">
              <div><span className="service-category">{selectedCategory[0]} {selectedCategory[1]}</span><h2>{selected.title || 'Servicio sin título'}</h2><div><StatusBadge service={selected} /><small>Publicado {dateLabel(selected.created_at)}</small></div></div>
              <div className="service-actions">
                <button className="service-action neutral" type="button" disabled={!!changing} onClick={() => setEditingService(selected)}>✎ Editar servicio</button>
                {selected.status !== 'active' && <button className="service-action approve" type="button" disabled={!!changing} onClick={() => moderate(selected.status === 'closed' ? 'reactivate' : 'approve')}>{changing ? 'Guardando…' : selected.status === 'closed' ? '✓ Reactivar' : '✓ Aprobar'}</button>}
                {selected.status === 'active' && <button className="service-action neutral" type="button" disabled={!!changing} onClick={() => moderate('pause')}>Pausar</button>}
                {selected.status !== 'rejected' && <button className="service-action reject" type="button" disabled={!!changing} onClick={() => moderate('reject')}>Rechazar</button>}
              </div>
            </header>

            <div className="service-detail-grid">
              <section className="service-info-card service-main-card">
                <div className="service-provider">
                  {selected.author?.avatar_url ? <img src={selected.author.avatar_url} alt="" /> : <span>{(selected.author?.full_name || 'V').slice(0, 1)}</span>}
                  <div><small>Prestador</small><strong>{selected.author?.full_name || 'Vecino sin nombre'}</strong><em>{selected.author?.verified || selected.author?.verification_status === 'verified' ? '✓ Perfil verificado' : 'Perfil sin verificar'}</em></div>
                </div>
                {image && <img className="service-cover" src={image} alt={selected.title || ''} />}
                <h3>Descripción</h3><p>{selected.content || selected.description || 'El prestador no agregó una descripción.'}</p>
                <dl><div><dt>Rubro</dt><dd>{selectedCategory[0]} {selectedCategory[1]}</dd></div><div><dt>Precio publicado</dt><dd>{selected.price != null ? `$${Number(selected.price).toLocaleString('es-CL')}` : 'A convenir'}</dd></div><div><dt>Estado</dt><dd>{STATUS[selected.status]?.[0] || selected.status}</dd></div></dl>
              </section>

              <section className={`service-info-card service-feature-card is-${selectedFeatureState}`}>
                <div className="service-feature-heading"><span>✦</span><div><h3>Visibilidad patrocinada</h3><p>Esta posición es publicidad pagada, no una recomendación de calidad.</p></div></div>
                {selectedFeatureState === 'active' && <div className="service-feature-state"><strong>Patrocinio activo</strong><small>Visible hasta {dateLabel(selected.featured_until)}</small></div>}
                {selectedFeatureState === 'scheduled' && <div className="service-feature-state"><strong>Patrocinio programado</strong><small>Comienza {dateLabel(selected.featured_starts_at)}</small></div>}
                {selectedFeatureState === 'expired' && <div className="service-feature-state expired"><strong>Patrocinio vencido</strong><small>Terminó {dateLabel(selected.featured_until)}</small></div>}
                <label>Inicio<input type="datetime-local" value={featureDates.starts} onChange={event => setFeatureDates(current => ({ ...current, starts: event.target.value }))} /></label>
                <label>Término<input type="datetime-local" value={featureDates.ends} onChange={event => setFeatureDates(current => ({ ...current, ends: event.target.value }))} /></label>
                <button className="service-feature-save" type="button" disabled={!!changing} onClick={saveFeature}>{changing === 'feature' ? 'Guardando…' : selected.is_featured ? 'Actualizar patrocinio' : 'Activar patrocinio'}</button>
                {selected.is_featured && <button className="service-feature-remove" type="button" disabled={!!changing} onClick={removeFeature}>Quitar patrocinio</button>}
              </section>
            </div>
          </>}
        </div>
      </section>
    </div>
  )
}
