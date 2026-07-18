import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { C, T, S, TIPOS, CATEGORIAS, COMERCIOS, iniciales, hace, plata } from '../lib/design'

// ============================================================
// Search.jsx — Buscador global de El Barrio
// Busca en: posts (venta/regalo/trueque/pedidos), comercios,
// eventos y vecinos. Todo en una pantalla, con tabs.
// ============================================================

// ---- Iconos SVG (mismo estilo que Marketplace/Alertas) ----
const Icon = {
  Back: ({ size = 22, color = C.texto }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  ),
  Search: ({ size = 18, color = C.textoTenue }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  Close: ({ size = 18, color = C.textoTenue }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  Pin: ({ size = 11, color = C.verde }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
    </svg>
  ),
  Star: ({ size = 11, color = '#f59e0b' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke={color} strokeWidth="1">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  ),
  Calendar: ({ size = 12, color = C.textoTenue }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  Users: ({ size = 12, color = C.textoTenue }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  Verified: ({ size = 11, color = C.verde }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="8 12 11 15 16 9" stroke="#fff" fill="none"/>
    </svg>
  ),
  Clock: ({ size = 11, color = C.textoTenue }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  Empty: ({ size = 64, color = C.textoTenue }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      <line x1="8" y1="11" x2="14" y2="11" opacity="0.5"/>
    </svg>
  ),
  Sparkle: ({ size = 14, color = C.dorado }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none">
      <path d="M12 2l1.5 6.5L20 10l-6.5 1.5L12 18l-1.5-6.5L4 10l6.5-1.5L12 2z"/>
    </svg>
  ),
}

// ---- Tabs ----
const TABS = [
  { id: 'todos',     label: 'Todos',     emoji: '🔎' },
  { id: 'posts',     label: 'Marketplace', emoji: '🏷️' },
  { id: 'comercios', label: 'Comercios', emoji: '🏪' },
  { id: 'eventos',   label: 'Eventos',   emoji: '📅' },
  { id: 'vecinos',   label: 'Vecinos',   emoji: '👥' },
]

// ---- Tipos de posts que SÍ queremos en búsqueda (excluye alertas y avisos) ----
const POST_TYPES = ['sell', 'venta', 'vender', 'gift', 'regalo', 'regalar', 'trade', 'trueque', 'intercambio', 'request', 'event']

// ---- Sugerencias trending (chips rápidos) ----
const SUGERENCIAS = [
  { label: 'Bicicletas', q: 'bicicleta', emoji: '🚲' },
  { label: 'Muebles',    q: 'mueble',    emoji: '🪑' },
  { label: 'Tecnología', q: 'tecnología', emoji: '📱' },
  { label: 'Mascotas',   q: 'mascota',   emoji: '🐾' },
  { label: 'Herramientas', q: 'herramienta', emoji: '🔨' },
  { label: 'Ropa',       q: 'ropa',      emoji: '👕' },
  { label: 'Libros',     q: 'libro',     emoji: '📚' },
  { label: 'Juguetes',   q: 'juguete',   emoji: '🧸' },
]

// ---- Mapeo tipo → estilo ----
const tipoInfo = (type) => TIPOS[type] || TIPOS.general

// ---- Categoría emoji (para posts sin imagen) ----
const catEmoji = (cat) => {
  if (!cat) return '📦'
  const found = CATEGORIAS.find(c => cat.toLowerCase().includes(c.key.toLowerCase()))
  return found ? found.emoji : '📦'
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export default function Search({ currentUser, onNavigate }) {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [activeTab, setActiveTab] = useState('todos')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState({ posts: [], comercios: [], eventos: [], vecinos: [] })
  const [recentSearches, setRecentSearches] = useState([])
  const [hasSearched, setHasSearched] = useState(false)
  const inputRef = useRef(null)
  const debounceRef = useRef(null)

  const nav = onNavigate || (() => {})

  // ---- Cargar búsquedas recientes de localStorage ----
  useEffect(() => {
    try {
      const stored = localStorage.getItem('elbarrio:recent_searches')
      if (stored) setRecentSearches(JSON.parse(stored).slice(0, 6))
    } catch {}
    // Autofocus al input
    if (inputRef.current) inputRef.current.focus()
  }, [])

  // ---- Debounce: 350ms después de la última tecla ----
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const q = query.trim()
    if (!q) {
      setDebouncedQuery('')
      setHasSearched(false)
      setResults({ posts: [], comercios: [], eventos: [], vecinos: [] })
      return
    }
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(q)
      setHasSearched(true)
      saveRecentSearch(q)
    }, 350)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  // ---- Guardar búsqueda reciente ----
  const saveRecentSearch = (q) => {
    try {
      const stored = localStorage.getItem('elbarrio:recent_searches')
      let arr = stored ? JSON.parse(stored) : []
      arr = arr.filter(s => s.toLowerCase() !== q.toLowerCase())
      arr.unshift(q)
      arr = arr.slice(0, 6)
      localStorage.setItem('elbarrio:recent_searches', JSON.stringify(arr))
      setRecentSearches(arr)
    } catch {}
  }

  const clearRecentSearches = () => {
    try {
      localStorage.removeItem('elbarrio:recent_searches')
      setRecentSearches([])
    } catch {}
  }

  // ---- Búsqueda real a Supabase ----
  const runSearch = useCallback(async (q) => {
    if (!q) return
    setLoading(true)
    const like = `%${q}%`
    const lowerQ = q.toLowerCase()

    // Filtramos por barrio del usuario si tiene neighborhood_id
    const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }))
    let hoodId = null
    if (user) {
      const { data: prof } = await supabase
        .from('profiles')
        .select('neighborhood_id')
        .eq('user_id', user.id)
        .maybeSingle()
      hoodId = prof?.neighborhood_id || null
    }

    // Lanzamos las 4 queries en paralelo
    const [postsRes, comerciosRes, eventosRes, vecinosRes] = await Promise.all([
      // POSTS (venta/regalo/trueque/pedidos/eventos — no alertas)
      supabase
        .from('posts')
        .select(`*, author:profiles!author_id (full_name, avatar_url, reputation_score, badge_founder, badge_trusted_seller)`)
        .in('type', POST_TYPES)
        .eq('status', 'active')
        .or(`title.ilike.${like},content.ilike.${like}`)
        .order('created_at', { ascending: false })
        .limit(20),

      // COMERCIOS
      supabase
        .from('commerces')
        .select('*')
        .eq('is_active', true)
        .or(`name.ilike.${like},description.ilike.${like}`)
        .order('is_premium', { ascending: false })
        .order('rating', { ascending: false })
        .limit(10),

      // EVENTOS (posts tipo event con starts_at futura)
      supabase
        .from('posts')
        .select(`*, author:profiles!author_id (full_name, avatar_url)`)
        .eq('type', 'event')
        .eq('status', 'active')
        .gte('starts_at', new Date().toISOString())
        .or(`title.ilike.${like},content.ilike.${like}`)
        .order('starts_at', { ascending: true })
        .limit(10),

      // VECINOS (profiles con nombre que coincida)
      supabase
        .from('profiles')
        .select('id, user_id, full_name, avatar_url, reputation_score, badge_founder, badge_trusted_seller, member_since, total_sales, total_gifts')
        .not('full_name', 'is', null)
        .ilike('full_name', like)
        .limit(10),
    ])

    setResults({
      posts: postsRes.data || [],
      comercios: comerciosRes.data || [],
      eventos: eventosRes.data || [],
      vecinos: vecinosRes.data || [],
    })
    setLoading(false)
  }, [])

  // ---- Disparar búsqueda cuando cambia debouncedQuery ----
  useEffect(() => {
    if (debouncedQuery) runSearch(debouncedQuery)
  }, [debouncedQuery, runSearch])

  // ---- Click en resultado ----
  const goPost = (p) => nav('productdetail', { postId: p.id })
  const goComercio = (c) => nav('comercios') // por ahora: vuelve al directorio filtrado
  const goEvento = (e) => nav('productdetail', { postId: e.id })
  const goVecino = (v) => nav('sellerprofile', { userId: v.user_id || v.id })

  // ---- Conteo total de resultados ----
  const totalCount =
    results.posts.length + results.comercios.length +
    results.eventos.length + results.vecinos.length

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div style={{ minHeight: '100%', background: C.fondo }}>
      {/* ===== HEADER STICKY ===== */}
      <div style={s.header}>
        <button style={s.backBtn} onClick={() => nav('back')} aria-label="Volver">
          <Icon.Back />
        </button>
        <div style={s.searchBox}>
          <Icon.Search />
          <input
            ref={inputRef}
            type="text"
            placeholder="Buscar en el barrio…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={s.searchInput}
            autoComplete="off"
            spellCheck={false}
          />
          {query && (
            <button style={s.clearBtn} onClick={() => { setQuery(''); inputRef.current?.focus() }} aria-label="Limpiar">
              <Icon.Close />
            </button>
          )}
        </div>
      </div>

      {/* ===== BODY ===== */}
      <div style={S.pantalla}>

        {/* ---- ESTADO 1: sin búsqueda ---- */}
        {!hasSearched && (
          <SinBusqueda
            recentSearches={recentSearches}
            onPickRecent={(q) => setQuery(q)}
            onClearRecent={clearRecentSearches}
            onPickSugerencia={(q) => setQuery(q)}
          />
        )}

        {/* ---- ESTADO 2: buscando ---- */}
        {hasSearched && (
          <>
            {/* Tabs */}
            <div style={s.tabsRow}>
              {TABS.map(t => {
                const count =
                  t.id === 'posts' ? results.posts.length :
                  t.id === 'comercios' ? results.comercios.length :
                  t.id === 'eventos' ? results.eventos.length :
                  t.id === 'vecinos' ? results.vecinos.length :
                  totalCount
                const isActive = activeTab === t.id
                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    style={{
                      ...s.tab,
                      ...(isActive ? s.tabActive : {}),
                    }}
                  >
                    <span style={{ fontSize: 14 }}>{t.emoji}</span>
                    <span>{t.label}</span>
                    {count > 0 && (
                      <span style={{ ...s.tabBadge, background: isActive ? C.verde : C.borde, color: isActive ? '#fff' : C.textoSuave }}>
                        {count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Resumen */}
            <div style={s.resumen}>
              {loading ? (
                <span style={{ color: C.textoTenue }}>Buscando “{debouncedQuery}”…</span>
              ) : (
                <span>
                  <strong style={{ color: C.texto }}>{totalCount}</strong>
                  <span style={{ color: C.textoTenue }}> resultado{totalCount === 1 ? '' : 's'} para “{debouncedQuery}”</span>
                </span>
              )}
            </div>

            {/* Resultados por tab */}
            {(activeTab === 'todos' || activeTab === 'posts') && (
              <SeccionResultados
                titulo="Marketplace"
                emoji="🏷️"
                items={results.posts}
                loading={loading}
                showCount={activeTab === 'todos'}
                render={(p) => <PostRow key={p.id} post={p} onClick={() => goPost(p)} />}
                onSeeAll={activeTab === 'todos' && results.posts.length > 5 ? () => setActiveTab('posts') : null}
                emptyText="No hay publicaciones que coincidan."
              />
            )}

            {(activeTab === 'todos' || activeTab === 'comercios') && (
              <SeccionResultados
                titulo="Comercios"
                emoji="🏪"
                items={results.comercios}
                loading={loading}
                showCount={activeTab === 'todos'}
                render={(c) => <ComercioRow key={c.id} comercio={c} onClick={() => goComercio(c)} />}
                onSeeAll={activeTab === 'todos' && results.comercios.length > 5 ? () => setActiveTab('comercios') : null}
                emptyText="No hay comercios que coincidan."
              />
            )}

            {(activeTab === 'todos' || activeTab === 'eventos') && (
              <SeccionResultados
                titulo="Eventos"
                emoji="📅"
                items={results.eventos}
                loading={loading}
                showCount={activeTab === 'todos'}
                render={(e) => <EventoRow key={e.id} evento={e} onClick={() => goEvento(e)} />}
                onSeeAll={activeTab === 'todos' && results.eventos.length > 5 ? () => setActiveTab('eventos') : null}
                emptyText="No hay eventos que coincidan."
              />
            )}

            {(activeTab === 'todos' || activeTab === 'vecinos') && (
              <SeccionResultados
                titulo="Vecinos"
                emoji="👥"
                items={results.vecinos}
                loading={loading}
                showCount={activeTab === 'todos'}
                render={(v) => <VecinoRow key={v.id} vecino={v} onClick={() => goVecino(v)} />}
                onSeeAll={activeTab === 'todos' && results.vecinos.length > 5 ? () => setActiveTab('vecinos') : null}
                emptyText="No hay vecinos con ese nombre."
              />
            )}

            {/* Estado vacío global (cuando no hay nada en ninguna categoría) */}
            {!loading && totalCount === 0 && (
              <EstadoVacio query={debouncedQuery} onPickSugerencia={(q) => setQuery(q)} />
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ============================================================
// ESTADO: SIN BÚSQUEDA (recientes + sugerencias)
// ============================================================
function SinBusqueda({ recentSearches, onPickRecent, onClearRecent, onPickSugerencia }) {
  return (
    <div style={{ paddingTop: 8 }}>
      {/* Búsquedas recientes */}
      {recentSearches.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={s.sectionHeader}>
            <span style={s.sectionTitle}>🕐 Recientes</span>
            <button style={s.linkBtn} onClick={onClearRecent}>Borrar</button>
          </div>
          <div style={s.chipsRow}>
            {recentSearches.map((q, i) => (
              <button key={i} style={s.chipReciente} onClick={() => onPickRecent(q)}>
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sugerencias trending */}
      <div>
        <div style={s.sectionHeader}>
          <span style={s.sectionTitle}><Icon.Sparkle size={14} /> Sugerencias</span>
        </div>
        <p style={{ ...T.meta, color: C.textoTenue, marginTop: 0, marginBottom: 10 }}>
          Toca para buscar rápido
        </p>
        <div style={s.chipsGrid}>
          {SUGERENCIAS.map((s, i) => (
            <button key={i} style={s.chipSugerencia} onClick={() => onPickSugerencia(s.q)}>
              <span style={{ fontSize: 20 }}>{s.emoji}</span>
              <span style={{ ...T.chip, color: C.texto }}>{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tip ayuda */}
      <div style={s.tipBox}>
        <span style={{ fontSize: 22 }}>💡</span>
        <div>
          <p style={{ ...T.cardTit, color: C.texto, margin: 0, marginBottom: 2 }}>
            Busca en todo tu barrio
          </p>
          <p style={{ ...T.meta, color: C.textoSuave, margin: 0 }}>
            Publicaciones, comercios, eventos y vecinos — todo en un solo lugar.
          </p>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// SECCIÓN DE RESULTADOS (con header, lista, "ver todo")
// ============================================================
function SeccionResultados({ titulo, emoji, items, loading, showCount, render, onSeeAll, emptyText }) {
  // En modo "todos" solo mostramos hasta 5
  const visible = showCount ? items.slice(0, 5) : items

  if (loading && items.length === 0) {
    return (
      <div style={{ marginBottom: 24 }}>
        <div style={s.sectionHeader}>
          <span style={s.sectionTitle}>{emoji} {titulo}</span>
        </div>
        {[1, 2, 3].map(i => <SkeletonRow key={i} />)}
      </div>
    )
  }

  if (items.length === 0) return null

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={s.sectionHeader}>
        <span style={s.sectionTitle}>
          {emoji} {titulo}
          <span style={{ ...s.countBadge, marginLeft: 8 }}>{items.length}</span>
        </span>
        {onSeeAll && (
          <button style={s.linkBtn} onClick={onSeeAll}>Ver todos</button>
        )}
      </div>
      <div style={s.listColumn}>
        {visible.map(render)}
      </div>
      {!showCount && items.length === 0 && (
        <p style={{ ...T.cuerpo, color: C.textoTenue, textAlign: 'center', padding: '20px 0' }}>
          {emptyText}
        </p>
      )}
    </div>
  )
}

// ============================================================
// ROW: POST (venta / regalo / trueque / pedido / evento-like)
// ============================================================
function PostRow({ post, onClick }) {
  const tipo = tipoInfo(post.type)
  const hasImg = post.images && post.images.length > 0
  const img = hasImg ? post.images[0] : null

  const precioLabel = () => {
    const t = (post.type || '').toLowerCase()
    if (['gift', 'regalo', 'regalar'].includes(t)) return 'Gratis'
    if (['trade', 'trueque', 'intercambio'].includes(t)) return 'Trueque'
    if (post.price) return plata(post.price)
    return 'Consultar'
  }

  return (
    <button style={s.rowCard} onClick={onClick}>
      {/* Imagen o emoji placeholder */}
      <div style={s.thumbBox}>
        {img ? (
          <img src={img} alt={post.title || 'publicación'} style={s.thumbImg} />
        ) : (
          <span style={{ fontSize: 26 }}>{catEmoji(post.category)}</span>
        )}
        {/* Badge tipo */}
        <span style={{ ...s.thumbBadge, background: tipo.color }}>
          {tipo.emoji}
        </span>
      </div>

      {/* Texto */}
      <div style={s.rowBody}>
        <div style={s.rowTitleLine}>
          <span style={s.rowTitle}>{post.title || 'Sin título'}</span>
        </div>
        <div style={s.rowMeta}>
          <span style={{ ...s.pillPrecio, background: tipo.bg, color: tipo.color }}>
            {precioLabel()}
          </span>
          {post.author?.full_name && (
            <span style={{ ...T.meta, color: C.textoTenue }}>
              · {post.author.full_name.split(' ')[0]}
            </span>
          )}
        </div>
        <div style={s.rowFooter}>
          <Icon.Clock /> <span>{hace(post.created_at)}</span>
        </div>
      </div>
    </button>
  )
}

// ============================================================
// ROW: COMERCIO
// ============================================================
function ComercioRow({ comercio, onClick }) {
  const cat = comercio.category && COMERCIOS[comercio.category]
    ? COMERCIOS[comercio.category]
    : COMERCIOS.Otro

  return (
    <button style={s.rowCard} onClick={onClick}>
      <div style={{ ...s.thumbBox, background: cat.bg }}>
        {comercio.logo_url ? (
          <img src={comercio.logo_url} alt={comercio.name} style={s.thumbImg} />
        ) : (
          <span style={{ fontSize: 26 }}>{cat.emoji}</span>
        )}
        {comercio.is_premium && (
          <span style={{ ...s.thumbBadge, background: C.dorado }}>⭐</span>
        )}
      </div>
      <div style={s.rowBody}>
        <div style={s.rowTitleLine}>
          <span style={s.rowTitle}>{comercio.name}</span>
        </div>
        <div style={s.rowMeta}>
          <span style={{ ...s.pillPrecio, background: cat.bg, color: cat.color }}>
            {comercio.category || 'Comercio'}
          </span>
          {comercio.rating > 0 && (
            <span style={{ ...T.meta, color: C.textoTenue, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              · <Icon.Star /> {Number(comercio.rating).toFixed(1)}
            </span>
          )}
        </div>
        <div style={s.rowFooter}>
          {comercio.discount_text ? (
            <>
              <Icon.Sparkle size={11} color={C.dorado} />
              <span style={{ color: C.dorado, fontWeight: 700 }}>{comercio.discount_text}</span>
            </>
          ) : comercio.address ? (
            <>
              <Icon.Pin /> <span>{comercio.address.split(',').slice(-1)[0].trim()}</span>
            </>
          ) : null}
        </div>
      </div>
    </button>
  )
}

// ============================================================
// ROW: EVENTO
// ============================================================
function EventoRow({ evento, onClick }) {
  const fecha = evento.starts_at ? new Date(evento.starts_at) : null
  const dia = fecha ? fecha.getDate() : '?'
  const mes = fecha ? ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'][fecha.getMonth()] : ''
  const hora = fecha ? `${fecha.getHours().toString().padStart(2,'0')}:${fecha.getMinutes().toString().padStart(2,'0')}` : ''

  return (
    <button style={s.rowCard} onClick={onClick}>
      <div style={{ ...s.thumbBox, background: C.verdeSuave }}>
        <div style={{ textAlign: 'center', lineHeight: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.verdeOsc }}>{dia}</div>
          <div style={{ fontSize: 9, fontWeight: 800, color: C.verde, letterSpacing: 0.5 }}>{mes}</div>
        </div>
      </div>
      <div style={s.rowBody}>
        <div style={s.rowTitleLine}>
          <span style={s.rowTitle}>{evento.title || 'Evento'}</span>
        </div>
        <div style={s.rowMeta}>
          <span style={{ ...s.pillPrecio, background: C.verdeSuave, color: C.verdeOsc }}>
            📅 Evento
          </span>
          {hora && (
            <span style={{ ...T.meta, color: C.textoTenue, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              · <Icon.Clock /> {hora}
            </span>
          )}
        </div>
        <div style={s.rowFooter}>
          {evento.content && (
            <span style={{ color: C.textoTenue, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {evento.content.slice(0, 60)}{evento.content.length > 60 ? '…' : ''}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

// ============================================================
// ROW: VECINO
// ============================================================
function VecinoRow({ vecino, onClick }) {
  const nombre = vecino.full_name || 'Vecino'
  const inicialesStr = iniciales(nombre)
  const rep = vecino.reputation_score || 0
  const isFounder = vecino.badge_founder
  const isTrusted = vecino.badge_trusted_seller

  return (
    <button style={s.rowCard} onClick={onClick}>
      <div style={s.thumbBox}>
        {vecino.avatar_url ? (
          <img src={vecino.avatar_url} alt={nombre} style={s.thumbImg} />
        ) : (
          <div style={s.avatarFallback}>{inicialesStr}</div>
        )}
        {isTrusted && (
          <span style={{ ...s.thumbBadge, background: C.verde }}>
            <Icon.Verified size={9} color="#fff" />
          </span>
        )}
      </div>
      <div style={s.rowBody}>
        <div style={s.rowTitleLine}>
          <span style={s.rowTitle}>{nombre}</span>
          {isFounder && <span style={s.founderPill}>🏅 Fundador</span>}
        </div>
        <div style={s.rowMeta}>
          {rep > 0 && (
            <span style={{ ...T.meta, color: C.verde, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              <Icon.Star color={C.verde} /> {rep}
            </span>
          )}
          {typeof vecino.total_sales === 'number' && vecino.total_sales > 0 && (
            <span style={{ ...T.meta, color: C.textoTenue }}>
              · {vecino.total_sales} venta{vecino.total_sales === 1 ? '' : 's'}
            </span>
          )}
          {typeof vecino.total_gifts === 'number' && vecino.total_gifts > 0 && (
            <span style={{ ...T.meta, color: C.textoTenue }}>
              · {vecino.total_gifts} regalo{vecino.total_gifts === 1 ? '' : 's'}
            </span>
          )}
        </div>
        <div style={s.rowFooter}>
          {vecino.member_since && (
            <>
              <Icon.Users /> <span>Vecino desde {new Date(vecino.member_since).getFullYear()}</span>
            </>
          )}
        </div>
      </div>
    </button>
  )
}

// ============================================================
// SKELETON
// ============================================================
function SkeletonRow() {
  return (
    <div style={{ ...s.rowCard, cursor: 'default' }}>
      <div style={{ ...s.thumbBox, background: C.bordeSuave }} />
      <div style={s.rowBody}>
        <div style={{ height: 16, background: C.bordeSuave, borderRadius: 6, width: '70%', marginBottom: 8 }} />
        <div style={{ height: 12, background: C.bordeSuave, borderRadius: 6, width: '40%', marginBottom: 6 }} />
        <div style={{ height: 10, background: C.bordeSuave, borderRadius: 6, width: '30%' }} />
      </div>
    </div>
  )
}

// ============================================================
// ESTADO VACÍO
// ============================================================
function EstadoVacio({ query, onPickSugerencia }) {
  return (
    <div style={s.emptyBox}>
      <Icon.Empty />
      <h2 style={{ ...T.titulo, marginTop: 12, marginBottom: 4 }}>
        No encontramos “{query}”
      </h2>
      <p style={{ ...T.cuerpo, color: C.textoSuave, marginTop: 0, marginBottom: 16, textAlign: 'center' }}>
        Probá con otra palabra, o tocá una sugerencia:
      </p>
      <div style={s.chipsGrid}>
        {SUGERENCIAS.slice(0, 4).map((s, i) => (
          <button key={i} style={s.chipSugerencia} onClick={() => onPickSugerencia(s.q)}>
            <span style={{ fontSize: 20 }}>{s.emoji}</span>
            <span style={{ ...T.chip, color: C.texto }}>{s.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ============================================================
// ESTILOS
// ============================================================
const s = {
  // ---- Header ----
  header: {
    position: 'sticky',
    top: 0,
    zIndex: 10,
    background: C.card,
    padding: '14px 12px 12px',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    borderBottom: `1px solid ${C.borde}`,
    boxShadow: '0 1px 8px rgba(0,0,0,0.03)',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    background: 'transparent',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
  },
  searchBox: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    background: C.fondo,
    border: `1.5px solid ${C.borde}`,
    borderRadius: 14,
    padding: '10px 14px',
    transition: 'border-color 0.15s',
  },
  searchInput: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    fontSize: 15.5,
    color: C.texto,
    fontFamily: T.font,
    minWidth: 0,
  },
  clearBtn: {
    width: 24,
    height: 24,
    borderRadius: '50%',
    background: C.borde,
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
  },

  // ---- Tabs ----
  tabsRow: {
    display: 'flex',
    gap: 6,
    overflowX: 'auto',
    padding: '4px 0 14px',
    marginTop: 4,
    scrollbarWidth: 'none',
  },
  tab: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 12px',
    borderRadius: 999,
    background: C.card,
    border: `1px solid ${C.borde}`,
    fontSize: 13,
    fontWeight: 700,
    color: C.textoSuave,
    cursor: 'pointer',
    flexShrink: 0,
    fontFamily: T.font,
    transition: 'all 0.15s',
  },
  tabActive: {
    background: C.verdeOsc,
    color: '#fff',
    border: `1px solid ${C.verdeOsc}`,
  },
  tabBadge: {
    fontSize: 10,
    fontWeight: 800,
    padding: '2px 6px',
    borderRadius: 999,
    minWidth: 18,
    textAlign: 'center',
  },

  // ---- Resumen ----
  resumen: {
    fontSize: 13,
    color: C.textoSuave,
    marginBottom: 12,
    fontFamily: T.font,
  },

  // ---- Secciones ----
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 800,
    color: C.texto,
    fontFamily: T.font,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
  },
  countBadge: {
    fontSize: 11,
    fontWeight: 700,
    color: C.textoTenue,
    background: C.bordeSuave,
    padding: '2px 8px',
    borderRadius: 999,
  },
  linkBtn: {
    background: 'transparent',
    border: 'none',
    color: C.verde,
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: T.font,
    padding: 0,
  },
  listColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },

  // ---- Row card (cada resultado) ----
  rowCard: {
    display: 'flex',
    alignItems: 'stretch',
    gap: 12,
    background: C.card,
    border: `1px solid ${C.borde}`,
    borderRadius: 14,
    padding: 10,
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
    transition: 'transform 0.1s, box-shadow 0.15s',
  },
  thumbBox: {
    position: 'relative',
    width: 64,
    height: 64,
    borderRadius: 12,
    background: C.fondo,
    border: `1px solid ${C.bordeSuave}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  thumbImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  thumbBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 10,
    border: '2px solid #fff',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    background: C.verdeSuave,
    color: C.verdeOsc,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 18,
    fontWeight: 800,
  },

  rowBody: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    minWidth: 0,
    gap: 4,
  },
  rowTitleLine: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: C.texto,
    fontFamily: T.font,
    lineHeight: 1.3,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '100%',
  },
  rowMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  pillPrecio: {
    fontSize: 11,
    fontWeight: 800,
    padding: '3px 8px',
    borderRadius: 999,
  },
  rowFooter: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    fontSize: 11.5,
    color: C.textoTenue,
    fontFamily: T.font,
    fontWeight: 500,
  },
  founderPill: {
    fontSize: 10,
    fontWeight: 800,
    color: C.dorado,
    background: C.doradoSuave,
    padding: '2px 7px',
    borderRadius: 999,
  },

  // ---- Chips (recientes + sugerencias) ----
  chipsRow: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
  },
  chipReciente: {
    padding: '8px 14px',
    background: C.card,
    border: `1px solid ${C.borde}`,
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 600,
    color: C.texto,
    cursor: 'pointer',
    fontFamily: T.font,
  },
  chipsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 8,
  },
  chipSugerencia: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 14px',
    background: C.card,
    border: `1px solid ${C.borde}`,
    borderRadius: 14,
    cursor: 'pointer',
    fontFamily: T.font,
    textAlign: 'left',
  },

  // ---- Tip box ----
  tipBox: {
    display: 'flex',
    gap: 12,
    alignItems: 'flex-start',
    background: C.verdeBg,
    border: `1px solid ${C.verdeSuave}`,
    borderRadius: 14,
    padding: 14,
    marginTop: 24,
  },

  // ---- Empty ----
  emptyBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '40px 20px',
    textAlign: 'center',
  },
}
