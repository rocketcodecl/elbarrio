import { useCallback, useEffect, useMemo, useState } from 'react'
import { CircleMarker, GeoJSON, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import { supabase } from '../lib/supabase.js'
import { BARRIO_BETA_BOUNDARY } from '../../../src/data/barrioBetaBoundary.js'

const STATUS = {
  new: ['Por revisar', '#64748b'],
  contacted: ['Contactado', '#2563eb'],
  interested: ['Interesado', '#d97706'],
  converted: ['Incorporado', '#16a34a'],
  discarded: ['Descartado', '#94a3b8'],
}

const CATEGORY_LABELS = {
  Almacén: 'Almacenes', Panadería: 'Panaderías', Cafetería: 'Cafeterías', Restaurante: 'Restaurantes',
  Farmacia: 'Farmacias', Ferretería: 'Ferreterías', Peluquería: 'Peluquerías', Mascotas: 'Mascotas',
  Verdulería: 'Verdulerías', Librería: 'Librerías', Ropa: 'Ropa', Salud: 'Salud', Otro: 'Otros',
}

const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

const distanceMeters = (a, b) => {
  const toRad = value => value * Math.PI / 180
  const earth = 6371000
  const dLat = toRad(Number(b.lat) - Number(a.latitude))
  const dLng = toRad(Number(b.lng) - Number(a.longitude))
  const lat1 = toRad(Number(a.latitude)); const lat2 = toRad(Number(b.lat))
  const value = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return earth * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value))
}

const polygonFeature = neighborhood => {
  const geometry = neighborhood?.boundary
  if (geometry?.type && geometry?.coordinates) return { type: 'Feature', properties: { name: neighborhood.name }, geometry }
  return BARRIO_BETA_BOUNDARY
}

function FitBoundary({ feature }) {
  const map = useMap()
  useEffect(() => {
    if (!feature) return
    const layer = new L.GeoJSON(feature)
    const bounds = layer.getBounds()
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [24, 24], animate: false })
  }, [feature, map])
  return null
}

export default function CommercialRadar({ profile, onNavigate }) {
  const [neighborhoods, setNeighborhoods] = useState([])
  const [neighborhoodId, setNeighborhoodId] = useState(profile?.is_superadmin ? '' : profile?.neighborhood_id || '')
  const [prospects, setProspects] = useState([])
  const [commerces, setCommerces] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [saving, setSaving] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [edit, setEdit] = useState({ status: 'new', contact_name: '', notes: '' })

  const neighborhood = neighborhoods.find(item => item.id === neighborhoodId) || null
  const boundary = useMemo(() => polygonFeature(neighborhood), [neighborhood])

  const load = useCallback(async selectedNeighborhoodId => {
    if (!selectedNeighborhoodId) { setProspects([]); setCommerces([]); setLoading(false); return }
    setLoading(true); setError('')
    const [prospectResult, commerceResult] = await Promise.all([
      supabase.from('commercial_prospects').select('*').eq('neighborhood_id', selectedNeighborhoodId).order('updated_at', { ascending: false }).limit(2000),
      supabase.from('commerces').select('id, name, category, address, lat, lng, is_active').eq('neighborhood_id', selectedNeighborhoodId).limit(1000),
    ])
    if (prospectResult.error) setError(`No fue posible cargar el radar: ${prospectResult.error.message}`)
    else setProspects(prospectResult.data || [])
    if (!commerceResult.error) setCommerces(commerceResult.data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    supabase.from('neighborhoods').select('id, name, uv_code, is_beta, boundary').order('name').then(({ data, error: loadError }) => {
      if (loadError) { setError('No fue posible cargar los barrios.'); setLoading(false); return }
      const rows = data || []
      setNeighborhoods(rows)
      setNeighborhoodId(current => current || rows.find(item => item.is_beta)?.id || rows[0]?.id || '')
    })
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => load(neighborhoodId), 0)
    return () => window.clearTimeout(timer)
  }, [load, neighborhoodId])

  const withExisting = useMemo(() => prospects.map(prospect => {
    const prospectName = normalize(prospect.name)
    const match = commerces.find(commerce => {
      if (prospect.converted_commerce_id === commerce.id) return true
      if (prospectName && prospectName === normalize(commerce.name)) return true
      return commerce.lat != null && commerce.lng != null && distanceMeters(prospect, commerce) <= 30
    })
    return { ...prospect, existingCommerce: match || null }
  }), [commerces, prospects])

  const filtered = useMemo(() => {
    const needle = normalize(query)
    return withExisting.filter(item => {
      const textMatch = !needle || normalize([item.name, item.address, item.category, item.source_type].join(' ')).includes(needle)
      const statusMatch = statusFilter === 'all' || item.status === statusFilter
      const categoryMatch = categoryFilter === 'all' || item.category === categoryFilter
      return textMatch && statusMatch && categoryMatch
    })
  }, [categoryFilter, query, statusFilter, withExisting])

  const selected = withExisting.find(item => item.id === selectedId) || null

  const openProspect = item => {
    setSelectedId(item.id)
    setEdit({ status: item.status, contact_name: item.contact_name || '', notes: item.notes || '' })
  }

  const scan = async () => {
    if (!neighborhoodId || !boundary) return
    setScanning(true); setError(''); setNotice('')
    try {
      const { data, error: discoveryError } = await supabase.functions.invoke('admin-discover-commerces', { body: { neighborhood_id: neighborhoodId } })
      if (discoveryError) throw discoveryError
      if (data?.error) throw new Error(data.error)
      await load(neighborhoodId)
      setNotice(`${data?.count || 0} comercios detectados dentro del polígono.`)
    } catch (scanError) {
      setError(scanError?.message || 'No fue posible consultar OpenStreetMap.')
    } finally {
      setScanning(false)
    }
  }

  const saveProspect = async () => {
    if (!selected) return
    setSaving('prospect'); setError('')
    const patch = {
      status: edit.status,
      contact_name: edit.contact_name.trim() || null,
      notes: edit.notes.trim() || null,
      last_contact_at: edit.status === 'contacted' || edit.status === 'interested' ? new Date().toISOString() : selected.last_contact_at,
      updated_by: profile.id,
      updated_at: new Date().toISOString(),
    }
    const { error: updateError } = await supabase.from('commercial_prospects').update(patch).eq('id', selected.id)
    setSaving('')
    if (updateError) return setError(updateError.message)
    setProspects(current => current.map(item => item.id === selected.id ? { ...item, ...patch } : item))
    setNotice('Seguimiento guardado.')
  }

  const convert = async () => {
    if (!selected || selected.existingCommerce) return
    setSaving('convert'); setError('')
    const commercePayload = {
      neighborhood_id: selected.neighborhood_id,
      name: selected.name,
      category: selected.category || 'Otro',
      categories: [selected.category || 'Otro'],
      description: 'Ficha pendiente de completar desde el Radar comercial.',
      address: selected.address || null,
      lat: selected.latitude,
      lng: selected.longitude,
      phone: selected.phone || null,
      website: selected.website || null,
      is_active: false,
      is_premium: false,
    }
    const { data: commerce, error: commerceError } = await supabase.from('commerces').insert(commercePayload).select('id, name, category, address, lat, lng, is_active').single()
    if (commerceError) { setSaving(''); setError(commerceError.message); return }
    const patch = { status: 'converted', converted_commerce_id: commerce.id, updated_by: profile.id, updated_at: new Date().toISOString() }
    const { error: updateError } = await supabase.from('commercial_prospects').update(patch).eq('id', selected.id)
    setSaving('')
    if (updateError) return setError(`El borrador se creó, pero faltó enlazarlo al radar: ${updateError.message}`)
    setCommerces(current => [...current, commerce])
    setProspects(current => current.map(item => item.id === selected.id ? { ...item, ...patch } : item))
    setNotice('Borrador creado en Comercios. Sigue inactivo hasta que completes y publiques su ficha.')
  }

  const exportCsv = () => {
    const clean = value => `"${String(value ?? '').replaceAll('"', '""')}"`
    const lines = [['Nombre', 'Categoría', 'Dirección', 'Teléfono', 'Estado', 'Contacto', 'Notas', 'Latitud', 'Longitud'], ...filtered.map(item => [item.name, item.category, item.address, item.phone, STATUS[item.status]?.[0], item.contact_name, item.notes, item.latitude, item.longitude])]
    const blob = new Blob([`\ufeff${lines.map(row => row.map(clean).join(';')).join('\n')}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `radar-comercial-${new Date().toISOString().slice(0, 10)}.csv`; anchor.click()
    URL.revokeObjectURL(url)
  }

  const counts = useMemo(() => ({
    total: withExisting.length,
    new: withExisting.filter(item => item.status === 'new').length,
    contacted: withExisting.filter(item => ['contacted', 'interested'].includes(item.status)).length,
    converted: withExisting.filter(item => item.status === 'converted' || item.existingCommerce).length,
  }), [withExisting])

  return (
    <div className="commercial-radar-page">
      <section className="page-heading radar-heading">
        <div><p className="eyebrow">Captación territorial</p><h1>Radar comercial</h1><p>Descubre y organiza negocios reales dentro del polígono, sin publicarlos automáticamente en la app.</p></div>
        <div className="radar-heading-actions"><button className="button button-secondary" type="button" onClick={exportCsv} disabled={!filtered.length}>Exportar CSV</button><button className="button button-primary" type="button" onClick={scan} disabled={scanning || !neighborhoodId}>{scanning ? 'Explorando el barrio…' : '⌖ Actualizar desde OpenStreetMap'}</button></div>
      </section>
      {error && <div className="admin-alert" role="alert"><span>⚠️</span><p>{error}</p><button type="button" onClick={() => setError('')}>×</button></div>}
      {notice && <div className="admin-toast">✓ {notice}</div>}
      <section className="radar-controls">
        <label>Barrio<select value={neighborhoodId} onChange={event => { setNeighborhoodId(event.target.value); setSelectedId(null) }}>{neighborhoods.map(item => <option value={item.id} key={item.id}>{item.name}{item.uv_code ? ` · UV ${item.uv_code}` : ''}</option>)}</select></label>
        <div className="radar-metrics"><span><strong>{counts.total}</strong>Detectados</span><span><strong>{counts.new}</strong>Por revisar</span><span><strong>{counts.contacted}</strong>En gestión</span><span><strong>{counts.converted}</strong>Incorporados</span></div>
      </section>
      <section className="radar-workspace">
        <div className="radar-map-card">
          <MapContainer className="commercial-radar-map" center={[-33.425, -70.572]} zoom={15} scrollWheelZoom>
            <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" subdomains="abcd" maxZoom={20} attribution="&copy; OpenStreetMap &copy; CARTO" />
            <GeoJSON key={neighborhoodId || 'boundary'} data={boundary} style={{ color: '#16a34a', weight: 3, fillColor: '#16a34a', fillOpacity: 0.08 }} />
            <FitBoundary feature={boundary} />
            {filtered.map(item => <CircleMarker key={item.id} center={[item.latitude, item.longitude]} radius={item.id === selectedId ? 9 : 6} pathOptions={{ color: item.existingCommerce ? '#0f5f36' : STATUS[item.status]?.[1], fillColor: item.existingCommerce ? '#16a34a' : STATUS[item.status]?.[1], fillOpacity: 0.88, weight: item.id === selectedId ? 3 : 2 }} eventHandlers={{ click: () => openProspect(item) }}><Popup><strong>{item.name}</strong><br />{item.category}<br />{item.address || 'Sin dirección registrada'}</Popup></CircleMarker>)}
          </MapContainer>
          <div className="radar-map-legend"><span><i className="new" />Por revisar</span><span><i className="contacted" />Contactado</span><span><i className="interested" />Interesado</span><span><i className="converted" />Incorporado</span></div>
        </div>
        <div className="radar-directory">
          <header><label className="admin-search"><span>⌕</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar nombre, rubro o dirección…" /></label><div><select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="all">Todos los estados</option>{Object.entries(STATUS).map(([value, [label]]) => <option value={value} key={value}>{label}</option>)}</select><select value={categoryFilter} onChange={event => setCategoryFilter(event.target.value)}><option value="all">Todos los rubros</option>{Object.entries(CATEGORY_LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></div></header>
          <div className="radar-list">{loading ? <div className="panel-loading">Cargando radar…</div> : filtered.length ? filtered.map(item => <button type="button" key={item.id} className={item.id === selectedId ? 'is-selected' : ''} onClick={() => openProspect(item)}><span className="radar-list-dot" style={{ background: item.existingCommerce ? '#16a34a' : STATUS[item.status]?.[1] }} /><div><strong>{item.name}</strong><small>{item.category} · {item.address || 'Sin dirección'}</small></div>{item.existingCommerce ? <em>En Comercios</em> : <em>{STATUS[item.status]?.[0]}</em>}</button>) : <div className="panel-empty"><strong>Sin resultados</strong><small>Actualiza desde OpenStreetMap para descubrir comercios dentro de la zona.</small></div>}</div>
        </div>
      </section>
      {selected && <aside className="radar-detail">
        <header><div><p className="eyebrow">Prospecto comercial</p><h2>{selected.name}</h2><span>{selected.category} · {selected.source_type}</span></div><button type="button" onClick={() => setSelectedId(null)}>×</button></header>
        <div className="radar-detail-body"><div className="radar-detail-location"><strong>{selected.address || 'Dirección no registrada en OpenStreetMap'}</strong><small>{selected.latitude.toFixed(6)}, {selected.longitude.toFixed(6)}</small></div>{selected.phone && <a href={`tel:${selected.phone}`}>☎ {selected.phone}</a>}{selected.website && <a href={selected.website} target="_blank" rel="noreferrer">↗ Abrir sitio web</a>}{selected.existingCommerce && <div className="radar-existing">✓ Ya existe en Comercios como <strong>{selected.existingCommerce.name}</strong>{selected.existingCommerce.is_active ? ' y está publicado.' : ', pero permanece inactivo.'}</div>}<label>Estado<select value={edit.status} onChange={event => setEdit(current => ({ ...current, status: event.target.value }))}>{Object.entries(STATUS).map(([value, [label]]) => <option value={value} key={value}>{label}</option>)}</select></label><label>Persona de contacto<input value={edit.contact_name} onChange={event => setEdit(current => ({ ...current, contact_name: event.target.value }))} placeholder="Nombre o cargo" /></label><label>Notas<textarea rows="5" value={edit.notes} onChange={event => setEdit(current => ({ ...current, notes: event.target.value }))} placeholder="Conversación, teléfono pendiente, próxima acción…" /></label></div>
        <footer><button className="button button-secondary" type="button" onClick={saveProspect} disabled={!!saving}>{saving === 'prospect' ? 'Guardando…' : 'Guardar seguimiento'}</button>{selected.existingCommerce ? <button className="button button-primary" type="button" onClick={() => onNavigate('comercios')}>Abrir Comercios</button> : <button className="button button-primary" type="button" onClick={convert} disabled={!!saving}>{saving === 'convert' ? 'Creando…' : 'Crear borrador en Comercios'}</button>}</footer>
      </aside>}
    </div>
  )
}
