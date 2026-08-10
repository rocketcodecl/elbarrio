import { useState, useEffect, useRef, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import {
  C, T, TIPOS, REPORTES, FARMACIAS,
  iniciales, hace, plata, saludo,
} from '../lib/design'

/*
  INICIO — el Radar del barrio.

  Estructura del feed:
    1. Header
    2. Clima + Farmacia
    3. Accesos: Eventos · Noticias · Alertas
    4. Pedidos vecinales (barra amarilla + cards full-width)
    5. Alertas (cards full-width, con distancia "Estás a xx m")
    6. Mercado (scroll lateral: ventas + regalos + trueques juntos)
    7. Actividad de el barrio (vertical, 10 + pill "+ ver más")  ← feed principal
    8. Eventos (scroll lateral, abajo del feed principal)

  "el barrio" siempre minúscula y en verde (C.verde).
  Stats (❤️ 💬 👁️) fuera del feed. Distancia solo en alertas.
*/

/* ── Clima: emojis originales + tipo para SVG flat ──
   Devolvemos AMBOS: `e` (emoji, fallback robusto) y `type` (para SVG).
   Así, si el cache está en formato viejo (sin type), el emoji sigue
   funcionando. El SVG se usa solo cuando type está disponible. */
const CLIMA_EMOJI = (code) => {
  if (code === 0) return { e: '☀️', type: 'sun',       t: 'Despejado' }
  if (code <= 2) return { e: '🌤️', type: 'parcial',   t: 'Parcial' }
  if (code === 3) return { e: '☁️', type: 'nublado',  t: 'Nublado' }
  if (code <= 48) return { e: '🌫️', type: 'neblina',  t: 'Neblina' }
  if (code <= 67) return { e: '🌧️', type: 'lluvia',   t: 'Lluvia' }
  if (code <= 77) return { e: '🌨️', type: 'nieve',    t: 'Nieve' }
  if (code <= 82) return { e: '🌦️', type: 'chubascos',t: 'Chubascos' }
  if (code <= 99) return { e: '⛈️', type: 'tormenta', t: 'Tormenta' }
  return { e: '🌤️', type: 'parcial', t: '' }
}

/* ── SVG flat del clima (estilo referencia: nube BLANCA + gotas azul claro) ──
   Nube BLANCA con drop-shadow suave para que se vea sobre fondo claro.
   Gotas/rayos/nieve en azul claro / ámbar. Sin trazo, relleno plano. */
const CLIMA_COLORS = {
  sun:    '#f59e0b',
  sunRay: '#fbbf24',
  cloud:  '#ffffff',  // BLANCA como la referencia — el drop-shadow la hace visible
  cloudG: '#94a3b8',  // gris medio para nublado
  rain:   '#60a5fa',
  snow:   '#93c5fd',
  bolt:   '#fbbf24',
}

const CloudShape = ({ fill = CLIMA_COLORS.cloud }) => (
  <g>
    <path
      d="M8.4 23.5h14.8c3.2 0 5.8-2.35 5.8-5.35 0-2.9-2.35-5.2-5.25-5.35C22.7 8.9 19.4 6.25 15.5 6.25c-4.65 0-8.4 3.5-8.65 8-2.25.55-3.85 2.4-3.85 4.55 0 2.65 2.35 4.7 5.4 4.7Z"
      fill={fill}
    />
    <path
      d="M8.2 15.1c.55-3.45 3.45-6.05 7-6.25"
      fill="none"
      stroke="rgba(255,255,255,0.42)"
      strokeWidth="1.35"
      strokeLinecap="round"
    />
  </g>
)

const ClimaIcon = ({ type, size = 34 }) => {
  const common = {
    width: size, height: size, viewBox: '0 0 32 32', fill: 'none',
    className: `clima-svg clima-${type || 'parcial'}`,
    style: { display: 'block', filter: 'drop-shadow(0 1px 1.5px rgba(15,30,20,0.18))' },
  }
  const c = CLIMA_COLORS

  if (type === 'sun') return (
    <svg {...common}>
      <circle cx="16" cy="16" r="5.5" fill={c.sun}/>
      <g fill={c.sunRay}>
        <rect x="14.8" y="1" width="2.4" height="4" rx="1.2"/>
        <rect x="14.8" y="27" width="2.4" height="4" rx="1.2"/>
        <rect x="1" y="14.8" width="4" height="2.4" rx="1.2"/>
        <rect x="27" y="14.8" width="4" height="2.4" rx="1.2"/>
        <rect x="5" y="5" width="4" height="2.4" rx="1.2" transform="rotate(-45 7 6.2)"/>
        <rect x="23" y="5" width="4" height="2.4" rx="1.2" transform="rotate(45 25 6.2)"/>
        <rect x="5" y="24.6" width="4" height="2.4" rx="1.2" transform="rotate(45 7 25.8)"/>
        <rect x="23" y="24.6" width="4" height="2.4" rx="1.2" transform="rotate(-45 25 25.8)"/>
      </g>
    </svg>
  )

  if (type === 'parcial') return (
    <svg {...common}>
      <circle cx="12" cy="11" r="4" fill={c.sun}/>
      <g fill={c.sunRay}>
        <rect x="11" y="2" width="2" height="3" rx="1"/>
        <rect x="3" y="10" width="3" height="2" rx="1"/>
        <rect x="5.5" y="4.5" width="3" height="2" rx="1" transform="rotate(-45 7 5.5)"/>
      </g>
      <g transform="translate(0, 5)"><CloudShape/></g>
    </svg>
  )

  if (type === 'nublado') return (
    <svg {...common}><CloudShape fill={c.cloudG}/></svg>
  )

  if (type === 'neblina') return (
    <svg {...common}>
      <CloudShape/>
      <g fill={c.cloudG}>
        <rect x="5" y="26" width="22" height="1.6" rx="0.8"/>
        <rect x="7" y="29" width="18" height="1.6" rx="0.8"/>
      </g>
    </svg>
  )

  if (type === 'lluvia') return (
    <svg {...common}>
      <CloudShape/>
      <g className="clima-precipitacion" fill={c.rain}>
        <path className="clima-gota clima-gota-1" d="M10 24.5c-.8 1.2-1.3 2.2-1.3 3.2a1.8 1.8 0 0 0 3.6 0c0-1-.5-2-1.3-3.2-.3-.5-.7-.5-1 0z"/>
        <path className="clima-gota clima-gota-2" d="M16 24.5c-.8 1.2-1.3 2.2-1.3 3.2a1.8 1.8 0 0 0 3.6 0c0-1-.5-2-1.3-3.2-.3-.5-.7-.5-1 0z"/>
        <path className="clima-gota clima-gota-3" d="M22 24.5c-.8 1.2-1.3 2.2-1.3 3.2a1.8 1.8 0 0 0 3.6 0c0-1-.5-2-1.3-3.2-.3-.5-.7-.5-1 0z"/>
      </g>
    </svg>
  )

  if (type === 'nieve') return (
    <svg {...common}>
      <CloudShape/>
      <g className="clima-nieve-copos" fill={c.snow}>
        <circle cx="11" cy="27" r="1.6"/>
        <circle cx="16" cy="27" r="1.6"/>
        <circle cx="21" cy="27" r="1.6"/>
      </g>
    </svg>
  )

  if (type === 'chubascos') return (
    <svg {...common}>
      <CloudShape/>
      <g className="clima-precipitacion" fill={c.rain}>
        <rect x="8.5" y="24" width="1.8" height="5" rx="0.9" transform="rotate(18 9.4 26.5)"/>
        <rect x="14.5" y="24" width="1.8" height="5" rx="0.9" transform="rotate(18 15.4 26.5)"/>
        <rect x="20.5" y="24" width="1.8" height="5" rx="0.9" transform="rotate(18 21.4 26.5)"/>
      </g>
    </svg>
  )

  if (type === 'tormenta') return (
    <svg {...common}>
      <CloudShape/>
      <path d="M17 23l-4 6h2.5l-1.5 5 5-7h-2.5z" fill={c.bolt}/>
    </svg>
  )

  // Fallback: nube BLANCA con drop-shadow (si type es desconocido).
  // SIEMPRE devuelve un SVG, nunca null, nunca emoji.
  return <svg {...common}><CloudShape/></svg>
}

const ACCESOS_HOME = [
  { id: 'eventos',   emoji: '📅', label: 'Eventos' },
  { id: 'noticias',  emoji: '📰', label: 'Noticias' },
  { id: 'alertas',   emoji: '🚨', label: 'Alertas' },
]

const ACTIVIDAD_VISIBLE_INICIAL = 10

const fechaEventoPortada = (start, end) => {
  if (!start) return 'Fecha por confirmar'
  const startDate = new Date(start)
  if (Number.isNaN(startDate.getTime())) return 'Fecha por confirmar'
  const day = new Intl.DateTimeFormat('es-CL', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(startDate)
  const startTime = new Intl.DateTimeFormat('es-CL', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(startDate)
  if (!end) return `${day} · ${startTime}`
  const endDate = new Date(end)
  if (Number.isNaN(endDate.getTime())) return `${day} · ${startTime}`
  const endTime = new Intl.DateTimeFormat('es-CL', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(endDate)
  return `${day} · ${startTime}–${endTime}`
}

/* ── Íconos lineales (verde marca) para títulos de sección ──
   Mismo lenguaje visual que el TabBar: trazo 1.9, sin relleno,
   extremos redondos. Heredan C.verde por defecto. ── */
const Ico = {
  alerta: ({ size = 17, color = C.verde }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  ),
  mercado: ({ size = 17, color = C.verde }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  ),
  eventos: ({ size = 17, color = C.verde }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M3 10h18" />
    </svg>
  ),
  actividad: ({ size = 17, color = C.verde }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 11 18-5v12L3 14v-3z" />
      <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
    </svg>
  ),
  /* Pin de mapa lineal (verde marca) — reemplaza al pin con fondo blanco */
  pin: ({ size = 11, color = C.verde }) => (
    <svg width={size} height={size + 2} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  ),
}

/* ── Card horizontal para scroll lateral ──
   wide=true → card más ancha (210px) con foto más alta (96px).
   Se usa en Eventos para diferenciarse del Mercado (compacto, 140px). ── */
function PostCardH({ post, onClick, wide }) {
  const t = TIPOS[post.type] || TIPOS.general
  const autor = post.author || {}
  return (
    <button style={{ ...s.cardH, ...(wide ? s.cardHWide : {}) }} onClick={onClick}>
      <div style={{ ...s.cardHFoto, background: t.bg, ...(wide ? s.cardHFotoWide : {}) }}>
        {post.images?.[0]
          ? <img src={post.images[0]} alt="" style={s.cardHImg} />
          : <span style={s.cardHEmoji}>{t.emoji}</span>}
      </div>
      {post.price > 0
        ? <div style={s.cardHPrecio}>{plata(post.price)}</div>
        : <div style={s.cardHPrecioAlt}>{t.corto}</div>}
      <div style={s.cardHTit}>{post.title}</div>
      <div style={s.cardHAutor}>
        <span style={s.cardHAvatar}>
          {autor.avatar_url
            ? <img src={autor.avatar_url} alt="" style={s.cardHAvatarImg} />
            : <span>{iniciales(autor.full_name)}</span>}
        </span>
        <span style={s.cardHAutorTxt}>
          {(autor.full_name || 'Vecino').split(' ')[0]}
        </span>
        {autor.verified && <span style={{ fontSize: 8 }}>✅</span>}
      </div>
    </button>
  )
}

function HomeDiscoveryCarousel({ items }) {
  const railRef = useRef(null)
  const resumeTimerRef = useRef(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (items.length < 2 || paused) return undefined
    const timer = window.setInterval(() => {
      const next = (activeIndex + 1) % items.length
      const rail = railRef.current
      const card = rail?.children?.[next]
      if (rail && card) rail.scrollTo({ left: card.offsetLeft - rail.offsetLeft, behavior: 'smooth' })
      setActiveIndex(next)
    }, 5000)
    return () => window.clearInterval(timer)
  }, [activeIndex, items.length, paused])

  useEffect(() => () => window.clearTimeout(resumeTimerRef.current), [])

  const pauseTemporarily = () => {
    setPaused(true)
    window.clearTimeout(resumeTimerRef.current)
    resumeTimerRef.current = window.setTimeout(() => setPaused(false), 8000)
  }

  const updateActiveCard = event => {
    const rail = event.currentTarget
    const cards = Array.from(rail.children)
    if (!cards.length) return
    const closest = cards.reduce((best, card, index) => {
      const distance = Math.abs((card.offsetLeft - rail.offsetLeft) - rail.scrollLeft)
      return distance < best.distance ? { index, distance } : best
    }, { index: 0, distance: Infinity })
    setActiveIndex(closest.index)
  }

  if (!items.length) return null
  return (
    <section style={s.paraTiSection} aria-label="Para ti, cerca de casa">
      <div style={s.paraTiHeading}>
        <span style={s.paraTiHeadingTitle}>
          <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.verde} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3 1.5 4.3L18 9l-4.5 1.7L12 15l-1.5-4.3L6 9l4.5-1.7L12 3Z"/><path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z"/></svg>
          Para ti, cerca de casa
        </span>
        <small style={s.paraTiHeadingHint}>{items.length > 1 ? 'Desliza para descubrir' : 'Recomendado'}</small>
      </div>
      <div
        ref={railRef}
        className="home-para-ti-scroll"
        style={s.paraTiScroll}
        onScroll={updateActiveCard}
        onTouchStart={pauseTemporarily}
        onPointerDown={pauseTemporarily}
      >
        {items.map(item => (
          <button
            type="button"
            key={`${item.portadaLabel}-${item.id}`}
            className="home-featured-card"
            style={{ ...s.paraTiCard, backgroundImage: `linear-gradient(180deg, rgba(27,158,117,0) 34%, rgba(27,158,117,.48) 64%, rgba(27,158,117,.82) 86%, rgba(27,158,117,.9) 100%), url("${item.images[0]}")` }}
            onClick={item.portadaAction}
          >
            <span style={s.paraTiBadge}>{item.portadaLabel}</span>
            <span style={s.paraTiCopy}>
              <strong style={s.paraTiTitle}>{item.title || 'Algo interesante cerca de ti'}</strong>
              <span style={s.paraTiMeta}>{item.portadaMeta}</span>
            </span>
            <span style={s.paraTiArrow} aria-hidden="true">→</span>
          </button>
        ))}
      </div>
      {items.length > 1 && <div style={s.paraTiDots} aria-hidden="true">{items.map((item, index) => <span key={item.id} style={{ ...s.paraTiDot, ...(index === activeIndex ? s.paraTiDotActive : {}) }} />)}</div>}
    </section>
  )
}

// haversine: distancia en METROS entre 2 coords (lat/lng).
// Se usa para calcular qué tan lejos está cada alerta del usuario.
// No necesita PostGIS ni triggers — puro JS con la lat/lng que ya
// viene en incident_reports (la setea el user al pinear en CreatePost).
const haversine = (lat1, lng1, lat2, lng2) => {
  if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) return null
  const R = 6371000 // radio de la Tierra en metros
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))
}

const mezclarPortada = (items, limit = 10) => {
  const copy = [...items]
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1))
    ;[copy[index], copy[target]] = [copy[target], copy[index]]
  }
  return copy.slice(0, limit)
}

// Elige actividad relevante sin convertir el feed en un ranking rígido.
// Primero prioriza una mezcla de publicaciones recientes y vistas; luego
// cambia su orden en cada carga para que Inicio se sienta vivo.
const mezclarActividadRelevante = (items, limit = 30) => {
  const unique = [...new Map(items.map(item => [item.id, item])).values()]
  const now = Date.now()
  const shuffled = unique.map(item => {
    const hours = Math.max(0, (now - new Date(item.created_at).getTime()) / 3600000)
    const freshness = Math.max(0, 42 - Math.log2(hours + 1) * 7)
    const engagement = Math.min(24, Math.log2(Number(item.views_count || 0) + 1) * 4 + Math.log2(Number(item.comments_count || 0) + 1) * 5)
    const urgency = item.__incident ? 34 : item.type === 'request' ? 14 : 0
    return { item, score: freshness + engagement + urgency + Math.random() * 18 }
  }).sort((a,b)=>b.score-a.score).map(entry=>entry.item)
  const visible = []
  const deferred = []
  let alertCount = 0
  let lastType = ''

  // Las alertas siguen presentes y urgentes, pero no pueden monopolizar la
  // primera pantalla cuando también hay actividad real de vecinos o Mercado.
  shuffled.forEach((item) => {
    const kind=item.__incident?'incident':item.type
    if ((item.__incident && alertCount >= 2) || (kind===lastType && visible.length<12)) deferred.push(item)
    else {
      visible.push(item)
      if (item.__incident) alertCount += 1
      lastType=kind
    }
  })
  return [...visible, ...deferred].slice(0, limit)
}

function Home({ currentUser, onNavigate, onCrear }) {
  const [profile, setProfile] = useState(null)
  const [barrio, setBarrio] = useState(null)
  const [alertas, setAlertas] = useState([])
  const [alertasVecinales, setAlertasVecinales] = useState([])
  const [pedidos, setPedidos] = useState([])
  const [ventas, setVentas] = useState([])
  const [regalos, setRegalos] = useState([])
  const [eventos, setEventos] = useState([])
  const [eventoPortada, setEventoPortada] = useState(null)
  const [portadaSeleccionada, setPortadaSeleccionada] = useState([])
  const [actividad, setActividad] = useState([])
  const [noLeidos, setNoLeidos] = useState(0)
  const [clima, setClima] = useState(null)
  const [verFarmacias, setVerFarmacias] = useState(false)
  const [farmaciasLista, setFarmaciasLista] = useState(() => FARMACIAS.map(farmacia => ({ ...farmacia, is_active: true, is_on_duty: true })))
  const farmaciasTurno = farmaciasLista.filter(farmacia => farmacia.is_on_duty === true)
  const farmaciasOtras = farmaciasLista.filter(farmacia => farmacia.is_on_duty !== true)
  const [cargando, setCargando] = useState(true)
  const [feedError, setFeedError] = useState('')
  const [refrescando, setRefrescando] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const pullStartY = useRef(null)
  const pullDistanceRef = useRef(0)

  // ── Cargar farmacias desde Supabase ──
  // Si la query ERROR (tabla no existe, RLS cae): usamos fallback硬code.
  // Si la query OK pero viene vacía: mostramos lista vacía (NO fallback).
  // Así, si el admin borra todas las farmacias, el Inicio no muestre las viejas.
  useEffect(() => {
    let cancelado = false
    ;(async () => {
      try {
        const { data, error } = await supabase
          .from('farmacias')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true })
          .order('nombre', { ascending: true })
        if (error) throw error
        // Query OK → usar lo que devolvió (aunque sea vacío).
        if (!cancelado) setFarmaciasLista(data || [])
      } catch (e) {
        // Solo acá (tabla rota/no existe) caemos al fallback硬code.
        console.warn('[home] farmacias BD falló, uso fallback:', e?.message)
        if (!cancelado) setFarmaciasLista(FARMACIAS.map(farmacia => ({ ...farmacia, is_active: true, is_on_duty: true })))
      }
    })()
    return () => { cancelado = true }
  }, [])
  const [verMasActividad, setVerMasActividad] = useState(false)
  const [userCoords, setUserCoords] = useState(null)

  // La campana representa notificaciones de la app, no mensajes del chat.
  useEffect(() => {
    if (!profile?.id) return undefined
    let active = true
    const cargarNotificacionesNoLeidas = async () => {
      const { count, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', profile.id)
        .is('read_at', null)
        .or('read.is.null,read.eq.false')
      if (!error && active) setNoLeidos(count || 0)
    }
    cargarNotificacionesNoLeidas()
    const channel = supabase
      .channel(`home-notifications-${profile.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.id}` }, cargarNotificacionesNoLeidas)
      .subscribe()
    return () => { active = false; supabase.removeChannel(channel) }
  }, [profile?.id])

  // ── CACHE LOCAL (stale-while-revalidate) ──
  // La primera vez que entra, baja todo y lo guarda en localStorage con
  // timestamp. La segunda vez, pinta INSTANTANEAMENTE con el cache viejo
  // y refresca en segundo plano. Así el Home "vuela" cuando volvés.
  const CACHE_KEY = 'elbarrio_home_v2'

  // Lee el cache del localStorage. Si hay, pinta todo instantáneamente
  // (sin spinner) y deja cargando=false. Después cargar() refresca en
  // background silenciosamente.
  const leerCache = () => {
    try {
      const raw = localStorage.getItem(CACHE_KEY)
      if (!raw) return null
      const c = JSON.parse(raw)
      if (!c || !c.profile) return null
      // TTL de seguridad: si el cache tiene más de 1 hora, lo ignoramos
      // (probablemente está desactualizado y mejor mostrar spinner).
      if (Date.now() - c.ts > 60 * 60 * 1000) return null
      return c
    } catch { return null }
  }

  const escribirCache = (data) => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ ...data, ts: Date.now() }))
    } catch {
      // El cache es una mejora de rendimiento; la app funciona sin él.
    }
  }

  useEffect(() => {
    // 1) Pintar cache instantáneamente si existe (sin spinner).
    const cache = leerCache()
    if (cache) {
      // Estado externo persistido: hidratarlo aquí evita un frame vacío.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProfile(cache.profile)
      setBarrio(cache.barrio)
      setAlertas(cache.alertas || [])
      setAlertasVecinales(cache.alertasVecinales || [])
      setPedidos(cache.pedidos || [])
      setVentas(cache.ventas || [])
      setRegalos(cache.regalos || [])
      setEventos(cache.eventos || [])
      setEventoPortada(cache.eventoPortada || null)
      setPortadaSeleccionada(cache.portadaSeleccionada || [])
      setActividad(cache.actividad || [])
      setNoLeidos(cache.noLeidos || 0)
      setClima(cache.clima || null)
      setCargando(false)  // ya tenemos algo que mostrar
      // Si el cache tenía barrio pero NO clima (primer cacheo, o se borró),
      // disparamos cargarClima AHORA — en paralelo con cargar(), no después.
      // Así el bloque clima+farmacia aparece lo antes posible.
      if (cache.barrio?.lat && cache.barrio?.lng && !cache.clima) {
        cargarClima(cache.barrio.lat, cache.barrio.lng)
      }
    }
    // 2) Lanzar refresh en background (stale-while-revalidate).
    cargar(cache?.profile?.neighborhood_id)
  }, [currentUser?.id]) // eslint-disable-line react-hooks/exhaustive-deps -- hidrata una vez por usuario

  // Las alertas son urgentes: cualquier alta, cierre o actualización de otro
  // vecino debe reflejarse sin exigir salir de Inicio ni refrescar manualmente.
  useEffect(() => {
    if (!profile?.neighborhood_id) return undefined
    const channel = supabase
      .channel(`home-incidents-${profile.neighborhood_id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'incident_reports',
        filter: `neighborhood_id=eq.${profile.neighborhood_id}`,
      }, () => cargar(profile.neighborhood_id))
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [profile?.neighborhood_id]) // eslint-disable-line react-hooks/exhaustive-deps -- recarga el barrio activo

  // GPS del usuario: pedimos una vez al montar el Home.
  // Si lo acepta, guardamos las coords para (a) calcular distancia a cada
  // alerta y (b) refrescar el clima con la ubicación EXACTA del usuario
  // (no el centro del barrio, que puede estar a kilómetros).
  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      // Sin enableHighAccuracy: el GPS de alta precisión tarda 3-8s en móvil.
      // Con maximumAge: 5min reutilizamos la última posición conocida.
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 }
    )
  }, [])

  // Cuando llegan las coords reales del usuario, refrescamos el clima
  // usando SU ubicación exacta (no la del barrio). open-meteo resuelve
  // el clima a ~1km de precisión, así que esto es muy distinto al centro
  // del barrio si el barrio es grande o el usuario se movió.
  // Refresca si: (a) no hay cache, (b) cache sin `type` (formato viejo),
  // o (c) cache con >10 min. Así nos aseguramos de que el SVG correcto
  // aparezca sí o sí, sin depender de que cargar() termine.
  useEffect(() => {
    if (!userCoords?.lat || !userCoords?.lng) return
    const cache = leerCache()
    const CLIMA_FRESH = 10 * 60 * 1000  // 10 min
    const sinType = !cache?.clima?.type
    const fresco = cache?.clima?.ts && !sinType && (Date.now() - cache.clima.ts < CLIMA_FRESH)
    if (!fresco) {
      cargarClima(userCoords.lat, userCoords.lng)
    }
  }, [userCoords?.lat, userCoords?.lng]) // eslint-disable-line react-hooks/exhaustive-deps -- solo al cambiar la ubicación

  // neighborhoodIdOpt: si viene del cache, arrancamos las queries en paralelo
  // SIN esperar el profile del servidor (ya lo tenemos del cache). Eso
  // ahorra 200-400ms de query serial bloqueante.
  async function cargar(neighborhoodIdOpt) {
    if (!currentUser?.id) return
    // Solo mostramos spinner si NO tenemos cache (primera vez).
    const cache = leerCache()
    if (!cache) setCargando(true)
    setFeedError('')
    try {
      // ── Paso 1 (paralelo con todo): profile del usuario ──
      // Si tenemos neighborhood_id del cache, no necesitamos esperar el
      // profile para lanzar las queries de abajo — lo hacemos en paralelo.
      let p = cache?.profile
      const profilePromise = supabase
        .from('profiles').select('*')
        .eq('user_id', currentUser.id).maybeSingle()

      if (!p) {
        // Primera vez: esperamos el profile (no hay otra opción).
        const { data: pData } = await profilePromise
        p = pData
        if (!p) {
          setFeedError('No pudimos encontrar tu perfil vecinal.')
          return
        }
        setProfile(p)
      }

      const neighborhoodId = neighborhoodIdOpt || p.neighborhood_id

      // ── Paso 2: 4 queries en paralelo (antes eran 9) ──
      // Unificamos pedidos/ventas/regalos/eventos/actividad en UNA sola
      // query a posts con type IN (...) y limit alto. Particionamos en JS.
      const TIPOS_FEED = ['request', 'sell', 'gift', 'trade', 'event', 'news', 'general']
      const selectPost = '*, author:profiles!author_id (full_name, avatar_url, badge_founder, verified, is_official_actor, official_actor_name)'

      const [profileRes, hoodRes, alertRes, postsRes, msgRes, spotlightRes, carouselRes, blocksRes] = await Promise.all([
        // Refresca el profile en background si lo teníamos del cache.
        cache ? profilePromise : Promise.resolve({ data: p }),
        supabase.from('neighborhoods').select('*')
          .eq('id', neighborhoodId).maybeSingle(),

        supabase.from('incident_reports')
          .select('*, reporter:profiles!reporter_id (full_name, avatar_url, badge_founder, is_official_actor, official_actor_name)')
          .eq('neighborhood_id', neighborhoodId)
          .eq('status', 'active')
          .order('confirms_count', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(10),

        // UNA sola query para todo el feed (antes eran 6 separadas).
        supabase.from('posts')
          .select(selectPost)
          .eq('neighborhood_id', neighborhoodId)
          .eq('status', 'active')
          .in('type', TIPOS_FEED)
          .order('created_at', { ascending: false })
          .limit(60),

        supabase.from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', p.id).is('read_at', null)
          .or('read.is.null,read.eq.false'),

        supabase.from('posts')
          .select(selectPost)
          .eq('neighborhood_id', neighborhoodId)
          .eq('type', 'event')
          .eq('status', 'active')
          .eq('show_on_home', true)
          .gte('starts_at', new Date().toISOString())
          .order('starts_at', { ascending: true })
          .limit(1)
          .maybeSingle(),

        supabase.from('posts')
          .select(selectPost)
          .eq('neighborhood_id', neighborhoodId)
          .eq('status', 'active')
          .not('home_carousel_order', 'is', null)
          .order('home_carousel_order', { ascending: true })
          .limit(15),
        supabase.from('user_blocks').select('blocked_id').eq('blocker_id', p.id),
      ])

      if (hoodRes.error) throw hoodRes.error
      if (postsRes.error) throw postsRes.error
      if (spotlightRes.error) {
        // La portada editorial falla cerrada: si la migración aún no existe o
        // la consulta falla, Inicio sigue funcionando y no muestra el bloque.
        console.warn('[home] portada editorial no disponible:', spotlightRes.error.message)
      }
      const spotlightEvent = spotlightRes.error ? null : spotlightRes.data
      const carouselPool = carouselRes.error ? [] : (carouselRes.data || []).filter(item => item.images?.[0])
      const carouselItems = mezclarPortada(carouselPool, 10)

      // Si el profile refrescado trae datos nuevos, los usamos.
      const profileFresco = profileRes?.data || p
      if (profileFresco && profileFresco !== p) setProfile(profileFresco)
      supabase.rpc('deliver_my_due_event_reminders').then(({ error: reminderError }) => {
        if (reminderError) console.warn('[home] recordatorios de eventos no disponibles:', reminderError.message)
      })

      setBarrio(hoodRes.data)

      // Las alertas oficiales usan la huincha destacada de portada. Las
      // alertas vecinales activas se incorporan inmediatamente a Actividad.
      // Filtramos expiradas en JS (no en el servidor) para no romper si
      // la columna expires_at no existe en el schema.
      if (alertRes.error) {
        console.error('[el barrio] Error cargando alertas:', alertRes.error)
        setFeedError('La actividad cargó, pero no pudimos actualizar las alertas.')
      }
      const blockedIds = new Set((blocksRes.data || []).map(item => item.blocked_id))
      const ahoraMs = Date.now()
      const todasLasAlertas = (alertRes.data || []).filter((a) => {
        if (blockedIds.has(a.reporter_id)) return false
        if (!a.expires_at) return true
        return new Date(a.expires_at).getTime() > ahoraMs
      })
      // Solo las marcadas oficialmente usan la huincha destacada del Home.
      const alertasActivas = todasLasAlertas.filter((a) => a.is_official === true)
      const alertasVecinalesActivas = todasLasAlertas.filter((a) => a.is_official !== true)
      setAlertas(alertasActivas)
      setAlertasVecinales(alertasVecinalesActivas)

      // ── Particionar posts por type (en vez de 6 queries) ──
      const todos = (postsRes.data || []).filter(item => !blockedIds.has(item.author_id))
      const ahora = Date.now()
      const pedidosActivos = todos
        .filter((x) => x.type === 'request' && (!x.needed_by || new Date(x.needed_by).getTime() > ahora))
        .sort((a, b) => {
          const pa = a.needed_by ? new Date(a.needed_by).getTime() : Infinity
          const pb = b.needed_by ? new Date(b.needed_by).getTime() : Infinity
          return pa - pb
        })
        .slice(0, 10)

      const ventas = todos.filter((x) => x.type === 'sell').slice(0, 10)
      const regalos = todos.filter((x) => x.type === 'gift' || x.type === 'trade').slice(0, 10)
      const eventos = todos.filter((x) => x.type === 'event').slice(0, 10)
      // Actividad también descubre publicaciones de Mercado. La selección
      // final mezcla contenidos recientes y vistos para evitar un orden fijo.
      const actividad = todos.filter((x) =>
        ['general', 'sell', 'gift', 'trade'].includes(x.type)
        || (x.type === 'news' && x.show_in_activity === true)
      ).slice(0, 40)

      setPedidos(pedidosActivos)
      setVentas(ventas)
      setRegalos(regalos)
      setEventos(eventos)
      setEventoPortada(spotlightEvent || null)
      setPortadaSeleccionada(carouselItems)
      setActividad(actividad)
      setNoLeidos(msgRes.count || 0)

      // ── Guardar cache para la próxima vez ──
      escribirCache({
        profile: profileFresco,
        barrio: hoodRes.data,
        alertas: alertasActivas,
        alertasVecinales: alertasVecinalesActivas,
        pedidos: pedidosActivos,
        ventas, regalos, eventos, eventoPortada: spotlightEvent || null, portadaSeleccionada: carouselItems, actividad,
        noLeidos: msgRes.count || 0,
        clima: cache?.clima || null,
      })

      // Clima: se refresca si (a) no hay cache, (b) cambió el barrio,
      // (c) el clima cacheado tiene más de 30 min (stale), o (d) el cache
      // está en formato viejo (sin `type` — de antes del cambio a SVG).
      // El clima cambia con el tiempo, no queremos mostrarlo stale por horas.
      const CLIMA_TTL = 10 * 60 * 1000  // 10 min — el clima cambia rápido
      const climaStale = !cache?.clima
        || !cache.clima?.type
        || (cache.clima?.ts && Date.now() - cache.clima.ts > CLIMA_TTL)
      const barrioCambio = cache?.barrio?.id !== hoodRes.data?.id
      if (hoodRes.data && (!cache || climaStale || barrioCambio)) {
        // Prioridad: si el usuario ya dio permiso de GPS, usamos SU ubicación
        // exacta. Si no (o aún no llegó), usamos el centro del barrio como
        // fallback. Esto hace que el clima sea preciso donde está el usuario,
        // no donde está el centro administrativo del barrio.
        const lat = userCoords?.lat || hoodRes.data?.lat
        const lng = userCoords?.lng || hoodRes.data?.lng
        cargarClima(lat, lng)
      }
    } catch (err) {
      console.error('Error cargando el radar:', err)
      setFeedError(cache
        ? 'No pudimos actualizar el Inicio. Sigues viendo la última información disponible.'
        : 'No pudimos cargar la actividad de tu barrio. Revisa tu conexión e inténtalo nuevamente.')
    } finally {
      setCargando(false)
    }
  }

  async function cargarClima(lat, lng) {
    if (!lat || !lng) return
    try {
      const r = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
        `&current=temperature_2m,weather_code&timezone=America%2FSantiago`
      )
      const d = await r.json()
      if (d?.current) {
        const nuevoClima = {
          temp: Math.round(d.current.temperature_2m),
          ...CLIMA_EMOJI(d.current.weather_code),
          // guardamos ts para poder invalidar el clima a los 30 min
          // (el clima cambia, no queremos mostrarlo stale por horas).
          ts: Date.now(),
        }
        setClima(nuevoClima)
        // ⚠️ FIX: persistir el clima al cache. Antes no lo hacíamos, así
        // que en cada visita cache.clima era null y el bloque aparecía 1s
        // después. Ahora se guarda y la próxima vez pinta instantáneo.
        const cache = leerCache()
        if (cache) {
          escribirCache({ ...cache, clima: nuevoClima })
        }
      }
    } catch {
      // El bloque de clima se omite si el proveedor temporalmente no responde.
    }
  }

  const actualizarPullDistance = (value) => {
    const next = Math.max(0, Math.min(value, 68))
    pullDistanceRef.current = next
    setPullDistance(next)
  }

  const onPullStart = (event) => {
    if (event.currentTarget.scrollTop > 0 || refrescando) return
    pullStartY.current = event.touches?.[0]?.clientY ?? null
  }

  const onPullMove = (event) => {
    if (pullStartY.current == null || event.currentTarget.scrollTop > 0) return
    const currentY = event.touches?.[0]?.clientY
    if (currentY == null) return
    actualizarPullDistance((currentY - pullStartY.current) * 0.42)
  }

  const onPullEnd = async () => {
    const shouldRefresh = pullDistanceRef.current >= 44
    pullStartY.current = null
    actualizarPullDistance(0)
    if (!shouldRefresh || refrescando) return

    setRefrescando(true)
    const startedAt = Date.now()
    await cargar(profile?.neighborhood_id)
    const elapsed = Date.now() - startedAt
    if (elapsed < 450) {
      await new Promise((resolve) => setTimeout(resolve, 450 - elapsed))
    }
    setRefrescando(false)
  }

  const nav = onNavigate || (() => {})
  const crear = onCrear || (() => {})

  // Pedidos, alertas, eventos y Mercado comparten Actividad. Se calcula solo
  // cuando cambian sus datos para que las tarjetas no salten durante un render.
  const actividadBarrio = useMemo(() => {
    const alertasActividad = alertasVecinales.map((alerta) => ({
      ...alerta,
      id: `incident-${alerta.id}`,
      incidentId: alerta.id,
      type: 'alert',
      title: alerta.title || alerta.description?.slice(0, 60) || 'Alerta vecinal',
      content: alerta.description || null,
      author: alerta.reporter || null,
      __incident: true,
    }))
    const eventosActividad = eventos.filter((evento) => evento.show_in_activity === true)
    const eventosSecundarios = eventoPortada
      ? eventosActividad.filter(evento => evento.id !== eventoPortada.id)
      : eventosActividad
    return mezclarActividadRelevante(
      [...pedidos, ...alertasActividad, ...eventosSecundarios, ...actividad],
      30,
    )
  }, [pedidos, alertasVecinales, eventos, eventoPortada, actividad])

  const filtrados = actividadBarrio

  const onAcceso = (id) => {
    if (id === 'pedidos') crear('request')
    else if (id === 'noticias') nav('noticias')
    else if (id === 'alertas') nav('alertas')
    else nav(id)
  }

  if (cargando) {
    return (
      <div style={s.wrap}>
        <div style={s.cargando}>
          <img src={`${import.meta.env.BASE_URL}isotipo.png`} alt="" style={{ width: 58, opacity: 0.4 }} />
        </div>
      </div>
    )
  }

  const nombre = (profile?.full_name || '').split(' ')[0] || 'vecino'

  const buscando = false

  // Mercado = ventas + regalos/trueques en una sola fila (ordenados por fecha)
  const mercado = [...ventas, ...regalos].sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  // Portada útil y cercana: máximo tres contenidos reales con fotografía.
  // El evento elegido desde el panel conserva prioridad; los demás espacios
  // se completan con información editorial y un descubrimiento del Mercado.
  const eventoParaTi = [eventoPortada, ...eventos]
    .filter((item, index, list) => item?.images?.[0] && list.findIndex(candidate => candidate?.id === item.id) === index)
    .filter(item => !item.starts_at || new Date(item.starts_at).getTime() >= Date.now())
    .sort((a, b) => {
      if (a.id === eventoPortada?.id) return -1
      if (b.id === eventoPortada?.id) return 1
      return new Date(a.starts_at || a.created_at).getTime() - new Date(b.starts_at || b.created_at).getTime()
    })[0]
  const datoParaTi = actividad.find(item => item.type === 'news' && item.images?.[0])
  const descubrimientoParaTi = mercado.find(item => item.images?.[0])
  const paraTiAutomatico = [
    eventoParaTi && {
      ...eventoParaTi,
      portadaLabel: 'PANORAMA',
      portadaMeta: fechaEventoPortada(eventoParaTi.starts_at, eventoParaTi.ends_at),
      portadaAction: () => nav('eventdetail', { postId: eventoParaTi.id }),
    },
    datoParaTi && {
      ...datoParaTi,
      portadaLabel: 'DATO ÚTIL',
      portadaMeta: datoParaTi.news_source || 'Información para tu barrio',
      portadaAction: () => nav('noticias', { newsId: datoParaTi.id }),
    },
    descubrimientoParaTi && {
      ...descubrimientoParaTi,
      portadaLabel: descubrimientoParaTi.type === 'gift' ? 'PARA COMPARTIR' : 'DESCUBRE',
      portadaMeta: descubrimientoParaTi.price > 0 ? plata(descubrimientoParaTi.price) : (TIPOS[descubrimientoParaTi.type]?.corto || 'Cerca de casa'),
      portadaAction: () => nav('post', { postId: descubrimientoParaTi.id }),
    },
  ].filter(Boolean)
  const paraTi = (portadaSeleccionada.length ? portadaSeleccionada : paraTiAutomatico)
    .slice(0, 10)
    .map(item => {
      if (item.portadaAction) return item
      if (item.type === 'event') return { ...item, portadaLabel: 'PANORAMA', portadaMeta: fechaEventoPortada(item.starts_at, item.ends_at), portadaAction: () => nav('eventdetail', { postId: item.id }) }
      if (item.type === 'news') return { ...item, portadaLabel: 'DATO ÚTIL', portadaMeta: item.news_source || 'Información para tu barrio', portadaAction: () => nav('noticias', { newsId: item.id }) }
      return { ...item, portadaLabel: item.type === 'gift' ? 'PARA COMPARTIR' : 'DESCUBRE', portadaMeta: item.price > 0 ? plata(item.price) : (TIPOS[item.type]?.corto || 'Cerca de casa'), portadaAction: () => nav('post', { postId: item.id }) }
    })

  return (
    <div style={s.wrap}>

      {/* ══════ Animaciones del clima ══════ */}
      <style>{`
        @keyframes climaLlover {
          0% { transform: translateY(-0.5px); opacity: 0.35; }
          50% { opacity: 0.9; }
          100% { transform: translateY(2px); opacity: 0.25; }
        }
        .clima-gota {
          animation: climaLlover 1.55s ease-in-out infinite;
          transform-box: fill-box;
          transform-origin: center;
        }
        .clima-gota-2 { animation-delay: 0.35s; }
        .clima-gota-3 { animation-delay: 0.7s; }
        .clima-precipitacion {
          transform: none;
        }
        .clima-nieve-copos {
          animation: climaLlover 2.1s ease-in-out infinite;
          transform-box: fill-box;
          transform-origin: center;
        }
        @keyframes homeRefreshSpin {
          to { transform: rotate(360deg); }
        }
        @keyframes homeFeaturedShine {
          0%, 72% { transform: translateX(-150%) rotate(16deg); opacity: 0; }
          78% { opacity: .34; }
          92%, 100% { transform: translateX(470%) rotate(16deg); opacity: 0; }
        }
        .home-featured-card::after {
          content: '';
          position: absolute;
          inset: -45% auto -45% -24%;
          width: 13%;
          pointer-events: none;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,.9), transparent);
          filter: blur(1px);
          animation: homeFeaturedShine 6.8s ease-in-out infinite;
        }
        .home-para-ti-scroll::-webkit-scrollbar { display: none; }
        @media (prefers-reduced-motion: reduce) {
          .home-featured-card::after { animation: none; }
        }

      `}</style>

      {/* ══════ CABECERA ══════ */}
      <div style={s.header}>
        <div style={s.headerTop}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={s.saludo}>¡{saludo()}, {nombre}! 👋</div>
            <div style={s.barrioRow}>
              <span style={{ fontSize: 13 }}>📍</span>
              <span style={s.barrioNombre}>
                {barrio?.name || 'Mi barrio'}
                {barrio?.city ? `, ${barrio.city}` : ''}
              </span>
            </div>
          </div>

          <div style={s.headerBtns}>
            <span style={s.headerDivider} aria-hidden="true" />
            <button style={s.iconBtn} onClick={() => nav('mapa')} aria-label="Mapa del barrio">
              <span aria-hidden="true" style={{ fontSize: 21, lineHeight: 1, transform: 'translateY(-1px)' }}>📍</span>
            </button>
            <button style={s.iconBtn} onClick={() => nav('notificaciones')} aria-label="Notificaciones">
              🔔
              {noLeidos > 0 && (
                <span style={s.badge}>{noLeidos > 9 ? '9+' : noLeidos}</span>
              )}
            </button>
            <button style={s.avatarBtn} onClick={() => nav('perfil')} aria-label="Mi perfil">
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt="" style={s.avatarImg} />
                : <span style={s.avatarTxt}>{iniciales(profile?.full_name)}</span>}
            </button>
          </div>
        </div>

      </div>

      <div
        style={s.scroll}
        onTouchStart={onPullStart}
        onTouchMove={onPullMove}
        onTouchEnd={onPullEnd}
        onTouchCancel={onPullEnd}
      >
        <div
          style={{
            ...s.pullRefresh,
            height: refrescando ? 38 : pullDistance,
            opacity: refrescando ? 1 : Math.min(pullDistance / 44, 1),
          }}
        >
          <span style={{
            ...s.pullRefreshIcon,
            transform: refrescando ? undefined : `rotate(${Math.min(pullDistance * 4, 180)}deg)`,
            animation: refrescando ? 'homeRefreshSpin 750ms linear infinite' : 'none',
          }}>↻</span>
          <span>{refrescando ? 'Actualizando' : 'Suelta para actualizar'}</span>
        </div>

        {feedError && (
          <div style={s.feedError} role="alert">
            <span>{feedError}</span>
            <button type="button" style={s.feedErrorButton} onClick={() => cargar(profile?.neighborhood_id)}>Reintentar</button>
          </div>
        )}

        {/* ══════ CLIMA + FARMACIA ══════ */}
        {clima && (
          <div style={s.tiraInfo}>
            <div style={s.climaBloque}>
              <span style={s.climaEmoji}><ClimaIcon type={clima.type}/></span>
              <div>
                <div style={s.climaTemp}>{clima.temp}°C</div>
                <div style={s.climaTxt}>{clima.t}</div>
                <div style={s.climaTxt}>{barrio?.city || 'Santiago'}</div>
              </div>
            </div>

            <div style={s.tiraDivisor} />

            {farmaciasTurno.length > 0 && (
              <button style={s.farmaciaBloque} onClick={() => setVerFarmacias(true)}>
                <div style={s.farmaciaLabel}>
                  💊 Farmacia de turno
                  {farmaciasTurno.length > 1 && (
                    <span style={s.farmaciaMas}> +{farmaciasTurno.length - 1}</span>
                  )}
                </div>
                <div style={s.farmaciaNombre}>{farmaciasTurno[0].nombre}</div>
                <div style={s.farmaciaDir}>
                  {farmaciasTurno[0].direccion} · {farmaciasTurno[0].horario}
                </div>
              </button>
            )}
          </div>
        )}

        {/* ══════ PARA TI, CERCA DE CASA — contenido real, útil y visual ══════ */}
        {!buscando && <HomeDiscoveryCarousel items={paraTi} />}

        {/* ══════ ALERTA OFICIAL (solo creada/marcada desde el panel) ══════ */}
        {!buscando && alertas.length > 0 && (
          <div style={{ ...s.seccion, marginBottom: 12 }}>
            <div style={{ ...s.seccionTit, marginBottom: 7 }}>
              <Ico.alerta color={C.rojo} />
              <span style={s.seccionTxt}>Alerta oficial</span>
              <button style={s.verTodasBtn} onClick={() => nav('alertas')}>
                Ver alertas <span style={s.verTodasFlecha}>→</span>
              </button>
            </div>
            {alertas.slice(0, 1).map((a) => {
              const cat = REPORTES[a.category] || REPORTES.seguridad
              const metros = (a.latitude && a.longitude && userCoords)
                ? haversine(userCoords.lat, userCoords.lng, a.latitude, a.longitude)
                : a.distance_meters
              return (
                <button
                  key={a.id}
                  style={s.alertaOficial}
                  onClick={() => nav('alerta', { id: a.id })}
                >
                  <span style={{ ...s.alertaOficialIcono, color: cat.color }}>{cat.emoji}</span>
                  <span style={s.alertaOficialContenido}>
                    <span style={s.alertaOficialTitulo}>
                      {(a.title && a.title.trim()) || a.description?.slice(0, 60) || 'Alerta del barrio'}
                    </span>
                    <span style={s.alertaOficialMeta}>
                      <span style={s.alertaOficialBadge}>INFORMACIÓN OFICIAL</span>
                      <span>· {hace(a.created_at)}</span>
                      {metros != null && <span>· {metros} m</span>}
                    </span>
                  </span>
                  <span style={s.alertaRowFlecha}>›</span>
                </button>
              )
            })}
          </div>
        )}

        {/* ══════ ACCESOS RÁPIDOS ══════ */}
        <div style={s.accesos}>
          {ACCESOS_HOME.map((a) => (
            <button
              key={a.id}
              style={s.acceso}
              onClick={() => onAcceso(a.id)}
            >
              <span style={s.accesoIcono}>{a.emoji}</span>
              <span style={s.accesoLabel}>{a.label}</span>
            </button>
          ))}
        </div>

        {/* ══════ PEDIDOS VECINALES ══════ */}
        {!buscando && (
          <div style={{ ...s.seccion, margin: '8px 0' }}>
            <button style={s.pedirBarra} onClick={() => crear('request')}>
              <span style={s.pedirBarraEmoji}>🙋</span>
              <span style={s.pedirBarraTxt}>
                <span style={s.pedirBarraTit}>¿Necesitás una mano?</span>
                <span style={s.pedirBarraSub}>Gasfíter, flete, cuidado de perro...</span>
              </span>
              <span style={s.pedirBarraCta}>¡Pídelo!</span>
            </button>

          </div>
        )}

        {/* ══════ MERCADO (scroll lateral: ventas + regalos + trueques juntos) ══════
            Card sin minHeight en título → no queda espacio vacío abajo.
            Botón "ver más" navega al Marketplace completo.
            marginBottom: 20 inline para separar bien de Actividad de el barrio. */}
        {!buscando && mercado.length > 0 && (
          <div style={{ ...s.seccion, marginBottom: 7 }}>
            <div style={s.seccionTit}>
              <Ico.mercado />
              <span style={s.seccionTxt}>Mercado</span>
              <button
                style={{ ...s.verTodasBtn, fontSize: 13.5, padding: '5px 2px 5px 8px' }}
                onClick={() => nav('mercado')}
              >
                + ver más
                <span style={s.verTodasFlecha}>→</span>
              </button>
            </div>
            <div style={{ ...s.scrollH, paddingTop: 2 }}>
              {mercado.slice(0, 15).map((p) => (
                <PostCardH
                  key={p.id}
                  post={p}
                  onClick={() => nav('post', { postId: p.id })}
                />
              ))}
            </div>
          </div>
        )}

        {/* ══════ ACTIVIDAD DE EL BARRIO (vertical, 10 + "+ ver más") ══════
            Feed principal — publicaciones generales de vecinos.
            Ahora queda ARRIBA de Eventos para que no se pierda. */}
        <div style={s.seccion}>
          <div style={s.seccionTit}>
            <Ico.actividad />
            <span style={s.seccionTxt}>
              Actividad de <span style={s.marca}>el barrio</span>
            </span>
          </div>

          {filtrados.length === 0 ? (
            <div style={s.vacio}>
              <div style={s.vacioEmoji}>🏘️</div>
              <div style={s.vacioTit}>Todavía no hay movimiento</div>
              <div style={s.vacioTxt}>Sé el primero en publicar algo.</div>
            </div>
          ) : (
            <>
              {filtrados.slice(0, verMasActividad ? filtrados.length : ACTIVIDAD_VISIBLE_INICIAL).map((p) => {
                const reporte = p.__incident ? (REPORTES[p.category] || REPORTES.seguridad) : null
                const t = reporte
                  ? { ...reporte, corto: reporte.label }
                  : (TIPOS[p.type] || TIPOS.general)
                return (
                  <div
                    key={p.id}
                    style={s.postCard}
                    onClick={() => p.__incident
                      ? nav('alerta', { id: p.incidentId })
                      : p.type === 'event'
                        ? nav('eventdetail', { postId: p.id })
                        : p.type === 'news'
                          ? nav('noticias', { newsId: p.id })
                      : nav('post', { postId: p.id })}
                  >
                    <div style={{ ...s.postFoto, background: t.bg }}>
                      {p.images?.[0]
                        ? <img src={p.images[0]} alt="" style={s.postImg} />
                        : <span style={s.postEmoji}>{t.emoji}</span>}
                    </div>

                    <div style={{
                      ...s.postInfo,
                      ...(p.__incident ? s.alertActivityInfo : {}),
                    }}>
                      <div style={s.postTit}>{p.title}</div>
                      {p.content && <div style={s.postTxt}>{p.content}</div>}

                      <div style={s.postMetaRow}>
                        <span style={{ ...s.chip, background: t.bg, color: t.color }}>
                          {t.corto}
                        </span>
                        <span style={s.postAutorTop}>
                          <span style={s.postAutorSep}>|</span>
                          <span>Por {(p.author?.official_actor_name || p.author?.full_name || 'Vecino').split(' ')[0]}</span>
                          {p.author?.verified && <span style={s.verificadoMini}>✓</span>}
                          {p.author?.is_official_actor && <span style={s.verificadoMini}>OFICIAL</span>}
                          {p.author?.badge_founder && <span style={s.fundadorBadge} title="Vecino fundador" aria-label="Vecino fundador">🏅</span>}
                          <span>· {hace(p.created_at)}</span>
                        </span>
                        {p.price > 0 && <span style={s.precio}>{plata(p.price)}</span>}
                        {p.is_negotiable && <span style={s.chipNeg}>Conversable</span>}
                      </div>
                    </div>
                    <span style={s.activityTypeIcon} aria-label={p.__incident ? 'Alerta vecinal' : (TIPOS[p.type]?.label || 'Publicación')}>
                      {p.__incident ? '🚨' : (TIPOS[p.type]?.emoji || '💬')}
                    </span>
                  </div>
                )
              })}

              {!verMasActividad && filtrados.length > ACTIVIDAD_VISIBLE_INICIAL && (
                <button
                  style={s.verMasBtn}
                  onClick={() => setVerMasActividad(true)}
                >
                  + ver más ({filtrados.length - ACTIVIDAD_VISIBLE_INICIAL})
                </button>
              )}
              {verMasActividad && filtrados.length > ACTIVIDAD_VISIBLE_INICIAL && (
                <button
                  style={s.verMasBtn}
                  onClick={() => setVerMasActividad(false)}
                >
                  Ver menos
                </button>
              )}
            </>
          )}
        </div>

        {/* ══════ EVENTOS (scroll lateral) ══════
            Movido al FINAL, bajo Actividad de el barrio — el feed principal
            ya no se pierde tapado por esta fila. */}
        {!buscando && eventos.length > 0 && (
          <div style={s.seccion}>
            <div style={s.seccionTit}>
              <Ico.eventos />
              <span style={s.seccionTxt}>Eventos</span>
              {eventos.length > 6 && <span style={s.cantidad}>{eventos.length}</span>}
            </div>
            <div style={s.scrollH}>
              {eventos.slice(0, 10).map((p) => (
                <PostCardH
                  key={p.id}
                  post={p}
                  wide
                  onClick={() => nav('post', { postId: p.id })}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ══════ MODAL DE FARMACIAS ══════ */}
      {verFarmacias && (
        <div style={s.modalFondo} onClick={() => setVerFarmacias(false)}>
          <div style={s.modalCaja} onClick={(e) => e.stopPropagation()}>
            <div style={s.modalTit}>💊 Farmacias del barrio</div>
            <div style={s.modalContenido}>
              {[
                { title: 'De turno ahora', items: farmaciasTurno, duty: true },
                { title: 'Otras farmacias cercanas', items: farmaciasOtras, duty: false },
              ].filter(group => group.items.length > 0).map(group => (
                <section key={group.title} style={s.farmGrupo}>
                  <div style={s.farmGrupoTit}>{group.title}<span>{group.items.length}</span></div>
                  {group.items.map((f, i) => (
                    <div key={f.id || `${group.title}-${i}`} style={{ ...s.farmCard, ...(group.duty ? s.farmCardDuty : {}) }}>
                      <div style={s.farmCardTop}><div style={s.farmNombre}>{f.nombre}</div>{group.duty && <span style={s.farmDutyBadge}>De turno</span>}</div>
                      <div style={s.farmDir}>📍 {f.direccion}{f.comuna ? ', ' + f.comuna : ''}</div>
                      <div style={s.farmHora}>🕐 {f.horario || '24 horas'}</div>

                      <div style={s.farmBtns}>
                        <button
                          style={s.farmBtn}
                          onClick={() => {
                            const lat = Number(f.lat)
                            const lng = Number(f.lng)
                            const hasCoordinates = f.lat !== null && f.lat !== undefined && f.lat !== '' && f.lng !== null && f.lng !== undefined && f.lng !== ''
                            const validCoordinates = hasCoordinates && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
                            const destination = validCoordinates
                              ? `${lat},${lng}`
                              : [f.direccion, f.comuna, 'Chile'].filter(Boolean).join(', ')
                            const mapsUrl = new URL('https://www.google.com/maps/dir/')
                            mapsUrl.searchParams.set('api', '1')
                            mapsUrl.searchParams.set('destination', destination)
                            window.open(mapsUrl.toString(), '_blank', 'noopener,noreferrer')
                          }}
                        >
                          📍 Cómo llegar
                        </button>
                        {f.telefono && <button style={{ ...s.farmBtn, background: C.verde, color: '#fff' }} onClick={() => window.open(`tel:${f.telefono}`)}>📞 Llamar</button>}
                      </div>
                    </div>
                  ))}
                </section>
              ))}
            </div>

            <button style={s.modalCerrar} onClick={() => setVerFarmacias(false)}>
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ═════════════════════════════════════════════════
const s = {
  wrap: {
    width: '100%', height: '100%',
    background: C.fondo, fontFamily: T.font,
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
  },
  cargando: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' },

  /* ── marca ("el barrio" en verde, minúscula) ── */
  marca: { color: C.verde, fontWeight: 600 },

  /* ── cabecera ── */
  header: {
    background: C.card,
    padding: 'var(--home-header-safe-top, 34px) 18px 10px',
    borderBottom: `1px solid ${C.borde}`,
    flexShrink: 0,
  },
  headerTop: { display: 'flex', alignItems: 'center', gap: 10 },
  saludo: {
    fontSize: 16, fontWeight: 500, color: C.texto,
    letterSpacing: '-0.1px',
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  barrioRow: { display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 },
  barrioNombre: { fontSize: 13, color: C.textoSuave, fontWeight: 500 },
  beta: {
    fontSize: 9, fontWeight: 800, letterSpacing: 0.5, color: '#fff',
    background: C.verde, padding: '2px 6px', borderRadius: 5,
  },

  headerBtns: { display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 },
  headerDivider: { width: 1, height: 29, background: C.borde, margin: '0 2px 0 1px', flexShrink: 0 },
  iconBtn: {
    position: 'relative', width: 40, height: 40, borderRadius: '50%',
    background: C.fondo, border: `1px solid ${C.borde}`,
    fontSize: 18, cursor: 'pointer', padding: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  badge: {
    position: 'absolute', top: -3, right: -3,
    minWidth: 18, height: 18, padding: '0 4px',
    borderRadius: 999, background: C.rojo, color: '#fff',
    fontSize: 10, fontWeight: 800,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: '2px solid #fff',
  },
  avatarBtn: {
    width: 42, height: 42, borderRadius: '50%',
    background: C.verdeSuave, color: C.verde,
    border: `2px solid ${C.verde}`, padding: 0, overflow: 'hidden',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', flexShrink: 0,
  },
  avatarImg: { width: '100%', height: '100%', objectFit: 'cover' },
  avatarTxt: { fontSize: 13, fontWeight: 700 },

  buscador: {
    width: '100%', marginTop: 10, padding: '11px 16px',
    fontSize: 14, background: C.fondo,
    border: `1.5px solid ${C.borde}`, borderRadius: 999,
    outline: 'none', fontFamily: 'inherit', color: C.texto,
    boxSizing: 'border-box',
  },

  scroll: {
    flex: 1, overflowY: 'auto', overflowX: 'clip', padding: '6px 16px 120px',
    width: '100%', maxWidth: '100%',
    overscrollBehaviorY: 'contain', WebkitOverflowScrolling: 'touch',
  },
  pullRefresh: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
    overflow: 'hidden', color: C.verdeOsc,
    fontSize: 10.5, fontWeight: 600,
    transition: 'height 180ms ease, opacity 140ms ease',
  },
  pullRefreshIcon: {
    width: 18, height: 18, borderRadius: '50%',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    color: C.verde, fontSize: 18, lineHeight: 1,
  },
  feedError: {
    minHeight: 46, margin: '0 0 12px', padding: '9px 10px 9px 12px',
    display: 'flex', alignItems: 'center', gap: 9,
    border: '1px solid #fed7aa', borderRadius: 12,
    color: '#7c2d12', background: '#fff7ed', fontSize: 10.5, lineHeight: 1.4,
  },
  feedErrorButton: {
    flex: '0 0 auto', minHeight: 30, padding: '0 9px', borderRadius: 9,
    color: '#7c2d12', background: '#ffedd5', fontSize: 9.5, fontWeight: 800,
  },

  /* ── clima + farmacia ── */
  tiraInfo: {
    display: 'flex', alignItems: 'center',
    gap: 0,
    background: 'rgba(255,255,255,.78)', border: '1px solid rgba(183,201,190,.58)',
    borderRadius: 14, padding: '10px 14px', marginBottom: 8,
    boxShadow: '0 3px 12px rgba(31,63,46,.035)',
  },
  climaBloque: { display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 },
  climaEmoji: {
    width: 36, height: 36, lineHeight: 1,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  climaTemp: { fontSize: 19, fontWeight: 700, color: C.texto, lineHeight: 1.1 },
  climaTxt: { fontSize: 11, color: C.textoTenue, fontWeight: 500, marginTop: 2 },
  tiraDivisor: { width: 1, height: 34, background: C.tiraBorde, margin: '0 12px', flexShrink: 0 },
  farmaciaBloque: {
    flex: 1, minWidth: 0,
    background: 'none', border: 'none', padding: 0,
    cursor: 'pointer', fontFamily: 'inherit', textAlign: 'right',
    display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
  },
  farmaciaLabel: { fontSize: 10, color: C.textoTenue, fontWeight: 500 },
  farmaciaNombre: {
    fontSize: 13, fontWeight: 700, color: C.texto, marginTop: 2,
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
    maxWidth: '100%',
  },
  farmaciaDir: {
    fontSize: 10, color: C.textoTenue, fontWeight: 400, marginTop: 2,
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
    maxWidth: '100%',
  },
  farmaciaMas: { fontSize: 9, fontWeight: 700, color: C.verde },

  /* ── portada de descubrimiento ── */
  paraTiSection: { marginBottom: 7 },
  paraTiHeading: {
    minHeight: 27,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
    color: C.texto,
  },
  paraTiHeadingTitle: { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 600, letterSpacing: 0, color: C.texto },
  paraTiHeadingHint: { color: C.textoTenue, fontSize: 8.5, fontWeight: 600 },
  paraTiScroll: {
    width: '100%', margin: 0, padding: '0 0 3px',
    display: 'flex', gap: 18,
    overflowX: 'auto', overflowY: 'hidden',
    scrollSnapType: 'x mandatory', scrollbarWidth: 'none',
    WebkitOverflowScrolling: 'touch',
  },
  paraTiCard: {
    position: 'relative',
    width: '100%', minWidth: '100%', flex: '0 0 100%', boxSizing: 'border-box', height: 174,
    padding: 14, overflow: 'hidden',
    display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'space-between',
    scrollSnapAlign: 'start', scrollSnapStop: 'always',
    border: 'none', outline: 'none', WebkitAppearance: 'none', borderRadius: 18,
    color: '#fff', backgroundColor: '#dcebe4', backgroundSize: 'cover', backgroundPosition: 'center',
    boxShadow: 'none',
    textAlign: 'left', fontFamily: 'inherit', cursor: 'pointer',
  },
  paraTiBadge: {
    padding: '5px 8px', borderRadius: 999,
    color: '#07543a', background: 'rgba(236,255,246,.94)',
    fontSize: 8.5, fontWeight: 900, letterSpacing: '.055em',
    boxShadow: '0 2px 8px rgba(0,0,0,.08)',
  },
  paraTiCopy: {
    width: 'calc(100% - 36px)',
    display: 'flex', flexDirection: 'column', gap: 5,
  },
  paraTiTitle: {
    display: '-webkit-box', overflow: 'hidden',
    fontSize: 16, fontWeight: 800, lineHeight: 1.25, letterSpacing: '-.25px',
    textShadow: '0 1px 8px rgba(0,0,0,.28)',
    WebkitBoxOrient: 'vertical', WebkitLineClamp: 2,
  },
  paraTiMeta: {
    overflow: 'hidden', color: 'rgba(255,255,255,.88)',
    fontSize: 10.5, fontWeight: 600, whiteSpace: 'nowrap', textOverflow: 'ellipsis',
  },
  paraTiArrow: {
    position: 'absolute', right: 14, bottom: 14,
    width: 28, height: 28, borderRadius: '50%',
    display: 'grid', placeItems: 'center',
    color: C.verdeOsc, background: '#fff',
    fontSize: 15, fontWeight: 800,
  },
  paraTiDots: { height: 10, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 5 },
  paraTiDot: { width: 5, height: 5, borderRadius: 999, background: '#c9d5cd', transition: 'width 220ms ease, background 220ms ease' },
  paraTiDotActive: { width: 16, background: C.verde },

  modalFondo: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(22,33,26,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 22, zIndex: 400,
  },
  modalCaja: {
    width: '100%', background: '#fff',
    borderRadius: 22, padding: 20,
    boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
    maxHeight: '82%', overflow: 'hidden',
    display: 'flex', flexDirection: 'column',
  },
  modalTit: { flexShrink: 0, fontSize: 18, fontWeight: 700, color: C.texto, marginBottom: 13 },
  modalContenido: { minHeight: 0, flex: 1, overflowY: 'auto', paddingRight: 3, WebkitOverflowScrolling: 'touch' },
  farmGrupo: { marginBottom: 14 },
  farmGrupoTit: { marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: C.textoSuave, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.04em' },
  farmCardTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  farmCard: {
    background: C.tira, border: `1px solid ${C.tiraBorde}`,
    borderRadius: 16, padding: 15, marginBottom: 11,
  },
  farmCardDuty: { borderColor: '#8bd5a4', background: C.verdeBg },
  farmDutyBadge: { flexShrink: 0, padding: '5px 8px', borderRadius: 999, color: '#fff', background: C.verde, fontSize: 9, fontWeight: 800 },
  farmNombre: { fontSize: 16, fontWeight: 700, color: C.texto },
  farmDir: { fontSize: 13.5, color: C.textoSuave, marginTop: 6, fontWeight: 500 },
  farmHora: { fontSize: 13.5, color: C.textoSuave, marginTop: 3, fontWeight: 500 },
  farmBtns: { display: 'flex', gap: 8, marginTop: 12 },
  farmBtn: {
    flex: 1, padding: '11px 8px', borderRadius: 12,
    background: '#fff', border: `1px solid ${C.tiraBorde}`,
    color: C.verdeOsc, fontSize: 13, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit',
  },
  modalCerrar: {
    width: '100%', flexShrink: 0, padding: 14, marginTop: 8,
    background: C.fondo, border: `1px solid ${C.borde}`,
    borderRadius: 999, color: C.textoSuave,
    fontSize: 14.5, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit',
  },

  /* ── accesos ── */
  accesos: {
    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 9, marginBottom: 7,
  },
  acceso: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
    background: C.card, border: `1px solid ${C.borde}`,
    borderRadius: 13, padding: '7px 3px 6px',
    cursor: 'pointer', fontFamily: 'inherit',
  },
  accesoIcono: {
    width: 38, height: 38, borderRadius: 11,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 24, lineHeight: 1,
  },
  accesoLabel: { fontSize: 11, fontWeight: 600, color: C.textoSuave },

  /* ── secciones ── */
  // marginBottom reducido (20→8) para que el gap entre Alertas y Mercado
  // sea más apretado. Afecta a todas las secciones (queda uniforme).
  seccion: { marginBottom: 8 },
  // marginBottom reducido (10→3) para que el título quede más pegado a
  // sus tarjetas. El scrollH ya aporta 14px de paddingTop (para el halo
  // del pulse de alertas), así que no hace falta más gap aquí.
  seccionTit: { display: 'flex', alignItems: 'center', marginBottom: 3, gap: 8 },
  seccionTxt: { fontSize: 15, fontWeight: 600, color: C.texto },
  pulso: {
    width: 8, height: 8, borderRadius: '50%', background: C.rojo,
    marginLeft: 'auto', boxShadow: `0 0 0 4px ${C.rojoSuave}`,
  },
  cantidad: {
    fontSize: 11, fontWeight: 700, color: C.textoTenue,
    background: C.fondo, padding: '2px 8px', borderRadius: 999,
    marginLeft: 'auto',
  },

  /* ── pedidos vecinales ── */
  pedirBarra: {
    display: 'flex', alignItems: 'center', gap: 11,
    width: '100%',
    background: '#fffbeb', border: '1px solid #fde68a',
    borderRadius: 14, padding: '11px 13px',
    cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
  },
  pedirBarraEmoji: { fontSize: 20, flexShrink: 0, lineHeight: 1 },
  pedirBarraTxt: { display: 'flex', flexDirection: 'column', gap: 1, flex: 1, minWidth: 0 },
  pedirBarraTit: {
    fontSize: 13.5, fontWeight: 700, color: C.texto,
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  pedirBarraSub: {
    fontSize: 11.5, fontWeight: 400, color: C.textoTenue,
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  pedirBarraCta: {
    fontSize: 12, fontWeight: 700, color: '#fff',
    background: C.verde, padding: '7px 14px',
    borderRadius: 999, flexShrink: 0,
    display: 'flex', alignItems: 'center',
  },

  /* ── alertas (tira horizontal compacta) ── */
  verTodasBtn: {
    marginLeft: 'auto',
    display: 'flex', alignItems: 'center', gap: 4,
    background: 'none', border: 'none', padding: 0,
    fontSize: 11.5, fontWeight: 700, color: C.verde,
    cursor: 'pointer', fontFamily: 'inherit',
  },
  verTodasFlecha: { fontSize: 13, lineHeight: 1 },
  alertaVaciaStrip: {
    display: 'flex', alignItems: 'center', gap: 10,
    width: '100%',
    background: '#fff',
    border: `1px dashed ${C.rojoSuave}`,
    borderRadius: 14, padding: '11px 14px',
    cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
  },
  alertaVaciaTxt: {
    flex: 1, fontSize: 12.5, color: C.textoSuave, lineHeight: 1.4,
    display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0,
  },
  alertaVaciaCta: {
    fontSize: 11.5, fontWeight: 700, color: C.verde,
  },

  alertaStrip: {
    flexShrink: 0, width: 168,
    borderRadius: 14, padding: '11px 12px 9px',
    border: `1px solid ${C.borde}`,
    display: 'flex', flexDirection: 'column', gap: 5,
    cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
    minHeight: 122,
  },
  alertaStripTop: {
    display: 'flex', alignItems: 'center', gap: 5,
  },
  alertaStripEmoji: { fontSize: 14, lineHeight: 1 },
  alertaStripCat: {
    fontSize: 11.5, fontWeight: 800, letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  alertaStripDesc: {
    fontSize: 12.5, color: C.texto, fontWeight: 500, lineHeight: 1.35,
    display: '-webkit-box', WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical', overflow: 'hidden',
    flex: 1, minHeight: 32,
  },
  /* Pie de la tarjeta de alerta: SIN flexWrap para que el pin y el
     "hace X min" SIEMPRE queden en la misma línea, sin importar cuán
     largo sea el texto. Si no cabe, se trunca con ellipsis en vez de
     saltar a otra línea (lo que estaba haciendo que el pin se vaya
     solo arriba cuando el "hace" era largo). */
  alertaStripPie: {
    display: 'flex', alignItems: 'center', gap: 6,
    marginTop: 'auto',
    whiteSpace: 'nowrap', overflow: 'hidden',
  },
  alertaStripTime: {
    fontSize: 10, color: C.textoTenue, fontWeight: 500,
    flexShrink: 0,
  },
  /* Pin lineal: sin fondo blanco, verde marca. Sin negrita (era 700)
     para que visualmente pese igual que el "hace" y queden parejos. */
  alertaStripDist: {
    fontSize: 10, fontWeight: 500, color: C.verdeOsc,
    display: 'inline-flex', alignItems: 'center', gap: 3,
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
    minWidth: 0, flexShrink: 1,
  },
  alertaStripConf: {
    fontSize: 9.5, fontWeight: 700, color: C.verdeOsc,
    background: '#fff', padding: '1px 5px', borderRadius: 999,
  },

  /* ── Alertas en el feed: lista vertical de huinchas full-width ──
     Reemplaza al antiguo scrollH de tarjetas cuadradas de 168px.
     Ahora cada alerta es una huincha horizontal delgada (icono a la
     izquierda + body + flecha), una arriba de la otra, ocupando todo
     el ancho disponible. Al pinchar abre el detalle. */
  alertaLista: {
    display: 'flex', flexDirection: 'column', gap: 6,
    width: '100%',
  },
  alertaOficial: {
    width: '100%', minHeight: 58,
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '9px 11px', borderRadius: 11,
    background: '#fff', border: 'none',
    fontFamily: 'inherit', textAlign: 'left', cursor: 'pointer',
    boxShadow: '0 2px 9px rgba(25, 38, 29, 0.09)',
  },
  alertaOficialIcono: {
    width: 34, height: 34, borderRadius: 10,
    background: '#fff5f5',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 15, flexShrink: 0,
  },
  alertaOficialContenido: {
    flex: 1, minWidth: 0,
    display: 'flex', flexDirection: 'column', gap: 3,
  },
  alertaOficialMeta: {
    display: 'flex', alignItems: 'center', gap: 5,
    fontSize: 9, color: C.textoTenue, fontWeight: 500,
  },
  alertaOficialBadge: {
    color: C.rojo, fontWeight: 800, letterSpacing: 0.45,
  },
  alertaOficialTitulo: {
    fontSize: 13, fontWeight: 650, color: C.texto,
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  alertaRow: {
    display: 'flex', alignItems: 'center', gap: 9,
    width: '100%',
    borderRadius: 10,
    border: `1px solid ${C.borde}`,
    padding: '7px 10px 7px 8px',
    cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
    position: 'relative', overflow: 'hidden',
  },
  alertaRowIcon: {
    width: 28, height: 28, borderRadius: 8,
    background: 'rgba(255,255,255,0.85)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, alignSelf: 'center',
  },
  alertaRowBody: {
    flex: 1, minWidth: 0,
    display: 'flex', flexDirection: 'column', gap: 0,
  },
  alertaRowTop: {
    display: 'flex', alignItems: 'center', gap: 6,
    marginBottom: 1,
  },
  alertaRowCat: {
    fontSize: 9.5, fontWeight: 800, letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  alertaRowTime: {
    fontSize: 9.5, color: C.textoTenue, fontWeight: 500,
    marginLeft: 'auto', flexShrink: 0,
  },
  alertaRowTitle: {
    fontSize: 13, fontWeight: 500, color: '#111', lineHeight: 1.3,
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
    marginBottom: 2,
  },
  alertaRowDesc: {
    fontSize: 11.5, color: C.textoTenue, fontWeight: 500, lineHeight: 1.3,
    display: '-webkit-box', WebkitLineClamp: 1,
    WebkitBoxOrient: 'vertical', overflow: 'hidden',
    marginTop: 1, marginBottom: 0,
  },
  alertaRowPie: {
    display: 'flex', alignItems: 'center', gap: 8,
    marginTop: 2,
  },
  alertaRowDist: {
    fontSize: 9.5, fontWeight: 600, color: C.verdeOsc,
    display: 'inline-flex', alignItems: 'center', gap: 2,
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
    minWidth: 0,
  },
  alertaRowConf: {
    fontSize: 9, fontWeight: 700, color: C.verdeOsc,
    background: '#fff', padding: '1px 5px', borderRadius: 999,
    whiteSpace: 'nowrap',
  },
  alertaRowFlecha: {
    fontSize: 16, fontWeight: 500, color: C.textoTenue,
    alignSelf: 'center', flexShrink: 0, lineHeight: 1, marginLeft: 2,
  },

  alertaStripMore: {
    flexShrink: 0, width: 78,
    borderRadius: 14,
    background: 'transparent',
    border: `1.5px dashed ${C.borde}`,
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', gap: 6, padding: 12,
    cursor: 'pointer', fontFamily: 'inherit',
    minHeight: 122,
  },
  alertaStripMoreEmoji: {
    fontSize: 20, color: C.verde, fontWeight: 700, lineHeight: 1,
  },
  alertaStripMoreTxt: {
    fontSize: 10.5, fontWeight: 700, color: C.verde,
    textAlign: 'center', lineHeight: 1.3,
  },

  /* ── scroll horizontal (filas de cards) ──
     padding vertical reducido (6/4) para que el título quede pegado
     a sus tarjetas. El halo del pulse de alertas quedará apenas
     clipado arriba, pero priorizamos compacidad del layout.
     El overflowX:auto fuerza overflowY:auto (no se puede tener un eje
     auto y el otro visible) y con este padding chico el box-shadow
     superior queda algo recortado, pero es aceptable. */
  scrollH: {
    display: 'flex', gap: 10,
    overflowX: 'auto',
    paddingTop: 6, paddingBottom: 4,
    WebkitOverflowScrolling: 'touch',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
    margin: '0 -16px',
    paddingLeft: 16, paddingRight: 16,
  },

  /* ── card horizontal (scroll lateral) ──
     Sin minHeight en título: si el título es 1 línea, no queda
     espacio vacío debajo. La foto + título + autor se acomodan
     uno arriba del otro sin forzar huecos. */
  cardH: {
    flexShrink: 0,
    width: 140,
    background: C.card,
    border: `1px solid ${C.borde}`,
    borderRadius: 14,
    padding: 7,
    display: 'flex', flexDirection: 'column', gap: 4,
    cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
  },
  /* variante ancha para Eventos (1.5x): foto más alta, gap apretado */
  cardHWide: { width: 210, gap: 4, padding: 7 },
  cardHFoto: {
    width: '100%', height: 80,
    borderRadius: 10, overflow: 'hidden',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  cardHFotoWide: { height: 96 },
  cardHImg: { width: '100%', height: '100%', objectFit: 'cover' },
  cardHEmoji: { fontSize: 28 },
  cardHPrecio: { fontSize: 12, fontWeight: 800, color: C.verde },
  cardHPrecioAlt: {
    fontSize: 10, fontWeight: 700, color: C.verde,
  },
  cardHTit: {
    fontSize: 12.5, fontWeight: 600, color: C.texto,
    lineHeight: 1.3,
    display: '-webkit-box', WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical', overflow: 'hidden',
    /* sin minHeight: el título ocupa solo lo que necesita →
       no queda hueco vacío abajo en Mercado */
  },
  cardHAutor: { display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 },
  cardHAvatar: {
    width: 16, height: 16, borderRadius: '50%',
    background: C.verdeSuave, color: C.verde,
    fontSize: 7, fontWeight: 800, overflow: 'hidden',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  cardHAvatarImg: { width: '100%', height: '100%', objectFit: 'cover' },
  cardHAutorTxt: {
    fontSize: 10, color: C.textoTenue, fontWeight: 500,
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },

  /* ── posts verticales (Actividad, Option A) ── */
  postCard: {
    position: 'relative',
    display: 'flex', gap: 12,
    background: C.card, borderRadius: 14, padding: 10,
    border: `1px solid ${C.borde}`,
    marginBottom: 9, cursor: 'pointer',
  },
  activityTypeIcon: {
    position: 'absolute', top: 8, right: 9,
    fontSize: 15, lineHeight: 1, opacity: .82,
    filter: 'saturate(.82)', pointerEvents: 'none',
  },
  alertActivityInfo: { paddingRight: 19 },
  postFoto: {
    width: 56, height: 'auto', minHeight: 56,
    alignSelf: 'stretch', borderRadius: 11, flexShrink: 0, overflow: 'hidden',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  postImg: { width: '100%', height: '100%', objectFit: 'cover' },
  postEmoji: { fontSize: 24 },

  postInfo: { flex: 1, minWidth: 0, paddingRight: 19 },
  postMetaRow: {
    display: 'flex', alignItems: 'center', gap: 5, minWidth: 0,
    marginTop: 6,
  },
  chip: {
    fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 5,
    flexShrink: 0,
  },
  postAutorTop: {
    minWidth: 0, display: 'flex', alignItems: 'center', gap: 3,
    fontSize: 9.5, color: C.textoTenue, fontWeight: 500,
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  postAutorSep: { color: C.borde, marginRight: 1 },
  verificadoMini: { color: C.verde, fontSize: 10, fontWeight: 800 },
  fundadorBadge: {
    flexShrink: 0,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 12, lineHeight: 1,
  },
  precio: { fontSize: 12.5, fontWeight: 800, color: C.texto },
  chipNeg: {
    fontSize: 10, fontWeight: 600, color: C.textoSuave,
    background: C.fondo, padding: '2px 6px', borderRadius: 5,
  },
  postTit: {
    fontSize: 13.5, fontWeight: 700, color: C.texto,
    lineHeight: 1.3, marginTop: 0,
    display: '-webkit-box', WebkitLineClamp: 1,
    WebkitBoxOrient: 'vertical', overflow: 'hidden',
  },
  postTxt: {
    fontSize: 12, color: C.textoSuave, lineHeight: 1.4, marginTop: 2,
    display: '-webkit-box', WebkitLineClamp: 1,
    WebkitBoxOrient: 'vertical', overflow: 'hidden',
  },
  /* ── vacío ── */
  vacio: {
    textAlign: 'center', padding: '46px 20px',
    background: C.card, borderRadius: 18, border: `1px solid ${C.borde}`,
  },
  vacioEmoji: { fontSize: 46, marginBottom: 12 },
  vacioTit: { fontSize: 16.5, fontWeight: 700, color: C.texto, marginBottom: 5 },
  vacioTxt: { fontSize: 14, color: C.textoTenue, lineHeight: 1.5 },

  /* ── ver más / ver menos ── */
  verMasBtn: {
    width: '100%', padding: '11px 16px',
    background: 'transparent',
    border: `1.5px dashed ${C.borde}`,
    borderRadius: 12,
    color: C.verde, fontSize: 13.5, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit',
    marginTop: 4,
  },
}

export default Home
