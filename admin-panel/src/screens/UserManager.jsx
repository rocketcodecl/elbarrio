import { useCallback, useEffect, useMemo, useState } from 'react'
import L from 'leaflet'
import { MapContainer, Marker, TileLayer } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { supabase } from '../lib/supabase.js'

const FILTERS = [
  ['all', 'Todos'],
  ['pending', 'Por verificar'],
  ['verified', 'Verificados'],
  ['actors', 'Actores autorizados'],
  ['admins', 'Administradores'],
  ['suspended', 'Suspendidos'],
]

const ACTION_LABELS = {
  verify: 'Verificó al vecino',
  approve_actor: 'Autorizó la publicación de eventos',
  revoke_actor: 'Retiró la autorización de actor',
  assign_admin: 'Asignó rol de administrador',
  remove_admin: 'Retiró el rol de administrador',
  suspend: 'Suspendió la cuenta',
  reactivate: 'Reactivó la cuenta',
}

const ACTIVITY_LABELS = {
  sale: ['🏷️', 'Venta'], gift: ['🎁', 'Regalo'], trade: ['🔄', 'Trueque'],
  comment: ['💬', 'Comentario'], alert: ['🚨', 'Alerta'], opinion: ['⭐', 'Opinión'],
  service: ['🛠️', 'Servicio'], event: ['📅', 'Evento'], post: ['📝', 'Publicación'],
}

const profileMarker = L.divIcon({ className: 'admin-map-marker', html: '<span></span>', iconSize: [34, 34], iconAnchor: [17, 34] })

const isVerified = user => user.verification_status === 'verified' || user.verified === true || Boolean(user.verified_at)
const isSuspended = user => user.account_status === 'suspended'
const dateLabel = value => value
  ? new Date(value).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' })
  : 'Sin registro'

function initials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'V'
}

function UserBadges({ user }) {
  return <div className="user-badges">
    {isSuspended(user) && <span className="user-badge suspended">Suspendido</span>}
    {user.role === 'admin' && <span className="user-badge admin">Administrador</span>}
    {user.can_publish_events && <span className="user-badge actor">Actor autorizado</span>}
    {isVerified(user) ? <span className="user-badge verified">✓ Verificado</span> : <span className="user-badge pending">Por verificar</span>}
  </div>
}

function ProfileMap({ user }) {
  const lat = Number(user.lat)
  const lng = Number(user.lng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return <div className="user-map-empty">Este perfil todavía no registró una ubicación GPS.</div>
  return <MapContainer className="user-profile-map" center={[lat, lng]} zoom={16} dragging={false} doubleClickZoom={false} scrollWheelZoom={false} zoomControl={false} attributionControl={false}>
    <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" subdomains="abcd" maxZoom={20} />
    <Marker position={[lat, lng]} icon={profileMarker} />
  </MapContainer>
}

export default function UserManager({ profile }) {
  const [users, setUsers] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [history, setHistory] = useState([])
  const [adminNames, setAdminNames] = useState({})
  const [activity, setActivity] = useState([])
  const [neighborhood, setNeighborhood] = useState(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [activityLoading, setActivityLoading] = useState(false)
  const [changing, setChanging] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const selected = users.find(user => user.id === selectedId) || null
  const isSelf = selected?.id === profile?.id

  const loadUsers = useCallback(async preferredId => {
    setLoading(true)
    setError('')
    const { data, error: loadError } = await supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(1000)
    if (loadError) {
      setUsers([])
      setError(`No fue posible cargar los usuarios: ${loadError.message}`)
    } else {
      const next = data || []
      setUsers(next)
      setSelectedId(current => {
        const target = preferredId || current
        return next.some(user => user.id === target) ? target : (next[0]?.id || null)
      })
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadUsers() }, [loadUsers])

  const loadHistory = useCallback(async profileId => {
    if (!profileId) return setHistory([])
    setHistoryLoading(true)
    const { data, error: historyError } = await supabase.from('user_admin_actions').select('*').eq('target_profile_id', profileId).order('created_at', { ascending: false })
    if (historyError) {
      setHistory([])
      setHistoryLoading(false)
      return
    }
    const next = data || []
    setHistory(next)
    const ids = [...new Set(next.map(item => item.admin_profile_id).filter(Boolean))]
    if (ids.length) {
      const { data: admins } = await supabase.from('profiles').select('id, full_name').in('id', ids)
      setAdminNames(Object.fromEntries((admins || []).map(admin => [admin.id, admin.full_name || 'Administrador'])))
    }
    setHistoryLoading(false)
  }, [])

  useEffect(() => { loadHistory(selectedId) }, [loadHistory, selectedId])

  useEffect(() => {
    if (!selectedId) {
      setActivity([])
      setNeighborhood(null)
      return
    }
    let active = true
    setActivityLoading(true)
    supabase.rpc('admin_get_user_activity', { p_target_profile_id: selectedId }).then(({ data }) => {
      if (active) {
        setActivity(data || [])
        setActivityLoading(false)
      }
    })
    if (selected?.neighborhood_id) {
      supabase.from('neighborhoods').select('id, name, uv_code').eq('id', selected.neighborhood_id).maybeSingle().then(({ data }) => {
        if (active) setNeighborhood(data || null)
      })
    } else {
      setNeighborhood(null)
    }
    return () => { active = false }
  }, [selected?.neighborhood_id, selectedId])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return users.filter(user => {
      const matchesFilter = filter === 'all'
        || (filter === 'pending' && !isVerified(user))
        || (filter === 'verified' && isVerified(user))
        || (filter === 'actors' && user.can_publish_events === true)
        || (filter === 'admins' && user.role === 'admin')
        || (filter === 'suspended' && isSuspended(user))
      const matchesText = !needle || [user.full_name, user.email, user.rut, user.address, user.comuna, user.barrio]
        .some(value => String(value || '').toLowerCase().includes(needle))
      return matchesFilter && matchesText
    })
  }, [filter, query, users])

  const stats = useMemo(() => ({
    total: users.length,
    pending: users.filter(user => !isVerified(user)).length,
    actors: users.filter(user => user.can_publish_events).length,
    suspended: users.filter(isSuspended).length,
  }), [users])

  const manage = async action => {
    if (!selected) return
    const destructive = ['remove_admin', 'revoke_actor', 'suspend'].includes(action)
    if (destructive && !window.confirm(`¿Confirmas esta acción para ${selected.full_name || 'este usuario'}?`)) return
    setChanging(action)
    setError('')
    const { error: manageError } = await supabase.rpc('admin_manage_profile', {
      p_target_profile_id: selected.id,
      p_action: action,
    })
    setChanging('')
    if (manageError) {
      setError(`No fue posible actualizar al usuario: ${manageError.message}`)
      return
    }
    setNotice(ACTION_LABELS[action])
    window.setTimeout(() => setNotice(''), 2600)
    await loadUsers(selected.id)
    await loadHistory(selected.id)
  }

  return <div className="user-manager">
    <section className="page-heading commerce-page-heading">
      <div><p className="eyebrow">Comunidad y permisos</p><h1>Usuarios</h1><p>Verifica vecinos, autoriza actores y protege el acceso a El Barrio.</p></div>
      <div className="user-metrics"><span><strong>{stats.total}</strong>Registrados</span><span><strong>{stats.pending}</strong>Por verificar</span><span><strong>{stats.actors}</strong>Actores</span><span><strong>{stats.suspended}</strong>Suspendidos</span></div>
    </section>

    {error && <div className="admin-alert" role="alert"><span>⚠️</span><p>{error}</p><button type="button" onClick={() => setError('')}>×</button></div>}
    {notice && <div className="admin-toast">✓ {notice}</div>}

    <section className="user-workspace">
      <aside className="user-list-panel">
        <div className="user-tools"><label className="admin-search"><span>⌕</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Nombre, correo, RUT o barrio…" /></label><div className="filter-row">{FILTERS.map(([value, label]) => <button key={value} type="button" className={filter === value ? 'is-active' : ''} onClick={() => setFilter(value)}>{label}</button>)}</div></div>
        {loading && <div className="panel-loading">Cargando usuarios…</div>}
        {!loading && filtered.length === 0 && <div className="panel-empty"><span>👥</span><strong>Sin usuarios en este filtro</strong><small>Prueba otra búsqueda o estado.</small></div>}
        {!loading && <div className="user-list">{filtered.map(user => <button key={user.id} type="button" className={`user-list-item ${selectedId === user.id ? 'is-selected' : ''}`} onClick={() => setSelectedId(user.id)}>
          {user.avatar_url ? <img src={user.avatar_url} alt="" /> : <span className="user-avatar-fallback">{initials(user.full_name)}</span>}
          <span className="user-list-copy"><strong>{user.full_name || 'Vecino sin nombre'}</strong><small>{user.email || user.rut || 'Sin datos de contacto'}</small><UserBadges user={user} /></span>
        </button>)}</div>}
      </aside>

      <div className="user-detail-panel">
        {!selected && <div className="panel-empty user-detail-empty"><span>👈</span><strong>Selecciona un usuario</strong><small>Revisa sus antecedentes antes de cambiar permisos.</small></div>}
        {selected && <>
          <header className="user-detail-header">
            <div className="user-identity">{selected.avatar_url ? <img src={selected.avatar_url} alt="" /> : <span>{initials(selected.full_name)}</span>}<div><p>{isSelf ? 'Tu cuenta administrativa' : 'Perfil registrado'}</p><h2>{selected.full_name || 'Vecino sin nombre'}</h2><UserBadges user={selected} /></div></div>
            <small>Registro: {dateLabel(selected.created_at)}</small>
          </header>

          <div className="user-detail-grid">
            <section className="user-info-card"><h3>Identidad y verificación</h3><dl><div><dt>RUT</dt><dd>{selected.rut || 'No informado'}</dd></div><div><dt>Correo</dt><dd>{selected.email || 'No informado'}</dd></div><div><dt>Dirección</dt><dd>{selected.address || 'No informada'}</dd></div><div><dt>Comuna / barrio</dt><dd>{[selected.barrio, selected.comuna].filter(Boolean).join(', ') || 'No informado'}</dd></div><div><dt>Estado de verificación</dt><dd>{isVerified(selected) ? `Verificado · ${dateLabel(selected.verified_at)}` : selected.verification_status || 'Pendiente'}</dd></div><div><dt>Tipo de perfil</dt><dd>{selected.user_type || 'Vecino'}</dd></div></dl>{!isVerified(selected) && <button className="user-primary-action" type="button" disabled={!!changing} onClick={() => manage('verify')}>{changing === 'verify' ? 'Guardando…' : '✓ Aprobar verificación'}</button>}</section>

            <section className="user-info-card user-location-card"><h3>Ubicación registrada</h3><div className="user-location-status"><span>{isVerified(selected) && selected.neighborhood_id ? '✓' : '!'}</span><div><strong>{isVerified(selected) && selected.neighborhood_id ? 'GPS verificado en el barrio' : 'Ubicación todavía no verificada'}</strong><small>{neighborhood ? `${neighborhood.name}${neighborhood.uv_code ? ` · Unidad Vecinal ${neighborhood.uv_code}` : ''}` : selected.address || 'Sin dirección registrada'}</small></div></div><ProfileMap user={selected} />{Number.isFinite(Number(selected.lat)) && Number.isFinite(Number(selected.lng)) && <p className="user-map-coordinates">GPS: {Number(selected.lat).toFixed(6)}, {Number(selected.lng).toFixed(6)}</p>}</section>

            <section className="user-info-card user-permissions-card"><h3>Permisos</h3><div className="permission-row"><span>📅</span><div><strong>Publicación de eventos</strong><small>Para juntas de vecinos, municipalidades y actores autorizados.</small></div>{selected.can_publish_events ? <button type="button" disabled={!!changing} onClick={() => manage('revoke_actor')}>Retirar</button> : <button className="positive" type="button" disabled={!!changing || !isVerified(selected) || isSuspended(selected)} onClick={() => manage('approve_actor')}>Autorizar</button>}</div><div className="permission-row"><span>🛡️</span><div><strong>Administración</strong><small>Entrega acceso completo al panel administrativo.</small></div>{selected.role === 'admin' ? <button type="button" disabled={!!changing || isSelf} onClick={() => manage('remove_admin')}>{isSelf ? 'Tu cuenta' : 'Retirar'}</button> : <button className="positive" type="button" disabled={!!changing || isSuspended(selected)} onClick={() => manage('assign_admin')}>Hacer admin</button>}</div></section>

            <section className="user-info-card user-account-card"><h3>Estado de la cuenta</h3>{isSuspended(selected) ? <div className="account-state suspended"><strong>Cuenta suspendida</strong><p>El usuario no puede utilizar la aplicación.</p>{selected.suspended_at && <small>Desde {dateLabel(selected.suspended_at)}</small>}<button type="button" disabled={!!changing} onClick={() => manage('reactivate')}>Reactivar usuario</button></div> : <div className="account-state active"><strong>Cuenta activa</strong><p>El usuario puede ingresar y usar las funciones habilitadas.</p><button type="button" disabled={!!changing || isSelf} onClick={() => manage('suspend')}>{isSelf ? 'No puedes suspenderte' : 'Suspender usuario'}</button></div>}</section>

            <section className="user-info-card user-history-card"><h3>Historial administrativo</h3>{historyLoading && <p className="user-muted">Cargando historial…</p>}{!historyLoading && history.length === 0 && <p className="user-muted">Aún no hay acciones administrativas.</p>}{!historyLoading && history.length > 0 && <ol>{history.map(item => <li key={item.id}><span>✓</span><div><strong>{ACTION_LABELS[item.action] || item.action}</strong><p>{adminNames[item.admin_profile_id] || 'Administrador'} · {dateLabel(item.created_at)}</p></div></li>)}</ol>}</section>

            <section className="user-info-card user-activity-card"><div className="user-card-heading"><h3>Actividad en El Barrio</h3><span>{activity.length} acciones</span></div>{activityLoading && <p className="user-muted">Cargando actividad…</p>}{!activityLoading && activity.length === 0 && <p className="user-muted">Este usuario aún no registra publicaciones, comentarios, alertas u opiniones.</p>}{!activityLoading && activity.length > 0 && <ol>{activity.map((item, index) => { const config = ACTIVITY_LABELS[item.activity_type] || ACTIVITY_LABELS.post; return <li key={`${item.reference_id}-${item.activity_type}-${index}`}><span>{config[0]}</span><div><strong>{config[1]} · {item.title}</strong>{item.detail && <p>{item.detail}</p>}<small>{dateLabel(item.created_at)}</small></div></li> })}</ol>}</section>
          </div>
        </>}
      </div>
    </section>
  </div>
}
