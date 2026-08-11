import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import LocationPicker from '../components/LocationPicker.jsx'
import { prepareImageUpload } from '../../../shared/imageUpload.js'
import { normalizeHttpUrl } from '../../../shared/externalUrl.js'
import usePersistentDraft from '../hooks/usePersistentDraft.js'

const DEFAULT_EVENT_TYPES = [
  ['asambleas', '🏛️', 'Asamblea'],
  ['ferias', '🥬', 'Feria'],
  ['talleres', '🎨', 'Taller'],
  ['deportes', '⚽', 'Deporte'],
  ['otros', '📌', 'Otro'],
]

const localDateTime = value => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = number => String(number).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const initialState = event => ({
  title: event?.title || '',
  category: event?.category || 'otros',
  content: event?.content || '',
  starts_at: localDateTime(event?.starts_at),
  ends_at: localDateTime(event?.ends_at),
  event_recurrence: event?.event_recurrence || 'none',
  recurrence_until: localDateTime(event?.recurrence_until),
  location_text: event?.location_text || '',
  lat: event?.lat ?? '',
  lng: event?.lng ?? '',
  image: event?.images?.[0] || '',
  event_entry_type: event?.event_entry_type || 'free',
  event_price: event?.event_price ?? '',
  ticket_prices: Array.isArray(event?.event_ticket_prices) && event.event_ticket_prices.length
    ? event.event_ticket_prices.map(item => ({ label: item?.label || '', price: item?.price ?? '' }))
    : event?.event_entry_type === 'paid' && event?.event_price != null
      ? [{ label: 'Entrada general', price: event.event_price }]
      : [{ label: 'Entrada general', price: '' }],
  event_capacity: event?.event_capacity ?? '',
  event_pet_friendly: !!event?.event_pet_friendly,
  event_accessible: !!event?.event_accessible,
  event_family_friendly: !!event?.event_family_friendly,
  event_requires_registration: !!event?.event_requires_registration,
  event_registration_url: event?.event_registration_url || '',
  event_external_url: event?.event_external_url || '',
  event_external_label: event?.event_external_label || 'Más información',
  event_show_attendees: event?.event_show_attendees !== false,
  show_in_activity: event?.show_in_activity === true,
  show_on_home: event?.show_on_home === true,
  status: event?.status || 'active',
})

export default function EventEditor({ event, profile, onBack, onSaved }) {
  const draftKey = `event:${profile?.id || 'admin'}:${event?.id || 'new'}`
  const draftVersion = event?.updated_at || 'new-v1'
  const [draft, setDraft, clearFormDraft] = usePersistentDraft(`${draftKey}:form`, initialState(event), draftVersion)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [categories, setCategories] = useState(DEFAULT_EVENT_TYPES.map(([key, icon, name]) => ({ key, icon, name })))
  const [neighborhoods, setNeighborhoods] = useState([])
  const [targetNeighborhoodId, setTargetNeighborhoodId, clearNeighborhoodDraft] = usePersistentDraft(
    `${draftKey}:neighborhood`,
    event?.neighborhood_id || (profile?.is_superadmin ? '' : profile?.neighborhood_id || ''),
    draftVersion,
  )

  const clearEventDraft = () => {
    clearFormDraft()
    clearNeighborhoodDraft()
  }

  const discardAndClose = () => {
    clearEventDraft()
    onBack()
  }

  const set = (field, value) => setDraft(current => ({ ...current, [field]: value }))
  const setTicket = (index, field, value) => setDraft(current => ({ ...current, ticket_prices: current.ticket_prices.map((ticket, ticketIndex) => ticketIndex === index ? { ...ticket, [field]: value } : ticket) }))
  const addTicket = () => setDraft(current => ({ ...current, ticket_prices: [...current.ticket_prices, { label: '', price: '' }] }))
  const removeTicket = index => setDraft(current => ({ ...current, ticket_prices: current.ticket_prices.length === 1 ? current.ticket_prices : current.ticket_prices.filter((_, ticketIndex) => ticketIndex !== index) }))

  useEffect(() => {
    supabase.from('event_categories').select('key, name, icon').eq('is_active', true).order('sort_order').then(({ data }) => {
      if (data?.length) setCategories(data)
    })
  }, [])

  useEffect(() => {
    if (!profile?.is_superadmin || event) return
    supabase.from('neighborhoods').select('id, name, uv_code').order('name').then(({ data, error: loadError }) => {
      if (loadError) setError(`No fue posible cargar los barrios: ${loadError.message}`)
      setNeighborhoods(data || [])
    })
  }, [event, profile?.is_superadmin])

  const uploadCover = async input => {
    const file = input.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return setError('Selecciona una imagen válida.')
    if (file.size > 5 * 1024 * 1024) return setError('La portada debe pesar menos de 5 MB.')
    setUploading(true)
    setError('')
    try {
      const extension = (file.name.split('.').pop() || 'jpg').toLowerCase()
      const path = `event-${profile?.id || 'admin'}-${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`
      const prepared = await prepareImageUpload(file, path)
      const { error: uploadError } = await supabase.storage.from('posts').upload(prepared.path, prepared.file, { cacheControl: '3600', contentType: prepared.file.type })
      if (uploadError) throw uploadError
      const { data } = supabase.storage.from('posts').getPublicUrl(prepared.path)
      set('image', data?.publicUrl || '')
    } catch (uploadError) {
      setError(uploadError?.message || 'No fue posible subir la portada.')
    } finally {
      setUploading(false)
    }
  }

  const save = async submitEvent => {
    submitEvent.preventDefault()
    if (!draft.title.trim() || !draft.content.trim() || !draft.starts_at || !draft.location_text.trim()) {
      setError('Completa nombre, fecha, ubicación y descripción del evento.')
      return
    }
    const neighborhoodId = event?.neighborhood_id || targetNeighborhoodId
    if (!neighborhoodId) {
      setError('Selecciona el barrio donde se publicará el evento.')
      return
    }
    if (draft.ends_at && new Date(draft.ends_at).getTime() <= new Date(draft.starts_at).getTime()) {
      setError('La hora de término debe ser posterior al inicio.')
      return
    }
    const ticketPrices = draft.ticket_prices.map(ticket => ({ label: ticket.label.trim(), price: Number(ticket.price) })).filter(ticket => ticket.label || ticket.price || ticket.price === 0)
    if (draft.event_entry_type === 'paid' && (!ticketPrices.length || ticketPrices.some(ticket => !ticket.label || !Number.isFinite(ticket.price) || ticket.price < 0))) return setError('Indica el nombre y valor de cada entrada.')
    const registrationUrl = draft.event_requires_registration && draft.event_registration_url.trim()
      ? normalizeHttpUrl(draft.event_registration_url)
      : null
    const externalUrl = draft.event_external_url.trim() ? normalizeHttpUrl(draft.event_external_url) : null
    if (draft.event_requires_registration && draft.event_registration_url.trim() && !registrationUrl) {
      setError('Escribe un enlace de inscripción válido.')
      return
    }
    if (draft.event_external_url.trim() && !externalUrl) {
      setError('Escribe un enlace principal válido.')
      return
    }

    setSaving(true)
    setError('')
    const toNumberOrNull = value => value === '' || value == null ? null : Number(value)
    const payload = {
      type: 'event',
      title: draft.title.trim(),
      category: draft.category,
      content: draft.content.trim(),
      starts_at: new Date(draft.starts_at).toISOString(),
      ends_at: draft.ends_at ? new Date(draft.ends_at).toISOString() : null,
      event_recurrence: draft.event_recurrence,
      recurrence_until: draft.event_recurrence !== 'none' && draft.recurrence_until ? new Date(draft.recurrence_until).toISOString() : null,
      location_text: draft.location_text.trim(),
      lat: toNumberOrNull(draft.lat),
      lng: toNumberOrNull(draft.lng),
      images: draft.image ? [draft.image] : null,
      event_entry_type: draft.event_entry_type,
      event_price: draft.event_entry_type === 'paid' ? ticketPrices[0]?.price ?? null : null,
      event_ticket_prices: draft.event_entry_type === 'paid' ? ticketPrices : [],
      event_capacity: toNumberOrNull(draft.event_capacity),
      event_pet_friendly: draft.event_pet_friendly,
      event_accessible: draft.event_accessible,
      event_family_friendly: draft.event_family_friendly,
      event_requires_registration: draft.event_requires_registration,
      event_registration_url: registrationUrl,
      event_external_url: externalUrl,
      event_external_label: externalUrl ? (draft.event_external_label.trim() || 'Más información') : null,
      event_show_attendees: draft.event_show_attendees,
      show_in_activity: draft.show_in_activity,
      status: draft.status,
    }

    if (![payload.lat, payload.lng, payload.event_price, payload.event_capacity].every(value => value == null || Number.isFinite(value))) {
      setError('Revisa los valores numéricos del evento.')
      setSaving(false)
      return
    }

    const request = event
      ? supabase.from('posts').update(payload).eq('id', event.id).select().single()
      : supabase.from('posts').insert({ ...payload, author_id: profile?.id, neighborhood_id: neighborhoodId }).select().single()
    const { data: savedEvent, error: saveError } = await request
    if (saveError) {
      setSaving(false)
      setError(saveError.message || 'No fue posible guardar el evento.')
      return
    }

    const shouldUpdateSpotlight = draft.show_on_home || event?.show_on_home === true
    const { error: spotlightError } = shouldUpdateSpotlight
      ? await supabase.rpc('admin_set_home_event_spotlight', {
          p_event_id: savedEvent.id,
          p_show: draft.status === 'active' && draft.show_on_home,
        })
      : { error: null }
    setSaving(false)
    if (spotlightError) {
      setError(`El evento se guardó, pero no pudimos actualizar la portada de Inicio: ${spotlightError.message}`)
      return
    }
    clearEventDraft()
    onSaved()
  }

  return (
    <div className="event-editor-page">
      <header className="subpage-header">
        <button className="subpage-back" type="button" onClick={onBack}>←</button>
        <div><p className="eyebrow">Eventos</p><h1>{event ? 'Editar evento' : 'Nuevo evento'}</h1><span>{event ? event.title : 'Publica una actividad para los vecinos de tu barrio.'}</span></div>
        <div className="editor-header-actions"><button className="button button-primary" type="submit" form="event-form" disabled={saving || uploading}>{saving ? 'Guardando…' : 'Publicar evento'}</button></div>
      </header>

      {error && <div className="admin-alert" role="alert"><span>⚠️</span><p>{error}</p><button type="button" onClick={() => setError('')}>×</button></div>}

      <form id="event-form" className="event-editor-form" onSubmit={save}>
        {profile?.is_superadmin && !event && (
          <section className="editor-section">
            <div className="editor-section-title"><span>0</span><div><h2>Barrio de publicación</h2><p>El evento solo será visible para los vecinos del barrio seleccionado.</p></div></div>
            <label className="field">Barrio<select value={targetNeighborhoodId} onChange={e => setTargetNeighborhoodId(e.target.value)} required><option value="">Selecciona un barrio</option>{neighborhoods.map(neighborhood => <option key={neighborhood.id} value={neighborhood.id}>{neighborhood.name}{neighborhood.uv_code ? ` · UV ${neighborhood.uv_code}` : ''}</option>)}</select></label>
          </section>
        )}
        <section className="editor-section">
          <div className="editor-section-title"><span>1</span><div><h2>Portada e información</h2><p>Lo primero que verán los vecinos en el feed.</p></div></div>
          <label className="event-cover-uploader">
            {draft.image ? <img src={draft.image} alt="Portada del evento" /> : <span>📷 <strong>Subir portada del evento</strong><small>Usa una imagen horizontal y clara.</small></span>}
            <input type="file" accept="image/*" onChange={uploadCover} />
            <em>{uploading ? 'Subiendo…' : draft.image ? 'Cambiar portada' : 'Seleccionar imagen'}</em>
          </label>
          <div className="admin-form-grid event-data-grid">
            <label className="field field-full">Nombre del evento<input value={draft.title} onChange={e => set('title', e.target.value)} maxLength={120} placeholder="Ej: Feria de emprendedores del barrio" required /></label>
            <label className="field">Desde<input type="datetime-local" value={draft.starts_at} onChange={e => set('starts_at', e.target.value)} required /></label>
            <label className="field">Hasta <small>Opcional</small><input type="datetime-local" value={draft.ends_at} min={draft.starts_at || undefined} onChange={e => set('ends_at', e.target.value)} /></label>
            <label className="field">Se repite<select value={draft.event_recurrence} onChange={e => set('event_recurrence', e.target.value)}><option value="none">No se repite</option><option value="weekly">Cada semana</option><option value="biweekly">Cada dos semanas</option><option value="monthly">Cada mes</option></select></label>
            {draft.event_recurrence !== 'none' && <label className="field">Repetir hasta<input type="datetime-local" value={draft.recurrence_until} min={draft.starts_at || undefined} onChange={e => set('recurrence_until', e.target.value)} /></label>}
            <label className="field field-full">Tipo de actividad<select value={draft.category} onChange={e => set('category', e.target.value)}>{categories.map(category => <option value={category.key} key={category.key}>{category.icon} {category.name}</option>)}</select></label>
            <label className="field field-full">Descripción<textarea value={draft.content} onChange={e => set('content', e.target.value)} rows="5" placeholder="Qué se hará, quiénes pueden participar y qué deben llevar…" required /></label>
          </div>
        </section>

        <section className="editor-section">
          <div className="editor-section-title"><span>2</span><div><h2>Ubicación</h2><p>Busca la dirección y ajusta el pin en el mapa.</p></div></div>
          <div className="admin-form-grid event-data-grid">
            <label className="field field-full">Dirección o lugar<input value={draft.location_text} onChange={e => set('location_text', e.target.value)} placeholder="Ej: Plaza Central, Las Condes" required /></label>
            <div className="field field-full"><span>Ubicación en el mapa</span><LocationPicker address={draft.location_text} lat={draft.lat} lng={draft.lng} onPick={(lat, lng, address) => setDraft(current => ({ ...current, lat, lng, location_text: address || current.location_text }))} /></div>
          </div>
        </section>

        <section className="editor-section">
          <div className="editor-section-title"><span>3</span><div><h2>Entrada y condiciones</h2><p>Indica los requisitos antes de publicar.</p></div></div>
          <div className="event-entry-row">
            <button type="button" className={draft.event_entry_type === 'free' ? 'is-selected' : ''} onClick={() => set('event_entry_type', 'free')}>✓ Entrada gratuita</button>
            <button type="button" className={draft.event_entry_type === 'paid' ? 'is-selected' : ''} onClick={() => set('event_entry_type', 'paid')}>🎟️ Entrada pagada</button>
          </div>
          <div className="admin-form-grid event-data-grid">
            {draft.event_entry_type === 'paid' && <div className="field field-full"><span>Valores de entrada</span><div className="ticket-price-list">{draft.ticket_prices.map((ticket, index) => <div className="ticket-price-row" key={index}><input value={ticket.label} onChange={e => setTicket(index, 'label', e.target.value)} placeholder="Ej: Adultos" /><span>$</span><input type="number" min="0" value={ticket.price} onChange={e => setTicket(index, 'price', e.target.value)} placeholder="5000" /><button type="button" disabled={draft.ticket_prices.length === 1} onClick={() => removeTicket(index)} aria-label="Quitar tarifa">×</button></div>)}</div><button className="add-ticket-button" type="button" onClick={addTicket}>＋ Agregar otro valor</button></div>}
            <label className="field">Cupos <small>Opcional</small><input type="number" min="1" value={draft.event_capacity} onChange={e => set('event_capacity', e.target.value)} placeholder="Ej: 80 personas" /></label>
            <label className="field field-full">Enlace principal <small>Opcional</small><input inputMode="url" value={draft.event_external_url} onChange={e => set('event_external_url', e.target.value)} placeholder="lascondes.cl/evento" /><small>Para información, entradas o el sitio oficial. La app abrirá el enlace de forma segura.</small></label>
            {draft.event_external_url && <label className="field">Texto del botón<select value={draft.event_external_label} onChange={e => set('event_external_label', e.target.value)}><option>Más información</option><option>Comprar entradas</option><option>Visitar sitio oficial</option><option>Ver programación</option></select></label>}
          </div>
          <div className="event-option-grid">
            {[
              ['event_pet_friendly', '🐾', 'Pet friendly'],
              ['event_accessible', '♿', 'Accesible'],
              ['event_family_friendly', '👨‍👩‍👧', 'Familiar'],
              ['event_requires_registration', '📝', 'Con inscripción'],
            ].map(([field, emoji, label]) => <button key={field} type="button" className={draft[field] ? 'is-selected' : ''} onClick={() => set(field, !draft[field])}><span>{emoji}</span>{label}{draft[field] && <b>✓</b>}</button>)}
          </div>
          {draft.event_requires_registration && <label className="field event-registration-field">Enlace de inscripción <small>Opcional</small><input inputMode="url" value={draft.event_registration_url} onChange={e => set('event_registration_url', e.target.value)} placeholder="lascondes.cl/inscripcion" /></label>}
        </section>

        <section className="editor-section">
          <div className="editor-section-title"><span>4</span><div><h2>Visibilidad</h2><p>Un evento pausado deja de aparecer en la aplicación.</p></div></div>
          <div className="event-status-row"><button type="button" className={draft.status === 'active' ? 'is-selected' : ''} onClick={() => set('status', 'active')}>● Publicado</button><button type="button" className={draft.status !== 'active' ? 'is-selected' : ''} onClick={() => setDraft(current => ({ ...current, status: 'closed', show_on_home: false }))}>○ Pausado</button></div>
          <label className={`activity-feed-toggle ${draft.show_in_activity ? 'is-selected' : ''}`}>
            <input type="checkbox" checked={draft.show_in_activity} onChange={e => set('show_in_activity', e.target.checked)} />
            <span>📣</span>
            <div><strong>Mostrar también en Actividad</strong><small>Aparecerá mezclado con la actividad vecinal, además del feed de Eventos.</small></div>
          </label>
          <label className={`activity-feed-toggle ${draft.show_on_home ? 'is-selected' : ''}`}>
            <input type="checkbox" checked={draft.show_on_home} disabled={draft.status !== 'active'} onChange={e => set('show_on_home', e.target.checked)} />
            <span>🏠</span>
            <div><strong>Destacar en “Hoy en tu barrio”</strong><small>Ocupará la portada principal. Al activarlo, reemplazará al evento destacado actual de este barrio.</small></div>
          </label>
        </section>

        <footer className="commerce-editor-footer"><button className="button button-secondary" type="button" onClick={discardAndClose}>Descartar borrador</button><button className="button button-primary" type="submit" disabled={saving || uploading}>{saving ? 'Guardando…' : event ? 'Guardar cambios' : 'Publicar evento'}</button></footer>
      </form>
    </div>
  )
}
