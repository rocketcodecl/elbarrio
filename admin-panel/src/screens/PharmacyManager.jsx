import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import LocationPicker from '../components/LocationPicker.jsx'
import usePersistentDraft from '../hooks/usePersistentDraft.js'

const EMPTY_PHARMACY = {
  nombre: '', direccion: '', comuna: 'Las Condes', horario: '24 horas', telefono: '',
  lat: '', lng: '', is_active: true, is_on_duty: false, sort_order: 0,
}

const numericOrNull = value => value === '' || value == null ? null : Number(value)
const compactMapAddress = value => {
  const parts = String(value || '').split(',').map(part => part.trim()).filter(Boolean)
  if (parts.length <= 3) return parts.join(', ')
  const useful = parts.filter(part => !/^(chile|región metropolitana de santiago|provincia de santiago)$/i.test(part))
  return useful.slice(0, 3).join(', ')
}

function PharmacyEditor({ pharmacy, onBack, onSaved, onDeleted }) {
  const initialDraft = pharmacy ? {
    nombre: pharmacy.nombre || '',
    direccion: pharmacy.direccion || '',
    comuna: pharmacy.comuna || 'Las Condes',
    horario: pharmacy.horario || '24 horas',
    telefono: pharmacy.telefono || '',
    lat: pharmacy.lat ?? '',
    lng: pharmacy.lng ?? '',
    is_active: pharmacy.is_active !== false,
    is_on_duty: pharmacy.is_on_duty === true,
    sort_order: pharmacy.sort_order ?? 0,
  } : EMPTY_PHARMACY
  const [draft, setDraft, clearPharmacyDraft] = usePersistentDraft(
    `pharmacy:${pharmacy?.id || 'new'}`,
    initialDraft,
    pharmacy?.updated_at || 'new-v1',
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (key, value) => setDraft(current => ({ ...current, [key]: value }))

  const save = async event => {
    event.preventDefault()
    if (!draft.nombre.trim() || !draft.direccion.trim()) {
      setError('Completa el nombre y la dirección de la farmacia.')
      return
    }
    const payload = {
      nombre: draft.nombre.trim(),
      direccion: draft.direccion.trim(),
      comuna: draft.comuna.trim() || null,
      horario: draft.horario.trim() || '24 horas',
      telefono: draft.telefono.trim() || null,
      lat: numericOrNull(draft.lat),
      lng: numericOrNull(draft.lng),
      is_active: !!draft.is_active,
      is_on_duty: !!draft.is_active && !!draft.is_on_duty,
      sort_order: Number(draft.sort_order) || 0,
    }
    if ((payload.lat != null && !Number.isFinite(payload.lat)) || (payload.lng != null && !Number.isFinite(payload.lng))) {
      setError('La ubicación del mapa no es válida.')
      return
    }

    setSaving(true)
    setError('')
    const request = pharmacy
      ? supabase.from('farmacias').update(payload).eq('id', pharmacy.id).select().single()
      : supabase.from('farmacias').insert(payload).select().single()
    const { error: saveError } = await request
    setSaving(false)
    if (saveError) {
      setError(saveError.message || 'No fue posible guardar la farmacia.')
      return
    }
    clearPharmacyDraft()
    onSaved()
  }

  const remove = async () => {
    if (!pharmacy || !window.confirm(`¿Eliminar “${pharmacy.nombre}”? Esta acción no se puede deshacer.`)) return
    setSaving(true)
    setError('')
    const { error: deleteError } = await supabase.from('farmacias').delete().eq('id', pharmacy.id)
    setSaving(false)
    if (deleteError) {
      setError(deleteError.message || 'No fue posible eliminar la farmacia.')
      return
    }
    clearPharmacyDraft()
    onDeleted()
  }

  return (
    <div className="pharmacy-editor-page">
      <header className="subpage-header">
        <button className="subpage-back" type="button" onClick={onBack}>←</button>
        <div><p className="eyebrow">Farmacias</p><h1>{pharmacy ? 'Editar farmacia' : 'Nueva farmacia'}</h1><span>Esta información aparecerá en el Inicio de la app.</span></div>
        <div className="editor-header-actions">
          {pharmacy && <button className="delete-commerce-button" type="button" onClick={remove} disabled={saving}>Eliminar</button>}
          <button className="button button-primary" type="submit" form="pharmacy-form" disabled={saving}>{saving ? 'Guardando…' : 'Guardar farmacia'}</button>
        </div>
      </header>

      {error && <div className="admin-alert" role="alert"><span>⚠️</span><p>{error}</p><button type="button" onClick={() => setError('')}>×</button></div>}

      <form id="pharmacy-form" className="pharmacy-editor-form" onSubmit={save}>
        <section className="editor-section">
          <div className="editor-section-title"><span>1</span><div><h2>Información pública</h2><p>Nombre, contacto y horario que verán los vecinos.</p></div></div>
          <div className="admin-form-grid">
            <label className="field field-full">Nombre de la farmacia<input value={draft.nombre} onChange={event => set('nombre', event.target.value)} placeholder="Farmacias Ahumada" maxLength={120} required /></label>
            <label className="field">Comuna<input value={draft.comuna} onChange={event => set('comuna', event.target.value)} placeholder="Las Condes" /></label>
            <label className="field">Teléfono<input value={draft.telefono} onChange={event => set('telefono', event.target.value)} placeholder="+56 2 2345 6789" /></label>
            <label className="field field-full">Horario o turno<input value={draft.horario} onChange={event => set('horario', event.target.value)} placeholder="24 horas · hasta las 08:00" /></label>
          </div>
        </section>

        <section className="editor-section">
          <div className="editor-section-title"><span>2</span><div><h2>Dirección y mapa</h2><p>La dirección se sincroniza al buscar o mover el marcador.</p></div></div>
          <div className="admin-form-grid">
            <label className="field field-full">Dirección<input value={draft.direccion} onChange={event => set('direccion', event.target.value)} placeholder="Av. Cristóbal Colón 5090, Las Condes" required /></label>
            <div className="field field-full"><span>Ubicación en el mapa</span><LocationPicker address={draft.direccion} lat={draft.lat} lng={draft.lng} onPick={(lat, lng, address) => setDraft(current => ({ ...current, lat, lng, direccion: address ? compactMapAddress(address) : current.direccion }))} /></div>
          </div>
        </section>

        <section className="editor-section">
          <div className="editor-section-title"><span>3</span><div><h2>Visibilidad y turno</h2><p>Define si forma parte del directorio y si debe destacarse ahora como farmacia de turno.</p></div></div>
          <div className="pharmacy-state-grid">
            <label className={`pharmacy-visibility ${draft.is_active ? 'is-active' : ''}`}><input type="checkbox" checked={draft.is_active} onChange={event => setDraft(current => ({ ...current, is_active: event.target.checked, is_on_duty: event.target.checked ? current.is_on_duty : false }))} /><span>💊</span><div><strong>{draft.is_active ? 'Visible en el directorio' : 'Farmacia pausada'}</strong><small>{draft.is_active ? 'Aparecerá dentro del listado de farmacias.' : 'Quedará guardada, pero no se mostrará.'}</small></div></label>
            <label className={`pharmacy-visibility pharmacy-duty ${draft.is_on_duty ? 'is-on-duty' : ''}`}><input type="checkbox" checked={draft.is_on_duty} onChange={event => setDraft(current => ({ ...current, is_active: event.target.checked ? true : current.is_active, is_on_duty: event.target.checked }))} /><span>🕐</span><div><strong>{draft.is_on_duty ? 'De turno ahora' : 'Sin turno activo'}</strong><small>{draft.is_on_duty ? 'Se destacará en la franja del Home.' : 'Seguirá disponible solo en el directorio.'}</small></div></label>
            <label className="field">Prioridad en Inicio<select value={draft.sort_order} onChange={event => set('sort_order', event.target.value)}><option value="0">Principal</option><option value="10">Secundaria</option><option value="20">Tercera</option><option value="30">Última</option></select><small>Si hay varias activas, la principal se muestra primero.</small></label>
          </div>
        </section>

        <footer className="commerce-editor-footer"><button className="button button-secondary" type="button" onClick={() => { clearPharmacyDraft(); onBack() }}>Descartar borrador</button><button className="button button-primary" type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Guardar farmacia'}</button></footer>
      </form>
    </div>
  )
}

export default function PharmacyManager() {
  const [pharmacies, setPharmacies] = useState([])
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [view, setView] = useState({ type: 'list', pharmacy: null })

  const showNotice = message => {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 2600)
  }

  const loadPharmacies = useCallback(async () => {
    setLoading(true)
    setError('')
    const { data, error: loadError } = await supabase.from('farmacias').select('*').order('sort_order', { ascending: true }).order('nombre', { ascending: true }).limit(300)
    if (loadError) setError(loadError.message || 'No fue posible cargar las farmacias.')
    setPharmacies(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { loadPharmacies() }, [loadPharmacies])

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return pharmacies.filter(pharmacy => {
      const matchesText = !normalized || [pharmacy.nombre, pharmacy.direccion, pharmacy.comuna].some(value => String(value || '').toLowerCase().includes(normalized))
      const matchesState = filter === 'all' || (filter === 'duty' && pharmacy.is_on_duty) || (filter === 'active' && pharmacy.is_active) || (filter === 'inactive' && !pharmacy.is_active)
      return matchesText && matchesState
    })
  }, [filter, pharmacies, query])

  const returnToList = async message => {
    await loadPharmacies()
    setView({ type: 'list', pharmacy: null })
    if (message) showNotice(message)
  }

  const toggleVisibility = async pharmacy => {
    const next = !pharmacy.is_active
    const changes = { is_active: next, ...(!next ? { is_on_duty: false } : {}) }
    const previousDuty = pharmacy.is_on_duty
    setPharmacies(current => current.map(item => item.id === pharmacy.id ? { ...item, ...changes } : item))
    const { error: updateError } = await supabase.from('farmacias').update(changes).eq('id', pharmacy.id)
    if (updateError) {
      setPharmacies(current => current.map(item => item.id === pharmacy.id ? { ...item, is_active: !next, is_on_duty: previousDuty } : item))
      setError(updateError.message || 'No fue posible cambiar la visibilidad.')
      return
    }
    showNotice(next ? 'Farmacia visible en la app' : 'Farmacia pausada')
  }

  const toggleDuty = async pharmacy => {
    const next = !pharmacy.is_on_duty
    const changes = { is_on_duty: next, ...(next ? { is_active: true } : {}) }
    const previous = { is_on_duty: pharmacy.is_on_duty, is_active: pharmacy.is_active }
    setPharmacies(current => current.map(item => item.id === pharmacy.id ? { ...item, ...changes } : item))
    const { error: updateError } = await supabase.from('farmacias').update(changes).eq('id', pharmacy.id)
    if (updateError) {
      setPharmacies(current => current.map(item => item.id === pharmacy.id ? { ...item, ...previous } : item))
      setError(updateError.message || 'No fue posible cambiar el turno.')
      return
    }
    showNotice(next ? 'Farmacia marcada de turno' : 'Turno desactivado')
  }

  if (view.type === 'edit') return <PharmacyEditor pharmacy={view.pharmacy} onBack={() => setView({ type: 'list', pharmacy: null })} onSaved={() => returnToList(view.pharmacy ? 'Farmacia actualizada' : 'Farmacia creada')} onDeleted={() => returnToList('Farmacia eliminada')} />

  return (
    <div className="pharmacy-manager">
      <section className="page-heading commerce-page-heading">
        <div><p className="eyebrow">Información de utilidad</p><h1>Farmacias de turno</h1><p>Administra las farmacias que aparecen en el Inicio de el barrio.</p></div>
        <button className="button button-primary new-commerce-button" type="button" onClick={() => setView({ type: 'edit', pharmacy: null })}>＋ Nueva farmacia</button>
      </section>

      {error && <div className="admin-alert" role="alert"><span>⚠️</span><p>{error}</p><button type="button" onClick={() => setError('')}>×</button></div>}
      {notice && <div className="admin-toast">✓ {notice}</div>}

      <section className="commerce-directory">
        <header className="directory-toolbar">
          <label className="admin-search directory-search"><span>⌕</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar por nombre o dirección…" /></label>
          <div className="filter-row directory-filters">{[['all', 'Todas'], ['duty', 'De turno'], ['active', 'Visibles'], ['inactive', 'Pausadas']].map(([value, label]) => <button key={value} type="button" className={filter === value ? 'is-active' : ''} onClick={() => setFilter(value)}>{label}</button>)}</div>
          <span className="directory-count">{filtered.length} farmacias</span>
        </header>

        {loading && <div className="panel-loading directory-loading">Cargando farmacias…</div>}
        {!loading && filtered.length === 0 && <div className="panel-empty directory-empty"><span>💊</span><strong>Sin farmacias</strong><small>Agrega la primera farmacia de turno.</small></div>}
        {!loading && filtered.length > 0 && <div className="commerce-table-wrap"><table className="commerce-table pharmacy-table"><thead><tr><th>Farmacia</th><th>Estado</th><th>Turno</th><th>Horario</th><th>Prioridad</th><th>Acciones</th></tr></thead><tbody>{filtered.map(pharmacy => <tr key={pharmacy.id}><td><div className="table-commerce"><span>💊</span><div><strong>{pharmacy.nombre || 'Sin nombre'}</strong><small>{pharmacy.direccion || 'Sin dirección'}{pharmacy.comuna ? ` · ${pharmacy.comuna}` : ''}</small></div></div></td><td><button className={`pharmacy-status-toggle ${pharmacy.is_active ? 'is-active' : ''}`} type="button" onClick={() => toggleVisibility(pharmacy)}><i />{pharmacy.is_active ? 'Visible' : 'Pausada'}</button></td><td><button className={`pharmacy-duty-toggle ${pharmacy.is_on_duty ? 'is-on-duty' : ''}`} type="button" onClick={() => toggleDuty(pharmacy)}>{pharmacy.is_on_duty ? '🕐 De turno' : 'Sin turno'}</button></td><td><span className="pharmacy-hours">{pharmacy.horario || '24 horas'}</span></td><td><span className="pharmacy-priority">{Number(pharmacy.sort_order) === 0 ? 'Principal' : `Orden ${pharmacy.sort_order}`}</span></td><td><div className="table-actions"><button type="button" onClick={() => setView({ type: 'edit', pharmacy })}>Editar</button></div></td></tr>)}</tbody></table></div>}
      </section>
    </div>
  )
}
