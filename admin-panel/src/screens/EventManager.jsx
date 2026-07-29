import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import EventEditor from './EventEditor.jsx'
import EventCategoryManager from './EventCategoryManager.jsx'

const CATEGORY_LABELS = {
  asambleas: '🏛️ Asamblea', ferias: '🥬 Feria', talleres: '🎨 Taller', deportes: '⚽ Deporte', otros: '📌 Otro',
}

const dateLabel = value => value ? new Date(value).toLocaleString('es-CL', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Sin fecha'
const eventImage = event => event.images?.[0] || null

export default function EventManager({ profile }) {
  const [events, setEvents] = useState([])
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [view, setView] = useState({ type: 'list', event: null })
  const [changingId, setChangingId] = useState(null)
  const [categoryLabels, setCategoryLabels] = useState(CATEGORY_LABELS)

  const showNotice = message => {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 2600)
  }

  const loadEvents = useCallback(async () => {
    setLoading(true)
    setError('')
    let request = supabase.from('posts').select('*').eq('type', 'event').order('starts_at', { ascending: true }).limit(300)
    if (profile?.neighborhood_id) request = request.eq('neighborhood_id', profile.neighborhood_id)
    const { data, error: loadError } = await request
    if (loadError) setError('No fue posible cargar los eventos.')
    setEvents(data || [])
    setLoading(false)
  }, [profile?.neighborhood_id])

  useEffect(() => { loadEvents() }, [loadEvents])

  useEffect(() => {
    supabase.from('event_categories').select('key, name, icon').then(({ data }) => {
      if (!data?.length) return
      setCategoryLabels(current => ({ ...current, ...Object.fromEntries(data.map(category => [category.key, `${category.icon} ${category.name}`])) }))
    })
  }, [])

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return events.filter(event => {
      const matchesText = !normalized || [event.title, event.category, event.location_text].some(value => String(value || '').toLowerCase().includes(normalized))
      const matchesStatus = filter === 'all' || (filter === 'active' && event.status === 'active') || (filter === 'paused' && event.status === 'closed') || (filter === 'cancelled' && event.status === 'cancelled')
      return matchesText && matchesStatus
    })
  }, [events, filter, query])

  const returnToList = async message => {
    await loadEvents()
    setView({ type: 'list', event: null })
    if (message) showNotice(message)
  }

  const toggleStatus = async event => {
    if (event.status === 'cancelled') return
    const nextStatus = event.status === 'active' ? 'closed' : 'active'
    setChangingId(event.id)
    const { error: updateError } = await supabase.from('posts').update({ status: nextStatus }).eq('id', event.id)
    setChangingId(null)
    if (updateError) return setError(`No fue posible actualizar la visibilidad del evento: ${updateError.message}`)
    setEvents(current => current.map(item => item.id === event.id ? { ...item, status: nextStatus } : item))
    showNotice(nextStatus === 'active' ? 'Evento publicado' : 'Evento pausado')
  }

  const cancelEvent = async event => {
    if (!window.confirm(`¿Cancelar “${event.title}”? Dejará de aparecer en la aplicación y no podrá reactivarse.`)) return
    setChangingId(event.id)
    setError('')
    const { error: updateError } = await supabase.from('posts').update({ status: 'cancelled' }).eq('id', event.id).eq('type', 'event')
    setChangingId(null)
    if (updateError) return setError(`No fue posible cancelar el evento: ${updateError.message}`)
    setEvents(current => current.map(item => item.id === event.id ? { ...item, status: 'cancelled' } : item))
    showNotice('Evento cancelado')
  }

  const deleteEvent = async event => {
    if (!window.confirm(`¿Eliminar definitivamente “${event.title}”? Esta acción no se puede deshacer.`)) return
    setChangingId(event.id)
    setError('')
    const { error: deleteError } = await supabase.from('posts').delete().eq('id', event.id).eq('type', 'event')
    setChangingId(null)
    if (deleteError) return setError(`No fue posible eliminar el evento: ${deleteError.message}`)
    setEvents(current => current.filter(item => item.id !== event.id))
    showNotice('Evento eliminado definitivamente')
  }

  if (view.type === 'edit') return <EventEditor event={view.event} profile={profile} onBack={() => setView({ type: 'list', event: null })} onSaved={() => returnToList(view.event ? 'Evento actualizado' : 'Evento publicado')} />
  if (view.type === 'categories') return <EventCategoryManager onBack={() => setView({ type: 'list', event: null })} />

  return (
    <div className="event-manager event-list-page">
      <section className="page-heading commerce-page-heading">
        <div><p className="eyebrow">Agenda comunitaria</p><h1>Eventos</h1><p>Publica y administra las actividades que verá el barrio.</p></div>
        <div className="event-heading-actions"><button className="button button-secondary" type="button" onClick={() => setView({ type: 'categories', event: null })}>⚙ Categorías</button><button className="button button-primary new-commerce-button" type="button" onClick={() => setView({ type: 'edit', event: null })}>＋ Nuevo evento</button></div>
      </section>
      {error && <div className="admin-alert" role="alert"><span>⚠️</span><p>{error}</p><button type="button" onClick={() => setError('')}>×</button></div>}
      {notice && <div className="admin-toast">✓ {notice}</div>}
      <section className="commerce-directory">
        <header className="directory-toolbar">
          <label className="admin-search directory-search"><span>⌕</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar por nombre, tipo o lugar…" /></label>
          <div className="filter-row directory-filters">{[['all', 'Todos'], ['active', 'Publicados'], ['paused', 'Pausados'], ['cancelled', 'Cancelados']].map(([value, label]) => <button key={value} type="button" className={filter === value ? 'is-active' : ''} onClick={() => setFilter(value)}>{label}</button>)}</div>
          <span className="directory-count">{filtered.length} eventos</span>
        </header>
        {loading && <div className="panel-loading directory-loading">Cargando eventos…</div>}
        {!loading && filtered.length === 0 && <div className="panel-empty directory-empty"><span>📅</span><strong>Sin eventos</strong><small>Crea el primero para publicarlo en El Barrio.</small></div>}
        {!loading && filtered.length > 0 && <div className="commerce-table-wrap"><table className="commerce-table event-table"><thead><tr><th>Evento</th><th>Fecha</th><th>Lugar</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{filtered.map(event => <tr key={event.id}><td><div className="table-commerce"><span>{eventImage(event) ? <img src={eventImage(event)} alt="" /> : '📅'}</span><div><strong>{event.title}</strong><small>{categoryLabels[event.category] || '📌 Actividad'}</small></div></div></td><td><span className="event-date-cell">{dateLabel(event.starts_at)}</span></td><td><span className="table-address">{event.location_text || 'Sin ubicación'}</span></td><td><span className={`table-status ${event.status === 'active' ? 'active' : event.status === 'cancelled' ? 'cancelled' : ''}`}><i />{event.status === 'active' ? 'Publicado' : event.status === 'cancelled' ? 'Cancelado' : 'Pausado'}</span></td><td><div className="table-actions event-table-actions">{event.status !== 'cancelled' && <><button type="button" onClick={() => setView({ type: 'edit', event })}>Editar</button><button className={event.status === 'active' ? 'event-pause-action' : 'table-products-action'} type="button" disabled={changingId === event.id} onClick={() => toggleStatus(event)}>{changingId === event.id ? 'Guardando…' : event.status === 'active' ? 'Pausar' : 'Reactivar'}</button><button className="event-cancel-action" type="button" disabled={changingId === event.id} onClick={() => cancelEvent(event)}>Cancelar</button></>}<button className="event-delete-action" type="button" disabled={changingId === event.id} onClick={() => deleteEvent(event)}>Eliminar</button></div></td></tr>)}</tbody></table></div>}
      </section>
    </div>
  )
}
