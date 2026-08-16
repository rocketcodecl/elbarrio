import { createClient } from '@supabase/supabase-js'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors })

type Geometry = { type: 'Polygon' | 'MultiPolygon'; coordinates: number[][][] | number[][][][] }
type RequestBody = { action?: 'area_search' | 'prospect_match' | 'place_details'; neighborhood_id?: string; prospect_id?: string; search_term?: string; place_id?: string }
type GooglePlace = {
  id?: string
  displayName?: { text?: string }
  formattedAddress?: string
  location?: { latitude?: number; longitude?: number }
  primaryType?: string
  primaryTypeDisplayName?: { text?: string }
  businessStatus?: string
  googleMapsUri?: string
}

const ringsFromGeometry = (geometry: Geometry) => {
  if (geometry.type === 'Polygon') return [(geometry.coordinates as number[][][])[0]]
  return (geometry.coordinates as number[][][][]).map(polygon => polygon[0])
}

const pointInsideGeometry = ([longitude, latitude]: [number, number], geometry: Geometry) => ringsFromGeometry(geometry).some(ring => {
  let inside = false
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
    const [xi, yi] = ring[index]
    const [xj, yj] = ring[previous]
    if ((yi > latitude) !== (yj > latitude) && longitude < ((xj - xi) * (latitude - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
})

const boundsFromGeometry = (geometry: Geometry) => {
  const points = ringsFromGeometry(geometry).flat()
  const longitudes = points.map(point => point[0])
  const latitudes = points.map(point => point[1])
  return {
    low: { latitude: Math.min(...latitudes), longitude: Math.min(...longitudes) },
    high: { latitude: Math.max(...latitudes), longitude: Math.max(...longitudes) },
  }
}

const publicPlace = (place: GooglePlace) => ({
  id: place.id || '',
  name: place.displayName?.text || 'Lugar sin nombre',
  address: place.formattedAddress || '',
  latitude: Number(place.location?.latitude),
  longitude: Number(place.location?.longitude),
  primary_type: place.primaryType || '',
  type_label: place.primaryTypeDisplayName?.text || '',
  business_status: place.businessStatus || 'BUSINESS_STATUS_UNSPECIFIED',
  google_maps_uri: place.googleMapsUri || '',
})

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (request.method !== 'POST') return reply({ error: 'Método no permitido.' }, 405)

  const url = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const googleKey = Deno.env.get('GOOGLE_MAPS_API_KEY')
  const authorization = request.headers.get('Authorization')
  if (!url || !anonKey || !serviceKey || !authorization?.startsWith('Bearer ')) return reply({ error: 'Sesión requerida.' }, 401)
  if (!googleKey) return reply({ error: 'Google Places todavía no está configurado en Supabase.' }, 503)

  const client = createClient(url, anonKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } })
  const { data: authData } = await client.auth.getUser()
  if (!authData.user) return reply({ error: 'Sesión vencida.' }, 401)
  const { data: profile } = await client.from('profiles').select('id, role, is_superadmin, account_status').eq('user_id', authData.user.id).maybeSingle()
  if (profile?.role !== 'admin' || !profile?.is_superadmin || profile?.account_status === 'suspended') return reply({ error: 'Acceso de superadministrador requerido.' }, 403)

  let body: RequestBody = {}
  try { body = await request.json() } catch { return reply({ error: 'Solicitud inválida.' }, 400) }
  if (!body.neighborhood_id) return reply({ error: 'Selecciona un barrio.' }, 400)

  const service = createClient(url, serviceKey, { auth: { persistSession: false } })
  const { data: neighborhood } = await service.from('neighborhoods').select('id, name, boundary').eq('id', body.neighborhood_id).maybeSingle()
  if (!neighborhood?.boundary) return reply({ error: 'El barrio no tiene un polígono válido.' }, 422)

  const action = body.action || 'area_search'
  const dailyLimit = Math.max(1, Math.min(100, Number(Deno.env.get('GOOGLE_PLACES_DAILY_LIMIT') || 10)))
  const today = new Date().toISOString().slice(0, 10)
  const { count: usedToday, error: usageError } = await service.from('commercial_google_usage').select('id', { count: 'exact', head: true }).eq('requested_on', today)
  if (usageError) return reply({ error: 'Falta aplicar la migración de control de Google Places antes de usar el contraste.' }, 503)
  if ((usedToday || 0) >= dailyLimit) return reply({ error: `Límite diario alcanzado (${dailyLimit}). Vuelve mañana o cambia GOOGLE_PLACES_DAILY_LIMIT.`, usage: { used: usedToday || 0, limit: dailyLimit } }, 429)

  const fieldMask = 'places.id,places.displayName,places.formattedAddress,places.location,places.primaryType,places.primaryTypeDisplayName,places.businessStatus,places.googleMapsUri'
  let endpoint = 'https://places.googleapis.com/v1/places:searchText'
  let payload: Record<string, unknown>
  const requestKind: 'area_search' | 'prospect_match' | 'place_details' = action
  let searchTerm = String(body.search_term || '').trim().slice(0, 120)

  if (action === 'area_search') {
    searchTerm ||= 'comercios'
    payload = {
      textQuery: searchTerm,
      pageSize: 20,
      languageCode: 'es-CL',
      regionCode: 'CL',
      locationRestriction: { rectangle: boundsFromGeometry(neighborhood.boundary as Geometry) },
    }
  } else if (action === 'prospect_match') {
    if (!body.prospect_id) return reply({ error: 'Selecciona un prospecto.' }, 400)
    const { data: prospect } = await service.from('commercial_prospects').select('id, neighborhood_id, name, address, latitude, longitude').eq('id', body.prospect_id).eq('neighborhood_id', body.neighborhood_id).maybeSingle()
    if (!prospect) return reply({ error: 'Prospecto no encontrado.' }, 404)
    searchTerm = [prospect.name, prospect.address].filter(Boolean).join(' ')
    payload = {
      textQuery: searchTerm,
      pageSize: 5,
      languageCode: 'es-CL',
      regionCode: 'CL',
      locationBias: { circle: { center: { latitude: prospect.latitude, longitude: prospect.longitude }, radius: 600 } },
    }
  } else if (action === 'place_details') {
    if (!body.place_id || !/^[A-Za-z0-9_-]{10,}$/.test(body.place_id)) return reply({ error: 'Identificador de Google inválido.' }, 400)
    endpoint = `https://places.googleapis.com/v1/places/${encodeURIComponent(body.place_id)}`
    payload = {}
  } else return reply({ error: 'Acción no reconocida.' }, 400)

  let googleResponse: Response
  try {
    googleResponse = await fetch(endpoint, {
      method: action === 'place_details' ? 'GET' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': googleKey,
        'X-Goog-FieldMask': action === 'place_details' ? fieldMask.replaceAll('places.', '') : fieldMask,
      },
      body: action === 'place_details' ? undefined : JSON.stringify(payload),
      signal: AbortSignal.timeout(20_000),
    })
  } catch {
    return reply({ error: 'Google Places no respondió a tiempo.' }, 504)
  }

  const googlePayload = await googleResponse.json().catch(() => ({})) as { places?: GooglePlace[]; error?: { message?: string } } & GooglePlace
  if (!googleResponse.ok) return reply({ error: googlePayload.error?.message || 'Google Places rechazó la solicitud.' }, googleResponse.status)

  const { error: usageSaveError } = await service.from('commercial_google_usage').insert({
    neighborhood_id: neighborhood.id,
    requested_by: profile.id,
    request_kind: requestKind,
    search_term: searchTerm || null,
    requested_on: today,
  })
  if (usageSaveError) return reply({ error: 'Google respondió, pero no fue posible registrar el consumo. No se mostrarán datos sin auditoría.' }, 503)

  const rawPlaces = action === 'place_details' ? [googlePayload as GooglePlace] : googlePayload.places || []
  const places = rawPlaces.map(publicPlace).filter(place => {
    if (!Number.isFinite(place.latitude) || !Number.isFinite(place.longitude)) return false
    return action !== 'area_search' || pointInsideGeometry([place.longitude, place.latitude], neighborhood.boundary as Geometry)
  })

  return reply({
    places,
    neighborhood: neighborhood.name,
    usage: { used: (usedToday || 0) + 1, limit: dailyLimit },
    attribution: 'Google Maps',
  })
})
