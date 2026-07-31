import { useCallback, useEffect, useMemo, useState } from 'react'
import L from 'leaflet'
import { MapContainer, Marker, TileLayer } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { supabase } from '../lib/supabase.js'

const FILTERS = [
  ['all', 'Todos'],
  ['pendiente', 'Pendientes'],
  ['active', 'Aprobados'],
  ['official', 'Oficiales'],
  ['rechazado', 'Rechazados'],
  ['resuelto', 'Cerrados'],
]

const STATUS = {
  pendiente: { label: 'Pendiente', className: 'pending' },
  active: { label: 'Aprobado', className: 'approved' },
  rechazado: { label: 'Rechazado', className: 'rejected' },
  resuelto: { label: 'Cerrado', className: 'resolved' },
}

const ACTIONS = {
  approve: 'Aprobó la alerta',
  reject: 'Rechazó la alerta',
  mark_official: 'La marcó como alerta oficial',
  unmark_official: 'Quitó la marca oficial',
  resolve: 'Cerró la alerta como resuelta',
}

const CATEGORY = {
  seguridad: ['🚨', 'Seguridad'],
  salud: ['🏥', 'Salud'],
  infraestructura: ['🔧', 'Infraestructura'],
  mascotas: ['🐕', 'Mascotas'],
  convivencia: ['🤝', 'Convivencia'],
}

const dateLabel = value => value
  ? new Date(value).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' })
  : 'Sin fecha'

const incidentCoordinates = incident => {
  const lat = Number(incident?.lat ?? incident?.latitude)
  const lng = Number(incident?.lng ?? incident?.longitude)
  return Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : null
}

const markerIcon = L.divIcon({
  className: 'admin-map-marker',
  html: '<span></span>',
  iconSize: [34, 34],
  iconAnchor: [17, 34],
})

function IncidentMap({ coordinates }) {
  return (
    <MapContainer className="incident-preview-map" center={coordinates} zoom={16} dragging={false} doubleClickZoom={false} scrollWheelZoom={false} zoomControl={false} attributionControl={false}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Marker position={coordinates} icon={markerIcon} />
    </MapContainer>
  )
}

function StatusBadge({ incident }) {
  const state = STATUS[incident.status] || STATUS.pendiente
  return <span className={`incident-status ${state.className}`}>{incident.is_official ? '● Oficial' : state.label}</span>
}

export default function IncidentManager({ profile }) {
  const isSuperadmin = profile?.is_superadmin === true
  const neighborhoodId = profile?.neighborhood_id
  const [incidents, setIncidents] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [actions, setActions] = useState([])
  const [adminNames, setAdminNames] = useState({})
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('pendiente')
  const [loading, setLoading] = useState(true)
  const [actionsLoading, setActionsLoading] = useState(false)
  const [changing, setChanging] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const selected = incidents.find(item => item.id === selectedId) || null

  const loadIncidents = useCallback(async (preferredId = null) => {
    setLoading(true)
    setError('')
    if (!isSuperadmin && !neighborhoodId) {
      setIncidents([])
      setSelectedId(null)
      setError('Tu cuenta administrativa no tiene un barrio asignado.')
      setLoading(false)
      return
    }
    let request = supabase.from('incident_reports').select('*').order('created_at', { ascending: false }).limit(300)
    if (!isSuperadmin) request = request.eq('neighborhood_id', neighborhoodId)
    const { data, error: loadError } = await request
    if (loadError) {
      setError(`No fue posible cargar las alertas: ${loadError.message}`)
      setIncidents([])
    } else {
      const next = data || []
      setIncidents(next)
      setSelectedId(current => {
        const target = preferredId || current
        return next.some(item => item.id === target) ? target : (next[0]?.id || null)
      })
    }
    setLoading(false)
  }, [isSuperadmin, neighborhoodId])

  useEffect(() => { loadIncidents() }, [loadIncidents])

  useEffect(() => {
    if (!selectedId) {
      setActions([])
      return
    }
    let active = true
    setActionsLoading(true)
    supabase.from('incident_admin_actions').select('*').eq('incident_id', selectedId).order('created_at', { ascending: false }).then(async ({ data, error: actionError }) => {
      if (!active) return
      if (actionError) {
        setActions([])
        setActionsLoading(false)
        return
      }
      const nextActions = data || []
      setActions(nextActions)
      const ids = [...new Set(nextActions.map(item => item.admin_profile_id).filter(Boolean))]
      if (ids.length) {
        const { data: admins } = await supabase.from('profiles').select('id, full_name').in('id', ids)
        if (active) setAdminNames(Object.fromEntries((admins || []).map(admin => [admin.id, admin.full_name || 'Administrador'])))
      }
      if (active) setActionsLoading(false)
    })
    return () => { active = false }
  }, [selectedId])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return incidents.filter(incident => {
      const matchesFilter = filter === 'all'
        || (filter === 'official' ? incident.is_official && incident.status === 'active' : incident.status === filter)
      const matchesText = !needle || [incident.title, incident.description, incident.location_text, incident.category]
        .some(value => String(value || '').toLowerCase().includes(needle))
      return matchesFilter && matchesText
    })
  }, [filter, incidents, query])

  const counts = useMemo(() => ({
    total: incidents.length,
    pending: incidents.filter(item => item.status === 'pendiente').length,
    official: incidents.filter(item => item.status === 'active' && item.is_official).length,
    active: incidents.filter(item => item.status === 'active').length,
  }), [incidents])

  const moderate = async action => {
    if (!selected) return
    if (action === 'reject' && !window.confirm('¿Rechazar esta alerta? Dejará de ser visible para los vecinos.')) return
    if (action === 'resolve' && !window.confirm('¿Cerrar esta alerta como resuelta?')) return
    setChanging(action)
    setError('')
    const { error: actionError } = await supabase.rpc('admin_moderate_incident', {
      p_incident_id: selected.id,
      p_action: action,
    })
    setChanging('')
    if (actionError) {
      setError(`No fue posible realizar la acción: ${actionError.message}`)
      return
    }
    setNotice(ACTIONS[action])
    window.setTimeout(() => setNotice(''), 2600)
    await loadIncidents(selected.id)
    const { data } = await supabase.from('incident_admin_actions').select('*').eq('incident_id', selected.id).order('created_at', { ascending: false })
    setActions(data || [])
  }

  const category = selected ? (CATEGORY[selected.category] || ['📌', selected.category || 'Otro']) : null
  const coordinates = incidentCoordinates(selected)
  const images = selected ? [selected.photo_url, ...(Array.isArray(selected.images) ? selected.images : [])].filter(Boolean) : []

  return (
    <div className="incident-manager">
      <section className="page-heading commerce-page-heading">
        <div><p className="eyebrow">Moderación comunitaria</p><h1>Incidentes y alertas</h1><p>Revisa los reportes antes de hacerlos visibles y registra cada decisión.</p></div>
        <div className="incident-metrics"><span><strong>{counts.pending}</strong>Pendientes</span><span><strong>{counts.active}</strong>Publicadas</span><span><strong>{counts.official}</strong>Oficiales</span></div>
      </section>

      {error && <div className="admin-alert" role="alert"><span>⚠️</span><p>{error}</p><button type="button" onClick={() => setError('')}>×</button></div>}
      {notice && <div className="admin-toast">✓ {notice}</div>}

      <section className="incident-workspace">
        <aside className="incident-list-panel">
          <div className="incident-tools">
            <label className="admin-search"><span>⌕</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar alerta o ubicación…" /></label>
            <div className="filter-row">{FILTERS.map(([value, label]) => <button key={value} type="button" className={filter === value ? 'is-active' : ''} onClick={() => setFilter(value)}>{label}</button>)}</div>
          </div>
          {loading && <div className="panel-loading">Cargando alertas…</div>}
          {!loading && filtered.length === 0 && <div className="panel-empty"><span>🚨</span><strong>Sin alertas en este filtro</strong><small>{counts.total ? 'Prueba con otro estado.' : 'Los reportes de vecinos aparecerán aquí.'}</small></div>}
          {!loading && <div className="incident-list">{filtered.map(incident => {
            const [emoji, label] = CATEGORY[incident.category] || ['📌', incident.category || 'Otro']
            return <button key={incident.id} type="button" className={`incident-list-item ${selectedId === incident.id ? 'is-selected' : ''}`} onClick={() => setSelectedId(incident.id)}>
              <span className="incident-list-icon">{emoji}</span>
              <span className="incident-list-copy"><span><strong>{incident.title || label}</strong><StatusBadge incident={incident} /></span><small>{incident.description || 'Sin descripción'}</small><em>📍 {incident.location_text || 'Ubicación no indicada'} · {dateLabel(incident.created_at)}</em></span>
            </button>
          })}</div>}
        </aside>

        <div className="incident-detail-panel">
          {!selected && <div className="panel-empty incident-detail-empty"><span>👈</span><strong>Selecciona una alerta</strong><small>Podrás revisar todos sus antecedentes antes de decidir.</small></div>}
          {selected && <>
            <header className="incident-detail-header">
              <div><span className="incident-category">{category[0]} {category[1]}</span><h2>{selected.title || category[1]}</h2><div><StatusBadge incident={selected} /><small>Reportada {dateLabel(selected.created_at)}</small></div></div>
              <div className="incident-actions">
                {selected.status !== 'active' && <button className="incident-action approve" type="button" disabled={!!changing} onClick={() => moderate('approve')}>{changing === 'approve' ? 'Guardando…' : '✓ Aprobar'}</button>}
                {selected.status === 'active' && !selected.is_official && <button className="incident-action official" type="button" disabled={!!changing} onClick={() => moderate('mark_official')}>{changing === 'mark_official' ? 'Guardando…' : '★ Hacer oficial'}</button>}
                {selected.is_official && <button className="incident-action neutral" type="button" disabled={!!changing} onClick={() => moderate('unmark_official')}>Quitar oficial</button>}
                {!['rechazado', 'resuelto'].includes(selected.status) && <button className="incident-action reject" type="button" disabled={!!changing} onClick={() => moderate('reject')}>Rechazar</button>}
                {selected.status !== 'resuelto' && <button className="incident-action resolve" type="button" disabled={!!changing} onClick={() => moderate('resolve')}>Cerrar resuelta</button>}
              </div>
            </header>

            {selected.is_official && selected.status === 'active' && <div className="official-explainer">★ Esta alerta oficial aparece en el Home de los vecinos.</div>}

            <div className="incident-detail-grid">
              <section className="incident-info-card incident-description"><h3>Contenido reportado</h3><p>{selected.description || 'Sin descripción.'}</p>{images.length > 0 && <div className="incident-images">{images.map((url, index) => <a key={`${url}-${index}`} href={url} target="_blank" rel="noreferrer"><img src={url} alt={`Evidencia ${index + 1}`} /></a>)}</div>}</section>
              <section className="incident-info-card"><h3>Antecedentes</h3><dl><div><dt>Autor</dt><dd>{selected.is_anonymous ? 'Reporte anónimo' : 'Vecino identificado'}</dd></div><div><dt>Confirmaciones</dt><dd>{selected.confirms_count || 0}</dd></div><div><dt>Reportes recibidos</dt><dd>{selected.flags_count || 0}</dd></div><div><dt>Gravedad</dt><dd>{selected.severity || 'Sin clasificar'}</dd></div>{selected.expires_at && <div><dt>Vence</dt><dd>{dateLabel(selected.expires_at)}</dd></div>}</dl></section>
              <section className="incident-info-card incident-location-card"><h3>Ubicación</h3><p>📍 {selected.location_text || 'Dirección no indicada'}</p>{coordinates ? <><IncidentMap coordinates={coordinates} /><small>Lat. {coordinates[0].toFixed(6)} · Lng. {coordinates[1].toFixed(6)}</small></> : <div className="incident-no-map">No se adjuntaron coordenadas.</div>}</section>
              <section className="incident-info-card incident-audit-card"><h3>Historial administrativo</h3>{actionsLoading && <p className="incident-muted">Cargando historial…</p>}{!actionsLoading && actions.length === 0 && <p className="incident-muted">Aún no hay acciones registradas.</p>}{!actionsLoading && actions.length > 0 && <ol>{actions.map(action => <li key={action.id}><span>✓</span><div><strong>{ACTIONS[action.action] || action.action}</strong><p>{adminNames[action.admin_profile_id] || 'Administrador'} · {dateLabel(action.created_at)}</p></div></li>)}</ol>}</section>
            </div>
          </>}
        </div>
      </section>
    </div>
  )
}
