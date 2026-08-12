import { createClient } from '@supabase/supabase-js'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors })

type Tags = Record<string, string>
type OverpassElement = { id: number; type: string; lat?: number; lon?: number; center?: { lat?: number; lon?: number }; tags?: Tags }
type Geometry = { type: string; coordinates: number[][][] | number[][][][] }

const categoryFromTags = (tags: Tags) => {
  const shop = tags.shop
  const amenity = tags.amenity
  if (shop === 'bakery' || shop === 'pastry') return 'Panadería'
  if (amenity === 'cafe' || shop === 'coffee') return 'Cafetería'
  if (['restaurant', 'fast_food', 'bar', 'pub', 'food_court'].includes(amenity)) return 'Restaurante'
  if (amenity === 'pharmacy' || shop === 'chemist') return 'Farmacia'
  if (['hardware', 'doityourself', 'paint'].includes(shop)) return 'Ferretería'
  if (['hairdresser', 'beauty'].includes(shop)) return 'Peluquería'
  if (['pet', 'pet_grooming'].includes(shop) || amenity === 'veterinary') return 'Mascotas'
  if (['greengrocer', 'farm'].includes(shop)) return 'Verdulería'
  if (['books', 'stationery'].includes(shop)) return 'Librería'
  if (['clothes', 'shoes', 'fashion', 'boutique'].includes(shop)) return 'Ropa'
  if (['clinic', 'doctors', 'dentist'].includes(amenity) || ['optician', 'medical_supply'].includes(shop)) return 'Salud'
  if (['convenience', 'supermarket', 'grocery', 'kiosk', 'deli'].includes(shop)) return 'Almacén'
  return 'Otro'
}

const sourceTypeFromTags = (tags: Tags) => tags.shop || tags.amenity || tags.office || tags.craft || tags.tourism || tags.leisure || 'comercio'

const addressFromTags = (tags: Tags) => {
  if (tags['addr:full']) return tags['addr:full']
  return [tags['addr:street'] || tags['addr:place'], tags['addr:housenumber']].filter(Boolean).join(' ').trim() || null
}

const firstRing = (geometry: Geometry) => {
  if (geometry.type === 'Polygon') return geometry.coordinates[0] as number[][]
  if (geometry.type === 'MultiPolygon') return geometry.coordinates[0][0] as number[][]
  return []
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (request.method !== 'POST') return reply({ error: 'Método no permitido.' }, 405)

  const url = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const authorization = request.headers.get('Authorization')
  if (!url || !anonKey || !serviceKey || !authorization?.startsWith('Bearer ')) return reply({ error: 'Sesión requerida.' }, 401)

  const client = createClient(url, anonKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } })
  const { data: authData } = await client.auth.getUser()
  if (!authData.user) return reply({ error: 'Sesión vencida.' }, 401)
  const { data: profile } = await client.from('profiles').select('id, role, is_superadmin, account_status').eq('user_id', authData.user.id).maybeSingle()
  if (profile?.role !== 'admin' || !profile?.is_superadmin || profile?.account_status === 'suspended') return reply({ error: 'Acceso de superadministrador requerido.' }, 403)

  let body: { neighborhood_id?: string } = {}
  try { body = await request.json() } catch { return reply({ error: 'Solicitud inválida.' }, 400) }
  if (!body.neighborhood_id) return reply({ error: 'Selecciona un barrio.' }, 400)

  const service = createClient(url, serviceKey, { auth: { persistSession: false } })
  const { data: neighborhood, error: neighborhoodError } = await service.from('neighborhoods').select('id, name, boundary').eq('id', body.neighborhood_id).maybeSingle()
  if (neighborhoodError || !neighborhood) return reply({ error: 'Barrio no encontrado.' }, 404)
  const ring = firstRing(neighborhood.boundary as Geometry)
  if (ring.length < 4) return reply({ error: 'El barrio no tiene un polígono válido.' }, 422)

  const polygon = ring.map(([lng, lat]) => `${lat} ${lng}`).join(' ')
  const query = `[out:json][timeout:35];(nwr["shop"](poly:"${polygon}");nwr["amenity"~"^(restaurant|cafe|fast_food|bar|pub|food_court|pharmacy|bank|clinic|doctors|dentist|veterinary|fuel|car_wash)$"](poly:"${polygon}");nwr["office"](poly:"${polygon}");nwr["craft"](poly:"${polygon}");nwr["tourism"~"^(hotel|hostel|guest_house)$"](poly:"${polygon}");nwr["leisure"="fitness_centre"](poly:"${polygon}"););out center tags;`
  const endpoints = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter']
  let elements: OverpassElement[] | null = null
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8', 'User-Agent': 'El-Barrio-Radar/1.0 contacto@elbarrio.lat' },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(45_000),
      })
      if (!response.ok) continue
      const payload = await response.json() as { elements?: OverpassElement[] }
      elements = payload.elements || []
      break
    } catch {
      // Prueba el siguiente servidor público de Overpass.
    }
  }
  if (!elements) return reply({ error: 'OpenStreetMap no respondió. Intenta nuevamente en unos minutos.' }, 503)

  const now = new Date().toISOString()
  const rows = elements.flatMap(element => {
    const tags = element.tags || {}
    const latitude = Number(element.lat ?? element.center?.lat)
    const longitude = Number(element.lon ?? element.center?.lon)
    const name = tags.name || tags.brand || tags.operator
    if (!name || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return []
    return [{
      neighborhood_id: neighborhood.id,
      source: 'openstreetmap',
      source_id: `${element.type}/${element.id}`,
      name: String(name).slice(0, 180),
      category: categoryFromTags(tags),
      source_type: sourceTypeFromTags(tags),
      address: addressFromTags(tags),
      phone: tags.phone || tags['contact:phone'] || null,
      website: tags.website || tags['contact:website'] || null,
      latitude,
      longitude,
      raw_data: tags,
      created_by: profile.id,
      updated_by: profile.id,
      updated_at: now,
    }]
  })

  for (let index = 0; index < rows.length; index += 200) {
    const { error: saveError } = await service.from('commercial_prospects').upsert(rows.slice(index, index + 200), { onConflict: 'neighborhood_id,source,source_id' })
    if (saveError) return reply({ error: saveError.message }, 500)
  }

  return reply({ count: rows.length, neighborhood: neighborhood.name })
})
