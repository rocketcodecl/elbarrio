import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import {
  C, T, S, iniciales,
} from '../lib/design'
import MiniMap from '../components/MiniMap'

/*
  EVENTS — Pantalla de Eventos de El Barrio (tab "eventos" del App.jsx).

  Lista eventos del barrio (asambleas, mingas, ferias, cumpleaños, ventas de
  garaje, actividades deportivas, talleres, etc.). Los eventos son `posts`
  con `type='event'`.

  Estructura:
    1. Header con back + titulo "Eventos"
    2. Filtros horizontales: Todos / Asambleas / Ferias / Talleres / Deportes / Otros
    3. Seccion "Esta semana" — chips horizontales con eventos de los proximos 7 dias
    4. Seccion "Proximos eventos" — cards grandes con bloque de fecha, titulo,
       descripcion corta, lugar (MiniMap o texto), avatar del organizador,
       contador de asistentes y boton "Asistire" (toggle).
    5. FAB "+ Crear evento" -> onNavigate('createpost', { type: 'event' })
    6. Pull-to-refresh visual
    7. Estado loading: skeleton de 2 cards grandes
    8. Estado vacio: SVG calendario + mensaje cálido

  Badges:
    - HOY (verde) si el evento es hoy
    - MAÑANA (amarillo) si el evento es mañana

  Asistencia:
    - Intenta persistir en `event_attendees` (user_id + post_id).
    - Si la tabla no existe o falla RLS, hace toggle visual con toast
      "Funcion disponible pronto".
*/

// ════════════════════════════════════════════════
// ICONOS SVG INLINE
// ════════════════════════════════════════════════
const IcoVolver = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.9"
    strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
)

const IcoCalendario = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth="1.9"
    strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
)

const IcoReloj = ({ size = 12, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth="1.9"
    strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
)

const IcoPin = ({ size = 12, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth="1.9"
    strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
)

const IcoPersonas = ({ size = 12, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth="1.9"
    strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
)

const IcoPlus = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth="2.4"
    strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)

const IcoCheck = ({ size = 12, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth="2.6"
    strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

const IcoCalendarioVacio = ({ size = 64, color = '#16a34a' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth="1.4"
    strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
    <circle cx="8" cy="15" r="1" fill={color} stroke="none" />
    <circle cx="12" cy="15" r="1" fill={color} stroke="none" />
    <circle cx="16" cy="15" r="1" fill={color} stroke="none" />
  </svg>
)

// ════════════════════════════════════════════════
// FILTROS — mapeo de categoria del post a etiqueta legible.
// Miramos `category` y `event_type` (campos comunes en posts de evento)
// y hacemos fallback por keyword en el titulo.
// ════════════════════════════════════════════════
const FILTROS = [
  { key: 'todos',      label: 'Todos',      emoji: '📋' },
  { key: 'asambleas',  label: 'Asambleas',  emoji: '🏛️' },
  { key: 'ferias',     label: 'Ferias',     emoji: '🥬' },
  { key: 'talleres',   label: 'Talleres',   emoji: '🎨' },
  { key: 'deportes',   label: 'Deportes',   emoji: '⚽' },
  { key: 'otros',      label: 'Otros',      emoji: '📌' },
]

const catDePost = (p) => {
  const cat = String(p?.category || p?.event_type || '').toLowerCase()
  const tit = String(p?.title || '').toLowerCase()
  const txt = `${cat} ${tit}`

  if (/asamblea|minga|junta|uv\s?\d|vecinal/.test(txt)) return 'asambleas'
  if (/feria|venta de garaje|mercado|trueque|venta patio/.test(txt)) return 'ferias'
  if (/taller|curso|clase|capacita|workshop/.test(txt)) return 'talleres'
  if (/deporte|futbol|partido|carrera|caminata|yoga|cicletada|ciclo/.test(txt)) return 'deportes'

  // Coincidencia exacta por category del post
  if (/asamblea/.test(cat)) return 'asambleas'
  if (/feria/.test(cat)) return 'ferias'
  if (/taller/.test(cat)) return 'talleres'
  if (/deporte/.test(cat)) return 'deportes'

  return 'otros'
}

// ════════════════════════════════════════════════
// HELPERS de fecha — todos devuelven strings legibles en es-CL.
// ════════════════════════════════════════════════
const MESES_CORTOS = [
  'ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN',
  'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC',
]
const MESES_LARGOS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]
const DIAS_SEM = ['dom', 'lun', 'mar', 'mie', 'jue', 'vie', 'sab']
const DIAS_SEM_LARGOS = [
  'domingo', 'lunes', 'martes', 'miercoles',
  'jueves', 'viernes', 'sabado',
]

const inicioDelDia = (d) => {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

const esHoy = (fecha) => {
  const a = inicioDelDia(fecha)
  const b = inicioDelDia(new Date())
  return a.getTime() === b.getTime()
}

const esManana = (fecha) => {
  const manana = new Date()
  manana.setDate(manana.getDate() + 1)
  return inicioDelDia(fecha).getTime() === inicioDelDia(manana).getTime()
}

const esDentroDe7Dias = (fecha) => {
  const f = new Date(fecha).getTime()
  const ahora = Date.now()
  const en7 = ahora + 7 * 24 * 60 * 60 * 1000
  return f >= ahora && f <= en7
}

const hhmm = (fecha) => {
  const d = new Date(fecha)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

const diaMesCorto = (fecha) => {
  const d = new Date(fecha)
  return { mes: MESES_CORTOS[d.getMonth()], dia: d.getDate() }
}

const diaSemLargo = (fecha) => DIAS_SEM_LARGOS[new Date(fecha).getDay()]

const fechaCorta = (fecha) => {
  if (esHoy(fecha)) return 'Hoy'
  if (esManana(fecha)) return 'Manana'
  const d = new Date(fecha)
  return `${DIAS_SEM[d.getDay()]} ${d.getDate()} ${MESES_CORTOS[d.getMonth()]}`
}

const fechaLarga = (fecha) => {
  const d = new Date(fecha)
  return `${DIAS_SEM_LARGOS[d.getDay()]} ${d.getDate()} de ${MESES_LARGOS[d.getMonth()]}`
}

// ════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════
function Events({ currentUser, onNavigate }) {
  const [profile, setProfile] = useState(null)
  const [eventos, setEventos] = useState([])
  const [filtro, setFiltro] = useState('todos')
  const [cargando, setCargando] = useState(true)
  const [refrescando, setRefrescando] = useState(false)
  const [error, setError] = useState('')
  const [asistiendo, setAsistiendo] = useState({}) // { [postId]: true|false }
  const [asistenciasCount, setAsistenciasCount] = useState({}) // { [postId]: n }
  const [toast, setToast] = useState('')
  const [pulso, setPulso] = useState(null) // postId que acaba de confirmar (animacion)

  // Pull-to-refresh
  const scrollRef = useRef(null)
  const startYRef = useRef(null)
  const pullRef = useRef(0)
  const [pullDist, setPullDist] = useState(0)

  const nav = onNavigate || (() => {})

  // ═══════ Cargar perfil del usuario (para neighborhood_id) ═══════
  useEffect(() => {
    if (!currentUser?.id) return
    let active = true
    supabase
      .from('profiles')
      .select('*')
      .eq('user_id', currentUser.id)
      .maybeSingle()
      .then(({ data }) => { if (active) setProfile(data || null) })
    return () => { active = false }
  }, [currentUser?.id])

  // ═══════ Cargar eventos ═══════
  const cargar = useCallback(async (esRefresh = false) => {
    if (esRefresh) setRefrescando(true)
    else setCargando(true)
    setError('')
    try {
      // Query base (segun spec del task): posts con type='event', status='active',
      // futuros, ordenados por starts_at asc, con join a profiles.
      let q = supabase
        .from('posts')
        .select('*, profiles!posts_user_id_fkey(*)')
        .eq('type', 'event')
        .eq('status', 'active')
        .gte('starts_at', new Date().toISOString())
        .order('starts_at', { ascending: true })

      // Filtro por barrio si el perfil del user tiene neighborhood_id
      // (mismo patron que Alertas.jsx).
      if (profile?.neighborhood_id) {
        q = q.eq('neighborhood_id', profile.neighborhood_id)
      }

      const { data, error: e } = await q.limit(60)
      if (e) {
        console.error('[el barrio] Error cargando eventos:', e)
        setError('No pudimos cargar los eventos. Tira para abajo para reintentar.')
        return
      }
      setEventos(data || [])

      // Intentar cargar contadores de asistencia para cada evento
      // Si la tabla event_attendees no existe o falla RLS, se ignora silenciosamente
      // y se muestra 0 en el contador.
      // TODO: cuando exista event_attendees con RLS adecuada, esto deberia andar solo.
      if ((data || []).length > 0) {
        const ids = data.map((p) => p.id)
        try {
          const { data: asist, error: ea } = await supabase
            .from('event_attendees')
            .select('post_id, user_id')
            .in('post_id', ids)
          if (!ea && asist) {
            const counts = {}
            const yo = {}
            const myUserId = currentUser?.id
            asist.forEach((row) => {
              counts[row.post_id] = (counts[row.post_id] || 0) + 1
              if (row.user_id === myUserId) yo[row.post_id] = true
            })
            setAsistenciasCount(counts)
            setAsistiendo(yo)
          }
        } catch (err) {
          // Tabla event_attendees probablemente no existe. Lo dejamos asi:
          // el boton hace toggle visual y muestra toast.
          console.warn('[el barrio] event_attendees no disponible:', err)
        }
      }
    } catch (e) {
      console.error('[el barrio] Error inesperado cargando eventos:', e)
      setError('Error inesperado al cargar eventos.')
    } finally {
      setCargando(false)
      setRefrescando(false)
    }
  }, [profile?.neighborhood_id, currentUser?.id])

  useEffect(() => {
    // Esperamos a tener el perfil (o a que falle) antes de cargar,
    // para poder filtrar por barrio. Si despues de 1.5s no hay perfil,
    // cargamos igual (no bloqueamos al user).
    if (profile !== null) {
      cargar()
      return
    }
    const t = setTimeout(() => cargar(), 1500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile])

  // ═══════ Toggle asistencia ═══════
  const toggleAsistir = async (postId) => {
    const ya = !!asistiendo[postId]
    // Optimista
    setAsistiendo((s) => ({ ...s, [postId]: !ya }))
    setAsistenciasCount((c) => ({
      ...c,
      [postId]: Math.max(0, (c[postId] || 0) + (ya ? -1 : 1)),
    }))
    if (!ya) {
      setPulso(postId)
      setTimeout(() => setPulso((p) => (p === postId ? null : p)), 700)
    }

    try {
      if (ya) {
        // Borrar asistencia
        // TODO: cuando exista event_attendees, persistir asistencia (delete).
        const { error: ed } = await supabase
          .from('event_attendees')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', currentUser?.id)
        if (ed) throw ed
      } else {
        // Insertar asistencia
        // TODO: cuando exista event_attendees, persistir asistencia (insert).
        const { error: ei } = await supabase
          .from('event_attendees')
          .insert({ post_id: postId, user_id: currentUser?.id })
        if (ei) throw ei
      }
    } catch (err) {
      // Rollback visual + toast amable
      console.warn('[el barrio] No se pudo persistir asistencia:', err)
      setAsistiendo((s) => ({ ...s, [postId]: ya }))
      setAsistenciasCount((c) => ({
        ...c,
        [postId]: Math.max(0, (c[postId] || 0) + (ya ? 1 : -1)),
      }))
      mostrarToast('Funcion disponible pronto')
    }
  }

  // ═══════ Toast ═══════
  const toastTimerRef = useRef(null)
  const mostrarToast = (msg) => {
    setToast(msg)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToast(''), 2600)
  }

  // ═══════ Pull-to-refresh visual ═══════
  const onTouchStart = (e) => {
    const el = scrollRef.current
    if (!el || el.scrollTop > 0) return
    startYRef.current = e.touches[0].clientY
  }
  const onTouchMove = (e) => {
    if (startYRef.current == null) return
    const dy = e.touches[0].clientY - startYRef.current
    if (dy > 0 && dy < 90) {
      pullRef.current = dy
      setPullDist(dy)
    }
  }
  const onTouchEnd = () => {
    if (pullRef.current > 60) {
      cargar(true)
    }
    startYRef.current = null
    pullRef.current = 0
    setPullDist(0)
  }

  // ═══════ Filtrado y agrupamiento ═══════
  const eventosFiltrados = filtro === 'todos'
    ? eventos
    : eventos.filter((e) => catDePost(e) === filtro)

  const estaSemana = eventos.filter((e) => esDentroDe7Dias(e.starts_at)).slice(0, 12)

  const conteos = eventos.reduce((acc, e) => {
    const k = catDePost(e)
    acc[k] = (acc[k] || 0) + 1
    acc.todos = (acc.todos || 0) + 1
    return acc
  }, { todos: 0 })

  // ═══════ Render ═══════
  return (
    <div style={s.wrap}>
      {/* ══════ HEADER ══════ */}
      <div style={s.header}>
        <button style={s.backBtn} onClick={() => nav('inicio')} aria-label="Volver">
          <IcoVolver />
        </button>
        <div style={s.headerTit}>Eventos</div>
        <div style={{ width: 40 }} />
      </div>

      {/* ══════ SCROLL AREA ══════ */}
      <div
        ref={scrollRef}
        style={{
          ...s.scroll,
          paddingTop: 12 + pullDist * 0.4,
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Indicador pull-to-refresh */}
        {pullDist > 4 && (
          <div style={{
            ...s.pullIndicator,
            opacity: Math.min(1, pullDist / 60),
            transform: `rotate(${pullDist > 60 ? 360 : pullDist * 6}deg)`,
          }}>
            <IcoCalendario size={18} color={C.verde} />
          </div>
        )}
        {refrescando && (
          <div style={s.refreshingBar}>
            <IcoReloj size={11} color={C.verde} />
            <span>Actualizando...</span>
          </div>
        )}

        {/* ══════ RESUMEN ══════ */}
        <div style={s.resumen}>
          <span style={s.resumenNum}>{eventos.length}</span>
          <span style={s.resumenTxt}>
            evento{eventos.length === 1 ? '' : 's'} proximo{eventos.length === 1 ? '' : 's'} en{' '}
            <span style={s.marca}>el barrio</span>
          </span>
        </div>

        {error && <div style={s.errorBox}>{error}</div>}

        {/* ══════ FILTROS ══════ */}
        <div style={s.filtros}>
          {FILTROS.map((f) => {
            const activo = filtro === f.key
            const count = conteos[f.key] || 0
            if (f.key !== 'todos' && count === 0 && !cargando) return null
            return (
              <button
                key={f.key}
                style={{
                  ...s.filtroChip,
                  background: activo ? C.verde : '#fff',
                  color: activo ? '#fff' : C.textoSuave,
                  borderColor: activo ? C.verde : C.borde,
                }}
                onClick={() => setFiltro(f.key)}
              >
                <span style={{ fontSize: 12 }}>{f.emoji}</span>
                <span>{f.label}</span>
                {count > 0 && (
                  <span style={{
                    ...s.filtroCount,
                    background: activo ? 'rgba(255,255,255,0.25)' : C.fondo,
                    color: activo ? '#fff' : C.textoTenue,
                  }}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* ══════ CONTENIDO ══════ */}
        {cargando ? (
          <SkeletonLista />
        ) : eventosFiltrados.length === 0 ? (
          <EstadoVacio onCrear={() => nav('createpost', { type: 'event' })} />
        ) : (
          <>
            {/* ══════ ESTA SEMANA ══════ */}
            {estaSemana.length > 0 && filtro === 'todos' && (
              <div style={s.seccion}>
                <div style={s.seccionTit}>
                  <IcoCalendario size={14} color={C.verde} />
                  <span>Esta semana</span>
                </div>
                <div style={s.chipsScroll}>
                  {estaSemana.map((ev) => {
                    const label = esHoy(ev.starts_at)
                      ? 'Hoy'
                      : esManana(ev.starts_at)
                        ? 'Manana'
                        : `${DIAS_SEM[new Date(ev.starts_at).getDay()]} ${new Date(ev.starts_at).getDate()}`
                    const hora = hhmm(ev.starts_at)
                    return (
                      <button
                        key={ev.id}
                        style={s.chipSemana}
                        onClick={() => nav('productdetail', { postId: ev.id })}
                      >
                        <div style={s.chipSemanaFecha}>
                          <span style={s.chipSemanaDia}>{label}</span>
                          <span style={s.chipSemanaHora}>{hora}</span>
                        </div>
                        <span style={s.chipSemanaTitulo}>
                          {ev.title || (ev.content || '').slice(0, 40) || 'Evento'}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ══════ PROXIMOS EVENTOS ══════ */}
            <div style={s.seccion}>
              <div style={s.seccionTit}>
                <IcoCalendario size={14} color={C.verde} />
                <span>Proximos eventos</span>
                <span style={s.seccionCount}>{eventosFiltrados.length}</span>
              </div>

              <div style={s.lista}>
                {eventosFiltrados.map((ev) => (
                  <EventCard
                    key={ev.id}
                    evento={ev}
                    asistiendo={!!asistiendo[ev.id]}
                    count={asistenciasCount[ev.id] || 0}
                    pulso={pulso === ev.id}
                    onToggle={() => toggleAsistir(ev.id)}
                    onClick={() => nav('productdetail', { postId: ev.id })}
                  />
                ))}
              </div>
            </div>

            {/* ══════ Footer sutil ══════ */}
            <div style={s.footerInfo}>
              <IcoCalendario size={13} color={C.textoTenue} />
              <span>
                Los eventos los organiza la comunidad de{' '}
                <span style={s.marca}>el barrio</span>. Si vas a organizar algo,
                confirmalo con tiempo.
              </span>
            </div>
          </>
        )}
      </div>

      {/* ══════ FAB ══════ */}
      <button
        style={s.fab}
        onClick={() => nav('createpost', { type: 'event' })}
        aria-label="Crear evento"
      >
        <IcoPlus size={18} color="#fff" />
        <span style={s.fabText}>Crear evento</span>
      </button>

      {/* ══════ TOAST ══════ */}
      {toast && (
        <div style={s.toast}>
          <IcoReloj size={13} color="#fff" />
          <span>{toast}</span>
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════
// TARJETA DE EVENTO (card grande)
// ════════════════════════════════════════════════
function EventCard({ evento, asistiendo, count, pulso, onToggle, onClick }) {
  const f = evento.starts_at
  const { mes, dia } = diaMesCorto(f)
  const hoy = esHoy(f)
  const manana = esManana(f)
  const org = evento.profiles || {}
  const tieneCoords = evento.latitude != null && evento.longitude != null
  const lugar = evento.location_text || (tieneCoords ? null : 'Plaza de Armas')
  const desc = (evento.content || evento.description || '').slice(0, 140)

  return (
    <div style={s.card} onClick={onClick}>
      {/* Badge HOY / MAÑANA */}
      {(hoy || manana) && (
        <div style={{
          ...s.fechaBadge,
          background: hoy ? C.verde : C.dorado,
        }}>
          {hoy ? 'HOY' : 'MAÑANA'}
        </div>
      )}

      {/* Fila superior: bloque de fecha + titulo */}
      <div style={s.cardTop}>
        <div style={s.fechaBloque}>
          <span style={s.fechaMes}>{mes}</span>
          <span style={s.fechaDia}>{dia}</span>
        </div>

        <div style={s.cardTitWrap}>
          <div style={s.cardTit}>
            {evento.title || 'Evento del barrio'}
          </div>
          <div style={s.cardFechaLarga}>
            {fechaLarga(f)} · {hhmm(f)} hrs
          </div>
        </div>
      </div>

      {/* Descripcion */}
      {desc && <div style={s.cardDesc}>{desc}</div>}

      {/* Lugar: MiniMap si hay coords, si no texto */}
      {tieneCoords ? (
        <div style={s.miniMapWrap} onClick={(e) => e.stopPropagation()}>
          <MiniMap
            lat={evento.latitude}
            lng={evento.longitude}
            height={90}
            zoom={15}
          />
          {lugar && (
            <div style={s.miniMapLugar}>
              <IcoPin size={11} color={C.verde} />
              <span>{lugar}</span>
            </div>
          )}
        </div>
      ) : lugar ? (
        <div style={s.lugarRow}>
          <IcoPin size={12} color={C.verde} />
          <span style={s.lugarTxt}>{lugar}</span>
        </div>
      ) : null}

      {/* Meta: hora */}
      <div style={s.metaRow}>
        <span style={s.metaItem}>
          <IcoReloj size={12} color={C.textoTenue} />
          <span>{hhmm(f)} hrs</span>
        </span>
        {evento.category && (
          <span style={s.metaItem}>
            <span style={s.catDot} />
            <span>{String(evento.category).charAt(0).toUpperCase() + String(evento.category).slice(1)}</span>
          </span>
        )}
      </div>

      {/* Pie: organizador + asistencia */}
      <div style={s.cardPie}>
        <div style={s.orgBlock}>
          {org.avatar_url ? (
            <img src={org.avatar_url} alt="" style={s.orgAvatar} />
          ) : (
            <div style={s.orgAvatarFallback}>{iniciales(org.full_name)}</div>
          )}
          <div style={s.orgMeta}>
            <span style={s.orgNombre}>
              {(org.full_name || 'Vecino').split(' ')[0]}
            </span>
            <span style={s.orgRol}>organiza</span>
          </div>
        </div>

        <div style={s.asistenciaBlock}>
          <span style={s.asistCount}>
            <IcoPersonas size={11} color={C.verde} />
            <span>{count} van</span>
          </span>
          <button
            style={{
              ...s.asistBtn,
              ...(asistiendo ? s.asistBtnOn : {}),
              ...(pulso ? s.asistBtnPulso : {}),
            }}
            onClick={(e) => { e.stopPropagation(); onToggle() }}
          >
            {asistiendo ? (
              <>
                <IcoCheck size={12} color="#fff" />
                <span>Asistiras</span>
              </>
            ) : (
              <span>Asistare</span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════
// SKELETON (loading)
// ════════════════════════════════════════════════
function SkeletonLista() {
  return (
    <div style={s.lista}>
      <div style={s.skeletonCard}>
        <div style={s.skRow}>
          <div style={s.skFecha} />
          <div style={{ flex: 1 }}>
            <div style={{ ...s.skLine, width: '70%', height: 16 }} />
            <div style={{ ...s.skLine, width: '50%', height: 11, marginTop: 8 }} />
          </div>
        </div>
        <div style={{ ...s.skLine, width: '95%', height: 12, marginTop: 14 }} />
        <div style={{ ...s.skLine, width: '80%', height: 12, marginTop: 6 }} />
        <div style={s.skLugar} />
        <div style={{ ...s.skRow, marginTop: 12 }}>
          <div style={s.skAvatar} />
          <div style={{ ...s.skLine, width: '30%', height: 11 }} />
        </div>
      </div>

      <div style={s.skeletonCard}>
        <div style={s.skRow}>
          <div style={s.skFecha} />
          <div style={{ flex: 1 }}>
            <div style={{ ...s.skLine, width: '60%', height: 16 }} />
            <div style={{ ...s.skLine, width: '45%', height: 11, marginTop: 8 }} />
          </div>
        </div>
        <div style={{ ...s.skLine, width: '90%', height: 12, marginTop: 14 }} />
        <div style={{ ...s.skLine, width: '70%', height: 12, marginTop: 6 }} />
        <div style={s.skLugar} />
        <div style={{ ...s.skRow, marginTop: 12 }}>
          <div style={s.skAvatar} />
          <div style={{ ...s.skLine, width: '25%', height: 11 }} />
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════
// ESTADO VACIO
// ════════════════════════════════════════════════
function EstadoVacio({ onCrear }) {
  return (
    <div style={s.vacio}>
      <IcoCalendarioVacio size={72} color={C.verde} />
      <div style={s.vacioTit}>No hay eventos proximos en tu barrio</div>
      <div style={s.vacioTxt}>
        Si tenes algo planeado (una asamblea, una minga, una feria, un cumple,
        una venta de garaje, un partido), crealo y avisale a tus vecinos.
      </div>
      <button style={s.vacioCta} onClick={onCrear}>
        <IcoPlus size={14} color="#fff" />
        <span>Organizá el primero</span>
      </button>
    </div>
  )
}

// ════════════════════════════════════════════════
// ESTILOS
// ════════════════════════════════════════════════
const s = {
  wrap: {
    width: '100%', height: '100%',
    background: C.fondo, fontFamily: T.font,
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
    position: 'relative',
  },

  marca: { color: C.verde, fontWeight: 700 },

  /* ── header ── */
  header: {
    background: C.card,
    padding: '28px 18px 12px',
    borderBottom: `1px solid ${C.borde}`,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
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

  scroll: {
    flex: 1, overflowY: 'auto',
    padding: '12px 16px 110px',
    position: 'relative',
    WebkitOverflowScrolling: 'touch',
  },

  /* ── pull-to-refresh ── */
  pullIndicator: {
    position: 'absolute', top: -4, left: '50%',
    transform: 'translateX(-50%)',
    width: 32, height: 32, borderRadius: '50%',
    background: '#fff', border: `1px solid ${C.borde}`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    zIndex: 5,
  },
  refreshingBar: {
    display: 'flex', alignItems: 'center', gap: 6,
    justifyContent: 'center',
    padding: '6px 12px', marginBottom: 10,
    background: C.verdeBg, borderRadius: 999,
    color: C.verdeOsc, fontSize: 12, fontWeight: 600,
  },

  /* ── resumen ── */
  resumen: {
    display: 'flex', alignItems: 'baseline', gap: 6,
    marginBottom: 12,
  },
  resumenNum: { fontSize: 22, fontWeight: 800, color: C.texto },
  resumenTxt: { fontSize: 13.5, color: C.textoSuave, fontWeight: 500 },

  errorBox: {
    background: C.rojoBg, border: `1px solid ${C.rojoSuave}`,
    borderRadius: 12, padding: '11px 13px',
    fontSize: 12.5, color: C.rojo, marginBottom: 12, lineHeight: 1.4,
  },

  /* ── filtros ── */
  filtros: {
    display: 'flex', gap: 7, overflowX: 'auto',
    paddingBottom: 4, marginBottom: 14,
    margin: '0 -16px', paddingLeft: 16, paddingRight: 16,
    WebkitOverflowScrolling: 'touch',
    scrollbarWidth: 'none',
  },
  filtroChip: {
    display: 'flex', alignItems: 'center', gap: 5,
    flexShrink: 0,
    padding: '7px 11px', borderRadius: 999,
    border: `1px solid ${C.borde}`,
    background: '#fff',
    fontSize: 12, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit',
  },
  filtroCount: {
    minWidth: 18, height: 18, padding: '0 5px',
    borderRadius: 999,
    fontSize: 10, fontWeight: 800,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },

  /* ── seccion ── */
  seccion: { marginBottom: 18 },
  seccionTit: {
    display: 'flex', alignItems: 'center', gap: 6,
    fontSize: 14, fontWeight: 800, color: C.texto,
    marginBottom: 10, letterSpacing: '-0.1px',
  },
  seccionCount: {
    fontSize: 11, fontWeight: 700, color: C.textoTenue,
    background: C.fondo, padding: '2px 8px', borderRadius: 999,
    marginLeft: 'auto',
  },

  /* ── chips "Esta semana" ── */
  chipsScroll: {
    display: 'flex', gap: 8, overflowX: 'auto',
    paddingBottom: 4,
    margin: '0 -16px', paddingLeft: 16, paddingRight: 16,
    WebkitOverflowScrolling: 'touch',
    scrollbarWidth: 'none',
  },
  chipSemana: {
    flexShrink: 0,
    minWidth: 140, maxWidth: 200,
    background: C.card,
    border: `1px solid ${C.borde}`,
    borderRadius: 14,
    padding: '10px 12px',
    cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
    display: 'flex', flexDirection: 'column', gap: 6,
    boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
    transition: 'transform 0.12s ease, box-shadow 0.12s ease',
  },
  chipSemanaFecha: {
    display: 'flex', alignItems: 'baseline', gap: 6,
  },
  chipSemanaDia: {
    fontSize: 13, fontWeight: 800, color: C.verde,
    textTransform: 'capitalize',
  },
  chipSemanaHora: {
    fontSize: 11, fontWeight: 600, color: C.textoTenue,
  },
  chipSemanaTitulo: {
    fontSize: 12, fontWeight: 600, color: C.texto,
    lineHeight: 1.35,
    overflow: 'hidden', display: '-webkit-box',
    WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
  },

  /* ── lista ── */
  lista: { display: 'flex', flexDirection: 'column', gap: 12 },

  /* ── card grande ── */
  card: {
    position: 'relative',
    background: C.card,
    border: `1px solid ${C.borde}`,
    borderRadius: 18,
    padding: 14,
    cursor: 'pointer',
    boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
    transition: 'transform 0.14s ease, box-shadow 0.14s ease',
    fontFamily: 'inherit',
  },
  fechaBadge: {
    position: 'absolute', top: 12, right: 12,
    fontSize: 10, fontWeight: 800, color: '#fff',
    letterSpacing: 0.5,
    padding: '4px 9px', borderRadius: 6,
    zIndex: 2,
  },

  cardTop: {
    display: 'flex', gap: 12, alignItems: 'flex-start',
  },
  fechaBloque: {
    width: 56, height: 56, flexShrink: 0,
    background: C.verdeBg,
    borderRadius: 12,
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    border: `1px solid ${C.verdeSuave}`,
  },
  fechaMes: {
    fontSize: 10, fontWeight: 800, color: C.textoTenue,
    letterSpacing: 0.6, textTransform: 'uppercase',
  },
  fechaDia: {
    fontSize: 24, fontWeight: 800, color: C.verdeOsc,
    lineHeight: 1, marginTop: 1,
  },

  cardTitWrap: { flex: 1, minWidth: 0, paddingRight: 60 },
  cardTit: {
    fontSize: 16, fontWeight: 800, color: C.texto,
    lineHeight: 1.3, letterSpacing: '-0.1px',
    display: '-webkit-box', WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical', overflow: 'hidden',
  },
  cardFechaLarga: {
    fontSize: 11.5, fontWeight: 600, color: C.textoTenue,
    marginTop: 4, textTransform: 'capitalize',
  },

  cardDesc: {
    fontSize: 13, color: C.textoSuave, lineHeight: 1.5,
    marginTop: 10,
    display: '-webkit-box', WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical', overflow: 'hidden',
  },

  miniMapWrap: {
    position: 'relative', marginTop: 10,
    borderRadius: 12, overflow: 'hidden',
    border: `1px solid ${C.borde}`,
  },
  miniMapLugar: {
    position: 'absolute', bottom: 6, left: 6,
    display: 'flex', alignItems: 'center', gap: 4,
    background: 'rgba(255,255,255,0.94)',
    padding: '4px 8px', borderRadius: 8,
    fontSize: 11, fontWeight: 700, color: C.verdeOsc,
    maxWidth: 'calc(100% - 12px)',
    overflow: 'hidden', textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  lugarRow: {
    display: 'flex', alignItems: 'center', gap: 5,
    marginTop: 10,
    fontSize: 12, fontWeight: 600, color: C.verdeOsc,
    background: C.verdeBg,
    padding: '7px 10px', borderRadius: 8,
    border: `1px solid ${C.verdeSuave}`,
  },
  lugarTxt: {
    overflow: 'hidden', textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  metaRow: {
    display: 'flex', flexWrap: 'wrap', gap: 12,
    marginTop: 10,
  },
  metaItem: {
    display: 'flex', alignItems: 'center', gap: 4,
    fontSize: 11.5, color: C.textoTenue, fontWeight: 600,
  },
  catDot: {
    width: 6, height: 6, borderRadius: '50%',
    background: C.verde, display: 'inline-block',
  },

  cardPie: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    gap: 10, marginTop: 12,
    paddingTop: 11,
    borderTop: `1px solid ${C.bordeSuave}`,
  },
  orgBlock: {
    display: 'flex', alignItems: 'center', gap: 7,
    minWidth: 0, flex: 1,
  },
  orgAvatar: {
    width: 26, height: 26, borderRadius: '50%',
    objectFit: 'cover', flexShrink: 0,
  },
  orgAvatarFallback: {
    width: 26, height: 26, borderRadius: '50%',
    background: C.verde, color: '#fff',
    fontSize: 10, fontWeight: 800,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  orgMeta: {
    display: 'flex', flexDirection: 'column',
    minWidth: 0,
  },
  orgNombre: {
    fontSize: 12, fontWeight: 700, color: C.texto,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  orgRol: {
    fontSize: 10, color: C.textoTenue, fontWeight: 500,
  },

  asistenciaBlock: {
    display: 'flex', alignItems: 'center', gap: 8,
    flexShrink: 0,
  },
  asistCount: {
    display: 'flex', alignItems: 'center', gap: 4,
    fontSize: 11, fontWeight: 700, color: C.verdeOsc,
  },
  asistBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '8px 13px', borderRadius: 999,
    background: C.verdeBg, color: C.verde,
    border: `1px solid ${C.verdeSuave}`,
    fontSize: 12, fontWeight: 800,
    cursor: 'pointer', fontFamily: 'inherit',
    transition: 'transform 0.12s ease, background 0.18s ease',
  },
  asistBtnOn: {
    background: C.verde, color: '#fff',
    borderColor: C.verde,
  },
  asistBtnPulso: {
    animation: 'pulseAssist 0.7s ease',
    transform: 'scale(1.06)',
  },

  /* ── FAB ── */
  fab: {
    position: 'absolute', bottom: 18, right: 18,
    display: 'flex', alignItems: 'center', gap: 7,
    background: C.verde, color: '#fff',
    border: 'none', borderRadius: 999,
    padding: '13px 18px',
    fontSize: 13.5, fontWeight: 800,
    cursor: 'pointer', fontFamily: 'inherit',
    boxShadow: '0 8px 22px rgba(22,163,74,0.36)',
    zIndex: 50,
  },
  fabText: { letterSpacing: '-0.1px' },

  /* ── toast ── */
  toast: {
    position: 'absolute', bottom: 86, left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex', alignItems: 'center', gap: 7,
    background: 'rgba(15,95,54,0.95)',
    color: '#fff',
    padding: '10px 16px', borderRadius: 999,
    fontSize: 12.5, fontWeight: 700,
    boxShadow: '0 8px 22px rgba(0,0,0,0.2)',
    zIndex: 100,
    maxWidth: 'calc(100% - 32px)',
  },

  /* ── vacio ── */
  vacio: {
    textAlign: 'center', padding: '38px 22px 28px',
    background: C.card, borderRadius: 18, border: `1px solid ${C.borde}`,
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    marginTop: 6,
  },
  vacioTit: {
    fontSize: 16, fontWeight: 800, color: C.texto,
    marginBottom: 6, marginTop: 14, lineHeight: 1.3,
  },
  vacioTxt: {
    fontSize: 13, color: C.textoTenue, lineHeight: 1.55,
    marginBottom: 18, maxWidth: 300,
  },
  vacioCta: {
    display: 'inline-flex', alignItems: 'center', gap: 7,
    padding: '11px 18px', borderRadius: 999,
    background: C.verde, color: '#fff', border: 'none',
    fontSize: 13.5, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit',
    boxShadow: '0 6px 18px rgba(22,163,74,0.28)',
  },

  /* ── footer info ── */
  footerInfo: {
    display: 'flex', alignItems: 'flex-start', gap: 8,
    marginTop: 18, padding: '11px 13px',
    background: C.card, border: `1px solid ${C.borde}`,
    borderRadius: 12,
    fontSize: 11.5, color: C.textoTenue, lineHeight: 1.45,
  },

  /* ── skeleton ── */
  skeletonCard: {
    background: C.card,
    border: `1px solid ${C.borde}`,
    borderRadius: 18,
    padding: 14,
  },
  skRow: { display: 'flex', gap: 12, alignItems: 'center' },
  skFecha: {
    width: 56, height: 56, borderRadius: 12,
    background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 37%, #eee 63%)',
    backgroundSize: '400% 100%',
    animation: 'skShimmer 1.4s ease infinite',
    flexShrink: 0,
  },
  skLine: {
    background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 37%, #eee 63%)',
    backgroundSize: '400% 100%',
    animation: 'skShimmer 1.4s ease infinite',
    borderRadius: 4,
  },
  skLugar: {
    width: '100%', height: 90, borderRadius: 12,
    background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 37%, #eee 63%)',
    backgroundSize: '400% 100%',
    animation: 'skShimmer 1.4s ease infinite',
    marginTop: 14,
  },
  skAvatar: {
    width: 26, height: 26, borderRadius: '50%',
    background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 37%, #eee 63%)',
    backgroundSize: '400% 100%',
    animation: 'skShimmer 1.4s ease infinite',
    flexShrink: 0,
  },
}

// Keyframes globales (se inyectan una sola vez en <head>).
// Si ya existen, no se duplican.
if (typeof document !== 'undefined' && !document.getElementById('events-keyframes')) {
  const style = document.createElement('style')
  style.id = 'events-keyframes'
  style.innerHTML = `
    @keyframes skShimmer {
      0%   { background-position: 100% 0; }
      100% { background-position: -100% 0; }
    }
    @keyframes pulseAssist {
      0%   { transform: scale(1); }
      35%  { transform: scale(1.10); box-shadow: 0 0 0 6px rgba(22,163,74,0.18); }
      70%  { transform: scale(1.04); box-shadow: 0 0 0 10px rgba(22,163,74,0.08); }
      100% { transform: scale(1.06); box-shadow: 0 0 0 0 rgba(22,163,74,0); }
    }
  `
  document.head.appendChild(style)
}

export default Events
