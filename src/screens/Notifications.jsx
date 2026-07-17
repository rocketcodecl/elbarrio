import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { C, T, S } from '../lib/design'

/* ============================================================
   Notifications.jsx — Pantalla de Notificaciones de El Barrio.

   Se monta desde App.jsx: case 'notificaciones'.
   Props: { currentUser, onNavigate }.

   Lee de la tabla `notifications` (id, user_id, type, title,
   body, data jsonb, read_at timestamptz null, created_at).
   Si la tabla no existe, captura el error y muestra un estado
   vacío amistoso (NO rompe la pantalla).

   Realtime: se suscribe a INSERT/UPDATE en `notifications`
   filtrado por user_id, para que aparezcan en vivo.
   ============================================================ */

/* ===== ICONOS SVG INLINE ===== */
const Svg = ({ size = 18, children, stroke = 1.9, fill = 'none' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill}
    stroke="currentColor" strokeWidth={stroke}
    strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
)
const IcoBack       = (p) => <Svg {...p} stroke={2.4}><polyline points="15 18 9 12 15 6" /></Svg>
const IcoChat       = (p) => <Svg {...p}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></Svg>
const IcoReply      = (p) => <Svg {...p}><polyline points="9 17 4 12 9 7" /><path d="M20 18v-2a4 4 0 0 0-4-4H4" /></Svg>
const IcoOffer      = (p) => <Svg {...p}><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></Svg>
const IcoAlert      = (p) => <Svg {...p}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></Svg>
const IcoMention    = (p) => <Svg {...p}><circle cx="12" cy="12" r="4" /><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8" /></Svg>
const IcoCalendar   = (p) => <Svg {...p}><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></Svg>
const IcoGear       = (p) => <Svg {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></Svg>
const IcoBell       = (p) => <Svg {...p}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></Svg>
const IcoBellOff    = (p) => <Svg {...p}><path d="M13.73 21a2 2 0 0 1-3.46 0" /><path d="M18.63 13A17.89 17.89 0 0 1 18 8" /><path d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14" /><path d="M18 8a6 6 0 0 0-9.33-5" /><line x1="1" y1="1" x2="23" y2="23" /></Svg>
const IcoCheck      = (p) => <Svg {...p} stroke={2.6}><polyline points="20 6 9 17 4 12" /></Svg>
const IcoCheckCheck = (p) => <Svg {...p} stroke={2.2}><polyline points="18 6 7 17 2 12" /><polyline points="22 6 11 17" /></Svg>
const IcoRefresh    = (p) => <Svg {...p}><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></Svg>

/* ===== CONFIG DE TYPES (color del círculo + ícono) ===== */
const TYPE_CONFIG = {
  message: { bg: '#dbeafe', color: '#2563eb', Icon: IcoChat },
  reply:   { bg: '#dcfce7', color: '#16a34a', Icon: IcoReply },
  offer:   { bg: '#fef3c7', color: '#d97706', Icon: IcoOffer },
  alert:   { bg: '#fee2e2', color: '#dc2626', Icon: IcoAlert },
  mention: { bg: '#f3e8ff', color: '#9333ea', Icon: IcoMention },
  event:   { bg: '#cffafe', color: '#0891b2', Icon: IcoCalendar },
  system:  { bg: '#f3f4f6', color: '#6b7280', Icon: IcoGear },
  default: { bg: '#f3f4f6', color: '#6b7280', Icon: IcoBell },
}
const getType = (t) => TYPE_CONFIG[t] || TYPE_CONFIG.default

/* ===== TIMESTAMP RELATIVO: "hace 5 min", "hace 2 h", "ayer", "hace 3 d" ===== */
function timeAgo(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const thatDay = new Date(d)
  thatDay.setHours(0, 0, 0, 0)
  const dayDiff = Math.round((today - thatDay) / (1000 * 60 * 60 * 24))

  if (dayDiff === 1) return 'ayer'
  if (dayDiff === 0) {
    const diff = Date.now() - d.getTime()
    const sec = Math.max(1, Math.floor(diff / 1000))
    const min = Math.floor(sec / 60)
    const hor = Math.floor(min / 60)
    if (sec < 60)   return 'recién'
    if (min < 60)   return `hace ${min} min`
    if (hor === 1)  return 'hace 1 h'
    return `hace ${hor} h`
  }
  if (dayDiff < 7)  return `hace ${dayDiff} d`
  if (dayDiff < 30) return `hace ${Math.floor(dayDiff / 7)} sem`
  return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })
}

/* ===== ANIMACIONES (keyframes inyectados una sola vez) ===== */
const ANIM_STYLE = `
@keyframes nfPulse {
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(1.12); }
}
@keyframes nfSpin { to { transform: rotate(360deg); } }
@keyframes nfShimmer {
  0%   { background-position: -200px 0; }
  100% { background-position: calc(200px + 100%) 0; }
}
.nf-pulse { animation: nfPulse 1.6s ease-in-out infinite; transform-origin: center; }
.nf-spin  { animation: nfSpin 0.9s linear infinite; }
.nf-skel {
  background: linear-gradient(90deg, #eef2ee 25%, #e2e8e2 37%, #eef2ee 63%);
  background-size: 400px 100%;
  animation: nfShimmer 1.4s ease infinite;
}
`

/* ============================================================
   COMPONENTE PRINCIPAL
   ============================================================ */
function Notifications({ currentUser, onNavigate }) {
  const [notifs, setNotifs]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(false)
  const [tab, setTab]           = useState('todas')   // 'todas' | 'noleidas'
  const [markingAll, setMarkingAll] = useState(false)

  // Pull-to-refresh
  const [pullDist, setPullDist]   = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const startYRef  = useRef(null)
  const scrollRef  = useRef(null)

  /* ── CARGA INICIAL ── */
  const loadNotifications = async () => {
    if (!currentUser?.id) return
    setError(false)
    try {
      const { data, error: qErr } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (qErr) throw qErr
      setNotifs(data || [])
    } catch (err) {
      // Tabla inexistente, RLS bloqueando, o error de red:
      // NO rompemos la pantalla. Mostramos estado vacío amistoso.
      console.warn('[Notifications] error cargando:', err?.message || err)
      setError(true)
      setNotifs([])
    } finally {
      setLoading(false)
    }
  }

  /* ── EFFECT: carga + suscripción realtime ── */
  useEffect(() => {
    if (!currentUser?.id) return
    loadNotifications()

    const canal = supabase
      .channel(`notif-${currentUser.id}`)
      .on('postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${currentUser.id}`,
        },
        (payload) => {
          // Hidratación optimista: lo agrega al tope si no estaba.
          setNotifs(prev => {
            if (prev.some(n => n.id === payload.new.id)) return prev
            return [payload.new, ...prev].slice(0, 50)
          })
        }
      )
      .on('postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${currentUser.id}`,
        },
        (payload) => {
          setNotifs(prev => prev.map(n => n.id === payload.new.id ? payload.new : n))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [currentUser?.id])

  /* ── FILTROS DERIVADOS ── */
  const noLeidas = notifs.filter(n => !n.read_at)
  const visibles = tab === 'noleidas' ? noLeidas : notifs

  /* ── MARCAR UNA COMO LEÍDA (optimista + fade-in vía transición CSS) ── */
  const marcarLeida = async (notif) => {
    if (notif.read_at) return
    const stamp = new Date().toISOString()
    setNotifs(prev => prev.map(n => n.id === notif.id ? { ...n, read_at: stamp } : n))
    try {
      await supabase
        .from('notifications')
        .update({ read_at: stamp })
        .eq('id', notif.id)
    } catch (err) {
      console.warn('[Notifications] error marcando leída:', err?.message || err)
    }
  }

  /* ── CLICK EN UNA NOTIFICACIÓN ── */
  const handleClick = (notif) => {
    marcarLeida(notif)
    const data = notif.data || {}
    if (data.postId) {
      onNavigate('productdetail', { postId: data.postId })
    } else if (data.chatId || data.sellerId) {
      onNavigate('chatconversation', { sellerId: data.sellerId || data.chatId })
    } else if (data.alertId) {
      onNavigate('alerta', { id: data.alertId })
    }
    // Si no hay data de navegación, queda acá (sólo se marca leída).
  }

  /* ── MARCAR TODAS COMO LEÍDAS ── */
  const marcarTodas = async () => {
    if (noLeidas.length === 0 || markingAll) return
    setMarkingAll(true)
    const stamp = new Date().toISOString()
    // Optimista
    setNotifs(prev => prev.map(n => n.read_at ? n : { ...n, read_at: stamp }))
    try {
      await supabase
        .from('notifications')
        .update({ read_at: stamp })
        .eq('user_id', currentUser.id)
        .is('read_at', null)
    } catch (err) {
      console.warn('[Notifications] error marcando todas:', err?.message || err)
    } finally {
      setMarkingAll(false)
    }
  }

  /* ── PULL-TO-REFRESH ── */
  const onTouchStart = (e) => {
    if (scrollRef.current && scrollRef.current.scrollTop <= 0) {
      startYRef.current = e.touches[0].clientY
    } else {
      startYRef.current = null
    }
  }
  const onTouchMove = (e) => {
    if (startYRef.current === null || refreshing) return
    const dy = e.touches[0].clientY - startYRef.current
    if (dy > 0 && scrollRef.current && scrollRef.current.scrollTop <= 0) {
      const dist = Math.min(dy * 0.5, 80)
      setPullDist(dist)
    }
  }
  const onTouchEnd = async () => {
    if (pullDist > 55 && !refreshing) {
      setRefreshing(true)
      setPullDist(60)
      await loadNotifications()
      setTimeout(() => {
        setRefreshing(false)
        setPullDist(0)
      }, 350)
    } else {
      setPullDist(0)
    }
    startYRef.current = null
  }

  /* ============================================================
     RENDER
     ============================================================ */
  return (
    <div style={s.wrap}>
      <style dangerouslySetInnerHTML={{ __html: ANIM_STYLE }} />

      {/* HEADER */}
      <div style={s.header}>
        <button style={s.backBtn} onClick={() => onNavigate('back')} aria-label="Volver">
          <IcoBack size={20} color={C.texto} />
        </button>
        <div style={s.headerTit}>Notificaciones</div>
        <button
          style={{
            ...s.markAllBtn,
            opacity: (noLeidas.length === 0 || markingAll) ? 0.4 : 1,
          }}
          onClick={marcarTodas}
          disabled={noLeidas.length === 0 || markingAll}
          aria-label="Marcar todas como leídas"
        >
          <IcoCheckCheck size={16} color={C.verde} />
          <span>Marcar todas</span>
        </button>
      </div>

      {/* TABS */}
      <div style={s.tabsRow}>
        <button
          style={{ ...s.tab, ...(tab === 'todas' ? s.tabActive : {}) }}
          onClick={() => setTab('todas')}
        >
          Todas
          {notifs.length > 0 && (
            <span style={{
              ...s.tabCount,
              ...(tab === 'todas' ? s.tabCountActive : {}),
            }}>
              {notifs.length}
            </span>
          )}
        </button>
        <button
          style={{ ...s.tab, ...(tab === 'noleidas' ? s.tabActive : {}) }}
          onClick={() => setTab('noleidas')}
        >
          No leídas
          {noLeidas.length > 0 && (
            <span style={s.tabBadge} className="nf-pulse">
              {noLeidas.length}
            </span>
          )}
        </button>
      </div>

      {/* SCROLL AREA */}
      <div
        ref={scrollRef}
        style={s.scroll}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Pull indicator */}
        <div style={{
          ...s.pullIndicator,
          height: pullDist,
          opacity: pullDist > 6 ? Math.min(pullDist / 55, 1) : 0,
        }}>
          <div className={refreshing ? 'nf-spin' : ''} style={s.pullSpinner}>
            <IcoRefresh size={18} color={C.verde} />
          </div>
          <span style={s.pullText}>
            {refreshing ? 'Actualizando...' : 'Soltá para actualizar'}
          </span>
        </div>

        {/* ESTADO LOADING: 4 skeletons */}
        {loading && (
          <div style={s.list}>
            {[0, 1, 2, 3].map(i => (
              <div key={i} style={s.row}>
                <div className="nf-skel" style={s.skelCircle} />
                <div style={s.skelBody}>
                  <div className="nf-skel" style={s.skelLine1} />
                  <div className="nf-skel" style={s.skelLine2} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ESTADO ERROR (tabla inexistente u otro error de query) */}
        {!loading && error && (
          <div style={s.empty}>
            <div style={s.emptyIconBox}>
              <IcoBell size={36} color={C.textoTenue} />
            </div>
            <div style={s.emptyTitle}>Todavía no tenés notificaciones</div>
            <div style={s.emptySub}>
              Cuando alguien te escriba, responda tus publicaciones o
              pase algo en el barrio, lo vas a ver acá.
            </div>
          </div>
        )}

        {/* ESTADO VACÍO REAL */}
        {!loading && !error && visibles.length === 0 && (
          <div style={s.empty}>
            {tab === 'noleidas' && notifs.length > 0 ? (
              <>
                <div style={s.emptyIconBox}>
                  <IcoCheck size={36} color={C.verde} />
                </div>
                <div style={s.emptyTitle}>Todo al día</div>
                <div style={s.emptySub}>
                  No tenés notificaciones sin leer.
                </div>
              </>
            ) : (
              <>
                <div style={s.emptyIconBox}>
                  <IcoBellOff size={36} color={C.verde} />
                </div>
                <div style={s.emptyTitle}>Sin novedades por ahora</div>
                <div style={s.emptySub}>
                  Cuando alguien te escriba o responda tus publicaciones,
                  lo vas a ver acá.
                </div>
              </>
            )}
          </div>
        )}

        {/* LISTA */}
        {!loading && !error && visibles.length > 0 && (
          <div style={s.list}>
            {visibles.map(notif => {
              const tcfg    = getType(notif.type)
              const Icon    = tcfg.Icon
              const noLeida = !notif.read_at
              return (
                <div
                  key={notif.id}
                  style={{
                    ...s.row,
                    backgroundColor: noLeida ? '#f0fdf4' : '#ffffff',
                    paddingLeft: noLeida ? 26 : 14,  // hueco para el punto verde
                  }}
                  onClick={() => handleClick(notif)}
                >
                  {/* Punto verde a la izquierda si no leída (con fade-out) */}
                  <div style={{
                    ...s.unreadDot,
                    opacity: noLeida ? 1 : 0,
                  }} />

                  {/* Círculo de icono según type */}
                  <div style={{ ...s.iconCircle, background: tcfg.bg }}>
                    <Icon size={18} color={tcfg.color} />
                  </div>

                  {/* Cuerpo */}
                  <div style={s.body}>
                    <div style={s.titleLine}>
                      <span style={{
                        ...s.title,
                        fontWeight: noLeida ? 800 : 700,
                        color: noLeida ? C.texto : C.textoSuave,
                      }}>
                        {notif.title || 'Notificación'}
                      </span>
                      <span style={s.time}>{timeAgo(notif.created_at)}</span>
                    </div>
                    {notif.body && (
                      <div style={s.bodyText}>{notif.body}</div>
                    )}
                  </div>
                </div>
              )
            })}
            <div style={{ height: 80 }} />
          </div>
        )}
      </div>
    </div>
  )
}

/* ============================================================
   ESTILOS INLINE
   ============================================================ */
const s = {
  wrap: {
    width: '100%',
    height: '100%',
    background: '#f4f7f4',   // C.fondo — fondo general
    fontFamily: T.font,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },

  /* HEADER */
  header: {
    flexShrink: 0,
    background: '#ffffff',
    /* FIX: 44px para safe-area (App.jsx ya no agrega contentPad a modalScreens). */
    padding: '44px 12px 12px',
    borderBottom: `1px solid ${C.borde}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: '50%',
    background: C.fondo, border: `1px solid ${C.borde}`,
    color: C.texto, cursor: 'pointer', padding: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'inherit',
  },
  headerTit: {
    fontSize: 17, fontWeight: 800, color: C.texto,
    letterSpacing: '-0.2px',
  },
  markAllBtn: {
    display: 'flex', alignItems: 'center', gap: 5,
    background: 'none', border: 'none',
    color: C.verde, fontSize: 12.5, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit',
    padding: '6px 4px',
  },

  /* TABS */
  tabsRow: {
    flexShrink: 0,
    background: '#ffffff',
    padding: '0 16px 12px',
    display: 'flex',
    gap: 8,
    borderBottom: `1px solid ${C.borde}`,
  },
  tab: {
    flex: 1,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: 6,
    padding: '9px 12px',
    borderRadius: 12,
    background: C.fondo,
    border: `1px solid ${C.borde}`,
    color: C.textoSuave,
    fontSize: 13.5, fontWeight: 700,
    fontFamily: 'inherit',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease',
  },
  tabActive: {
    background: C.verdeSuave,
    border: `1px solid ${C.verde}`,
    color: C.verdeOsc,
  },
  tabCount: {
    background: C.borde,
    color: C.textoSuave,
    fontSize: 11, fontWeight: 800,
    padding: '1px 7px', borderRadius: 8,
    minWidth: 20, textAlign: 'center',
    boxSizing: 'border-box',
    display: 'inline-block',
  },
  tabCountActive: {
    background: C.verde, color: '#ffffff',
  },
  tabBadge: {
    background: C.verde, color: '#ffffff',
    fontSize: 11, fontWeight: 800,
    padding: '1px 7px', borderRadius: 8,
    minWidth: 20, textAlign: 'center',
    boxSizing: 'border-box',
    display: 'inline-block',
  },

  /* SCROLL */
  scroll: {
    flex: 1,
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
    position: 'relative',
  },

  /* PULL-TO-REFRESH INDICATOR */
  pullIndicator: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: 8,
    overflow: 'hidden',
    color: C.textoTenue,
  },
  pullSpinner: {
    width: 22, height: 22,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  pullText: {
    fontSize: 12, color: C.textoTenue, fontWeight: 600,
  },

  /* LISTA */
  list: {
    padding: '0 16px 24px',
    display: 'flex', flexDirection: 'column', gap: 8,
  },

  /* ROW de notificación */
  row: {
    display: 'flex', alignItems: 'flex-start',
    gap: 12,
    padding: '14px 14px',
    borderRadius: 16,
    border: `1px solid ${C.borde}`,
    cursor: 'pointer',
    position: 'relative',
    // Fade-in al marcar como leída: transición suave del fondo de verde pálido a blanco
    transition: 'background-color 0.45s ease, padding-left 0.25s ease',
  },

  /* Punto verde de "no leída" — siempre renderizado, se desvanece al leer */
  unreadDot: {
    position: 'absolute',
    left: 9, top: '50%',
    transform: 'translateY(-50%)',
    width: 8, height: 8,
    borderRadius: '50%',
    background: C.verde,
    boxShadow: '0 0 0 3px rgba(22, 163, 74, 0.18)',
    transition: 'opacity 0.4s ease',
  },

  /* Círculo del ícono */
  iconCircle: {
    flexShrink: 0,
    width: 40, height: 40,
    borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },

  /* CUERPO de la notif */
  body: {
    flex: 1, minWidth: 0,
    display: 'flex', flexDirection: 'column',
    gap: 3,
  },
  titleLine: {
    display: 'flex', alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    fontSize: 14.5,
    lineHeight: 1.3,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 1,
    WebkitBoxOrient: 'vertical',
  },
  time: {
    fontSize: 11.5, color: C.textoTenue, fontWeight: 600,
    flexShrink: 0,
    whiteSpace: 'nowrap',
  },
  bodyText: {
    fontSize: 13, color: C.textoSuave,
    lineHeight: 1.4,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  },

  /* SKELETONS */
  skelCircle: {
    width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
  },
  skelBody: {
    flex: 1, display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4,
  },
  skelLine1: { height: 12, borderRadius: 6, width: '60%' },
  skelLine2: { height: 10, borderRadius: 6, width: '85%' },

  /* ESTADO VACÍO */
  empty: {
    padding: '80px 30px',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    textAlign: 'center', gap: 10,
  },
  emptyIconBox: {
    width: 72, height: 72,
    borderRadius: '50%',
    background: C.verdeSuave,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 17, fontWeight: 800, color: C.texto,
    letterSpacing: '-0.2px',
  },
  emptySub: {
    fontSize: 13.5, color: C.textoSuave, lineHeight: 1.5,
    maxWidth: 280,
  },
}

export default Notifications
