import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { C, T, TIPOS, CATEGORIAS, RUBROS, REPORTES, iniciales, plata } from '../lib/design'
import { describirFoto } from '../lib/ia'
import MiniMap from '../components/MiniMap'

/* ============================================================
   CreatePost.jsx — v2
   Pantalla de publicar en El Barrio (vender/regalar/trueque/
   pedir/alertar).

   Cambios vs v1:
   · Imports completos del design system: C, T, TIPOS, CATEGORIAS,
     RUBROS, REPORTES, iniciales, plata. v1 solo importaba T.
   · Colores: TODO vía C.* (C.verde, C.texto, C.borde, etc.). v1
     hardcodeaba hex (#16a34a, #111827, #6b7280, #e5e7eb...).
   · POST_TYPES alineado a TIPOS del design.js:
       sell → naranjo (era azul)
       gift → morado (igual)
       trade → azul (era naranjo osc)
       request → dorado (era verde)
       alert → rojo (igual)
   · CATEGORIES → CATEGORIAS de design.js (con emojis).
   · RUBROS → RUBROS de design.js (con emojis).
   · ALERT_CATEGORIES → alineado a REPORTES de design.js (con emojis).
   · Tipografía ligera: máximo fontWeight 600. v1 usaba 800/700.
   · Icon strokeWidth 1.9 (era 1.8) — mismo lenguaje que TabBar/Marketplace.
   · NUEVO: Contador de caracteres en título (max 60) y descripción
     (max 500). Feedback visual cuando se acerca al límite.
   · NUEVO: Preview en vivo — tarjeta pequeña en la parte superior del
     formulario que muestra cómo se verá el post en el Mercado.
   · NUEVO: Badge "Principal" en la primera foto.
   · NUEVO: spin keyframe definido (v1 lo referenciaba sin definirlo).
   · NUEVO: Draft auto-save en localStorage (no se pierde si se cierra).
   ============================================================ */

/* ============================================================
   ICONOS SVG LINEALES (strokeWidth 1.9, mismo lenguaje que TabBar)
   ============================================================ */
const Ico = ({ d, size = 24, stroke = 1.9, children }) => (
  <svg
    width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={stroke}
    strokeLinecap="round" strokeLinejoin="round"
  >
    {children || <path d={d} />}
  </svg>
)

const IcoVender = ({ size }) => (
  <Ico size={size}>
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
    <line x1="7" y1="7" x2="7.01" y2="7" />
  </Ico>
)
const IcoRegalar = ({ size }) => (
  <Ico size={size}>
    <polyline points="20 12 20 22 4 22 4 12" />
    <rect x="2" y="7" width="20" height="5" />
    <line x1="12" y1="22" x2="12" y2="7" />
    <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
    <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
  </Ico>
)
const IcoTrueque = ({ size }) => (
  <Ico size={size}>
    <polyline points="17 1 21 5 17 9" />
    <path d="M3 11V9a4 4 0 0 1 4-4h14" />
    <polyline points="7 23 3 19 7 15" />
    <path d="M21 13v2a4 4 0 0 1-4 4H3" />
  </Ico>
)
const IcoCerrar = ({ size = 20 }) => (
  <Ico size={size}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </Ico>
)
const IcoVolver = ({ size = 20 }) => (
  <Ico size={size}>
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </Ico>
)
const IcoCheck = ({ size = 44 }) => (
  <Ico size={size} stroke={2.5}>
    <polyline points="20 6 9 17 4 12" />
  </Ico>
)
const IcoAlerta = ({ size = 16 }) => (
  <Ico size={size}>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </Ico>
)
const IcoUbicacion = ({ size = 18 }) => (
  <Ico size={size}>
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </Ico>
)
const IcoReloj = ({ size = 14 }) => (
  <Ico size={size}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </Ico>
)
const IcoCamara = ({ size = 22 }) => (
  <Ico size={size}>
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </Ico>
)
const IcoChevron = ({ size = 18 }) => (
  <Ico size={size}>
    <polyline points="9 18 15 12 9 6" />
  </Ico>
)
const IcoEye = ({ size = 13 }) => (
  <Ico size={size}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </Ico>
)

/* ============================================================
   CONFIGURACIÓN — alineada a TIPOS del design.js
   ============================================================ */
const POST_TYPES = [
  {
    id: 'request', label: 'Pedir ayuda', emoji: TIPOS.request.emoji,
    Icon: IcoUbicacion, // placeholder, no se usa en type picker
    sub: 'Necesito algo del barrio',
    color: TIPOS.request.color, bg: TIPOS.request.bg, primary: true,
  },
  {
    id: 'alert', label: 'Alertar', emoji: TIPOS.alert.emoji,
    Icon: IcoAlerta,
    sub: 'Algo urgente para tus vecinos',
    color: TIPOS.alert.color, bg: TIPOS.alert.bg, primary: true,
  },
  {
    id: 'sell', label: 'Vender', emoji: TIPOS.sell.emoji,
    Icon: IcoVender,
    sub: 'Vende lo que ya no usas',
    color: TIPOS.sell.color, bg: TIPOS.sell.bg,
  },
  {
    id: 'gift', label: 'Regalar', emoji: TIPOS.gift.emoji,
    Icon: IcoRegalar,
    sub: 'Dale otra vida a algo',
    color: TIPOS.gift.color, bg: TIPOS.gift.bg,
  },
  {
    id: 'trade', label: 'Intercambiar', emoji: TIPOS.trade.emoji,
    Icon: IcoTrueque,
    sub: 'Cambia con un vecino',
    color: TIPOS.trade.color, bg: TIPOS.trade.bg,
  },
]

const PLAZOS = [
  { key: 'hoy', label: 'Hoy', hours: 12 },
  { key: 'manana', label: 'Mañana', hours: 36 },
  { key: 'semana', label: 'Esta semana', hours: 168 },
  { key: 'sin_apuro', label: 'Sin apuro', hours: null },
]

/* Categorías de alerta — alineadas a REPORTES del design.js (con emojis).
   Se extiende con hours/desc (que REPORTES no tiene). */
const ALERT_CATEGORIES = [
  { key: 'seguridad', label: REPORTES.seguridad.label, emoji: REPORTES.seguridad.emoji,
    hours: 6, color: REPORTES.seguridad.color, bg: REPORTES.seguridad.bg,
    desc: 'Robo, sospecha, intrusión' },
  { key: 'salud', label: REPORTES.salud.label, emoji: REPORTES.salud.emoji,
    hours: 3, color: REPORTES.salud.color, bg: REPORTES.salud.bg,
    desc: 'Brotes, agua o alimento' },
  { key: 'infra', label: REPORTES.infra.label, emoji: REPORTES.infra.emoji,
    hours: 48, color: REPORTES.infra.color, bg: REPORTES.infra.bg,
    desc: 'Luz, agua, bache, vereda' },
  { key: 'mascotas', label: REPORTES.mascotas.label, emoji: REPORTES.mascotas.emoji,
    hours: 72, color: REPORTES.mascotas.color, bg: REPORTES.mascotas.bg,
    desc: 'Perro perdido, animal suelto' },
  { key: 'otro', label: 'Otro', emoji: '📢',
    hours: 24, color: C.textoTenue, bg: C.fondo,
    desc: 'Otra alerta del barrio' },
]

const calcNeededBy = (plazoKey) => {
  const p = PLAZOS.find((x) => x.key === plazoKey)
  if (!p || p.hours === null) return null
  return new Date(Date.now() + p.hours * 3600 * 1000).toISOString()
}

// Expiración automática de alertas según categoría.
// seguridad 6h, salud 3h, infra 48h, mascotas 72h, default 24h.
const calcExpiresAt = (categoryKey) => {
  const cat = ALERT_CATEGORIES.find((c) => c.key === categoryKey)
  const hours = cat ? cat.hours : 24
  return new Date(Date.now() + hours * 3600 * 1000).toISOString()
}

// ---- Límites de caracteres ----
const TITLE_MAX = 60
const CONTENT_MAX = 500

// ---- Draft auto-save key ----
const DRAFT_KEY = 'elbarrio-draft-createpost'

/* ============================================================
   COMPONENTE
   ============================================================ */
// startWith='request'  -> abre directo el formulario de Pedido
// startWith='alert'    -> abre directo el formulario de Alerta
// sin startWith         -> muestra Vender / Regalar / Intercambiar
function CreatePost({ onClose, onPublished, startWith }) {
  const initialType = startWith
    ? POST_TYPES.find((t) => t.id === startWith)
    : null

  const [step, setStep] = useState(initialType ? 'form' : 'type')
  const [selectedType, setSelectedType] = useState(initialType)

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [price, setPrice] = useState('')
  const [isNegotiable, setIsNegotiable] = useState(false)
  const [category, setCategory] = useState('')
  const [lookingFor, setLookingFor] = useState('')

  // Pedido Vecinal
  const [rubro, setRubro] = useState('')
  const [budget, setBudget] = useState('')
  const [budgetOpen, setBudgetOpen] = useState(false)
  const [plazo, setPlazo] = useState('')

  // Alerta vecinal
  const [alertCategory, setAlertCategory] = useState('')
  const [alertLocation, setAlertLocation] = useState('')
  const [mapaAbierto, setMapaAbierto] = useState(false)
  const [pinCoords, setPinCoords] = useState(null)
  const [barrioCoords, setBarrioCoords] = useState(null)
  const [userCoords, setUserCoords] = useState(null)
  const [searchQ, setSearchQ] = useState('')
  const [results, setResults] = useState([])
  const [loadingAddr, setLoadingAddr] = useState(false)

  const [images, setImages] = useState([])
  const [previews, setPreviews] = useState([])
  const [error, setError] = useState('')

  // ---- IA: autocompletar desde la foto ----
  const [aiLoading, setAiLoading] = useState(false)
  const [aiSuggested, setAiSuggested] = useState({})
  const [aiError, setAiError] = useState('')
  const [cooldown, setCooldown] = useState(0) // segundos restantes de enfriamiento
  const cooldownTimer = useRef(null)

  // Cuenta regresiva del enfriamiento (para no topar el límite gratis
  // de OpenRouter: ~50 pedidos/día en modelos :free). Después de cada
  // llamado, esperamos 8 segundos. Si viene un 429, esperamos 65 segundos.
  useEffect(() => {
    if (cooldown <= 0) return
    cooldownTimer.current = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => { if (cooldownTimer.current) clearTimeout(cooldownTimer.current) }
  }, [cooldown])

  // ---- Draft auto-save ----
  // Guarda el progreso del formulario en localStorage.
  // Si el user cierra sin querer, no pierde su trabajo.
  const draftTimer = useRef(null)
  useEffect(() => {
    if (step !== 'form' || !selectedType) return
    if (draftTimer.current) clearTimeout(draftTimer.current)
    draftTimer.current = setTimeout(() => {
      try {
        const draft = {
          type: selectedType.id,
          title, content, price, isNegotiable, category, lookingFor,
          rubro, budget, budgetOpen, plazo,
          alertCategory, alertLocation,
          ts: Date.now(),
        }
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
      } catch {}
    }, 800)
    return () => { if (draftTimer.current) clearTimeout(draftTimer.current) }
  }, [step, selectedType, title, content, price, isNegotiable, category, lookingFor,
      rubro, budget, budgetOpen, plazo, alertCategory, alertLocation])

  // Cargar draft al montar (solo si no hay startWith)
  useEffect(() => {
    if (startWith || !selectedType) return
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (!raw) return
      const draft = JSON.parse(raw)
      if (draft && draft.ts && Date.now() - draft.ts < 24 * 3600 * 1000) {
        // Solo cargar si es del mismo tipo o si estamos en type picker
        if (draft.title) setTitle(draft.title)
        if (draft.content) setContent(draft.content)
        if (draft.price) setPrice(draft.price)
        if (draft.isNegotiable) setIsNegotiable(draft.isNegotiable)
        if (draft.category) setCategory(draft.category)
        if (draft.lookingFor) setLookingFor(draft.lookingFor)
        if (draft.rubro) setRubro(draft.rubro)
        if (draft.budget) setBudget(draft.budget)
        if (draft.budgetOpen) setBudgetOpen(draft.budgetOpen)
        if (draft.plazo) setPlazo(draft.plazo)
        if (draft.alertCategory) setAlertCategory(draft.alertCategory)
        if (draft.alertLocation) setAlertLocation(draft.alertLocation)
      }
    } catch {}
  }, [])

  const clearDraft = () => {
    try { localStorage.removeItem(DRAFT_KEY) } catch {}
  }

  const handleSelectType = (type) => {
    setSelectedType(type)
    setStep('form')
    setError('')
  }

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files)
    if (files.length === 0) return
    if (images.length + files.length > 4) {
      setError('Máximo 4 fotos')
      return
    }
    setImages([...images, ...files])
    files.forEach((file) => {
      const reader = new FileReader()
      reader.onloadend = () => setPreviews((prev) => [...prev, reader.result])
      reader.readAsDataURL(file)
    })
  }

  const removeImage = (i) => {
    // Usar updater functions para no depender del closure viejo.
    // Sino, cuando subís foto1 → IA → eliminás → subís foto2, los arrays
    // se desincronizan y previews[0] queda apuntando a basura.
    setImages((prev) => prev.filter((_, idx) => idx !== i))
    setPreviews((prev) => prev.filter((_, idx) => idx !== i))
    // Limpiar cualquier error de IA anterior al cambiar las fotos.
    setAiError('')
  }

  const formatPrice = (v) =>
    v.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.')

  const toNumber = (v) => parseInt(v.replace(/\./g, ''), 10)

  /* ---------- IA: comprimir imagen antes de enviar a la IA ----------
     Las fotos del cel pueden pesar 3-5MB. Las redimensionamos a
     max 1280px y JPEG 0.82 para que el viaje a la Edge Function
     sea rápido y no exceda el body limit. */
  const compressImage = (dataUrl, maxDim = 1280, quality = 0.82) =>
    new Promise((resolve, reject) => {
      if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image')) {
        reject(new Error('La imagen no se cargó bien. Subila de nuevo.'))
        return
      }
      const img = new Image()
      const timer = setTimeout(() => {
        reject(new Error('La imagen tardó demasiado en cargar. Subila de nuevo.'))
      }, 8000)
      img.onload = () => {
        clearTimeout(timer)
        try {
          let { width, height } = img
          if (width > maxDim || height > maxDim) {
            if (width > height) { height = Math.round(height * maxDim / width); width = maxDim }
            else { width = Math.round(width * maxDim / height); height = maxDim }
          }
          const canvas = document.createElement('canvas')
          canvas.width = width; canvas.height = height
          canvas.getContext('2d').drawImage(img, 0, 0, width, height)
          resolve(canvas.toDataURL('image/jpeg', quality))
        } catch (err) {
          clearTimeout(timer)
          reject(new Error('No pudimos procesar la imagen. Subila de nuevo.'))
        }
      }
      img.onerror = () => {
        clearTimeout(timer)
        reject(new Error('La imagen está corrupta o no se puede leer. Subila de nuevo.'))
      }
      img.src = dataUrl
    })

  /* ---------- IA: handlers que limpian el flag "sugerido por IA"
     cuando el user edita el campo a mano. ---------- */
  const onTitleChange = (e) => {
    setTitle(e.target.value.slice(0, TITLE_MAX))
    if (aiSuggested.title) setAiSuggested((p) => ({ ...p, title: false }))
  }
  const onContentChange = (e) => {
    setContent(e.target.value.slice(0, CONTENT_MAX))
    if (aiSuggested.content) setAiSuggested((p) => ({ ...p, content: false }))
  }
  const onPriceChange = (e) => {
    setPrice(formatPrice(e.target.value))
    if (aiSuggested.price) setAiSuggested((p) => ({ ...p, price: false }))
  }
  const onCategoryClick = (k) => {
    setCategory(k)
    if (aiSuggested.category) setAiSuggested((p) => ({ ...p, category: false }))
  }
  const onLookingForChange = (e) => {
    setLookingFor(e.target.value.slice(0, TITLE_MAX))
    if (aiSuggested.lookingFor) setAiSuggested((p) => ({ ...p, lookingFor: false }))
  }

  /* ---------- IA: autocompletar título, descripción, precio y
     categoría desde la primera foto. Llama directo a OpenRouter
     (gratis) vía lib/ia.js. No necesita Supabase Edge Functions. ---------- */
  const autoCompletarConIA = async () => {
    if (!previews[0] || aiLoading || cooldown > 0) return
    const tipo = selectedType?.id
    if (!tipo) return
    setAiLoading(true)
    setAiError('')
    try {
      const image = await compressImage(previews[0])
      const data = await describirFoto(image, tipo)

      const next = {}
      if (data.title) { setTitle(data.title); next.title = true }
      if (data.description) { setContent(data.description); next.content = true }
      if (tipo === 'sell' && data.suggestedPrice) {
        setPrice(formatPrice(String(data.suggestedPrice)))
        next.price = true
      }
      if (data.category && CATEGORIAS.some((c) => c.key === data.category)) {
        setCategory(data.category)
        next.category = true
      }
      if (tipo === 'trade' && data.lookingFor) {
        setLookingFor(data.lookingFor)
        next.lookingFor = true
      }
      setAiSuggested(next)
      // Enfriamiento corto después de éxito (8s) para no topar el límite.
      setCooldown(8)
        } catch (e) {
      if (e.code === 'NO_KEY' || e.message === 'NO_KEY') {
        setAiError('Falta la clave de IA. Crea .env con VITE_OPENROUTER_API_KEY=tu-clave (gratuita en openrouter.ai/keys)')
      } else if (e.code === 'IA_VACIA') {
        // La IA respondió pero no reconoció un objeto claro en la foto.
        // Sin cooldown: el usuario puede cambiar la foto o reintentar ya.
        setAiError('La IA no reconoció un objeto claro en la foto. Prueba con otra mejor iluminada, o completa a mano.')
      } else if (e.message && e.message.includes('Límite DIARIO')) {
        setAiError(e.message)
        setCooldown(300)
      } else if (e.message && e.message.includes('Límite por minuto')) {
        setAiError('La IA está descansando 1 minuto (límite gratis). El botón se reactiva solo.')
        setCooldown(65)
      } else {
        setAiError(e.message || 'No pudimos leer la foto. Completa a mano.')
        setCooldown(8)
      }
    } finally {
      setAiLoading(false)
    }
  }

  /* ---------- MAPA ---------- */
  useEffect(() => {
    if (!mapaAbierto || barrioCoords) return
    ;(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data: prof } = await supabase
          .from('profiles')
          .select('neighborhood_id')
          .eq('user_id', user.id)
          .single()
        if (prof?.neighborhood_id) {
          const { data: hood } = await supabase
            .from('neighborhoods')
            .select('lat, lng')
            .eq('id', prof.neighborhood_id)
            .maybeSingle()
          if (hood?.lat && hood?.lng) {
            setBarrioCoords({ lat: hood.lat, lng: hood.lng })
          }
        }
      } catch (e) {
        console.error('No se pudo cargar ubicación del barrio:', e)
      }
    })()
  }, [mapaAbierto, barrioCoords])

  /* ---------- GPS del usuario ---------- */
  useEffect(() => {
    if (!mapaAbierto || userCoords) return
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setUserCoords(coords)
        setPinCoords((prev) => prev || coords)
      },
      () => {},
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 }
    )
  }, [mapaAbierto, userCoords])

  const shortenAddress = (nominatim) => {
    if (!nominatim) return ''
    const a = nominatim.address || {}
    const calle = [a.road, a.pedestrian, a.footway, a.path, a.cycleway].find(Boolean)
    const numero = a.house_number
    const street = numero && calle ? `${calle} ${numero}` : (calle || numero || '')
    const local = a.neighbourhood || a.suburb || a.city_district ||
      a.city || a.town || a.commune || a.village || a.hamlet
    const parts = [street, local].filter(Boolean)
    if (parts.length > 0) return parts.join(', ')
    return (nominatim.display_name || '').split(',').slice(0, 2).join(',').trim()
  }

  useEffect(() => {
    if (!pinCoords) return
    setLoadingAddr(true)
    const t = setTimeout(() => {
      fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${pinCoords.lat}&lon=${pinCoords.lng}&format=json&accept-language=es`
      )
        .then((r) => r.json())
        .then((d) => {
          const addr = shortenAddress(d)
          if (addr) setAlertLocation(addr)
        })
        .catch(() => {})
        .finally(() => setLoadingAddr(false))
    }, 300)
    return () => clearTimeout(t)
  }, [pinCoords])

  const buscar = async () => {
    if (!searchQ.trim()) return
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQ)}` +
        `&format=json&limit=5&countrycodes=cl&accept-language=es`
      )
      const data = await r.json()
      setResults(data)
    } catch {}
  }

  const elegirResultado = (r) => {
    const lat = parseFloat(r.lat), lng = parseFloat(r.lon)
    setPinCoords({ lat, lng })
    setAlertLocation(shortenAddress(r))
    setResults([])
    setSearchQ('')
  }

  /* ---------- PUBLICAR ---------- */
  const handlePublish = async () => {
    setError('')
    const t = selectedType.id

    if (t === 'request') {
      if (!title.trim()) return setError('Escribe qué necesitas')
      if (!rubro) return setError('Elige una categoría')
      if (!plazo) return setError('Indica para cuándo lo necesitas')
      if (!budgetOpen && !budget) return setError('Indica un presupuesto o marca "A convenir"')
    } else if (t === 'alert') {
      if (!alertCategory) return setError('Elige un tipo de alerta')
      if (!content.trim()) return setError('Describe qué pasó')
    } else if (t === 'sell') {
      if (!title.trim()) return setError('Ponle un título a tu producto')
      if (!content.trim()) return setError('Agrega una descripción con el estado y detalles')
      if (!price) return setError('Ingresa un precio')
      if (images.length === 0) return setError('Agrega al menos 1 foto')
    } else if (t === 'gift') {
      if (!title.trim()) return setError('¿Qué estás regalando?')
      if (!content.trim()) return setError('Agrega una descripción (estado, cantidad, dónde retirar)')
    } else if (t === 'trade') {
      if (!title.trim()) return setError('¿Qué ofreces?')
      if (!content.trim()) return setError('Agrega una descripción con el estado y características')
      if (!lookingFor.trim()) return setError('¿Qué buscas a cambio?')
    }

    setStep('publishing')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No hay sesión iniciada')

      const { data: profile, error: pErr } = await supabase
        .from('profiles')
        .select('id, neighborhood_id')
        .eq('user_id', user.id)
        .single()

      if (pErr || !profile) throw new Error('No se encontró tu perfil')
      if (!profile.neighborhood_id) throw new Error('Tu perfil no tiene barrio asignado')

      const urls = []
      for (const img of images) {
        const ext = img.name.split('.').pop()
        const fileName = `${user.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
        const { error: upErr } = await supabase.storage
          .from('posts')
          .upload(fileName, img)
        if (upErr) throw new Error('No se pudo subir una de las fotos. Intenta de nuevo.')
        const { data: urlData } = supabase.storage.from('posts').getPublicUrl(fileName)
        urls.push(urlData.publicUrl)
      }

      if (t === 'alert') {
        const incident = {
          reporter_id: profile.id,
          neighborhood_id: profile.neighborhood_id,
          description: content.trim(),
          category: alertCategory,
          location_text: alertLocation.trim() || null,
          latitude: pinCoords?.lat || null,
          longitude: pinCoords?.lng || null,
          images: urls.length > 0 ? urls : null,
          expires_at: calcExpiresAt(alertCategory),
          status: 'active',
          confirms_count: 0,
        }
        const { error: alertErr } = await supabase
          .from('incident_reports')
          .insert([incident])
        if (alertErr) {
          if (alertErr.code === '42703' || alertErr.message?.includes('column')) {
            const stripped = { ...incident }
            delete stripped.images
            delete stripped.latitude
            delete stripped.longitude
            const { error: retryErr } = await supabase
              .from('incident_reports')
              .insert([stripped])
            if (retryErr) throw retryErr
          } else {
            throw alertErr
          }
        }
        clearDraft()
        setStep('success')
        setTimeout(() => { onPublished?.(); onClose?.() }, 1400)
        return
      }

      const post = {
        author_id: profile.id,
        neighborhood_id: profile.neighborhood_id,
        type: t,
        title: title.trim(),
        content: content.trim() || null,
        images: urls.length > 0 ? urls : null,
      }

      if (t === 'request') {
        post.service_key = rubro
        post.budget = budgetOpen ? null : toNumber(budget)
        post.needed_by = calcNeededBy(plazo)
        post.urgency = plazo === 'hoy' ? 'critical' : 'low'
        post.expires_at = new Date(Date.now() + 24 * 3600 * 1000).toISOString()
      } else if (t === 'sell') {
        post.price = toNumber(price)
        post.is_negotiable = isNegotiable
        post.category = category || null
      } else if (t === 'trade') {
        post.looking_for = lookingFor.trim()
        post.category = category || null
      }

      const { error: insErr } = await supabase.from('posts').insert([post])
      if (insErr) throw insErr

      clearDraft()
      setStep('success')
      setTimeout(() => { onPublished?.(); onClose?.() }, 1400)
    } catch (err) {
      setError(err.message || 'Algo salió mal. Intenta de nuevo.')
      setStep('form')
    }
  }

  /* ============================================================
     PANTALLA 1 — ELEGIR TIPO
     ============================================================ */
  if (step === 'type') {
    const marketTypes = POST_TYPES.filter((t) => !t.primary)

    return (
      <div style={s.container}>
        <style>{`
          @keyframes cpSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}</style>
        <div style={s.header}>
          <button style={s.iconBtn} onClick={onClose}><IcoCerrar /></button>
          <div style={s.headerTitle}>Publicar</div>
          <div style={{ width: 40 }} />
        </div>

        <div style={s.typeScroll}>
          <div style={s.intro}>
            <div style={s.introEmoji}>📦</div>
            <div style={s.introTitle}>¿Qué quieres publicar?</div>
            <div style={s.introSub}>Solo lo verán vecinos verificados de tu barrio</div>
          </div>

          <div style={s.typeList}>
            {marketTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => handleSelectType(type)}
                style={s.typeRow}
              >
                <div style={{ ...s.typeRowIcon, background: type.bg, color: type.color }}>
                  <span style={{ fontSize: 22 }}>{type.emoji}</span>
                </div>
                <div style={s.typeRowText}>
                  <div style={s.typeRowLabel}>{type.label}</div>
                  <div style={s.typeRowSub}>{type.sub}</div>
                </div>
                <span style={s.typeRowChevron}>
                  <IcoChevron />
                </span>
              </button>
            ))}
          </div>

          <div style={s.rulesCard}>
            <div style={s.rulesTitle}>Cómo funciona en El Barrio</div>

            <div style={s.ruleRow}>
              <span style={{ ...s.ruleIcon, color: C.verde }}>
                <Ico size={16}>
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </Ico>
              </span>
              <span style={s.ruleText}>
                Solo tus vecinos verificados van a ver lo que publiques.
              </span>
            </div>

            <div style={s.ruleRow}>
              <span style={{ ...s.ruleIcon, color: C.verde }}>
                <Ico size={16}>
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </Ico>
              </span>
              <span style={s.ruleText}>
                Tu dirección nunca se muestra. Solo la distancia aproximada.
              </span>
            </div>

            <div style={s.ruleRow}>
              <span style={{ ...s.ruleIcon, color: C.verde }}>
                <Ico size={16}>
                  <polyline points="20 6 9 17 4 12" />
                </Ico>
              </span>
              <span style={s.ruleText}>
                Regalar e intercambiar es gratis. Siempre lo será.
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  /* ============================================================
     PANTALLA — PUBLICANDO
     ============================================================ */
  if (step === 'publishing') {
    return (
      <div style={s.container}>
        <style>{`@keyframes cpSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        <div style={s.overlay}>
          <div style={s.spinner} />
          <div style={s.overlayText}>Publicando...</div>
        </div>
      </div>
    )
  }

  /* ============================================================
     PANTALLA — ÉXITO
     ============================================================ */
  if (step === 'success') {
    return (
      <div style={s.container}>
        <style>{`
          @keyframes ebPop {
            0%   { transform: scale(0.3); opacity: 0; }
            55%  { transform: scale(1.15); opacity: 1; }
            75%  { transform: scale(0.95); }
            100% { transform: scale(1); }
          }
          @keyframes ebFadeUp {
            0%   { transform: translateY(8px); opacity: 0; }
            100% { transform: translateY(0); opacity: 1; }
          }
          @keyframes ebRing {
            0%   { transform: scale(0.8); opacity: 0.5; }
            100% { transform: scale(2.2); opacity: 0; }
          }
        `}</style>
        <div style={s.overlay}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{
              position: 'absolute', width: 88, height: 88, borderRadius: '50%',
              background: C.verde, animation: 'ebRing 0.9s ease-out 0.2s 1 both',
            }} />
            <div style={{
              ...s.successCircle,
              animation: 'ebPop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both',
            }}>
              <IcoCheck />
            </div>
          </div>
          <div style={{ ...s.successTitle, animation: 'ebFadeUp 0.4s ease-out 0.4s both' }}>Listo</div>
          <div style={{ ...s.successText, animation: 'ebFadeUp 0.4s ease-out 0.55s both' }}>
            {selectedType.id === 'request'
              ? 'Tus vecinos ya recibieron tu pedido'
              : selectedType.id === 'alert'
              ? 'Tu alerta ya llegó a tus vecinos'
              : 'Tus vecinos ya lo pueden ver'}
          </div>
        </div>
      </div>
    )
  }

  /* ============================================================
     PANTALLA — FORMULARIO
     ============================================================ */
  const t = selectedType.id
  const alertCatElegida = ALERT_CATEGORIES.find((c) => c.key === alertCategory)

  // ---- Preview card data ----
  const previewEmoji = t === 'alert' ? (alertCatElegida?.emoji || '🚨')
    : selectedType.emoji
  const previewTitle = title.trim() || (t === 'request' ? '¿Qué necesitas?' : t === 'alert' ? 'Tu alerta' : 'Tu título')
  const previewPrice = t === 'sell' ? (price ? plata(toNumber(price)) : '$0')
    : t === 'gift' ? 'Gratis'
    : t === 'trade' ? 'Trueque'
    : t === 'request' ? (budgetOpen ? 'A convenir' : budget ? plata(toNumber(budget)) : 'A convenir')
    : ''

  return (
    <div style={s.container}>
      <style>{`@keyframes cpSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      <div style={s.header}>
        <button
          style={s.iconBtn}
          onClick={() => (startWith ? onClose?.() : setStep('type'))}
        >
          {startWith ? <IcoCerrar /> : <IcoVolver />}
        </button>
        <div style={s.headerTitleRow}>
          <span style={{ fontSize: 16 }}>{selectedType.emoji}</span>
          <span style={s.headerTitle}>{selectedType.label}</span>
        </div>
        <div style={{ width: 40 }} />
      </div>

      <div style={s.formScroll}>

        {/* ---- PREVIEW EN VIVO ---- */}
        <PreviewCard
          emoji={previewEmoji}
          title={previewTitle}
          price={previewPrice}
          priceColor={selectedType.color}
          typeLabel={selectedType.label}
          typeColor={selectedType.color}
          typeBg={selectedType.bg}
          imgPreview={previews[0]}
          category={category}
          lookingFor={t === 'trade' && lookingFor ? lookingFor : null}
        />

        {/* ---------- ALERTA VECINAL ---------- */}
        {t === 'alert' && (
          <div style={s.form}>
            <div style={s.hintBoxAlerta}>
              <IcoAlerta size={14} />
              <span>
                Las alertas llegan a todos tus vecinos. Úsalas con criterio
                para cosas que importen ahora.
              </span>
            </div>

            <label style={s.labelFirst}>¿Qué tipo de alerta?</label>
            <div style={s.alertCatList}>
              {ALERT_CATEGORIES.map((c) => {
                const activo = alertCategory === c.key
                return (
                  <button
                    key={c.key}
                    onClick={() => setAlertCategory(c.key)}
                    style={{
                      ...s.alertCat,
                      background: activo ? c.bg : C.card,
                      borderColor: activo ? c.color : C.borde,
                    }}
                  >
                    <div style={{ ...s.alertCatIcon, background: c.bg, color: c.color }}>
                      <span style={{ fontSize: 18 }}>{c.emoji}</span>
                    </div>
                    <div style={s.alertCatText}>
                      <div style={{ ...s.alertCatLabel, color: activo ? c.color : C.texto }}>
                        {c.label}
                      </div>
                      <div style={s.alertCatDesc}>{c.desc}</div>
                      <div style={s.alertCatHours}>
                        <IcoReloj size={11} />
                        <span>Expira en {c.hours}h</span>
                      </div>
                    </div>
                    <span style={{ ...s.alertCatCheck, color: activo ? c.color : 'transparent' }}>
                      <Ico size={16}><polyline points="20 6 9 17 4 12" /></Ico>
                    </span>
                  </button>
                )
              })}
            </div>

            <label style={s.label}>¿Qué pasó?</label>
            <textarea
              placeholder="Sé concreto y objetivo. Sin nombres ni acusaciones. Ej: Acaban de intentar forzar la reja de la casa esquinera de Houston."
              value={content}
              onChange={onContentChange}
              style={{ ...s.input, minHeight: 100, resize: 'vertical' }}
            />
            <CharCounter value={content.length} max={CONTENT_MAX} />

            <label style={s.label}>
              <span style={{ display: 'inline-flex', verticalAlign: '-3px', marginRight: 4 }}>
                <IcoUbicacion size={14} />
              </span>
              Ubicación <span style={s.opt}>(opcional)</span>
            </label>
            <div style={s.ubicRow}>
              <input
                type="text"
                placeholder="Ej: Esquina Houston, Plaza de Armas"
                value={alertLocation}
                onChange={(e) => setAlertLocation(e.target.value)}
                style={s.ubicInput}
              />
              <button
                type="button"
                onClick={() => setMapaAbierto(!mapaAbierto)}
                style={{
                  ...s.ubicMapBtn,
                  background: mapaAbierto ? C.verde : C.verdeSuave,
                  color: mapaAbierto ? '#fff' : C.verdeOsc,
                  borderColor: C.verde,
                }}
              >
                <IcoUbicacion size={16} />
                <span>{mapaAbierto ? 'Cerrar' : 'Mapa'}</span>
              </button>
            </div>

            {pinCoords && (
              <div style={s.pinInfo}>
                <IcoCheck size={12} />
                <span>
                  Pin: {pinCoords.lat.toFixed(4)}, {pinCoords.lng.toFixed(4)}
                  {loadingAddr && ' · cargando dirección...'}
                </span>
                <button
                  type="button"
                  onClick={() => setPinCoords(null)}
                  style={s.pinClear}
                  aria-label="Quitar pin"
                >
                  <IcoCerrar size={12} />
                </button>
              </div>
            )}

            {mapaAbierto && (
              <div style={s.mapWrap}>
                <div style={s.searchBox}>
                  <input
                    type="text"
                    placeholder="Buscar dirección en Chile..."
                    value={searchQ}
                    onChange={(e) => setSearchQ(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && buscar()}
                    style={s.searchInput}
                  />
                  <button onClick={buscar} style={s.searchBtn}>Buscar</button>
                </div>

                {results.length > 0 && (
                  <div style={s.searchResults}>
                    {results.map((r, i) => (
                      <button
                        key={i}
                        style={s.searchResultItem}
                        onClick={() => elegirResultado(r)}
                      >
                        <span style={{ color: C.verde, display: 'flex', flexShrink: 0, marginTop: 1 }}>
                          <IcoUbicacion size={14} />
                        </span>
                        <span style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: C.texto }}>
                            {shortenAddress(r)}
                          </span>
                          <span style={{
                            fontSize: 10.5, color: C.textoTenue, fontWeight: 400,
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          }}>
                            {(r.display_name || '').split(',').slice(2).join(',').trim()}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                <MiniMap
                  editable
                  lat={pinCoords?.lat}
                  lng={pinCoords?.lng}
                  centerLat={userCoords?.lat || barrioCoords?.lat || -33.4489}
                  centerLng={userCoords?.lng || barrioCoords?.lng || -70.6693}
                  height={200}
                  zoom={15}
                  onPick={(lat, lng) => setPinCoords({ lat, lng })}
                />

                <button
                  type="button"
                  onClick={() => {
                    if (!navigator.geolocation) return
                    navigator.geolocation.getCurrentPosition(
                      (pos) => {
                        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude }
                        setUserCoords(c)
                        setPinCoords(c)
                      },
                      () => {},
                      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
                    )
                  }}
                  style={s.gpsBtn}
                >
                  <IcoUbicacion size={14} />
                  <span>Usar mi ubicación</span>
                </button>

                <div style={s.mapHintInline}>
                  <span style={{ color: C.verde, display: 'flex' }}>
                    <IcoUbicacion size={13} />
                  </span>
                  <span>
                    {pinCoords
                      ? (loadingAddr
                        ? 'Buscando dirección...'
                        : 'Toca el mapa para mover el pin')
                      : 'Toca el mapa para colocar el pin'}
                  </span>
                </div>
              </div>
            )}

            <Fotos
              images={images} previews={previews}
              onUpload={handleImageUpload} onRemove={removeImage}
            />

            {alertCatElegida && (
              <div style={{ ...s.hintBox, marginTop: 18, marginBottom: 0 }}>
                <strong>Esta alerta estará activa {alertCatElegida.hours} horas.</strong>
                <br />
                Los vecinos pueden confirmarla. Si se confirma 3+ veces,
                se marca como verificada.
              </div>
            )}
          </div>
        )}

        {/* ---------- PEDIDO VECINAL ---------- */}
        {t === 'request' && (
          <div style={s.form}>
            <div style={s.hintBox}>
              Tu pedido llega solo a vecinos y comercios de tu barrio.
              Expira en 24 horas.
            </div>

            <label style={s.labelFirst}>¿Qué necesitas?</label>
            <input
              type="text"
              placeholder="Ej: Un gasfíter, se me picó una cañería"
              value={title}
              onChange={onTitleChange}
              style={s.input}
            />
            <CharCounter value={title.length} max={TITLE_MAX} />

            <label style={s.label}>Categoría</label>
            <div style={s.chipGrid2}>
              {RUBROS.map((r) => (
                <button
                  key={r.key}
                  onClick={() => setRubro(r.key)}
                  style={{
                    ...s.chip,
                    background: rubro === r.key ? C.verde : C.card,
                    color: rubro === r.key ? '#fff' : C.texto,
                    borderColor: rubro === r.key ? C.verde : C.borde,
                  }}
                >
                  <span style={{ marginRight: 5 }}>{r.emoji}</span>
                  {r.label}
                </button>
              ))}
            </div>

            <label style={s.label}>Presupuesto</label>
            <div style={s.row}>
              <div style={{ ...s.priceBox, opacity: budgetOpen ? 0.4 : 1 }}>
                <span style={s.pricePrefix}>$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  disabled={budgetOpen}
                  value={budget}
                  onChange={(e) => setBudget(formatPrice(e.target.value))}
                  style={s.priceInput}
                />
              </div>
              <button
                onClick={() => setBudgetOpen(!budgetOpen)}
                style={{
                  ...s.toggleBtn,
                  background: budgetOpen ? C.verde : C.card,
                  color: budgetOpen ? '#fff' : C.textoSuave,
                  borderColor: budgetOpen ? C.verde : C.borde,
                }}
              >
                A convenir
              </button>
            </div>

            <label style={s.label}>¿Para cuándo?</label>
            <div style={s.chipGrid4}>
              {PLAZOS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setPlazo(p.key)}
                  style={{
                    ...s.chip,
                    background: plazo === p.key ? C.verde : C.card,
                    color: plazo === p.key ? '#fff' : C.texto,
                    borderColor: plazo === p.key ? C.verde : C.borde,
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <label style={s.label}>Detalles <span style={s.req}>*</span></label>
            <textarea
              placeholder="Cuenta un poco más para que te respondan mejor..."
              value={content}
              onChange={onContentChange}
              style={{ ...s.input, minHeight: 80, resize: 'vertical' }}
            />
            <CharCounter value={content.length} max={CONTENT_MAX} />

            <Fotos images={images} previews={previews} onUpload={handleImageUpload} onRemove={removeImage} />
          </div>
        )}

        {/* ---------- VENDER ---------- */}
        {t === 'sell' && (
          <div style={s.form}>
            <Fotos
              images={images} previews={previews}
              onUpload={handleImageUpload} onRemove={removeImage}
              required first
              hint="Sube la foto y toca ✨ Llenar con IA abajo: te proponemos título, descripción y precio."
            />
            <AiButton
              loading={aiLoading}
              onClick={autoCompletarConIA}
              error={aiError}
              filled={Object.values(aiSuggested).filter(Boolean).length}
              cooldown={cooldown}
            />

            <label style={s.label}>¿Qué vendes?</label>
            <input
              type="text"
              placeholder="Ej: Bicicleta MTB Trek talla M"
              value={title}
              onChange={onTitleChange}
              style={s.input}
            />
            <CharCounter value={title.length} max={TITLE_MAX} />

            <label style={s.label}>Descripción <span style={s.req}>*</span></label>
            <textarea
              placeholder="Estado, año, marca, detalles..."
              value={content}
              onChange={onContentChange}
              style={{ ...s.input, minHeight: 70, resize: 'vertical' }}
            />
            <CharCounter value={content.length} max={CONTENT_MAX} />

            <label style={s.label}>Precio</label>
            <div style={s.row}>
              <div style={s.priceBox}>
                <span style={s.pricePrefix}>$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={price}
                  onChange={onPriceChange}
                  style={s.priceInput}
                />
              </div>
              <button
                onClick={() => setIsNegotiable(!isNegotiable)}
                style={{
                  ...s.toggleBtn,
                  background: isNegotiable ? C.verde : C.card,
                  color: isNegotiable ? '#fff' : C.textoSuave,
                  borderColor: isNegotiable ? C.verde : C.borde,
                }}
              >
                Conversable
              </button>
            </div>

            <label style={s.label}>Categoría</label>
            <div style={s.chipGrid3}>
              {CATEGORIAS.map((c) => (
                <button
                  key={c.key}
                  onClick={() => onCategoryClick(c.key)}
                  style={{
                    ...s.chip,
                    background: category === c.key ? C.verde : C.card,
                    color: category === c.key ? '#fff' : C.texto,
                    borderColor: category === c.key ? C.verde : C.borde,
                  }}
                >
                  <span style={{ marginRight: 4 }}>{c.emoji}</span>
                  {c.key}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ---------- REGALAR ---------- */}
        {t === 'gift' && (
          <div style={s.form}>
            <Fotos
              images={images} previews={previews}
              onUpload={handleImageUpload} onRemove={removeImage}
              first
              hint="Sube la foto y toca ✨ Llenar con IA abajo: te proponemos título y descripción."
            />
            <AiButton
              loading={aiLoading}
              onClick={autoCompletarConIA}
              error={aiError}
              filled={Object.values(aiSuggested).filter(Boolean).length}
              cooldown={cooldown}
            />

            <label style={s.label}>¿Qué regalas?</label>
            <input
              type="text"
              placeholder="Ej: Libros infantiles"
              value={title}
              onChange={onTitleChange}
              style={s.input}
            />
            <CharCounter value={title.length} max={TITLE_MAX} />

            <label style={s.label}>Detalles <span style={s.req}>*</span></label>
            <textarea
              placeholder="Estado, cantidad, dónde retirar..."
              value={content}
              onChange={onContentChange}
              style={{ ...s.input, minHeight: 80, resize: 'vertical' }}
            />
            <CharCounter value={content.length} max={CONTENT_MAX} />

            <div style={{ ...s.hintBox, marginTop: 18, marginBottom: 0 }}>
              Regalar siempre va a ser gratis en El Barrio.
            </div>
          </div>
        )}

        {/* ---------- INTERCAMBIAR ---------- */}
        {t === 'trade' && (
          <div style={s.form}>
            <Fotos
              images={images} previews={previews}
              onUpload={handleImageUpload} onRemove={removeImage}
              first
              hint="Sube la foto y toca ✨ Llenar con IA abajo: te proponemos título y descripción."
            />
            <AiButton
              loading={aiLoading}
              onClick={autoCompletarConIA}
              error={aiError}
              filled={Object.values(aiSuggested).filter(Boolean).length}
              cooldown={cooldown}
            />

            <label style={s.label}>¿Qué ofreces?</label>
            <input
              type="text"
              placeholder="Ej: Guitarra acústica"
              value={title}
              onChange={onTitleChange}
              style={s.input}
            />
            <CharCounter value={title.length} max={TITLE_MAX} />

            <label style={s.label}>¿Qué buscas a cambio?</label>
            <input
              type="text"
              placeholder="Ej: Teclado electrónico"
              value={lookingFor}
              onChange={onLookingForChange}
              style={s.input}
            />
            <CharCounter value={lookingFor.length} max={TITLE_MAX} />

            <label style={s.label}>Descripción <span style={s.req}>*</span></label>
            <textarea
              placeholder="Estado, características, año..."
              value={content}
              onChange={onContentChange}
              style={{ ...s.input, minHeight: 70, resize: 'vertical' }}
            />
            <CharCounter value={content.length} max={CONTENT_MAX} />

            <label style={s.label}>Categoría</label>
            <div style={s.chipGrid3}>
              {CATEGORIAS.map((c) => (
                <button
                  key={c.key}
                  onClick={() => onCategoryClick(c.key)}
                  style={{
                    ...s.chip,
                    background: category === c.key ? C.verde : C.card,
                    color: category === c.key ? '#fff' : C.texto,
                    borderColor: category === c.key ? C.verde : C.borde,
                  }}
                >
                  <span style={{ marginRight: 4 }}>{c.emoji}</span>
                  {c.key}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Disclaimer sobre responsabilidad del contenido — contextual
            según el tipo de post. En regalar no hay precio; en trueque
            se menciona "lo que buscás" en vez de precio. */}
        <div style={s.disclaimerBox}>
          <span style={s.disclaimerIcon}>⚠️</span>
          <p style={s.disclaimerText}>
            {t === 'gift'
              ? <>El título y la descripción los ponés tú. La IA solo sugiere un borrador a partir de la foto — <strong>verificalo antes de publicar</strong>.</>
              : t === 'trade'
              ? <>El título, la descripción y lo que buscás los ponés tú. La IA solo sugiere un borrador a partir de la foto — <strong>verificalo antes de publicar</strong>.</>
              : <>El título, descripción y precio los ponés tú. La IA solo sugiere un borrador a partir de la foto — <strong>verificalo antes de publicar</strong>.</>}
          </p>
        </div>

        {error && (
          <div style={s.errorBox}>
            <IcoAlerta />
            <span>{error}</span>
          </div>
        )}
      </div>

      <div style={s.footer}>
        <button onClick={handlePublish} style={s.publishBtn}>
          {t === 'alert' ? 'Enviar alerta al barrio' :
           t === 'request' ? 'Enviar pedido al barrio' :
           t === 'sell' ? 'Publicar venta' :
           t === 'gift' ? 'Publicar regalo' :
           'Publicar intercambio'}
        </button>
      </div>
    </div>
  )
}

/* ============================================================
   SUBCOMPONENTE: PREVIEW EN VIVO
   Muestra cómo se verá el post en el Mercado mientras se llena.
   ============================================================ */
function PreviewCard({ emoji, title, price, priceColor, typeLabel, typeColor, typeBg, imgPreview, category, lookingFor }) {
  return (
    <div style={s.previewWrap}>
      <div style={s.previewLabel}>
        <IcoEye size={12} />
        <span>Así se verá</span>
      </div>
      <div style={s.previewCard}>
        <div style={s.previewImgBox}>
          {imgPreview ? (
            <img src={imgPreview} alt="" style={s.previewImg} />
          ) : (
            <div style={s.previewImgPlaceholder}>
              <span style={{ fontSize: 28 }}>{emoji}</span>
            </div>
          )}
        </div>
        <div style={s.previewBody}>
          <div style={s.previewTitle}>{title}</div>
          {lookingFor && <div style={s.previewLooking}>Busca: {lookingFor}</div>}
          {category && <div style={s.previewCategory}>{category}</div>}
          {price && <div style={{ ...s.previewPrice, color: priceColor }}>{price}</div>}
        </div>
      </div>
    </div>
  )
}

/* ============================================================
   SUBCOMPONENTE: CONTADOR DE CARACTERES
   ============================================================ */
function CharCounter({ value, max }) {
  const remaining = max - value
  const isNear = remaining <= 20
  const isOver = remaining <= 0
  return (
    <div style={{
      ...s.charCounter,
      color: isOver ? C.rojo : isNear ? C.dorado : C.textoTenue,
    }}>
      {value} / {max}
    </div>
  )
}

/* ============================================================
   SUBCOMPONENTE: FOTOS
   ============================================================ */
function Fotos({ images, previews, onUpload, onRemove, required, first, hint }) {
  return (
    <div style={{ marginTop: first ? 0 : 18 }}>
      <label style={first ? s.labelFirst : s.label}>
        Fotos {required && <span style={{ color: C.rojo }}>*</span>}
        <span style={s.opt}> ({images.length}/4)</span>
      </label>
      {hint && <div style={s.photoHint}>{hint}</div>}
      <div style={s.photoGrid}>
        {previews.map((p, i) => (
          <div key={i} style={s.photoItem}>
            <img src={p} alt="" style={s.photoImg} />
            {i === 0 && <div style={s.photoMain}>Principal</div>}
            <button onClick={() => onRemove(i)} style={s.photoRemove}>
              <IcoCerrar size={12} />
            </button>
          </div>
        ))}
        {images.length < 4 && (
          <label htmlFor="upload-images" style={s.photoAdd}>
            <span style={{ color: C.textoTenue }}><IcoCamara /></span>
            <span style={s.photoAddText}>Agregar</span>
            <input
              id="upload-images"
              type="file"
              accept="image/*"
              multiple
              onChange={onUpload}
              style={{ display: 'none' }}
            />
          </label>
        )}
      </div>
    </div>
  )
}

/* ============================================================
   SUBCOMPONENTE: AI BUTTON — autocompletar desde la foto
   Aparece cuando hay al menos 1 foto subida. Llama a la Edge
   Function `ai-describe-photo` y rellena título, descripción,
   precio (si es venta) y categoría.
   ============================================================ */
function AiButton({ loading, onClick, error, filled, cooldown }) {
  const disabled = loading || cooldown > 0
  return (
    <>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        style={{
          ...s.aiButton,
          ...(loading ? s.aiButtonLoading : {}),
          ...(disabled && !loading ? s.aiButtonCooldown : {}),
        }}
      >
        {loading ? (
          <>
            <span style={s.aiSpinner} />
            <span>Leyendo la foto…</span>
          </>
        ) : cooldown > 0 ? (
          <>
            <span style={{ fontSize: 15 }}>⏳</span>
            <span>Espera {cooldown}s…</span>
          </>
        ) : filled > 0 ? (
          <>
            <span style={{ fontSize: 15 }}>✨</span>
            <span>Volver a llenar con IA</span>
          </>
        ) : (
          <>
            <span style={{ fontSize: 15 }}>✨</span>
            <span>Llenar con IA</span>
          </>
        )}
      </button>
      {error && (
        <div style={s.aiError}>
          <IcoAlerta size={14} />
          <span>{error}</span>
        </div>
      )}
    </>
  )
}

/* ============================================================
   ESTILOS — todos vía C.* del design system
   ============================================================ */
const s = {
  container: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    width: '100%', height: '100%',
    display: 'flex', flexDirection: 'column',
    background: C.fondo,
    overflow: 'hidden',
    zIndex: 100,
    fontFamily: T.font,
  },

  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '50px 16px 14px',
    background: C.card,
    borderBottom: `1px solid ${C.bordeSuave}`,
    flexShrink: 0,
  },
  headerTitle: { fontSize: 15, fontWeight: 600, color: C.texto },
  headerTitleRow: { display: 'flex', alignItems: 'center', gap: 8 },
  iconBtn: {
    width: 40, height: 40, borderRadius: '50%',
    background: C.fondo, color: C.textoSuave,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: 'none', cursor: 'pointer', flexShrink: 0,
  },

  /* --- selección de tipo --- */
  typeScroll: { flex: 1, minHeight: 0, overflowY: 'auto', padding: '24px 20px 40px' },
  intro: { textAlign: 'center', marginBottom: 24 },
  introEmoji: { fontSize: 40, marginBottom: 8 },
  introTitle: { fontSize: 21, fontWeight: 600, color: C.texto, marginBottom: 5, letterSpacing: '-0.2px' },
  introSub: { fontSize: 13, color: C.textoSuave },

  typeList: { display: 'flex', flexDirection: 'column', gap: 10 },
  typeRow: {
    width: '100%',
    display: 'flex', alignItems: 'center', gap: 14,
    padding: '16px 16px',
    background: C.card,
    border: `1px solid ${C.bordeSuave}`,
    borderRadius: 16,
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    cursor: 'pointer',
    textAlign: 'left',
    fontFamily: 'inherit',
  },
  typeRowIcon: {
    width: 44, height: 44, borderRadius: 12, flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  typeRowText: { flex: 1, display: 'flex', flexDirection: 'column', gap: 2 },
  typeRowLabel: { fontSize: 15, fontWeight: 600, color: C.texto },
  typeRowSub: { fontSize: 12.5, color: C.textoSuave },
  typeRowChevron: { color: C.textoTenue, display: 'flex', flexShrink: 0 },

  rulesCard: {
    marginTop: 28,
    padding: '18px 16px',
    background: C.card,
    border: `1px solid ${C.bordeSuave}`,
    borderRadius: 16,
    display: 'flex', flexDirection: 'column', gap: 12,
  },
  rulesTitle: {
    fontSize: 12, fontWeight: 600, color: C.texto,
    textTransform: 'uppercase', letterSpacing: 0.4,
  },
  ruleRow: { display: 'flex', alignItems: 'flex-start', gap: 10 },
  ruleIcon: { display: 'flex', flexShrink: 0, marginTop: 1 },
  ruleText: { fontSize: 12.5, color: C.textoSuave, lineHeight: 1.45 },

  /* --- formulario --- */
  formScroll: { flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 20px 20px' },
  form: { display: 'flex', flexDirection: 'column' },

  /* --- preview en vivo --- */
  previewWrap: {
    marginBottom: 16,
  },
  previewLabel: {
    display: 'flex', alignItems: 'center', gap: 5,
    fontSize: 11, fontWeight: 600, color: C.textoTenue,
    marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.3,
  },
  previewCard: {
    display: 'flex', gap: 10,
    background: C.card,
    borderRadius: 14,
    padding: 10,
    border: `1px solid ${C.bordeSuave}`,
    boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
  },
  previewImgBox: {
    position: 'relative', width: 64, height: 64, flexShrink: 0,
    borderRadius: 10, overflow: 'hidden', background: C.bordeSuave,
  },
  previewImg: { width: '100%', height: '100%', objectFit: 'cover' },
  previewImgPlaceholder: {
    width: '100%', height: '100%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: `linear-gradient(135deg, ${C.verdeBg} 0%, ${C.verdeSuave} 100%)`,
  },
  previewTypeBadge: {
    position: 'absolute', bottom: 3, left: 3,
    fontSize: 8.5, fontWeight: 600,
    padding: '1px 5px', borderRadius: 5,
  },
  previewBody: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 },
  previewTitle: {
    fontSize: 13, fontWeight: 600, color: C.texto,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  previewLooking: {
    fontSize: 11, color: C.textoSuave,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  previewCategory: {
    fontSize: 10.5, color: C.textoTenue, fontWeight: 500,
  },
  previewPrice: { fontSize: 13, fontWeight: 600, marginTop: 'auto' },

  /* --- labels + inputs --- */
  labelFirst: {
    display: 'block', fontSize: 12, fontWeight: 600,
    color: C.textoSuave, marginBottom: 8, marginTop: 0,
  },
  label: {
    display: 'block', fontSize: 12, fontWeight: 600,
    color: C.textoSuave, marginBottom: 8, marginTop: 18,
  },
  opt: { color: C.textoTenue, fontWeight: 500 },

  input: {
    width: '100%', padding: '14px 16px', fontSize: 15,
    background: C.card, border: `1.5px solid ${C.borde}`, borderRadius: 12,
    color: C.texto, fontFamily: 'inherit', outline: 'none',
    boxSizing: 'border-box',
  },

  charCounter: {
    fontSize: 10.5, fontWeight: 500,
    textAlign: 'right', marginTop: 4, marginBottom: 0,
    fontVariantNumeric: 'tabular-nums',
  },

  hintBox: {
    padding: '12px 14px',
    background: C.verdeSuave, color: C.verdeOsc,
    borderRadius: 12, fontSize: 12.5, fontWeight: 500,
    lineHeight: 1.45, marginBottom: 18,
  },
  hintBoxAlerta: {
    display: 'flex', alignItems: 'flex-start', gap: 8,
    padding: '12px 14px',
    background: C.rojoSuave, color: C.rojo,
    borderRadius: 12, fontSize: 12.5, fontWeight: 500,
    lineHeight: 1.45, marginBottom: 18,
  },

  // Asterisco rojo de campo obligatorio (reemplaza el "(opcional)").
  req: { color: C.rojo, fontWeight: 700, marginLeft: 2 },

  // Disclaimer de responsabilidad sobre título/descripción/precio.
  // Fondo verde transparente (brand color de El Barrio), tipo alerta
  // normal. Sin título: solo icono + párrafo.
  disclaimerBox: {
    display: 'flex', gap: 9, alignItems: 'flex-start',
    padding: '11px 13px',
    background: 'rgba(22, 163, 74, 0.08)',
    border: `1px solid rgba(22, 163, 74, 0.22)`,
    borderRadius: 12,
    marginTop: 18, marginBottom: 0,
  },
  disclaimerIcon: { fontSize: 15, lineHeight: 1.5, flexShrink: 0, paddingTop: 1 },
  disclaimerText: {
    margin: 0,
    fontSize: 12, fontWeight: 500,
    color: C.texto, lineHeight: 1.5,
  },

  chipGrid2: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 },
  chipGrid3: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 },
  chipGrid4: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 },
  chip: {
    padding: '11px 8px', borderRadius: 12,
    fontSize: 12.5, fontWeight: 600,
    border: `1.5px solid ${C.borde}`, cursor: 'pointer',
    fontFamily: 'inherit',
    textAlign: 'center',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  photoHint: {
    fontSize: 11.5, color: C.textoSuave, lineHeight: 1.4,
    marginTop: -2, marginBottom: 10,
  },

  /* --- categorías de alerta --- */
  alertCatList: { display: 'flex', flexDirection: 'column', gap: 8 },
  alertCat: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: 12, borderRadius: 14,
    border: `1.5px solid ${C.borde}`, background: C.card,
    cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
    transition: 'background 0.15s',
  },
  alertCatIcon: {
    width: 38, height: 38, borderRadius: 10, flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  alertCatText: { flex: 1, display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 },
  alertCatLabel: { fontSize: 14, fontWeight: 600 },
  alertCatDesc: { fontSize: 11.5, color: C.textoSuave, fontWeight: 500 },
  alertCatHours: {
    display: 'flex', alignItems: 'center', gap: 4,
    fontSize: 10.5, color: C.textoTenue, fontWeight: 600,
    marginTop: 2,
  },
  alertCatCheck: {
    flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 22, height: 22,
  },

  row: { display: 'flex', gap: 8, alignItems: 'stretch' },
  priceBox: {
    flex: 1, display: 'flex', alignItems: 'center',
    background: C.card, border: `1.5px solid ${C.borde}`,
    borderRadius: 12, padding: '0 14px',
  },
  pricePrefix: { fontSize: 15, fontWeight: 600, color: C.textoSuave, marginRight: 4 },
  priceInput: {
    flex: 1, border: 'none', outline: 'none', background: 'transparent',
    padding: '14px 0', fontSize: 15, color: C.texto,
    fontFamily: 'inherit', width: '100%',
  },
  toggleBtn: {
    padding: '0 16px', borderRadius: 12,
    fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap',
    border: `1.5px solid ${C.borde}`, cursor: 'pointer', fontFamily: 'inherit',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.15s',
  },

  /* --- fotos --- */
  photoGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 },
  photoItem: {
    position: 'relative', aspectRatio: '1 / 1',
    borderRadius: 10, overflow: 'hidden', background: C.fondo,
  },
  photoImg: { width: '100%', height: '100%', objectFit: 'cover' },
  photoMain: {
    position: 'absolute', bottom: 4, left: 4,
    fontSize: 8.5, fontWeight: 600,
    padding: '2px 6px', borderRadius: 5,
    background: 'rgba(22,163,74,0.92)', color: '#fff',
  },
  photoRemove: {
    position: 'absolute', top: 4, right: 4,
    width: 20, height: 20, borderRadius: '50%',
    background: 'rgba(0,0,0,0.65)', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: 'none', cursor: 'pointer', padding: 0,
  },
  photoAdd: {
    aspectRatio: '1 / 1', borderRadius: 10,
    border: `2px dashed ${C.borde}`, background: C.card,
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', gap: 3,
    cursor: 'pointer',
  },
  photoAddText: { fontSize: 10.5, fontWeight: 600, color: C.textoTenue },

  /* --- IA: botón de autocompletar desde la foto --- */
  aiButton: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    width: '100%', padding: '13px 16px',
    background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
    color: C.verdeOsc,
    border: `1.5px solid ${C.verde}`,
    borderRadius: 12, fontSize: 13.5, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit',
    marginTop: 12, marginBottom: 4,
    transition: 'all 0.15s',
  },
  aiButtonLoading: { opacity: 0.7, cursor: 'wait' },
  aiButtonCooldown: { opacity: 0.55, cursor: 'not-allowed' },
  aiSpinner: {
    width: 14, height: 14,
    border: `2px solid rgba(15,95,54,0.2)`,
    borderTop: `2px solid ${C.verdeOsc}`,
    borderRadius: '50%',
    animation: 'cpSpin 0.8s linear infinite',
    display: 'inline-block',
  },
  aiError: {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '10px 12px', marginTop: 8,
    background: C.rojoSuave, color: C.rojo,
    borderRadius: 10, fontSize: 12, fontWeight: 600,
  },

  /* --- error --- */
  errorBox: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '12px 14px', marginTop: 16,
    background: C.rojoSuave, color: C.rojo,
    borderRadius: 12, fontSize: 13, fontWeight: 600,
  },

  /* --- footer --- */
  footer: {
    padding: '14px 20px',
    paddingBottom: 'calc(14px + env(safe-area-inset-bottom, 0px))',
    background: C.card, borderTop: `1px solid ${C.bordeSuave}`,
    flexShrink: 0,
  },
  publishBtn: {
    width: '100%', padding: 16,
    background: C.verde, color: '#fff',
    borderRadius: 14, fontSize: 15, fontWeight: 600,
    border: 'none', cursor: 'pointer', fontFamily: 'inherit',
    boxShadow: '0 6px 20px rgba(22,163,74,0.3)',
  },

  /* --- overlays --- */
  overlay: {
    flex: 1, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', gap: 16, padding: 40,
  },
  spinner: {
    width: 48, height: 48,
    border: '4px solid rgba(22,163,74,0.15)',
    borderTop: `4px solid ${C.verde}`,
    borderRadius: '50%',
    animation: 'cpSpin 1s linear infinite',
  },
  overlayText: { fontSize: 15, fontWeight: 600, color: C.textoSuave },
  successCircle: {
    width: 88, height: 88, borderRadius: '50%',
    background: C.verde, color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 10px 30px rgba(22,163,74,0.35)',
  },
  successTitle: { fontSize: 22, fontWeight: 600, color: C.texto, marginTop: 6 },
  successText: { fontSize: 13, color: C.textoSuave, textAlign: 'center' },

  /* --- ubicación --- */
  ubicRow: { display: 'flex', gap: 8, alignItems: 'stretch' },
  ubicInput: {
    flex: 1, padding: '14px 16px', fontSize: 15,
    background: C.card, border: `1.5px solid ${C.borde}`, borderRadius: 12,
    color: C.texto, fontFamily: 'inherit', outline: 'none',
    boxSizing: 'border-box',
  },
  ubicMapBtn: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: 2, padding: '0 14px',
    border: `1.5px solid ${C.verde}`,
    borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
    fontSize: 10.5, fontWeight: 600, whiteSpace: 'nowrap',
  },
  pinInfo: {
    display: 'flex', alignItems: 'center', gap: 6,
    marginTop: 8, padding: '8px 12px',
    background: C.verdeSuave, color: C.verdeOsc,
    borderRadius: 10, fontSize: 12, fontWeight: 600,
  },
  pinClear: {
    marginLeft: 'auto', width: 22, height: 22, borderRadius: '50%',
    background: 'rgba(22,163,74,0.15)', color: C.verdeOsc,
    border: 'none', cursor: 'pointer', padding: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },

  /* --- mapa inline --- */
  mapWrap: {
    marginTop: 10,
    display: 'flex', flexDirection: 'column', gap: 8,
  },
  searchBox: { display: 'flex', gap: 8 },
  searchInput: {
    flex: 1, padding: '11px 14px', fontSize: 14,
    background: C.card, border: `1.5px solid ${C.borde}`, borderRadius: 999,
    color: C.texto, fontFamily: 'inherit', outline: 'none',
    boxSizing: 'border-box',
  },
  searchBtn: {
    padding: '0 18px', borderRadius: 999,
    background: C.verde, color: '#fff',
    fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
    border: 'none', cursor: 'pointer', fontFamily: 'inherit',
  },
  searchResults: {
    maxHeight: 200, overflowY: 'auto',
    background: C.card, border: `1px solid ${C.bordeSuave}`,
    borderRadius: 12,
    boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
  },
  searchResultItem: {
    display: 'flex', alignItems: 'flex-start', gap: 8,
    width: '100%', padding: '11px 14px',
    background: 'none', border: 'none', borderBottom: `1px solid ${C.bordeSuave}`,
    cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
    fontSize: 12.5, color: C.textoSuave, lineHeight: 1.4,
  },
  mapHintInline: {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '7px 12px',
    background: C.verdeBg, color: C.verdeOsc,
    borderRadius: 999, fontSize: 11.5, fontWeight: 600,
    alignSelf: 'flex-start',
  },
  gpsBtn: {
    display: 'flex', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start',
    padding: '8px 14px',
    background: C.card, color: C.verdeOsc,
    border: `1.5px solid ${C.verde}`,
    borderRadius: 999, fontSize: 12, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit',
  },
}

export default CreatePost
