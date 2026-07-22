import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { C, T, S, CATEGORIAS, iniciales, hace, plata, distancia } from '../lib/design'

// ============================================================
// Marketplace.jsx — Rediseño v8
// Cambios vs v7:
//   · Layout sectional en vez de grid 2-col infinito:
//       1. "Nuevos en el barrio" → feed horizontal de 6 tarjetas grandes
//          (HFeedCard, 72% width, peek de la siguiente, scroll-snap).
//       2. "En venta" → cuadrados pequeños (HMiniCard, 3 por vista,
//          scroll lateral con scroll-snap).
//       3. "Regalos" → igual que venta, tipo regalo.
//       4. "Trueques" → igual que venta, tipo trueque.
//   · Pills filtran: "Todos" muestra las 4 secciones; una pill específica
//     muestra solo esa sección con todos sus posts.
//   · Fetch único: trae 60 posts de todos los tipos y los separa en cliente.
//   · Removido infinite scroll (sentinel) — las secciones horizontales no
//     lo necesitan; 60 posts alcanzan para llenar feed + 3 secciones.
//   · Scrollbars ocultos en los scrollers horizontales (.mp-hscroll).
// Mantiene: header con bolsita verde + avatar, CTA "PUBLICA AQUÍ" con
//           crossfade de 6 emojis, pills, real-time, pull-to-refresh,
//           skeleton, empty state, demo images, distancia real, verde de marca.
// ============================================================

// ---- Iconos SVG (mismo estilo que Search/Alertas) ----
const Icon = {
  Back: ({ size = 20, color = C.verdeOsc }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6" />
    </svg>
  ),
  Tag: ({ size = 14, color = '#fff' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
      <line x1="7" y1="7" x2="7.01" y2="7"/>
    </svg>
  ),
  Gift: ({ size = 14, color = '#fff' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 12 20 22 4 22 4 12"/>
      <rect x="2" y="7" width="20" height="5"/>
      <line x1="12" y1="22" x2="12" y2="7"/>
      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/>
      <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
    </svg>
  ),
  Swap: ({ size = 14, color = '#fff' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="17 1 21 5 17 9"/>
      <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
      <polyline points="7 23 3 19 7 15"/>
      <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
    </svg>
  ),
  Pin: ({ size = 11, color = C.verde }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  ),
  Star: ({ size = 11, color = '#f59e0b' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke={color} strokeWidth="1">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  ),
  Verified: ({ size = 11, color = C.verde }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="8 12 11 15 16 9" stroke="#fff" fill="none"/>
    </svg>
  ),
  Clock: ({ size = 11, color = C.textoTenue }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  Sort: ({ size = 14, color = C.textoSuave }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="13" y2="6"/>
      <line x1="3" y1="12" x2="11" y2="12"/>
      <line x1="3" y1="18" x2="9" y2="18"/>
      <polyline points="17 6 17 18"/>
      <polyline points="21 14 17 18 13 14"/>
    </svg>
  ),
  Sparkle: ({ size = 12, color = C.dorado }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none">
      <path d="M12 2l1.5 6.5L20 10l-6.5 1.5L12 18l-1.5-6.5L4 10l6.5-1.5L12 2z"/>
    </svg>
  ),
  Plus: ({ size = 18, color = '#fff' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  Search: ({ size = 16, color = C.textoTenue }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  ArrowRight: ({ size = 12, color = C.verde }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/>
      <polyline points="12 5 19 12 12 19"/>
    </svg>
  ),
  Refresh: ({ size = 16, color = C.verde }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10"/>
      <polyline points="1 20 1 14 7 14"/>
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"/>
      <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14"/>
    </svg>
  ),
  // Bolsita lineal verde — mismo ícono que el tab "Mercado" del menú inferior.
  Bag: ({ size = 20, color = C.verde }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
      <path d="M3 6h18"/>
      <path d="M16 10a4 4 0 0 1-8 0"/>
    </svg>
  ),
}

// ---- Todos los tipos (para el fetch único del modo "Todos") ----
// Debe estar declarado ANTES de PILLS porque PILLS[todos].alts = ALL_ALTS.
const ALL_ALTS = [
  'venta','vender','vende','sell','sale',
  'regalo','regalar','regala','gift','free',
  'intercambio','intercambiar','trueque','swap','trade',
]

// ---- Helpers de tipo (para separar posts por sección en cliente) ----
const esVenta   = (t) => ['venta','vender','vende','sell','sale'].includes((t||'').toLowerCase())
const esRegalo  = (t) => ['regalo','regalar','regala','gift','free'].includes((t||'').toLowerCase())
const esTrueque = (t) => ['intercambio','intercambiar','trueque','swap','trade'].includes((t||'').toLowerCase())

// ---- Pills de filtro (con emoji, "Todos" al final a la derecha) ----
const PILLS = [
  { id: 'venta',    label: 'Venta',   emoji: '🏷️', alts: ['venta','vender','vende','sell','sale'] },
  { id: 'regalo',   label: 'Regalos', emoji: '🎁', alts: ['regalo','regalar','regala','gift','free'] },
  { id: 'trueque',  label: 'Trueque', emoji: '🔄', alts: ['intercambio','intercambiar','trueque','swap','trade'] },
]

// ---- Helper: emoji por categoría (para placeholder cuando no hay imagen) ----
const catEmoji = (cat) => {
  if (!cat) return '📦'
  const found = CATEGORIAS.find(c => cat.toLowerCase().includes(c.key.toLowerCase()))
  return found ? found.emoji : '📦'
}

// ---- Imágenes demo (cuando el post no tiene foto) ----
// Usa LoremFlickr por keyword de categoría (imágenes reales, consistentes por seed).
// Si falla, onError → emoji fallback.
const DEMO_KEYWORDS = {
  'Electrónica': 'electronics,gadget',
  'Ropa': 'clothing,fashion',
  'Hogar': 'home,decor',
  'Deportes': 'sports,equipment',
  'Libros': 'books,reading',
  'Juguetes': 'toys',
  'Muebles': 'furniture',
  'Bicicletas': 'bicycle',
  'Mascotas': 'pets,cat,dog',
  'Herramientas': 'tools,workshop',
  'Otros': 'secondhand,market',
}
const demoImgUrl = (post) => {
  const kw = DEMO_KEYWORDS[post.category] || 'product'
  const seed = (post.id || 'x').slice(-4)
  return `https://loremflickr.com/400/400/${kw}?lock=${seed}`
}

// ---- Helper: tipo info (para badge de card) ----
const tipoInfo = (type) => {
  const t = (type || '').toLowerCase()
  if (['regalo','regalar','regala','gift','free'].includes(t)) return { label: 'Gratis',   color: C.morado,  bg: C.moradoSuave }
  if (['intercambio','trueque','swap','trade'].includes(t)) return { label: 'Trueque', color: C.azul,    bg: C.azulSuave }
  return { label: 'Venta', color: C.naranjo, bg: C.naranjoSuave }
}

// ---- Helper: distancia real (Haversine) entre usuario y post ----
const getCoord = (obj) => {
  if (!obj) return null
  const lat = obj.lat ?? obj.latitude ?? (obj.location?.coordinates?.[1])
  const lng = obj.lng ?? obj.longitude ?? (obj.location?.coordinates?.[0])
  if (lat == null || lng == null) return null
  return { lat: Number(lat), lng: Number(lng) }
}
const haversine = (lat1, lon1, lat2, lon2) => {
  const R = 6371000 // metros
  const toRad = (d) => d * Math.PI / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))
}
// Devuelve metros (Number) o null si no hay coords suficientes.
// Los posts de venta/trueque/regalo NO guardan lat/lng propios (ver CreatePost:
// distance_meters queda NULL a propósito). Por eso usamos las coords del
// VENDEDOR (profiles.lat/lng) como su ubicación — distancia real usuario↔vendedor.
const computeDist = (post, user) => {
  if (post.distance_meters != null) return post.distance_meters
  if (!user) return null
  const p = getCoord(post) || getCoord(post?.author)  // post → vendedor
  const u = getCoord(user)
  if (!p || !u) return null
  return haversine(u.lat, u.lng, p.lat, p.lng)
}

// ---- Helper: es "nuevo" (<24h) ----
const esNuevo = (createdAt) => {
  if (!createdAt) return false
  const diff = Date.now() - new Date(createdAt).getTime()
  return diff < 24 * 60 * 60 * 1000
}

// ---- Helper: precio label con color ----
const precioInfo = (post) => {
  const t = (post.type || '').toLowerCase()
  if (['regalo','regalar','regala','gift','free'].includes(t)) {
    return { label: 'Gratis', color: C.morado, bg: C.moradoSuave }
  }
  if (['intercambio','trueque','swap','trade'].includes(t)) {
    return { label: 'Trueque', color: C.azul, bg: C.azulSuave }
  }
  // venta — verde de marca (C.verde #16a34a)
  if (post.price) return { label: plata(post.price), color: C.verde, bg: C.verdeSuave }
  return { label: 'Consultar', color: C.textoSuave, bg: C.bordeSuave }
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export default function Marketplace({ currentUser, onNavigate, onCrear }) {
  // Al entrar mostramos una mezcla de todos los tipos. Las pills sirven para
  // acotar el feed y se pueden tocar nuevamente para volver a la mezcla.
  const [activeTab, setActiveTab] = useState('todos')
  const [categoriaActiva, setCategoriaActiva] = useState('todas')
  const [busqueda, setBusqueda] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Pull-to-refresh state
  const [pullDist, setPullDist] = useState(0)
  const [pulling, setPulling] = useState(false)
  const touchStartY = useRef(0)
  const scrollRef = useRef(null)

  // Contador de posts nuevos (real-time banner)
  const [newFromRT, setNewFromRT] = useState(0)

  // GPS real del usuario actual (para distancia real vendedor ↔ comprador)
  const [myCoords, setMyCoords] = useState(null)

  const nav = onNavigate || (() => {})

  // ---- Cargar posts ----
  // Fetch único: trae 60 posts de TODOS los tipos y los separa en cliente.
  // Las pills solo controlan QUÉ secciones se muestran, no el query.
  const fetchMarketplace = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    const query = supabase
      .from('posts')
      .select(`*,
        author:profiles!author_id (full_name, avatar_url, reputation_score, badge_founder, badge_trusted_seller, lat, lng)
      `)
      .in('type', ALL_ALTS)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(60)

    const { data, error } = await query
    if (error) console.error('Error marketplace:', error)
    setPosts(data || [])
    setNewFromRT(0)
    setLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => {
    fetchMarketplace()
  }, [fetchMarketplace])

  // ---- GPS real del usuario (para calcular distancia a cada vendedor) ----
  // 1) Fallback rápido: coords guardadas en su perfil (si verificó por GPS).
  // 2) Primario: geolocalización del navegador (tiempo real, más preciso).
  useEffect(() => {
    let cancelled = false

    if (currentUser?.id) {
      supabase
        .from('profiles')
        .select('lat, lng')
        .eq('user_id', currentUser.id)
        .maybeSingle()
        .then(({ data }) => {
          if (cancelled || !data) return
          if (data.lat != null && data.lng != null) {
            setMyCoords(prev => prev || { lat: data.lat, lng: data.lng })
          }
        })
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (!cancelled) setMyCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        },
        () => {},
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      )
    }

    return () => { cancelled = true }
  }, [currentUser?.id])

  // ---- Real-time: cualquier post nuevo entra al top (sin filtrar por pill) ----
  useEffect(() => {
    const canal = supabase
      .channel('mercado-todos')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'posts' },
        async (payload) => {
          const nuevo = payload.new
          if (!ALL_ALTS.includes((nuevo.type||'').toLowerCase())) return
          if (nuevo.status !== 'active') return

          // Hidratar author
          const { data: prof } = await supabase
            .from('profiles')
            .select('full_name, avatar_url, reputation_score, badge_founder, badge_trusted_seller, lat, lng')
            .eq('user_id', nuevo.author_id)
            .maybeSingle()

          // ¿El usuario está al top del feed?
          const isAtTop = scrollRef.current && scrollRef.current.scrollTop < 120
          setPosts(prev => {
            if (prev.some(p => p.id === nuevo.id)) return prev
            if (!isAtTop) setNewFromRT(n => n + 1)
            return [{ ...nuevo, author: prof }, ...prev]
          })
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'posts' },
        (payload) => {
          const upd = payload.new
          setPosts(prev => prev.map(p => p.id === upd.id ? { ...p, ...upd } : p))
        }
      )
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'posts' },
        (payload) => {
          setPosts(prev => prev.filter(p => p.id !== payload.old.id))
        }
      )
      .subscribe()

    return () => supabase.removeChannel(canal)
  }, [])

  // ---- Ver nuevos posts (scroll al top + reset contador) ----
  const verNuevos = () => {
    if (scrollRef.current) scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' })
    setNewFromRT(0)
  }

  // ---- Tipo de post para el FAB y empty state (según pill activa) ----
  const tipoParaCrear = () => {
    if (activeTab === 'venta') return 'sell'
    if (activeTab === 'regalo') return 'gift'
    if (activeTab === 'trueque') return 'trade'
    return 'sell' // default cuando es "todos"
  }

  // ---- Pull-to-refresh handlers ----
  const onTouchStart = (e) => {
    if (scrollRef.current && scrollRef.current.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY
      setPulling(true)
    } else {
      setPulling(false)
    }
  }
  const onTouchMove = (e) => {
    if (!pulling) return
    const delta = e.touches[0].clientY - touchStartY.current
    if (delta > 0 && delta < 100) setPullDist(delta)
  }
  const onTouchEnd = () => {
    if (pullDist > 70) fetchMarketplace(true)
    setPullDist(0)
    setPulling(false)
  }

  // ---- Render ----
  // Un solo listado, filtrado por texto y por tipo. Así evitamos mostrar
  // el mismo producto en "Nuevos" y nuevamente en otra sección.
  const termino = busqueda.trim().toLowerCase()
  const postsBuscados = termino
    ? posts.filter((p) => [p.title, p.content, p.category, p.author?.full_name]
      .filter(Boolean)
      .some((valor) => String(valor).toLowerCase().includes(termino)))
    : posts
  const postsVisibles = postsBuscados.filter((p) => {
    const coincideTipo = activeTab === 'todos'
      ? (esVenta(p.type) || esRegalo(p.type) || esTrueque(p.type))
      : activeTab === 'venta'
      ? esVenta(p.type)
      : activeTab === 'regalo'
        ? esRegalo(p.type)
        : esTrueque(p.type)
    const coincideCategoria = categoriaActiva === 'todas' ||
      (p.category || '').toLowerCase() === categoriaActiva.toLowerCase()
    return coincideTipo && coincideCategoria
  })

  const userWithCoords = { ...currentUser, ...myCoords }
  const irA = (postId) => nav('productdetail', { postId })

  return (
    <div style={s.wrap}>
      {/* ===== STICKY TOP: header + buscador + CTA + pills ===== */}
      <div style={s.stickyTop}>
        <div className="market-feed-header" style={s.headerRow}>
          <button type="button" style={s.headerBackBtn} onClick={() => nav('back')} aria-label="Volver">
            <Icon.Back size={22} />
          </button>
          <strong style={s.headerTitleText}>
            Mercado de <span style={s.headerBrand}>el barrio</span>
          </strong>
          <button
            style={{ ...s.headerSearchBtn, ...s.headerSearchPosition, ...(searchOpen ? s.headerSearchBtnActive : {}) }}
            onClick={() => {
              setSearchOpen(open => {
                if (open) setBusqueda('')
                return !open
              })
            }}
            aria-label={searchOpen ? 'Cerrar búsqueda' : 'Buscar en Mercado'}
          >
            {searchOpen ? <span style={s.headerSearchClose}>×</span> : <Icon.Search size={18} color={C.verdeOsc} />}
          </button>
        </div>

        {/* El buscador se despliega solo cuando el vecino lo necesita. */}
        {searchOpen && (
          <div style={s.searchBar}>
            <label style={s.searchInner}>
              <Icon.Search size={16} color={C.textoTenue} />
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar productos…"
                style={s.searchInput}
                autoFocus
              />
              {busqueda && (
                <button style={s.searchClear} onClick={() => setBusqueda('')} aria-label="Limpiar búsqueda">
                  ×
                </button>
              )}
            </label>
          </div>
        )}

        {/* Fila 2: CTA "¿Quieres vender?" (encima de los cuadrados) */}
        <div style={s.publishCtaWrap}>
          <button
            className="mp-publish-cta"
            style={s.publishCta}
            onClick={() => onCrear?.(tipoParaCrear())}
          >
            <span className="mp-publish-pattern" aria-hidden />
            <span style={s.publishCtaIcon} aria-hidden>♻️</span>
            <span style={s.publishCtaText}>
              <span style={s.publishCtaEyebrow}>MERCADO DEL BARRIO</span>
              <span style={s.publishCtaQuestion}>¿Algo que ya no usas?</span>
            </span>
            <span className="mp-publish-action" style={s.publishCtaAction}>
              ¡Publícalo!
              <Icon.ArrowRight size={13} color="#fff" />
            </span>
          </button>
        </div>

        {/* Fila 3: 4 pills verticales (rectángulo SIN fondo: icono arriba, texto abajo) */}
        <div style={s.pillsRow}>
          {PILLS.map(pill => {
            const active = activeTab === pill.id
            const col = active ? C.verde : C.textoSuave
            return (
              <button
                key={pill.id}
                onClick={() => setActiveTab(current => current === pill.id ? 'todos' : pill.id)}
                style={{
                  ...s.pill,
                  borderColor: active ? C.verde : C.borde,
                  background: active ? C.verde : C.card,
                }}
              >
                <span style={{ ...s.pillEmoji, color: col }}>{pill.emoji}</span>
                <span style={{ ...s.pillLabel, color: active ? '#fff' : col }}>{pill.label}</span>
              </button>
            )
          })}
        </div>

        <div className="mp-hscroll" style={s.categoriesRow}>
          <button
            style={{ ...s.categoryPill, ...(categoriaActiva === 'todas' ? s.categoryPillActive : {}) }}
            onClick={() => setCategoriaActiva('todas')}
          >
            Todo
          </button>
          {CATEGORIAS.map((categoria) => (
            <button
              key={categoria.key}
              style={{ ...s.categoryPill, ...(categoriaActiva === categoria.key ? s.categoryPillActive : {}) }}
              onClick={() => setCategoriaActiva(categoria.key)}
            >
              <span>{categoria.emoji}</span>
              {categoria.key}
            </button>
          ))}
        </div>
      </div>

      {/* ===== SCROLL AREA (con pull-to-refresh) ===== */}
      <div
        ref={scrollRef}
        style={s.scrollArea}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Indicador pull-to-refresh */}
        {(refreshing || pullDist > 0) && (
          <div style={{
            ...s.pullIndicator,
            height: refreshing ? 50 : pullDist,
            opacity: refreshing ? 1 : Math.min(pullDist / 70, 1),
          }}>
            <div style={{
              ...s.pullSpinner,
              transform: `rotate(${pullDist * 3.6}deg)`,
              animation: refreshing ? 'mpSpin 0.8s linear infinite' : 'none',
            }}>
              <Icon.Refresh />
            </div>
            <span style={s.pullText}>
              {refreshing ? 'Actualizando…' : pullDist > 70 ? 'Suelta para actualizar' : 'Desliza para actualizar'}
            </span>
          </div>
        )}

        <div style={s.content}>
          {/* Banner: publicaciones nuevas arriba (real-time) */}
          {!loading && newFromRT > 0 && (
            <button style={s.newPostsBanner} onClick={verNuevos}>
              <Icon.Sparkle size={12} color="#fff" />
              <span>{newFromRT} {newFromRT === 1 ? 'publicación nueva' : 'publicaciones nuevas'}</span>
              <span style={s.newPostsArrow}>↑</span>
            </button>
          )}

          {loading ? (
            <SkeletonSections />
          ) : posts.length === 0 ? (
            <EmptyState
              pillId={activeTab}
              onCrear={() => onCrear?.(tipoParaCrear())}
            />
          ) : (
            <div style={s.marketList}>
              <div style={s.sectionRow}>
                <h2 style={s.sectionTitle}>Publicaciones recientes</h2>
              </div>
              {postsVisibles.length > 0 ? (
                <div style={s.grid}>
                  {postsVisibles.map((post) => (
                    <MarketCard
                      key={post.id}
                      post={post}
                      currentUser={userWithCoords}
                      onClick={() => irA(post.id)}
                    />
                  ))}
                </div>
              ) : (
                <div style={s.noResults}>
                  <span style={s.noResultsEmoji}>🔎</span>
                  <strong>No encontramos publicaciones</strong>
                  <span>Prueba con otra palabra o cambia el filtro.</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Keyframes inyectados (shimmer + spin) */}
      <style>{`
        @keyframes mpShimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes mpSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes marketHeaderDrift {
          from { background-position: 0 0; }
          to { background-position: -112px 68px; }
        }
        @keyframes mpCardIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        /* Crossfade de los emojis del CTA: 6 emojis aparecen y desaparecen (ciclo 6s, 1s cada uno) */
        @keyframes mpEmojiFade {
          0%      { opacity: 0; transform: translateY(4px) scale(0.7); }
          4%      { opacity: 1; transform: translateY(0) scale(1); }
          12.5%   { opacity: 1; transform: translateY(0) scale(1); }
          16.67%  { opacity: 0; transform: translateY(-4px) scale(0.7); }
          100%    { opacity: 0; transform: translateY(-4px) scale(0.7); }
        }
        /* Ocultar scrollbar en los scrollers horizontales (feed + mini sections) */
        .mp-hscroll::-webkit-scrollbar { display: none; }
        .mp-hscroll { -ms-overflow-style: none; scrollbar-width: none; }
        .mp-publish-cta,
        .mp-publish-action { transition: transform 0.18s ease, box-shadow 0.18s ease; }
        .mp-publish-cta { isolation: isolate; }
        .mp-publish-cta::after {
          content: '';
          position: absolute;
          z-index: 0;
          top: -45%;
          left: -42%;
          width: 28%;
          height: 190%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.24), transparent);
          transform: skewX(-18deg);
          animation: mpPublishShine 4.2s ease-in-out infinite;
          pointer-events: none;
        }
        .mp-publish-pattern {
          position: absolute;
          inset: 0;
          z-index: 0;
          opacity: 0.17;
          background-image: radial-gradient(rgba(255,255,255,0.85) 0.8px, transparent 0.8px);
          background-size: 12px 12px;
          mask-image: linear-gradient(90deg, #000, transparent 72%);
          pointer-events: none;
        }
        @keyframes mpPublishShine {
          0%, 56% { left: -42%; opacity: 0; }
          62% { opacity: 1; }
          82% { left: 118%; opacity: 1; }
          83%, 100% { left: 118%; opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .mp-publish-cta::after { animation: none; }
          .market-feed-header { animation: none !important; }
        }
        .mp-publish-cta:hover .mp-publish-action {
          transform: translateX(2px);
          box-shadow: 0 5px 12px rgba(22,163,74,0.28);
        }
        .mp-publish-cta:active { transform: scale(0.99); }
        .mp-publish-cta:active .mp-publish-action { transform: scale(0.97); }
      `}</style>
    </div>
  )
}

// ============================================================
// MARKET CARD — tarjeta única para la cuadrícula de Mercado
// ============================================================
function MarketCard({ post, currentUser, onClick }) {
  const precio = precioInfo(post)
  const tieneImg = post.images && post.images.length > 0
  const [imgError, setImgError] = useState(false)
  const demoUrl = !tieneImg ? demoImgUrl(post) : null
  const imgSrc = tieneImg ? post.images[0] : (!imgError ? demoUrl : null)
  const distM = computeDist(post, currentUser)
  const dist = distM != null && distM >= 20 ? distancia(distM) : null

  return (
    <button style={s.card} onClick={onClick}>
      <div style={s.imgBox}>
        {imgSrc ? (
          <img src={imgSrc} alt={post.title || ''} style={s.img} onError={() => setImgError(true)} />
        ) : (
          <div style={s.noImg}>
            <span style={{ fontSize: 34 }}>{catEmoji(post.category)}</span>
          </div>
        )}
        {esVenta(post.type) && post.is_negotiable === true && (
          <span style={s.negotiableBadge}>Conversable</span>
        )}
        <span style={{ ...s.marketPriceBadge, color: precio.color }}>{precio.label}</span>
      </div>
      <div style={s.cardBody}>
        <div style={s.postTitle}>{post.title || 'Sin título'}</div>
        <div style={s.marketAuthor}>
          {post.author?.avatar_url ? (
            <img src={post.author.avatar_url} alt="" style={s.marketAuthorAvatar} />
          ) : (
            <span style={s.marketAuthorFallback}>{iniciales(post.author?.full_name)}</span>
          )}
          <span style={s.marketAuthorName}>
            {post.author?.full_name?.split(' ')[0] || 'Vecino'}
          </span>
          <span style={s.marketTime}>
            {dist ? (
              <><Icon.Pin size={8} color={C.rojo} /> {dist}</>
            ) : hace(post.created_at)}
          </span>
        </div>
      </div>
    </button>
  )
}

// ============================================================
// HFEED CARD — tarjeta grande para el feed horizontal "Nuevos en el barrio"
// (72% width, peek de la siguiente, scroll-snap start)
// ============================================================
function HFeedCard({ post, currentUser, onClick }) {
  const precio = precioInfo(post)
  const nuevo = esNuevo(post.created_at)
  const tieneImg = post.images && post.images.length > 0
  const [imgError, setImgError] = useState(false)

  const demoUrl = !tieneImg ? demoImgUrl(post) : null
  const imgSrc = tieneImg ? post.images[0] : (!imgError ? demoUrl : null)

  const distM = computeDist(post, currentUser)
  const dist = distM != null ? distancia(distM) : null

  return (
    <button style={s.feedCard} onClick={onClick}>
      <div style={s.feedImgBox}>
        {imgSrc ? (
          <img src={imgSrc} alt={post.title || ''} style={s.img} onError={() => setImgError(true)} />
        ) : (
          <div style={s.noImg}>
            <span style={{ fontSize: 40 }}>{catEmoji(post.category)}</span>
          </div>
        )}
        {dist && (
          <span style={s.badgeDistSm}>
            <Icon.Pin size={10} color="#fff" />
            {dist}
          </span>
        )}
        {nuevo && (
          <span style={{ ...s.badgeNuevoSm, left: 'auto', right: 8 }}>
            <Icon.Sparkle size={9} /> Nuevo
          </span>
        )}
      </div>

      <div style={s.feedBody}>
        <div style={s.feedTitle}>{post.title || 'Sin título'}</div>
        <div style={s.feedPriceRow}>
          <span style={{ ...s.feedPrice, color: precio.color }}>{precio.label}</span>
        </div>
        <div style={s.dividerSm} />
        <div style={s.authorBlockSm}>
          {post.author?.avatar_url ? (
            <img src={post.author.avatar_url} alt="" style={s.avatarSm} />
          ) : (
            <div style={s.avatarSmFallback}>{iniciales(post.author?.full_name)}</div>
          )}
          <div style={s.authorInfoSm}>
            <span style={s.authorNameSm}>
              {post.author?.full_name?.split(' ')[0] || 'Vecino'}
            </span>
            <div style={s.authorMetaSm}>
              <Icon.Clock size={9} />
              <span>{hace(post.created_at)}</span>
            </div>
          </div>
        </div>
      </div>
    </button>
  )
}

// ============================================================
// HMINI CARD — cuadrado pequeño para las secciones de venta/regalo/trueque
// (~31% width, 3 por vista con peek, scroll-snap start)
// ============================================================
function HMiniCard({ post, currentUser, onClick }) {
  const precio = precioInfo(post)
  const tieneImg = post.images && post.images.length > 0
  const [imgError, setImgError] = useState(false)

  const demoUrl = !tieneImg ? demoImgUrl(post) : null
  const imgSrc = tieneImg ? post.images[0] : (!imgError ? demoUrl : null)

  const distM = computeDist(post, currentUser)
  const dist = distM != null ? distancia(distM) : null

  return (
    <button style={s.miniCard} onClick={onClick}>
      <div style={s.miniImgBox}>
        {imgSrc ? (
          <img src={imgSrc} alt={post.title || ''} style={s.img} onError={() => setImgError(true)} />
        ) : (
          <div style={s.noImg}>
            <span style={{ fontSize: 26 }}>{catEmoji(post.category)}</span>
          </div>
        )}
        {dist && (
          <span style={s.badgeDistMini}>
            <Icon.Pin size={8} color="#fff" />
            {dist}
          </span>
        )}
      </div>
      <div style={s.miniBody}>
        <div style={s.miniTitle}>{post.title || 'Sin título'}</div>
        <div style={{ ...s.miniPrice, color: precio.color }}>{precio.label}</div>
      </div>
    </button>
  )
}

// ============================================================
// MINI SECTION — bloque con título + fila horizontal de HMiniCard
// Si no hay posts, muestra un empty state pequeño de la sección.
// `expanded` = modo pill específica (sin botón "Ver todos").
// ============================================================
function MiniSection({ title, emoji, posts, currentUser, onVerTodos, onClick, expanded }) {
  if (posts.length === 0) {
    return (
      <div style={s.section}>
        <div style={s.sectionRow}>
          <h2 style={s.sectionTitle}>
            <span style={s.sectionEmoji} aria-hidden>{emoji}</span>
            {title}
          </h2>
        </div>
        <div style={s.sectionEmpty}>
          <span style={s.sectionEmptyEmoji}>{emoji}</span>
          <span style={s.sectionEmptyText}>Todavía no hay publicaciones aquí.</span>
        </div>
      </div>
    )
  }
  return (
    <div style={s.section}>
      <div style={s.sectionRow}>
        <h2 style={s.sectionTitle}>
          <span style={s.sectionEmoji} aria-hidden>{emoji}</span>
          {title}
          <span style={s.sectionCount}>{posts.length}</span>
        </h2>
        {!expanded && posts.length > 3 && onVerTodos && (
          <button style={s.verTodosBtn} onClick={onVerTodos}>
            Ver todos
            <Icon.ArrowRight size={11} color={C.verde} />
          </button>
        )}
      </div>
      <div className="mp-hscroll" style={s.hScroll}>
        {posts.map(post => (
          <HMiniCard key={post.id} post={post} currentUser={currentUser} onClick={() => onClick(post.id)} />
        ))}
      </div>
    </div>
  )
}

// ============================================================
// SKELETON SECTIONAL — placeholders con shimmer para el layout nuevo
// ============================================================
function SkeletonSections() {
  return (
    <>
      {/* Skeleton feed de 6 (2 tarjetas grandes visibles) */}
      <div style={s.section}>
        <div style={{ ...s.skeletonBar, width: 180, height: 16, margin: '2px 16px 10px' }} />
        <div className="mp-hscroll" style={s.hScroll}>
          {[1, 2].map(i => (
            <div key={i} style={{ ...s.feedCard, border: 'none', boxShadow: 'none' }}>
              <div style={{ ...s.feedImgBox, ...s.shimmer }} />
              <div style={s.skeletonBody}>
                <div style={s.skeletonLine1} />
                <div style={s.skeletonLine2} />
                <div style={s.skeletonAvatar} />
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* 3 skeleton mini sections */}
      {[1, 2, 3].map(sec => (
        <div key={sec} style={s.section}>
          <div style={{ ...s.skeletonBar, width: 140, height: 16, margin: '2px 16px 10px' }} />
          <div className="mp-hscroll" style={s.hScroll}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ ...s.miniCard, border: 'none', boxShadow: 'none' }}>
                <div style={{ ...s.miniImgBox, ...s.shimmer }} />
                <div style={s.miniBody}>
                  <div style={{ ...s.skeletonLine1, height: 10, marginBottom: 4 }} />
                  <div style={{ ...s.skeletonLine2, height: 10, width: '50%', marginBottom: 0 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  )
}

// ============================================================
// EMPTY STATE cálido
// ============================================================
function EmptyState({ pillId, onCrear }) {
  const esRegalo = pillId === 'regalo'
  const esTrueque = pillId === 'trueque'
  const esTodos = pillId === 'todos'
  const label = esTodos ? 'publicaciones' : (esRegalo ? 'regalos' : esTrueque ? 'trueques' : 'ventas')

  return (
    <div style={s.empty}>
      <div style={s.emptyEmoji}>
        {esRegalo ? '🎁' : esTrueque ? '🔄' : esTodos ? '📦' : '🏷️'}
      </div>
      <h2 style={s.emptyTitle}>
        No hay {label} aún
      </h2>
      <p style={s.emptyText}>
        Sé el primero del barrio en {esRegalo ? 'regalar algo' : esTrueque ? 'proponer un trueque' : 'publicar algo para vender'}.
      </p>
      <button style={s.emptyBtn} onClick={onCrear}>
        <Icon.Plus size={14} />
        {esRegalo ? 'Regalar algo' : esTrueque ? 'Proponer trueque' : 'Publicar algo'}
      </button>
    </div>
  )
}

// ============================================================
// ESTILOS
// ============================================================
const s = {
  wrap: {
    width: '100%',
    height: '100%',
    background: C.fondo,
    fontFamily: T.font,
    overflow: 'hidden',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
  },

  // ---- Sticky top ----
  stickyTop: {
    flexShrink: 0,
    background: C.card,
    zIndex: 10,
    boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
    position: 'relative',
  },

  // ---- Header de sección ----
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 72,
    padding: 'calc(env(safe-area-inset-top, 0px) + 22px) 58px 16px',
    boxSizing: 'border-box',
    position: 'relative',
    backgroundColor: C.card,
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='72' height='64' viewBox='0 0 72 64'%3E%3Cg fill='none' stroke='%2316a34a' stroke-opacity='.22' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M14 13h25l20 20-25 25-20-20V13Z'/%3E%3Ccircle cx='25' cy='24' r='3'/%3E%3C/g%3E%3C/svg%3E")`,
    backgroundSize: '72px 64px',
    backgroundPosition: 'calc(50% - 86px) center',
    backgroundRepeat: 'no-repeat',
    borderBottom: `2px solid ${C.verde}`,
  },
  headerBackBtn: {
    position: 'absolute', left: 16, bottom: 10,
    width: 38, height: 38, padding: 0, border: `1px solid ${C.borde}`,
    borderRadius: '50%', background: 'rgba(255,255,255,0.88)',
    display: 'grid', placeItems: 'center', cursor: 'pointer',
  },
  headerTitleText: {
    minWidth: 0,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 600,
    color: '#26302b',
    fontFamily: T.font,
    lineHeight: 1.2,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    padding: '5px 10px',
    background: 'transparent', border: 'none', boxShadow: 'none',
  },
  headerBrand: { color: C.verde, fontWeight: 700 },
  headerSearchBtn: {
    width: 36, height: 36, borderRadius: '50%',
    border: `1px solid ${C.borde}`, background: 'rgba(255,255,255,0.88)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 0, cursor: 'pointer', flexShrink: 0,
  },
  headerSearchPosition: { position: 'absolute', right: 16, bottom: 11 },
  headerSearchBtnActive: {
    borderColor: C.verde, background: C.verdeSuave,
  },
  headerSearchClose: {
    color: C.verde, fontSize: 22, fontWeight: 400, lineHeight: 1,
  },
  // ---- Fila 1: Buscador ----
  searchBar: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    padding: '8px 16px 4px',
    background: 'transparent',
    boxSizing: 'border-box',
  },
  searchInner: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    height: 46,
    padding: '0 14px',
    background: C.fondo,
    borderRadius: 12,
    border: `1px solid ${C.borde}`,
    fontFamily: T.font,
  },
  searchInput: {
    flex: 1, minWidth: 0,
    border: 'none', outline: 'none', background: 'transparent',
    color: C.texto, fontSize: 14, fontWeight: 500,
    fontFamily: T.font,
  },
  searchClear: {
    width: 26, height: 26, borderRadius: '50%',
    border: 'none', background: C.bordeSuave,
    color: C.textoSuave, fontSize: 18, lineHeight: 1,
    cursor: 'pointer', fontFamily: T.font,
  },
  searchPlaceholder: {
    fontSize: 14,
    color: C.textoTenue,
    fontWeight: 500,
    fontFamily: T.font,
  },

  // ---- Fila 3: Pills (cuadrados) ----
  pillsRow: {
    display: 'flex',
    gap: 6,
    padding: '3px 16px 8px',
    boxSizing: 'border-box',
  },
  pill: {
    flex: 1,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    padding: '8px 5px',
    borderRadius: 11,
    background: 'transparent',
    border: `1px solid ${C.borde}`,
    cursor: 'pointer',
    fontFamily: T.font,
    transition: 'all 0.15s',
    whiteSpace: 'nowrap',
  },
  pillEmoji: { fontSize: 14, lineHeight: 1 },
  pillLabel: { fontSize: 11.5, fontWeight: 600, fontFamily: T.font },
  categoriesRow: {
    display: 'flex', gap: 7, overflowX: 'auto',
    padding: '1px 16px 10px',
    borderBottom: `1px solid ${C.bordeSuave}`,
    WebkitOverflowScrolling: 'touch',
  },
  categoryPill: {
    flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '6px 10px', borderRadius: 999,
    background: C.card, border: `1px solid ${C.borde}`,
    color: C.textoSuave, fontSize: 10.5, fontWeight: 500,
    cursor: 'pointer', fontFamily: T.font, whiteSpace: 'nowrap',
  },
  categoryPillActive: {
    background: C.verdeSuave, borderColor: C.verde,
    color: C.verde, fontWeight: 600,
  },

  // ---- Section wrapper (cada bloque del layout sectional) ----
  section: {
    marginBottom: 24,
  },
  sectionEmoji: {
    fontSize: 16,
    marginRight: 6,
    verticalAlign: '-1px',
  },
  sectionCount: {
    fontSize: 11,
    fontWeight: 600,
    color: C.textoTenue,
    background: C.bordeSuave,
    padding: '2px 8px',
    borderRadius: 999,
    marginLeft: 8,
  },
  sectionEmpty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    padding: '20px 16px',
    background: C.card,
    borderRadius: 14,
    border: `1px dashed ${C.borde}`,
    margin: '0 16px',
  },
  sectionEmptyEmoji: { fontSize: 28, opacity: 0.55 },
  sectionEmptyText: { fontSize: 12.5, color: C.textoTenue, fontFamily: T.font },

  // ---- Horizontal scroll container (compartido por feed + mini sections) ----
  hScroll: {
    display: 'flex',
    gap: 10,
    overflowX: 'auto',
    overflowY: 'hidden',
    padding: '4px 16px 8px',
    scrollSnapType: 'x mandatory',
    WebkitOverflowScrolling: 'touch',
  },

  // ---- Feed card (grande, 72% width, horizontal) ----
  feedCard: {
    flex: '0 0 72%',
    scrollSnapAlign: 'start',
    background: C.card,
    borderRadius: 16,
    overflow: 'hidden',
    border: `1px solid ${C.borde}`,
    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    padding: 0,
    textAlign: 'left',
    fontFamily: T.font,
  },
  feedImgBox: {
    position: 'relative',
    width: '100%',
    aspectRatio: '16/10',
    background: C.fondo,
    overflow: 'hidden',
  },
  feedBody: { padding: '10px 14px 12px' },
  feedTitle: {
    fontSize: 14.5,
    fontWeight: 600,
    color: C.texto,
    marginBottom: 4,
    lineHeight: '18px',
    overflow: 'hidden',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    fontFamily: T.font,
  },
  feedPriceRow: { marginBottom: 6 },
  feedPrice: {
    fontSize: 16,
    fontWeight: 600,
    fontFamily: T.font,
  },

  // ---- Mini card (cuadrado pequeño, ~31% width, 3 por vista) ----
  miniCard: {
    flex: '0 0 31%',
    scrollSnapAlign: 'start',
    background: C.card,
    borderRadius: 14,
    overflow: 'hidden',
    border: `1px solid ${C.borde}`,
    boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    padding: 0,
    textAlign: 'left',
    fontFamily: T.font,
  },
  miniImgBox: {
    position: 'relative',
    width: '100%',
    aspectRatio: '1/1',
    background: C.fondo,
    overflow: 'hidden',
  },
  miniBody: { padding: '6px 8px 8px' },
  miniTitle: {
    fontSize: 11.5,
    fontWeight: 600,
    color: C.texto,
    lineHeight: '14px',
    marginBottom: 3,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontFamily: T.font,
  },
  miniPrice: {
    fontSize: 12.5,
    fontWeight: 600,
    fontFamily: T.font,
  },
  badgeDistMini: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 2,
    padding: '2px 6px',
    borderRadius: 999,
    background: 'rgba(22,163,74,0.92)',
    color: '#fff',
    fontSize: 9,
    fontWeight: 600,
    fontFamily: T.font,
  },

  // ---- Shimmer base (para skeletons) ----
  shimmer: {
    background: `linear-gradient(90deg, ${C.bordeSuave} 25%, ${C.borde} 50%, ${C.bordeSuave} 75%)`,
    backgroundSize: '200% 100%',
    animation: 'mpShimmer 1.4s linear infinite',
  },
  skeletonBar: {
    borderRadius: 4,
    background: `linear-gradient(90deg, ${C.bordeSuave} 25%, ${C.borde} 50%, ${C.bordeSuave} 75%)`,
    backgroundSize: '200% 100%',
    animation: 'mpShimmer 1.4s linear infinite',
  },

  // ---- Título de sección + Ver todos (va en el scroll, no sticky) ----
  sectionRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '2px 0 10px',
    boxSizing: 'border-box',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: C.texto,
    fontFamily: T.font,
    letterSpacing: '-0.3px',
    margin: 0,
  },
  verTodosBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    background: 'transparent',
    border: 'none',
    color: C.verde,
    fontSize: 13,
    fontWeight: 700,
    fontFamily: T.font,
    cursor: 'pointer',
    padding: 0,
  },

  // ---- Scroll area ----
  scrollArea: {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
    WebkitOverflowScrolling: 'touch',
  },

  // ---- Pull-to-refresh ----
  pullIndicator: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    overflow: 'hidden',
    color: C.verde,
    fontSize: 12,
    fontWeight: 600,
    fontFamily: T.font,
  },
  pullSpinner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pullText: {
    color: C.textoSuave,
  },

  // ---- Content ----
  content: {
    padding: '16px 16px 120px',
  },
  marketList: { width: '100%' },
  resultsCount: {
    minWidth: 24, height: 24, padding: '0 7px',
    borderRadius: 999, background: C.verdeSuave,
    color: C.verde, fontSize: 11, fontWeight: 600,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  },
  noResults: {
    minHeight: 180, padding: '24px 20px',
    borderRadius: 16, border: `1px dashed ${C.borde}`,
    background: C.card, color: C.textoSuave,
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', gap: 7,
    textAlign: 'center', fontSize: 13,
  },
  noResultsEmoji: { fontSize: 30, marginBottom: 2 },

  // ---- Section header (sin uso actualmente, se mantiene por compatibilidad) ----
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 10,
    padding: '0 4px',
  },
  sectionCount: {
    fontSize: 11,
    fontWeight: 700,
    color: C.textoTenue,
    background: C.bordeSuave,
    padding: '2px 8px',
    borderRadius: 999,
  },

  // ---- Grid ----
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 9,
  },

  // ---- Normal card ----
  card: {
    background: C.card,
    borderRadius: 16,
    overflow: 'hidden',
    border: `1px solid ${C.borde}`,
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    padding: 0,
    textAlign: 'left',
    fontFamily: T.font,
    animation: 'mpCardIn 0.25s ease-out',
  },
  imgBox: {
    position: 'relative',
    width: '100%',
    aspectRatio: '4/3',
    background: C.fondo,
    overflow: 'hidden',
  },
  img: {
    width: '100%', height: '100%', objectFit: 'cover', display: 'block',
  },
  noImg: {
    width: '100%', height: '100%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: `linear-gradient(135deg, ${C.bordeSuave} 0%, ${C.fondo} 100%)`,
  },
  marketPriceBadge: {
    position: 'absolute', left: 8, bottom: 8,
    maxWidth: 'calc(100% - 16px)',
    padding: '5px 8px', borderRadius: 7,
    background: 'rgba(255,255,255,0.94)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
    fontSize: 11.5, fontWeight: 700,
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  negotiableBadge: {
    position: 'absolute', top: 8, right: 8,
    padding: '4px 7px', borderRadius: 999,
    background: C.verde,
    border: '1px solid rgba(255,255,255,0.9)',
    color: '#fff', fontSize: 9.5, fontWeight: 600,
    boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
    whiteSpace: 'nowrap',
  },
  badgeNuevoSm: {
    position: 'absolute',
    top: 8, left: 8,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 3,
    padding: '3px 7px',
    borderRadius: 999,
    background: C.dorado,
    color: '#fff',
    fontSize: 9.5,
    fontWeight: 600,
    boxShadow: '0 2px 6px rgba(217,119,6,0.4)',
  },
  badgeVerifSm: {
    position: 'absolute',
    top: 8, right: 8,
    width: 20, height: 20,
    borderRadius: '50%',
    background: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
  },
  badgeDistSm: {
    position: 'absolute',
    top: 8, left: 8,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 3,
    padding: '3px 8px',
    borderRadius: 999,
    background: C.verde,
    color: '#fff',
    fontSize: 10.5,
    fontWeight: 600,
    boxShadow: '0 2px 6px rgba(22,163,74,0.45)',
    fontFamily: T.font,
  },

  // ---- CTA "Publica aquí" (botón largo, encima de los cuadrados) ----
  publishCtaWrap: {
    padding: '11px 16px 10px',
    boxSizing: 'border-box',
  },
  publishCta: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    minHeight: 54,
    padding: '10px 11px',
    borderRadius: 13,
    background: 'linear-gradient(120deg, #18ad57 0%, #08743b 100%)',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
    fontFamily: T.font,
    boxShadow: '0 5px 14px rgba(12,126,64,0.18)',
    boxSizing: 'border-box',
    justifyContent: 'flex-start',
    position: 'relative',
    overflow: 'hidden',
  },
  publishCtaIcon: {
    width: 'auto', height: 'auto',
    background: 'transparent', fontSize: 22,
    border: 'none',
    position: 'relative', zIndex: 1,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  publishCtaEmojis: {
    width: 40,
    height: 40,
    borderRadius: 12,
    background: 'rgba(255,255,255,0.18)',
    overflow: 'hidden',
    flexShrink: 0,
    position: 'relative',
  },
  emojiCell: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 22,
    lineHeight: 1,
  },
  publishCtaText: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    position: 'relative', zIndex: 1,
  },
  publishCtaQuestion: {
    fontSize: 13.5,
    fontWeight: 600,
    color: '#fff',
    lineHeight: 1.3,
  },
  publishCtaEyebrow: {
    fontSize: 9.5, fontWeight: 700, color: 'rgba(255,255,255,0.72)',
    letterSpacing: '0.9px', lineHeight: 1.2, marginBottom: 2,
  },
  publishCtaAction: {
    fontSize: 12,
    fontWeight: 700,
    color: '#fff', background: 'rgba(255,255,255,0.14)',
    padding: '7px 9px', borderRadius: 999,
    border: '1px solid rgba(255,255,255,0.26)',
    letterSpacing: 0, lineHeight: 1,
    flexShrink: 0,
    display: 'inline-flex', alignItems: 'center', gap: 5,
    position: 'relative', zIndex: 1,
    boxShadow: '0 3px 8px rgba(22,163,74,0.20)',
  },
  publishCtaArrow: {
    width: 30,
    height: 30,
    borderRadius: '50%',
    background: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
  },
  cardBody: {
    padding: '9px 10px 10px',
  },
  postTitle: {
    fontSize: 12.5,
    fontWeight: 600,
    color: C.texto,
    marginTop: 0,
    marginBottom: 9,
    lineHeight: '15px',
    overflow: 'hidden',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    fontFamily: T.font,
  },
  priceRow: {
    marginBottom: 2,
  },
  priceSm: {
    fontSize: 14.5,
    fontWeight: 600,
    fontFamily: T.font,
  },
  marketAuthor: {
    display: 'flex', alignItems: 'center', gap: 4,
    minWidth: 0,
  },
  marketAuthorAvatar: {
    width: 18, height: 18, borderRadius: '50%',
    objectFit: 'cover', flexShrink: 0,
  },
  marketAuthorFallback: {
    width: 18, height: 18, borderRadius: '50%',
    background: C.verdeSuave, color: C.verde,
    fontSize: 7, fontWeight: 700,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  marketAuthorName: {
    minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    fontSize: 10.5, fontWeight: 600, color: C.textoSuave,
  },
  marketTime: {
    marginLeft: 'auto', flexShrink: 0,
    fontSize: 9.5, color: C.textoTenue,
    display: 'inline-flex', alignItems: 'center', gap: 2,
  },
  dividerSm: {
    height: 1,
    background: C.bordeSuave,
    margin: '0 0 5px 0',
  },
  authorBlockSm: {
    display: 'flex', alignItems: 'center', gap: 6,
  },
  avatarSm: {
    width: 22, height: 22, borderRadius: '50%', objectFit: 'cover',
    flexShrink: 0,
  },
  avatarSmFallback: {
    width: 22, height: 22, borderRadius: '50%',
    background: C.verde, color: '#fff',
    fontSize: 9, fontWeight: 600,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  authorInfoSm: {
    flex: 1, minWidth: 0,
  },
  authorNameSm: {
    fontSize: 11.5, fontWeight: 700, color: C.texto,
    display: 'block',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  authorMetaSm: {
    display: 'flex', alignItems: 'center', gap: 3,
    marginTop: 1,
    fontSize: 10, color: C.textoTenue, fontWeight: 600,
  },
  dotSepSm: { opacity: 0.5, margin: '0 1px' },

  // ---- Skeletons (con shimmer) ----
  skeletonFeatured: {
    width: '100%',
    aspectRatio: '16/13',
    borderRadius: 18,
    marginBottom: 16,
    background: `linear-gradient(90deg, ${C.bordeSuave} 25%, ${C.borde} 50%, ${C.bordeSuave} 75%)`,
    backgroundSize: '200% 100%',
    animation: 'mpShimmer 1.4s linear infinite',
  },
  skeletonCard: {
    background: C.card,
    borderRadius: 16,
    overflow: 'hidden',
    border: `1px solid ${C.borde}`,
  },
  skeletonImg: {
    width: '100%',
    aspectRatio: '1/1',
    background: `linear-gradient(90deg, ${C.bordeSuave} 25%, ${C.borde} 50%, ${C.bordeSuave} 75%)`,
    backgroundSize: '200% 100%',
    animation: 'mpShimmer 1.4s linear infinite',
  },
  skeletonBody: {
    padding: '10px 12px 12px',
  },
  skeletonLine1: {
    height: 12, width: '90%',
    borderRadius: 4, marginBottom: 6,
    background: `linear-gradient(90deg, ${C.bordeSuave} 25%, ${C.borde} 50%, ${C.bordeSuave} 75%)`,
    backgroundSize: '200% 100%',
    animation: 'mpShimmer 1.4s linear infinite',
  },
  skeletonLine2: {
    height: 12, width: '60%',
    borderRadius: 4, marginBottom: 10,
    background: `linear-gradient(90deg, ${C.bordeSuave} 25%, ${C.borde} 50%, ${C.bordeSuave} 75%)`,
    backgroundSize: '200% 100%',
    animation: 'mpShimmer 1.4s linear infinite',
  },
  skeletonAvatar: {
    height: 16, width: '70%',
    borderRadius: 4,
    background: `linear-gradient(90deg, ${C.bordeSuave} 25%, ${C.borde} 50%, ${C.bordeSuave} 75%)`,
    backgroundSize: '200% 100%',
    animation: 'mpShimmer 1.4s linear infinite',
  },

  // ---- Empty state ----
  empty: {
    textAlign: 'center',
    padding: '60px 24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: C.texto,
    margin: '0 0 8px',
    letterSpacing: '-0.2px',
  },
  emptyText: {
    fontSize: 14,
    color: C.textoSuave,
    lineHeight: 1.5,
    margin: '0 0 24px',
    maxWidth: 280,
  },
  emptyBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '14px 24px',
    background: C.verde,
    color: '#fff',
    border: 'none',
    borderRadius: 999,
    fontSize: 14,
    fontWeight: 600,
    fontFamily: T.font,
    cursor: 'pointer',
    boxShadow: '0 6px 16px rgba(22,163,74,0.3)',
  },

  // ---- New posts banner (real-time) ----
  newPostsBanner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    padding: '10px 14px',
    marginBottom: 12,
    background: C.verde,
    color: '#fff',
    border: 'none',
    borderRadius: 999,
    fontSize: 12.5,
    fontWeight: 600,
    fontFamily: T.font,
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(22,163,74,0.35)',
    animation: 'mpCardIn 0.3s ease-out',
  },
  newPostsArrow: {
    fontSize: 13,
    fontWeight: 700,
  },

  // ---- Sentinel (infinite scroll loader) ----
  sentinel: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '20px 0 12px',
    color: C.textoSuave,
    fontSize: 12,
    fontWeight: 600,
    fontFamily: T.font,
  },
  sentinelSpinner: {
    width: 16,
    height: 16,
    borderRadius: '50%',
    border: `2px solid ${C.borde}`,
    borderTopColor: C.verde,
    animation: 'mpSpin 0.8s linear infinite',
  },
  sentinelText: {
    color: C.textoTenue,
  },

  // ---- End of feed ----
  endOfFeed: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    padding: '32px 0 16px',
    textAlign: 'center',
  },
  endOfFeedEmoji: {
    fontSize: 32,
    marginBottom: 4,
  },
  endOfFeedText: {
    fontSize: 13.5,
    fontWeight: 600,
    color: C.texto,
    fontFamily: T.font,
  },
  endOfFeedHint: {
    fontSize: 11.5,
    color: C.textoTenue,
    fontFamily: T.font,
  },
}
