import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { C, T, iniciales } from '../lib/design'
import MiniMap from '../components/MiniMap'

const Icon = ({ children, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
)
const Back = () => <Icon><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></Icon>
const Share = () => <Icon><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.6" y1="10.5" x2="15.4" y2="6.5"/><line x1="8.6" y1="13.5" x2="15.4" y2="17.5"/></Icon>
const Calendar = () => <Icon size={19}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></Icon>
const Pin = () => <Icon size={19}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></Icon>
const Check = () => <Icon size={18}><polyline points="20 6 9 17 4 12"/></Icon>

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

export default function EventDetail({ postId, currentUser, onNavigate }) {
  const [event, setEvent] = useState(null)
  const [attendees, setAttendees] = useState([])
  const [attending, setAttending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const nav = onNavigate || (() => {})

  useEffect(() => {
    let active = true
    const load = async () => {
      const [{ data: post, error: postError }, { data: rows }] = await Promise.all([
        supabase.from('posts').select('*, author:profiles!author_id(full_name, avatar_url, badge_founder)').eq('id', postId).maybeSingle(),
        supabase.from('event_attendees').select('user_id').eq('post_id', postId),
      ])
      if (!active) return
      if (postError || !post) {
        setError('No pudimos encontrar este evento.')
        setLoading(false)
        return
      }
      setEvent(post)
      const ids = [...new Set((rows || []).map(row => row.user_id).filter(Boolean))]
      setAttending(ids.includes(currentUser?.id))
      if (ids.length) {
        const { data: profiles } = await supabase.from('profiles').select('user_id, full_name, avatar_url').in('user_id', ids)
        if (active) setAttendees(profiles || [])
      }
      setLoading(false)
    }
    load()
    return () => { active = false }
  }, [postId, currentUser?.id])

  const toggleAttendance = async () => {
    if (!currentUser?.id || saving) return
    setSaving(true)
    const next = !attending
    const query = next
      ? supabase.from('event_attendees').insert({ post_id: postId, user_id: currentUser.id })
      : supabase.from('event_attendees').delete().eq('post_id', postId).eq('user_id', currentUser.id)
    const { error: attendanceError } = await query
    setSaving(false)
    if (attendanceError) return setError('No pudimos actualizar tu asistencia. Inténtalo nuevamente.')
    setAttending(next)
    if (next) {
      const { data: me } = await supabase.from('profiles').select('user_id, full_name, avatar_url').eq('user_id', currentUser.id).maybeSingle()
      if (me) setAttendees(prev => prev.some(p => p.user_id === me.user_id) ? prev : [...prev, me])
    } else setAttendees(prev => prev.filter(p => p.user_id !== currentUser.id))
  }

  const share = async () => {
    const data = { title: event?.title || 'Evento del barrio', text: `${event?.title || 'Evento'} en El Barrio`, url: window.location.href }
    try {
      if (navigator.share) await navigator.share(data)
      else await navigator.clipboard.writeText(window.location.href)
    } catch {}
  }

  if (loading) return <div style={s.center}>Cargando evento…</div>
  if (!event) return <div style={s.center}><strong>{error}</strong><button style={s.backText} onClick={() => nav('back')}>Volver</button></div>

  const category = CATEGORY[event.category] || CATEGORY.otros
  const image = event.images?.[0]
  const hasMap = event.lat != null && event.lng != null

  return (
    <div style={s.wrap}>
      <div style={s.scroll}>
        <div style={s.hero}>
          {image ? <img src={image} alt="" style={s.heroImage} /> : <div style={s.heroFallback}>{category[1]}</div>}
          <div style={s.heroShade} />
          <button style={{ ...s.circleBtn, left: 16 }} onClick={() => nav('back')} aria-label="Volver"><Back /></button>
          <button style={{ ...s.circleBtn, right: 16 }} onClick={share} aria-label="Compartir"><Share /></button>
        </div>

        <section style={s.summary}>
          <div style={s.badges}><span style={s.primaryBadge}>{category[0]}</span><span style={s.secondaryBadge}>Evento vecinal</span></div>
          <h1 style={s.title}>{event.title || 'Evento del barrio'}</h1>
          <div style={s.infoRow}><span style={s.infoIcon}><Calendar /></span><span>{formatDate(event.starts_at)}</span></div>
          <div style={s.infoRow}><span style={s.infoIcon}><Pin /></span><span>{event.location_text || 'Lugar por confirmar'}</span></div>
        </section>

        <section style={s.section}>
          <h2 style={s.sectionTitle}>Acerca del evento</h2>
          <p style={s.description}>{event.content || 'El organizador todavía no agregó una descripción.'}</p>
          <div style={s.features}>
            <span style={s.featureChip}>🎟️ {event.event_entry_type === 'paid' ? `$${Number(event.event_price || 0).toLocaleString('es-CL')}` : 'Entrada gratuita'}</span>
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
          <div style={s.sectionHeader}><h2 style={s.sectionTitle}>Quiénes asistirán</h2><span style={s.confirmed}>{attendees.length} confirmados</span></div>
          {attendees.length ? <div style={s.attendees}>{attendees.slice(0, 4).map(person => (
            <div key={person.user_id} style={s.person}>
              {person.avatar_url ? <img src={person.avatar_url} alt="" style={s.personAvatar} /> : <span style={s.personFallback}>{iniciales(person.full_name)}</span>}
              <small>{person.full_name?.split(' ')[0] || 'Vecino'}</small>
            </div>
          ))}{attendees.length > 4 && <div style={s.more}>+{attendees.length - 4}</div>}</div> : <div style={s.noAttendees}>Sé la primera persona en confirmar.</div>}
        </section>

        <section style={s.section}>
          <h2 style={s.sectionTitle}>Ubicación</h2>
          {hasMap ? <div style={s.map}><MiniMap lat={event.lat} lng={event.lng} height={190} zoom={16} /></div> : <div style={s.noMap}><Pin /> El organizador aún no fijó el punto en el mapa.</div>}
          <div style={s.mapCaption}>{event.location_text || 'Lugar por confirmar'}</div>
        </section>
        <div style={{ height: 100 }} />
      </div>

      <div style={s.footer}>
        <button style={{ ...s.attendBtn, ...(attending ? s.attendBtnOn : {}) }} onClick={toggleAttendance} disabled={saving}>
          <Check /> {saving ? 'Guardando…' : attending ? 'Asistencia confirmada' : 'Confirmar asistencia'}
        </button>
      </div>
      {error && <div style={s.toast}>{error}</div>}
    </div>
  )
}

const s = {
  wrap: { width: '100%', height: '100%', background: '#f8f8fb', fontFamily: T.font, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' },
  scroll: { flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' },
  center: { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, fontFamily: T.font, color: C.textoSuave },
  backText: { border: 'none', background: C.verde, color: '#fff', padding: '9px 14px', borderRadius: 10 },
  hero: { height: 310, position: 'relative', overflow: 'hidden', background: C.verdeSuave },
  heroImage: { width: '100%', height: '100%', objectFit: 'cover' },
  heroFallback: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 92, background: 'linear-gradient(145deg,#dcfce7,#dbeafe)' },
  heroShade: { position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(0,0,0,.15),transparent 35%)' },
  circleBtn: { position: 'absolute', top: 18, width: 42, height: 42, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,.94)', color: C.texto, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, cursor: 'pointer', boxShadow: '0 3px 12px rgba(0,0,0,.12)' },
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
  sectionHeader: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
  confirmed: { color: C.verde, fontSize: 11.5 },
  attendees: { display: 'flex', alignItems: 'flex-start', gap: 15, marginTop: 14 },
  person: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, fontSize: 11, color: C.texto },
  personAvatar: { width: 50, height: 50, borderRadius: '50%', objectFit: 'cover', border: '2px solid #fff', boxShadow: '0 0 0 1px #d7e2da' },
  personFallback: { width: 50, height: 50, borderRadius: '50%', background: C.verdeSuave, color: C.verde, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 },
  more: { width: 50, height: 50, borderRadius: '50%', background: '#eaf0ff', color: C.verde, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 },
  noAttendees: { marginTop: 12, padding: '13px 14px', borderRadius: 12, background: '#fff', color: C.textoSuave, fontSize: 13 },
  map: { marginTop: 13, borderRadius: 15, overflow: 'hidden', border: `1px solid ${C.borde}` },
  noMap: { marginTop: 13, height: 115, borderRadius: 15, background: '#e9eef5', color: C.textoSuave, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontSize: 12.5 },
  mapCaption: { textAlign: 'center', marginTop: 9, fontSize: 11.5, color: C.textoSuave },
  footer: { flexShrink: 0, padding: '12px 16px calc(12px + env(safe-area-inset-bottom,0px))', background: '#fff', borderTop: `1px solid ${C.borde}` },
  attendBtn: { width: '100%', height: 50, borderRadius: 13, border: 'none', background: C.verde, color: '#fff', fontSize: 15, fontWeight: 600, fontFamily: T.font, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', boxShadow: '0 5px 15px rgba(22,163,74,.22)' },
  attendBtnOn: { background: C.verdeOsc },
  toast: { position: 'absolute', left: 18, right: 18, bottom: 82, padding: '10px 12px', borderRadius: 12, background: '#222', color: '#fff', fontSize: 12, textAlign: 'center' },
}
