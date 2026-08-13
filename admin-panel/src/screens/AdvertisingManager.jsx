import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import usePersistentDraft from '../hooks/usePersistentDraft.js'
import { prepareImageUpload } from '../../../shared/imageUpload.js'

const EMPTY_FORM = {
  id: '', advertiser_name: '', campaign_name: '', title: '', body: '', image_url: '', image_urls: [],
  label: 'Patrocinado', cta_label: 'Conocer más', cta_url: '',
  placements: ['home_feature'], neighborhood_ids: [], starts_at: '', ends_at: '',
  status: 'draft', priority: 100, contracted_amount: '', payment_status: 'pending',
  internal_notes: '',
}

const STATUS = { draft: 'Borrador', active: 'Activa', paused: 'Pausada', finished: 'Finalizada' }
const PAYMENT = { pending: 'Pendiente', paid: 'Pagada', courtesy: 'Cortesía', cancelled: 'Cancelada' }
const PLACEMENT = {
  home_feature: 'Inicio', activity_feed: 'Actividad',
  services_feed: 'Servicios', commerces_feed: 'Comercios',
}

function CreativeFormat({ url, count }) {
  const [format, setFormat] = useState('Detectando formato…')
  return <span className="advertising-format"><img src={url} alt="" onLoad={event => {
    const image = event.currentTarget
    setFormat(image.naturalWidth / image.naturalHeight >= 3.2 ? 'Franja · 1200 × 220' : 'Estándar · 1200 × 628')
  }} /><b>{format}</b><small>{count} {count === 1 ? 'gráfica' : 'gráficas'}</small></span>
}

const toLocalInput = value => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const offset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

const toIso = value => value ? new Date(value).toISOString() : null

export default function AdvertisingManager({ profile }) {
  const [campaigns, setCampaigns] = useState([])
  const [neighborhoods, setNeighborhoods] = useState([])
  const [metrics, setMetrics] = useState({})
  const [form, setForm, clearDraft, replaceForm] = usePersistentDraft('advertising:campaign', EMPTY_FORM, 'v3')
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    const [campaignRes, neighborhoodRes, metricRes] = await Promise.all([
      supabase.from('advertising_campaigns')
        .select('*, targets:advertising_campaign_neighborhoods(neighborhood_id)')
        .order('created_at', { ascending: false }),
      supabase.from('neighborhoods').select('id,name,uv_code').order('name'),
      supabase.rpc('admin_advertising_campaign_metrics'),
    ])
    setLoading(false)
    const firstError = campaignRes.error || neighborhoodRes.error || metricRes.error
    if (firstError) {
      setError(`No fue posible cargar Publicidad: ${firstError.message}`)
      return
    }
    setCampaigns(campaignRes.data || [])
    setNeighborhoods(neighborhoodRes.data || [])
    setMetrics(Object.fromEntries((metricRes.data || []).map(item => [item.campaign_id, item])))
  }, [])

  // La carga remota es el propósito de este efecto al abrir el módulo.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [load])

  const activeCount = useMemo(() => campaigns.filter(item => item.status === 'active').length, [campaigns])

  const update = (field, value) => setForm(current => ({ ...current, [field]: value }))
  const toggleArrayValue = (field, value) => setForm(current => ({
    ...current,
    [field]: current[field].includes(value)
      ? current[field].filter(item => item !== value)
      : [...current[field], value],
  }))

  const reset = () => {
    clearDraft()
    replaceForm(EMPTY_FORM)
    setEditing(false); setError(''); setNotice('')
  }

  const edit = item => {
    replaceForm({
      id: item.id,
      advertiser_name: item.advertiser_name || '', campaign_name: item.campaign_name || '',
      title: item.title || '', body: item.body || '', image_url: item.image_url || '',
      image_urls: item.image_urls?.length ? item.image_urls : (item.image_url ? [item.image_url] : []),
      label: item.label || 'Patrocinado', cta_label: item.cta_label || 'Conocer más',
      cta_url: item.cta_url || '', placements: item.placements || ['home_feature'],
      neighborhood_ids: (item.targets || []).map(target => target.neighborhood_id),
      starts_at: toLocalInput(item.starts_at), ends_at: toLocalInput(item.ends_at),
      status: item.status || 'draft', priority: item.priority ?? 100,
      contracted_amount: item.contracted_amount ?? '', payment_status: item.payment_status || 'pending',
      internal_notes: item.internal_notes || '',
    })
    setEditing(true); setError(''); setNotice('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const uploadImage = async event => {
    const sources = Array.from(event.target.files || [])
    if (!sources.length) return
    const availableSlots = Math.max(0, 3 - form.image_urls.length)
    const selectedSources = sources.slice(0, availableSlots)
    if (!selectedSources.length) {
      setError('La campaña ya tiene el máximo de tres imágenes.')
      event.target.value = ''
      return
    }
    setUploading(true); setError('')
    try {
      const uploadedUrls = []
      for (const [index, source] of selectedSources.entries()) {
        const prepared = await prepareImageUpload(source, `advertising/${Date.now()}-${index}-${source.name}`, { maxWidth: 1800, maxHeight: 1200 })
        const { error: uploadError } = await supabase.storage.from('commerces').upload(prepared.path, prepared.file, { upsert: false })
        if (uploadError) throw uploadError
        const { data } = supabase.storage.from('commerces').getPublicUrl(prepared.path)
        uploadedUrls.push(data.publicUrl)
      }
      setForm(current => {
        const imageUrls = [...current.image_urls, ...uploadedUrls].slice(0, 3)
        return { ...current, image_urls: imageUrls, image_url: imageUrls[0] || '' }
      })
    } catch (uploadError) {
      setError(`No pudimos cargar la imagen: ${uploadError.message}`)
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  const save = async event => {
    event.preventDefault(); setSaving(true); setError(''); setNotice('')
    if (!form.image_urls.length || !form.neighborhood_ids.length || !form.placements.length) {
      setSaving(false); setError('Agrega una imagen y selecciona al menos un barrio y una ubicación.')
      return
    }
    const { error: saveError } = await supabase.rpc('admin_upsert_advertising_campaign_v2', {
      p_campaign_id: form.id || null,
      p_advertiser_name: form.advertiser_name,
      p_campaign_name: form.campaign_name,
      // El schema conserva estos campos por compatibilidad, pero la app solo
      // muestra la gráfica. Nunca se usan como copy visible del anuncio.
      p_title: form.campaign_name,
      p_body: `Publicidad de ${form.advertiser_name}`,
      p_image_url: form.image_url,
      p_image_urls: form.image_urls,
      p_label: 'Publicidad',
      p_cta_label: 'Abrir',
      p_cta_url: form.cta_url,
      p_placements: form.placements,
      p_neighborhood_ids: form.neighborhood_ids,
      p_starts_at: toIso(form.starts_at),
      p_ends_at: toIso(form.ends_at),
      p_status: form.status,
      p_priority: Number(form.priority || 0),
      p_contracted_amount: form.contracted_amount === '' ? null : Number(form.contracted_amount),
      p_payment_status: form.payment_status,
      p_internal_notes: form.internal_notes,
    })
    setSaving(false)
    if (saveError) return setError(`No fue posible guardar: ${saveError.message}`)
    reset()
    setNotice('Campaña guardada correctamente.')
    await load()
  }

  const changeStatus = async (campaign, status) => {
    setError(''); setNotice('')
    const { error: statusError } = await supabase.from('advertising_campaigns')
      .update({ status, updated_by: profile.id, updated_at: new Date().toISOString() })
      .eq('id', campaign.id)
    if (statusError) return setError(`No pudimos cambiar el estado: ${statusError.message}`)
    setNotice(status === 'paused' ? 'Campaña pausada inmediatamente.' : 'Campaña activada.')
    await load()
  }

  return <div className="advertising-manager">
    <header className="page-heading advertising-heading">
      <div><p className="eyebrow">Monetización responsable</p><h1>Publicidad</h1><p>Campañas nativas, programadas y segmentadas. Si no hay una campaña activa, la app no muestra ningún espacio vacío.</p></div>
      <div className="advertising-summary"><span><b>{activeCount}</b> activas</span><span><b>{campaigns.length}</b> totales</span></div>
    </header>

    {error && <div className="admin-message error">{error}</div>}
    {notice && <div className="admin-message success">{notice}</div>}

    <section className="advertising-editor">
      <header><div><p className="eyebrow">{editing ? 'Editar campaña' : 'Nueva campaña'}</p><h2>{editing ? form.campaign_name : 'Crear publicidad'}</h2></div>{editing && <button type="button" onClick={reset}>Cancelar edición</button>}</header>
      <form onSubmit={save}>
        <label>Anunciante<input required value={form.advertiser_name} onChange={e => update('advertiser_name', e.target.value)} placeholder="Ej: Little Caesars" /></label>
        <label>Nombre interno de campaña<input required value={form.campaign_name} onChange={e => update('campaign_name', e.target.value)} placeholder="Ej: Apertura agosto" /></label>
        <label className="wide">Enlace al tocar la gráfica<input required type="url" value={form.cta_url} onChange={e => update('cta_url', e.target.value)} placeholder="https://..." /></label>
        <label className="wide advertising-image-field">Gráficas (1 a 3)<input type="file" accept="image/*" multiple onChange={uploadImage} disabled={uploading || form.image_urls.length >= 3} />{uploading && <small>Optimizando y cargando…</small>}<small>Formatos admitidos: estándar 1200 × 628 px o franja 1200 × 220 px. Ambos pueden aparecer en cualquiera de las cuatro ubicaciones. Si la campaña tiene varias gráficas, todas deben usar el mismo formato. Toda la información comercial debe venir dentro de la gráfica.</small>{form.image_urls.length > 0 && <span className="advertising-image-list">{form.image_urls.map((url, index) => <span key={url}><img src={url} alt={`Gráfica ${index + 1}`} /><b>{index + 1}</b><button type="button" onClick={() => setForm(current => { const imageUrls = current.image_urls.filter(item => item !== url); return { ...current, image_urls: imageUrls, image_url: imageUrls[0] || '' } })}>Quitar</button></span>)}</span>}</label>

        <fieldset className="wide"><legend>Ubicaciones en la app</legend><div className="advertising-check-grid">
          <label><input type="checkbox" checked={form.placements.includes('home_feature')} onChange={() => toggleArrayValue('placements', 'home_feature')} /><span><b>Inicio</b><small>Formato estándar o franja bajo “Para ti”.</small></span></label>
          <label><input type="checkbox" checked={form.placements.includes('activity_feed')} onChange={() => toggleArrayValue('placements', 'activity_feed')} /><span><b>Actividad</b><small>Formato estándar o franja después de la tercera publicación.</small></span></label>
          <label><input type="checkbox" checked={form.placements.includes('services_feed')} onChange={() => toggleArrayValue('placements', 'services_feed')} /><span><b>Servicios</b><small>Entre destacados y el listado de servicios.</small></span></label>
          <label><input type="checkbox" checked={form.placements.includes('commerces_feed')} onChange={() => toggleArrayValue('placements', 'commerces_feed')} /><span><b>Comercios</b><small>Entre destacados y comercios cercanos.</small></span></label>
        </div></fieldset>

        <fieldset className="wide"><legend>Barrios</legend><div className="advertising-neighborhoods">
          {neighborhoods.map(item => <label key={item.id}><input type="checkbox" checked={form.neighborhood_ids.includes(item.id)} onChange={() => toggleArrayValue('neighborhood_ids', item.id)} />{item.name}{item.uv_code ? ` · UV ${item.uv_code}` : ''}</label>)}
        </div></fieldset>

        <label>Comienza<input required type="datetime-local" value={form.starts_at} onChange={e => update('starts_at', e.target.value)} /></label>
        <label>Termina <small>(opcional)</small><input type="datetime-local" value={form.ends_at} onChange={e => update('ends_at', e.target.value)} /></label>
        <label>Estado<select value={form.status} onChange={e => update('status', e.target.value)}>{Object.entries(STATUS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
        <label>Prioridad<input type="number" min="0" max="1000" value={form.priority} onChange={e => update('priority', e.target.value)} /></label>
        <label>Monto contratado<input type="number" min="0" step="1" value={form.contracted_amount} onChange={e => update('contracted_amount', e.target.value)} placeholder="$" /></label>
        <label>Pago<select value={form.payment_status} onChange={e => update('payment_status', e.target.value)}>{Object.entries(PAYMENT).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
        <label className="wide">Notas internas<textarea rows="2" value={form.internal_notes} onChange={e => update('internal_notes', e.target.value)} placeholder="Contacto, condiciones, comprobante u observaciones. No se muestra en la app." /></label>
        <footer className="wide"><button type="button" onClick={reset}>Limpiar</button><button type="submit" disabled={saving || uploading}>{saving ? 'Guardando…' : 'Guardar campaña'}</button></footer>
      </form>
    </section>

    <section className="advertising-list">
      <header><div><p className="eyebrow">Historial y control</p><h2>Campañas</h2></div><button type="button" onClick={load}>Actualizar</button></header>
      {loading && <p className="advertising-empty">Cargando campañas…</p>}
      {!loading && campaigns.length === 0 && <p className="advertising-empty">Todavía no hay campañas. Puedes dejar una como borrador antes de activarla.</p>}
      <div className="advertising-grid">{campaigns.map(item => {
        const campaignMetrics = metrics[item.id] || {}
        const creativeUrl = item.image_urls?.[0] || item.image_url
        const creativeCount = item.image_urls?.length || 1
        const ctr = Number(campaignMetrics.impressions) > 0 ? (Number(campaignMetrics.clicks || 0) / Number(campaignMetrics.impressions) * 100).toFixed(1) : '0.0'
        return <article key={item.id} className={`advertising-card is-${item.status}`}>
          <div className="advertising-card-cover"><img src={creativeUrl} alt="" />{creativeCount > 1 && <span>{creativeCount} imágenes</span>}</div>
          <div className="advertising-card-body">
            <div className="advertising-card-state"><span>{STATUS[item.status] || item.status}</span><small>{item.advertiser_name}</small></div>
            <h3>{item.campaign_name}</h3>
            <div className="advertising-card-identification">
              <div>{(item.placements || []).map(placement => <span key={placement}>{PLACEMENT[placement] || placement}</span>)}</div>
              <CreativeFormat url={creativeUrl} count={creativeCount} />
            </div>
            <p>{item.cta_url}</p>
            <div className="advertising-card-metrics"><span><b>{campaignMetrics.impressions || 0}</b> impresiones</span><span><b>{campaignMetrics.clicks || 0}</b> clics</span><span><b>{ctr}%</b> CTR</span></div>
            <small>{new Date(item.starts_at).toLocaleString('es-CL')}{item.ends_at ? ` → ${new Date(item.ends_at).toLocaleString('es-CL')}` : ' · sin fecha de término'}</small>
            <footer><button type="button" onClick={() => edit(item)}>Editar</button>{item.status === 'active' ? <button className="pause" type="button" onClick={() => changeStatus(item, 'paused')}>Pausar ahora</button> : <button className="activate" type="button" onClick={() => changeStatus(item, 'active')}>Activar</button>}</footer>
          </div>
        </article>
      })}</div>
    </section>
  </div>
}
