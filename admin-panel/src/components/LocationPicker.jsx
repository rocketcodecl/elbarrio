import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

const DEFAULT_POSITION = [-33.414, -70.584]

function MapController({ position, onPick }) {
  const map = useMap()
  useEffect(() => { map.setView(position, 16, { animate: true }) }, [map, position])
  useMapEvents({ click: event => onPick(event.latlng.lat, event.latlng.lng) })
  return null
}

export default function LocationPicker({ address, lat, lng, onPick }) {
  const [search, setSearch] = useState(address || '')
  const [searching, setSearching] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [message, setMessage] = useState('')
  const markerRef = useRef(null)
  const reverseRequestRef = useRef(0)
  const parsedLat = Number(lat)
  const parsedLng = Number(lng)
  const hasPosition = lat !== '' && lng !== '' && Number.isFinite(parsedLat) && Number.isFinite(parsedLng)
  const position = hasPosition ? [parsedLat, parsedLng] : DEFAULT_POSITION

  useEffect(() => { setSearch(address || '') }, [address])

  const markerIcon = useMemo(() => L.divIcon({
    className: 'admin-map-marker',
    html: '<span></span>',
    iconSize: [36, 44],
    iconAnchor: [18, 42],
  }), [])

  const readableAddress = result => {
    const details = result?.address || {}
    const street = details.road || details.pedestrian || details.residential || details.footway || ''
    const number = details.house_number || ''
    const area = details.suburb || details.neighbourhood || details.quarter || ''
    const city = details.city || details.town || details.municipality || details.city_district || ''
    const first = [street, number].filter(Boolean).join(' ')
    const parts = [first, area, city].filter((part, index, all) => part && all.indexOf(part) === index)
    return parts.join(', ') || result?.display_name || ''
  }

  const pickAndResolve = async (nextLat, nextLng) => {
    const requestId = reverseRequestRef.current + 1
    reverseRequestRef.current = requestId
    onPick(nextLat, nextLng)
    setResolving(true)
    setMessage('Actualizando la dirección del punto…')
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&zoom=18&addressdetails=1&lat=${nextLat}&lon=${nextLng}`
      const response = await fetch(url, { headers: { 'Accept-Language': 'es' } })
      if (!response.ok) throw new Error('reverse_failed')
      const result = await response.json()
      if (requestId !== reverseRequestRef.current) return
      const nextAddress = readableAddress(result)
      onPick(nextLat, nextLng, nextAddress)
      setSearch(nextAddress)
      setMessage(nextAddress ? 'Dirección y ubicación actualizadas.' : 'Ubicación actualizada; revisa la dirección antes de guardar.')
    } catch {
      if (requestId === reverseRequestRef.current) setMessage('El punto cambió, pero no pudimos obtener su dirección. Revísala antes de guardar.')
    } finally {
      if (requestId === reverseRequestRef.current) setResolving(false)
    }
  }

  const findAddress = async () => {
    const query = search.trim()
    if (!query) { setMessage('Escribe una dirección antes de buscar.'); return }
    setSearching(true)
    setMessage('')
    try {
      const parts = query.split(',').map(part => part.trim()).filter(Boolean)
      const url = parts.length >= 2
        ? `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=cl&street=${encodeURIComponent(parts.slice(0, -1).join(', '))}&city=${encodeURIComponent(parts.at(-1))}`
        : `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=cl&q=${encodeURIComponent(query)}`
      const response = await fetch(url, { headers: { 'Accept-Language': 'es' } })
      if (!response.ok) throw new Error('search_failed')
      const results = await response.json()
      if (!results?.[0]) { setMessage('No encontramos esa dirección. Revisa calle, número y comuna.'); return }
      const nextLat = Number(results[0].lat)
      const nextLng = Number(results[0].lon)
      const nextAddress = readableAddress(results[0]) || query
      onPick(nextLat, nextLng, nextAddress)
      setSearch(nextAddress)
      setMessage('Ubicación encontrada. Puedes ajustar el pin arrastrándolo.')
    } catch {
      setMessage('No fue posible buscar la dirección. Intenta nuevamente.')
    } finally {
      setSearching(false)
    }
  }

  return (
    <div className="location-picker">
      <div className="map-search-row">
        <input value={search} onChange={event => setSearch(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); findAddress() } }} placeholder="Ej: Av. Apoquindo 4501, Las Condes" />
        <button type="button" onClick={findAddress} disabled={searching}>{searching ? 'Buscando…' : '⌕ Buscar en el mapa'}</button>
      </div>
      <div className="map-frame">
        <MapContainer center={position} zoom={16} scrollWheelZoom zoomControl={false} className="admin-location-map">
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            subdomains="abcd"
            maxZoom={20}
            attribution="&copy; OpenStreetMap &copy; CARTO"
          />
          <MapController position={position} onPick={pickAndResolve} />
          <Marker
            draggable
            icon={markerIcon}
            position={position}
            ref={markerRef}
            eventHandlers={{ dragend: () => {
              const next = markerRef.current?.getLatLng()
              if (next) pickAndResolve(next.lat, next.lng)
            } }}
          />
        </MapContainer>
        <span className="map-hint">{resolving ? 'Buscando dirección…' : 'Mueve el pin o toca cualquier punto del mapa'}</span>
      </div>
      <div className="map-coordinate-row">
        <span>Latitud: <strong>{hasPosition ? parsedLat.toFixed(6) : 'sin definir'}</strong></span>
        <span>Longitud: <strong>{hasPosition ? parsedLng.toFixed(6) : 'sin definir'}</strong></span>
      </div>
      {message && <p className="map-message">{message}</p>}
    </div>
  )
}
