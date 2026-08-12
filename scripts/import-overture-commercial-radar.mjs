import fs from 'node:fs/promises'
import { createClient } from '@supabase/supabase-js'

const sourcePath = process.argv[2]
const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_KEY
const adminEmail = process.env.ELBARRIO_ADMIN_EMAIL
const adminPassword = process.env.ELBARRIO_ADMIN_PASSWORD

if (!sourcePath || !supabaseUrl || !supabaseKey || !adminEmail || !adminPassword) {
  throw new Error('Uso: define VITE_SUPABASE_URL, VITE_SUPABASE_KEY, ELBARRIO_ADMIN_EMAIL y ELBARRIO_ADMIN_PASSWORD; luego pasa el GeoJSON de Overture.')
}

const COMMERCIAL_GROUPS = new Set([
  'arts_and_entertainment',
  'education',
  'food_and_drink',
  'health_care',
  'lifestyle_services',
  'lodging',
  'services_and_business',
  'shopping',
  'sports_and_recreation',
  'travel_and_transportation',
])

const normalize = value => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim()

const distanceMeters = (a, b) => {
  const toRad = value => value * Math.PI / 180
  const earth = 6371000
  const dLat = toRad(Number(b.latitude) - Number(a.latitude))
  const dLng = toRad(Number(b.longitude) - Number(a.longitude))
  const lat1 = toRad(Number(a.latitude))
  const lat2 = toRad(Number(b.latitude))
  const value = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return earth * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value))
}

const similarity = (left, right) => {
  const a = new Set(normalize(left).split(' ').filter(Boolean))
  const b = new Set(normalize(right).split(' ').filter(Boolean))
  if (!a.size || !b.size) return 0
  const intersection = [...a].filter(token => b.has(token)).length
  return intersection / new Set([...a, ...b]).size
}

const pointInRing = ([x, y], ring) => {
  let inside = false
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
    const [xi, yi] = ring[index]
    const [xj, yj] = ring[previous]
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

const geometryRings = geometry => {
  if (geometry?.type === 'Polygon') return [geometry.coordinates[0]]
  if (geometry?.type === 'MultiPolygon') return geometry.coordinates.map(polygon => polygon[0])
  return []
}

const categoryFromPlace = properties => {
  const basic = normalize(properties.basic_category).replaceAll(' ', '_')
  const group = properties.taxonomy?.hierarchy?.[0]
  if (basic.includes('bakery') || basic.includes('pastry')) return 'Panadería'
  if (basic.includes('cafe') || basic.includes('coffee')) return 'Cafetería'
  if (basic.includes('restaurant') || basic.includes('food') || basic.includes('bar')) return 'Restaurante'
  if (basic.includes('pharmacy')) return 'Farmacia'
  if (basic.includes('hardware') || basic.includes('home_improvement') || basic.includes('paint_store')) return 'Ferretería'
  if (basic.includes('hair') || basic.includes('beauty') || basic.includes('nail')) return 'Peluquería'
  if (basic.includes('pet') || basic.includes('veterinar')) return 'Mascotas'
  if (basic.includes('greengrocer') || basic.includes('produce')) return 'Verdulería'
  if (basic.includes('book') || basic.includes('stationery')) return 'Librería'
  if (basic.includes('clothing') || basic.includes('shoe') || basic.includes('fashion')) return 'Ropa'
  if (group === 'health_care') return 'Salud'
  if (basic.includes('grocery') || basic.includes('supermarket') || basic.includes('convenience')) return 'Almacén'
  return 'Otro'
}

const rawText = await fs.readFile(sourcePath, 'utf8')
const collection = JSON.parse(rawText)
const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })
const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email: adminEmail, password: adminPassword })
if (authError || !authData.user) throw new Error(authError?.message || 'No fue posible iniciar sesión.')

const { data: profile, error: profileError } = await supabase
  .from('profiles')
  .select('id, role, is_superadmin')
  .eq('user_id', authData.user.id)
  .single()
if (profileError || profile?.role !== 'admin' || !profile?.is_superadmin) throw new Error('La cuenta no es superadministradora.')

const { data: neighborhood, error: neighborhoodError } = await supabase
  .from('neighborhoods')
  .select('id, name, boundary')
  .eq('is_beta', true)
  .limit(1)
  .single()
if (neighborhoodError || !neighborhood) throw new Error(neighborhoodError?.message || 'Barrio beta no encontrado.')

const boundary = typeof neighborhood.boundary === 'string' ? JSON.parse(neighborhood.boundary) : neighborhood.boundary
const rings = geometryRings(boundary)
if (!rings.length) throw new Error('El barrio no tiene un polígono válido.')

const { data: currentRows, error: currentError } = await supabase
  .from('commercial_prospects')
  .select('id, source, source_id, name, latitude, longitude, phone, email, website, social_url, address, raw_data')
  .eq('neighborhood_id', neighborhood.id)
  .limit(5000)
if (currentError) throw new Error(currentError.message)

const candidates = collection.features.flatMap(feature => {
  const properties = feature.properties || {}
  const coordinates = feature.geometry?.coordinates
  const name = properties.names?.primary
  const group = properties.taxonomy?.hierarchy?.[0]
  if (!feature.id || !name || feature.geometry?.type !== 'Point' || !COMMERCIAL_GROUPS.has(group)) return []
  if (!rings.some(ring => pointInRing(coordinates, ring))) return []
  if (properties.operating_status === 'permanently_closed') return []
  const [longitude, latitude] = coordinates
  const address = properties.addresses?.[0]
  return [{
    neighborhood_id: neighborhood.id,
    source: 'overture',
    source_id: feature.id,
    name: String(name).slice(0, 180),
    category: categoryFromPlace(properties),
    source_type: properties.basic_category || group || 'comercio',
    address: address?.freeform || null,
    phone: properties.phones?.[0] || null,
    email: properties.emails?.[0] || null,
    website: properties.websites?.[0] || null,
    social_url: properties.socials?.[0] || null,
    latitude,
    longitude,
    raw_data: properties,
    created_by: profile.id,
    updated_by: profile.id,
    updated_at: new Date().toISOString(),
  }]
})

const accepted = []
const enriched = []
const known = [...(currentRows || [])]
for (const candidate of candidates) {
  const sameSource = known.find(existing => existing.source === candidate.source && existing.source_id === candidate.source_id)
  if (sameSource) {
    accepted.push(candidate)
    continue
  }
  const match = known.find(existing => {
    const distance = distanceMeters(candidate, existing)
    return (normalize(candidate.name) === normalize(existing.name) && distance <= 120)
      || (distance <= 35 && similarity(candidate.name, existing.name) >= 0.72)
  })
  if (match) {
    if (match.source !== 'overture') enriched.push({ match, candidate })
    continue
  }
  accepted.push(candidate)
  known.push(candidate)
}

for (let index = 0; index < accepted.length; index += 100) {
  const { error } = await supabase
    .from('commercial_prospects')
    .upsert(accepted.slice(index, index + 100), { onConflict: 'neighborhood_id,source,source_id' })
  if (error) throw new Error(error.message)
}

for (const { match, candidate } of enriched) {
  const rawData = { ...(match.raw_data || {}), overture_match: candidate.raw_data, overture_source_id: candidate.source_id }
  const { error } = await supabase.from('commercial_prospects').update({
    address: match.address || candidate.address,
    phone: match.phone || candidate.phone,
    email: match.email || candidate.email,
    website: match.website || candidate.website,
    social_url: match.social_url || candidate.social_url,
    raw_data: rawData,
    updated_by: profile.id,
    updated_at: new Date().toISOString(),
  }).eq('id', match.id)
  if (error) throw new Error(error.message)
}

await supabase.auth.signOut()
const uniqueNew = accepted.filter(candidate => !(currentRows || []).some(row => row.source === candidate.source && row.source_id === candidate.source_id)).length
console.log(JSON.stringify({
  neighborhood: neighborhood.name,
  downloaded: collection.features.length,
  commercial_inside_polygon: candidates.length,
  upserted: accepted.length,
  newly_inserted: uniqueNew,
  duplicates_enriched: enriched.length,
  total_after_import: (currentRows?.length || 0) + uniqueNew,
}, null, 2))
