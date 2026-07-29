import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { C, T, distancia, iniciales, RUBROS } from '../lib/design'

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
@keyframes services-header-drift {
  from { background-position: 0 0; }
  to { background-position: 112px 68px; }
}
.services-spin {
  animation: services-spin 0.8s linear infinite;
}
@media (prefers-reduced-motion: reduce) {
  .services-feed-header { animation: none !important; }
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
const IcoBack = (p) => (
  <Ico {...p}><path d="m15 18-6-6 6-6" /></Ico>
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
const IcoInstagram = (p) => (
  <Ico {...p}><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r=".7" fill="currentColor" stroke="none" /></Ico>
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
const CATS = [{ key: 'Todos', emoji: '🛠️', label: 'Todos' }, ...RUBROS]

/* Emoji para el badge de cada card según la categoría del post. */
const CAT_EMOJI = Object.fromEntries(RUBROS.map(r => [r.key, r.emoji]))

/* ─── Helpers ─── */
const getDistanceLabel = (post) => {
  const m = post?.distance_meters
  if (m !== null && m !== undefined && m !== '' && !Number.isNaN(Number(m))) {
    const d = distancia(Number(m))
    if (d) return d
  }
  return null
}

const getRating = (post) => {
  const count = Number(post?.rating_count) || 0
  const rating = Number(post?.rating) || 0
  if (count <= 0 || rating <= 0) return null
  return { value: rating.toFixed(1), count }
}

const formatPrice = (post) => {
  if (post?.price === null || post?.price === undefined || post?.price === '') return null
  const p = Number(post?.price)
  if (!Number.isFinite(p) || p <= 0) return null
  return `$${p.toLocaleString('es-CL')}`
}

const isFeaturedActive = (svc) => {
  if (!(svc.is_featured === true || svc.is_promoted === true || svc.sponsored === true)) return false
  const starts = svc.featured_starts_at || svc.promoted_starts_at
  const until = svc.featured_until || svc.promoted_until
  const now = Date.now()
  return (!starts || new Date(starts).getTime() <= now) && (!until || new Date(until).getTime() > now)
}

/* ============================================================
   COMPONENTE
   ============================================================ */
export default function Services({ currentUser, onNavigate, onCrear }) {
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [category, setCategory] = useState('Todos')
  const [search, setSearch] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [expandedServiceId, setExpandedServiceId] = useState(null)
  const [featuredOrder, setFeaturedOrder] = useState([])
  const [featuredIndex, setFeaturedIndex] = useState(0)
  const featuredScrollRef = useRef(null)
  const featuredPausedRef = useRef(false)
  const featuredResumeRef = useRef(null)

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
        .select('*, author:profiles!author_id(full_name, avatar_url, reputation_score, badge_founder, badge_trusted_seller)')
        .eq('type', 'service')
        .eq('status', 'active')
      if (category !== 'Todos') q = q.eq('service_key', category)
      q = q.order('created_at', { ascending: false }).limit(40)
      const { data, error: e } = await q
      if (e) throw e
      const nextServices = data || []
      const order = nextServices.filter(isFeaturedActive).map(service => service.id)
      for (let index = order.length - 1; index > 0; index -= 1) {
        const randomIndex = Math.floor(Math.random() * (index + 1))
        ;[order[index], order[randomIndex]] = [order[randomIndex], order[index]]
      }
      setFeaturedOrder(order)
      setFeaturedIndex(0)
      setServices(nextServices)
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

  const featured = filtered.filter(isFeaturedActive).sort((first, second) => {
    const firstIndex = featuredOrder.indexOf(first.id)
    const secondIndex = featuredOrder.indexOf(second.id)
    return (firstIndex < 0 ? 999 : firstIndex) - (secondIndex < 0 ? 999 : secondIndex)
  })
  const regular = filtered.filter((svc) => !isFeaturedActive(svc))

  const scrollFeaturedTo = index => {
    const container = featuredScrollRef.current
    const card = container?.children?.[index]
    if (!container || !card) return
    container.scrollTo({ left: card.offsetLeft - 16, behavior: 'smooth' })
    setFeaturedIndex(index)
  }

  const pauseFeatured = () => {
    featuredPausedRef.current = true
    if (featuredResumeRef.current) window.clearTimeout(featuredResumeRef.current)
  }
  const resumeFeatured = () => {
    if (featuredResumeRef.current) window.clearTimeout(featuredResumeRef.current)
    featuredResumeRef.current = window.setTimeout(() => { featuredPausedRef.current = false }, 2800)
  }

  useEffect(() => {
    if (featured.length <= 1) return undefined
    const timer = window.setInterval(() => {
      if (featuredPausedRef.current) return
      setFeaturedIndex(current => {
        const next = (current + 1) % featured.length
        const container = featuredScrollRef.current
        const card = container?.children?.[next]
        if (container && card) container.scrollTo({ left: card.offsetLeft - 16, behavior: 'smooth' })
        return next
      })
    }, 4200)
    return () => { window.clearInterval(timer); if (featuredResumeRef.current) window.clearTimeout(featuredResumeRef.current) }
  }, [featured.length])

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
      <button style={s.emptyBtn} onClick={() => onCrear?.('service')}>
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
    const author = svc.author
    const name = author?.full_name || 'Vecino del barrio'
    const initials = iniciales(name)
    const rating = getRating(svc)
    const distLabel = getDistanceLabel(svc)
    const price = formatPrice(svc)
    const serviceKey = svc.service_key || svc.category
    const rubro = RUBROS.find(r => r.key === serviceKey)
    const catEmoji = CAT_EMOJI[serviceKey] || '🛠️'
    const desc = svc.description || svc.content || ''
    const verified = author?.badge_trusted_seller || author?.badge_founder
    const expanded = expandedServiceId === svc.id
    const phone = (svc.service_phone || '').trim()
    const whatsapp = (svc.service_whatsapp || '').replace(/\D/g, '')
    const instagram = (svc.service_instagram || '').trim().replace(/^@/, '')

    const openExternal = (event, url) => {
      event.stopPropagation()
      window.open(url, '_blank', 'noopener,noreferrer')
    }

    return (
      <div
        key={svc.id}
        className="services-card"
        style={s.card}
        onClick={() => setExpandedServiceId(current => current === svc.id ? null : svc.id)}
      >
        {/* Header: prestador + rubro */}
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
            <span style={s.categoryCompact}>{catEmoji} {rubro?.label || svc.category || 'Servicio'}</span>
          </div>
        </div>

        {/* Título */}
        <div style={s.cardTitle}>{svc.title || 'Servicio disponible'}</div>

        <div style={s.compactMeta}>
          <span>{rating ? <><IcoStar size={11} /><strong>{rating.value}</strong> ({rating.count})</> : 'Nuevo'}</span>
          {distLabel && <span><IcoPin size={11} /> {distLabel}</span>}
          {price && <strong style={s.compactPrice}>Desde {price}</strong>}
          <span style={{ ...s.expandChevron, transform: expanded ? 'rotate(90deg)' : 'none' }}><IcoChevronRight size={16} /></span>
        </div>

        <div style={{ ...s.cardExpansion, ...(expanded ? s.cardExpansionOpen : {}) }}>
          <div style={s.cardExpansionInner}>
            {desc && <p style={s.expandedDesc}>{desc}</p>}
            <div style={s.contactActions}>
              {phone && <button type="button" style={s.contactAction} onClick={event => openExternal(event, `tel:${phone}`)}>📞 Llamar</button>}
              {whatsapp && <button type="button" style={s.contactAction} onClick={event => openExternal(event, `https://wa.me/${whatsapp}`)}>💬 WhatsApp</button>}
              {instagram && <button type="button" style={s.contactAction} onClick={event => openExternal(event, `https://instagram.com/${instagram}`)}><IcoInstagram size={15} /> Instagram</button>}
              <button type="button" style={s.detailAction} onClick={event => { event.stopPropagation(); nav('servicedetail', { postId: svc.id }) }}>Ver ficha completa</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderFeaturedCard = (svc) => {
    const author = svc.author
    const serviceKey = svc.service_key || svc.category
    const rubro = RUBROS.find(r => r.key === serviceKey)
    const price = formatPrice(svc)
    const rating = getRating(svc)
    const image = Array.isArray(svc.images) ? svc.images.find(Boolean) : null
    return (
      <button key={svc.id} style={s.featuredCard} onClick={() => nav('servicedetail', { postId: svc.id })}>
        <div style={s.featuredVisual}>
          {image ? <img src={image} alt="" style={s.featuredImage} /> : <span style={s.featuredImageFallback}>{rubro?.emoji || '🛠️'}</span>}
          <span style={s.sponsoredLabel}>✦ DESTACADO</span>
        </div>
        <div style={s.featuredBody}>
          <span style={s.featuredCategory}>{rubro?.emoji || '🛠️'} {rubro?.label || svc.category || 'Servicio'}</span>
          <strong style={s.featuredTitle}>{svc.title || 'Servicio disponible'}</strong>
          <div style={s.featuredProviderRow}>
            {author?.avatar_url ? <img src={author.avatar_url} alt="" style={s.featuredAvatar} /> : <span style={s.featuredAvatarFallback}>{iniciales(author?.full_name)}</span>}
            <span style={s.featuredProvider}>{author?.full_name || 'Prestador del barrio'}</span>
          </div>
          <div style={s.featuredMeta}>
            <span style={s.featuredRating}>{rating ? <><IcoStar size={12} /><strong>{rating.value}</strong><small>({rating.count})</small></> : <strong>Nuevo</strong>}</span>
            <span style={s.featuredBottom}>{price ? `Desde ${price}` : 'Consultar'} <IcoChevronRight size={13} /></span>
          </div>
        </div>
      </button>
    )
  }

  return (
    <div style={s.wrap}>
      <style dangerouslySetInnerHTML={{ __html: SVC_CSS }} />

      {/* ── HEADER FIJO ── */}
      <div style={s.header}>
        <div className="services-feed-header" style={s.headerTopSection}>
          <button type="button" style={s.headerBackBtn} onClick={() => nav('back')} aria-label="Volver">
            <IcoBack size={22} />
          </button>
          <strong style={s.headerTit}>
            Servicios de <span style={s.headerBrand}>el barrio</span>
          </strong>
          <button style={s.searchToggle} onClick={() => { setSearchOpen(v => !v); if (searchOpen) setSearch('') }} aria-label="Buscar servicios">
            <IcoSearch size={18} />
          </button>
        </div>

        {/* Buscador */}
        {searchOpen && <div style={s.searchWrap}>
          <div style={s.searchIcon}><IcoSearch size={18} /></div>
          <input
            style={s.searchInput}
            placeholder="Buscar plomería, clases, peluquería..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>}

        <button style={s.offerBanner} onClick={() => onCrear?.('service')}>
          <span style={s.offerIcon}>🧰</span>
          <span style={s.offerText}><strong>¿Ofreces un servicio?</strong><small>Hazte visible en el barrio.<br />¡Es gratis!</small></span>
          <span style={s.offerAction}>Publícate →</span>
        </button>

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
                <span>{cat.label || cat.key}</span>
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
          {!loading && !error && featured.length > 0 && (
            <section style={s.featuredSection}>
              <div style={s.sectionHeading}>
                <div style={s.sectionHeadingCopy}>
                  <strong>Destacados cerca de ti</strong>
                  <small>Promociones pagadas</small>
                </div>
              </div>
              <div ref={featuredScrollRef} style={s.featuredScroll} onTouchStart={pauseFeatured} onTouchEnd={resumeFeatured} onMouseEnter={pauseFeatured} onMouseLeave={resumeFeatured}>{featured.map(renderFeaturedCard)}</div>
              {featured.length > 1 && <div style={s.featuredDots}>{featured.map((service, index) => <button key={service.id} type="button" aria-label={`Ver destacado ${index + 1}`} style={{ ...s.featuredDot, ...(index === featuredIndex ? s.featuredDotActive : {}) }} onClick={() => scrollFeaturedTo(index)} />)}</div>}
            </section>
          )}

          {!loading && !error && featured.length === 0 && category === 'Todos' && !search && (
            <div style={s.monetizationCard}>
              <span style={s.monetizationStar}>✦</span>
              <span style={s.monetizationCopy}>
                <strong>Destaca tu servicio</strong>
                <small>Más visibilidad entre vecinos de tu barrio.</small>
              </span>
              <span style={s.comingSoon}>Próximamente</span>
            </div>
          )}

          {!loading && !error && regular.length > 0 && (
            <div style={s.regularHeading}>Servicios del barrio</div>
          )}

          {loading ? (
            renderSkeletons()
          ) : error ? (
            renderError()
          ) : filtered.length === 0 ? (
            renderEmpty()
          ) : (
            <div style={s.list}>
              {regular.map(renderCard)}
            </div>
          )}
        </div>
      </div>

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
    padding: '0 16px 10px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
  },
  headerTopSection: {
    minHeight: 72,
    padding: 'calc(env(safe-area-inset-top, 0px) + 22px) 58px 16px',
    backgroundColor: C.card,
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='72' height='64' viewBox='0 0 72 64'%3E%3Cg fill='none' stroke='%2316a34a' stroke-opacity='.22' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M46 9a14 14 0 0 0-18 18L10 45l10 10 18-18A14 14 0 0 0 56 19L46 29 36 19 46 9Z'/%3E%3C/g%3E%3C/svg%3E")`,
    backgroundSize: '72px 64px',
    backgroundPosition: 'calc(50% - 86px) center',
    backgroundRepeat: 'no-repeat',
    borderBottom: `2px solid ${C.verde}`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    position: 'relative', boxSizing: 'border-box', margin: '0 -16px',
  },
  headerBackBtn: {
    position: 'absolute', left: 16, bottom: 10,
    width: 38, height: 38, padding: 0, border: `1px solid ${C.borde}`,
    borderRadius: '50%', background: 'rgba(255,255,255,0.88)',
    color: C.verdeOsc, display: 'grid', placeItems: 'center', cursor: 'pointer',
  },
  headerTit: {
    minWidth: 0, textAlign: 'center', fontSize: 16, fontWeight: 600,
    color: '#26302b', lineHeight: 1.2, whiteSpace: 'nowrap',
    overflow: 'hidden', textOverflow: 'ellipsis', padding: '5px 10px',
    background: 'transparent', border: 'none', boxShadow: 'none',
  },
  headerBrand: { color: C.verde, fontWeight: 700 },
  searchToggle: {
    position: 'absolute', right: 16, bottom: 11,
    width: 36, height: 36, borderRadius: '50%',
    border: `1px solid ${C.borde}`, background: 'rgba(255,255,255,0.88)',
    color: C.verdeOsc, display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 0, cursor: 'pointer', flexShrink: 0,
  },

  /* ── BUSCADOR ── */
  searchWrap: {
    position: 'relative',
    marginTop: 10,
    marginBottom: 8,
  },
  offerBanner: {
    width: '100%', marginTop: 20, marginBottom: 10, padding: '10px 11px',
    border: 'none', borderRadius: 13,
    background: 'linear-gradient(120deg, #18ad57 0%, #08743b 100%)',
    color: '#fff', display: 'flex', alignItems: 'center', gap: 10,
    cursor: 'pointer', fontFamily: T.font, textAlign: 'left',
    boxShadow: '0 5px 14px rgba(12,126,64,0.18)',
  },
  offerIcon: {
    width: 'auto', height: 'auto', flexShrink: 0,
    border: 'none', background: 'transparent',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
  },
  offerText: {
    flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1,
    fontSize: 12.5,
  },
  offerAction: {
    flexShrink: 0, fontSize: 12, fontWeight: 700,
    padding: '7px 9px', borderRadius: 999, background: 'rgba(255,255,255,0.15)',
    border: '1px solid rgba(255,255,255,0.24)',
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
    gap: 6,
    overflowX: 'auto',
    padding: '2px 22px 5px 0',
    scrollbarWidth: 'none',
    WebkitOverflowScrolling: 'touch',
    msOverflowStyle: 'none',
    WebkitMaskImage: 'linear-gradient(90deg, #000 0%, #000 91%, transparent 100%)',
    maskImage: 'linear-gradient(90deg, #000 0%, #000 91%, transparent 100%)',
  },
  catChip: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '6px 10px',
    borderRadius: 24,
    fontSize: 11.5,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    whiteSpace: 'nowrap',
    flexShrink: 0,
    boxSizing: 'border-box',
  },
  catChipEmoji: { fontSize: 12.5, lineHeight: 1 },

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
  featuredSection: { paddingTop: 14, margin: '0 -16px' },
  sectionHeading: {
    padding: '0 16px 9px', color: C.texto,
  },
  sectionHeadingCopy: {
    display: 'flex', flexDirection: 'column', gap: 2, fontSize: 15,
  },
  featuredScroll: {
    display: 'flex', gap: 10, overflowX: 'auto', padding: '0 16px 4px',
    scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch', scrollSnapType: 'x mandatory', scrollBehavior: 'smooth',
  },
  featuredCard: {
    width: 220, minWidth: 220, padding: 0, overflow: 'hidden', borderRadius: 16,
    border: `1px solid ${C.borde}`, background: C.card,
    boxShadow: '0 4px 14px rgba(146,105,22,0.10)', textAlign: 'left',
    cursor: 'pointer', fontFamily: T.font, color: C.texto,
    scrollSnapAlign: 'start',
  },
  featuredDots: { display: 'flex', justifyContent: 'center', gap: 5, paddingTop: 8 },
  featuredDot: { width: 6, height: 6, padding: 0, border: 0, borderRadius: '50%', background: '#cbd8cf' },
  featuredDotActive: { width: 18, borderRadius: 999, background: C.verde },
  featuredVisual: { height: 112, position: 'relative', overflow: 'hidden', background: 'linear-gradient(145deg, #e8f7ed, #f7fbf8)' },
  featuredImage: { width: '100%', height: '100%', display: 'block', objectFit: 'cover' },
  featuredImageFallback: { width: '100%', height: '100%', display: 'grid', placeItems: 'center', fontSize: 42 },
  sponsoredLabel: {
    position: 'absolute', top: 9, right: 9, padding: '5px 8px', borderRadius: 999,
    fontSize: 8, fontWeight: 800, letterSpacing: '0.55px', color: '#fff', background: C.verde,
    boxShadow: '0 2px 8px rgba(5,101,49,.25)',
  },
  featuredBody: { padding: 11 },
  featuredCategory: { display: 'block', marginBottom: 5, color: C.verdeOsc, fontSize: 9.5, fontWeight: 700 },
  featuredAvatar: { width: 24, height: 24, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 },
  featuredAvatarFallback: {
    width: 24, height: 24, borderRadius: '50%', background: C.verde, color: '#fff', flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700,
  },
  featuredTitle: { display: 'block', minHeight: 35, fontSize: 14, lineHeight: 1.25, marginBottom: 8 },
  featuredProviderRow: { display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 },
  featuredProvider: { minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 10.5, color: C.textoSuave },
  featuredMeta: { paddingTop: 8, borderTop: `1px solid ${C.bordeSuave}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 7 },
  featuredRating: { display: 'flex', alignItems: 'center', gap: 3, color: C.textoSuave, fontSize: 9.5 },
  featuredBottom: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    gap: 3, color: C.verde, fontSize: 10.5, fontWeight: 700,
  },
  monetizationCard: {
    marginTop: 14, padding: '11px 12px', borderRadius: 14,
    border: '1px dashed #d7bb73', background: '#fffdf6',
    display: 'flex', alignItems: 'center', gap: 9,
  },
  monetizationStar: {
    width: 30, height: 30, borderRadius: '50%', background: '#fef3c7', color: '#b7791f',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  monetizationCopy: {
    flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1,
    fontSize: 12.5, color: C.texto,
  },
  comingSoon: {
    padding: '5px 7px', borderRadius: 999, background: '#fef3c7', color: '#8a6014',
    fontSize: 9.5, fontWeight: 600, flexShrink: 0,
  },
  regularHeading: { paddingTop: 16, fontSize: 15, fontWeight: 600, color: C.texto },

  /* ── CARD ── */
  card: {
    background: C.card,
    borderRadius: 18,
    padding: 12,
    border: `1px solid ${C.borde}`,
    boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
    cursor: 'pointer',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 7,
  },
  authorBlock: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: '50%',
    objectFit: 'cover',
    flexShrink: 0,
  },
  avatarFallback: {
    width: 34,
    height: 34,
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
  newRating: {
    padding: '4px 7px', borderRadius: 999, color: C.verdeOsc,
    background: C.verdeBg, fontSize: 10, fontWeight: 700,
  },
  categoryCompact: { maxWidth: 118, padding: '4px 7px', overflow: 'hidden', borderRadius: 999, color: C.verdeOsc, background: C.verdeBg, fontSize: 10, fontWeight: 700, textOverflow: 'ellipsis', whiteSpace: 'nowrap' },

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
    fontSize: 15,
    fontWeight: 700,
    color: C.texto,
    lineHeight: 1.3,
    marginBottom: 5,
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
  compactMeta: { minHeight: 18, display: 'flex', alignItems: 'center', gap: 9, color: C.textoTenue, fontSize: 10.5 },
  compactPrice: { marginLeft: 'auto', color: C.verde, fontSize: 11.5 },
  expandChevron: { display: 'grid', placeItems: 'center', color: C.verdeOsc, transition: 'transform .22s ease' },
  cardExpansion: { display: 'grid', gridTemplateRows: '0fr', opacity: 0, transition: 'grid-template-rows .28s ease, opacity .2s ease' },
  cardExpansionOpen: { gridTemplateRows: '1fr', opacity: 1 },
  cardExpansionInner: { minHeight: 0, overflow: 'hidden' },
  expandedDesc: { margin: '11px 0 0', paddingTop: 10, borderTop: `1px solid ${C.bordeSuave}`, color: C.textoSuave, fontSize: 12, lineHeight: 1.5 },
  contactActions: { marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' },
  contactAction: { minHeight: 32, padding: '0 9px', display: 'inline-flex', alignItems: 'center', gap: 5, border: `1px solid ${C.borde}`, borderRadius: 9, color: C.texto, background: '#fff', fontSize: 10.5, fontWeight: 700 },
  detailAction: { minHeight: 32, padding: '0 10px', border: 0, borderRadius: 9, color: '#fff', background: C.verde, fontSize: 10.5, fontWeight: 800 },

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
