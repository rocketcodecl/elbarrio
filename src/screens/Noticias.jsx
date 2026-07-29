import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { C, T, iniciales, hace } from '../lib/design'

/* ============================================================
   Noticias.jsx — Pantalla "Noticias del barrio".

   Recibe props: { currentUser, onNavigate }.
   Lista posts de Supabase con type='news' y status='active'.
   Filtros horizontales (Todas / Oficiales / Asambleas / Obras /
   Servicios / Seguridad) + feed vertical de cards con imagen,
   título, extracto, autor + timestamp, badges de categoría y
   badge OFICIAL dorado cuando la publicación fue marcada como
   comunicación oficial. La tarjeta expande su contenido en el feed.
   ============================================================ */

/* CSS mínimo inyectado una sola vez: fade-in al montar cards,
   hover translateY(-2px), spin del refresh, pulso dorado del
   badge OFICIAL. */
const NEWS_CSS = `
@keyframes noticiasFadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
.noticias-card {
  animation: noticiasFadeIn 0.32s ease-out both;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.noticias-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 18px rgba(0,0,0,0.08);
}
@keyframes noticiasSpin {
  to { transform: rotate(360deg); }
}
.noticias-spin {
  animation: noticiasSpin 0.8s linear infinite;
}
@keyframes noticiasPulseDorado {
  0%, 100% { box-shadow: 0 0 0 0 rgba(217, 119, 6, 0.45); }
  50%      { box-shadow: 0 0 0 5px rgba(217, 119, 6, 0); }
}
.noticias-modal-sheet {
  animation: noticiasModalIn 0.28s cubic-bezier(.22,.8,.3,1) both;
}
@keyframes noticiasModalIn {
  from { opacity: 0; transform: translateY(28px); }
  to { opacity: 1; transform: translateY(0); }
}
.noticias-modal-image { animation: noticiasImageFade .38s ease both; }
@keyframes noticiasImageFade { from { opacity: .35; } to { opacity: 1; } }
.noticias-oficial-badge {
  animation: noticiasPulseDorado 2s ease-in-out infinite;
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

const IcoBell = (p) => (
  <Ico {...p}>
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </Ico>
)
const IcoNews = (p) => (
  <Ico {...p}>
    <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2h2" />
    <path d="M18 14h-8" />
    <path d="M15 18h-5" />
    <path d="M10 6h8v4h-8z" />
  </Ico>
)
const IcoBack = (p) => (
  <Ico {...p}><polyline points="15 18 9 12 15 6" /></Ico>
)
const IcoShield = (p) => (
  <Ico {...p}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="m9 12 2 2 4-4" />
  </Ico>
)
const IcoPin = (p) => (
  <Ico {...p}>
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </Ico>
)
const IcoClock = (p) => (
  <Ico {...p}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </Ico>
)
const IcoRefresh = (p) => (
  <Ico {...p}>
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </Ico>
)
const IcoAlert = (p) => (
  <Ico {...p}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </Ico>
)

/* ─── MAPA DE CATEGORÍA → COLOR + EMOJI ───
   Especificación:
   · Oficial   → dorado #fef3c7 / icono #d97706
   · Asamblea  → azul   #dbeafe / icono #2563eb
   · Obras     → amber  #fef3c7 / icono #d97706
   · Servicios → cyan   #cffafe / icono #0891b2
   · Seguridad → rojo   #fee2e2 / icono #dc2626
   (Oficial y Obras comparten paleta dorada, son dos ejes
    distintos: comunicación oficial vs. infraestructura). */
const NEWS_CATS = {
  oficial:   { label: 'Oficial',   bg: '#fef3c7', color: '#d97706', emoji: '📢' },
  asamblea:  { label: 'Asamblea',  bg: '#dbeafe', color: '#2563eb', emoji: '🗳️' },
  obras:     { label: 'Obras',     bg: '#fef3c7', color: '#d97706', emoji: '🚧' },
  servicios: { label: 'Servicios', bg: '#cffafe', color: '#0891b2', emoji: '💧' },
  seguridad: { label: 'Seguridad', bg: '#fee2e2', color: '#dc2626', emoji: '🚨' },
}
const DEFAULT_CAT = { label: 'Noticia', bg: C.verdeSuave, color: C.verdeOsc, emoji: '📰' }

/* Normaliza el tipo de noticia: prioriza post.news_type, después
   post.category, y normaliza a minúsculas sin acentos. */
const normalizarTipo = (post) => {
  const raw = post?.news_type || post?.category || ''
  if (!raw) return ''
  const norm = String(raw)
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
  // Singularizar Asambleas/Obras (los filtros vienen en plural).
  if (norm === 'asambleas') return 'asamblea'
  if (norm === 'obras') return 'obras' // ya está en key
  return norm
}

/* ============================================================
   COMPONENTE
   ============================================================ */
export default function Noticias({ currentUser, onNavigate }) {
  const [news, setNews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filtro, setFiltro] = useState('all')
  const [selectedNews, setSelectedNews] = useState(null)
  const [modalImageIndex, setModalImageIndex] = useState(0)
  const modalTouchStartX = useRef(null)
  const [categories, setCategories] = useState(Object.entries(NEWS_CATS).filter(([key]) => key !== 'oficial').map(([key, value]) => ({ key, name: value.label, icon: value.emoji })))

  // Pull-to-refresh
  const scrollRef = useRef(null)
  const touchStartY = useRef(0)
  const pulling = useRef(false)
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  const nav = onNavigate || (() => {})

  const fetchNews = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: e } = await supabase
        .from('posts')
        .select('*, author:profiles!author_id (id, full_name, avatar_url, role, verified, badge_founder, badge_trusted_seller)')
        .eq('type', 'news')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(50)
      if (e) throw e
      setNews(data || [])
    } catch (err) {
      console.error('Noticias fetch error:', err)
      setNews([])
      setError(err?.message || 'No pudimos cargar las noticias.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNews()
  }, [fetchNews])

  useEffect(() => {
    supabase.from('news_categories').select('key, name, icon').eq('is_active', true).order('sort_order').then(({ data }) => {
      if (data?.length) setCategories(data)
    })
  }, [])

  useEffect(() => {
    setModalImageIndex(0)
    const images = Array.isArray(selectedNews?.images) && selectedNews.images.some(Boolean)
      ? selectedNews.images.filter(Boolean)
      : (selectedNews?.image_url ? [selectedNews.image_url] : [])
    if (images.length < 2) return undefined
    const timer = window.setInterval(() => setModalImageIndex(current => (current + 1) % images.length), 3500)
    return () => window.clearInterval(timer)
  }, [selectedNews])

  const onModalImageTouchStart = event => {
    modalTouchStartX.current = event.touches?.[0]?.clientX ?? null
  }

  const onModalImageTouchEnd = (event, imageCount) => {
    if (modalTouchStartX.current == null || imageCount < 2) return
    const endX = event.changedTouches?.[0]?.clientX
    const distance = endX == null ? 0 : endX - modalTouchStartX.current
    modalTouchStartX.current = null
    if (Math.abs(distance) < 35) return
    setModalImageIndex(current => distance < 0
      ? (current + 1) % imageCount
      : (current - 1 + imageCount) % imageCount)
  }

  const categoryMap = Object.fromEntries(categories.map(category => [category.key, {
    ...(NEWS_CATS[category.key] || DEFAULT_CAT),
    label: category.name,
    emoji: category.icon,
  }]))
  const getCategory = post => categoryMap[normalizarTipo(post)] || DEFAULT_CAT
  const filters = [{ key: 'all', name: 'Todas', icon: '📰' }, { key: 'official', name: 'Oficiales', icon: '📢' }, ...categories]

  /* Filtrado en cliente (más robusto que .eq() porque post puede
     tener news_type O category, y "Oficiales" depende del perfil
     del autor, no solo del post). */
  const filtered = news.filter((n) => {
    if (filtro === 'all') return true
    const tipo = normalizarTipo(n)
    if (filtro === 'official') {
      return n.news_is_official === true || tipo === 'oficial'
    }
    return tipo === filtro
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
      await fetchNews()
      setRefreshing(false)
    } else {
      setPull(0)
    }
    touchStartY.current = 0
  }

  /* ── Helper: ¿es autor oficial? ── */
  const esNoticiaOficial = noticia => noticia?.news_is_official === true || normalizarTipo(noticia) === 'oficial'

  /* ── Helper: imágenes nuevas y portada histórica ── */
  const getImages = n => Array.isArray(n?.images) && n.images.some(Boolean)
    ? n.images.filter(Boolean)
    : (n?.image_url ? [n.image_url] : [])
  const getImagen = n => getImages(n)[0] || null

  /* ── Helper: source (badge chiquito) ── */
  const getSource = (n) => n?.news_source || n?.source || null

  /* ── Helper: extracto / descripción ── */
  const getExtracto = (n) => n?.description || n?.excerpt || n?.content || ''

  /* ── Estados de render ── */
  const renderEmpty = () => (
    <div style={s.emptyWrap}>
      <svg width="120" height="120" viewBox="0 0 120 120" style={s.emptySvg}>
        <circle cx="60" cy="60" r="56" fill={C.verdeBg} stroke={C.verdeSuave} strokeWidth="2" />
        {/* Periódico */}
        <rect x="30" y="38" width="56" height="44" rx="4" fill="#fff" stroke={C.verdeOsc} strokeWidth="2" />
        {/* Cabecera del diario */}
        <rect x="36" y="46" width="20" height="6" rx="2" fill={C.verdeOsc} />
        <rect x="60" y="46" width="20" height="3" rx="1" fill={C.textoTenue} />
        <rect x="60" y="52" width="20" height="3" rx="1" fill={C.textoTenue} />
        {/* Líneas de texto */}
        <rect x="36" y="60" width="44" height="3" rx="1" fill={C.borde} />
        <rect x="36" y="66" width="44" height="3" rx="1" fill={C.borde} />
        <rect x="36" y="72" width="28" height="3" rx="1" fill={C.borde} />
        {/* Pliegue */}
        <line x1="30" y1="56" x2="86" y2="56" stroke={C.borde} strokeWidth="1" />
        {/* Destellos */}
        <g fill={C.verde}>
          <circle cx="28" cy="34" r="2" />
          <circle cx="92" cy="36" r="2" />
          <circle cx="96" cy="86" r="2" />
        </g>
      </svg>
      <div style={s.emptyTitle}>No hay noticias en tu barrio todavía</div>
      <div style={s.emptySub}>
        Cuando la junta de vecinos o la municipalidad publique algo,
        lo vas a ver acá.
      </div>
    </div>
  )

  const renderError = () => (
    <div style={s.errorBox}>
      <IcoAlert size={28} />
      <div style={s.errorTitle}>No pudimos cargar las noticias</div>
      <div style={s.errorText}>{error}</div>
      <button style={s.errorBtn} onClick={fetchNews}>
        <IcoRefresh size={16} /> <span>Reintentar</span>
      </button>
    </div>
  )

  const renderSkeletons = () => (
    <div style={s.list}>
      {[1, 2, 3].map((i) => (
        <div key={i} style={s.skeletonCard}>
          <div style={s.skelBadges}>
            <div style={s.skelBadge} />
            <div style={{ ...s.skelBadge, width: 60 }} />
          </div>
          <div style={s.skelImg} />
          <div style={{ ...s.skelLineW, height: 18, width: '80%', marginTop: 14 }} />
          <div style={{ ...s.skelLineS, marginTop: 10, width: '92%' }} />
          <div style={{ ...s.skelLineS, marginTop: 6, width: '70%' }} />
          <div style={s.skelFooter}>
            <div style={s.skelAvatar} />
            <div style={{ ...s.skelLineS, width: '40%' }} />
          </div>
        </div>
      ))}
    </div>
  )

  const renderCard = (n, idx) => {
    const autor = n.author || n.profiles || n.profile || {}
    const name = autor.full_name || 'Perfil oficial'
    const initials = iniciales(name)
    const tipo = normalizarTipo(n)
    const cat = getCategory(n)
    const oficial = esNoticiaOficial(n)
    const img = getImagen(n)
    const source = getSource(n)
    const extracto = getExtracto(n)
    const cuando = hace(n.created_at)

    return (
      <div
        key={n.id}
        className="noticias-card"
        style={{ ...s.card, animationDelay: `${idx * 60}ms` }}
        onClick={() => setSelectedNews(n)}
      >
        {/* Badges superiores */}
        <div style={s.badgesRow}>
          <span style={{ ...s.catBadge, background: cat.bg, color: cat.color }}>
            <span style={s.catEmoji}>{cat.emoji}</span>
            <span>{cat.label}</span>
          </span>
          {oficial && (
            <span className="noticias-oficial-badge" style={s.oficialBadge}>
              <IcoShield size={11} />
              <span>OFICIAL</span>
            </span>
          )}
          {source && (
            <span style={s.sourceBadge}>
              <IcoPin size={10} />
              <span>{source}</span>
            </span>
          )}
        </div>

        {/* Imagen opcional (16:9) */}
        {img && (
          <div style={s.imgBox}>
            <img src={img} alt="" style={s.img} loading="lazy" />
          </div>
        )}

        {/* Título */}
        <div style={s.cardTitle}>{n.title || 'Noticia del barrio'}</div>

        {/* Extracto (3 líneas clamp) */}
        {extracto && <div style={s.cardDesc}>{extracto}</div>}
        <button type="button" style={s.readMore} onClick={event => { event.stopPropagation(); setSelectedNews(n) }}>Leer noticia completa</button>

        {/* Footer: autor + timestamp */}
        <div style={s.cardFooter}>
          <div style={s.authorBlock}>
            {autor.avatar_url ? (
              <img src={autor.avatar_url} alt="" style={s.avatar} />
            ) : (
              <div style={s.avatarFallback}>{initials}</div>
            )}
            <div style={s.authorInfo}>
              <div style={s.authorNameRow}>
                <span style={s.authorName}>{name.split(' ')[0]}</span>
                {oficial && <IcoShield size={11} />}
              </div>
              <div style={s.authorMeta}>
                {autor.role || autor.title || 'Autor'}
              </div>
            </div>
          </div>
          {cuando && (
            <span style={s.timeTag}>
              <IcoClock size={11} />
              <span>{cuando}</span>
            </span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={s.wrap}>
      <style dangerouslySetInnerHTML={{ __html: NEWS_CSS }} />

      {/* ── HEADER FIJO ── */}
      <div style={s.header}>
        <div style={s.headerTopRow}>
          {/* FIX: botón back — Noticias es sub-screen, necesita volver */}
          <button style={s.backBtn} onClick={() => nav('back')} aria-label="Volver">
            <IcoBack size={22} />
          </button>
          <div style={s.headerLeft}>
            <div style={s.headerTit}>Noticias</div>
            <div style={s.headerSub}>Lo que pasa en tu barrio</div>
          </div>
          {/* Campana decorativa */}
          <div style={s.bellBtn} aria-label="Notificaciones">
            <IcoBell size={22} />
            <span style={s.bellDot} />
          </div>
        </div>

        {/* Chips de filtro horizontales scrollables */}
        <div style={s.chipsScroll}>
          {filters.map((f) => {
            const active = filtro === f.key
            return (
              <button
                key={f.key}
                style={{
                  ...s.chip,
                  background: active ? C.verde : C.card,
                  color: active ? '#fff' : C.textoSuave,
                  border: `1px solid ${active ? 'transparent' : C.borde}`,
                }}
                onClick={() => setFiltro(f.key)}
              >
                <span style={s.chipEmoji}>{f.icon}</span>
                <span>{f.name}</span>
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
          <div className={refreshing ? 'noticias-spin' : ''} style={{ display: 'flex' }}>
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
            padding: '0 16px 24px',
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

      {selectedNews && (() => {
        const cat = getCategory(selectedNews)
        const official = esNoticiaOficial(selectedNews)
        const images = getImages(selectedNews)
        const source = getSource(selectedNews)
        return <div style={s.modalOverlay} role="dialog" aria-modal="true" aria-label={selectedNews.title || 'Noticia completa'} onClick={() => setSelectedNews(null)}>
          <article className="noticias-modal-sheet" style={s.modalSheet} onClick={event => event.stopPropagation()}>
            <header style={s.modalHeader}><button type="button" style={s.modalClose} onClick={() => setSelectedNews(null)} aria-label="Cerrar">×</button><span>Noticia completa</span><i /></header>
            <div style={s.modalScroll}>
              {images.length > 0 && <div style={s.modalCarousel} onTouchStart={onModalImageTouchStart} onTouchEnd={event => onModalImageTouchEnd(event, images.length)}><img key={`${images[modalImageIndex]}-${modalImageIndex}`} className="noticias-modal-image" src={images[modalImageIndex]} alt="" style={s.modalCover} draggable="false" />{images.length > 1 && <div style={s.modalDots}>{images.map((_, index) => <button key={index} type="button" aria-label={`Ver imagen ${index + 1}`} style={{ ...s.modalDot, ...(index === modalImageIndex ? s.modalDotActive : {}) }} onClick={() => setModalImageIndex(index)} />)}</div>}</div>}
              <div style={s.modalBody}>
                <div style={s.badgesRow}><span style={{ ...s.catBadge, background: cat.bg, color: cat.color }}>{cat.emoji} {cat.label}</span>{official && <span style={s.oficialBadge}><IcoShield size={11} /> OFICIAL</span>}</div>
                <h2 style={s.modalTitle}>{selectedNews.title || 'Noticia del barrio'}</h2>
                <div style={s.modalMeta}>{source && <span>{source}</span>}<span>{hace(selectedNews.created_at)}</span></div>
                <div style={s.modalContent}>{getExtracto(selectedNews)}</div>
              </div>
            </div>
          </article>
        </div>
      })()}
    </div>
  )
}

/* ============================================================
   ESTILOS (mismo patrón que Services.jsx / Verification.jsx)
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
    /* FIX: padding superior aumentado a 44px para safe-area del notch,
       porque App.jsx ya no agrega contentPad a las modalScreens. */
    padding: '44px 16px 12px',
    borderBottom: `1px solid ${C.borde}`,
    boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
  },
  headerTopRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  backBtn: {
    width: 38, height: 38,
    borderRadius: '50%',
    background: C.fondo,
    border: `1px solid ${C.borde}`,
    color: C.verdeOsc,
    cursor: 'pointer', padding: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  headerLeft: { flex: 1, minWidth: 0 },
  headerTit: {
    fontSize: 28,
    fontWeight: 800,
    color: C.verdeOsc,
    letterSpacing: '-0.5px',
    lineHeight: 1.1,
  },
  headerSub: {
    fontSize: 14,
    color: C.textoSuave,
    marginTop: 4,
    fontWeight: 500,
  },
  bellBtn: {
    position: 'relative',
    width: 42,
    height: 42,
    borderRadius: '50%',
    background: C.verdeBg,
    color: C.verde,
    border: `1px solid ${C.verdeSuave}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    cursor: 'default',
  },
  bellDot: {
    position: 'absolute',
    top: 9,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: C.rojo,
    border: `2px solid ${C.card}`,
    boxSizing: 'content-box',
  },

  /* ── CHIPS DE FILTRO ── */
  chipsScroll: {
    display: 'flex',
    gap: 8,
    overflowX: 'auto',
    padding: '14px 0 2px',
    scrollbarWidth: 'none',
    WebkitOverflowScrolling: 'touch',
    msOverflowStyle: 'none',
  },
  chip: {
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
  chipEmoji: { fontSize: 14, lineHeight: 1 },

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
    gap: 14,
    paddingTop: 14,
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

  /* ── BADGES SUPERIORES ── */
  badgesRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  catBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    padding: '5px 10px',
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 700,
  },
  catEmoji: { fontSize: 13, lineHeight: 1 },
  oficialBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '5px 10px',
    borderRadius: 8,
    background: '#fef3c7',
    color: '#d97706',
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: '0.4px',
    border: '1px solid #fde68a',
  },
  sourceBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '4px 9px',
    borderRadius: 8,
    background: C.fondo,
    color: C.textoSuave,
    fontSize: 11.5,
    fontWeight: 600,
    border: `1px solid ${C.borde}`,
  },

  /* ── IMAGEN 16:9 ── */
  imgBox: {
    width: '100%',
    aspectRatio: '16 / 9',
    borderRadius: 12,
    overflow: 'hidden',
    background: C.fondo,
    marginBottom: 12,
  },
  img: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },

  /* ── TÍTULO Y EXTRACTO ── */
  cardTitle: {
    fontSize: 18,
    fontWeight: 800,
    color: C.texto,
    lineHeight: 1.25,
    letterSpacing: '-0.2px',
    marginBottom: 6,
  },
  cardDesc: {
    fontSize: 13.5,
    color: C.textoSuave,
    lineHeight: 1.5,
    overflow: 'hidden',
    display: '-webkit-box',
    WebkitLineClamp: 3,
    WebkitBoxOrient: 'vertical',
    textOverflow: 'ellipsis',
  },
  readMore: { marginTop: 9, padding: 0, border: 0, color: C.verdeOsc, background: 'transparent', fontSize: 11.5, fontWeight: 800 },

  modalOverlay: { position: 'absolute', inset: 0, zIndex: 80, display: 'flex', alignItems: 'flex-end', background: 'rgba(17, 24, 20, 0.46)', backdropFilter: 'blur(2px)' },
  modalSheet: { width: '100%', maxHeight: '94%', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: C.fondo, borderRadius: '24px 24px 0 0', boxShadow: '0 -14px 40px rgba(0,0,0,.18)' },
  modalHeader: { height: 54, flexShrink: 0, display: 'grid', gridTemplateColumns: '40px 1fr 40px', alignItems: 'center', padding: '0 14px', background: C.card, borderBottom: `1px solid ${C.borde}` },
  modalClose: { width: 36, height: 36, borderRadius: '50%', border: `1px solid ${C.borde}`, background: C.fondo, color: C.texto, fontSize: 24, lineHeight: 1, cursor: 'pointer' },
  modalScroll: { minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch' },
  modalCarousel: { position: 'relative', flexShrink: 0, background: '#e9efeb', touchAction: 'pan-y', userSelect: 'none' },
  modalCover: { width: '100%', aspectRatio: '16 / 9', display: 'block', objectFit: 'cover' },
  modalDots: { position: 'absolute', left: 0, right: 0, bottom: 10, display: 'flex', justifyContent: 'center', gap: 5 },
  modalDot: { width: 7, height: 7, padding: 0, border: '1px solid rgba(255,255,255,.9)', borderRadius: '50%', background: 'rgba(255,255,255,.5)', boxShadow: '0 1px 4px rgba(0,0,0,.25)' },
  modalDotActive: { width: 18, borderRadius: 999, background: '#fff' },
  modalBody: { padding: '18px 18px 34px' },
  modalTitle: { margin: '4px 0 8px', color: C.texto, fontSize: 24, lineHeight: 1.18, letterSpacing: '-.5px' },
  modalMeta: { display: 'flex', justifyContent: 'space-between', gap: 12, color: C.textoTenue, fontSize: 11.5, paddingBottom: 15, borderBottom: `1px solid ${C.borde}` },
  modalContent: { paddingTop: 17, color: C.textoSuave, fontSize: 15, lineHeight: 1.72, whiteSpace: 'pre-wrap' },

  /* ── FOOTER AUTOR + TIMESTAMP ── */
  cardFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 12,
    paddingTop: 10,
    borderTop: `1px solid ${C.bordeSuave}`,
  },
  authorBlock: {
    display: 'flex',
    alignItems: 'center',
    gap: 9,
    flex: 1,
    minWidth: 0,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: '50%',
    objectFit: 'cover',
    flexShrink: 0,
  },
  avatarFallback: {
    width: 30,
    height: 30,
    borderRadius: '50%',
    background: C.verde,
    color: '#fff',
    fontSize: 11,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  authorInfo: { flex: 1, minWidth: 0 },
  authorNameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  authorName: {
    fontSize: 13,
    fontWeight: 700,
    color: C.texto,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  authorMeta: {
    fontSize: 11,
    color: C.textoTenue,
    marginTop: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  timeTag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    color: C.textoTenue,
    fontSize: 11.5,
    fontWeight: 600,
    flexShrink: 0,
  },

  /* ── SKELETON ── */
  skeletonCard: {
    background: C.card,
    borderRadius: 18,
    padding: 14,
    border: `1px solid ${C.borde}`,
  },
  skelBadges: {
    display: 'flex',
    gap: 8,
    marginBottom: 10,
  },
  skelBadge: {
    height: 22,
    width: 80,
    borderRadius: 8,
    background: C.borde,
  },
  skelImg: {
    width: '100%',
    aspectRatio: '16 / 9',
    borderRadius: 12,
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
  skelFooter: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
    paddingTop: 10,
    borderTop: `1px solid ${C.bordeSuave}`,
  },
  skelAvatar: {
    width: 30,
    height: 30,
    borderRadius: '50%',
    background: C.borde,
    flexShrink: 0,
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
    maxWidth: 280,
    lineHeight: 1.5,
    marginTop: 6,
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
}
