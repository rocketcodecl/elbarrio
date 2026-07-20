import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { C, T, S, TIPOS, iniciales, hace } from '../lib/design'

/*
  SellerProfile — Perfil publico de un vecino para El Barrio.

  Se monta desde App.jsx en el case 'sellerprofile' con:
    <SellerProfile sellerId={params.sellerId} currentUser={user} onNavigate={onNavigate} />

  Carga:
    - El perfil del vendedor desde `profiles` por id.
    - Sus publicaciones activas desde `posts` (cualquier type: sell/gift/trade/service/need).
    - Stats: total publicaciones, total ventas/compras completadas (status sold/closed),
      rating mock si no hay campo (4.8 stars, 12 rese~nas).
    - Rese~nas desde `reviews` (con join a profiles del reviewer). Si la tabla
      no existe o RLS bloquea, se muestra estado vacio amable — no rompe la pantalla.

  Botones:
    - Enviar mensaje -> onNavigate('chatconversation', { sellerId })
      Si es tu propio perfil, NO se muestra. En cambio: Editar perfil -> onNavigate('perfil').
    - Compartir perfil -> navigator.share o clipboard.

  Reportar perfil: modal bottom-sheet con 4 opciones (Spam/Estafa/Perfil falso/Otro).
  Mock con toast "Reporte enviado, gracias".

  Estados: loading (skeleton), error (caja roja + reintentar), 404 ("perfil ya no disponible").
*/

// ──────────────────────────────────────────────────────────────
// ICONOS SVG INLINE (sin emojis en los iconos de UI)
// ──────────────────────────────────────────────────────────────
const Ico = ({ size = 18, children, stroke = 1.9 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={stroke}
    strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
)

const IcoAtras = (p) => (
  <Ico {...p}><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></Ico>
)
const IcoCheck = (p) => (
  <Ico {...p} stroke={2.6}>
    <circle cx="12" cy="12" r="10" fill="currentColor" stroke="none" />
    <polyline points="8 12 11 15 16 9" stroke="#fff" fill="none" />
  </Ico>
)
const IcoMedalla = (p) => (
  <Ico {...p}>
    <circle cx="12" cy="9" r="6" />
    <polyline points="8.5 13.5 7 22 12 19 17 22 15.5 13.5" />
  </Ico>
)
const IcoChevronDer = (p) => (
  <Ico {...p}><polyline points="9 18 15 12 9 6" /></Ico>
)
const IcoShare = (p) => (
  <Ico {...p}>
    <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </Ico>
)
const IcoMensaje = (p) => (
  <Ico {...p}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></Ico>
)
const IcoEstrella = (p) => (
  <Ico {...p}>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="currentColor" stroke="none" />
  </Ico>
)
const IcoEstrellaOutline = (p) => (
  <Ico {...p}>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </Ico>
)
const IcoFlag = (p) => (
  <Ico {...p}>
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
    <line x1="4" y1="22" x2="4" y2="15" />
  </Ico>
)
const IcoCasa = (p) => (
  <Ico {...p}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></Ico>
)
const IcoLlave = (p) => (
  <Ico {...p}>
    <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.1 2.1-2.4-.6-.6-2.4z" />
  </Ico>
)
const IcoCerrar = (p) => (
  <Ico {...p}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></Ico>
)
const IcoRefresh = (p) => (
  <Ico {...p}>
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </Ico>
)
const IcoEditar = (p) => (
  <Ico {...p}>
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </Ico>
)
const IcoPin = (p) => (
  <Ico {...p}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></Ico>
)
const IcoReloj = (p) => (
  <Ico {...p}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></Ico>
)
const IcoTag = (p) => (
  <Ico {...p}>
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
    <line x1="7" y1="7" x2="7.01" y2="7" />
  </Ico>
)
const IcoFoto = (p) => (
  <Ico {...p}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </Ico>
)

// ──────────────────────────────────────────────────────────────
// RAZONES DE REPORTE
// ──────────────────────────────────────────────────────────────
const REPORT_REASONS = [
  { id: 'spam',    emoji: '📢', label: 'Spam',                 sub: 'Publica lo mismo muchas veces' },
  { id: 'estafa',  emoji: '⚠️', label: 'Estafa',               sub: 'Pidió dinero y no entregó' },
  { id: 'falso',   emoji: '🎭', label: 'Perfil falso',         sub: 'No es quien dice ser' },
  { id: 'otro',    emoji: '📝', label: 'Otro',                 sub: 'Algo más que debamos revisar' },
]

// ──────────────────────────────────────────────────────────────
// TIPO DE POST -> { emoji, label, color, bg }
// Mapeamos los `type` que devuelve la BD al sistema TIPOS de design.js.
// Cubre los keys del CreatePost (sell/gift/trade/service/request/alert/event)
// y los aliases en espanol antiguos (venta/regalo/intercambio/servicio/...).
// ──────────────────────────────────────────────────────────────
const TYPE_ALIASES = {
  sell: 'sell', venta: 'sell', vender: 'sell', sale: 'sell', offer: 'sell',
  gift: 'gift', regalo: 'gift', regalar: 'gift', free: 'gift',
  trade: 'trade', intercambio: 'trade', trueque: 'trade', swap: 'trade',
  service: 'service', servicio: 'service', need: 'request', pedido: 'request',
  request: 'request', ayuda: 'request',
  alert: 'alert', alerta: 'alert',
  event: 'event', evento: 'event',
  general: 'general', post: 'general',
}

function tipoDePost(typeKey) {
  const key = TYPE_ALIASES[String(typeKey || '').toLowerCase()] || 'general'
  return TIPOS[key] || TIPOS.general
}

// Precio legible (usa formato es-CL de Intl, igual que Marketplace)
function precioDe(post) {
  if (!post) return ''
  const t = String(post.type || '').toLowerCase()
  if (['regalo', 'regalar', 'gift', 'free'].includes(t)) return 'Gratis'
  if (['intercambio', 'trueque', 'trade', 'swap'].includes(t)) return 'Trueque'
  if (post.price === null || post.price === undefined) return ''
  return `$${Number(post.price).toLocaleString('es-CL')}`
}

// Fecha de "miembro desde" — formatea como "Marzo 2024"
function miembroDesde(fecha) {
  if (!fecha) return ''
  const f = new Date(fecha)
  if (isNaN(f.getTime())) return ''
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  return `${meses[f.getMonth()]} ${f.getFullYear()}`
}

// Animaciones inyectadas (mismo patrón que AlertaDetail)
const STYLE_KEYFRAMES = `
@keyframes spFadeIn {
  0%   { opacity: 0; transform: translateY(8px); }
  100% { opacity: 1; transform: translateY(0); }
}
@keyframes spPulse {
  0%, 100% { transform: scale(1); box-shadow: 0 6px 20px rgba(22,163,74,0.3); }
  50%      { transform: scale(1.02); box-shadow: 0 8px 26px rgba(22,163,74,0.42); }
}
@keyframes spToastIn {
  0%   { opacity: 0; transform: translate(-50%, 10px); }
  100% { opacity: 1; transform: translate(-50%, 0); }
}
@keyframes spSheetUp {
  0%   { transform: translateY(100%); }
  100% { transform: translateY(0); }
}
@keyframes spShimmer {
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
.sp-card-hover { transition: transform 0.15s ease, box-shadow 0.15s ease; }
.sp-card-hover:active { transform: translateY(-2px); box-shadow: 0 6px 18px rgba(0,0,0,0.10); }
`

// ──────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ──────────────────────────────────────────────────────────────
export default function SellerProfile({ sellerId, currentUser, onNavigate }) {
  const [seller, setSeller] = useState(null)
  const [posts, setPosts] = useState([])
  const [reviews, setReviews] = useState([])
  const [promos, setPromos] = useState([])
  const [stats, setStats] = useState({ publicaciones: 0, ventas: 0, rating: 4.8, reviewsCount: 12 })
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [notFound, setNotFound] = useState(false)

  const [toast, setToast] = useState('')
  const [showReportModal, setShowReportModal] = useState(false)

  const toastTimer = useRef(null)
  const nav = onNavigate || (() => {})

  // Es el perfil propio? Comparamos por id (perfil.row id) y por user_id (auth uid),
  // porque en App.jsx currentUser.id es el auth uid y sellerId es el profile.row id.
  // Asi funciona en ambos casos.
  const isOwnProfile = !!(seller && currentUser && (
    seller.id === currentUser.id || seller.user_id === currentUser.id
  ))

  /* ─────── TOAST ─────── */
  const showToast = (msg) => {
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 2400)
  }

  /* ─────── CARGA PRINCIPAL ─────── */
  const cargarTodo = async () => {
    if (!sellerId) {
      setNotFound(true)
      setLoading(false)
      return
    }

    setLoading(true)
    setLoadError('')
    setNotFound(false)

    try {
      // FIX bug 400: antes usábamos .eq('id', sellerId).single(), lo que falla
      // con 400 cuando sellerId es el auth-uid (UUID) pero profiles.id es el
      // row id (UUID distinto), o cuando el formato no coincide con el tipo
      // de la columna. Ahora buscamos por id OR user_id con maybeSingle()
      // (no lanza error si hay 0 filas).
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .or(`id.eq.${sellerId},user_id.eq.${sellerId}`)
        .maybeSingle()

      if (profileErr) {
        setLoadError(profileErr.message || 'Error desconocido')
        setLoading(false)
        return
      }

      if (!profile) {
        setNotFound(true)
        setLoading(false)
        return
      }

      setSeller(profile)

      // Cargar posts activos + stats + reviews + promos en paralelo (no bloquean al perfil)
      cargarPosts(profile)
      cargarStats(profile)
      cargarReviews(profile)
      cargarPromos(profile)
    } catch (err) {
      setLoadError(err?.message || 'Error inesperado')
      setLoading(false)
    }
  }

  /* ─────── POSTS ACTIVOS ─────── */
  const cargarPosts = async (profile) => {
    try {
      // FIX: sellerId puede ser el auth-uid o el row id. Usamos profile
      // (ya cargado) para buscar posts por user_id (auth uid) o por
      // user_id (row id) según corresponda. El OR cubre ambos schemas.
      const uid = profile?.user_id || profile?.id || sellerId
      const rid = profile?.id || sellerId
      const filtro = uid === rid ? `user_id.eq.${uid}` : `user_id.eq.${uid},user_id.eq.${rid}`
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .or(filtro)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error
      setPosts(data || [])
    } catch (err) {
      // Si falla (RLS o tabla), dejamos lista vacia — no rompe la pantalla
      setPosts([])
    }
  }

  /* ─────── STATS ─────── */
  const cargarStats = async (profile) => {
    try {
      const uid = profile?.user_id || profile?.id || sellerId
      const rid = profile?.id || sellerId
      const filtro = uid === rid ? `user_id.eq.${uid}` : `user_id.eq.${uid},user_id.eq.${rid}`

      // Total publicaciones activas (count exacto)
      const { count: totalPosts } = await supabase
        .from('posts')
        .select('id', { count: 'exact', head: true })
        .or(filtro)
        .eq('status', 'active')

      // Ventas/compras completadas: posts con status sold o closed
      const { count: ventasCount } = await supabase
        .from('posts')
        .select('id', { count: 'exact', head: true })
        .or(filtro)
        .in('status', ['sold', 'closed'])

      // Rating: si el perfil tiene rating explicito lo usamos, si no mock 4.8
      const rating = Number(profile?.rating) || 4.8
      const reviewsCount = Number(profile?.reviews_count) || 12

      setStats({
        publicaciones: totalPosts || 0,
        ventas: ventasCount || 0,
        rating: Number.isFinite(rating) ? rating : 4.8,
        reviewsCount: Number.isFinite(reviewsCount) ? reviewsCount : 12,
      })
    } catch {
      // Si falla, dejamos los defaults mock
    }
  }

  /* ─────── RESEÑAS ─────── */
  const cargarReviews = async (profile) => {
    try {
      const uid = profile?.user_id || profile?.id || sellerId
      const rid = profile?.id || sellerId
      const filtro = uid === rid ? `reviewee_id.eq.${uid}` : `reviewee_id.eq.${uid},reviewee_id.eq.${rid}`

      // FIX: usamos hint por nombre de columna (!reviewer_id) en vez del
      // nombre de la constraint (!reviews_reviewer_id_fkey), que es más
      // frágil. Si la FK no existe o la tabla reviews no está creada,
      // caemos al catch y dejamos reviews vacío (no rompe la pantalla).
      const { data, error } = await supabase
        .from('reviews')
        .select('*, profiles!reviewer_id(*)')
        .or(filtro)
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error
      setReviews(data || [])
    } catch {
      // Segundo intento: sin join (tabla reviews existe pero sin FK
      // configurada hacia profiles). Así igual traemos las reseñas,
      // solo que sin el nombre del reviewer (el UI usa fallback).
      try {
        const uid = profile?.user_id || profile?.id || sellerId
        const rid = profile?.id || sellerId
        const filtro = uid === rid ? `reviewee_id.eq.${uid}` : `reviewee_id.eq.${uid},reviewee_id.eq.${rid}`
        const { data } = await supabase
          .from('reviews')
          .select('*')
          .or(filtro)
          .order('created_at', { ascending: false })
          .limit(10)
        setReviews(data || [])
      } catch {
        // Tabla reviews no existe o RLS bloquea — dejamos vacio
        setReviews([])
      }
    }
  }

  /* ─────── PROMOCIONES DEL COMERCIO ─────── */
  const cargarPromos = async (profile) => {
    try {
      // sellerId puede ser el auth-uid o el row id; para commerce_promos
      // usamos commerce_id (FK a commerces.id). Si el perfil cargado tiene
      // id o commerce_id, usamos ese; si no, caemos a sellerId.
      const cid = profile?.commerce_id || profile?.id || sellerId
      const { data, error } = await supabase
        .from('commerce_promos')
        .select('id, title, description, image_url, starts_at, expires_at, is_active, views_count')
        .eq('commerce_id', cid)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error

      // Filtrar en JS las promos ya vencidas (expires_at > ahora)
      const ahora = Date.now()
      const vigentes = (data || []).filter((p) => {
        if (!p.expires_at) return true
        const exp = new Date(p.expires_at)
        return !isNaN(exp.getTime()) && exp.getTime() > ahora
      })
      setPromos(vigentes)
    } catch {
      // Si commerce_promos no existe, RLS bloquea, o cid no matchea,
      // dejamos lista vacía — no rompe la pantalla.
      setPromos([])
    }
  }

  useEffect(() => {
    cargarTodo()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sellerId])

  /* ─────── COMPARTIR ─────── */
  const compartir = async () => {
    const url = typeof window !== 'undefined'
      ? `${window.location.origin}/?seller=${sellerId}`
      : `elbarrio://seller/${sellerId}`
    const titulo = seller?.full_name ? `${seller.full_name} en El Barrio` : 'Perfil en El Barrio'
    const texto = seller?.comuna
      ? `Mirá el perfil de ${seller.full_name} (${seller.comuna}) en El Barrio`
      : `Mirá este perfil en El Barrio`

    try {
      if (navigator.share) {
        await navigator.share({ title: titulo, text: texto, url })
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url)
        showToast('Enlace copiado')
      } else {
        // Fallback último: prompt
        window.prompt('Copiá este enlace:', url)
      }
    } catch {
      // El usuario canceló el share, no hacemos nada
    }
  }

  /* ─────── REPORTAR ─────── */
  const reportar = (reason) => {
    setShowReportModal(false)
    showToast('Reporte enviado, gracias')
    // Mock — no hacemos INSERT real. El usuario cablea luego la tabla reports.
  }

  /* ─────── RENDER: SKELETON ─────── */
  if (loading) {
    return (
      <div style={s.wrap}>
        <style dangerouslySetInnerHTML={{ __html: STYLE_KEYFRAMES }} />
        <Header onBack={() => nav('back')} />
        <div style={s.scroll}>
          <SkeletonHero />
          <div style={s.content}>
            <div style={s.sectionTitleRow}>
              <div style={{ ...s.skelLine, width: 140, height: 17 }} />
            </div>
            <div style={s.gridPosts}>
              {[0, 1, 2, 3].map((i) => <SkeletonCard key={i} />)}
            </div>
          </div>
        </div>
      </div>
    )
  }

  /* ─────── RENDER: 404 ─────── */
  if (notFound) {
    return (
      <div style={s.wrap}>
        <style dangerouslySetInnerHTML={{ __html: STYLE_KEYFRAMES }} />
        <Header onBack={() => nav('back')} />
        <div style={s.scroll}>
          <div style={s.stateBox}>
            <div style={s.stateEmoji}>🕵️</div>
            <div style={s.stateTitle}>Este perfil ya no está disponible</div>
            <div style={s.stateText}>
              Puede que la cuenta se haya dado de baja o que el vecino haya salido del barrio.
            </div>
            <button style={s.stateBtn} onClick={() => nav('back')}>Volver</button>
          </div>
        </div>
      </div>
    )
  }

  /* ─────── RENDER: ERROR ─────── */
  if (loadError) {
    return (
      <div style={s.wrap}>
        <style dangerouslySetInnerHTML={{ __html: STYLE_KEYFRAMES }} />
        <Header onBack={() => nav('back')} />
        <div style={s.scroll}>
          <div style={{ ...s.stateBox, background: C.rojoBg, borderColor: C.rojoSuave }}>
            <div style={{ ...s.stateEmoji, color: C.rojo }}>⚠️</div>
            <div style={{ ...s.stateTitle, color: C.rojo }}>No pudimos cargar este perfil</div>
            <div style={s.stateText}>{loadError}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button style={{ ...s.stateBtn, background: C.verde }} onClick={cargarTodo}>
                <IcoRefresh size={15} /> Reintentar
              </button>
              <button style={{ ...s.stateBtn, background: 'transparent', color: C.textoSuave, border: `1px solid ${C.borde}` }} onClick={() => nav('back')}>
                Volver
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!seller) return null

  /* ─────── DATOS DERIVADOS ─────── */
  const fullName = seller.full_name || 'Vecino del barrio'
  const comuna = seller.comuna || ''
  const barrio = seller.barrio || seller.neighborhood_name || ''
  const avatarUrl = seller.avatar_url
  const verified = seller.verified === true || seller.verification_status === 'verified'
  const isFounder = seller.badge_founder === true
  const founderNumber = seller.founder_number || null
  const memberSince = miembroDesde(seller.member_since || seller.verified_at || seller.created_at)

  /* ─────── RENDER: PERFIL ─────── */
  return (
    <div style={s.wrap}>
      <style dangerouslySetInnerHTML={{ __html: STYLE_KEYFRAMES }} />
      <Header onBack={() => nav('back')} />

      <div style={s.scroll}>
        {/* HERO */}
        <div style={{ ...s.hero, position: 'relative' }} className="sp-fadein">
          {seller.is_premium === true && (
            <div style={s.premiumBadge}>⭐ Destacado</div>
          )}
          <div style={s.heroAvatarWrap}>
            {avatarUrl ? (
              <img src={avatarUrl} alt={fullName} style={s.heroAvatar} />
            ) : (
              <div style={s.heroAvatarFallback}>{iniciales(fullName)}</div>
            )}
            {verified && (
              <div style={s.heroCheckVerified} title="Verificado">
                <IcoCheck size={16} />
              </div>
            )}
          </div>

          <div style={s.heroName}>{fullName}</div>

          <div style={s.heroBadgesRow}>
            {verified && (
              <span style={s.badgeVerified}>
                <IcoCheck size={11} /> Verificado
              </span>
            )}
            {isFounder && (
              <span style={s.badgeFounder}>
                <IcoMedalla size={12} /> Vecino Fundador{founderNumber ? ` #${founderNumber}` : ''}
              </span>
            )}
          </div>

          {(comuna || barrio) && (
            <div style={s.heroLocRow}>
              <IcoPin size={13} />
              <span>{[comuna, barrio].filter(Boolean).join(' · ')}</span>
            </div>
          )}

          {memberSince && (
            <div style={s.heroSince}>
              <IcoReloj size={12} />
              <span>Miembro desde {memberSince}</span>
            </div>
          )}
        </div>

        {/* STATS */}
        <div style={s.content}>
          <div style={s.statsRow}>
            <Stat label="Publicaciones" value={stats.publicaciones} />
            <Stat label="Ventas" value={stats.ventas} />
            <Stat
              label="Rating"
              value={`${Number(stats.rating).toFixed(1)}`}
              icon={<IcoEstrella size={13} />}
              sub={`${stats.reviewsCount} reseñas`}
            />
          </div>

          {/* ACCIONES */}
          <div style={s.actionsRow}>
            {isOwnProfile ? (
              <button
                style={s.primaryBtn}
                onClick={() => nav('perfil')}
              >
                <IcoEditar size={18} />
                <span>Editar perfil</span>
              </button>
            ) : (
              <button
                style={{ ...s.primaryBtn, animation: 'spPulse 2.4s ease-in-out infinite' }}
                onClick={() => nav('chatconversation', { sellerId })}
              >
                <IcoMensaje size={18} />
                <span>Enviar mensaje</span>
              </button>
            )}

            <button style={s.secondaryBtn} onClick={compartir} aria-label="Compartir perfil">
              <IcoShare size={18} />
            </button>
          </div>

          {/* PROMOCIONES DEL COMERCIO */}
          <div style={s.sectionTitleRow}>
            <span style={s.sectionTitle}>🎁 Promociones</span>
            {promos.length > 0 && <span style={s.sectionCount}>{promos.length}</span>}
          </div>

          {promos.length === 0 ? (
            <div style={{ ...s.emptyBox, padding: '18px 14px', marginBottom: 22 }}>
              <div style={{ fontSize: 26, lineHeight: 1 }}>🎁</div>
              <div style={s.emptyTitle}>Sin promociones por ahora</div>
              <div style={s.emptyText}>
                Cuando este comercio publique una promo, la vas a ver acá con una banda verde.
              </div>
            </div>
          ) : (
            <div style={s.promosList}>
              {promos.map((p) => (
                <PromoCard key={p.id} promo={p} />
              ))}
            </div>
          )}

          {/* PUBLICACIONES ACTIVAS */}
          <div style={s.sectionTitleRow}>
            <span style={s.sectionTitle}>Publicaciones activas</span>
            {posts.length > 0 && <span style={s.sectionCount}>{posts.length}</span>}
          </div>

          {posts.length === 0 ? (
            <div style={s.emptyBox}>
              <IcoFoto size={40} />
              <div style={s.emptyTitle}>Todavía no tiene publicaciones activas</div>
              <div style={s.emptyText}>
                Cuando este vecino publique algo para vender, regalar o intercambiar, lo vas a ver acá.
              </div>
            </div>
          ) : (
            <div style={s.gridPosts}>
              {posts.map((p) => (
                <PostMiniCard key={p.id} post={p} onClick={() => nav('productdetail', { postId: p.id })} />
              ))}
            </div>
          )}

          {/* RESEÑAS */}
          <div style={{ ...s.sectionTitleRow, marginTop: 26 }}>
            <span style={s.sectionTitle}>Reseñas</span>
            {reviews.length > 0 && <span style={s.sectionCount}>{reviews.length}</span>}
          </div>

          {reviews.length === 0 ? (
            <div style={s.emptyBox}>
              <IcoEstrellaOutline size={38} />
              <div style={s.emptyTitle}>Todavía no tiene reseñas</div>
              <div style={s.emptyText}>
                Sé el primero en dejar una después de un trato.
              </div>
            </div>
          ) : (
            <div style={s.reviewsList}>
              {reviews.map((r) => (
                <ReviewItem key={r.id} review={r} />
              ))}
            </div>
          )}

          {/* REPORTAR PERFIL */}
          {!isOwnProfile && (
            <div style={s.reportWrap}>
              <button style={s.reportBtn} onClick={() => setShowReportModal(true)}>
                <IcoFlag size={13} />
                <span>Reportar perfil</span>
              </button>
            </div>
          )}

          <div style={{ height: 40 }} />
        </div>
      </div>

      {/* TOAST */}
      {toast && (
        <div style={s.toast}>{toast}</div>
      )}

      {/* MODAL REPORTE */}
      {showReportModal && (
        <div style={s.modalOverlay} onClick={() => setShowReportModal(false)}>
          <div style={s.sheetCard} onClick={(e) => e.stopPropagation()}>
            <div style={s.sheetHandle} />
            <div style={s.sheetTitle}>¿Por qué reportás este perfil?</div>
            <div style={s.sheetSub}>
              Tu reporte es anónimo. Nuestro equipo lo revisa dentro de las 24 horas.
            </div>
            <div style={s.sheetList}>
              {REPORT_REASONS.map((r) => (
                <button
                  key={r.id}
                  style={s.sheetItem}
                  onClick={() => reportar(r.id)}
                >
                  <span style={s.sheetItemEmoji}>{r.emoji}</span>
                  <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                    <span style={s.sheetItemLabel}>{r.label}</span>
                    <span style={s.sheetItemSub}>{r.sub}</span>
                  </span>
                  <span style={{ display: 'flex', color: C.textoTenue }}>
                    <IcoChevronDer size={16} />
                  </span>
                </button>
              ))}
            </div>
            <button style={s.sheetCancel} onClick={() => setShowReportModal(false)}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// SUBCOMPONENTES
// ──────────────────────────────────────────────────────────────
function Header({ onBack }) {
  return (
    <div style={s.header}>
      <button style={s.backBtn} onClick={onBack} aria-label="Volver">
        <IcoAtras size={20} />
      </button>
      <div style={s.headerTitle}>Perfil del vecino</div>
      {/* Stepper invisible — mantiene el layout centrado */}
      <div style={{ width: 40, height: 40 }} />
    </div>
  )
}

function Stat({ label, value, sub, icon }) {
  return (
    <div style={s.statCell}>
      <div style={s.statValueRow}>
        {icon && <span style={{ color: C.dorado, display: 'flex' }}>{icon}</span>}
        <span style={s.statValue}>{value}</span>
      </div>
      <div style={s.statLabel}>{label}</div>
      {sub && <div style={s.statSub}>{sub}</div>}
    </div>
  )
}

function PostMiniCard({ post, onClick }) {
  const tipo = tipoDePost(post.type)
  const img = post.images && post.images[0]
  const precio = precioDe(post)
  const titulo = post.title || (post.content ? post.content.slice(0, 60) : 'Publicación')

  return (
    <div
      style={s.postCard}
      className="sp-card-hover"
      onClick={onClick}
    >
      <div style={s.postImgBox}>
        {img ? (
          <img src={img} alt="" style={s.postImg} />
        ) : (
          <div style={s.postNoImg}>
            <span style={{ fontSize: 32, lineHeight: 1 }}>{tipo.emoji}</span>
          </div>
        )}
        <span style={{ ...s.postTypeBadge, background: tipo.bg, color: tipo.color }}>
          {tipo.emoji} {tipo.corto}
        </span>
      </div>
      <div style={s.postBody}>
        <div style={s.postTitle}>{titulo}</div>
        {precio && <div style={s.postPrice}>{precio}</div>}
      </div>
    </div>
  )
}

function ReviewItem({ review }) {
  const reviewer = review.profiles || {}
  const name = reviewer.full_name || 'Vecino'
  const avatarUrl = reviewer.avatar_url
  const stars = Number(review.stars) || Number(review.rating) || 0
  const body = review.comment || review.body || ''
  const cuando = hace(review.created_at)

  return (
    <div style={s.reviewCard}>
      <div style={s.reviewHeader}>
        {avatarUrl ? (
          <img src={avatarUrl} alt={name} style={s.reviewAvatar} />
        ) : (
          <div style={s.reviewAvatarFallback}>{iniciales(name)}</div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={s.reviewNameRow}>
            <span style={s.reviewName}>{name}</span>
            {reviewer.verified && (
              <span style={s.reviewCheck}>
                <IcoCheck size={11} />
              </span>
            )}
          </div>
          <div style={s.reviewStarsRow}>
            {[1, 2, 3, 4, 5].map((n) => (
              <span key={n} style={{ display: 'flex', color: n <= stars ? C.dorado : C.borde }}>
                <IcoEstrella size={11} />
              </span>
            ))}
            {cuando && <span style={s.reviewDate}>{cuando}</span>}
          </div>
        </div>
      </div>
      {body && <div style={s.reviewBody}>{body}</div>}
    </div>
  )
}

function PromoCard({ promo }) {
  // Fecha de vencimiento legible: "Vence: 5 dic 2025" o "Vigente" si no expira
  const expDate = promo.expires_at ? new Date(promo.expires_at) : null
  const expValid = expDate && !isNaN(expDate.getTime())
  const expText = expValid
    ? `Vence: ${expDate.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })}`
    : 'Vigente'
  const titulo = promo.title || 'Promoción'
  const desc = promo.description || ''
  const img = promo.image_url

  return (
    <div style={s.promoCard} className="sp-card-hover">
      {/* BANDA VERDE superior — la marca visual que pidió el usuario */}
      <div style={s.promoBand} />
      <div style={s.promoBody}>
        {img && (
          <img src={img} alt="" style={s.promoImg} loading="lazy" />
        )}
        <div style={s.promoTitle}>{titulo}</div>
        {desc && (
          <div style={s.promoDesc}>{desc}</div>
        )}
        <div style={s.promoExpiry}>⏰ {expText}</div>
      </div>
    </div>
  )
}

function SkeletonHero() {
  return (
    <div style={{ ...s.hero, background: C.card }}>
      <div style={{ ...s.skelCircle, width: 96, height: 96, margin: '0 auto 12px' }} />
      <div style={{ ...s.skelLine, width: 180, height: 20, margin: '0 auto 10px' }} />
      <div style={{ ...s.skelLine, width: 220, height: 14, margin: '0 auto 8px' }} />
      <div style={{ ...s.skelLine, width: 140, height: 12, margin: '0 auto' }} />
    </div>
  )
}

function SkeletonCard() {
  return (
    <div style={s.postCard}>
      <div style={{ ...s.skelBlock, aspectRatio: '1/1', borderRadius: '12px 12px 0 0' }} />
      <div style={s.postBody}>
        <div style={{ ...s.skelLine, width: '90%', height: 13, marginBottom: 6 }} />
        <div style={{ ...s.skelLine, width: '60%', height: 13 }} />
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// ESTILOS
// ──────────────────────────────────────────────────────────────
const s = {
  wrap: {
    width: '100%',
    height: '100%',
    background: C.fondo,
    fontFamily: T.font,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },

  // HEADER
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    /* FIX: padding superior 44px para safe-area (App.jsx ya no agrega
       contentPad a las modalScreens). */
    padding: '44px 16px 14px',
    background: C.card,
    borderBottom: `1px solid ${C.borde}`,
    flexShrink: 0,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: '50%',
    background: C.fondo, color: C.texto,
    border: `1px solid ${C.borde}`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', padding: 0, fontFamily: 'inherit',
    flexShrink: 0,
  },
  headerTitle: {
    fontSize: 17, fontWeight: 800, color: C.texto,
    letterSpacing: '-0.2px',
  },

  // SCROLL
  scroll: {
    flex: 1, minHeight: 0,
    overflowY: 'auto', overflowX: 'hidden',
    WebkitOverflowScrolling: 'touch',
  },

  // HERO
  hero: {
    background: C.card,
    padding: '24px 16px 22px',
    borderBottom: `1px solid ${C.bordeSuave}`,
    textAlign: 'center',
    animation: 'spFadeIn 0.32s ease-out',
  },
  heroAvatarWrap: {
    position: 'relative',
    width: 96, height: 96,
    margin: '0 auto 12px',
  },
  heroAvatar: {
    width: 96, height: 96,
    borderRadius: '50%',
    objectFit: 'cover',
    border: `3px solid ${C.verdeSuave}`,
    display: 'block',
  },
  heroAvatarFallback: {
    width: 96, height: 96,
    borderRadius: '50%',
    background: `linear-gradient(135deg, ${C.verde}, ${C.verdeOsc})`,
    color: '#fff',
    fontSize: 34, fontWeight: 800,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: `3px solid ${C.verdeSuave}`,
    letterSpacing: '0.5px',
  },
  heroCheckVerified: {
    position: 'absolute',
    bottom: -2, right: -2,
    width: 30, height: 30,
    borderRadius: '50%',
    background: C.verde,
    color: '#fff',
    border: `3px solid ${C.card}`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 2px 6px rgba(22,163,74,0.3)',
  },
  heroName: {
    fontSize: 22, fontWeight: 800, color: C.texto,
    letterSpacing: '-0.3px',
    marginBottom: 6,
  },
  heroBadgesRow: {
    display: 'flex',
    gap: 6,
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  badgeVerified: {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    background: C.verdeSuave, color: C.verdeOsc,
    padding: '4px 10px', borderRadius: 999,
    fontSize: 11.5, fontWeight: 700,
  },
  badgeFounder: {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    background: C.doradoSuave, color: C.dorado,
    padding: '4px 10px', borderRadius: 999,
    fontSize: 11.5, fontWeight: 700,
  },
  heroLocRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: 5, color: C.textoSuave,
    fontSize: 13, fontWeight: 600,
    marginBottom: 4,
  },
  heroSince: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: 5, color: C.textoTenue,
    fontSize: 12, fontWeight: 500,
  },

  // CONTENT
  content: {
    padding: '16px 16px 24px',
  },

  // STATS
  statsRow: {
    display: 'flex',
    background: C.card,
    borderRadius: S.radio,
    border: `1px solid ${C.borde}`,
    boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
    overflow: 'hidden',
    marginBottom: 14,
  },
  statCell: {
    flex: 1,
    padding: '14px 8px',
    textAlign: 'center',
    borderRight: `1px solid ${C.bordeSuave}`,
  },
  statValueRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: 4, marginBottom: 2,
  },
  statValue: {
    fontSize: 22, fontWeight: 800, color: C.texto,
    letterSpacing: '-0.4px',
  },
  statLabel: {
    fontSize: 12, fontWeight: 700, color: C.textoSuave,
    textTransform: 'uppercase', letterSpacing: '0.4px',
  },
  statSub: {
    fontSize: 11, color: C.textoTenue, marginTop: 2,
  },

  // ACTIONS
  actionsRow: {
    display: 'flex', gap: 10,
    marginBottom: 22,
  },
  primaryBtn: {
    flex: 1,
    height: 50,
    background: C.verde, color: '#fff',
    border: 'none', borderRadius: 14,
    fontSize: 15.5, fontWeight: 700,
    fontFamily: 'inherit',
    cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    boxShadow: '0 6px 20px rgba(22,163,74,0.30)',
  },
  secondaryBtn: {
    width: 50, height: 50,
    background: C.card, color: C.texto,
    border: `1px solid ${C.borde}`,
    borderRadius: 14,
    cursor: 'pointer', padding: 0, fontFamily: 'inherit',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },

  // SECTION
  sectionTitleRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16, fontWeight: 800, color: C.texto,
    letterSpacing: '-0.1px',
  },
  sectionCount: {
    fontSize: 12, fontWeight: 700, color: C.textoTenue,
    background: C.fondo,
    padding: '3px 9px', borderRadius: 999,
  },

  // POSTS GRID
  gridPosts: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
  },
  postCard: {
    background: C.card,
    borderRadius: 14,
    overflow: 'hidden',
    border: `1px solid ${C.borde}`,
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    cursor: 'pointer',
    display: 'flex', flexDirection: 'column',
  },
  postImgBox: {
    position: 'relative',
    width: '100%',
    aspectRatio: '1/1',
    background: C.fondo,
    overflow: 'hidden',
  },
  postImg: {
    width: '100%', height: '100%',
    objectFit: 'cover', display: 'block',
  },
  postNoImg: {
    width: '100%', height: '100%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: C.verdeBg,
  },
  postTypeBadge: {
    position: 'absolute', top: 8, left: 8,
    padding: '4px 9px', borderRadius: 999,
    fontSize: 10.5, fontWeight: 700,
    display: 'inline-flex', alignItems: 'center', gap: 3,
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
  },
  postBody: { padding: '10px 12px 12px' },
  postTitle: {
    fontSize: 13, fontWeight: 700, color: C.texto,
    lineHeight: 1.3, minHeight: 34, marginBottom: 4,
    overflow: 'hidden', display: '-webkit-box',
    WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
  },
  postPrice: {
    fontSize: 14, fontWeight: 800, color: C.verde,
  },

  // EMPTY
  emptyBox: {
    background: C.card,
    border: `1px dashed ${C.borde}`,
    borderRadius: 14,
    padding: '28px 18px',
    textAlign: 'center',
    color: C.textoTenue,
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: 6,
  },
  emptyTitle: {
    fontSize: 14, fontWeight: 700, color: C.texto,
    marginTop: 4,
  },
  emptyText: {
    fontSize: 12.5, color: C.textoSuave,
    lineHeight: 1.5, maxWidth: 280,
  },

  // REVIEWS
  reviewsList: {
    display: 'flex', flexDirection: 'column', gap: 10,
  },
  reviewCard: {
    background: C.card,
    border: `1px solid ${C.borde}`,
    borderRadius: 14,
    padding: '12px 14px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
  },
  reviewHeader: {
    display: 'flex', alignItems: 'center', gap: 10,
    marginBottom: 6,
  },
  reviewAvatar: {
    width: 32, height: 32, borderRadius: '50%',
    objectFit: 'cover', flexShrink: 0,
  },
  reviewAvatarFallback: {
    width: 32, height: 32, borderRadius: '50%',
    background: C.verde, color: '#fff',
    fontSize: 12, fontWeight: 700,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  reviewNameRow: {
    display: 'flex', alignItems: 'center', gap: 4,
    marginBottom: 2,
  },
  reviewName: {
    fontSize: 13.5, fontWeight: 700, color: C.texto,
  },
  reviewCheck: {
    color: C.verde, display: 'flex',
  },
  reviewStarsRow: {
    display: 'flex', alignItems: 'center', gap: 1,
  },
  reviewDate: {
    fontSize: 11, color: C.textoTenue, fontWeight: 500,
    marginLeft: 6,
  },
  reviewBody: {
    fontSize: 13, color: C.textoSuave,
    lineHeight: 1.5, marginTop: 4,
    whiteSpace: 'pre-wrap',
  },

  // PREMIUM BADGE (hero)
  premiumBadge: {
    position: 'absolute',
    top: 12, right: 12,
    background: `linear-gradient(135deg, ${C.verde}, ${C.verdeOsc})`,
    color: '#fff',
    fontSize: 11, fontWeight: 800,
    padding: '5px 10px',
    borderRadius: 20,
    boxShadow: '0 2px 8px rgba(22,163,74,0.30)',
    zIndex: 2,
    display: 'inline-flex', alignItems: 'center', gap: 4,
    letterSpacing: '0.2px',
  },

  // PROMOS
  promosList: {
    display: 'flex', flexDirection: 'column', gap: 10,
    marginBottom: 22,
  },
  promoCard: {
    background: C.card,
    borderRadius: 14,
    overflow: 'hidden',
    border: `1px solid ${C.borde}`,
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  promoBand: {
    height: 4,
    background: `linear-gradient(90deg, ${C.verde}, ${C.verdeOsc})`,
  },
  promoBody: {
    padding: 14,
    background: C.verdeBg,
  },
  promoImg: {
    width: '100%',
    maxHeight: 180,
    objectFit: 'cover',
    borderRadius: 10,
    marginBottom: 10,
    display: 'block',
  },
  promoTitle: {
    fontSize: 15, fontWeight: 800, color: C.texto,
    marginBottom: 4, letterSpacing: '-0.1px',
  },
  promoDesc: {
    fontSize: 13, color: C.textoSuave, lineHeight: 1.4,
    whiteSpace: 'pre-wrap',
  },
  promoExpiry: {
    display: 'inline-block',
    fontSize: 11.5, color: C.verdeOsc, fontWeight: 700,
    background: C.verdeSuave,
    padding: '3px 8px',
    borderRadius: 6,
    marginTop: 8,
  },

  // REPORT
  reportWrap: {
    marginTop: 24,
    display: 'flex', justifyContent: 'center',
  },
  reportBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    background: 'transparent', color: C.textoTenue,
    border: 'none',
    padding: '8px 12px',
    fontSize: 12.5, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit',
  },

  // TOAST
  toast: {
    position: 'fixed',
    bottom: 28, left: '50%',
    transform: 'translateX(-50%)',
    background: C.texto, color: '#fff',
    padding: '12px 20px',
    borderRadius: 999,
    fontSize: 13.5, fontWeight: 600,
    boxShadow: '0 6px 24px rgba(0,0,0,0.25)',
    zIndex: 999,
    animation: 'spToastIn 0.2s ease-out',
    maxWidth: 'calc(100% - 32px)',
    textAlign: 'center',
  },

  // MODAL (bottom sheet)
  modalOverlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(17,24,39,0.55)',
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    zIndex: 998,
  },
  sheetCard: {
    width: '100%', maxWidth: 480,
    background: C.card,
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
    padding: '8px 18px 22px',
    boxShadow: '0 -8px 30px rgba(0,0,0,0.18)',
    animation: 'spSheetUp 0.24s ease-out',
  },
  sheetHandle: {
    width: 38, height: 4,
    background: C.borde,
    borderRadius: 999,
    margin: '8px auto 14px',
  },
  sheetTitle: {
    fontSize: 17, fontWeight: 800, color: C.texto,
    textAlign: 'center', marginBottom: 4,
    letterSpacing: '-0.2px',
  },
  sheetSub: {
    fontSize: 12.5, color: C.textoSuave,
    textAlign: 'center', marginBottom: 14,
    lineHeight: 1.45,
  },
  sheetList: {
    display: 'flex', flexDirection: 'column', gap: 6,
  },
  sheetItem: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '12px 12px',
    background: C.fondo,
    border: `1px solid ${C.bordeSuave}`,
    borderRadius: 12,
    cursor: 'pointer', fontFamily: 'inherit',
    width: '100%',
  },
  sheetItemEmoji: {
    fontSize: 22, flexShrink: 0,
    width: 36, height: 36,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: C.card,
    borderRadius: 10,
  },
  sheetItemLabel: {
    display: 'block',
    fontSize: 14, fontWeight: 700, color: C.texto,
  },
  sheetItemSub: {
    display: 'block',
    fontSize: 11.5, color: C.textoSuave, marginTop: 1,
  },
  sheetCancel: {
    marginTop: 14,
    width: '100%', padding: '13px 16px',
    background: 'transparent', color: C.textoSuave,
    border: `1px solid ${C.borde}`,
    borderRadius: 12,
    fontSize: 14.5, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit',
  },

  // ESTADOS (404 / error)
  stateBox: {
    margin: '40px 24px',
    background: C.card,
    border: `1px solid ${C.borde}`,
    borderRadius: 18,
    padding: '36px 24px',
    textAlign: 'center',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: 8,
    boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
  },
  stateEmoji: { fontSize: 44, lineHeight: 1 },
  stateTitle: {
    fontSize: 17, fontWeight: 800, color: C.texto,
    letterSpacing: '-0.2px',
  },
  stateText: {
    fontSize: 13.5, color: C.textoSuave,
    lineHeight: 1.55, maxWidth: 280,
  },
  stateBtn: {
    marginTop: 8,
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '12px 22px',
    background: C.verde, color: '#fff',
    border: 'none', borderRadius: 999,
    fontSize: 14, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit',
  },

  // SKELETON (shimmer)
  skelBlock: {
    background: `linear-gradient(90deg, ${C.bordeSuave} 0%, ${C.borde} 50%, ${C.bordeSuave} 100%)`,
    backgroundSize: '200% 100%',
    animation: 'spShimmer 1.4s ease-in-out infinite',
  },
  skelCircle: {
    background: `linear-gradient(90deg, ${C.bordeSuave} 0%, ${C.borde} 50%, ${C.bordeSuave} 100%)`,
    backgroundSize: '200% 100%',
    animation: 'spShimmer 1.4s ease-in-out infinite',
    borderRadius: '50%',
  },
  skelLine: {
    background: `linear-gradient(90deg, ${C.bordeSuave} 0%, ${C.borde} 50%, ${C.bordeSuave} 100%)`,
    backgroundSize: '200% 100%',
    animation: 'spShimmer 1.4s ease-in-out infinite',
    borderRadius: 6,
  },
}
