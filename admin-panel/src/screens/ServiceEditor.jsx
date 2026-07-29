import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

const RUBROS = {
  gasfiter: ['🔧', 'Gasfitería'], electrico: ['💡', 'Electricidad'], cerrajero: ['🔑', 'Cerrajería'], pintor: ['🎨', 'Pintura'], carpintero: ['🪚', 'Carpintería'], maestro: ['🧱', 'Maestro'], aseo: ['🧹', 'Limpieza'], jardinero: ['🌱', 'Jardinería'], peluqueria: ['💇', 'Peluquería'], mascotas: ['🐕', 'Mascotas'], ninera: ['👶', 'Niñera'], adulto_mayor: ['👵', 'Adulto mayor'], fletes: ['🚚', 'Fletes'], clases: ['📖', 'Clases'], internet: ['📶', 'Internet y redes'], aire: ['❄️', 'Aire acondicionado'], fumigacion: ['🐜', 'Fumigación'], otro: ['🛠️', 'Otro'],
}

export default function ServiceEditor({ service = null, profile, onBack, onSaved }) {
  const editing = Boolean(service?.id)
  const [providers, setProviders] = useState([])
  const [draft, setDraft] = useState({
    authorId: service?.author_id || '',
    title: service?.title || '',
    serviceKey: service?.service_key || service?.category || 'otro',
    content: service?.content || service?.description || '',
    price: service?.price ?? '',
    image: Array.isArray(service?.images) ? service.images.find(Boolean) || '' : '',
    phone: service?.service_phone || '',
    whatsapp: service?.service_whatsapp || '',
    instagram: service?.service_instagram || '',
  })
  const [imageChanged, setImageChanged] = useState(false)
  const [loadingProviders, setLoadingProviders] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (field, value) => setDraft(current => ({ ...current, [field]: value }))

  useEffect(() => {
    let request = supabase.from('profiles').select('id, full_name, avatar_url, verified, verification_status').order('full_name').limit(500)
    if (profile?.neighborhood_id) request = request.eq('neighborhood_id', profile.neighborhood_id)
    request.then(({ data, error: providerError }) => {
      if (providerError) setError(`No fue posible cargar los prestadores: ${providerError.message}`)
      const rows = data || []
      setProviders(rows)
      setDraft(current => ({ ...current, authorId: current.authorId || rows[0]?.id || profile?.id || '' }))
      setLoadingProviders(false)
    })
  }, [profile?.id, profile?.neighborhood_id])

  const uploadImage = async event => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) return setError('Selecciona una imagen válida.')
    if (file.size > 5 * 1024 * 1024) return setError('La imagen debe pesar menos de 5 MB.')
    setUploading(true)
    setError('')
    try {
      const extension = (file.name.split('.').pop() || 'jpg').toLowerCase()
      const path = `service-admin-${profile?.id || 'admin'}-${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`
      const { error: uploadError } = await supabase.storage.from('posts').upload(path, file, { cacheControl: '3600' })
      if (uploadError) throw uploadError
      const { data } = supabase.storage.from('posts').getPublicUrl(path)
      set('image', data?.publicUrl || '')
      setImageChanged(true)
    } catch (uploadError) {
      setError(uploadError?.message || 'No fue posible subir la imagen.')
    } finally { setUploading(false) }
  }

  const save = async event => {
    event.preventDefault()
    if (!draft.authorId || !draft.title.trim() || !draft.content.trim()) return setError('Selecciona un prestador y completa título y descripción.')
    const price = draft.price === '' ? null : Number(draft.price)
    if (price !== null && (!Number.isFinite(price) || price < 0)) return setError('El precio no es válido.')
    setSaving(true)
    setError('')
    const payload = { author_id: draft.authorId, neighborhood_id: service?.neighborhood_id || profile?.neighborhood_id, type: 'service', title: draft.title.trim(), content: draft.content.trim(), service_key: draft.serviceKey, category: draft.serviceKey, price, service_phone: draft.phone.trim() || null, service_whatsapp: draft.whatsapp.trim() || null, service_instagram: draft.instagram.trim().replace(/^@/, '') || null }
    if (!editing || imageChanged) payload.images = draft.image ? [draft.image] : null
    if (!editing) payload.status = 'active'
    const request = editing
      ? supabase.from('posts').update(payload).eq('id', service.id).eq('type', 'service')
      : supabase.from('posts').insert(payload)
    const { error: saveError } = await request
    setSaving(false)
    if (saveError) return setError(`No fue posible ${editing ? 'guardar' : 'crear'} el servicio: ${saveError.message}`)
    onSaved(service?.id)
  }

  return <div className="service-editor-page"><header className="subpage-header"><button className="subpage-back" type="button" onClick={onBack}>←</button><div><p className="eyebrow">Servicios</p><h1>{editing ? 'Editar servicio' : 'Nuevo servicio'}</h1><span>{editing ? 'Actualiza la información que aparece en la aplicación.' : 'Crea una publicación en nombre de un prestador del barrio.'}</span></div><button className="button button-primary" type="submit" form="admin-service-form" disabled={saving || uploading}>{saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Publicar servicio'}</button></header>{error && <div className="admin-alert" role="alert"><span>⚠️</span><p>{error}</p><button type="button" onClick={() => setError('')}>×</button></div>}<form id="admin-service-form" className="service-editor-form" onSubmit={save}><section className="editor-section"><div className="editor-section-title"><span>1</span><div><h2>Prestador e imagen</h2><p>El servicio quedará asociado al perfil seleccionado.</p></div></div><div className="admin-service-identity"><label className="field">Prestador<select value={draft.authorId} onChange={event => set('authorId', event.target.value)} disabled={loadingProviders}>{loadingProviders ? <option>Cargando…</option> : providers.map(provider => <option key={provider.id} value={provider.id}>{provider.full_name || 'Vecino sin nombre'}{provider.verified || provider.verification_status === 'verified' ? ' · Verificado' : ''}</option>)}</select></label><label className="admin-service-image">{draft.image ? <img src={draft.image} alt="" /> : <span>🧰<strong>Imagen del servicio</strong></span>}<input type="file" accept="image/*" onChange={uploadImage} /><em>{uploading ? 'Subiendo…' : draft.image ? 'Cambiar imagen' : 'Seleccionar imagen'}</em></label></div></section><section className="editor-section"><div className="editor-section-title"><span>2</span><div><h2>Información pública</h2><p>Estos datos aparecerán en la aplicación.</p></div></div><div className="admin-form-grid"><label className="field field-full">Título<input value={draft.title} onChange={event => set('title', event.target.value)} maxLength="120" placeholder="Ej: Reparaciones eléctricas a domicilio" required /></label><label className="field">Rubro<select value={draft.serviceKey} onChange={event => set('serviceKey', event.target.value)}>{Object.entries(RUBROS).map(([key, [icon, label]]) => <option key={key} value={key}>{icon} {label}</option>)}</select></label><label className="field">Valor desde <small>Opcional</small><input type="number" min="0" step="1" value={draft.price} onChange={event => set('price', event.target.value)} placeholder="A convenir" /></label><label className="field field-full">Descripción<textarea rows="7" value={draft.content} onChange={event => set('content', event.target.value)} maxLength="3000" placeholder="Describe el servicio, experiencia y cobertura…" required /></label><label className="field">Teléfono <small>Opcional</small><input type="tel" value={draft.phone} onChange={event => set('phone', event.target.value)} placeholder="+56 9…" /></label><label className="field">WhatsApp <small>Opcional</small><input type="tel" value={draft.whatsapp} onChange={event => set('whatsapp', event.target.value)} placeholder="+56 9…" /></label><label className="field">Instagram <small>Opcional</small><input value={draft.instagram} onChange={event => set('instagram', event.target.value)} placeholder="usuario (sin @)" /></label></div></section><footer className="commerce-editor-footer"><button className="button button-secondary" type="button" onClick={onBack}>Cancelar</button><button className="button button-primary" type="submit" disabled={saving || uploading}>{saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Publicar servicio'}</button></footer></form></div>
}
