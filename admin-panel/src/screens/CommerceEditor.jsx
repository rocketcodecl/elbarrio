import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { COMMERCE_CATEGORIES, COMMERCE_CATEGORY_ICONS } from '../lib/design.js'
import LocationPicker from '../components/LocationPicker.jsx'

const DAYS = [
  ['1', 'Lunes'], ['2', 'Martes'], ['3', 'Miércoles'], ['4', 'Jueves'], ['5', 'Viernes'], ['6', 'Sábado'], ['0', 'Domingo'],
]

const defaultHours = () => ({
  '1': { o: '09:00', c: '19:00' }, '2': { o: '09:00', c: '19:00' }, '3': { o: '09:00', c: '19:00' },
  '4': { o: '09:00', c: '19:00' }, '5': { o: '09:00', c: '19:00' }, '6': { o: '10:00', c: '14:00' }, '0': null,
})

const normalizeHours = value => {
  if (!value || typeof value !== 'object') return defaultHours()
  const normalized = {}
  DAYS.forEach(([key]) => {
    const day = value[key]
    normalized[key] = day?.o && day?.c ? { o: day.o, c: day.c } : null
  })
  return normalized
}

const galleryUrl = item => typeof item === 'string' ? item : (item?.url || item?.image_url || '')

const initialState = commerce => {
  const savedCategories = Array.isArray(commerce?.categories)
    ? commerce.categories.filter(category => COMMERCE_CATEGORIES.includes(category))
    : []
  const primaryCategory = commerce?.category && COMMERCE_CATEGORIES.includes(commerce.category)
    ? commerce.category
    : null
  const categories = [...new Set([
    ...(primaryCategory ? [primaryCategory] : []),
    ...savedCategories,
  ])]

  return ({
  name: commerce?.name || '',
  categories: categories.length ? categories : ['Otro'],
  description: commerce?.description || '',
  address: commerce?.address || '',
  lat: commerce?.lat ?? '',
  lng: commerce?.lng ?? '',
  phone: commerce?.phone || '',
  whatsapp: commerce?.whatsapp || '',
  email: commerce?.email || '',
  website: commerce?.website || '',
  instagram: commerce?.instagram || '',
  discount_text: commerce?.discount_text || '',
  logo_url: commerce?.logo_url || '',
  cover_url: commerce?.cover_url || '',
  gallery: Array.isArray(commerce?.gallery) ? commerce.gallery : [],
  opening_hours: normalizeHours(commerce?.opening_hours),
  is_active: commerce?.is_active !== false,
  is_premium: !!commerce?.is_premium,
  })
}

export default function CommerceEditor({ commerce, profile, onBack, onSaved, onDeleted }) {
  const [draft, setDraft] = useState(() => initialState(commerce))
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState('')
  const [error, setError] = useState('')

  const set = (field, value) => setDraft(current => ({ ...current, [field]: value }))

  const upload = async (file, folder) => {
    if (!file) return null
    if (!file.type.startsWith('image/')) throw new Error('Selecciona un archivo de imagen.')
    if (file.size > 5 * 1024 * 1024) throw new Error('Cada imagen debe pesar menos de 5 MB.')
    const extension = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`
    const { error: uploadError } = await supabase.storage.from('commerces').upload(path, file, { cacheControl: '3600' })
    if (uploadError) throw uploadError
    return supabase.storage.from('commerces').getPublicUrl(path).data?.publicUrl || null
  }

  const uploadSingle = async (event, field, folder) => {
    const file = event.target.files?.[0]
    if (!file) return
    setUploading(field)
    setError('')
    try {
      const url = await upload(file, folder)
      if (url) set(field, url)
    } catch (uploadError) {
      setError(uploadError?.message || 'No fue posible subir la imagen.')
    } finally {
      setUploading('')
    }
  }

  const uploadGallery = async event => {
    const files = Array.from(event.target.files || [])
    if (!files.length) return
    setUploading('gallery')
    setError('')
    try {
      const urls = []
      for (const file of files) urls.push(await upload(file, 'gallery'))
      set('gallery', [...draft.gallery, ...urls.filter(Boolean)])
    } catch (uploadError) {
      setError(uploadError?.message || 'No fue posible subir una imagen de la galería.')
    } finally {
      setUploading('')
    }
  }

  const toggleDay = key => {
    set('opening_hours', {
      ...draft.opening_hours,
      [key]: draft.opening_hours[key] ? null : { o: '09:00', c: '19:00' },
    })
  }

  const setHour = (key, field, value) => {
    set('opening_hours', {
      ...draft.opening_hours,
      [key]: { ...draft.opening_hours[key], [field]: value },
    })
  }

  const toggleCategory = category => {
    setDraft(current => {
      const selected = current.categories.includes(category)
      if (selected && current.categories.length === 1) return current
      return {
        ...current,
        categories: selected
          ? current.categories.filter(item => item !== category)
          : [...current.categories, category],
      }
    })
  }

  const save = async event => {
    event.preventDefault()
    if (!draft.name.trim()) return
    setSaving(true)
    setError('')
    const numericOrNull = value => value === '' || value == null ? null : Number(value)
    const payload = {
      name: draft.name.trim(),
      category: draft.categories[0] || 'Otro',
      categories: draft.categories.length ? draft.categories : ['Otro'],
      description: draft.description.trim() || null,
      address: draft.address.trim() || null,
      lat: numericOrNull(draft.lat),
      lng: numericOrNull(draft.lng),
      phone: draft.phone.trim() || null,
      whatsapp: draft.whatsapp.trim() || null,
      email: draft.email.trim() || null,
      website: draft.website.trim() || null,
      instagram: draft.instagram.trim() || null,
      discount_text: draft.discount_text.trim() || null,
      logo_url: draft.logo_url || null,
      cover_url: draft.cover_url || null,
      gallery: draft.gallery.length ? draft.gallery : null,
      opening_hours: draft.opening_hours,
      is_active: !!draft.is_active,
      is_premium: !!draft.is_premium,
      neighborhood_id: commerce?.neighborhood_id || profile?.neighborhood_id || null,
    }

    if ((payload.lat != null && !Number.isFinite(payload.lat)) || (payload.lng != null && !Number.isFinite(payload.lng))) {
      setError('La latitud y longitud deben ser números válidos.')
      setSaving(false)
      return
    }

    const request = commerce
      ? supabase.from('commerces').update(payload).eq('id', commerce.id).select().single()
      : supabase.from('commerces').insert(payload).select().single()
    const { error: saveError } = await request
    setSaving(false)
    if (saveError) {
      setError(saveError.message || 'No fue posible guardar el comercio.')
      return
    }
    onSaved()
  }

  const removeCommerce = async () => {
    if (!commerce || !window.confirm(`¿Eliminar “${commerce.name}”? También se eliminarán sus productos. Esta acción no se puede deshacer.`)) return
    setSaving(true)
    const { error: deleteError } = await supabase.from('commerces').delete().eq('id', commerce.id)
    setSaving(false)
    if (deleteError) {
      setError(deleteError.message || 'No fue posible eliminar el comercio.')
      return
    }
    onDeleted()
  }

  return (
    <div className="commerce-editor-page">
      <header className="subpage-header">
        <button className="subpage-back" type="button" onClick={onBack}>←</button>
        <div><p className="eyebrow">Comercios</p><h1>{commerce ? 'Editar comercio' : 'Nuevo comercio'}</h1><span>{commerce ? commerce.name : 'Completa la información que verá el barrio.'}</span></div>
        <div className="editor-header-actions">{commerce && <button className="delete-commerce-button" type="button" onClick={removeCommerce}>Eliminar</button>}<button className="button button-primary" type="submit" form="commerce-form" disabled={saving || !!uploading}>{saving ? 'Guardando…' : 'Guardar comercio'}</button></div>
      </header>

      {error && <div className="admin-alert" role="alert"><span>⚠️</span><p>{error}</p><button type="button" onClick={() => setError('')}>×</button></div>}

      <form id="commerce-form" className="commerce-editor-form" onSubmit={save}>
        <section className="editor-section editor-media-section">
          <div className="editor-section-title"><span>1</span><div><h2>Identidad visual</h2><p>Portada, logo e imágenes que aparecen en la ficha.</p></div></div>
          <div className="media-preview-label"><strong>Vista previa en la app</strong><span>La portada se recorta en formato 16:9 desde la parte superior.</span></div>
          <div className="commerce-media-grid">
            <div className="app-cover-preview">
              <label className="cover-uploader">
                {draft.cover_url ? <img src={draft.cover_url} alt="Portada" /> : <span>🖼️ <strong>Subir portada</strong><small>Imagen horizontal recomendada</small></span>}
                <input type="file" accept="image/*" onChange={event => uploadSingle(event, 'cover_url', 'covers')} />
                <em>{uploading === 'cover_url' ? 'Subiendo…' : 'Cambiar portada'}</em>
              </label>
              {draft.logo_url && <span className="cover-logo-preview"><img src={draft.logo_url} alt="" /></span>}
              {draft.is_premium && <span className="cover-featured-preview">Destacado</span>}
            </div>
            <label className="logo-uploader">
              {draft.logo_url ? <img src={draft.logo_url} alt="Logo" /> : <span>🏪</span>}
              <input type="file" accept="image/*" onChange={event => uploadSingle(event, 'logo_url', 'logos')} />
              <em>{uploading === 'logo_url' ? 'Subiendo…' : 'Logo'}</em>
            </label>
          </div>
          <div className="gallery-editor-header"><strong>Galería del comercio</strong><label>{uploading === 'gallery' ? 'Subiendo…' : '＋ Agregar imágenes'}<input type="file" accept="image/*" multiple onChange={uploadGallery} /></label></div>
          <div className="gallery-editor-grid">
            {draft.gallery.map((item, index) => galleryUrl(item) && <div key={`${galleryUrl(item)}-${index}`}><img src={galleryUrl(item)} alt="" /><button type="button" onClick={() => set('gallery', draft.gallery.filter((_, itemIndex) => itemIndex !== index))}>×</button></div>)}
            {!draft.gallery.some(galleryUrl) && <p className="gallery-empty-copy">Todavía no hay imágenes adicionales.</p>}
          </div>
        </section>

        <section className="editor-section">
          <div className="editor-section-title"><span>2</span><div><h2>Información principal</h2><p>Nombre, rubro y descripción pública.</p></div></div>
          <div className="admin-form-grid commerce-data-grid">
            <label className="field field-full">Nombre del comercio<input value={draft.name} onChange={event => set('name', event.target.value)} maxLength={120} required /></label>
            <div className="field field-full commerce-categories-field">
              <span>Rubros del comercio</span>
              <small>Selecciona todos los que correspondan. El primero queda como rubro principal.</small>
              <div className="commerce-category-pills">
                {COMMERCE_CATEGORIES.map(category => {
                  const selected = draft.categories.includes(category)
                  const primary = draft.categories[0] === category
                  return (
                    <button
                      type="button"
                      key={category}
                      className={`commerce-category-pill ${selected ? 'is-selected' : ''}`}
                      onClick={() => toggleCategory(category)}
                      aria-pressed={selected}
                    >
                      <span>{COMMERCE_CATEGORY_ICONS[category]}</span>
                      {category}
                      {primary && <em>Principal</em>}
                    </button>
                  )
                })}
              </div>
            </div>
            <label className="field">Descuento para vecinos<input value={draft.discount_text} onChange={event => set('discount_text', event.target.value)} placeholder="Ej: -15% para vecinos" /></label>
            <label className="field field-full">Descripción<textarea value={draft.description} onChange={event => set('description', event.target.value)} rows="4" placeholder="Describe el comercio en pocas palabras…" /></label>
            <div className="commerce-state-switches field-full"><label><input type="checkbox" checked={draft.is_active} onChange={event => set('is_active', event.target.checked)} /><span><strong>Comercio activo</strong><small>Visible en la aplicación</small></span></label><label><input type="checkbox" checked={draft.is_premium} onChange={event => set('is_premium', event.target.checked)} /><span><strong>Comercio destacado</strong><small>Posición comercial prioritaria</small></span></label></div>
          </div>
        </section>

        <section className="editor-section">
          <div className="editor-section-title"><span>3</span><div><h2>Contacto y ubicación</h2><p>Datos que utilizarán los vecinos para comunicarse y llegar.</p></div></div>
          <div className="admin-form-grid commerce-data-grid">
            <label className="field field-full">Dirección<input value={draft.address} onChange={event => set('address', event.target.value)} placeholder="Calle, número y comuna" /></label>
            <div className="field field-full"><span>Ubicación en el mapa</span><LocationPicker address={draft.address} lat={draft.lat} lng={draft.lng} onPick={(nextLat, nextLng, nextAddress) => setDraft(current => ({ ...current, lat: nextLat, lng: nextLng, address: nextAddress || current.address }))} /></div>
            <label className="field">Teléfono<input value={draft.phone} onChange={event => set('phone', event.target.value)} /></label>
            <label className="field">WhatsApp<input value={draft.whatsapp} onChange={event => set('whatsapp', event.target.value)} /></label>
            <label className="field">Correo<input type="email" value={draft.email} onChange={event => set('email', event.target.value)} /></label>
            <label className="field">Instagram<input value={draft.instagram} onChange={event => set('instagram', event.target.value)} placeholder="@usuario" /></label>
            <label className="field field-full">Sitio web<input value={draft.website} onChange={event => set('website', event.target.value)} placeholder="https://" /></label>
          </div>
        </section>

        <section className="editor-section">
          <div className="editor-section-title"><span>4</span><div><h2>Horarios</h2><p>Activa los días de atención e indica apertura y cierre.</p></div></div>
          <div className="schedule-editor">
            {DAYS.map(([key, label]) => {
              const hours = draft.opening_hours[key]
              return <div className={`schedule-row ${hours ? 'is-open' : ''}`} key={key}><label><input type="checkbox" checked={!!hours} onChange={() => toggleDay(key)} /><strong>{label}</strong></label>{hours ? <div><input type="time" value={hours.o} onChange={event => setHour(key, 'o', event.target.value)} /><span>a</span><input type="time" value={hours.c} onChange={event => setHour(key, 'c', event.target.value)} /></div> : <span className="closed-label">Cerrado</span>}</div>
            })}
          </div>
        </section>

        <footer className="commerce-editor-footer"><button className="button button-secondary" type="button" onClick={onBack}>Cancelar</button><button className="button button-primary" type="submit" disabled={saving || !!uploading}>{saving ? 'Guardando…' : 'Guardar comercio'}</button></footer>
      </form>
    </div>
  )
}
