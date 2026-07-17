import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { C, T, S, TIPOS, BADGES, iniciales, hace, plata } from '../lib/design'

/*
  MyProfile — Mi perfil (propio) para El Barrio.

  Se monta desde App.jsx en el tab 'perfil':
    <MyProfile currentUser={user} onNavigate={onNavigate} onLogout={handleLogout} />

  currentUser puede ser:
    (a) el user auth básico { id, email } — en cuyo caso MyProfile carga el
        perfil completo desde `profiles` por user_id == currentUser.id;
    (b) el perfil completo mergeado con auth (full_name, avatar_url, badges,
        reputation_score, etc.) — en cuyo caso se usa directo y se salta
        la query de profiles.

  Replica EXACTAMENTE el ProfileScreen del sandbox Next.js (page.tsx ~5560):
    - Header con back + título "Mi perfil" + editar + configuración.
    - Hero en gradiente verde con avatar, nombre, ubicación y badge verificado.
    - Filas de badges (Fundador / Confiable / Colaborador) solapando el hero.
    - Card de Reputación con barra de progreso y scoreLevel.
    - 3 chips de acceso rápido: Logros / Billetera / Guardados.
    - Grid 3x2 de stats: Publicaciones, Me gusta, Comentarios, Ventas,
      Regalos, Ayudas.
    - Card "Miembro desde {mes año}".
    - 5 tabs de actividad: Posts / Guardados / Servicios / Eventos / Eval.
    - Empty states centrados para cada tab.

  Queries a Supabase (patrón defensive .or(id,user_id) + try/catch):
    - posts: mis publicaciones activas (cualquier type).
    - saved_posts: posts guardados (join a posts). Si la tabla no existe,
      dejamos savedPosts=[] (graceful) — NOTA: tabs de actividad removidos en Task 64-fix-2.
    - services: mis servicios publicados (tabla services o fallback a
      posts con type='service').
    - events: mis eventos organizados.
    - reviews: reseñas recibidas (con join a profiles del reviewer).

  Estados: loading (skeleton shimmer), loaded (full UI), toast (bottom-center).
*/

// ──────────────────────────────────────────────────────────────
// ICONOS SVG INLINE — sin emojis para iconos de UI.
// (Emojis SÍ para contenido: 📝 ❤️ 💬 🏷️ 🎁 🤝 🏆 💳 🔖 📅 ⭐)
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
const IcoEditar = (p) => (
  <Ico {...p}>
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </Ico>
)
const IcoConfig = (p) => (
  <Ico {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </Ico>
)
const IcoCheck = (p) => (
  <Ico {...p} stroke={2.6}>
    <circle cx="12" cy="12" r="10" fill="currentColor" stroke="none" />
    <polyline points="8 12 11 15 16 9" stroke="#fff" fill="none" />
  </Ico>
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
const IcoChevronDer = (p) => (
  <Ico {...p}><polyline points="9 18 15 12 9 6" /></Ico>
)
const IcoRefresh = (p) => (
  <Ico {...p}>
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </Ico>
)
const IcoPin = (p) => (
  <Ico {...p}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></Ico>
)
const IcoReloj = (p) => (
  <Ico {...p}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></Ico>
)
const IcoDoc = (p) => (
  <Ico {...p}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="8" y1="13" x2="16" y2="13" />
    <line x1="8" y1="17" x2="13" y2="17" />
  </Ico>
)
// Medalla de oro: cinta en V + círculo dorado + estrella interior
const IcoMedal = ({ size = 24, stroke = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {/* Cinta izquierda */}
    <path d="M7.5 2 11 10.5" stroke="#fff" strokeWidth={stroke} strokeLinecap="round" />
    {/* Cinta derecha */}
    <path d="M16.5 2 13 10.5" stroke="#fff" strokeWidth={stroke} strokeLinecap="round" />
    {/* Medalla círculo dorado */}
    <circle cx="12" cy="15.5" r="6.2" fill="#fbbf24" stroke="#fff" strokeWidth={1.4} />
    {/* Estrella interior */}
    <polygon
      points="12 12.6 12.95 14.55 15.1 14.85 13.55 16.35 13.9 18.5 12 17.5 10.1 18.5 10.45 16.35 8.9 14.85 11.05 14.55"
      fill="#fff"
    />
  </svg>
)
const IcoBadgeCheck = (p) => (
  <Ico {...p} stroke={2.6}>
    <polyline points="4 12.5 9.5 18 20 6" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </Ico>
)

// ──────────────────────────────────────────────────────────────
// MAPEO TYPE_ALIAS → TIPOS[clave] (igual que SellerProfile)
// Cubre los types reales del CreatePost (sell/gift/trade/service/request/
// alert/event) + aliases en español antiguos.
// ──────────────────────────────────────────────────────────────
const TYPE_ALIASES = {
  sell: 'sell', venta: 'sell', vender: 'sell', sale: 'sell', offer: 'sell',
  gift: 'gift', regalo: 'gift', regalar: 'gift', free: 'gift',
  trade: 'trade', intercambio: 'trade', trueque: 'trade', swap: 'trade',
  service: 'service', servicio: 'service',
  need: 'request', pedido: 'request', request: 'request', ayuda: 'request',
  alert: 'alert', alerta: 'alert',
  event: 'event', evento: 'event',
  general: 'general', post: 'general',
}

function tipoDePost(typeKey) {
  const key = TYPE_ALIASES[String(typeKey || '').toLowerCase()] || 'general'
  return TIPOS[key] || TIPOS.general
}

// Precio legible (mismo formato que Marketplace / SellerProfile)
function precioDe(post) {
  if (!post) return ''
  const t = String(post.type || '').toLowerCase()
  if (['regalo', 'regalar', 'gift', 'free'].includes(t)) return 'Gratis'
  if (['intercambio', 'trueque', 'trade', 'swap'].includes(t)) return 'Trueque'
  if (post.price === null || post.price === undefined) return ''
  return plata(post.price)
}

// "Miembro desde marzo de 2024" — formato es-CL long.
function miembroDesde(fecha) {
  if (!fecha) return ''
  const f = new Date(fecha)
  if (isNaN(f.getTime())) return ''
  try {
    return f.toLocaleDateString('es-CL', { year: 'numeric', month: 'long' })
  } catch {
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
    return `${meses[f.getMonth()]} de ${f.getFullYear()}`
  }
}

// Formatea día + mes corta para el badge de evento (ej: "15 MAR").
function fechaCortaEvento(fecha) {
  if (!fecha) return { day: '—', month: '' }
  const f = new Date(fecha)
  if (isNaN(f.getTime())) return { day: '—', month: '' }
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun',
    'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  return { day: String(f.getDate()), month: meses[f.getMonth()] }
}

// ──────────────────────────────────────────────────────────────
// ANIMACIONES (CSS inyectado — mismo patrón que SellerProfile/AlertaDetail)
// ──────────────────────────────────────────────────────────────
const STYLE_KEYFRAMES = `
@keyframes mpFadeIn {
  0%   { opacity: 0; transform: translateY(8px); }
  100% { opacity: 1; transform: translateY(0); }
}
@keyframes mpToastIn {
  0%   { opacity: 0; transform: translate(-50%, 10px); }
  100% { opacity: 1; transform: translate(-50%, 0); }
}
@keyframes mpShimmer {
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
@keyframes mpPulse {
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(0.96); }
}
@keyframes mpBadgeShimmer {
  0%   { transform: translateX(-130%) skewX(-18deg); opacity: 0; }
  18%  { opacity: 0.6; }
  50%  { opacity: 0.38; }
  82%  { opacity: 0.6; }
  100% { transform: translateX(130%) skewX(-18deg); opacity: 0; }
}
@keyframes mpBadgeShine {
  0%, 100% { text-shadow: 0 0 0 rgba(255,255,255,0); }
  50%      { text-shadow: 0 0 12px rgba(255,255,255,0.5); }
}
.mp-card-hover { transition: transform 0.15s ease, box-shadow 0.15s ease; }
.mp-card-hover:active { transform: translateY(-1px) scale(0.985); box-shadow: 0 4px 14px rgba(0,0,0,0.08); }
.mp-chip:active { transform: scale(0.96); }
.mp-tab { transition: background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease; }
.mp-tab:active { transform: scale(0.97); }
`

// ──────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ──────────────────────────────────────────────────────────────
export default function MyProfile({ currentUser, onNavigate, onBack, onLogout }) {
  // Estado de datos
  const [profile, setProfile] = useState(null)         // perfil completo (merged con currentUser)
  const [myStats, setMyStats] = useState({ posts: 0, likes: 0, comments: 0 })
  const [myPosts, setMyPosts] = useState([])

  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')

  const toastTimer = useRef(null)

  // Si currentUser ya viene con full_name, lo usamos como perfil inicial y
  // saltamos la query a profiles. Si no, hay que cargarlo.
  const haveProfileInline = !!(currentUser && (currentUser.full_name || currentUser.avatar_url))

  const nav = onNavigate || (() => {})

  /* ─────── TOAST ─────── */
  const showToast = (msg) => {
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 2500)
  }

  /* ─────── HANDLERS ─────── */
  const handleBack = () => {
    if (typeof onBack === 'function') { onBack(); return }
    nav('back')
  }
  const handleEdit = () => {
    // Defensive: la ruta 'editprofile' puede no existir todavía en App.jsx
    try { nav('editprofile') } catch { /* ignore */ }
  }
  const handleSettings = () => {
    try { nav('settings') } catch { /* ignore */ }
  }
  const handleChipLogros = () => showToast('Próximamente')
  const handleChipBilletera = () => showToast('Próximamente')

  /* ─────── CARGA PRINCIPAL ─────── */
  const cargarTodo = async () => {
    if (!currentUser?.id) {
      setLoading(false)
      return
    }

    setLoading(true)

    // uid = auth uid (currentUser.id). profileId = row id del perfil (para
    // reviews.reviewee_id). Si currentUser ya trae profile.id lo usamos,
    // si no lo sacamos de la query a profiles.
    const uid = currentUser.user_id || currentUser.id
    let prof = null
    let profileId = currentUser.id // por defecto el auth uid (puede ser igual al row id)

    try {
      if (haveProfileInline) {
        // currentUser ya trae el perfil mergeado — no hacemos query.
        prof = currentUser
        profileId = prof.id || prof.user_id || uid
      } else {
        // Cargar perfil desde profiles por user_id == auth uid.
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', uid)
          .maybeSingle()
        if (error) throw error
        prof = data
        profileId = prof?.id || uid
      }
    } catch {
      // Si falla la carga del perfil, dejamos un fallback mínimo con el
      // auth user (nombre 'Vecino', sin avatar). El UI sigue funcionando.
      prof = { ...currentUser, full_name: 'Vecino del barrio' }
      profileId = uid
    }

    setProfile(prof)
    setLoading(false)

    // Cargar publicaciones en paralelo (para stats: posts/likes/comments).
    // Los tabs de actividad fueron removidos — no necesitamos cargar
    // saved/services/events/reviews por separado.
    cargarPosts(uid, profileId)
  }

  /* ─────── POSTS PROPIOS ─────── */
  const cargarPosts = async (uid, profileId) => {
    try {
      // Defensive .or(user_id, author_id) — algunos schemas usan user_id,
      // otros author_id. Si profileId != uid, agregamos ambos.
      const filtro = (profileId && profileId !== uid)
        ? `user_id.eq.${uid},author_id.eq.${profileId},user_id.eq.${profileId}`
        : `user_id.eq.${uid},author_id.eq.${uid}`

      const { data, error } = await supabase
        .from('posts')
        .select('id, title, type, price, images, created_at, likes_count, comments_count, views_count, status')
        .or(filtro)
        .order('created_at', { ascending: false })
        .limit(40)

      if (error) throw error
      const list = data || []
      setMyPosts(list)
      setMyStats({
        posts: list.length,
        likes: list.reduce((s, p) => s + (Number(p.likes_count) || 0), 0),
        comments: list.reduce((s, p) => s + (Number(p.comments_count) || 0), 0),
      })
    } catch {
      setMyPosts([])
      setMyStats({ posts: 0, likes: 0, comments: 0 })
    }
  }

  /* ─────── POSTS GUARDADOS / SERVICIOS / EVENTOS / RESEÑAS ───────
     Removidos: los tabs de actividad que los mostraban fueron eliminados.
     Si se vuelven a necesitar, recuperar desde el history de este archivo
     (Task 64 original). El grid de stats arriba ya muestra los contadores
     principales (Publicaciones, Me gusta, Comentarios, Ventas, Regalos, Ayudas).
  ──────────────────────────────────────────────────────────────────── */

  useEffect(() => {
    cargarTodo()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id])

  /* ─────── RENDER: SKELETON ─────── */
  if (loading || !profile) {
    return (
      <div style={s.wrap}>
        <style dangerouslySetInnerHTML={{ __html: STYLE_KEYFRAMES }} />
        <HeaderSkeleton />
        <div style={s.scroll}>
          <SkeletonHero />
          <div style={s.content}>
            <div style={s.skelCard} />
            <div style={s.chipsRow}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{ ...s.skelBlock, height: 64, flex: 1, borderRadius: 12 }} />
              ))}
            </div>
            <div style={s.statsGrid}>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} style={{ ...s.skelBlock, height: 90, borderRadius: 14 }} />
              ))}
            </div>
            <div style={{ ...s.skelBlock, height: 50, borderRadius: 14, marginTop: 8 }} />
          </div>
        </div>
      </div>
    )
  }

  /* ─────── DATOS DERIVADOS ─────── */
  const fullName = profile.full_name || 'Vecino del barrio'
  const avatarUrl = profile.avatar_url
  const comuna = profile.comuna || profile.neighborhood?.city || ''
  const barrio = profile.barrio || profile.neighborhood?.name || profile.neighborhood_name || ''
  const verified = profile.verified === true || profile.verification_status === 'verified'

  const isFounder = profile.badge_founder === true
  // Todos los usuarios verificados con GPS obtienen el badge "Confiable"
  const isTrustedSeller = profile.badge_trusted_seller === true || profile.verified === true
  // Colaborador se genera después de X hitos — queda para V2
  const hasBadges = isFounder || isTrustedSeller

  const scoreRaw = Number(profile.reputation_score || profile.rating || 0)
  const score = Number.isFinite(scoreRaw) ? scoreRaw : 0
  const scoreLevel = score >= 4.5 ? 'Vecino ejemplar'
    : score >= 3.5 ? 'Buen vecino'
    : score >= 2 ? 'Vecino nuevo'
    : 'Recién llegado'
  const scoreColor = score >= 4 ? C.verde : C.naranjo
  const scoreStars = Math.max(0, Math.min(5, Math.round(score)))

  const totalSales = Number(profile.total_sales) || 0
  const totalGifts = Number(profile.total_gifts) || 0
  const totalHelps = Number(profile.total_helps) || 0

  const memberSince = miembroDesde(profile.member_since || profile.verified_at || profile.created_at)

  /* ─────── RENDER: PERFIL ─────── */
  return (
    <div style={s.wrap}>
      <style dangerouslySetInnerHTML={{ __html: STYLE_KEYFRAMES }} />

      <Header onBack={handleBack} onEdit={handleEdit} onSettings={handleSettings} />

      <div style={s.scroll}>
        {/* HERO — gradiente verde */}
        <div style={s.hero}>
          <div style={s.heroAvatarWrap}>
            {avatarUrl ? (
              <img src={avatarUrl} alt={fullName} style={s.heroAvatar} />
            ) : (
              <div style={s.heroAvatarFallback}>{iniciales(fullName)}</div>
            )}
          </div>
          <div style={s.heroName}>{fullName}</div>
          {(barrio || comuna) && (
            <div style={s.heroLoc}>📍 {[barrio, comuna].filter(Boolean).join(', ')}</div>
          )}
        </div>

        {/* BADGES — estilo banner de promoción: gradiente + patrón + shimmer */}
        {hasBadges && (
          <div style={s.badgesRow}>
            {isFounder && (
              <BadgeCard badge={BADGES.founder} delay={0} />
            )}
            {isTrustedSeller && (
              <BadgeCard badge={BADGES.trusted} delay={0.9} />
            )}
          </div>
        )}

        {/* REPUTACIÓN */}
        <div style={s.repWrap}>
          <div style={S.card}>
            <div style={s.repHeader}>
              <span style={s.repLabel}>Reputación</span>
              <span style={{ ...s.repScore, color: C.verde }}>
                {score.toFixed(1)}
              </span>
            </div>
            <div style={s.repBar}>
              <div
                style={{
                  ...s.repBarFill,
                  width: `${(score / 5) * 100}%`,
                  background: scoreColor,
                }}
              />
            </div>
            <div style={s.repFooter}>
              {scoreLevel} · {'★'.repeat(scoreStars)}{'☆'.repeat(5 - scoreStars)}
            </div>
          </div>
        </div>

        {/* CHIPS de acceso rápido — removidos (Logros/Billetera no existen aún
            y duplicaban el patrón visual de las stats de abajo). El tab
            Guardados ya está en la fila de tabs de actividad. */}

        {/* STATS GRID 3x2 */}
        <div style={s.statsGrid}>
          <StatCell emoji="📝" value={myStats.posts} label="Publicaciones" color={C.verde} />
          <StatCell emoji="❤️" value={myStats.likes} label="Me gusta" color={C.rojo} />
          <StatCell emoji="💬" value={myStats.comments} label="Comentarios" color={C.morado} />
          <StatCell emoji="🏷️" value={totalSales} label="Ventas" color={C.naranjo} />
          <StatCell emoji="🎁" value={totalGifts} label="Regalos" color={C.morado} />
          <StatCell emoji="🤝" value={totalHelps} label="Ayudas" color={C.dorado} />
        </div>

        {/* MIEMBRO DESDE */}
        {memberSince && (
          <div style={s.memberWrap}>
            <div style={s.memberCard}>
              <span style={s.memberEmoji}>📅</span>
              <span style={s.memberText}>
                Miembro desde <strong style={s.memberDate}>{memberSince}</strong>
              </span>
            </div>
          </div>
        )}

        {/* SIN PUBLICACIONES — empty state cuando el vecino aún no publica.
            Se muestra solo si myStats.posts === 0 (sin contar loading inicial). */}
        {myStats.posts === 0 && (
          <div style={s.emptyPostsWrap}>
            <div style={s.emptyPostsCard}>
              <span style={s.emptyPostsIcon}>
                <IcoDoc size={26} />
              </span>
              <div style={s.emptyPostsTitle}>Sin publicaciones aún</div>
              <div style={s.emptyPostsSub}>
                Cuando publiques algo en el barrio, aparecerá acá.
              </div>
            </div>
          </div>
        )}

        <div style={{ height: 72 }} />
      </div>

      {/* TOAST */}
      {toast && (
        <div style={s.toast}>{toast}</div>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// SUBCOMPONENTES
// ──────────────────────────────────────────────────────────────
function Header({ onBack, onEdit, onSettings }) {
  return (
    <div style={s.header}>
      <button style={s.iconBtn} onClick={onBack} aria-label="Volver">
        <IcoAtras size={20} />
      </button>
      <div style={s.headerTitle}>Mi perfil</div>
      <button style={s.iconBtn} onClick={onEdit} aria-label="Editar perfil">
        <IcoEditar size={20} />
      </button>
      <button style={s.iconBtn} onClick={onSettings} aria-label="Configuración">
        <IcoConfig size={20} />
      </button>
    </div>
  )
}

function HeaderSkeleton() {
  return (
    <div style={s.header}>
      <div style={{ ...s.skelBlock, width: 40, height: 40, borderRadius: 12 }} />
      <div style={{ ...s.skelBlock, height: 18, width: 100, flex: 1 }} />
      <div style={{ ...s.skelBlock, width: 40, height: 40, borderRadius: 12 }} />
      <div style={{ ...s.skelBlock, width: 40, height: 40, borderRadius: 12 }} />
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// BADGE_META — definición auto-contenida de gradientes/iconos.
// Sirve como FALLBACK cuando lib/design.js aún tiene la versión vieja
// de BADGES (sin campos gradient/glow/icon). Así MyProfile.jsx funciona
// sin necesidad de actualizar design.js.
// ──────────────────────────────────────────────────────────────
const BADGE_META = {
  fundador: {
    gradient: 'linear-gradient(135deg, #fbbf24 0%, #d97706 60%, #92400e 100%)',
    glow: 'rgba(217,119,6,0.32)',
    icon: 'medal',
    emoji: '🏅',
    label: 'Fundador',
    sub: 'Primeros 70',
  },
  verificado: {
    gradient: 'linear-gradient(135deg, #4ade80 0%, #16a34a 60%, #15803d 100%)',
    glow: 'rgba(22,163,74,0.30)',
    icon: 'check',
    emoji: '✅',
    label: 'Verificado',
    sub: 'Cuenta verificada',
  },
  colaborador: {
    gradient: 'linear-gradient(135deg, #60a5fa 0%, #2563eb 100%)',
    glow: 'rgba(37,99,235,0.26)',
    icon: 'hand',
    emoji: '🤝',
    label: 'Colaborador',
    sub: 'Activo',
  },
}

// Detecta qué badge es por label o emoji (compat con design.js viejo y nuevo)
function resolveBadge(badge) {
  if (!badge) return null
  const lbl = (badge.label || '').toLowerCase()
  const emj = badge.emoji || ''
  let key = null
  if (badge.icon === 'medal' || lbl === 'fundador' || emj === '⭐' || emj === '👑' || emj === '🏅') key = 'fundador'
  else if (badge.icon === 'check' || lbl === 'verificado' || lbl === 'confiable' || emj === '✅') key = 'verificado'
  else if (badge.icon === 'hand' || lbl === 'colaborador' || emj === '🤝') key = 'colaborador'
  if (!key) return badge // desconocido: usar tal cual
  const meta = BADGE_META[key]
  // Merge: los campos del badge (design.js nuevo) pisan al fallback
  return {
    ...meta,
    ...badge,
    // Pero si design.js es viejo (sin gradient/icon), forzamos los del meta
    gradient: badge.gradient || meta.gradient,
    glow: badge.glow || meta.glow,
    icon: badge.icon || meta.icon,
  }
}

function BadgeCard({ badge, delay = 0 }) {
  const b = resolveBadge(badge)
  if (!b) return null
  return (
    <div
      style={{
        ...s.badgeCard,
        background: b.gradient,
        boxShadow: `0 6px 18px ${b.glow}, 0 1px 2px rgba(0,0,0,0.06)`,
      }}
    >
      {/* Patrón de puntos sutil */}
      <span style={s.badgePattern} />
      {/* Círculo deco esquina sup-der */}
      <span style={s.badgeDeco} />
      {/* Shimmer — franja diagonal de luz que atraviesa la card */}
      <span style={{ ...s.badgeShimmer, animationDelay: `${delay}s` }} />
      <div style={s.badgeInner}>
        {/* Círculo translúcido con ícono lineal blanco */}
        <div style={s.badgeMedal}>
          {b.icon === 'medal'
            ? <IcoMedal size={26} />
            : b.icon === 'check'
              ? <IcoBadgeCheck size={24} />
              : <span style={{ fontSize: 20 }}>{b.emoji}</span>}
        </div>
        <div style={s.badgeBody}>
          <div style={s.badgeLabel}>{b.label}</div>
          <div style={s.badgeSub}>{b.sub}</div>
        </div>
      </div>
    </div>
  )
}

function StatCell({ emoji, value, label, color }) {
  return (
    <div style={s.statCell}>
      <span style={s.statEmoji}>{emoji}</span>
      <div style={{ ...s.statValue, color }}>{value}</div>
      <div style={s.statLabel}>{label}</div>
    </div>
  )
}

function PostRow({ post, onClick, saved }) {
  const tipo = tipoDePost(post.type)
  const precio = precioDe(post)
  const titulo = post.title || (post.content ? post.content.slice(0, 60) : 'Publicación')
  const likes = Number(post.likes_count) || 0
  const comments = Number(post.comments_count) || 0
  const views = Number(post.views_count) || 0

  return (
    <div style={S.cardTap} className="mp-card-hover" onClick={onClick}>
      <div style={{ ...s.rowIcon, background: tipo.bg }}>
        <span style={{ fontSize: 22, lineHeight: 1 }}>{tipo.emoji}</span>
      </div>
      <div style={s.rowBody}>
        <div style={s.rowTitle}>{titulo}</div>
        <div style={s.rowMeta}>
          <span style={{ color: tipo.color, fontWeight: 600 }}>{tipo.corto}</span>
          {precio && <span style={s.rowPrice}>{precio}</span>}
          <span style={s.rowTime}>· {hace(post.created_at)}</span>
        </div>
        <div style={s.rowStats}>
          <span>❤️ {likes}</span>
          <span>💬 {comments}</span>
          {views > 0 && <span>👁 {views}</span>}
          {saved && <span style={s.rowSavedTag}>🔖 Guardado</span>}
        </div>
      </div>
    </div>
  )
}

function ServiceRow({ service, onClick }) {
  const titulo = service.title || 'Servicio'
  const categoria = service.category || 'Otro'
  const priceRange = service.price_range || ''
  const isPremium = service.is_premium === true
  const rating = Number(service.rating) || 0
  const totalReviews = Number(service.total_reviews) || 0

  return (
    <div style={S.cardTap} className="mp-card-hover" onClick={onClick}>
      <div style={{ ...s.rowIcon, background: C.azulSuave }}>
        <span style={{ fontSize: 22, lineHeight: 1 }}>🔧</span>
      </div>
      <div style={s.rowBody}>
        <div style={s.rowTitle}>{titulo}</div>
        <div style={s.rowMeta}>
          <span style={{ color: C.azul, fontWeight: 600 }}>{categoria}</span>
          {priceRange && <span>{priceRange}</span>}
          {isPremium && <span style={s.rowPremium}>⭐ Premium</span>}
        </div>
        <div style={s.rowStats}>
          <span>★ {rating.toFixed(1)}</span>
          <span>{totalReviews} evaluaciones</span>
        </div>
      </div>
    </div>
  )
}

function EventRow({ event, onClick }) {
  const { day, month } = fechaCortaEvento(event.event_date || event.event_date_start)
  const titulo = event.title || 'Evento'
  const location = event.location || event.location_text || ''
  const attendees = Number(event.attendees_count) || 0

  return (
    <div style={S.cardTap} className="mp-card-hover" onClick={onClick}>
      <div style={s.eventDateBox}>
        <span style={s.eventDay}>{day}</span>
        <span style={s.eventMonth}>{month}</span>
      </div>
      <div style={s.rowBody}>
        <div style={s.rowTitle}>{titulo}</div>
        <div style={s.rowMeta}>
          {location && <span>📍 {location}</span>}
          <span>👥 {attendees}</span>
        </div>
      </div>
    </div>
  )
}

function ReviewRow({ review }) {
  const r = review.reviewer || {}
  const name = r.full_name || 'Vecino'
  const avatarUrl = r.avatar_url
  const verified = r.verified === true
  const rating = Number(review.rating) || 0
  const comment = review.comment || review.body || ''
  const cuando = hace(review.createdAt || review.created_at)

  return (
    <div style={s.reviewCard}>
      <div style={s.reviewHeader}>
        {avatarUrl ? (
          <img src={avatarUrl} alt={name} style={s.reviewAvatar} />
        ) : (
          <div style={s.reviewAvatarFallback}>{iniciales(name)}</div>
        )}
        <div style={s.reviewInfo}>
          <div style={s.reviewNameRow}>
            <span style={s.reviewName}>{name}</span>
            {verified && (
              <span style={s.reviewCheck}>
                <IcoCheck size={12} />
              </span>
            )}
          </div>
          <div style={s.reviewDate}>{cuando}</div>
        </div>
        <div style={s.reviewStars}>
          {[1, 2, 3, 4, 5].map((n) => (
            <span
              key={n}
              style={{
                fontSize: 13,
                color: n <= rating ? C.dorado : C.borde,
                lineHeight: 1,
              }}
            >
              ★
            </span>
          ))}
        </div>
      </div>
      {comment && <div style={s.reviewBody}>{comment}</div>}
    </div>
  )
}

function EmptyState({ emoji, title, subtitle }) {
  return (
    <div style={s.emptyBox}>
      <div style={s.emptyEmoji}>{emoji}</div>
      <div style={s.emptyTitle}>{title}</div>
      {subtitle && <div style={s.emptyText}>{subtitle}</div>}
    </div>
  )
}

function SkeletonHero() {
  return (
    <div style={s.hero}>
      <div style={{ ...s.skelBlock, width: 88, height: 88, borderRadius: '50%', margin: '0 auto 14px' }} />
      <div style={{ ...s.skelBlock, width: 200, height: 22, margin: '0 auto 8px' }} />
      <div style={{ ...s.skelBlock, width: 160, height: 14, margin: '0 auto' }} />
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

  // HEADER — padding simple (12px) porque App.jsx ya aporta el contentPad
  // superior (30px) para los tabs. Así evitamos el doble padding que dejaba
  // un espacio grande entre el notch del teléfono y el header.
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 12px 12px',
    background: C.card,
    borderBottom: `1px solid ${C.borde}`,
    flexShrink: 0,
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  iconBtn: {
    width: 40, height: 40, borderRadius: 12,
    background: C.fondo, color: C.texto,
    border: `1px solid ${C.borde}`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', padding: 0, fontFamily: 'inherit',
    flexShrink: 0,
  },
  headerTitle: {
    flex: 1,
    fontSize: 17, fontWeight: 800, color: C.texto,
    letterSpacing: '-0.2px',
    textAlign: 'center',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },

  // SCROLL
  scroll: {
    flex: 1, minHeight: 0,
    overflowY: 'auto', overflowX: 'hidden',
    WebkitOverflowScrolling: 'touch',
  },

  // HERO — gradiente verde
  hero: {
    background: `linear-gradient(135deg, ${C.verde}, ${C.verdeOsc})`,
    padding: '32px 20px 24px',
    textAlign: 'center',
    color: '#fff',
    animation: 'mpFadeIn 0.32s ease-out',
  },
  heroAvatarWrap: {
    width: 88, height: 88,
    margin: '0 auto 12px',
  },
  heroAvatar: {
    width: 88, height: 88,
    borderRadius: '50%',
    objectFit: 'cover',
    border: '3px solid rgba(255,255,255,0.4)',
    display: 'block',
  },
  heroAvatarFallback: {
    width: 88, height: 88,
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.2)',
    border: '3px solid rgba(255,255,255,0.4)',
    color: '#fff',
    fontSize: 32, fontWeight: 800,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  heroName: {
    fontSize: 22, fontWeight: 800,
    marginBottom: 4,
    letterSpacing: '-0.3px',
  },
  heroLoc: {
    fontSize: 13,
    opacity: 0.85,
  },
  heroVerified: {
    display: 'inline-flex',
    alignItems: 'center', gap: 4,
    background: 'rgba(255,255,255,0.2)',
    padding: '4px 12px',
    borderRadius: 999,
    fontSize: 12, fontWeight: 700,
    marginTop: 8,
  },

  // BADGES — estilo banner de promoción (gradiente + patrón + shimmer)
  badgesRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: 10,
    marginTop: -22,
    padding: '0 16px',
    position: 'relative',
    zIndex: 2,
  },
  badgeCard: {
    position: 'relative',
    overflow: 'hidden',
    flex: 1,
    maxWidth: 178,
    borderRadius: 16,
    padding: '13px 14px',
  },
  /* Patrón de puntos sutil blanco */
  badgePattern: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.10) 1px, transparent 1px)',
    backgroundSize: '12px 12px',
    pointerEvents: 'none',
  },
  /* Círculo deco esquina sup-der */
  badgeDeco: {
    position: 'absolute',
    top: -18, right: -18,
    width: 56, height: 56, borderRadius: '50%',
    background: 'rgba(255,255,255,0.08)',
    pointerEvents: 'none',
  },
  /* Shimmer — franja diagonal de luz que atraviesa la card */
  badgeShimmer: {
    position: 'absolute',
    top: 0, bottom: 0,
    left: 0,
    width: '45%',
    background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.55) 50%, transparent 100%)',
    pointerEvents: 'none',
    animation: 'mpBadgeShimmer 3.8s ease-in-out infinite',
    zIndex: 1,
  },
  badgeInner: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: 11,
    zIndex: 2,
  },
  /* Círculo translúcido con ícono lineal blanco */
  badgeMedal: {
    width: 42, height: 42, borderRadius: '50%',
    background: 'rgba(255,255,255,0.20)',
    border: '1.5px solid rgba(255,255,255,0.40)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
    color: '#fff',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25)',
  },
  badgeBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
    minWidth: 0,
  },
  badgeLabel: {
    fontSize: 12.5, fontWeight: 800, color: '#fff',
    lineHeight: 1.15,
    letterSpacing: '0.3px',
    textTransform: 'uppercase',
    animation: 'mpBadgeShine 3.6s ease-in-out infinite',
  },
  badgeSub: {
    fontSize: 10.5, color: 'rgba(255,255,255,0.85)',
    lineHeight: 1.2,
    fontWeight: 500,
  },

  // REPUTACIÓN
  repWrap: {
    padding: '32px 16px 20px',
  },
  repHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  repLabel: {
    fontSize: 14, fontWeight: 700, color: C.texto,
  },
  repScore: {
    fontSize: 24, fontWeight: 800,
    letterSpacing: '-0.4px',
  },
  repBar: {
    height: 8,
    background: C.borde,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  repBarFill: {
    height: '100%',
    borderRadius: 4,
    transition: 'width 0.5s ease',
  },
  repFooter: {
    fontSize: 13, color: C.textoSuave,
  },

  // CHIPS
  chipsRow: {
    display: 'flex',
    gap: 8,
    padding: '16px 16px',
  },
  chip: {
    flex: 1,
    padding: '10px 6px',
    borderRadius: 12,
    fontSize: 11, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: 3,
    border: '1px solid transparent',
  },
  chipLogros: {
    background: C.doradoSuave,
    border: `1px solid ${C.dorado}30`,
    color: C.dorado,
  },
  chipBilletera: {
    background: C.verdeSuave,
    border: `1px solid ${C.verde}30`,
    color: C.verde,
  },
  chipGuardados: {
    background: C.azulSuave,
    border: `1px solid ${C.azul}30`,
    color: C.azul,
  },
  chipEmoji: { fontSize: 18, lineHeight: 1 },
  chipLabel: { fontSize: 11, fontWeight: 700 },

  // STATS GRID
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: 10,
    padding: '0 16px 16px',
  },
  statCell: {
    background: C.card,
    borderRadius: 14,
    border: `1px solid ${C.borde}`,
    padding: 14,
    textAlign: 'center',
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
  },
  statEmoji: {
    fontSize: 24, lineHeight: 1,
    display: 'block',
  },
  statValue: {
    fontSize: 20, fontWeight: 800,
    marginTop: 4,
    letterSpacing: '-0.3px',
  },
  statLabel: {
    fontSize: 11, color: C.textoSuave,
    marginTop: 2,
  },

  // MIEMBRO DESDE
  memberWrap: {
    padding: '0 16px 16px',
    textAlign: 'center',
  },
  memberCard: {
    background: C.card,
    borderRadius: 18,
    border: `1px solid ${C.borde}`,
    padding: 16,
    boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  memberEmoji: { fontSize: 18, lineHeight: 1 },
  memberText: {
    fontSize: 13.5, color: C.textoSuave,
  },
  memberDate: {
    color: C.verde, fontWeight: 800,
  },

  // SIN PUBLICACIONES — empty state
  emptyPostsWrap: {
    padding: '0 16px 24px',
  },
  emptyPostsCard: {
    background: C.card,
    border: `1.5px dashed ${C.borde}`,
    borderRadius: 16,
    padding: '26px 20px 30px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 10,
    textAlign: 'center',
  },
  emptyPostsIcon: {
    width: 50, height: 50,
    borderRadius: 14,
    background: C.bordeSuave,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: C.textoTenue,
    marginBottom: 2,
  },
  emptyPostsTitle: {
    fontSize: 14, fontWeight: 700, color: C.texto,
  },
  emptyPostsSub: {
    fontSize: 12, color: C.textoSuave, lineHeight: 1.4,
  },

  // TABS
  tabsWrap: {
    padding: '0 16px',
  },
  tabsBar: {
    display: 'flex',
    gap: 4,
    background: C.fondo,
    padding: 4,
    borderRadius: 14,
    marginBottom: 14,
  },
  tab: {
    flex: 1,
    padding: '10px 4px',
    borderRadius: 10,
    border: 'none',
    fontFamily: 'inherit',
    cursor: 'pointer',
    fontSize: 11, fontWeight: 700,
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: 2,
  },
  tabEmoji: { fontSize: 14, lineHeight: 1 },
  tabLabel: { fontSize: 11, fontWeight: 700 },
  tabCount: {
    fontSize: 10, fontWeight: 800,
  },
  tabContent: {
    minHeight: 120,
  },

  // CARDS COL (lista vertical)
  cardsCol: {
    display: 'flex', flexDirection: 'column', gap: 8,
  },
  rowIcon: {
    width: 44, height: 44,
    borderRadius: 10,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  rowBody: {
    flex: 1, minWidth: 0,
  },
  rowTitle: {
    fontSize: 14, fontWeight: 700, color: C.texto,
    marginBottom: 2,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  rowMeta: {
    display: 'flex', gap: 8,
    fontSize: 11, color: C.textoTenue,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  rowPrice: {
    fontWeight: 700, color: C.texto,
  },
  rowTime: { color: C.textoTenue },
  rowStats: {
    display: 'flex', gap: 10,
    fontSize: 11, color: C.textoSuave,
    marginTop: 4,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  rowSavedTag: {
    color: C.dorado, fontWeight: 700,
  },
  rowPremium: {
    color: C.dorado, fontWeight: 700,
  },

  // EVENT
  eventDateBox: {
    width: 44, height: 44,
    borderRadius: 10,
    background: `linear-gradient(135deg, ${C.verdeSuave}, #E0F0E5)`,
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  eventDay: {
    fontSize: 16, fontWeight: 800, color: C.verde,
    lineHeight: 1,
  },
  eventMonth: {
    fontSize: 9, fontWeight: 600, color: C.verde,
    textTransform: 'uppercase',
    marginTop: 1,
  },

  // REVIEW
  reviewCard: {
    background: C.card,
    border: `1px solid ${C.borde}`,
    borderRadius: 14,
    padding: 14,
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  reviewHeader: {
    display: 'flex', alignItems: 'center', gap: 10,
    marginBottom: 8,
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
  reviewInfo: {
    flex: 1, minWidth: 0,
  },
  reviewNameRow: {
    display: 'flex', alignItems: 'center', gap: 4,
  },
  reviewName: {
    fontSize: 13, fontWeight: 700, color: C.texto,
  },
  reviewCheck: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 14, height: 14,
    color: C.verde,
  },
  reviewDate: {
    fontSize: 11, color: C.textoSuave,
    marginTop: 1,
  },
  reviewStars: {
    display: 'flex', gap: 1,
    flexShrink: 0,
  },
  reviewBody: {
    fontSize: 13, color: C.texto,
    lineHeight: 1.5,
    whiteSpace: 'pre-wrap',
  },

  // EMPTY
  emptyBox: {
    padding: '40px 20px',
    textAlign: 'center',
    color: C.textoSuave,
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: 6,
  },
  emptyEmoji: { fontSize: 40, lineHeight: 1 },
  emptyTitle: {
    fontSize: 15, fontWeight: 700, color: C.texto,
  },
  emptyText: {
    fontSize: 13, color: C.textoSuave,
    lineHeight: 1.5, maxWidth: 280,
  },

  // TOAST
  toast: {
    position: 'fixed',
    bottom: 90, left: '50%',
    transform: 'translateX(-50%)',
    background: C.texto, color: '#fff',
    padding: '10px 16px',
    borderRadius: 12,
    fontSize: 13, fontWeight: 600,
    boxShadow: '0 6px 24px rgba(0,0,0,0.25)',
    zIndex: 50,
    animation: 'mpToastIn 0.2s ease-out',
    maxWidth: 'calc(100% - 32px)',
    textAlign: 'center',
  },

  // CONTENT (contenedor de secciones debajo del hero)
  content: {
    padding: '0 16px 16px',
  },

  // SKELETON shimmer (igual que SellerProfile)
  skelBlock: {
    background: `linear-gradient(90deg, ${C.bordeSuave} 0%, ${C.borde} 50%, ${C.bordeSuave} 100%)`,
    backgroundSize: '200% 100%',
    animation: 'mpShimmer 1.4s ease-in-out infinite',
  },
  skelCard: {
    background: `linear-gradient(90deg, ${C.bordeSuave} 0%, ${C.borde} 50%, ${C.bordeSuave} 100%)`,
    backgroundSize: '200% 100%',
    animation: 'mpShimmer 1.4s ease-in-out infinite',
    borderRadius: 18,
    height: 90,
    marginBottom: 16,
  },
}
