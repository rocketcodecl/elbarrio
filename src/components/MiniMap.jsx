import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

/*
  MiniMap — mapa reutilizable, gratis, sin API key (OpenStreetMap + Leaflet).

  Dos modos:

  1) SOLO VER (ej: tarjeta de un incidente)
     <MiniMap lat={-33.42} lng={-70.57} height={160} />

  2) ELEGIR UN PUNTO (ej: reportar un incidente)
     <MiniMap
       lat={reportLat}
       lng={reportLng}
       editable
       centerLat={-33.42}      // dónde abre el mapa si aún no hay punto
       centerLng={-70.57}
       onPick={(lat, lng) => { setReportLat(lat); setReportLng(lng) }}
     />

  Nota: no usamos los iconos por defecto de Leaflet (se rompen con Vite).
  El marcador es un SVG inline.
*/

const VERDE = '#16a34a'

const pinIcon = (color = VERDE) =>
  L.divIcon({
    className: '',
    html: `
      <div style="transform: translate(-50%, -100%); filter: drop-shadow(0 2px 4px rgba(0,0,0,.3));">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="${color}" stroke="#fff" stroke-width="1.6">
          <path d="M12 22s8-6 8-12a8 8 0 1 0-16 0c0 6 8 12 8 12z"/>
          <circle cx="12" cy="10" r="3" fill="#fff" stroke="none"/>
        </svg>
      </div>`,
    iconSize: [30, 30],
    iconAnchor: [0, 0],
  })

function MiniMap({
  lat,
  lng,
  centerLat,
  centerLng,
  editable = false,
  height = 170,
  zoom = 16,
  color = VERDE,
  onPick,
}) {
  const boxRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const onPickRef = useRef(null)

  // Guardamos el callback en una ref para no re-crear el mapa en cada render
  onPickRef.current = onPick

  useEffect(() => {
    if (!boxRef.current || mapRef.current) return

    const startLat = lat ?? centerLat ?? -33.4275
    const startLng = lng ?? centerLng ?? -70.5734

    const map = L.map(boxRef.current, {
      center: [startLat, startLng],
      zoom,
      zoomControl: editable,
      attributionControl: false,
      dragging: true,
      scrollWheelZoom: false,
      doubleClickZoom: editable,
      tap: true,
    })

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 20,
      subdomains: 'abcd',
    }).addTo(map)

    if (lat && lng) {
      markerRef.current = L.marker([lat, lng], { icon: pinIcon(color) }).addTo(map)
    }

    if (editable) {
      map.on('click', (e) => {
        const { lat: la, lng: ln } = e.latlng
        if (markerRef.current) {
          markerRef.current.setLatLng([la, ln])
        } else {
          markerRef.current = L.marker([la, ln], { icon: pinIcon(color) }).addTo(map)
        }
        onPickRef.current?.(la, ln)
      })
    }

    mapRef.current = map

    // Leaflet necesita recalcular el tamaño si nace dentro de un modal
    setTimeout(() => map.invalidateSize(), 120)

    return () => {
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Si el punto cambia desde fuera (ej: botón "usar mi ubicación"), mover el marcador
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (lat && lng) {
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng])
      } else {
        markerRef.current = L.marker([lat, lng], { icon: pinIcon(color) }).addTo(map)
      }
      map.setView([lat, lng], zoom)
    } else if (markerRef.current) {
      map.removeLayer(markerRef.current)
      markerRef.current = null
    }
  }, [lat, lng, zoom, color])

  return (
    <div
      ref={boxRef}
      style={{
        width: '100%',
        height,
        borderRadius: 12,
        overflow: 'hidden',
        border: '1px solid #e5e7eb',
        background: '#eef0ee',
        cursor: editable ? 'crosshair' : 'grab',
        zIndex: 0,
      }}
    />
  )
}

export default MiniMap