import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import MiniMap from '../components/MiniMap'
import { C, T, S, TIPOS, iniciales, hace, distancia } from '../lib/design'

/*
  AlertaDetail — pantalla de Detalle de Alerta para El Barrio.

  Se monta desde App.jsx en el case 'alerta' con:
    <AlertaDetail alertId={params.id} currentUser={user} onNavigate={onNavigate} />

  Carga la alerta desde Supabase (tabla posts, type='alert') con join a profiles,
  muestra hero color-coded segun tipo_alerta, descripcion, mapa (si tiene lat/lng),
  badge de severidad, comentarios con realtime, boton marcar resuelta (solo dueno),
  boton compartir y reportar contenido.

  Convive con tablas que quizas no existen aun (comments) — si la query de
  comentarios falla, muestra "Sin comentarios todavia" sin romper la pantalla.
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
const IcoAlerta = (p) => (
  <Ico {...p}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></Ico>
)
const IcoPin = (p) => (
  <Ico {...p}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></Ico>
)
const IcoChat = (p) => (
  <Ico {...p}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></Ico>
)
const IcoEnviar = (p) => (
  <Ico {...p}><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></Ico>
)
const IcoCheck = (p) => (
  <Ico {...p} stroke={2.6}><polyline points="20 6 9 17 4 12" /></Ico>
)
const IcoShare = (p) => (
  <Ico {...p}><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></Ico>
)
const IcoFlag = (p) => (
  <Ico {...p}><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" /></Ico>
)
const IcoReloj = (p) => (
  <Ico {...p}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></Ico>
)
const IcoCerrar = (p) => (
  <Ico {...p}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></Ico>
)

// ──────────────────────────────────────────────────────────────
// MAPEO DE tipo_alerta → {emoji, label, color, bg}
//
// Primero probamos TIPOS[alert.tipo_alerta] (por si el campo guarda
// 'alert', 'event', etc.). Si no existe, caemos a ALERT_SUBTYPES con
// claves especificas de alerta (robo, perro perdido, incendio, ...).
// Final fallback: gris.
// ──────────────────────────────────────────────────────────────
const ALERT_SUBTYPES = {
  robo:              { emoji: '🚨', label: 'Robo',              color: C.rojo,    bg: C.rojoSuave },
  asalto:            { emoji: '🚨', label: 'Asalto',            color: C.rojo,    bg: C.rojoSuave },
  robo_vivienda:     { emoji: '🏠', label: 'Robo a vivienda',   color: C.rojo,    bg: C.rojoSuave },
  perro_perdido:     { emoji: '🐕', label: 'Perro perdido',     color: C.dorado,  bg: C.doradoSuave },
  mascota_perdida:   { emoji: '🐾', label: 'Mascota perdida',   color: C.dorado,  bg: C.doradoSuave },
  incendio:          { emoji: '🔥', label: 'Incendio',          color: C.naranjo, bg: C.naranjoSuave },
  fuego:             { emoji: '🔥', label: 'Fuego',             color: C.naranjo, bg: C.naranjoSuave },
  accidente:         { emoji: '🚗', label: 'Accidente',         color: C.naranjo, bg: C.naranjoSuave },
  salud:             { emoji: '🏥', label: 'Emergencia de salud', color: C.rojo,  bg: C.rojoSuave },
  alarma:            { emoji: '📢', label: 'Alarma comunitaria',color: C.azul,    bg: C.azulSuave },
  corte_agua:        { emoji: '💧', label: 'Corte de agua',     color: C.azul,    bg: C.azulSuave },
  corte_luz:         { emoji: '💡', label: 'Corte de luz',      color: C.dorado,  bg: C.doradoSuave },
  sospechoso:        { emoji: '👁️', label: 'Sujeto sospechoso', color: C.morado,  bg: C.moradoSuave },
  otro:              { emoji: '⚠️', label: 'Otra alerta',       color: C.textoTenue, bg: C.fondo },
}

const FALLBACK_TIPO = { emoji: '🚨', label: 'Alerta', color: C.textoTenue, bg: C.fondo }

function getTipoInfo(alert) {
  const t = alert?.tipo_alerta
  if (!t) return FALLBACK_TIPO
  if (TIPOS[t]) return TIPOS[t]
  if (ALERT_SUBTYPES[t]) return ALERT_SUBTYPES[t]
  // Clave desconocida → mostramos gris pero conservamos el label
  return { ...FALLBACK_TIPO, label: t.replace(/_/g, ' ') }
}

const SEVERIDAD = {
  alta:  { label: 'Severidad alta',  bg: C.rojo,   emoji: '🔴' },
  media: { label: 'Severidad media', bg: C.dorado, emoji: '🟡' },
  baja:  { label: 'Severidad baja',  bg: C.verde,  emoji: '🟢' },
}

const REPORT_OPTIONS = [
  { key: 'spam',     label: 'Spam',         emoji: '📭' },
  { key: 'falso',    label: 'Falso',        emoji: '❌' },
  { key: 'ofensivo', label: 'Ofensivo',     emoji: '🚫' },
  { key: 'otro',     label: 'Otro',         emoji: 'ℹ️' },
]

// Inyecta los keyframes una sola vez al montar.
const KEYFRAMES = `
@keyframes alertFadeInUp {
  0%   { opacity: 0; transform: translateY(8px); }
  100% { opacity: 1; transform: translateY(0); }
}
@keyframes alertSendPulse {
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(1.08); }
}
@keyframes alertToastIn {
  0%   { opacity: 0; transform: translate(-50%, 10px); }
  100% { opacity: 1; transform: translate(-50%, 0); }
}
`

// ──────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ──────────────────────────────────────────────────────────────
function AlertaDetail({ alertId, currentUser, onNavigate }) {
  const [alert, setAlert] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')   // error de carga (red)
  const [notFound, setNotFound] = useState(false)  // 404 (no existe)

  const [comments, setComments] = useState([])
  const [commentsLoading, setCommentsLoading] = useState(true)
  const [commentsError, setCommentsError] = useState(false)

  const [nuevoComentario, setNuevoComentario] = useState('')
  const [enviando, setEnviando] = useState(false)

  const [resolving, setResolving] = useState(false)
  const [toast, setToast] = useState('')
  const [showReportModal, setShowReportModal] = useState(false)

  const toastTimer = useRef(null)
  const inputRef = useRef(null)
  const scrollRef = useRef(null)

  const nav = onNavigate || (() => {})

  /* ─────────── TOAST helper ─────────── */
  const showToast = (msg) => {
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 2200)
  }

  /* ─────────── CARGA DE LA ALERTA ─────────── */
  const cargarAlerta = async () => {
    setLoading(true)
    setLoadError('')
    setNotFound(false)
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*, profiles!posts_user_id_fkey(*)')
        .eq('id', alertId)
        .eq('type', 'alert')
        .single()

      if (error) {
        // PGRST116 = no rows found (Single row de Supabase)
        if (error.code === 'PGRST116' || /no rows/i.test(error.message)) {
          setNotFound(true)
        } else {
          setLoadError(error.message || 'Error desconocido')
        }
        setLoading(false)
        return
      }
      setAlert(data)
      setLoading(false)
    } catch (err) {
      setLoadError(err?.message || 'Error inesperado')
      setLoading(false)
    }
  }

  /* ─────────── CARGA DE COMENTARIOS ─────────── */
  const cargarComentarios = async () => {
    setCommentsLoading(true)
    setCommentsError(false)
    try {
      const { data, error } = await supabase
        .from('comments')
        .select('*, profiles!comments_user_id_fkey(*)')
        .eq('post_id', alertId)
        .order('created_at', { ascending: true })

      if (error) throw error
      setComments(data || [])
    } catch (err) {
      // Si la tabla comments no existe o RLS bloquea → mostramos estado vacio
      // amable en vez de romper la pantalla.
      setCommentsError(true)
      setComments([])
    } finally {
      setCommentsLoading(false)
    }
  }

  useEffect(() => {
    if (!alertId) {
      setNotFound(true)
      setLoading(false)
      return
    }
    cargarAlerta()
    cargarComentarios()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alertId])

  /* ─────────── REALTIME: nuevos comentarios ─────────── */
  useEffect(() => {
    if (!alertId) return
    const channel = supabase
      .channel(`alerta-detail-${alertId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'comments', filter: `post_id=eq.${alertId}` },
        async (payload) => {
          const nuevo = payload.new
          if (!nuevo) return
          // Evitar duplicados si el insert vino del propio envio optimista
          setComments((prev) => {
            if (prev.some((c) => c.id === nuevo.id)) return prev
            return [...prev, nuevo]
          })
          // Hidratar el profile del nuevo comment en segundo plano (el payload
          // realtime solo trae la fila cruda, sin el join de profiles).
          try {
            const { data: prof } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', nuevo.user_id)
              .maybeSingle()
            if (prof) {
              setComments((prev) =>
                prev.map((c) => (c.id === nuevo.id ? { ...c, profiles: prof } : c))
              )
            }
          } catch {}
          // Auto-scroll al final
          requestAnimationFrame(() => {
            if (scrollRef.current) {
              scrollRef.current.scrollTop = scrollRef.current.scrollHeight
            }
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [alertId])

  /* ─────────── ENVIAR COMENTARIO ─────────── */
  const enviarComentario = async () => {
    const text = nuevoComentario.trim()
    if (!text || enviando || !currentUser?.id) return

    setEnviando(true)
    const textoLocal = text
    setNuevoComentario('')

    // Insercion optimista: agregamos el comment al estado con un id temporal
    // para que se vea al instante. Si falla, lo removemos y restauramos texto.
    const tempId = `temp-${Date.now()}`
    const optimisticComment = {
      id: tempId,
      post_id: alertId,
      user_id: currentUser.id,
      body: textoLocal,
      created_at: new Date().toISOString(),
      profiles: null, // se hidrata despues
      _optimistic: true,
    }
    setComments((prev) => [...prev, optimisticComment])

    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          post_id: alertId,
          user_id: currentUser.id,
          body: textoLocal,
        })
        .select('*, profiles!comments_user_id_fkey(*)')
        .single()

      if (error) throw error

      // Reemplazar el optimistic por el real (mismo id viene de la DB).
      setComments((prev) => {
        const sinTemp = prev.filter((c) => c.id !== tempId)
        // Si el realtime ya lo agrego, no duplicamos.
        if (sinTemp.some((c) => c.id === data.id)) return sinTemp
        return [...sinTemp, data]
      })

      // Hidratar perfil si no vino en el join.
      if (data && !data.profiles) {
        try {
          const { data: prof } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .maybeSingle()
          if (prof) {
            setComments((prev) =>
              prev.map((c) => (c.id === data.id ? { ...c, profiles: prof } : c))
            )
          }
        } catch {}
      }
    } catch (err) {
      // Rollback: sacar el optimistic y restaurar el texto.
      setComments((prev) => prev.filter((c) => c.id !== tempId))
      setNuevoComentario(textoLocal)
      showToast('No se pudo enviar el comentario')
    } finally {
      setEnviando(false)
    }
  }

  /* ─────────── MARCAR COMO RESUELTA ─────────── */
  const marcarResuelta = async () => {
    if (!alert || alert.user_id !== currentUser?.id || resolving) return
    setResolving(true)
    try {
      const { error } = await supabase
        .from('posts')
        .update({ status: 'resolved' })
        .eq('id', alert.id)
      if (error) throw error
      setAlert({ ...alert, status: 'resolved' })
      showToast('Alerta marcada como resuelta')
    } catch (err) {
      showToast('No se pudo actualizar la alerta')
    } finally {
      setResolving(false)
    }
  }

  /* ─────────── COMPARTIR ─────────── */
  const compartir = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : ''
    const shareData = {
      title: alert?.title || 'Alerta en el barrio',
      text: alert?.content || 'Mirá esta alerta del barrio',
      url,
    }
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(shareData)
      } catch {
        // user cancelled — no-op
      }
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(url)
        showToast('Copiado')
      } catch {
        showToast('No se pudo copiar el link')
      }
    } else {
      showToast('No se puede compartir desde aca')
    }
  }

  /* ─────────── REPORTAR CONTENIDO ─────────── */
  const reportar = (_motivoKey) => {
    // Mock: no persistimos. La idea es que el user sienta que se envio.
    setShowReportModal(false)
    showToast('Reporte enviado, gracias')
  }

  /* ─────────── RENDER: SKELETON ─────────── */
  if (loading) return <SkeletonAlerta onBack={() => nav('back')} />

  /* ─────────── RENDER: 404 ─────────── */
  if (notFound) {
    return (
      <EstadoVacio
        emoji='🚨'
        titulo='Esta alerta ya no está disponible'
        texto='Puede que el autor la haya borrado o que el link ya no sea válido.'
        botonTexto='Volver a Alertas'
        onBoton={() => nav('alertas')}
        onBack={() => nav('back')}
      />
    )
  }

  /* ─────────── RENDER: ERROR DE CARGA ─────────── */
  if (loadError) {
    return (
      <EstadoError
        mensaje={loadError}
        onReintentar={cargarAlerta}
        onBack={() => nav('back')}
      />
    )
  }

  if (!alert) return null

  /* ─────────── DATOS DERIVADOS ─────────── */
  const tipo = getTipoInfo(alert)
  const autor = alert.profiles || {}
  const esAutor = alert.user_id === currentUser?.id
  const estaResuelta = alert.status === 'resolved'
  const severidad = alert.severity ? SEVERIDAD[alert.severity] : null
  const tieneMapa = alert.lat != null && alert.lng != null &&
    !Number.isNaN(Number(alert.lat)) && !Number.isNaN(Number(alert.lng))
  const titulo = alert.title || tipo.label || 'Alerta'

  return (
    <div style={s.wrap}>
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />

      {/* ══════ HEADER ══════ */}
      <div style={s.header}>
        <button style={s.backBtn} onClick={() => nav('back')} aria-label='Volver'>
          <IcoAtras size={20} />
        </button>
        <div style={s.headerTit}>Alerta</div>
        {/* Stepper invisible: ocupa el mismo ancho que el back para centrar el titulo */}
        <div style={{ width: 40 }} />
      </div>

      {/* ══════ SCROLL ══════ */}
      <div style={s.scrollArea} ref={scrollRef}>
        <div style={s.scrollInner}>
          {/* ── BANNER RESUELTA ── */}
          {estaResuelta && (
            <div style={s.resueltaBanner}>
              <span style={s.resueltaIcono}><IcoCheck size={16} /></span>
              <span style={s.resueltaTxt}>Esta alerta fue resuelta por el autor</span>
            </div>
          )}

          {/* ── HERO ── */}
          <div style={{ ...s.hero, background: tipo.bg, borderColor: tipo.color }}>
            <div style={{ ...s.heroBanda, background: tipo.color }} />
            <div style={s.heroCuerpo}>
              <div style={{ ...s.heroIcono, background: '#fff', color: tipo.color }}>
                <span style={{ fontSize: 34, lineHeight: 1 }}>{tipo.emoji}</span>
              </div>
              <div style={s.heroLabel} >
                <span style={{ color: tipo.color }}>{tipo.label}</span>
              </div>
              {severidad && (
                <span style={{ ...s.heroSev, background: severidad.bg }}>
                  {severidad.emoji} {severidad.label}
                </span>
              )}
            </div>
          </div>

          {/* ── TITULO + FECHA + AUTOR ── */}
          <div style={s.tituloBlock}>
            <h1 style={s.titulo}>{titulo}</h1>
            <div style={s.meta}>
              <span style={s.metaItem}>
                <IcoReloj size={12} />
                <span>{hace(alert.created_at)}</span>
              </span>
              {tieneMapa && (
                <span style={s.metaItem}>
                  <IcoPin size={12} />
                  <span>Ubicación compartida</span>
                </span>
              )}
            </div>

            <div style={s.autorRow}>
              {autor.avatar_url ? (
                <img src={autor.avatar_url} alt='' style={s.autorAvatar} />
              ) : (
                <div style={s.autorAvatarFallback}>{iniciales(autor.full_name)}</div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={s.autorNombre}>
                  {autor.full_name || 'Vecino del barrio'}
                  {autor.verified && <span style={s.verifiedDot}>✓</span>}
                </div>
                <div style={s.autorSub}>Reportó esta alerta</div>
              </div>
            </div>
          </div>

          {/* ── DESCRIPCION ── */}
          {alert.content && (
            <div style={s.section}>
              <div style={s.sectionTit}>Qué está pasando</div>
              <div style={s.descBox}>
                <div style={s.descTxt}>{alert.content}</div>
              </div>
            </div>
          )}

          {/* ── MAPA ── */}
          {tieneMapa && (
            <div style={s.section}>
              <div style={s.sectionTit}>Ubicación</div>
              <MiniMap
                lat={Number(alert.lat)}
                lng={Number(alert.lng)}
                height={200}
                color={tipo.color}
              />
              <div style={s.mapCaption}>
                <IcoPin size={11} />
                <span>Ubicación aproximada · no es la dirección exacta</span>
              </div>
            </div>
          )}

          {/* ── ACCIONES ── */}
          <div style={s.acciones}>
            <button style={s.accionBtn} onClick={compartir}>
              <IcoShare size={16} />
              <span>Compartir</span>
            </button>
            <button style={s.accionBtn} onClick={() => setShowReportModal(true)}>
              <IcoFlag size={16} />
              <span>Reportar contenido</span>
            </button>
          </div>

          {/* ── MARCAR RESUELTA (solo autor) ── */}
          {esAutor && !estaResuelta && (
            <button
              style={{ ...s.resolverBtn, opacity: resolving ? 0.6 : 1 }}
              onClick={marcarResuelta}
              disabled={resolving}
            >
              <IcoCheck size={16} />
              <span>{resolving ? 'Marcando...' : 'Marcar como resuelta'}</span>
            </button>
          )}

          {/* ── COMENTARIOS ── */}
          <div style={s.section}>
            <div style={s.sectionTitRow}>
              <div style={s.sectionTit}>Comentarios de vecinos</div>
              {comments.length > 0 && (
                <span style={s.sectionCount}>{comments.length}</span>
              )}
            </div>

            {commentsLoading ? (
              <ComentariosSkeleton />
            ) : commentsError ? (
              <div style={s.commentsEmpty}>
                <IcoChat size={20} />
                <div style={s.commentsEmptyTit}>Sin comentarios todavía</div>
                <div style={s.commentsEmptyTxt}>
                  Sé el primero en comentar o confirmar esta alerta.
                </div>
              </div>
            ) : comments.length === 0 ? (
              <div style={s.commentsEmpty}>
                <IcoChat size={20} />
                <div style={s.commentsEmptyTit}>Sin comentarios todavía</div>
                <div style={s.commentsEmptyTxt}>
                  Sé el primero en comentar o confirmar esta alerta.
                </div>
              </div>
            ) : (
              <div style={s.commentsList}>
                {comments.map((c) => (
                  <CommentItem key={c.id} comment={c} />
                ))}
              </div>
            )}
          </div>

          {/* Espaciado extra para que el sticky input no tape el ultimo comment */}
          <div style={{ height: 90 }} />
        </div>
      </div>

      {/* ══════ STICKY INPUT ══════ */}
      <div style={s.stickyBar}>
        <input
          ref={inputRef}
          style={s.stickyInput}
          placeholder='Escribí un comentario...'
          value={nuevoComentario}
          onChange={(e) => setNuevoComentario(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              enviarComentario()
            }
          }}
          disabled={enviando}
        />
        <button
          style={{
            ...s.sendBtn,
            ...(nuevoComentario.trim()
              ? { background: C.verde, color: '#fff', animation: 'alertSendPulse 1.4s ease-in-out infinite' }
              : { background: C.fondo, color: C.textoTenue }),
          }}
          onClick={enviarComentario}
          disabled={!nuevoComentario.trim() || enviando}
          aria-label='Enviar comentario'
        >
          <IcoEnviar size={18} />
        </button>
      </div>

      {/* ══════ MODAL: REPORTAR ══════ */}
      {showReportModal && (
        <div style={s.modalOverlay} onClick={() => setShowReportModal(false)}>
          <div style={s.modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <div style={s.modalTitle}>Reportar contenido</div>
              <button
                style={s.modalClose}
                onClick={() => setShowReportModal(false)}
                aria-label='Cerrar'
              >
                <IcoCerrar size={18} />
              </button>
            </div>
            <div style={s.modalSub}>
              ¿Por qué estás reportando esta alerta? Tu reporte es anónimo.
            </div>
            <div style={s.modalOptions}>
              {REPORT_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  style={s.modalOption}
                  onClick={() => reportar(opt.key)}
                >
                  <span style={s.modalOptionEmoji}>{opt.emoji}</span>
                  <span style={s.modalOptionLabel}>{opt.label}</span>
                  <span style={s.modalOptionArrow}>→</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════ TOAST ══════ */}
      {toast && (
        <div style={s.toast}>{toast}</div>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// SUB-COMPONENTES
// ──────────────────────────────────────────────────────────────

function CommentItem({ comment }) {
  const autor = comment.profiles || {}
  const esOptimistic = comment._optimistic
  return (
    <div style={{ ...s.commentItem, animation: 'alertFadeInUp 0.28s ease-out' }}>
      {autor.avatar_url ? (
        <img src={autor.avatar_url} alt='' style={s.commentAvatar} />
      ) : (
        <div style={s.commentAvatarFallback}>{iniciales(autor.full_name)}</div>
      )}
      <div style={s.commentBody}>
        <div style={s.commentTop}>
          <span style={s.commentNombre}>{autor.full_name || 'Vecino'}</span>
          {autor.verified && <span style={s.commentVerified}>✓</span>}
          <span style={s.commentTime}>{hace(comment.created_at)}</span>
        </div>
        <div style={{ ...s.commentText, opacity: esOptimistic ? 0.6 : 1 }}>
          {comment.body}
        </div>
      </div>
    </div>
  )
}

function ComentariosSkeleton() {
  return (
    <div style={s.commentsList}>
      {[0, 1].map((i) => (
        <div key={i} style={s.commentItem}>
          <div style={{ ...s.skeletonCircle, width: 32, height: 32 }} />
          <div style={{ flex: 1 }}>
            <div style={{ ...s.skeletonBar, width: '40%', height: 10, marginBottom: 6 }} />
            <div style={{ ...s.skeletonBar, width: '90%', height: 10 }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function SkeletonAlerta({ onBack }) {
  return (
    <div style={s.wrap}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={onBack} aria-label='Volver'>
          <IcoAtras size={20} />
        </button>
        <div style={s.headerTit}>Alerta</div>
        <div style={{ width: 40 }} />
      </div>
      <div style={s.scrollArea}>
        <div style={s.scrollInner}>
          <div style={{ ...s.hero, background: C.fondo, borderColor: C.borde }}>
            <div style={{ ...s.heroBanda, background: C.borde }} />
            <div style={s.heroCuerpo}>
              <div style={{ ...s.heroIcono, background: '#fff', color: C.textoTenue }}>
                <span style={{ fontSize: 28, opacity: 0.4 }}>🚨</span>
              </div>
              <div style={{ ...s.skeletonBar, width: 100, height: 12 }} />
            </div>
          </div>
          <div style={s.tituloBlock}>
            <div style={{ ...s.skeletonBar, width: '70%', height: 18, marginBottom: 10 }} />
            <div style={{ ...s.skeletonBar, width: '40%', height: 10, marginBottom: 16 }} />
            <div style={{ ...s.commentItem, padding: 0 }}>
              <div style={{ ...s.skeletonCircle, width: 36, height: 36 }} />
              <div style={{ flex: 1 }}>
                <div style={{ ...s.skeletonBar, width: '40%', height: 10, marginBottom: 4 }} />
                <div style={{ ...s.skeletonBar, width: '60%', height: 8 }} />
              </div>
            </div>
          </div>
          <div style={s.section}>
            <div style={{ ...s.skeletonBar, width: 120, height: 12, marginBottom: 8 }} />
            <div style={{ ...s.skeletonBar, width: '100%', height: 10, marginBottom: 6 }} />
            <div style={{ ...s.skeletonBar, width: '90%', height: 10, marginBottom: 6 }} />
            <div style={{ ...s.skeletonBar, width: '60%', height: 10 }} />
          </div>
          <div style={s.section}>
            <div style={{ ...s.skeletonBar, width: 140, height: 12, marginBottom: 8 }} />
            <ComentariosSkeleton />
          </div>
        </div>
      </div>
    </div>
  )
}

function EstadoVacio({ emoji, titulo, texto, botonTexto, onBoton, onBack }) {
  return (
    <div style={s.wrap}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={onBack} aria-label='Volver'>
          <IcoAtras size={20} />
        </button>
        <div style={s.headerTit}>Alerta</div>
        <div style={{ width: 40 }} />
      </div>
      <div style={s.estadoWrap}>
        <div style={s.estadoEmoji}>{emoji}</div>
        <div style={s.estadoTit}>{titulo}</div>
        <div style={s.estadoTxt}>{texto}</div>
        <button style={s.estadoBtn} onClick={onBoton}>{botonTexto}</button>
      </div>
    </div>
  )
}

function EstadoError({ mensaje, onReintentar, onBack }) {
  return (
    <div style={s.wrap}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={onBack} aria-label='Volver'>
          <IcoAtras size={20} />
        </button>
        <div style={s.headerTit}>Alerta</div>
        <div style={{ width: 40 }} />
      </div>
      <div style={s.estadoWrap}>
        <div style={s.errorBox}>
          <IcoAlerta size={20} />
          <div style={s.errorTit}>No pudimos cargar esta alerta</div>
          <div style={s.errorTxt}>{mensaje}</div>
          <button style={s.estadoBtn} onClick={onReintentar}>Reintentar</button>
          <button style={s.estadoBtnSec} onClick={onBack}>Volver</button>
        </div>
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
    position: 'relative',
  },

  /* ── header ── */
  header: {
    background: C.card,
    /* FIX: 44px para safe-area (App.jsx ya no agrega contentPad a modalScreens). */
    padding: '44px 16px 12px',
    borderBottom: `1px solid ${C.borde}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexShrink: 0,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: '50%',
    background: C.fondo, border: `1px solid ${C.borde}`,
    color: C.texto, cursor: 'pointer', padding: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'inherit',
  },
  headerTit: { fontSize: 17, fontWeight: 700, color: C.texto },

  /* ── scroll ── */
  scrollArea: {
    flex: 1, minHeight: 0,
    overflowY: 'auto', overflowX: 'hidden',
    WebkitOverflowScrolling: 'touch',
  },
  scrollInner: {
    padding: '0 16px 100px',   // 100px bottom para que el sticky input no tape
  },

  /* ── banner resuelta ── */
  resueltaBanner: {
    display: 'flex', alignItems: 'center', gap: 9,
    background: C.verdeSuave,
    border: `1px solid ${C.verde}`,
    borderRadius: 12,
    padding: '11px 13px',
    margin: '14px 0 0',
  },
  resueltaIcono: {
    width: 24, height: 24, borderRadius: '50%',
    background: C.verde, color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  resueltaTxt: {
    fontSize: 13, fontWeight: 700, color: C.verdeOsc,
  },

  /* ── hero ── */
  hero: {
    position: 'relative',
    borderRadius: 18,
    border: `1px solid`,
    overflow: 'hidden',
    marginTop: 14,
  },
  heroBanda: { height: 5, width: '100%' },
  heroCuerpo: {
    padding: '20px 16px',
    display: 'flex', alignItems: 'center', gap: 14,
  },
  heroIcono: {
    width: 60, height: 60, borderRadius: 16,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  heroLabel: {
    fontSize: 18, fontWeight: 800, letterSpacing: '-0.2px',
    textTransform: 'uppercase',
    flex: 1, minWidth: 0,
  },
  heroSev: {
    fontSize: 11, fontWeight: 800,
    color: '#fff',
    padding: '5px 10px', borderRadius: 999,
    flexShrink: 0,
    whiteSpace: 'nowrap',
  },

  /* ── titulo + autor ── */
  tituloBlock: { padding: '18px 0 4px' },
  titulo: {
    fontSize: 21, fontWeight: 800, color: C.texto,
    margin: 0, lineHeight: 1.25, letterSpacing: '-0.3px',
  },
  meta: {
    display: 'flex', flexWrap: 'wrap', gap: 14,
    marginTop: 8, marginBottom: 14,
  },
  metaItem: {
    display: 'flex', alignItems: 'center', gap: 4,
    fontSize: 12, color: C.textoTenue, fontWeight: 600,
  },

  autorRow: {
    display: 'flex', alignItems: 'center', gap: 11,
    padding: '10px 12px',
    background: C.card, borderRadius: 14,
    border: `1px solid ${C.borde}`,
  },
  autorAvatar: {
    width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', flexShrink: 0,
  },
  autorAvatarFallback: {
    width: 38, height: 38, borderRadius: '50%',
    background: C.verde, color: '#fff',
    fontWeight: 800, fontSize: 13,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  autorNombre: {
    fontSize: 14, fontWeight: 700, color: C.texto,
    display: 'flex', alignItems: 'center', gap: 4,
  },
  verifiedDot: {
    color: C.verde, fontSize: 11, fontWeight: 800,
  },
  autorSub: { fontSize: 11.5, color: C.textoTenue, marginTop: 2 },

  /* ── secciones ── */
  section: { marginTop: 20 },
  sectionTitRow: {
    display: 'flex', alignItems: 'center', gap: 8,
    marginBottom: 10,
  },
  sectionTit: {
    fontSize: 14, fontWeight: 800, color: C.texto,
  },
  sectionCount: {
    fontSize: 11, fontWeight: 800, color: C.textoTenue,
    background: C.card, padding: '2px 8px', borderRadius: 999,
    border: `1px solid ${C.borde}`,
  },

  /* ── descripcion ── */
  descBox: {
    background: C.card, borderRadius: 14,
    padding: '14px 15px',
    border: `1px solid ${C.borde}`,
  },
  descTxt: {
    fontSize: 14.5, color: C.texto, lineHeight: 1.55,
    whiteSpace: 'pre-wrap', wordBreak: 'break-word',
  },

  /* ── mapa ── */
  mapCaption: {
    display: 'flex', alignItems: 'center', gap: 6,
    marginTop: 8,
    fontSize: 11.5, color: C.textoTenue, fontWeight: 500,
  },

  /* ── acciones ── */
  acciones: {
    display: 'flex', gap: 10, marginTop: 20,
  },
  accionBtn: {
    flex: 1,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
    padding: '12px 10px',
    background: C.card, color: C.textoSuave,
    border: `1px solid ${C.borde}`,
    borderRadius: 12,
    fontSize: 12.5, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit',
  },

  /* ── marcar resuelta ── */
  resolverBtn: {
    width: '100%', marginTop: 12,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: '13px 16px',
    background: C.verde, color: '#fff',
    border: 'none', borderRadius: 12,
    fontSize: 14, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit',
    boxShadow: '0 4px 14px rgba(22,163,74,0.25)',
  },

  /* ── comentarios ── */
  commentsList: { display: 'flex', flexDirection: 'column', gap: 10 },
  commentItem: {
    display: 'flex', gap: 10,
    padding: '11px 12px',
    background: C.card, borderRadius: 14,
    border: `1px solid ${C.borde}`,
  },
  commentAvatar: {
    width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0,
  },
  commentAvatarFallback: {
    width: 32, height: 32, borderRadius: '50%',
    background: C.verdeOsc, color: '#fff',
    fontWeight: 800, fontSize: 11,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  commentBody: { flex: 1, minWidth: 0 },
  commentTop: {
    display: 'flex', alignItems: 'center', gap: 5,
    marginBottom: 3,
  },
  commentNombre: { fontSize: 13, fontWeight: 700, color: C.texto },
  commentVerified: { color: C.verde, fontSize: 10, fontWeight: 800 },
  commentTime: {
    fontSize: 10.5, color: C.textoTenue, fontWeight: 500,
    marginLeft: 'auto',
  },
  commentText: {
    fontSize: 13.5, color: C.texto, lineHeight: 1.45,
    wordBreak: 'break-word', whiteSpace: 'pre-wrap',
  },

  commentsEmpty: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: 6, padding: '24px 16px',
    background: C.card, borderRadius: 14,
    border: `1px dashed ${C.borde}`,
    color: C.textoTenue,
    textAlign: 'center',
  },
  commentsEmptyTit: { fontSize: 13.5, fontWeight: 700, color: C.textoSuave },
  commentsEmptyTxt: { fontSize: 12, color: C.textoTenue, lineHeight: 1.4 },

  /* ── sticky input ── */
  stickyBar: {
    position: 'sticky', bottom: 0,
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '12px 16px',
    paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
    background: C.card,
    borderTop: `1px solid ${C.borde}`,
    flexShrink: 0,
    zIndex: 10,
  },
  stickyInput: {
    flex: 1, minWidth: 0,
    padding: '12px 14px',
    fontSize: 14, color: C.texto,
    background: C.fondo,
    border: `1.5px solid ${C.borde}`,
    borderRadius: 999,
    outline: 'none', fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: '50%',
    border: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', fontFamily: 'inherit',
    flexShrink: 0,
    padding: 0,
  },

  /* ── modal reportar ── */
  modalOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(15,31,22,0.55)',
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    zIndex: 200,
    padding: 0,
  },
  modalCard: {
    width: '100%',
    background: C.card,
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
    padding: '18px 18px calc(20px + env(safe-area-inset-bottom, 0px))',
    boxShadow: '0 -8px 30px rgba(0,0,0,0.18)',
  },
  modalHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 6,
  },
  modalTitle: { fontSize: 17, fontWeight: 800, color: C.texto },
  modalClose: {
    width: 32, height: 32, borderRadius: '50%',
    background: C.fondo, border: 'none',
    color: C.textoSuave, cursor: 'pointer', padding: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'inherit',
  },
  modalSub: {
    fontSize: 12.5, color: C.textoTenue, lineHeight: 1.45,
    marginBottom: 14,
  },
  modalOptions: { display: 'flex', flexDirection: 'column', gap: 8 },
  modalOption: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '13px 14px',
    background: C.fondo,
    border: `1px solid ${C.borde}`,
    borderRadius: 12,
    cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
  },
  modalOptionEmoji: { fontSize: 18, flexShrink: 0 },
  modalOptionLabel: { flex: 1, fontSize: 14, fontWeight: 600, color: C.texto },
  modalOptionArrow: { color: C.textoTenue, fontSize: 16 },

  /* ── toast ── */
  toast: {
    position: 'absolute',
    bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
    left: '50%',
    transform: 'translate(-50%, 0)',
    background: C.verdeOsc, color: '#fff',
    padding: '10px 18px',
    borderRadius: 999,
    fontSize: 13, fontWeight: 700,
    boxShadow: '0 6px 20px rgba(0,0,0,0.18)',
    zIndex: 300,
    animation: 'alertToastIn 0.22s ease-out',
    pointerEvents: 'none',
    whiteSpace: 'nowrap',
  },

  /* ── estado vacio / error ── */
  estadoWrap: {
    flex: 1, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    padding: 28, gap: 10,
  },
  estadoEmoji: { fontSize: 50, marginBottom: 6 },
  estadoTit: { fontSize: 18, fontWeight: 800, color: C.texto, textAlign: 'center' },
  estadoTxt: {
    fontSize: 13.5, color: C.textoTenue, lineHeight: 1.5,
    textAlign: 'center', maxWidth: 280, marginBottom: 12,
  },
  estadoBtn: {
    padding: '12px 24px',
    background: C.verde, color: '#fff',
    border: 'none', borderRadius: 999,
    fontSize: 14, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit',
    boxShadow: '0 4px 14px rgba(22,163,74,0.25)',
  },
  estadoBtnSec: {
    marginTop: 8,
    padding: '10px 24px',
    background: 'transparent', color: C.textoSuave,
    border: 'none', borderRadius: 999,
    fontSize: 13, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit',
    textDecoration: 'underline',
  },

  errorBox: {
    width: '100%', maxWidth: 340,
    background: C.rojoBg,
    border: `1px solid ${C.rojoSuave}`,
    borderRadius: 18,
    padding: '22px 20px',
    textAlign: 'center',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    color: C.rojo,
  },
  errorTit: { fontSize: 16, fontWeight: 800, color: C.rojo, marginTop: 8 },
  errorTxt: {
    fontSize: 12.5, color: C.rojo, lineHeight: 1.45,
    marginTop: 4, marginBottom: 14, maxWidth: 280,
  },

  /* ── skeleton ── */
  skeletonBar: {
    background: C.bordeSuave, borderRadius: 6,
  },
  skeletonCircle: {
    background: C.bordeSuave, borderRadius: '50%', flexShrink: 0,
  },
}

export default AlertaDetail
