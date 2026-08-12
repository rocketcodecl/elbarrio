import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import usePersistentDraft from '../hooks/usePersistentDraft.js'
import { prepareImageUpload } from '../../../shared/imageUpload.js'

const EMPTY_FORM = {
  id: '', advertiser_name: '', campaign_name: '', title: '', body: '', image_url: '',
  label: 'Patrocinado', cta_label: 'Conocer más', cta_url: '',
  placements: ['home_feature'], neighborhood_ids: [], starts_at: '', ends_at: '',
  status: 'draft', priority: 100, contracted_amount: '', payment_status: 'pending',
  internal_notes: '',
}

const STATUS = { draft: 'Borrador', active: 'Activa', paused: 'Pausada', finished: 'Finalizada' }
const PAYMENT = { pending: 'Pendiente', paid: 'Pagada', courtesy: 'Cortesía', cancelled: 'Cancelada' }

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
  const [form, setForm, clearDraft, replaceForm] = usePersistentDraft('advertising:campaign', EMPTY_FORM, 'v1')
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
    const source = event.target.files?.[0]
    if (!source) return
    setUploading(true); setError('')
    try {
      const prepared = await prepareImageUpload(source, `advertising/${Date.now()}-${source.name}`, { maxWidth: 1800, maxHeight: 1200 })
      const { error: uploadError } = await supabase.storage.from('commerces').upload(prepared.path, prepared.file, { upsert: false })
      if (uploadError) throw uploadError
      const { data } = supabase.storage.from('commerces').getPublicUrl(prepared.path)
      update('image_url', data.publicUrl)
    } catch (uploadError) {
      setError(`No pudimos cargar la imagen: ${uploadError.message}`)
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  const save = async event => {
    event.preventDefault(); setSaving(true); setError(''); setNotice('')
    if (!form.image_url || !form.neighborhood_ids.length || !form.placements.length) {
      setSaving(false); setError('Agrega una imagen y selecciona al menos un barrio y una ubicación.')
      return
    }
    const { error: saveError } = await supabase.rpc('admin_upsert_advertising_campaign', {
      p_campaign_id: form.id || null,
      p_advertiser_name: form.advertiser_name,
      p_campaign_name: form.campaign_name,
      p_title: form.title,
      p_body: form.body,
      p_image_url: form.image_url,
      p_label: form.label,
      p_cta_label: form.cta_label,
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
        <label className="wide">Título visible<input required value={form.title} onChange={e => update('title', e.target.value)} placeholder="Una oferta cerca de ti" /></label>
        <label className="wide">Texto visible<textarea required rows="3" value={form.body} onChange={e => update('body', e.target.value)} placeholder="Descripción breve, clara y útil para los vecinos." /></label>
        <label>Etiqueta<input value={form.label} onChange={e => update('label', e.target.value)} placeholder="Patrocinado" /></label>
        <label>Texto del botón<input value={form.cta_label} onChange={e => update('cta_label', e.target.value)} placeholder="Conocer más" /></label>
        <label className="wide">Enlace externo<input required type="url" value={form.cta_url} onChange={e => update('cta_url', e.target.value)} placeholder="https://..." /></label>
        <label className="wide advertising-image-field">Imagen<input type="file" accept="image/*" onChange={uploadImage} disabled={uploading} />{uploading && <small>Optimizando y cargando…</small>}{form.image_url && <img src={form.image_url} alt="Vista previa de la campaña" />}</label>

        <fieldset className="wide"><legend>Ubicaciones en la app</legend><div className="advertising-check-grid">
          <label><input type="checkbox" checked={form.placements.includes('home_feature')} onChange={() => toggleArrayValue('placements', 'home_feature')} /><span><b>Inicio</b><small>Tarjeta destacada bajo el carrusel.</small></span></label>
          <label><input type="checkbox" checked={form.placements.includes('activity_feed')} onChange={() => toggleArrayValue('placements', 'activity_feed')} /><span><b>Actividad</b><small>Tarjeta nativa dentro del feed.</small></span></label>
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
        const ctr = Number(campaignMetrics.impressions) > 0 ? (Number(campaignMetrics.clicks || 0) / Number(campaignMetrics.impressions) * 100).toFixed(1) : '0.0'
        return <article key={item.id} className={`advertising-card is-${item.status}`}>
          <img src={item.image_url} alt="" />
          <div className="advertising-card-body">
            <div className="advertising-card-state"><span>{STATUS[item.status] || item.status}</span><small>{item.advertiser_name}</small></div>
            <h3>{item.title}</h3><p>{item.body}</p>
            <div className="advertising-card-metrics"><span><b>{campaignMetrics.impressions || 0}</b> impresiones</span><span><b>{campaignMetrics.clicks || 0}</b> clics</span><span><b>{ctr}%</b> CTR</span></div>
            <small>{new Date(item.starts_at).toLocaleString('es-CL')}{item.ends_at ? ` → ${new Date(item.ends_at).toLocaleString('es-CL')}` : ' · sin fecha de término'}</small>
            <footer><button type="button" onClick={() => edit(item)}>Editar</button>{item.status === 'active' ? <button className="pause" type="button" onClick={() => changeStatus(item, 'paused')}>Pausar ahora</button> : <button className="activate" type="button" onClick={() => changeStatus(item, 'active')}>Activar</button>}</footer>
          </div>
        </article>
      })}</div>
    </section>
  </div>
}
