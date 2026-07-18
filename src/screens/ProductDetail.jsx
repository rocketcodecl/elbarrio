import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { C, T, S, TIPOS, CATEGORIAS, iniciales, hace, plata, distancia } from '../lib/design'

// ============================================================
// ProductDetail.jsx — v2
// Pantalla de detalle de publicación. Aterrizaje del feed del Mercado.
//
// Cambios vs v1:
//   · Imports completos del design system (C, T, S, TIPOS, CATEGORIAS,
//     iniciales, hace, plata, distancia). v1 solo importaba T.
//   · Tipografía ligera: máximo fontWeight 600 (títulos/precios) y 500-600
//     en el resto. v1 usaba 800/700 → "negrita brutal".
//   · C.verde (#16a34a) en TODO lo verde. v1 hardcodeaba el hex.
//   · Iconos SVG lineales strokeWidth 1.9-2.4, mismo lenguaje que TabBar y
//     Marketplace. v1 tenía su propio set más pesado.
//   · Likes reales con optimistic UI + rollback + sync de likes_count.
//   · Contador de vistas: incrementa views_count 1 vez por montaje.
//   · Comentarios en tiempo real (canal Supabase), con input + Enter para
//     enviar y estado vacío cálido.
//   · Productos similares: fila horizontal scroll-snap con tarjetas mini.
//   · Share funcional: Web Share API con fallback a clipboard + toast.
//   · Lightbox al tocar la imagen principal (fullscreen + zoom + cerrar).
//   · Badge de tipo (Venta/Regalo/Trueque) con color de marca del TIPO.
//   · Skeleton de carga que replica el layout (galería + título + chips).
//   · Safe area en bottom bar (padding-bottom env(safe-area-inset-bottom)).
//   · Distancia real con GPS del navegador + fallback a coords del perfil.
//   · Empty state cálido cuando el post ya no existe.
// ============================================================

// ─────────────────────────────────────────────
// ESTILOS INYECTADOS (keyframes)
// ─────────────────────────────────────────────
const INJECT_STYLE = `
@keyframes pdPulseRing {
  0%   { transform: scale(0.5); opacity: 0.55; }
  80%  { transform: scale(2.6); opacity: 0; }
  100% { transform: scale(2.6); opacity: 0; }
}
@keyframes pdLightboxIn {
  0%   { opacity: 0; transform: scale(0.96); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes pdToastIn {
  0%   { transform: translate(-50%, 24px); opacity: 0; }
  100% { transform: translate(-50%, 0); opacity: 1; }
}
@keyframes pdShimmer {
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
@keyframes pdCardIn {
  0%   { opacity: 0; transform: translateY(8px); }
  100% { opacity: 1; transform: translateY(0); }
}
.pd-hscroll::-webkit-scrollbar { display: none; }
.pd-hscroll { -ms-overflow-style: none; scrollbar-width: none; -webkit-overflow-scrolling: touch; }
.pd-shimmer {
  background: linear-gradient(90deg, #eef2ef 0%, #f7faf7 50%, #eef2ef 100%);
  background-size: 200% 100%;
  animation: pdShimmer 1.4s linear infinite;
}
`

// ─────────────────────────────────────────────
// ICONOS — mismo lenguaje visual que TabBar / Marketplace
// ─────────────────────────────────────────────
const Icon = {
  Back: ({ size = 22, color = C.texto }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
    </svg>
  ),
  Share: ({ size = 18, color = C.texto }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
    </svg>
  ),
  Heart: ({ size = 22, color = C.textoSuave, filled = false }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? '#e11d48' : 'none'} stroke={filled ? '#e11d48' : color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  ),
  Pin: ({ size = 12, color = C.verde }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
    </svg>
  ),
  Clock: ({ size = 12, color = C.textoTenue }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  Eye: ({ size = 13, color = C.textoTenue }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  Comment: ({ size = 13, color = C.textoTenue }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  Send: ({ size = 18, color = '#fff' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  ),
  Star: ({ size = 11, color = '#f59e0b' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke={color} strokeWidth="1">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  ),
  Verified: ({ size = 13, color = C.verde }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="8 12 11 15 16 9" stroke="#fff" fill="none"/>
    </svg>
  ),
  ChevronRight: ({ size = 18, color = C.textoTenue }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  ),
  Shield: ({ size = 16, color = C.verde }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  Message: ({ size = 18, color = '#fff' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  Close: ({ size = 24, color = '#fff' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  Tag: ({ size = 13, color = C.textoTenue }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>
    </svg>
  ),
  Gift: ({ size = 14, color = '#fff' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/>
      <line x1="12" y1="22" x2="12" y2="7"/>
      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/>
      <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
    </svg>
  ),
  Swap: ({ size = 16, color = '#fff' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="17 1 21 5 17 9"/>
      <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
      <polyline points="7 23 3 19 7 15"/>
      <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
    </svg>
  ),
  Check: ({ size = 14, color = '#fff' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
}

// ─────────────────────────────────────────────
// HELPERS DE TIPO (sincronizados con Marketplace v8)
// ─────────────────────────────────────────────
const TIPO_VENTA   = ['venta','vender','vende','sell','sale']
const TIPO_REGALO  = ['regalo','regalar','regala','gift','free']
const TIPO_TRUEQUE = ['intercambio','intercambiar','trueque','swap','trade']

const tipoLower = (t) => (t || '').toLowerCase()
const esVenta   = (t) => TIPO_VENTA.includes(tipoLower(t))
const esRegalo  = (t) => TIPO_REGALO.includes(tipoLower(t))
const esTrueque = (t) => TIPO_TRUEQUE.includes(tipoLower(t))

// Resuelve la entrada del TIPO del design.js para un post (color, emoji, label).
const resolverTipo = (post) => {
  const t = tipoLower(post?.type)
  if (TIPO_VENTA.includes(t))   return TIPOS.sell
  if (TIPO_REGALO.includes(t))  return TIPOS.gift
  if (TIPO_TRUEQUE.includes(t)) return TIPOS.trade
  if (t === 'alert')            return TIPOS.alert
  if (t === 'event')            return TIPOS.event
  if (t === 'request')          return TIPOS.request
  return TIPOS.general
}

// Etiqueta de precio según tipo.
const precioLabel = (post) => {
  if (!post) return ''
  if (esRegalo(post.type))  return 'Gratis'
  if (esTrueque(post.type)) return 'Trueque'
  if (post.price) return plata(post.price)
  return 'Consultar'
}

// Emoji por categoría (para placeholder de imagen).
const catEmoji = (cat) => {
  if (!cat) return '📦'
  const found = CATEGORIAS.find(c => cat.toLowerCase().includes(c.key.toLowerCase()))
  return found ? found.emoji : '📦'
}

// Imagen demo por categoría (LoremFlickr).
const DEMO_KEYWORDS = {
  'Electrónica': 'electronics,gadget', 'Ropa': 'clothing,fashion',
  'Hogar': 'home,decor', 'Deportes': 'sports,equipment',
  'Libros': 'books,reading', 'Juguetes': 'toys',
  'Muebles': 'furniture', 'Bicicletas': 'bicycle',
  'Mascotas': 'pet', 'Herramientas': 'tools',
  'Otros': 'things',
}
const demoImg = (cat, seed) => {
  const kw = DEMO_KEYWORDS[cat] || 'things'
  return `https://loremflickr.com/600/600/${kw}?lock=${seed || 1}`
}

// Haversine para distancia real usuario ↔ vendedor.
const haversine = (a, b) => {
  if (!a || !b) return null
  const R = 6371000
  const dLat = (b.lat - a.lat) * Math.PI / 180
  const dLng = (b.lng - a.lng) * Math.PI / 180
  const la1 = a.lat * Math.PI / 180, la2 = b.lat * Math.PI / 180
  const h = Math.sin(dLat/2)**2 + Math.cos(la1)*Math.cos(la2)*Math.sin(dLng/2)**2
  return Math.round(2 * R * Math.asin(Math.sqrt(h)))
}

const getCoord = (obj) => {
  if (!obj) return null
  if (obj.lat != null && obj.lng != null) return { lat: obj.lat, lng: obj.lng }
  if (obj.latitude != null && obj.longitude != null) return { lat: obj.latitude, lng: obj.longitude }
  if (obj.location?.coordinates) return { lat: obj.location.coordinates[1], lng: obj.location.coordinates[0] }
  return null
}

// ─────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────
export default function ProductDetail({ postId, currentUser, onNavigate }) {
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentImage, setCurrentImage] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [touchStart, setTouchStart] = useState(null)

  // Like
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [likeInFlight, setLikeInFlight] = useState(false)

  // Stats
  const [viewCount, setViewCount] = useState(0)
  const [commentCount, setCommentCount] = useState(0)

  // Comments
  const [comments, setComments] = useState([])
  const [loadingComments, setLoadingComments] = useState(true)
  const [commentText, setCommentText] = useState('')
  const [postingComment, setPostingComment] = useState(false)

  // Similar
  const [similar, setSimilar] = useState([])
  const [loadingSimilar, setLoadingSimilar] = useState(true)

  // Misc
  const [myCoords, setMyCoords] = useState(null)
  const [toast, setToast] = useState(null)

  const viewBumpedRef = useRef(false)
  const nav = onNavigate || (() => {})

  // ───── Fetch inicial del post ─────
  useEffect(() => {
    if (!postId) return
    setLoading(true)
    setPost(null)
    setCurrentImage(0)
    fetchPost()
  }, [postId])

  const fetchPost = async () => {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        author:profiles!author_id (
          id, full_name, avatar_url, reputation_score,
          badge_founder, badge_trusted_seller, member_since,
          lat, lng, total_sales, total_gifts
        )
      `)
      .eq('id', postId)
      .single()

    if (error) {
      console.error('[ProductDetail] fetchPost error:', error)
    }
    if (data) {
      setPost(data)
      setLikeCount(data.likes_count || 0)
      setViewCount(data.views_count || 0)
      setCommentCount(data.comments_count || 0)
    }
    setLoading(false)
  }

  // ───── GPS del usuario real (con fallback a coords del perfil) ─────
  useEffect(() => {
    if (!currentUser?.id) return
    let cancelled = false

    // 1) Intentar GPS del navegador.
    if (navigator?.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (cancelled) return
          setMyCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        },
        async () => {
          // 2) Fallback: coords del perfil del usuario en Supabase.
          const { data } = await supabase
            .from('profiles')
            .select('lat, lng')
            .eq('id', currentUser.id)
            .single()
          if (!cancelled && data && data.lat != null && data.lng != null) {
            setMyCoords({ lat: data.lat, lng: data.lng })
          }
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 300000 }
      )
    }

    return () => { cancelled = true }
  }, [currentUser?.id])

  // ───── Like status (¿ya le dio like este usuario?) ─────
  useEffect(() => {
    if (!postId || !currentUser?.id) return
    let cancelled = false
    ;(async () => {
      const { data } = await supabase
        .from('post_likes')
        .select('post_id')
        .eq('post_id', postId)
        .eq('user_id', currentUser.id)
        .maybeSingle()
      if (!cancelled) setLiked(!!data)
    })()
    return () => { cancelled = true }
  }, [postId, currentUser?.id])

  // ───── Bump view count (1 vez por montaje con este postId) ─────
  useEffect(() => {
    if (!postId || viewBumpedRef.current) return
    viewBumpedRef.current = true
    ;(async () => {
      const { error } = await supabase.rpc('bump_view', { p_post_id: postId })
      if (error) {
        // Fallback: incremento manual si la RPC no existe.
        await supabase
          .from('posts')
          .update({ views_count: (post?.views_count || 0) + 1 })
          .eq('id', postId)
      }
      setViewCount((c) => c + 1)
    })()
  }, [postId])

  // ───── Fetch comments ─────
  useEffect(() => {
    if (!postId) return
    setLoadingComments(true)
    fetchComments()
  }, [postId])

  const fetchComments = async () => {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        id, content, created_at,
        author:profiles!author_id (id, full_name, avatar_url, badge_founder)
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
      .limit(50)

    if (error) console.error('[ProductDetail] fetchComments:', error)
    if (data) setComments(data)
    setLoadingComments(false)
  }

  // ───── Fetch similar ─────
  useEffect(() => {
    if (!post) return
    setLoadingSimilar(true)
    fetchSimilar()
  }, [post?.id, post?.type, post?.category])

  const fetchSimilar = async () => {
    if (!post) return
    let q = supabase
      .from('posts')
      .select('id, title, price, type, category, images, created_at, distance_meters, author:profiles!author_id (full_name, avatar_url, lat, lng)')
      .neq('id', post.id)
      .order('created_at', { ascending: false })
      .limit(12)

    // Priorizar mismo tipo; si no hay, misma categoría; si no, todo.
    if (esVenta(post.type) || esRegalo(post.type) || esTrueque(post.type)) {
      const alts = esVenta(post.type) ? TIPO_VENTA : esRegalo(post.type) ? TIPO_REGALO : TIPO_TRUEQUE
      q = q.in('type', alts)
    }
    const { data } = await q
    setSimilar(data || [])
    setLoadingSimilar(false)
  }

  // ───── Realtime: nuevos comentarios + sync del post ─────
  useEffect(() => {
    if (!postId) return
    const channel = supabase
      .channel(`product-detail-${postId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'comments', filter: `post_id=eq.${postId}` },
        (payload) => {
          // Hidratar el author del comentario nuevo.
          ;(async () => {
            const { data } = await supabase
              .from('comments')
              .select(`id, content, created_at, author:profiles!author_id (id, full_name, avatar_url, badge_founder)`)
              .eq('id', payload.new.id)
              .single()
            if (data) {
              setComments((prev) => prev.some((c) => c.id === data.id) ? prev : [...prev, data])
              setCommentCount((c) => c + 1)
            }
          })()
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'posts', filter: `id=eq.${postId}` },
        (payload) => {
          if (payload.new) {
            setLikeCount(payload.new.likes_count ?? likeCount)
            setCommentCount(payload.new.comments_count ?? commentCount)
            setViewCount(payload.new.views_count ?? viewCount)
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [postId])

  // ───── Toast helper ─────
  const showToast = useCallback((msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2200)
  }, [])

  // ───── Like con optimistic UI + rollback ─────
  const toggleLike = async () => {
    if (!currentUser?.id) {
      showToast('Inicia sesión para guardar favoritos')
      return
    }
    if (likeInFlight) return

    const wasLiked = liked
    const prevCount = likeCount
    // Optimista.
    setLiked(!wasLiked)
    setLikeCount((c) => c + (wasLiked ? -1 : 1))
    setLikeInFlight(true)

    try {
      if (wasLiked) {
        const { error } = await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', currentUser.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('post_likes')
          .insert({ post_id: postId, user_id: currentUser.id })
        if (error) {
          // Violación de PK único → ya estaba likeado. Asumir likeado.
          if (error.code === '23505') { setLiked(true); setLikeCount(prevCount + 1) }
          else throw error
        }
      }
      // Sincronizar likes_count del post.
      await supabase.rpc('sync_likes_count', { p_post_id: postId }).catch(() => {})
    } catch (e) {
      console.error('[ProductDetail] toggleLike:', e)
      // Rollback.
      setLiked(wasLiked)
      setLikeCount(prevCount)
      showToast('No se pudo actualizar. Intenta de nuevo.')
    } finally {
      setLikeInFlight(false)
    }
  }

  // ───── Comentar (optimistic + Enter para enviar) ─────
  const sendComment = async () => {
    const text = commentText.trim()
    if (!text || postingComment) return
    if (!currentUser?.id) {
      showToast('Inicia sesión para comentar')
      return
    }

    const tempId = `tmp-${Date.now()}`
    const optimistic = {
      id: tempId,
      content: text,
      created_at: new Date().toISOString(),
      author: { id: currentUser.id, full_name: currentUser.full_name || 'Tú', avatar_url: currentUser.avatar_url, badge_founder: false },
      _pending: true,
    }
    setComments((prev) => [...prev, optimistic])
    setCommentCount((c) => c + 1)
    setCommentText('')
    setPostingComment(true)

    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({ post_id: postId, author_id: currentUser.id, content: text })
        .select('id, content, created_at, author:profiles!author_id (id, full_name, avatar_url, badge_founder)')
        .single()
      if (error) throw error
      // Reemplazar el optimista por el real.
      setComments((prev) => prev.map((c) => (c.id === tempId ? data : c)))
    } catch (e) {
      console.error('[ProductDetail] sendComment:', e)
      setComments((prev) => prev.filter((c) => c.id !== tempId))
      setCommentCount((c) => Math.max(0, c - 1))
      showToast('No se pudo enviar el comentario')
    } finally {
      setPostingComment(false)
    }
  }

  // ───── Compartir (Web Share API con fallback a clipboard) ─────
  const handleShare = async () => {
    if (!post) return
    const url = `${window.location.origin}/?post=${post.id}`
    const text = `${post.title} — ${precioLabel(post)} en El Barrio`
    try {
      if (navigator.share) {
        await navigator.share({ title: post.title, text, url })
      } else {
        await navigator.clipboard.writeText(url)
        showToast('Enlace copiado al portapapeles')
      }
    } catch (e) {
      // AbortError = el user canceló el sheet; no es error real.
      if (e.name !== 'AbortError') {
        try {
          await navigator.clipboard.writeText(url)
          showToast('Enlace copiado')
        } catch { showToast('No se pudo compartir') }
      }
    }
  }

  // ───── Swipe galería ─────
  const handleTouchStart = (e) => setTouchStart(e.touches[0].clientX)
  const handleTouchEnd = (e) => {
    if (touchStart == null || !post?.images?.length) return
    const diff = touchStart - e.changedTouches[0].clientX
    if (diff > 50 && currentImage < post.images.length - 1) setCurrentImage(currentImage + 1)
    if (diff < -50 && currentImage > 0) setCurrentImage(currentImage - 1)
    setTouchStart(null)
  }

  // ───── Distancia real ─────
  const computeDist = () => {
    if (!post) return null
    if (post.distance_meters != null) return distancia(post.distance_meters)
    const sellerCoord = getCoord(post.author)
    if (!myCoords || !sellerCoord) return null
    return distancia(haversine(myCoords, sellerCoord))
  }

  // ───── Loading ─────
  if (loading) return <SkeletonView />

  // ───── Empty ─────
  if (!post) {
    return (
      <div style={s.emptyWrap}>
        <style dangerouslySetInnerHTML={{ __html: INJECT_STYLE }} />
        <div style={s.emptyEmoji}>🫧</div>
        <div style={s.emptyTitle}>Esta publicación ya no está</div>
        <div style={s.emptyText}>Puede que la hayan borrado o que el enlace ya no funcione.</div>
        <button onClick={() => nav('back')} style={s.emptyBtn}>Volver al mercado</button>
      </div>
    )
  }

  // ───── Derivados ─────
  const tipo = resolverTipo(post)
  const images = (post.images && post.images.length > 0) ? post.images : []
  const dist = computeDist()
  const isOwn = currentUser?.id && post.author_id === currentUser.id
  const ctaLabel = esRegalo(post.type) ? 'Reclamar' : esTrueque(post.type) ? 'Proponer trueque' : 'Mensaje al vendedor'
  const ctaIcon = esRegalo(post.type) ? <Icon.Gift /> : esTrueque(post.type) ? <Icon.Swap /> : <Icon.Message />

  const onCta = () => {
    if (isOwn) {
      showToast('Es tu propia publicación')
      return
    }
    nav('ChatConversation', { postId: post.id, sellerId: post.author_id })
  }

  return (
    <div style={s.wrap}>
      <style dangerouslySetInnerHTML={{ __html: INJECT_STYLE }} />

      <div style={s.scrollArea}>
        {/* ───── Galería ───── */}
        <div
          style={s.galleryWrap}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {images.length > 0 ? (
            <>
              <img
                src={images[currentImage]}
                alt={post.title || ''}
                style={s.mainImg}
                onClick={() => setLightboxOpen(true)}
              />
              {images.length > 1 && (
                <>
                  <div style={s.dots}>
                    {images.map((_, i) => (
                      <div
                        key={i}
                        onClick={() => setCurrentImage(i)}
                        style={{
                          ...s.dot,
                          backgroundColor: i === currentImage ? '#fff' : 'rgba(255,255,255,0.5)',
                          width: i === currentImage ? 22 : 7,
                        }}
                      />
                    ))}
                  </div>
                  <div style={s.imgCounter}>{currentImage + 1} / {images.length}</div>
                </>
              )}
            </>
          ) : (
            <div style={s.noImg} onClick={() => setLightboxOpen(true)}>
              <div style={s.noImgEmoji}>{catEmoji(post.category)}</div>
            </div>
          )}

          {/* Botones flotantes sobre la galería */}
          <button onClick={() => nav('back')} style={{ ...s.floatBtn, left: 14 }} aria-label="Volver">
            <Icon.Back />
          </button>
          <button onClick={handleShare} style={{ ...s.floatBtn, right: 14 }} aria-label="Compartir">
            <Icon.Share />
          </button>

          {/* Badge de tipo (arriba izquierda, sobre la imagen) */}
          <div style={{ ...s.tipoBadge, background: tipo.bg, color: tipo.color }}>
            <span style={{ fontSize: 12 }}>{tipo.emoji}</span>
            <span>{tipo.corto}</span>
          </div>
        </div>

        {/* ───── Contenido ───── */}
        <div style={s.content}>
          {/* Título + precio */}
          <h1 style={s.title}>{post.title || 'Sin título'}</h1>

          <div style={s.priceRow}>
            <span style={s.price}>{precioLabel(post)}</span>
            {post.price && esVenta(post.type) && <span style={s.currency}>CLP</span>}
            {post.is_negotiable && <span style={s.negotiable}>Negociable</span>}
          </div>

          {/* Stats: vistas · likes · comentarios */}
          <div style={s.statsRow}>
            <div style={s.statItem}>
              <Icon.Eye size={12} />
              <span>{viewCount.toLocaleString('es-CL')}</span>
            </div>
            <div style={s.statDivider} />
            <div style={s.statItem}>
              <Icon.Heart size={12} color={C.textoTenue} filled={false} />
              <span>{likeCount.toLocaleString('es-CL')}</span>
            </div>
            <div style={s.statDivider} />
            <div style={s.statItem}>
              <Icon.Comment size={12} />
              <span>{commentCount.toLocaleString('es-CL')}</span>
            </div>
          </div>

          {/* Chips: tiempo · distancia · categoría */}
          <div className="pd-hscroll" style={s.chipsScroll}>
            <div style={s.chip}>
              <Icon.Clock />
              <span>{hace(post.created_at)}</span>
            </div>
            {dist && (
              <div style={s.chip}>
                <Icon.Pin size={11} color={C.textoTenue} />
                <span>a {dist}</span>
              </div>
            )}
            {post.category && (
              <div style={s.chip}>
                <Icon.Tag />
                <span>{post.category}</span>
              </div>
            )}
          </div>

          {/* Tarjeta del vendedor */}
          <div
            style={s.sellerCard}
            onClick={() => nav('SellerProfile', { sellerId: post.author?.id })}
          >
            {post.author?.avatar_url ? (
              <img src={post.author.avatar_url} style={s.sellerAvatar} alt="" />
            ) : (
              <div style={s.sellerAvatarFallback}>{iniciales(post.author?.full_name)}</div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={s.sellerNameRow}>
                <span style={s.sellerName}>{post.author?.full_name || 'Vecino'}</span>
                {post.author?.badge_founder && <Icon.Verified size={13} />}
                {post.author?.badge_trusted_seller && (
                  <span style={s.sellerBadge}>Vendedor confiable</span>
                )}
              </div>
              <div style={s.sellerRepRow}>
                <Icon.Star />
                <span style={s.sellerRepText}>
                  {post.author?.reputation_score || '0.0'} · {(post.author?.total_sales || 0) + (post.author?.total_gifts || 0)} ventas
                </span>
              </div>
            </div>
            <Icon.ChevronRight />
          </div>

          {/* Tarjeta de seguridad */}
          <div style={s.shieldCard}>
            <div style={s.shieldIconWrap}><Icon.Shield /></div>
            <div style={{ flex: 1 }}>
              <div style={s.shieldTitle}>Transacción protegida por la comunidad</div>
              <div style={s.shieldText}>
                Revisa nuestros consejos de seguridad antes de concretar. Nunca pagues por adelantado a desconocidos.
              </div>
            </div>
          </div>

          {/* Descripción */}
          <section style={s.section}>
            <div style={s.sectionTitle}>Descripción</div>
            <div style={s.descBlock}>
              <div style={s.description}>{post.content || 'Sin descripción.'}</div>
            </div>
          </section>

          {/* Ubicación aproximada */}
          <section style={s.section}>
            <div style={s.sectionTitle}>Ubicación aproximada</div>
            <div style={s.mapBox}>
              <div style={s.mapGrid} />
              <div style={s.pulseWrap}>
                <div style={{ ...s.pulse, animationDelay: '0s' }} />
                <div style={{ ...s.pulse, animationDelay: '1s' }} />
                <div style={{ ...s.pulse, animationDelay: '2s' }} />
                <div style={s.pulseDot} />
              </div>
              <div style={s.mapCaption}>Se comparte solo al coordinar</div>
            </div>
          </section>

          {/* Comentarios */}
          <section style={s.section}>
            <div style={s.sectionTitleRow}>
              <div style={s.sectionTitle}>Comentarios</div>
              {commentCount > 0 && <span style={s.sectionCount}>{commentCount}</span>}
            </div>

            <div style={s.commentsList}>
              {loadingComments ? (
                <CommentSkeleton />
              ) : comments.length === 0 ? (
                <div style={s.commentsEmpty}>
                  <span style={{ fontSize: 22 }}>👋</span>
                  <span style={s.commentsEmptyText}>Sé el primero en comentar</span>
                </div>
              ) : (
                comments.map((c) => <CommentItem key={c.id} c={c} />)
              )}
            </div>

            <div style={s.commentInputWrap}>
              <input
                style={s.commentInput}
                placeholder="Escribe un comentario…"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendComment() } }}
                disabled={postingComment}
              />
              <button
                style={{ ...s.commentSend, opacity: (commentText.trim() && !postingComment) ? 1 : 0.4 }}
                onClick={sendComment}
                disabled={!commentText.trim() || postingComment}
                aria-label="Enviar comentario"
              >
                <Icon.Send />
              </button>
            </div>
          </section>

          {/* Productos similares */}
          <section style={s.section}>
            <div style={s.sectionTitle}>También en el barrio</div>
            <div className="pd-hscroll" style={s.similarScroll}>
              {loadingSimilar ? (
                <>
                  <SimilarSkeleton /><SimilarSkeleton /><SimilarSkeleton />
                </>
              ) : similar.length === 0 ? (
                <div style={s.similarEmpty}>No hay publicaciones similares por ahora.</div>
              ) : (
                similar.map((p) => (
                  <SimilarCard key={p.id} p={p} myCoords={myCoords} onClick={() => nav('ProductDetail', { postId: p.id })} />
                ))
              )}
            </div>
          </section>

          <div style={{ height: 40 }} />
        </div>
      </div>

      {/* ───── Bottom bar ───── */}
      <div style={s.bottomBar}>
        <button
          style={{ ...s.heartBtn, borderColor: liked ? '#fecdd3' : C.borde }}
          onClick={toggleLike}
          aria-label={liked ? 'Quitar de favoritos' : 'Guardar en favoritos'}
        >
          <Icon.Heart filled={liked} color={liked ? '#e11d48' : C.textoSuave} />
        </button>
        <button style={s.contactBtn} onClick={onCta}>
          {isOwn ? <Icon.Check /> : ctaIcon}
          <span>{isOwn ? 'Es tu publicación' : ctaLabel}</span>
        </button>
      </div>

      {/* ───── Lightbox ───── */}
      {lightboxOpen && images.length > 0 && (
        <div style={s.lightbox} onClick={() => setLightboxOpen(false)}>
          <button style={s.lightboxClose} onClick={() => setLightboxOpen(false)} aria-label="Cerrar">
            <Icon.Close />
          </button>
          <img
            src={images[currentImage]}
            alt=""
            style={s.lightboxImg}
            onClick={(e) => e.stopPropagation()}
          />
          {images.length > 1 && (
            <div style={s.lightboxCounter}>{currentImage + 1} / {images.length}</div>
          )}
        </div>
      )}

      {/* ───── Toast ───── */}
      {toast && (
        <div style={s.toast}>{toast}</div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// SUB-COMPONENTES
// ─────────────────────────────────────────────

function CommentItem({ c }) {
  const name = c.author?.full_name || 'Vecino'
  return (
    <div style={{ ...s.commentItem, opacity: c._pending ? 0.55 : 1 }}>
      {c.author?.avatar_url ? (
        <img src={c.author.avatar_url} style={s.commentAvatar} alt="" />
      ) : (
        <div style={s.commentAvatarFallback}>{iniciales(name)}</div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={s.commentNameRow}>
          <span style={s.commentName}>{name}</span>
          {c.author?.badge_founder && <Icon.Verified size={11} />}
          <span style={s.commentTime}>{hace(c.created_at)}</span>
        </div>
        <div style={s.commentBody}>{c.content}</div>
      </div>
    </div>
  )
}

function SimilarCard({ p, myCoords, onClick }) {
  const img = p.images?.[0] || demoImg(p.category, (p.id || '').length % 20)
  const tipo = resolverTipo(p)
  let distLabel = null
  if (p.distance_meters != null) distLabel = distancia(p.distance_meters)
  else if (myCoords && p.author) {
    const sc = getCoord(p.author)
    if (sc) distLabel = distancia(haversine(myCoords, sc))
  }

  return (
    <div style={s.similarCard} onClick={onClick}>
      <div style={s.similarImgBox}>
        <img src={img} alt={p.title || ''} style={s.similarImg} onError={(e) => {
          e.target.style.display = 'none'
          e.target.parentElement.style.background = C.verdeBg
          e.target.parentElement.setAttribute('data-fallback', catEmoji(p.category))
        }} />
        <div style={{ ...s.similarTipo, background: tipo.bg, color: tipo.color }}>{tipo.emoji}</div>
        {distLabel && <div style={s.similarDist}><Icon.Pin size={9} color="#fff" />{distLabel}</div>}
      </div>
      <div style={s.similarBody}>
        <div style={s.similarTitle}>{p.title || 'Sin título'}</div>
        <div style={{ ...s.similarPrice, color: tipo.color }}>
          {esRegalo(p.type) ? 'Gratis' : esTrueque(p.type) ? 'Trueque' : p.price ? plata(p.price) : 'Consultar'}
        </div>
      </div>
    </div>
  )
}

function SkeletonView() {
  return (
    <div style={s.wrap}>
      <style dangerouslySetInnerHTML={{ __html: INJECT_STYLE }} />
      <div style={s.scrollArea}>
        <div className="pd-shimmer" style={{ width: '100%', aspectRatio: '1/1' }} />
        <div style={s.content}>
          <div className="pd-shimmer" style={{ height: 24, width: '70%', borderRadius: 8, marginBottom: 12 }} />
          <div className="pd-shimmer" style={{ height: 20, width: '40%', borderRadius: 8, marginBottom: 18 }} />
          <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
            <div className="pd-shimmer" style={{ height: 26, width: 80, borderRadius: 14 }} />
            <div className="pd-shimmer" style={{ height: 26, width: 70, borderRadius: 14 }} />
            <div className="pd-shimmer" style={{ height: 26, width: 60, borderRadius: 14 }} />
          </div>
          <div className="pd-shimmer" style={{ height: 70, borderRadius: 14, marginBottom: 12 }} />
          <div className="pd-shimmer" style={{ height: 60, borderRadius: 14, marginBottom: 18 }} />
          <div className="pd-shimmer" style={{ height: 14, width: 100, borderRadius: 6, marginBottom: 8 }} />
          <div className="pd-shimmer" style={{ height: 80, borderRadius: 12 }} />
        </div>
      </div>
    </div>
  )
}

function CommentSkeleton() {
  return (
    <>
      {[0,1,2].map((i) => (
        <div key={i} style={s.commentItem}>
          <div className="pd-shimmer" style={{ width: 32, height: 32, borderRadius: '50%' }} />
          <div style={{ flex: 1 }}>
            <div className="pd-shimmer" style={{ height: 11, width: 100, borderRadius: 4, marginBottom: 6 }} />
            <div className="pd-shimmer" style={{ height: 11, width: '80%', borderRadius: 4 }} />
          </div>
        </div>
      ))}
    </>
  )
}

function SimilarSkeleton() {
  return (
    <div style={s.similarCard}>
      <div className="pd-shimmer" style={{ width: '100%', aspectRatio: '1/1', borderRadius: 12 }} />
      <div style={{ padding: '8px 4px 0' }}>
        <div className="pd-shimmer" style={{ height: 11, width: '90%', borderRadius: 4, marginBottom: 6 }} />
        <div className="pd-shimmer" style={{ height: 11, width: '50%', borderRadius: 4 }} />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// ESTILOS
// ─────────────────────────────────────────────
const s = {
  wrap: {
    width: '100%',
    height: '100%',
    backgroundColor: C.fondo,
    fontFamily: T.font,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    position: 'relative',
  },

  // ── Empty state ──
  emptyWrap: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    fontFamily: T.font,
    backgroundColor: C.fondo,
    textAlign: 'center',
  },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: 600, color: C.texto, marginBottom: 6 },
  emptyText: { fontSize: 14, color: C.textoSuave, lineHeight: 1.5, marginBottom: 20, maxWidth: 280 },
  emptyBtn: {
    padding: '12px 22px',
    backgroundColor: C.verde,
    color: '#fff',
    border: 'none',
    borderRadius: 12,
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
  },

  // ── Scroll ──
  scrollArea: {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
    WebkitOverflowScrolling: 'touch',
  },

  // ── Galería ──
  galleryWrap: {
    position: 'relative',
    width: '100%',
    aspectRatio: '1/1',
    backgroundColor: '#e8e8e8',
  },
  mainImg: { width: '100%', height: '100%', objectFit: 'cover', display: 'block', cursor: 'zoom-in' },
  noImg: {
    width: '100%', height: '100%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: `linear-gradient(135deg, ${C.verdeBg} 0%, ${C.verdeSuave} 100%)`,
    cursor: 'zoom-in',
  },
  noImgEmoji: { fontSize: 72, filter: 'grayscale(0.1)' },
  dots: {
    position: 'absolute', bottom: 14, left: 0, right: 0,
    display: 'flex', justifyContent: 'center', gap: 5,
    pointerEvents: 'auto',
  },
  dot: { height: 7, borderRadius: 4, cursor: 'pointer', transition: 'all 0.2s' },
  imgCounter: {
    position: 'absolute', top: 70, right: 14,
    backgroundColor: 'rgba(0,0,0,0.55)',
    color: '#fff', fontSize: 11, fontWeight: 600,
    padding: '4px 9px', borderRadius: 10,
    backdropFilter: 'blur(4px)',
  },
  floatBtn: {
    position: 'absolute', top: 50,
    width: 38, height: 38, borderRadius: '50%',
    backgroundColor: 'rgba(255,255,255,0.95)',
    border: 'none', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 2px 10px rgba(0,0,0,0.12)',
    backdropFilter: 'blur(4px)',
  },
  tipoBadge: {
    position: 'absolute', top: 50, left: 60,
    display: 'flex', alignItems: 'center', gap: 5,
    padding: '5px 10px',
    borderRadius: 20,
    fontSize: 11.5, fontWeight: 600,
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    backdropFilter: 'blur(4px)',
  },

  // ── Contenido ──
  content: { padding: '18px 16px 20px' },

  title: {
    fontSize: 21,
    fontWeight: 600,
    color: C.texto,
    margin: 0,
    lineHeight: 1.3,
    letterSpacing: '-0.2px',
    marginBottom: 10,
  },

  priceRow: {
    display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 14,
  },
  price: { fontSize: 22, fontWeight: 600, color: C.verde, letterSpacing: '-0.3px' },
  currency: { fontSize: 12, fontWeight: 600, color: C.textoTenue },
  negotiable: {
    fontSize: 11, padding: '3px 9px',
    backgroundColor: C.verdeSuave, color: C.verdeOsc,
    borderRadius: 8, fontWeight: 600, marginLeft: 4,
  },

  // ── Stats ──
  statsRow: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '10px 14px',
    backgroundColor: C.card,
    borderRadius: 12,
    marginBottom: 12,
    border: `1px solid ${C.bordeSuave}`,
  },
  statItem: { display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: C.textoSuave, fontWeight: 600 },
  statDivider: { width: 1, height: 14, backgroundColor: C.borde },

  // ── Chips ──
  chipsScroll: {
    display: 'flex', gap: 8,
    overflowX: 'auto',
    paddingBottom: 4, marginBottom: 16,
  },
  chip: {
    display: 'flex', alignItems: 'center', gap: 5,
    padding: '5px 11px',
    backgroundColor: C.card,
    borderRadius: 20,
    fontSize: 11.5, color: C.textoSuave, fontWeight: 600,
    whiteSpace: 'nowrap', flexShrink: 0,
    border: `1px solid ${C.borde}`,
  },

  // ── Vendedor ──
  sellerCard: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '12px 14px',
    backgroundColor: C.card,
    borderRadius: 16,
    cursor: 'pointer',
    marginBottom: 12,
    border: `1px solid ${C.bordeSuave}`,
    boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
  },
  sellerAvatar: { width: 42, height: 42, borderRadius: '50%', objectFit: 'cover' },
  sellerAvatarFallback: {
    width: 42, height: 42, borderRadius: '50%',
    backgroundColor: C.verde, color: '#fff',
    fontWeight: 600, fontSize: 14,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  sellerNameRow: { display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 },
  sellerName: { fontSize: 14, fontWeight: 600, color: C.texto },
  sellerBadge: {
    fontSize: 10, fontWeight: 600,
    padding: '2px 7px',
    backgroundColor: C.verdeSuave, color: C.verdeOsc,
    borderRadius: 6,
  },
  sellerRepRow: { display: 'flex', alignItems: 'center', gap: 4 },
  sellerRepText: { fontSize: 11.5, color: C.textoSuave, fontWeight: 500 },

  // ── Shield ──
  shieldCard: {
    display: 'flex', gap: 10,
    padding: '12px 14px',
    backgroundColor: C.verdeBg,
    borderRadius: 14,
    marginBottom: 18,
    border: `1px solid ${C.verdeSuave}`,
  },
  shieldIconWrap: { paddingTop: 2 },
  shieldTitle: { fontSize: 12.5, fontWeight: 600, color: C.verdeOsc, marginBottom: 3 },
  shieldText: { fontSize: 11.5, color: '#047857', lineHeight: 1.5 },

  // ── Secciones ──
  section: { marginBottom: 22 },
  sectionTitle: { fontSize: 14, fontWeight: 600, color: C.texto, marginBottom: 10 },
  sectionTitleRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionCount: {
    fontSize: 11, fontWeight: 600, color: C.verde,
    backgroundColor: C.verdeSuave,
    padding: '2px 8px', borderRadius: 8,
  },

  descBlock: {
    backgroundColor: C.card,
    borderRadius: 14,
    padding: '14px 16px',
    border: `1px solid ${C.bordeSuave}`,
  },
  description: { fontSize: 14, color: C.texto, lineHeight: 1.6, whiteSpace: 'pre-wrap' },

  // ── Mapa ──
  mapBox: {
    position: 'relative', width: '100%', height: 160,
    backgroundColor: '#e8f0e8', borderRadius: 14, overflow: 'hidden',
    border: `1px solid ${C.bordeSuave}`,
  },
  mapGrid: {
    position: 'absolute', inset: 0,
    backgroundImage: 'linear-gradient(#d1e0d1 1px, transparent 1px), linear-gradient(90deg, #d1e0d1 1px, transparent 1px)',
    backgroundSize: '30px 30px', opacity: 0.6,
  },
  pulseWrap: {
    position: 'absolute', top: '50%', left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 20, height: 20,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  pulse: {
    position: 'absolute', width: 20, height: 20, borderRadius: '50%',
    backgroundColor: C.verde, opacity: 0.55,
    animation: 'pdPulseRing 3s ease-out infinite',
  },
  pulseDot: {
    width: 14, height: 14, borderRadius: '50%',
    backgroundColor: C.verde,
    border: '3px solid #fff',
    boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
    zIndex: 2,
  },
  mapCaption: {
    position: 'absolute', bottom: 8, left: 0, right: 0,
    textAlign: 'center',
    fontSize: 10.5, color: '#547554', fontWeight: 600,
    letterSpacing: 0.2,
  },

  // ── Comentarios ──
  commentsList: { marginBottom: 12 },
  commentsEmpty: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
    padding: '20px 0',
    backgroundColor: C.card, borderRadius: 14,
    border: `1px dashed ${C.borde}`,
  },
  commentsEmptyText: { fontSize: 13, color: C.textoSuave, fontWeight: 500 },

  commentItem: {
    display: 'flex', gap: 10,
    padding: '10px 0',
    borderBottom: `1px solid ${C.bordeSuave}`,
  },
  commentAvatar: { width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 },
  commentAvatarFallback: {
    width: 32, height: 32, borderRadius: '50%',
    backgroundColor: C.verde, color: '#fff',
    fontWeight: 600, fontSize: 11,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  commentNameRow: { display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 },
  commentName: { fontSize: 12.5, fontWeight: 600, color: C.texto },
  commentTime: { fontSize: 10.5, color: C.textoTenue, fontWeight: 500, marginLeft: 'auto' },
  commentBody: { fontSize: 13, color: C.texto, lineHeight: 1.5 },

  commentInputWrap: {
    display: 'flex', gap: 8, alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: 14,
    padding: '6px 6px 6px 14px',
    border: `1px solid ${C.borde}`,
  },
  commentInput: {
    flex: 1, border: 'none', outline: 'none',
    backgroundColor: 'transparent',
    fontFamily: T.font, fontSize: 14, color: C.texto,
    padding: '6px 0',
  },
  commentSend: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: C.verde, border: 'none', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
    transition: 'opacity 0.15s',
  },

  // ── Similares ──
  similarScroll: { display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 },
  similarCard: {
    flexShrink: 0, width: 130, cursor: 'pointer',
  },
  similarImgBox: {
    position: 'relative', width: '100%', aspectRatio: '1/1',
    borderRadius: 12, overflow: 'hidden', backgroundColor: C.bordeSuave,
  },
  similarImg: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  similarTipo: {
    position: 'absolute', top: 6, left: 6,
    width: 22, height: 22, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 11, fontWeight: 600,
  },
  similarDist: {
    position: 'absolute', bottom: 6, left: 6,
    display: 'flex', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(22,163,74,0.92)',
    color: '#fff', fontSize: 9.5, fontWeight: 600,
    padding: '2px 6px', borderRadius: 8,
  },
  similarBody: { padding: '8px 4px 0' },
  similarTitle: {
    fontSize: 12, fontWeight: 500, color: C.texto,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    marginBottom: 3,
  },
  similarPrice: { fontSize: 12.5, fontWeight: 600 },
  similarEmpty: { fontSize: 12.5, color: C.textoTenue, padding: '14px 0' },

  // ── Bottom bar ──
  bottomBar: {
    flexShrink: 0,
    display: 'flex', gap: 10,
    padding: '12px 14px',
    paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
    backgroundColor: C.card,
    borderTop: `1px solid ${C.borde}`,
    boxSizing: 'border-box',
  },
  heartBtn: {
    width: 50, height: 50, borderRadius: 14,
    backgroundColor: C.card,
    border: `1.5px solid ${C.borde}`,
    cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
    transition: 'border-color 0.15s',
  },
  contactBtn: {
    flex: 1, height: 50,
    backgroundColor: C.verde, color: '#fff',
    border: 'none', borderRadius: 14,
    fontSize: 15, fontWeight: 600,
    cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    transition: 'background 0.15s',
  },

  // ── Lightbox ──
  lightbox: {
    position: 'fixed', inset: 0, zIndex: 1000,
    backgroundColor: 'rgba(0,0,0,0.94)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    animation: 'pdLightboxIn 0.2s ease-out',
  },
  lightboxClose: {
    position: 'absolute', top: 16, right: 16, zIndex: 2,
    width: 40, height: 40, borderRadius: '50%',
    backgroundColor: 'rgba(255,255,255,0.12)',
    border: 'none', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  lightboxImg: { maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' },
  lightboxCounter: {
    position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)',
    backgroundColor: 'rgba(255,255,255,0.15)',
    color: '#fff', fontSize: 12, fontWeight: 600,
    padding: '5px 12px', borderRadius: 12,
  },

  // ── Toast ──
  toast: {
    position: 'fixed', bottom: 92, left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: 'rgba(17, 17, 17, 0.94)',
    color: '#fff',
    fontSize: 13, fontWeight: 500,
    padding: '10px 18px', borderRadius: 12,
    zIndex: 1100,
    boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
    animation: 'pdToastIn 0.2s ease-out',
    maxWidth: '85vw', textAlign: 'center',
  },
}
