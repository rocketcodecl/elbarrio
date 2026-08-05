import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { supabase } from '../lib/supabase'
import { BARRIO_BETA_BOUNDARY } from '../data/barrioBetaBoundary'
import { C, T, REPORTES, hace } from '../lib/design'

const markerIcon = (kind, symbol) => L.divIcon({
  className: '',
  html: `<div style="width:27px;height:27px;border-radius:50%;background:${kind === 'commerce' ? '#1B9E75' : '#F5B800'};border:2px solid white;box-shadow:0 3px 9px rgba(15,23,42,.2);display:flex;align-items:center;justify-content:center;color:white;font-size:13px;line-height:1">${kind === 'commerce' ? '🏪' : symbol}</div>`,
  iconSize: [27, 27],
  iconAnchor: [13.5, 13.5],
})

const clusterIcon = (count, hasIncident) => L.divIcon({
  className: '',
  html: `<div style="width:36px;height:36px;border-radius:50%;background:${hasIncident ? '#F5B800' : '#1B9E75'};border:3px solid white;box-shadow:0 4px 12px rgba(15,23,42,.24);display:flex;align-items:center;justify-content:center;color:white;font-family:Plus Jakarta Sans,sans-serif;font-size:12px;font-weight:800">${count > 99 ? '99+' : count}</div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
})

export default function NeighborhoodMap({ currentUser, neighborhoodId, onNavigate }) {
  const mapBoxRef = useRef(null)
  const mapRef = useRef(null)
  const markerLayerRef = useRef(null)
  const [filter, setFilter] = useState('all')
  const [items, setItems] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [mapRevision, setMapRevision] = useState(0)
  const [dataRevision, setDataRevision] = useState(0)

  useEffect(() => {
    let active = true
    async function loadMapItems() {
      if (!currentUser?.id || !neighborhoodId) {
        setError('No pudimos confirmar tu barrio.')
        setLoading(false)
        return
      }
      setLoading(true)
      setError('')
      const [commerceResult, incidentResult] = await Promise.all([
        supabase.from('commerces').select('id, name, category, address, lat, lng, logo_url, is_premium').eq('neighborhood_id', neighborhoodId).eq('is_active', true),
        supabase.from('incident_reports').select('id, title, category, severity, location_text, latitude, longitude, created_at').eq('neighborhood_id', neighborhoodId).eq('status', 'active').order('created_at', { ascending: false }),
      ])
      if (!active) return
      if (commerceResult.error || incidentResult.error) {
        setError('No pudimos cargar el mapa. Inténtalo nuevamente.')
      }
      const commerces = (commerceResult.data || [])
        .filter(item => Number.isFinite(Number(item.lat)) && Number.isFinite(Number(item.lng)))
        .map(item => ({ ...item, kind: 'commerce', latitude: Number(item.lat), longitude: Number(item.lng) }))
      const incidents = (incidentResult.data || [])
        .filter(item => Number.isFinite(Number(item.latitude)) && Number.isFinite(Number(item.longitude)))
        .map(item => ({ ...item, kind: 'incident', latitude: Number(item.latitude), longitude: Number(item.longitude) }))
      setItems([...incidents, ...commerces])
      setLoading(false)
    }
    loadMapItems()
    return () => { active = false }
  }, [currentUser?.id, neighborhoodId, dataRevision])

  useEffect(() => {
    if (!neighborhoodId) return undefined
    const refresh = () => setDataRevision(value => value + 1)
    const channel = supabase
      .channel(`neighborhood-map-live-${neighborhoodId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'incident_reports',
        filter: `neighborhood_id=eq.${neighborhoodId}`,
      }, refresh)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'commerces',
        filter: `neighborhood_id=eq.${neighborhoodId}`,
      }, refresh)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [neighborhoodId])

  useEffect(() => {
    if (!mapBoxRef.current || mapRef.current) return
    const map = L.map(mapBoxRef.current, {
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: false,
      zoomSnap: 0.25,
      tap: true,
    })
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 20,
      subdomains: 'abcd',
    }).addTo(map)
    const boundary = L.geoJSON(BARRIO_BETA_BOUNDARY, {
      style: { color: C.verde, weight: 2.5, opacity: 0.9, fillColor: C.verde, fillOpacity: 0.08 },
    }).addTo(map)
    const boundaryBounds = boundary.getBounds()
    const fitBoundary = () => {
      map.invalidateSize({ pan: false })
      map.fitBounds(boundaryBounds, { padding: [10, 10], animate: false })
    }
    fitBoundary()
    L.control.zoom({ position: 'bottomright' }).addTo(map)
    markerLayerRef.current = L.layerGroup().addTo(map)
    mapRef.current = map
    const refreshClusters = () => setMapRevision(value => value + 1)
    map.on('zoomend moveend', refreshClusters)
    const frame = requestAnimationFrame(fitBoundary)
    const timer = window.setTimeout(fitBoundary, 180)
    return () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(timer)
      map.off('zoomend moveend', refreshClusters)
      map.remove()
      mapRef.current = null
      markerLayerRef.current = null
    }
  }, [])

  const visibleItems = useMemo(() => items.filter(item => filter === 'all' || item.kind === filter), [items, filter])

  useEffect(() => {
    const map = mapRef.current
    const layer = markerLayerRef.current
    if (!map || !layer) return
    layer.clearLayers()

    const clusters = []
    visibleItems.forEach(item => {
      const point = map.latLngToContainerPoint([item.latitude, item.longitude])
      const nearby = clusters.find(cluster => point.distanceTo(cluster.point) <= 44)
      if (nearby) {
        nearby.items.push(item)
        const total = nearby.items.length
        nearby.point = L.point(
          ((nearby.point.x * (total - 1)) + point.x) / total,
          ((nearby.point.y * (total - 1)) + point.y) / total,
        )
      } else {
        clusters.push({ point, items: [item] })
      }
    })

    clusters.forEach(cluster => {
      if (cluster.items.length === 1) {
        const item = cluster.items[0]
        const incidentSymbol = REPORTES[item.category]?.emoji || '⚠️'
        L.marker([item.latitude, item.longitude], { icon: markerIcon(item.kind, incidentSymbol), keyboard: true, title: item.title || item.name })
          .on('click', () => setSelected(item))
          .addTo(layer)
        return
      }

      const center = L.latLng(
        cluster.items.reduce((sum, item) => sum + item.latitude, 0) / cluster.items.length,
        cluster.items.reduce((sum, item) => sum + item.longitude, 0) / cluster.items.length,
      )
      const hasIncident = cluster.items.some(item => item.kind === 'incident')
      L.marker(center, { icon: clusterIcon(cluster.items.length, hasIncident), keyboard: true, title: `${cluster.items.length} lugares` })
        .on('click', () => {
          setSelected(null)
          const bounds = L.latLngBounds(cluster.items.map(item => [item.latitude, item.longitude]))
          if (bounds.isValid() && !bounds.getNorthEast().equals(bounds.getSouthWest())) {
            map.fitBounds(bounds, { padding: [54, 54], maxZoom: 18 })
          } else {
            map.setView(center, Math.min(map.getZoom() + 2, 18))
          }
        })
        .addTo(layer)
    })
  }, [visibleItems, mapRevision])

  const openSelected = () => {
    if (!selected) return
    if (selected.kind === 'commerce') onNavigate('comercios', { commerceId: selected.id })
    else onNavigate('alerta', { id: selected.id })
  }

  return (
    <div style={s.screen}>
      <header style={s.header}>
        <button type="button" style={s.back} onClick={() => onNavigate('back')} aria-label="Volver">
          <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
        </button>
        <div style={s.headerCopy}><strong style={s.title}>Mapa del barrio</strong><span style={s.subtitle}>{visibleItems.length} lugares en el mapa</span></div>
      </header>

      <div style={s.filters}>
        {[
          ['all', 'Todos'],
          ['commerce', 'Comercios'],
          ['incident', 'Incidentes'],
        ].map(([key, label]) => (
          <button key={key} type="button" style={{ ...s.filter, ...(filter === key ? s.filterActive : {}) }} onClick={() => { setFilter(key); setSelected(null) }}>{label}</button>
        ))}
      </div>

      <div ref={mapBoxRef} style={s.map} />

      {loading && <div style={s.status}>Cargando lugares del barrio…</div>}
      {!loading && error && <div style={{ ...s.status, color: C.rojo }}>{error}</div>}
      {!loading && !error && visibleItems.length === 0 && <div style={s.status}>Todavía no hay ubicaciones disponibles en esta categoría.</div>}

      {selected && (
        <div style={s.card}>
          <div style={{ ...s.cardIcon, background: selected.kind === 'incident' ? '#fff7d6' : C.verdeSuave }}>
            {selected.kind === 'incident' ? (REPORTES[selected.category]?.emoji || '⚠️') : '🏪'}
          </div>
          <div style={s.cardCopy}>
            <span style={s.eyebrow}>{selected.kind === 'incident' ? (REPORTES[selected.category]?.label || 'Incidente') : (selected.category || 'Comercio')}</span>
            <strong style={s.cardTitle}>{selected.title || selected.name}</strong>
            <span style={s.cardMeta}>{selected.location_text || selected.address || (selected.created_at ? hace(selected.created_at) : 'Dentro de tu barrio')}</span>
          </div>
          <button type="button" style={s.detail} onClick={openSelected} aria-label="Ver detalle">→</button>
        </div>
      )}
    </div>
  )
}

const s = {
  screen: { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', background: C.fondo, fontFamily: T.font },
  header: { minHeight: 72, padding: 'var(--app-safe-top, 18px) 16px 10px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 11, background: '#fff', borderBottom: `1px solid ${C.borde}`, zIndex: 4 },
  back: { width: 38, height: 38, borderRadius: '50%', border: `1px solid ${C.borde}`, background: '#fff', color: C.texto, display: 'grid', placeItems: 'center', padding: 0, flexShrink: 0 },
  headerCopy: { display: 'flex', flexDirection: 'column', minWidth: 0 },
  title: { fontSize: 17, color: C.texto, lineHeight: 1.2 },
  subtitle: { fontSize: 11, color: C.textoSuave, marginTop: 2 },
  filters: { display: 'flex', gap: 7, padding: '10px 14px', background: '#fff', borderBottom: `1px solid ${C.borde}`, zIndex: 4 },
  filter: { flex: 1, minHeight: 34, borderRadius: 999, border: `1px solid ${C.borde}`, background: '#fff', color: C.textoSuave, fontFamily: T.font, fontSize: 11, fontWeight: 700, padding: '0 8px' },
  filterActive: { background: C.verde, borderColor: C.verde, color: '#fff' },
  map: { flex: 1, width: '100%', minHeight: 0, background: '#e8eeeb', zIndex: 0 },
  status: { position: 'absolute', top: 132, left: '50%', transform: 'translateX(-50%)', width: 'calc(100% - 36px)', padding: '10px 14px', borderRadius: 12, background: 'rgba(255,255,255,.94)', boxShadow: '0 5px 18px rgba(15,23,42,.12)', textAlign: 'center', color: C.textoSuave, fontSize: 12, fontWeight: 600, zIndex: 3, boxSizing: 'border-box' },
  card: { position: 'absolute', left: 14, right: 14, bottom: 'calc(16px + env(safe-area-inset-bottom, 0px))', minHeight: 88, borderRadius: 18, background: '#fff', boxShadow: '0 10px 34px rgba(15,23,42,.22)', display: 'flex', alignItems: 'center', gap: 11, padding: 12, boxSizing: 'border-box', zIndex: 5 },
  cardIcon: { width: 42, height: 42, borderRadius: 13, display: 'grid', placeItems: 'center', color: C.texto, fontSize: 19, fontWeight: 900, flexShrink: 0 },
  cardCopy: { minWidth: 0, display: 'flex', flexDirection: 'column', flex: 1 },
  eyebrow: { color: C.verde, fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.5px' },
  cardTitle: { color: C.texto, fontSize: 14, lineHeight: 1.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 },
  cardMeta: { color: C.textoSuave, fontSize: 10, lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 4 },
  detail: { width: 38, height: 38, borderRadius: '50%', border: 0, background: C.verde, color: '#fff', fontSize: 21, display: 'grid', placeItems: 'center', flexShrink: 0 },
}
