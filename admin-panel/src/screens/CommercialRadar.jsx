import { useCallback, useEffect, useMemo, useState } from 'react'
import { CircleMarker, GeoJSON, MapContainer, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { supabase } from '../lib/supabase.js'
import { BARRIO_BETA_BOUNDARY } from '../../../src/data/barrioBetaBoundary.js'

const STATUS = {
  new: ['Por revisar', '#64748b'],
  to_contact: ['Por contactar', '#475569'],
  contacted: ['Contactado', '#2563eb'],
  visit_scheduled: ['Visita agendada', '#7c3aed'],
  interested: ['Interesado', '#d97706'],
  proposal_sent: ['Propuesta enviada', '#ea580c'],
  converted: ['Incorporado', '#16a34a'],
  discarded: ['Descartado', '#94a3b8'],
}

const PIPELINE_STATUS = Object.entries(STATUS).filter(([value]) => value !== 'discarded')

const EMPTY_EDIT = {
  name: '', category: 'Otro', source_type: '', address: '', phone: '', whatsapp: '', email: '', website: '', social_url: '',
  status: 'new', contact_name: '', notes: '', next_follow_up_at: '',
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

function MapClickCapture({ active, onPick }) {
  useMapEvents({ click: event => { if (active) onPick(event.latlng) } })
  return null
}

const pointInsideFeature = ([longitude, latitude], feature) => {
  const geometry = feature?.geometry
  const rings = geometry?.type === 'Polygon' ? [geometry.coordinates[0]] : geometry?.type === 'MultiPolygon' ? geometry.coordinates.map(polygon => polygon[0]) : []
  return rings.some(ring => {
    let inside = false
    for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
      const [xi, yi] = ring[index]; const [xj, yj] = ring[previous]
      if ((yi > latitude) !== (yj > latitude) && longitude < ((xj - xi) * (latitude - yi)) / (yj - yi) + xi) inside = !inside
    }
    return inside
  })
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
  const [sourceFilter, setSourceFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [saving, setSaving] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [edit, setEdit] = useState(EMPTY_EDIT)
  const [placing, setPlacing] = useState(false)
  const [manualDraft, setManualDraft] = useState(null)
  const [interactions, setInteractions] = useState([])
  const [interaction, setInteraction] = useState({ interaction_type: 'note', summary: '', scheduled_for: '' })
  const [googleTerm, setGoogleTerm] = useState('comercios')
  const [googlePlaces, setGooglePlaces] = useState([])
  const [googleScope, setGoogleScope] = useState(null)
  const [googleSearching, setGoogleSearching] = useState(false)
  const [googleUsage, setGoogleUsage] = useState(null)

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
      const statusMatch = statusFilter === 'all' ? item.status !== 'discarded' : item.status === statusFilter
      const categoryMatch = categoryFilter === 'all' || item.category === categoryFilter
      const sourceMatch = sourceFilter === 'all' || item.source === sourceFilter
      return textMatch && statusMatch && categoryMatch && sourceMatch
    })
  }, [categoryFilter, query, sourceFilter, statusFilter, withExisting])

  const selected = manualDraft || withExisting.find(item => item.id === selectedId) || null

  const comparedGooglePlaces = useMemo(() => googlePlaces.map(place => {
    const linked = withExisting.find(item => item.google_place_id === place.id)
    const nearby = linked || withExisting.find(item => {
      const meters = distanceMeters(item, { lat: place.latitude, lng: place.longitude })
      const sameName = normalize(item.name) === normalize(place.name)
      return meters <= 25 || (sameName && meters <= 120)
    })
    return { ...place, matchedProspect: nearby || null }
  }), [googlePlaces, withExisting])

  const openProspect = item => {
    setManualDraft(null)
    setInteractions([])
    setSelectedId(item.id)
    setEdit({
      name: item.name || '', category: item.category || 'Otro', source_type: item.source_type || '', address: item.address || '',
      phone: item.phone || '', whatsapp: item.whatsapp || '', email: item.email || item.raw_data?.emails?.[0] || '', website: item.website || '',
      social_url: item.social_url || item.raw_data?.socials?.[0] || '', status: item.status || 'new', contact_name: item.contact_name || '',
      notes: item.notes || '', next_follow_up_at: item.next_follow_up_at ? new Date(item.next_follow_up_at).toISOString().slice(0, 16) : '',
    })
  }

  useEffect(() => {
    if (!selectedId) return undefined
    let cancelled = false
    supabase.from('commercial_prospect_interactions').select('*').eq('prospect_id', selectedId).order('created_at', { ascending: false }).limit(100)
      .then(({ data, error: historyError }) => {
        if (cancelled) return
        if (historyError) setError(`No fue posible cargar la cronología: ${historyError.message}`)
        else setInteractions(data || [])
      })
    return () => { cancelled = true }
  }, [selectedId])

  const pickManualLocation = latlng => {
    if (!pointInsideFeature([latlng.lng, latlng.lat], boundary)) {
      setError('El punto debe quedar dentro del polígono del barrio.')
      return
    }
    setPlacing(false); setSelectedId(null)
    setManualDraft({ id: `manual-${crypto.randomUUID()}`, isNew: true, source: 'manual', latitude: latlng.lat, longitude: latlng.lng })
    setEdit({ ...EMPTY_EDIT, source_type: 'comercio_manual' })
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

  const runGoogleComparison = async payload => {
    setGoogleSearching(true); setError(''); setNotice('')
    try {
      const { data, error: googleError } = await supabase.functions.invoke('admin-google-places-radar', { body: { neighborhood_id: neighborhoodId, ...payload } })
      if (googleError) throw googleError
      if (data?.error) throw new Error(data.error)
      setGooglePlaces(data?.places || [])
      setGoogleUsage(data?.usage || null)
      setGoogleScope(payload.action === 'prospect_match' || payload.action === 'place_details' ? { kind: 'prospect', prospectId: payload.prospect_id || selected?.id } : { kind: 'area' })
    } catch (googleError) {
      setError(googleError?.message || 'No fue posible consultar Google Places.')
    } finally {
      setGoogleSearching(false)
    }
  }

  const searchGoogleArea = event => {
    event.preventDefault()
    if (!googleTerm.trim()) return setError('Escribe qué tipo de comercio quieres buscar.')
    runGoogleComparison({ action: 'area_search', search_term: googleTerm.trim() })
  }

  const checkSelectedWithGoogle = () => {
    if (!selected || selected.isNew) return
    runGoogleComparison(selected.google_place_id
      ? { action: 'place_details', place_id: selected.google_place_id, prospect_id: selected.id }
      : { action: 'prospect_match', prospect_id: selected.id })
  }

  const linkGooglePlace = async (place, prospect) => {
    if (!prospect || !place?.id) return
    if (!window.confirm(`¿Vincular “${prospect.name}” con este resultado de Google Maps? Solo se guardará su identificador.`)) return
    setSaving('google-link'); setError('')
    const patch = { google_place_id: place.id, google_linked_at: new Date().toISOString(), google_linked_by: profile.id, updated_by: profile.id, updated_at: new Date().toISOString() }
    const { error: linkError } = await supabase.from('commercial_prospects').update(patch).eq('id', prospect.id)
    if (!linkError) await supabase.from('commercial_prospect_interactions').insert({ prospect_id: prospect.id, admin_profile_id: profile.id, interaction_type: 'verification', summary: 'Ficha vinculada manualmente con un identificador de Google Maps.' })
    setSaving('')
    if (linkError) return setError(`No fue posible vincular: ${linkError.message}`)
    setProspects(current => current.map(item => item.id === prospect.id ? { ...item, ...patch } : item))
    setNotice('Identificador de Google Maps vinculado. Los datos seguirán consultándose en vivo.')
  }

  const saveProspect = async () => {
    if (!selected) return
    if (!edit.name.trim()) return setError('El nombre del comercio es obligatorio.')
    setSaving('prospect'); setError('')
    const patch = {
      name: edit.name.trim(),
      category: edit.category || 'Otro',
      source_type: edit.source_type.trim() || null,
      address: edit.address.trim() || null,
      phone: edit.phone.trim() || null,
      whatsapp: edit.whatsapp.trim() || null,
      email: edit.email.trim().toLowerCase() || null,
      website: edit.website.trim() || null,
      social_url: edit.social_url.trim() || null,
      status: edit.status,
      contact_name: edit.contact_name.trim() || null,
      notes: edit.notes.trim() || null,
      next_follow_up_at: edit.next_follow_up_at ? new Date(edit.next_follow_up_at).toISOString() : null,
      last_contact_at: ['contacted', 'visit_scheduled', 'interested', 'proposal_sent'].includes(edit.status) ? new Date().toISOString() : selected.last_contact_at,
      updated_by: profile.id,
      updated_at: new Date().toISOString(),
    }
    const request = selected.isNew
      ? supabase.from('commercial_prospects').insert({ ...patch, neighborhood_id: neighborhoodId, source: 'manual', source_id: selected.id, latitude: selected.latitude, longitude: selected.longitude, created_by: profile.id }).select().single()
      : supabase.from('commercial_prospects').update(patch).eq('id', selected.id).select().single()
    const { data: saved, error: updateError } = await request
    setSaving('')
    if (updateError) return setError(updateError.message)
    if (selected.isNew) {
      setManualDraft(null); setProspects(current => [saved, ...current]); openProspect(saved)
    } else setProspects(current => current.map(item => item.id === selected.id ? { ...item, ...patch } : item))
    await supabase.from('commercial_prospect_interactions').insert({ prospect_id: saved.id, admin_profile_id: profile.id, interaction_type: 'status', summary: selected.isNew ? 'Prospecto agregado manualmente al mapa.' : `Ficha actualizada · ${STATUS[edit.status]?.[0] || edit.status}` })
    setNotice(selected.isNew ? 'Prospecto agregado al CRM.' : 'Ficha y seguimiento guardados.')
  }

  const verifyProspect = async () => {
    if (!selected || selected.isNew) return
    setSaving('verify'); setError('')
    const patch = { verified_at: new Date().toISOString(), verified_by: profile.id, updated_by: profile.id, updated_at: new Date().toISOString() }
    const { error: verifyError } = await supabase.from('commercial_prospects').update(patch).eq('id', selected.id)
    if (!verifyError) await supabase.from('commercial_prospect_interactions').insert({ prospect_id: selected.id, admin_profile_id: profile.id, interaction_type: 'verification', summary: 'Prospecto verificado por el superadministrador.' })
    setSaving('')
    if (verifyError) return setError(verifyError.message)
    setProspects(current => current.map(item => item.id === selected.id ? { ...item, ...patch } : item))
    setNotice('Prospecto verificado. Continúa privado hasta que decidas publicarlo.')
  }

  const setDiscarded = async discard => {
    if (!selected || selected.isNew) return
    if (discard) {
      const suffix = selected.existingCommerce
        ? ' Esto solo lo quitará del Radar; la ficha publicada en Comercios no será modificada.'
        : ' Podrás restaurarlo más adelante desde el filtro “Descartados”.'
      if (!window.confirm(`¿Quitar “${selected.name || edit.name}” del Radar?${suffix}`)) return
    }
    setSaving(discard ? 'discard' : 'restore'); setError(''); setNotice('')
    const patch = { status: discard ? 'discarded' : 'new', updated_by: profile.id, updated_at: new Date().toISOString() }
    const { error: updateError } = await supabase.from('commercial_prospects').update(patch).eq('id', selected.id)
    if (!updateError) {
      await supabase.from('commercial_prospect_interactions').insert({
        prospect_id: selected.id,
        admin_profile_id: profile.id,
        interaction_type: 'status',
        summary: discard ? 'Prospecto descartado y retirado del Radar.' : 'Prospecto restaurado al Radar para revisión.',
      })
    }
    setSaving('')
    if (updateError) return setError(updateError.message)
    setProspects(current => current.map(item => item.id === selected.id ? { ...item, ...patch } : item))
    setSelectedId(null); setManualDraft(null)
    setNotice(discard ? 'Comercio quitado del Radar. Puedes recuperarlo desde “Descartados”.' : 'Comercio restaurado al Radar.')
  }

  const convert = async publish => {
    if (!selected || selected.isNew || selected.existingCommerce) return
    if (publish && !window.confirm(`Se creará una ficha básica visible para los vecinos de “${edit.name.trim()}”. ¿Publicar ahora?`)) return
    setSaving('convert'); setError('')
    const commercePayload = {
      neighborhood_id: selected.neighborhood_id || neighborhoodId,
      name: edit.name.trim(),
      category: edit.category || 'Otro',
      categories: [edit.category || 'Otro'],
      description: 'Comercio local verificado por El Barrio. Ficha básica pendiente de completar con el comercio.',
      address: edit.address.trim() || null,
      lat: selected.latitude,
      lng: selected.longitude,
      phone: edit.phone.trim() || null,
      whatsapp: edit.whatsapp.trim() || null,
      email: edit.email.trim().toLowerCase() || null,
      website: edit.website.trim() || null,
      instagram: edit.social_url.trim() || null,
      is_active: !!publish,
      is_premium: false,
    }
    const { data: commerce, error: commerceError } = await supabase.from('commerces').insert(commercePayload).select('id, name, category, address, lat, lng, is_active').single()
    if (commerceError) { setSaving(''); setError(commerceError.message); return }
    const patch = { status: 'converted', converted_commerce_id: commerce.id, verified_at: selected.verified_at || new Date().toISOString(), verified_by: selected.verified_by || profile.id, updated_by: profile.id, updated_at: new Date().toISOString() }
    const { error: updateError } = await supabase.from('commercial_prospects').update(patch).eq('id', selected.id)
    if (!updateError) await supabase.from('commercial_prospect_interactions').insert({ prospect_id: selected.id, admin_profile_id: profile.id, interaction_type: publish ? 'publication' : 'verification', summary: publish ? 'Verificado y publicado como ficha básica en Comercios.' : 'Verificado y convertido en borrador de Comercio.' })
    setSaving('')
    if (updateError) return setError(`El borrador se creó, pero faltó enlazarlo al radar: ${updateError.message}`)
    setCommerces(current => [...current, commerce])
    setProspects(current => current.map(item => item.id === selected.id ? { ...item, ...patch } : item))
    setNotice(publish ? 'Ficha básica publicada en Comercios.' : 'Borrador creado en Comercios; todavía no es visible en la app.')
  }

  const addInteraction = async event => {
    event.preventDefault()
    if (!selected || selected.isNew || !interaction.summary.trim()) return
    setSaving('interaction'); setError('')
    const payload = { prospect_id: selected.id, admin_profile_id: profile.id, interaction_type: interaction.interaction_type, summary: interaction.summary.trim(), scheduled_for: interaction.scheduled_for ? new Date(interaction.scheduled_for).toISOString() : null, completed_at: interaction.scheduled_for ? null : new Date().toISOString() }
    const { data: created, error: interactionError } = await supabase.from('commercial_prospect_interactions').insert(payload).select().single()
    setSaving('')
    if (interactionError) return setError(interactionError.message)
    setInteractions(current => [created, ...current]); setInteraction({ interaction_type: 'note', summary: '', scheduled_for: '' })
    setNotice('Gestión registrada en la cronología.')
  }

  const exportCsv = () => {
    const clean = value => `"${String(value ?? '').replaceAll('"', '""')}"`
    const lines = [['Nombre', 'Categoría', 'Fuente', 'Dirección', 'Teléfono', 'WhatsApp', 'Email', 'Web', 'Red social', 'Estado', 'Contacto', 'Próximo seguimiento', 'Verificado', 'Notas', 'Latitud', 'Longitud'], ...filtered.map(item => [item.name, item.category, item.source, item.address, item.phone, item.whatsapp, item.email || item.raw_data?.emails?.[0], item.website, item.social_url || item.raw_data?.socials?.[0], STATUS[item.status]?.[0], item.contact_name, item.next_follow_up_at, item.verified_at ? 'Sí' : 'No', item.notes, item.latitude, item.longitude])]
    const blob = new Blob([`\ufeff${lines.map(row => row.map(clean).join(';')).join('\n')}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `radar-comercial-${new Date().toISOString().slice(0, 10)}.csv`; anchor.click()
    URL.revokeObjectURL(url)
  }

  const counts = useMemo(() => ({
    total: withExisting.filter(item => item.status !== 'discarded').length,
    new: withExisting.filter(item => item.status === 'new').length,
    contacted: withExisting.filter(item => ['contacted', 'visit_scheduled', 'interested', 'proposal_sent'].includes(item.status)).length,
    converted: withExisting.filter(item => item.status === 'converted' || item.existingCommerce).length,
    discarded: withExisting.filter(item => item.status === 'discarded').length,
  }), [withExisting])

  return (
    <div className="commercial-radar-page">
      <section className="page-heading radar-heading">
        <div><p className="eyebrow">Captación territorial</p><h1>Radar comercial</h1><p>Descubre y organiza negocios reales dentro del polígono, sin publicarlos automáticamente en la app.</p></div>
        <div className="radar-heading-actions"><button className={`button ${placing ? 'button-primary' : 'button-secondary'}`} type="button" onClick={() => { setPlacing(current => !current); setManualDraft(null); setSelectedId(null) }}>{placing ? 'Toca el mapa…' : '＋ Agregar prospecto'}</button><button className="button button-secondary" type="button" onClick={exportCsv} disabled={!filtered.length}>Exportar CSV</button><button className="button button-primary" type="button" onClick={scan} disabled={scanning || !neighborhoodId}>{scanning ? 'Explorando el barrio…' : '⌖ Actualizar OpenStreetMap'}</button></div>
      </section>
      {error && <div className="admin-alert" role="alert"><span>⚠️</span><p>{error}</p><button type="button" onClick={() => setError('')}>×</button></div>}
      {notice && <div className="admin-toast">✓ {notice}</div>}
      <section className="radar-controls">
        <label>Barrio<select value={neighborhoodId} onChange={event => { setNeighborhoodId(event.target.value); setSelectedId(null) }}>{neighborhoods.map(item => <option value={item.id} key={item.id}>{item.name}{item.uv_code ? ` · UV ${item.uv_code}` : ''}</option>)}</select></label>
        <div className="radar-metrics"><span><strong>{counts.total}</strong>En el radar</span><span><strong>{counts.new}</strong>Por revisar</span><span><strong>{counts.contacted}</strong>En gestión</span><span><strong>{counts.converted}</strong>Incorporados</span><span><strong>{counts.discarded}</strong>Descartados</span></div>
      </section>
      <section className="radar-google-search">
        <div><p className="eyebrow">Contraste externo en vivo</p><h2>Encontrar faltantes con Google Maps</h2><p>Busca un rubro por vez. Los resultados no se copian ni se publican automáticamente.</p></div>
        <form onSubmit={searchGoogleArea}><input value={googleTerm} onChange={event => setGoogleTerm(event.target.value)} placeholder="Ej. panaderías, veterinarias, peluquerías" maxLength="120" /><button className="button button-primary" type="submit" disabled={googleSearching || !neighborhoodId}>{googleSearching && googleScope?.kind !== 'prospect' ? 'Consultando…' : 'Contrastar zona'}</button></form>
        {googleUsage && <small>{googleUsage.used} de {googleUsage.limit} consultas usadas hoy.</small>}
      </section>
      {googleScope?.kind === 'area' && <section className="radar-google-results">
        <header><div><strong>Resultados temporales</strong><span>{comparedGooglePlaces.length} dentro del polígono · ordenados por relevancia de Google</span></div><span className="google-maps-attribution" translate="no">Google Maps</span><button type="button" onClick={() => { setGooglePlaces([]); setGoogleScope(null) }}>×</button></header>
        {comparedGooglePlaces.length ? <div>{comparedGooglePlaces.map(place => {
          const closed = place.business_status === 'CLOSED_PERMANENTLY' || place.business_status === 'CLOSED_TEMPORARILY'
          return <article key={place.id}><div><strong>{place.name}</strong><span>{place.type_label || place.primary_type || 'Comercio'} · {place.address || 'Sin dirección visible'}</span></div><em className={closed ? 'is-closed' : place.matchedProspect ? 'is-match' : 'is-missing'}>{closed ? 'Posible cierre' : place.matchedProspect ? 'Coincide con Radar' : 'Sin coincidencia local'}</em><div className="radar-google-actions">{place.google_maps_uri && <a href={place.google_maps_uri} target="_blank" rel="noreferrer">Ver en Google Maps</a>}{place.matchedProspect && <button type="button" onClick={() => { openProspect(place.matchedProspect); setGooglePlaces([place]); setGoogleScope({ kind: 'prospect', prospectId: place.matchedProspect.id }) }}>Abrir ficha</button>}{place.matchedProspect && place.matchedProspect.google_place_id !== place.id && <button type="button" onClick={() => linkGooglePlace(place, place.matchedProspect)} disabled={saving === 'google-link'}>Vincular ID</button>}</div></article>
        })}</div> : <div className="panel-empty"><strong>Sin resultados dentro del polígono</strong><small>Prueba un término más específico, como “panaderías” o “veterinarias”.</small></div>}
      </section>}
      <section className="radar-workspace">
        <div className="radar-map-card">
          <MapContainer className="commercial-radar-map" center={[-33.425, -70.572]} zoom={15} scrollWheelZoom>
            <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" subdomains="abcd" maxZoom={20} attribution="&copy; OpenStreetMap &copy; CARTO" />
            <GeoJSON key={neighborhoodId || 'boundary'} data={boundary} style={{ color: '#16a34a', weight: 3, fillColor: '#16a34a', fillOpacity: 0.08 }} />
            <FitBoundary feature={boundary} />
            <MapClickCapture active={placing} onPick={pickManualLocation} />
            {filtered.map(item => <CircleMarker key={item.id} center={[item.latitude, item.longitude]} radius={item.id === selectedId ? 9 : 6} pathOptions={{ color: item.existingCommerce ? '#0f5f36' : STATUS[item.status]?.[1], fillColor: item.existingCommerce ? '#16a34a' : STATUS[item.status]?.[1], fillOpacity: 0.88, weight: item.id === selectedId ? 3 : 2 }} eventHandlers={{ click: () => openProspect(item) }}><Popup><strong>{item.name}</strong><br />{item.category}<br />{item.address || 'Sin dirección registrada'}</Popup></CircleMarker>)}
            {manualDraft && <CircleMarker center={[manualDraft.latitude, manualDraft.longitude]} radius={9} pathOptions={{ color: '#0f5f36', fillColor: '#20a77b', fillOpacity: 0.9, weight: 3 }} />}
          </MapContainer>
          {placing && <div className="radar-map-instruction">Toca dentro del polígono para crear el prospecto.</div>}
          <div className="radar-map-legend"><span><i className="new" />Por revisar</span><span><i className="contacted" />Contactado</span><span><i className="interested" />Interesado</span><span><i className="converted" />Incorporado</span></div>
        </div>
        <div className="radar-directory">
          <header><label className="admin-search"><span>⌕</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar nombre, rubro o dirección…" /></label><div><select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="all">Todos los estados</option>{Object.entries(STATUS).map(([value, [label]]) => <option value={value} key={value}>{label}</option>)}</select><select value={categoryFilter} onChange={event => setCategoryFilter(event.target.value)}><option value="all">Todos los rubros</option>{Object.entries(CATEGORY_LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select><select value={sourceFilter} onChange={event => setSourceFilter(event.target.value)}><option value="all">Todas las fuentes</option><option value="overture">Overture</option><option value="openstreetmap">OpenStreetMap</option><option value="manual">Manual</option></select></div></header>
          <div className="radar-list">{loading ? <div className="panel-loading">Cargando radar…</div> : filtered.length ? filtered.map(item => <button type="button" key={item.id} className={item.id === selectedId ? 'is-selected' : ''} onClick={() => openProspect(item)}><span className="radar-list-dot" style={{ background: item.existingCommerce ? '#0f5f36' : STATUS[item.status]?.[1] }} /><div><strong>{item.name}</strong><small>{item.category} · {item.address || 'Sin dirección'} · {item.source === 'overture' ? 'Overture' : item.source === 'manual' ? 'Manual' : 'OSM'}</small></div>{item.verified_at && !item.existingCommerce ? <em>✓ Verificado</em> : item.existingCommerce ? <em>En Comercios</em> : <em>{STATUS[item.status]?.[0]}</em>}</button>) : <div className="panel-empty"><strong>Sin resultados</strong><small>Ajusta los filtros o agrega un prospecto tocando el mapa.</small></div>}</div>
        </div>
      </section>
      {selected && <aside className="radar-detail">
        <header><div><p className="eyebrow">{selected.isNew ? 'Nuevo prospecto manual' : 'CRM comercial'}</p><h2>{edit.name || 'Comercio sin completar'}</h2><span>{selected.source === 'overture' ? 'Overture Maps' : selected.source === 'manual' ? 'Agregado manualmente' : 'OpenStreetMap'} · {selected.latitude.toFixed(6)}, {selected.longitude.toFixed(6)}</span></div><button type="button" onClick={() => { setSelectedId(null); setManualDraft(null) }}>×</button></header>
        <div className="radar-detail-body">
          {selected.verified_at && <div className="radar-verified">✓ Verificado por El Barrio el {new Date(selected.verified_at).toLocaleDateString('es-CL')}</div>}
          {selected.existingCommerce && <div className="radar-existing">✓ Ya existe en Comercios como <strong>{selected.existingCommerce.name}</strong>{selected.existingCommerce.is_active ? ' y está publicado.' : ', pero permanece inactivo.'}</div>}
          {!selected.isNew && <section className="radar-google-check"><div><strong>{selected.google_place_id ? 'Ficha vinculada con Google Maps' : 'Comprobar vigencia en Google Maps'}</strong><small>{selected.google_place_id ? 'El identificador está guardado; nombre, estado y dirección se consultan en vivo.' : 'Busca coincidencias sin modificar la ficha.'}</small></div><button className="button button-secondary" type="button" onClick={checkSelectedWithGoogle} disabled={googleSearching}>{googleSearching && googleScope?.kind === 'prospect' ? 'Consultando…' : selected.google_place_id ? 'Actualizar comprobación' : 'Buscar coincidencia'}</button></section>}
          {googleScope?.kind === 'prospect' && googleScope.prospectId === selected.id && <section className="radar-google-prospect-results"><div className="google-maps-attribution" translate="no">Google Maps</div>{comparedGooglePlaces.length ? comparedGooglePlaces.map(place => <article key={place.id}><div><strong>{place.name}</strong><span>{place.business_status === 'CLOSED_PERMANENTLY' ? 'Cerrado permanentemente según Google Maps' : place.business_status === 'CLOSED_TEMPORARILY' ? 'Cerrado temporalmente según Google Maps' : 'Operativo según Google Maps'}</span><small>{place.address || 'Sin dirección visible'}</small></div><div>{place.google_maps_uri && <a href={place.google_maps_uri} target="_blank" rel="noreferrer">Revisar</a>}{selected.google_place_id !== place.id && <button type="button" onClick={() => linkGooglePlace(place, selected)} disabled={saving === 'google-link'}>Vincular este ID</button>}</div></article>) : <small>No se encontró una coincidencia clara. La ficha local permanece sin cambios.</small>}</section>}
          <div className="radar-detail-grid">
            <label className="wide">Nombre<input value={edit.name} onChange={event => setEdit(current => ({ ...current, name: event.target.value }))} placeholder="Nombre del comercio" /></label>
            <label>Categoría<select value={edit.category} onChange={event => setEdit(current => ({ ...current, category: event.target.value }))}>{Object.keys(CATEGORY_LABELS).map(value => <option key={value}>{value}</option>)}</select></label>
            <label>Rubro específico<input value={edit.source_type} onChange={event => setEdit(current => ({ ...current, source_type: event.target.value }))} placeholder="Ej. óptica, minimarket" /></label>
            <label className="wide">Dirección<input value={edit.address} onChange={event => setEdit(current => ({ ...current, address: event.target.value }))} placeholder="Dirección comercial" /></label>
            <label>Teléfono<input value={edit.phone} onChange={event => setEdit(current => ({ ...current, phone: event.target.value }))} placeholder="+56…" /></label>
            <label>WhatsApp<input value={edit.whatsapp} onChange={event => setEdit(current => ({ ...current, whatsapp: event.target.value }))} placeholder="+56…" /></label>
            <label>Email<input type="email" value={edit.email} onChange={event => setEdit(current => ({ ...current, email: event.target.value }))} placeholder="contacto@comercio.cl" /></label>
            <label>Sitio web<input value={edit.website} onChange={event => setEdit(current => ({ ...current, website: event.target.value }))} placeholder="https://…" /></label>
            <label className="wide">Instagram o red social<input value={edit.social_url} onChange={event => setEdit(current => ({ ...current, social_url: event.target.value }))} placeholder="https://instagram.com/…" /></label>
            <label>Estado<select value={edit.status === 'discarded' ? 'new' : edit.status} disabled={selected.status === 'discarded'} onChange={event => setEdit(current => ({ ...current, status: event.target.value }))}>{PIPELINE_STATUS.map(([value, [label]]) => <option value={value} key={value}>{label}</option>)}</select></label>
            <label>Persona de contacto<input value={edit.contact_name} onChange={event => setEdit(current => ({ ...current, contact_name: event.target.value }))} placeholder="Nombre o cargo" /></label>
            <label className="wide">Próximo seguimiento<input type="datetime-local" value={edit.next_follow_up_at} onChange={event => setEdit(current => ({ ...current, next_follow_up_at: event.target.value }))} /></label>
            <label className="wide">Notas<textarea rows="4" value={edit.notes} onChange={event => setEdit(current => ({ ...current, notes: event.target.value }))} placeholder="Interés en publicidad, conversación y próxima acción…" /></label>
          </div>
          {!selected.isNew && <section className="radar-history">
            <h3>Cronología comercial</h3>
            <form onSubmit={addInteraction}><select value={interaction.interaction_type} onChange={event => setInteraction(current => ({ ...current, interaction_type: event.target.value }))}><option value="note">Nota</option><option value="call">Llamada</option><option value="whatsapp">WhatsApp</option><option value="email">Email</option><option value="visit">Visita</option></select><input value={interaction.summary} onChange={event => setInteraction(current => ({ ...current, summary: event.target.value }))} placeholder="¿Qué ocurrió o qué debes hacer?" /><input type="datetime-local" value={interaction.scheduled_for} onChange={event => setInteraction(current => ({ ...current, scheduled_for: event.target.value }))} /><button type="submit" disabled={saving === 'interaction'}>Registrar</button></form>
            <div>{interactions.length ? interactions.map(item => <article key={item.id}><span>{item.interaction_type}</span><p>{item.summary}</p><small>{new Date(item.created_at).toLocaleString('es-CL')}{item.scheduled_for ? ` · Agendado ${new Date(item.scheduled_for).toLocaleString('es-CL')}` : ''}</small></article>) : <small>Aún no hay gestiones registradas.</small>}</div>
          </section>}
        </div>
        <footer className="radar-detail-actions">
          {selected.status === 'discarded'
            ? <button className="button radar-restore-action" type="button" onClick={() => setDiscarded(false)} disabled={!!saving}>{saving === 'restore' ? 'Restaurando…' : '↻ Restaurar al radar'}</button>
            : <>
              {!selected.isNew && <button className="button radar-discard-action" type="button" onClick={() => setDiscarded(true)} disabled={!!saving}>{saving === 'discard' ? 'Quitando…' : 'Quitar del radar'}</button>}
              <button className="button button-secondary" type="button" onClick={saveProspect} disabled={!!saving}>{saving === 'prospect' ? 'Guardando…' : selected.isNew ? 'Agregar al CRM' : 'Guardar ficha'}</button>
              {!selected.isNew && !selected.verified_at && !selected.existingCommerce && <button className="button button-secondary" type="button" onClick={verifyProspect} disabled={!!saving}>{saving === 'verify' ? 'Verificando…' : '✓ Verificar'}</button>}
              {selected.existingCommerce ? <button className="button button-primary" type="button" onClick={() => onNavigate('comercios')}>Abrir en Comercios</button> : !selected.isNew && <><button className="button button-secondary" type="button" onClick={() => convert(false)} disabled={!!saving}>Crear borrador</button><button className="button button-primary" type="button" onClick={() => convert(true)} disabled={!!saving}>{saving === 'convert' ? 'Creando…' : 'Verificar y publicar'}</button></>}
            </>}
        </footer>
      </aside>}
    </div>
  )
}
