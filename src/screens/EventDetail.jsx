import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { C, T } from '../lib/design'
import MiniMap from '../components/MiniMap'

const Icon = ({ children, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
)
const Back = () => <Icon><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></Icon>
const Share = () => <Icon><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.6" y1="10.5" x2="15.4" y2="6.5"/><line x1="8.6" y1="13.5" x2="15.4" y2="17.5"/></Icon>
const Calendar = () => <Icon size={19}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></Icon>
const Pin = () => <Icon size={19}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></Icon>

const CATEGORY = {
  asambleas: ['Comunidad', '🏛️'], ferias: ['Feria', '🥬'], talleres: ['Taller', '🎨'],
  deportes: ['Deporte', '⚽'], seguridad: ['Seguridad', '🚨'], otros: ['Actividad', '📌'],
}

const formatDate = (value) => {
  const date = new Date(value)
  const day = date.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })
  const time = date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
  return `${day.charAt(0).toUpperCase() + day.slice(1)} · ${time} hrs`
}

const formatSchedule = (startsAt, endsAt) => {
  const start = formatDate(startsAt)
  if (!endsAt) return start
  const end = new Date(endsAt).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
  return `${start}–${end} hrs`
}

export default function EventDetail({ postId, neighborhoodId, onNavigate }) {
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [categories, setCategories] = useState({})
  const nav = onNavigate || (() => {})

  useEffect(() => {
    let active = true
    const load = async () => {
      if (!postId || !neighborhoodId) {
        setEvent(null)
        setError('No pudimos confirmar este evento dentro de tu barrio.')
        setLoading(false)
        return
      }
      const [{ data: post, error: postError }, { data: eventCategories }] = await Promise.all([
        supabase
          .from('posts')
          .select('*, author:profiles!author_id(full_name, avatar_url, badge_founder)')
          .eq('id', postId)
          .eq('type', 'event')
          .eq('status', 'active')
          .eq('neighborhood_id', neighborhoodId)
          .maybeSingle(),
        supabase.from('event_categories').select('key, name, icon'),
      ])
      if (!active) return
      if (postError || !post) {
        setError('No pudimos encontrar este evento.')
        setLoading(false)
        return
      }
      setEvent(post)
      if (eventCategories?.length) setCategories(Object.fromEntries(eventCategories.map(category => [category.key, [category.name, category.icon]])))
      setLoading(false)
    }
    load()
    return () => { active = false }
  }, [postId, neighborhoodId])

  const share = async () => {
    const data = { title: event?.title || 'Evento del barrio', text: `${event?.title || 'Evento'} en El Barrio`, url: window.location.href }
    try {
      if (navigator.share) await navigator.share(data)
      else await navigator.clipboard.writeText(window.location.href)
    } catch {
      // El usuario puede cancelar la hoja nativa de compartir.
    }
  }

  if (loading) return <div style={s.center}>Cargando evento…</div>
  if (!event) return <div style={s.center}><strong>{error}</strong><button style={s.backText} onClick={() => nav('back')}>Volver</button></div>

  const category = categories[event.category] || CATEGORY[event.category] || CATEGORY.otros
  const image = event.images?.[0]
  const hasMap = event.lat != null && event.lng != null
  const directionsQuery = hasMap
    ? `${event.lat},${event.lng}`
    : event.location_text
  const directionsUrl = directionsQuery
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(directionsQuery)}`
    : null
  const ticketPrices = Array.isArray(event.event_ticket_prices) && event.event_ticket_prices.length
    ? event.event_ticket_prices
    : event.event_entry_type === 'paid' && event.event_price != null
      ? [{ label: 'Entrada general', price: event.event_price }]
      : []

  return (
    <div style={s.wrap}>
      <div style={s.scroll}>
        <div style={s.hero}>
          {image ? <><img src={image} alt="" style={s.heroBackdrop} /><img src={image} alt="" style={s.heroImage} /></> : <div style={s.heroFallback}>{category[1]}</div>}
          <div style={s.heroShade} />
          <button style={{ ...s.circleBtn, left: 16 }} onClick={() => nav('back')} aria-label="Volver"><Back /></button>
          <button style={{ ...s.circleBtn, right: 16 }} onClick={share} aria-label="Compartir"><Share /></button>
        </div>

        <section style={s.summary}>
          <div style={s.badges}><span style={s.primaryBadge}>{category[1]} {category[0]}</span></div>
          <h1 style={s.title}>{event.title || 'Evento del barrio'}</h1>
          <div style={s.infoRow}><span style={s.infoIcon}><Calendar /></span><span>{formatSchedule(event.starts_at, event.ends_at)}</span></div>
          <div style={s.infoRow}><span style={s.infoIcon}><Pin /></span><span>{event.location_text || 'Lugar por confirmar'}</span></div>
        </section>

        <section style={s.section}>
          <h2 style={s.sectionTitle}>Acerca del evento</h2>
          <p style={s.description}>{event.content || 'El organizador todavía no agregó una descripción.'}</p>
          <div style={s.features}>
            {event.event_entry_type === 'paid'
              ? ticketPrices.map((ticket, index) => <span style={s.featureChip} key={`${ticket.label}-${index}`}>🎟️ {ticket.label || 'Entrada'} · ${Number(ticket.price || 0).toLocaleString('es-CL')}</span>)
              : <span style={s.featureChip}>🎟️ Entrada gratuita</span>}
            {event.event_pet_friendly && <span style={s.featureChip}>🐾 Pet friendly</span>}
            {event.event_accessible && <span style={s.featureChip}>♿ Accesible</span>}
            {event.event_family_friendly && <span style={s.featureChip}>👨‍👩‍👧 Apto para familias</span>}
            {event.event_requires_registration && <span style={s.featureChip}>📝 Requiere inscripción</span>}
            {event.event_capacity && <span style={s.featureChip}>👥 {event.event_capacity} cupos</span>}
          </div>
          {event.event_requires_registration && event.event_registration_url && (
            <a href={event.event_registration_url} target="_blank" rel="noreferrer" style={s.registrationLink}>Abrir inscripción →</a>
          )}
        </section>

        <section style={s.section}>
          <h2 style={s.sectionTitle}>Ubicación</h2>
          {hasMap ? <div style={s.map}><MiniMap lat={event.lat} lng={event.lng} height={190} zoom={16} /></div> : <div style={s.noMap}><Pin /> El organizador aún no fijó el punto en el mapa.</div>}
          <div style={s.mapCaption}>{event.location_text || 'Lugar por confirmar'}</div>
          {directionsUrl && <a href={directionsUrl} target="_blank" rel="noreferrer" style={s.directionsLink}><Pin /> Cómo llegar</a>}
        </section>
        <div style={{ height: 104, flexShrink: 0 }} />
      </div>
    </div>
  )
}

const s = {
  wrap: { width: '100%', height: '100%', background: '#f8f8fb', fontFamily: T.font, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' },
  scroll: { flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' },
  center: { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, fontFamily: T.font, color: C.textoSuave },
  backText: { border: 'none', background: C.verde, color: '#fff', padding: '9px 14px', borderRadius: 10 },
  hero: { height: 240, position: 'relative', overflow: 'hidden', background: '#e8eee9' },
  heroBackdrop: { position: 'absolute', inset: -18, width: 'calc(100% + 36px)', height: 'calc(100% + 36px)', objectFit: 'cover', filter: 'blur(18px)', opacity: .32 },
  heroImage: { position: 'relative', zIndex: 1, width: '100%', height: '100%', objectFit: 'contain' },
  heroFallback: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 92, background: 'linear-gradient(145deg,#dcfce7,#dbeafe)' },
  heroShade: { position: 'absolute', zIndex: 2, inset: 0, background: 'linear-gradient(180deg,rgba(0,0,0,.15),transparent 35%)', pointerEvents: 'none' },
  circleBtn: { position: 'absolute', zIndex: 3, top: 18, width: 42, height: 42, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,.94)', color: C.texto, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, cursor: 'pointer', boxShadow: '0 3px 12px rgba(0,0,0,.12)' },
  summary: { position: 'relative', margin: '-52px 16px 0', padding: '20px 18px', borderRadius: 17, background: '#fff', boxShadow: '0 8px 25px rgba(20,30,25,.12)' },
  badges: { display: 'flex', gap: 7, marginBottom: 10 },
  primaryBadge: { padding: '5px 10px', borderRadius: 999, background: C.verdeSuave, color: C.verdeOsc, fontSize: 11, fontWeight: 600 },
  secondaryBadge: { padding: '5px 10px', borderRadius: 999, background: '#eee', color: C.textoSuave, fontSize: 11, fontWeight: 500 },
  title: { margin: '0 0 17px', fontSize: 27, lineHeight: 1.12, fontWeight: 600, color: C.texto, letterSpacing: '-.6px' },
  infoRow: { display: 'flex', alignItems: 'center', gap: 11, marginTop: 9, fontSize: 13, lineHeight: 1.35, color: C.texto },
  infoIcon: { width: 36, height: 36, borderRadius: 10, background: '#f0f4ff', color: C.verde, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  section: { padding: '24px 20px 0' },
  sectionTitle: { margin: 0, fontSize: 19, fontWeight: 600, color: C.texto },
  description: { margin: '13px 0 0', fontSize: 14.5, lineHeight: 1.65, color: C.textoSuave, whiteSpace: 'pre-wrap' },
  features: { display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 15 },
  featureChip: { padding: '7px 9px', borderRadius: 999, background: '#fff', border: `1px solid ${C.borde}`, color: C.textoSuave, fontSize: 11.5, fontWeight: 500 },
  registrationLink: { display: 'inline-flex', marginTop: 12, color: C.verde, fontSize: 12.5, fontWeight: 600, textDecoration: 'none' },
  organizer: { margin: '22px 20px 0', padding: 12, borderRadius: 14, background: '#fff', border: `1px solid ${C.borde}`, display: 'flex', alignItems: 'center', gap: 10 },
  organizerAvatar: { width: 42, height: 42, borderRadius: '50%', objectFit: 'cover' },
  organizerFallback: { width: 42, height: 42, borderRadius: '50%', background: C.verde, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 },
  map: { marginTop: 13, borderRadius: 15, overflow: 'hidden', border: `1px solid ${C.borde}` },
  noMap: { marginTop: 13, height: 115, borderRadius: 15, background: '#e9eef5', color: C.textoSuave, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontSize: 12.5 },
  mapCaption: { textAlign: 'center', marginTop: 9, fontSize: 11.5, color: C.textoSuave },
  directionsLink: { marginTop: 12, minHeight: 44, borderRadius: 12, background: C.verde, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 13.5, fontWeight: 600, textDecoration: 'none' },
}
