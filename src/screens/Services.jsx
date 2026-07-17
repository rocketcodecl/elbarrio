import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { C, T, distancia, iniciales } from '../lib/design'

/* ============================================================
   Services.jsx — Tab "servicios" de El Barrio.

   Recibe props: { currentUser, onNavigate }.
   Lista posts de Supabase con type='service' y status='active'.
   Filtro por categoria (chips horizontales) + buscador por texto.
   FAB para publicar un servicio nuevo.
   ============================================================ */

/* CSS mínimo inyectado una sola vez para hover de cards y spin del refresh. */
const SVC_CSS = `
.services-card {
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.services-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 18px rgba(0,0,0,0.08);
}
@keyframes services-spin {
  to { transform: rotate(360deg); }
}
.services-spin {
  animation: services-spin 0.8s linear infinite;
}
`

/* ─── ICONOS SVG INLINE (sin lucide ni ninguna lib) ─── */
const Ico = ({ size = 18, children, stroke = 1.9, fill = 'none' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill}
    stroke="currentColor" strokeWidth={stroke}
    strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
)

const IcoSearch = (p) => (
  <Ico {...p}><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></Ico>
)
const IcoFilter = (p) => (
  <Ico {...p}><line x1="4" y1="6" x2="20" y2="6" /><line x1="7" y1="12" x2="17" y2="12" /><line x1="10" y1="18" x2="14" y2="18" /></Ico>
)
const IcoHome = (p) => (
  <Ico {...p}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></Ico>
)
const IcoWrench = (p) => (
  <Ico {...p}><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.3 2.3-2.4-2.4z" /></Ico>
)
const IcoBook = (p) => (
  <Ico {...p}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></Ico>
)
const IcoHeart = (p) => (
  <Ico {...p}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></Ico>
)
const IcoPlus = (p) => (
  <Ico {...p} stroke={2.4}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></Ico>
)
const IcoRefresh = (p) => (
  <Ico {...p}><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></Ico>
)
const IcoPin = (p) => (
  <Ico {...p}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></Ico>
)
const IcoAlert = (p) => (
  <Ico {...p}><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></Ico>
)
const IcoChevronRight = (p) => (
  <Ico {...p}><polyline points="9 18 15 12 9 6" /></Ico>
)
const IcoVerified = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={C.verde}
    stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="8 12 11 15 16 9" stroke="#fff" fill="none" />
  </svg>
)
const IcoStar = ({ size = 12, color = '#f59e0b' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke={color} strokeWidth="1">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
)

/* ─── CATEGORÍAS (chips horizontales scrollables) ─── */
const CATS = [
  { key: 'Todos',      emoji: '🛠️' },
  { key: 'Hogar',      emoji: '🏠' },
  { key: 'Clases',     emoji: '📚' },
  { key: 'Salud',      emoji: '🩺' },
  { key: 'Tecnología', emoji: '📱' },
  { key: 'Transporte', emoji: '🚚' },
  { key: 'Otros',      emoji: '✨' },
]

/* Emoji para el badge de cada card según la categoría del post. */
const CAT_EMOJI = {
  'Hogar': '🏠',
  'Clases': '📚',
  'Salud': '🩺',
  'Tecnología': '📱',
  'Transporte': '🚚',
  'Otros': '✨',
}

/* ─── Helpers ─── */
// Seed determinista por id (para que los mocks no cambien entre renders).
const seedOf = (s) =>
  String(s || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0)

// Distancia: si el post tiene distance_meters usamos distancia() de design.js.
// Si no, mock determinista por id: "A X cuadras".
const getDistanceLabel = (post) => {
  const m = post?.distance_meters
  if (m !== null && m !== undefined && m !== '' && !Number.isNaN(Number(m))) {
    const d = distancia(Number(m))
    if (d) return d
  }
  const cuadras = (seedOf(post?.id) % 18) + 2 // 2..19 cuadras
  return `A ${cuadras} cuadras`
}

// Rating: si el post trae rating, lo usamos. Si no, mock determinista.
const getRating = (post) => {
  const r = post?.rating
  if (r !== null && r !== undefined && r !== '' && !Number.isNaN(Number(r))) {
    const count = Number(post?.rating_count) || 0
    return { value: Number(r).toFixed(1), count }
  }
  const seed = seedOf(post?.id)
  const value = (4.5 + (seed % 5) * 0.1).toFixed(1) // 4.5..4.9
  const count = (seed % 28) + 3 // 3..30
  return { value, count }
}

const formatPrice = (post) => {
  const p = Number(post?.price)
  if (!p && p !== 0) return null
  return `$${p.toLocaleString('es-CL')}`
}

/* ============================================================
   COMPONENTE
   ============================================================ */
export default function Services({ currentUser, onNavigate }) {
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [category, setCategory] = useState('Todos')
  const [search, setSearch] = useState('')

  // Pull-to-refresh
  const scrollRef = useRef(null)
  const touchStartY = useRef(0)
  const pulling = useRef(false)
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  const nav = onNavigate || (() => {})

  const fetchServices = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      let q = supabase
        .from('posts')
        .select('*, profiles!posts_user_id_fkey(*)')
        .eq('type', 'service')
        .eq('status', 'active')
      if (category !== 'Todos') q = q.eq('category', category)
      q = q.order('created_at', { ascending: false }).limit(40)
      const { data, error: e } = await q
      if (e) throw e
      setServices(data || [])
    } catch (err) {
      console.error('Services fetch error:', err)
      setError(err?.message || 'No pudimos cargar los servicios.')
    } finally {
      setLoading(false)
    }
  }, [category])

  useEffect(() => {
    fetchServices()
  }, [fetchServices])

  // Búsqueda en cliente sobre title + description (instantáneo).
  const filtered = services.filter((svc) => {
    if (!search.trim()) return true
    const q = search.trim().toLowerCase()
    const t = (svc.title || '').toLowerCase()
    const d = (svc.description || svc.content || '').toLowerCase()
    return t.includes(q) || d.includes(q)
  })

  /* ── Pull-to-refresh visual ── */
  const onTouchStart = (e) => {
    if (scrollRef.current && scrollRef.current.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY
      pulling.current = true
    } else {
      touchStartY.current = 0
      pulling.current = false
    }
  }

  const onTouchMove = (e) => {
    if (!pulling.current || refreshing) return
    const dy = e.touches[0].clientY - touchStartY.current
    if (dy > 0) {
      // resistencia: el pull avanza a la mitad del movimiento real
      setPull(Math.min(dy * 0.5, 80))
    }
  }

  const onTouchEnd = async () => {
    if (!pulling.current) return
    pulling.current = false
    if (pull > 55) {
      setRefreshing(true)
      setPull(0)
      await fetchServices()
      setRefreshing(false)
    } else {
      setPull(0)
    }
    touchStartY.current = 0
  }

  /* ── Estados de render ── */
  const renderEmpty = () => (
    <div style={s.emptyWrap}>
      <svg width="120" height="120" viewBox="0 0 120 120" style={s.emptySvg}>
        <circle cx="60" cy="60" r="56" fill={C.verdeBg} stroke={C.verdeSuave} strokeWidth="2" />
        {/* Caja de herramientas */}
        <rect x="34" y="58" width="52" height="32" rx="6" fill={C.verde} />
        {/* Asa */}
        <path d="M50 58v-6a10 10 0 0 1 20 0v6" fill="none" stroke={C.verde} strokeWidth="3" strokeLinecap="round" />
        {/* Cierre */}
        <rect x="56" y="68" width="8" height="4" rx="1" fill="#fff" />
        {/* Destellos */}
        <g fill={C.verde}>
          <circle cx="28" cy="38" r="2" />
          <circle cx="92" cy="40" r="2" />
          <circle cx="96" cy="80" r="2" />
          <circle cx="24" cy="84" r="2" />
        </g>
      </svg>
      <div style={s.emptyTitle}>Todavía no hay servicios en tu barrio</div>
      <div style={s.emptySub}>¡Publicá el primero y ayudá a tus vecinos!</div>
      <button style={s.emptyBtn} onClick={() => nav('createpost', { type: 'service' })}>
        <IcoPlus size={16} /> <span>Publicar servicio</span>
      </button>
    </div>
  )

  const renderError = () => (
    <div style={s.errorBox}>
      <IcoAlert size={28} />
      <div style={s.errorTitle}>No pudimos cargar los servicios</div>
      <div style={s.errorText}>{error}</div>
      <button style={s.errorBtn} onClick={fetchServices}>
        <IcoRefresh size={16} /> <span>Reintentar</span>
      </button>
    </div>
  )

  const renderSkeletons = () => (
    <div style={s.list}>
      {[1, 2, 3].map((i) => (
        <div key={i} style={s.skeletonCard}>
          <div style={s.skelHeader}>
            <div style={s.skelAvatar} />
            <div style={{ flex: 1 }}>
              <div style={s.skelLineW} />
              <div style={{ ...s.skelLineS, marginTop: 6 }} />
            </div>
          </div>
          <div style={{ ...s.skelLineW, height: 18, marginTop: 14, width: '70%' }} />
          <div style={{ ...s.skelLineS, marginTop: 8, width: '85%' }} />
          <div style={{ ...s.skelLineS, marginTop: 6, width: '60%' }} />
        </div>
      ))}
    </div>
  )

  const renderCard = (svc) => {
    const author = svc.profiles || svc.profile
    const name = author?.full_name || 'Vecino del barrio'
    const initials = iniciales(name)
    const rating = getRating(svc)
    const distLabel = getDistanceLabel(svc)
    const price = formatPrice(svc)
    const catEmoji = CAT_EMOJI[svc.category] || '✨'
    const desc = svc.description || svc.content || ''
    const verified = author?.badge_trusted_seller || author?.badge_founder

    return (
      <div
        key={svc.id}
        className="services-card"
        style={s.card}
        onClick={() => nav('productdetail', { postId: svc.id })}
      >
        {/* Header: avatar + nombre + rating */}
        <div style={s.cardHeader}>
          <div style={s.authorBlock}>
            {author?.avatar_url ? (
              <img src={author.avatar_url} alt="" style={s.avatar} />
            ) : (
              <div style={s.avatarFallback}>{initials}</div>
            )}
            <div style={s.authorInfo}>
              <div style={s.authorNameRow}>
                <span style={s.authorName}>{name.split(' ')[0]}</span>
                {verified ? <IcoVerified /> : null}
              </div>
              <div style={s.authorMeta}>Vecino del barrio</div>
            </div>
          </div>
          <div style={s.ratingBlock}>
            <IcoStar size={12} />
            <span style={s.ratingText}>{rating.value}</span>
            <span style={s.ratingCount}>({rating.count})</span>
          </div>
        </div>

        {/* Tags: categoría + distancia */}
        <div style={s.tagsRow}>
          <span style={s.catBadge}>
            <span style={s.catEmoji}>{catEmoji}</span>
            <span>{svc.category || 'Otros'}</span>
          </span>
          <span style={s.distTag}>
            <IcoPin size={11} />
            <span>{distLabel}</span>
          </span>
        </div>

        {/* Título */}
        <div style={s.cardTitle}>{svc.title || 'Servicio disponible'}</div>

        {/* Descripción (2 líneas máx) */}
        {desc && <div style={s.cardDesc}>{desc}</div>}

        {/* Footer: precio */}
        {price && (
          <div style={s.cardFooter}>
            <span style={s.priceLabel}>Desde</span>
            <span style={s.priceValue}>{price}</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={s.wrap}>
      <style dangerouslySetInnerHTML={{ __html: SVC_CSS }} />

      {/* ── HEADER FIJO ── */}
      <div style={s.header}>
        <div style={s.headerTit}>Servicios</div>
        <div style={s.headerSub}>Lo que tus vecinos saben hacer</div>

        {/* Buscador */}
        <div style={s.searchWrap}>
          <div style={s.searchIcon}><IcoSearch size={18} /></div>
          <input
            style={s.searchInput}
            placeholder="Buscar plomería, clases, peluquería..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Chips de categoría */}
        <div style={s.catsScroll}>
          {CATS.map((cat) => {
            const active = category === cat.key
            return (
              <button
                key={cat.key}
                style={{
                  ...s.catChip,
                  background: active ? C.verde : C.card,
                  color: active ? '#fff' : C.textoSuave,
                  border: `1px solid ${active ? 'transparent' : C.borde}`,
                }}
                onClick={() => setCategory(cat.key)}
              >
                <span style={s.catChipEmoji}>{cat.emoji}</span>
                <span>{cat.key}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── ÁREA DE SCROLL ── */}
      <div
        ref={scrollRef}
        style={s.scrollArea}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Indicador de pull-to-refresh */}
        <div
          style={{
            ...s.pullIndicator,
            height: refreshing ? 40 : pull,
            opacity: pull > 10 || refreshing ? 1 : 0,
          }}
        >
          <div className={refreshing ? 'services-spin' : ''} style={{ display: 'flex' }}>
            <IcoRefresh size={20} />
          </div>
          <span style={s.pullText}>
            {refreshing ? 'Refrescando...' : pull > 55 ? 'Soltá para refrescar' : 'Deslizá para refrescar'}
          </span>
        </div>

        <div
          style={{
            transform: `translateY(${pull}px)`,
            transition: pulling.current ? 'none' : 'transform 0.2s ease-out',
            padding: '0 16px 100px',
          }}
        >
          {loading ? (
            renderSkeletons()
          ) : error ? (
            renderError()
          ) : filtered.length === 0 ? (
            renderEmpty()
          ) : (
            <div style={s.list}>
              {filtered.map(renderCard)}
            </div>
          )}
        </div>
      </div>

      {/* ── FAB ── */}
      <button
        style={s.fab}
        onClick={() => nav('createpost', { type: 'service' })}
      >
        <IcoPlus size={20} />
        <span style={s.fabText}>Publicar servicio</span>
      </button>
    </div>
  )
}

/* ============================================================
   ESTILOS (mismo patrón que Verification.jsx / Marketplace.jsx)
   ============================================================ */
const s = {
  wrap: {
    width: '100%',
    height: '100%',
    background: C.fondo,
    fontFamily: T.font,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    position: 'relative',
    boxSizing: 'border-box',
  },

  /* ── HEADER ── */
  header: {
    flexShrink: 0,
    background: C.card,
    padding: '28px 16px 12px',
    borderBottom: `1px solid ${C.borde}`,
    boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
  },
  headerTit: {
    fontSize: 26,
    fontWeight: 800,
    color: C.verdeOsc,
    letterSpacing: '-0.5px',
    lineHeight: 1.1,
  },
  headerSub: {
    fontSize: 14,
    color: C.textoSuave,
    marginTop: 4,
    marginBottom: 14,
    fontWeight: 500,
  },

  /* ── BUSCADOR ── */
  searchWrap: {
    position: 'relative',
    marginBottom: 12,
  },
  searchIcon: {
    position: 'absolute',
    left: 14,
    top: '50%',
    transform: 'translateY(-50%)',
    display: 'flex',
    alignItems: 'center',
    color: C.textoTenue,
  },
  searchInput: {
    width: '100%',
    padding: '13px 16px 13px 42px',
    borderRadius: 14,
    border: `1.5px solid ${C.borde}`,
    fontSize: 14.5,
    background: C.fondo,
    color: C.texto,
    outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },

  /* ── CHIPS DE CATEGORÍA ── */
  catsScroll: {
    display: 'flex',
    gap: 8,
    overflowX: 'auto',
    padding: '2px 0 4px',
    scrollbarWidth: 'none',
    WebkitOverflowScrolling: 'touch',
    msOverflowStyle: 'none',
  },
  catChip: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    padding: '8px 14px',
    borderRadius: 24,
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
    whiteSpace: 'nowrap',
    flexShrink: 0,
    boxSizing: 'border-box',
  },
  catChipEmoji: { fontSize: 14, lineHeight: 1 },

  /* ── ÁREA DE SCROLL ── */
  scrollArea: {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
    WebkitOverflowScrolling: 'touch',
    position: 'relative',
  },

  /* ── PULL-TO-REFRESH ── */
  pullIndicator: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    color: C.verde,
    overflow: 'hidden',
    transition: 'height 0.2s ease, opacity 0.2s ease',
  },
  pullText: {
    fontSize: 11.5,
    color: C.textoSuave,
    fontWeight: 600,
  },

  /* ── LISTA ── */
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    paddingTop: 12,
  },

  /* ── CARD ── */
  card: {
    background: C.card,
    borderRadius: 18,
    padding: 14,
    border: `1px solid ${C.borde}`,
    boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
    cursor: 'pointer',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
  },
  authorBlock: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: '50%',
    objectFit: 'cover',
    flexShrink: 0,
  },
  avatarFallback: {
    width: 38,
    height: 38,
    borderRadius: '50%',
    background: C.verde,
    color: '#fff',
    fontSize: 13,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  authorInfo: {
    flex: 1,
    minWidth: 0,
  },
  authorNameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  authorName: {
    fontSize: 14,
    fontWeight: 700,
    color: C.texto,
  },
  authorMeta: {
    fontSize: 11.5,
    color: C.textoTenue,
    marginTop: 2,
  },

  ratingBlock: {
    display: 'flex',
    alignItems: 'center',
    gap: 3,
    flexShrink: 0,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: 700,
    color: C.texto,
  },
  ratingCount: {
    fontSize: 11,
    color: C.textoTenue,
    fontWeight: 500,
  },

  /* ── TAGS (categoría + distancia) ── */
  tagsRow: {
    display: 'flex',
    gap: 8,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  catBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    padding: '5px 10px',
    borderRadius: 8,
    background: C.verdeSuave,
    color: C.verdeOsc,
    fontSize: 12,
    fontWeight: 700,
  },
  catEmoji: { fontSize: 13, lineHeight: 1 },
  distTag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '5px 10px',
    borderRadius: 8,
    background: C.fondo,
    color: C.textoSuave,
    fontSize: 12,
    fontWeight: 600,
  },

  /* ── TÍTULO Y DESCRIPCIÓN ── */
  cardTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: C.texto,
    lineHeight: 1.3,
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 13.5,
    color: C.textoSuave,
    lineHeight: 1.45,
    overflow: 'hidden',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    textOverflow: 'ellipsis',
  },

  /* ── FOOTER DE CARD ── */
  cardFooter: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 12,
    paddingTop: 10,
    borderTop: `1px solid ${C.bordeSuave}`,
  },
  priceLabel: {
    fontSize: 11.5,
    color: C.textoTenue,
    fontWeight: 600,
  },
  priceValue: {
    fontSize: 17,
    fontWeight: 800,
    color: C.verde,
  },

  /* ── SKELETON ── */
  skeletonCard: {
    background: C.card,
    borderRadius: 18,
    padding: 14,
    border: `1px solid ${C.borde}`,
  },
  skelHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  skelAvatar: {
    width: 38,
    height: 38,
    borderRadius: '50%',
    background: C.borde,
  },
  skelLineW: {
    height: 12,
    width: '50%',
    background: C.borde,
    borderRadius: 6,
  },
  skelLineS: {
    height: 10,
    width: '30%',
    background: C.bordeSuave,
    borderRadius: 6,
  },

  /* ── EMPTY ── */
  emptyWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    padding: '40px 24px',
    gap: 4,
  },
  emptySvg: { marginBottom: 8 },
  emptyTitle: {
    fontSize: 17,
    fontWeight: 700,
    color: C.texto,
  },
  emptySub: {
    fontSize: 13.5,
    color: C.textoSuave,
    marginBottom: 16,
    maxWidth: 260,
    lineHeight: 1.45,
  },
  emptyBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '12px 20px',
    background: C.verde,
    color: '#fff',
    border: 'none',
    borderRadius: 12,
    fontSize: 14.5,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
    boxShadow: '0 4px 14px rgba(22,163,74,0.3)',
  },

  /* ── ERROR ── */
  errorBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    padding: '40px 24px',
    gap: 8,
    color: C.rojo,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: C.texto,
    marginTop: 4,
  },
  errorText: {
    fontSize: 13,
    color: C.textoSuave,
    marginBottom: 12,
    lineHeight: 1.45,
    maxWidth: 280,
  },
  errorBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '10px 18px',
    background: C.verde,
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },

  /* ── FAB ── */
  fab: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '14px 20px',
    background: C.verde,
    color: '#fff',
    border: 'none',
    borderRadius: 30,
    fontSize: 14.5,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
    boxShadow: '0 6px 20px rgba(22,163,74,0.4)',
    zIndex: 20,
  },
  fabText: { whiteSpace: 'nowrap' },
}
