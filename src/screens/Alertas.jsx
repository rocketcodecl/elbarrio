import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
  C, T, REPORTES, iniciales, hace, distancia,
} from '../lib/design'
import { getContentCategories } from '../lib/contentCategories'

/*
  ALERTAS — Central hub de alertas de el barrio.

  Acá se unifican TODAS las alertas activas del barrio del user.
  Estructura:
    1. Header con back + título "Alertas"
    2. CTA grande "Reportar una alerta" (invoca onCrear('alert'))
    3. Filtros por categoría (Todas, Seguridad, Infra, Mascotas, Otro)
    4. Lista vertical de alertas activas (cards full-width, color-coded)
    5. Empty state con CTA

  Cada alerta se muestra con el color de SU categoría:
    · seguridad  → rojo     (#fee2e2 / #dc2626)
    · salud      → naranja  (#ffedd5 / #ea580c)
    · infra      → amarillo (#fef9c3 / #ca8a04)
    · mascotas   → cian     (#cffafe / #0891b2)
    · otro       → gris     (#f3f4f6 / #6b7280)

  "el barrio" siempre minúscula y en verde (C.verde).
*/

// ─── Íconos lineales (mismo lenguaje visual que TabBar y Home) ───
const IcoVolver = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.9"
    strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
)

const IcoAlerta = ({ size = 16, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color || 'currentColor'} strokeWidth="1.9"
    strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
)

const IcoCrear = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.2"
    strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)

const IcoReloj = ({ size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.9"
    strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
)

const IcoUbicacion = ({ size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.9"
    strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
)

// Mismo set de categorías que CreatePost.jsx (para que los colores
// coincidan exactamente con lo que el user vio al crear la alerta).
const CATS = [
  { key: 'todas',     label: 'Todas',     emoji: '📋' },
  { key: 'seguridad', label: 'Seguridad', emoji: REPORTES.seguridad?.emoji || '🔒' },
  { key: 'incendio',  label: 'Incendio',  emoji: REPORTES.incendio.emoji },
  { key: 'servicios', label: 'Servicios', emoji: REPORTES.servicios.emoji },
  { key: 'animales',  label: 'Animales',  emoji: REPORTES.animales.emoji },
  { key: 'fugas',     label: 'Fugas',     emoji: REPORTES.fugas.emoji },
  { key: 'luz',       label: 'Luz',       emoji: REPORTES.luz.emoji },
  { key: 'salud',     label: 'Salud',     emoji: REPORTES.salud.emoji },
  { key: 'otro',      label: 'Otros',     emoji: REPORTES.otro.emoji },
]

// haversine: distancia en METROS entre 2 coords (lat/lng).
// Se usa para calcular qué tan lejos está cada alerta del usuario.
const haversine = (lat1, lng1, lat2, lng2) => {
  if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) return null
  const R = 6371000
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))
}

function Alertas({ currentUser, onNavigate, onCrear }) {
  const [categories, setCategories] = useState(CATS)
  const [alertas, setAlertas] = useState([])
  const [filtro, setFiltro] = useState('todas')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [userCoords, setUserCoords] = useState(null)
  const [neighborhoodId, setNeighborhoodId] = useState(null)

  useEffect(() => {
    getContentCategories('incident', CATS.slice(1)).then(items => setCategories([
      CATS[0],
      ...items,
    ]))
  }, [])

  // GPS del usuario para calcular distancia a cada alerta.
  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    )
  }, [])

  const cargar = async () => {
    if (!currentUser?.id) {
      setAlertas([])
      setError('No pudimos identificar tu sesión.')
      setCargando(false)
      return
    }
    setCargando(true)
    setError('')
    try {
      const { data: p, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', currentUser.id)
        .maybeSingle()
      if (profileError || !p?.neighborhood_id) {
        setAlertas([])
        setError('No pudimos confirmar tu barrio. Intenta nuevamente.')
        return
      }
      setNeighborhoodId(p.neighborhood_id)

      // Las alertas `active` son visibles para todo el barrio. Cada autor
      // también puede ver sus propios reportes `pendiente`, claramente
      // identificados, mientras espera la revisión administrativa.
      const res = await supabase
        .from('incident_reports')
        .select('*, reporter:profiles!reporter_id (full_name, avatar_url, badge_founder, verified)')
        .eq('neighborhood_id', p.neighborhood_id)
        .or(`status.eq.active,and(status.eq.pendiente,reporter_id.eq.${p.id})`)
        .order('confirms_count', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(100)

      console.log('[alertas] query result:', res.data?.length, 'rows')

      if (res.error) {
        console.error('[el barrio] Error cargando alertas:', res.error)
        setError('No pudimos cargar las alertas. Revisa la consola.')
        return
      }

      // Filtrar expiradas en JS (no rompe si expires_at no existe)
      const ahora = Date.now()
      const activas = (res.data || []).filter((a) => {
        if (!a.expires_at) return true
        return new Date(a.expires_at).getTime() > ahora
      })
      setAlertas(activas)
    } catch (e) {
      console.error('Error cargando alertas:', e)
      setError('Error inesperado al cargar alertas.')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => { Promise.resolve().then(cargar) }, [currentUser?.id]) // eslint-disable-line react-hooks/exhaustive-deps -- recarga al cambiar de sesión

  useEffect(() => {
    if (!neighborhoodId) return undefined
    const channel = supabase
      .channel(`alerts-live-${neighborhoodId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'incident_reports',
        filter: `neighborhood_id=eq.${neighborhoodId}`,
      }, cargar)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [neighborhoodId]) // eslint-disable-line react-hooks/exhaustive-deps -- recarga la lista del barrio activo

  const nav = onNavigate || (() => {})
  const crear = onCrear || (() => {})

  const alertasActivas = alertas.filter((a) => a.status === 'active')
  const pendientesPropias = alertas.filter((a) => a.status === 'pendiente')

  // Conteos por categoría para los chips
  const conteos = alertas.reduce((acc, a) => {
    const k = a.category || 'otro'
    acc[k] = (acc[k] || 0) + 1
    acc.todas = (acc.todas || 0) + 1
    return acc
  }, { todas: 0 })

  const filtradas = filtro === 'todas'
    ? alertas
    : alertas.filter((a) => (a.category || 'otro') === filtro)
  const criticasCercanas = alertasActivas.filter(a => {
    if (a.category !== 'seguridad') return false
    const meters = a.latitude && a.longitude && userCoords
      ? haversine(userCoords.lat, userCoords.lng, a.latitude, a.longitude)
      : a.distance_meters
    return meters != null && meters <= 500
  }).length

  if (cargando) {
    return (
      <div style={s.wrap}>
        <div style={s.cargando}>
          <img src={`${import.meta.env.BASE_URL}isotipo.png`} alt="" style={{ width: 58, opacity: 0.4 }} />
        </div>
    </div>
    )
  }

  return (
    <div style={s.wrap}>

      {/* ══════ HEADER ══════ */}
      <div style={s.header}>
        <button style={s.backBtn} onClick={() => nav('inicio')} aria-label="Volver">
          <IcoVolver />
        </button>
        <div style={s.headerTit}>Alertas de <span style={s.headerBrand}>el barrio</span></div>
      </div>

      <div style={s.scroll}>

        <section style={s.safetyCard}>
          <span style={{ ...s.safetyIcon, ...(criticasCercanas ? s.safetyIconDanger : {}) }}>{criticasCercanas ? '!' : '✓'}</span>
          <span style={s.safetyCopy}><strong style={s.safetyTitle}>{criticasCercanas ? 'Atención cerca de ti' : 'Tu zona está tranquila'}</strong><small style={s.safetyText}>{criticasCercanas ? `${criticasCercanas} alerta${criticasCercanas === 1 ? '' : 's'} de seguridad en los últimos 500 m.` : 'Sin alertas críticas cercanas en este momento.'}</small></span>
        </section>

        <div style={s.emitWrap}>
          <button style={s.emitButton} onClick={() => crear('alert')}><IcoAlerta size={28} color="#fff"/><strong>EMITIR ALERTA</strong></button>
          <small style={s.emitHelp}>Para avisar algo urgente a tus vecinos</small>
        </div>

        <div style={s.alertListHeading}><div style={s.alertListCopy}><strong>Alertas recientes</strong><small>{alertasActivas.length} activa{alertasActivas.length === 1 ? '' : 's'}{pendientesPropias.length ? ` · ${pendientesPropias.length} tuya${pendientesPropias.length === 1 ? '' : 's'} en revisión` : ''}</small></div><button style={s.alertListAction} type="button" onClick={() => setFiltro('todas')}>Ver todas</button></div>

        {error && <div style={s.errorBox}>{error}</div>}

        {/* ══════ FILTROS ══════ */}
        {alertas.length > 0 && (
          <div style={s.filtros}>
            {categories.map((c) => {
              const activo = filtro === c.key
              const count = conteos[c.key] || 0
              if (c.key !== 'todas' && count === 0) return null
              return (
                <button
                  key={c.key}
                  style={{
                    ...s.filtroChip,
                    background: activo ? C.verde : '#fff',
                    color: activo ? '#fff' : C.textoSuave,
                    borderColor: activo ? C.verde : C.borde,
                  }}
                  onClick={() => setFiltro(c.key)}
                >
                  <span style={{ fontSize: 12 }}>{c.emoji}</span>
                  <span>{c.label}</span>
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
        )}

        {/* ══════ LISTA DE ALERTAS ══════ */}
        {filtradas.length === 0 ? (
          <div style={s.vacio}>
            <div style={s.vacioEmoji}>🚨</div>
            <div style={s.vacioTit}>
              {alertas.length === 0
                ? 'No hay alertas activas'
                : 'No hay alertas en esta categoría'}
            </div>
            <div style={s.vacioTxt}>
              {alertas.length === 0
                ? 'Si pasa algo urgente en el barrio, reportalo para que tus vecinos se enteren al toque.'
                : 'Probá con otra categoría o volvé a "Todas".'}
            </div>
            {alertas.length === 0 && (
              <button style={s.vacioCta} onClick={() => crear('alert')}>
                <IcoCrear size={16} />
                <span>Reportar una alerta</span>
              </button>
            )}
          </div>
        ) : (
          <div style={s.lista}>
            {filtradas.map((a) => {
              const dynamicCategory = categories.find(item => item.key === a.category)
              const cat = REPORTES[a.category] || { ...REPORTES.otro, label: dynamicCategory?.label || a.category || 'Otra', emoji: dynamicCategory?.emoji || '📌', color: C.verde, bg: C.verdeSuave }
              const pendiente = a.status === 'pendiente'
              const urgente = a.severity === 'alta' || (!a.severity && (a.category === 'seguridad' || a.category === 'salud' || a.category === 'incendio'))
              const confirmado = a.confirms_count >= 3
              // Distancia Haversine desde el GPS del user hasta la alerta.
              const metros = (a.latitude && a.longitude && userCoords)
                ? haversine(userCoords.lat, userCoords.lng, a.latitude, a.longitude)
                : a.distance_meters
              const dist = distancia(metros)
              const reporter = a.reporter || {}
              return (
                <button
                  key={a.id}
                  style={{
                    ...s.alertaCard,
                    borderLeftColor: cat.color,
                  }}
                  onClick={() => nav('alerta', { id: a.id })}
                >
                  <div style={s.alertaCuerpo}>
                    <div style={s.alertaTop}>
                      <div style={{ ...s.alertaIcono, background: '#fff', color: cat.color }}>
                        <IcoAlerta size={15} color={cat.color} />
                      </div>
                      <span style={{ ...s.alertaCat, color: cat.color }}>
                        {cat.label}
                      </span>
                      {pendiente && (
                        <span style={s.pendientePill}>
                          EN REVISIÓN
                        </span>
                      )}
                      {dist && (
                        <span style={s.distPill}>
                          <IcoUbicacion size={11} />
                          <span>a {dist} de vos</span>
                        </span>
                      )}
                      {urgente && (
                        <span style={{ ...s.urgentePill, background: cat.color }}>
                          URGENTE
                        </span>
                      )}
                      {confirmado && (
                        <span style={s.confirmadoPill}>
                          ✅ Verificada · {a.confirms_count} vecinos
                        </span>
                      )}
                    </div>

                    <div style={s.alertaTitle}>{a.title || cat.label}</div>
                    <div style={s.alertaDesc}>{a.description}</div>

                    <div style={s.alertaMeta}>
                      {a.location_text && (
                        <span style={s.metaItem}>
                          <IcoUbicacion size={12} />
                          <span>{a.location_text}</span>
                        </span>
                      )}
                      <span style={s.metaItem}>
                        <IcoReloj size={12} />
                        <span>{hace(a.created_at)}</span>
                      </span>
                    </div>

                    <div style={s.alertaPie}>
                      <span style={s.pieAvatar}>
                        {reporter.avatar_url
                          ? <img src={reporter.avatar_url} alt="" style={s.pieAvatarImg} />
                          : <span>{iniciales(reporter.full_name)}</span>}
                      </span>
                      <span style={s.pieNombre}>
                        {(reporter.full_name || 'Vecino').split(' ')[0]}
                      </span>
                      {reporter.verified && <span style={{ fontSize: 9 }}>✅</span>}
                      {reporter.badge_founder && <span style={{ fontSize: 9 }}>⭐</span>}
                      <span style={s.pieCta}>Ver detalle →</span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* ══════ INFO LEGAL ══════ */}
        <div style={s.infoLegal}>
          <IcoAlerta size={13} color={C.textoTenue} />
          <span style={s.infoLegalCopy}><strong>Las alertas son reportes de vecinos, no avisos oficiales.</strong><small>Emergencias: 131 Ambulancia · 132 Bomberos · 133 Carabineros · 1402 Seguridad Las Condes.</small></span>
        </div>
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════
const s = {
  wrap: {
    width: '100%', height: '100%',
    background: C.fondo, fontFamily: T.font,
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
  },
  cargando: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' },

  marca: { color: C.verde, fontWeight: 600 },
  pendingSummary: { color: '#9a6700', fontWeight: 600 },

  /* ── header ── */
  header: {
    minHeight: 'var(--screen-header-height)',
    padding: 'calc(env(safe-area-inset-top, 0px) + 18px) 58px 10px',
    backgroundColor: C.card,
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='72' height='64' viewBox='0 0 72 64'%3E%3Cg fill='none' stroke='%2316a34a' stroke-opacity='.22' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M36 8 61 52H11L36 8Z'/%3E%3Cpath d='M36 24v13M36 44h.01'/%3E%3C/g%3E%3C/svg%3E")`,
    backgroundSize: '72px 64px', backgroundPosition: 'calc(50% - 86px) center', backgroundRepeat: 'no-repeat',
    borderBottom: `2px solid ${C.verde}`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, position: 'relative', boxSizing: 'border-box',
  },
  backBtn: {
    position: 'absolute', left: 16, bottom: 10,
    width: 'var(--screen-header-control-size)', height: 'var(--screen-header-control-size)', borderRadius: '50%',
    background: 'rgba(255,255,255,.88)', border: `1px solid ${C.borde}`,
    color: C.texto, cursor: 'pointer', padding: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'inherit',
  },
  headerTit: { minWidth: 0, textAlign: 'center', fontSize: 'var(--screen-header-title-size)', lineHeight: 1.2, fontWeight: 600, color: '#26302b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  headerBrand: { color: C.verde, fontWeight: 700 },

  scroll: { flex: 1, overflowY: 'auto', padding: '14px 16px 120px' },

  safetyCard: {
    display: 'flex', alignItems: 'center', gap: 11,
    padding: '12px 14px', marginBottom: 12,
    background: '#fff', border: `1px solid ${C.borde}`, borderRadius: 15,
    boxShadow: '0 4px 14px rgba(20,44,29,.045)',
  },
  safetyIcon: {
    width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: C.verdeSuave, color: C.verdeOsc, fontSize: 17, fontWeight: 900,
  },
  safetyIconDanger: { background: '#fee2e2', color: '#c81e1e' },
  safetyCopy: {
    minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2,
    color: C.texto,
  },
  safetyTitle: { fontSize: 13.5, lineHeight: 1.25 },
  safetyText: { fontSize: 11.5, color: C.textoTenue, lineHeight: 1.35 },
  emitWrap: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
    padding: '4px 0 27px', color: C.textoTenue,
  },
  emitHelp: { fontSize: 13, lineHeight: 1.35, fontWeight: 600 },
  emitButton: {
    width: 108, height: 108, borderRadius: '50%', border: 'none',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 7,
    background: '#c81e1e', color: '#fff', cursor: 'pointer', fontFamily: 'inherit',
    fontSize: 11, letterSpacing: '.02em', boxShadow: '0 10px 25px rgba(200,30,30,.26)',
  },
  alertListHeading: {
    display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12,
    marginBottom: 11,
  },
  alertListCopy: { display: 'flex', flexDirection: 'column', gap: 2, fontSize: 15, color: C.texto },
  alertListAction: { padding: 0, border: 0, background: 'transparent', color: C.verdeOsc, fontSize: 11.5, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' },

  /* ── CTA reportar ── */
  ctaReportar: {
    display: 'flex', alignItems: 'center', gap: 13,
    width: '100%',
    background: C.verde,
    border: 'none',
    borderRadius: 18, padding: '15px 17px',
    cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
    boxShadow: '0 8px 22px rgba(22,163,74,0.28)',
    marginBottom: 14,
  },
  ctaIcono: {
    width: 44, height: 44, borderRadius: 12,
    background: 'rgba(255,255,255,0.18)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  ctaTexto: { flex: 1, minWidth: 0 },
  ctaTit: { fontSize: 15.5, fontWeight: 700, color: '#fff' },
  ctaSub: {
    fontSize: 12, color: 'rgba(255,255,255,0.85)',
    fontWeight: 400, marginTop: 2, lineHeight: 1.35,
  },
  ctaFlecha: { fontSize: 18, color: '#fff', fontWeight: 600, flexShrink: 0 },

  /* ── resumen ── */
  resumen: {
    display: 'flex', alignItems: 'baseline', gap: 6,
    marginBottom: 14,
  },
  resumenNum: { fontSize: 22, fontWeight: 800, color: C.texto },
  resumenTxt: { fontSize: 13.5, color: C.textoSuave, fontWeight: 500 },

  errorBox: {
    background: C.rojoBg, border: `1px solid ${C.rojoSuave}`,
    borderRadius: 12, padding: '11px 13px',
    fontSize: 12.5, color: C.rojo, marginBottom: 14, lineHeight: 1.4,
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

  /* ── lista ── */
  lista: { display: 'flex', flexDirection: 'column', gap: 11 },

  alertaCard: {
    position: 'relative',
    borderRadius: 16,
    border: `1px solid`,
    overflow: 'hidden',
    cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
    padding: 0, background: '#fff', borderColor: C.borde,
    boxShadow: '0 3px 12px rgba(20,44,29,.035)',
  },
  alertaBanda: {
    height: 4, width: '100%',
  },
  alertaCuerpo: { padding: '13px 14px 12px' },

  alertaTop: {
    display: 'flex', alignItems: 'center', gap: 7,
    marginBottom: 8, flexWrap: 'wrap',
  },
  alertaIcono: {
    width: 28, height: 28, borderRadius: 8,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  alertaCat: {
    fontSize: 10, fontWeight: 800, letterSpacing: 0.25,
    textTransform: 'uppercase',
  },
  urgentePill: {
    fontSize: 9, fontWeight: 800, letterSpacing: 0.4, color: '#fff',
    padding: '3px 7px', borderRadius: 5, flexShrink: 0,
  },
  distPill: {
    display: 'inline-flex', alignItems: 'center', gap: 3,
    fontSize: 10.5, fontWeight: 700, color: C.verdeOsc,
    background: '#fff', padding: '3px 8px', borderRadius: 999,
    flexShrink: 0,
  },
  confirmadoPill: {
    fontSize: 10.5, fontWeight: 700, color: C.verdeOsc,
    background: '#fff', padding: '3px 8px', borderRadius: 999,
    flexShrink: 0,
  },
  pendientePill: {
    fontSize: 8.5, fontWeight: 700, letterSpacing: '0.05em',
    color: '#7c5b00', background: '#fff7d6',
    border: '1px solid #ead58b', borderRadius: 999,
    padding: '3px 7px', whiteSpace: 'nowrap',
  },

  alertaTitle: {
    fontSize: 14.5, lineHeight: 1.3, fontWeight: 800, color: C.texto,
    marginBottom: 4,
  },

  alertaDesc: {
    fontSize: 14, color: C.texto, fontWeight: 500, lineHeight: 1.5,
    marginBottom: 10,
    display: '-webkit-box', WebkitLineClamp: 3,
    WebkitBoxOrient: 'vertical', overflow: 'hidden',
  },

  alertaMeta: {
    display: 'flex', flexWrap: 'wrap', gap: 12,
    marginBottom: 10,
  },
  metaItem: {
    display: 'flex', alignItems: 'center', gap: 4,
    fontSize: 11.5, color: C.textoTenue, fontWeight: 500,
  },

  alertaPie: {
    display: 'flex', alignItems: 'center', gap: 5,
    paddingTop: 10,
    borderTop: '1px solid rgba(0,0,0,0.06)',
  },
  pieAvatar: {
    width: 20, height: 20, borderRadius: '50%',
    background: '#fff', overflow: 'hidden',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 9, fontWeight: 800, color: C.verde, flexShrink: 0,
  },
  pieAvatarImg: { width: '100%', height: '100%', objectFit: 'cover' },
  pieNombre: { fontSize: 11.5, fontWeight: 700, color: C.texto },
  pieCta: {
    marginLeft: 'auto',
    fontSize: 11.5, fontWeight: 700, color: C.verde,
  },

  /* ── vacío ── */
  vacio: {
    textAlign: 'center', padding: '38px 20px 28px',
    background: C.card, borderRadius: 18, border: `1px solid ${C.borde}`,
  },
  vacioEmoji: { fontSize: 42, marginBottom: 10 },
  vacioTit: { fontSize: 16, fontWeight: 700, color: C.texto, marginBottom: 5 },
  vacioTxt: {
    fontSize: 13, color: C.textoTenue, lineHeight: 1.5,
    marginBottom: 16, maxWidth: 280, margin: '0 auto 16',
  },
  vacioCta: {
    display: 'inline-flex', alignItems: 'center', gap: 7,
    padding: '11px 18px', borderRadius: 999,
    background: C.verde, color: '#fff', border: 'none',
    fontSize: 13.5, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit',
  },

  /* ── info legal ── */
  infoLegal: {
    display: 'flex', alignItems: 'flex-start', gap: 8,
    marginTop: 18, padding: '11px 13px',
    background: C.card, border: `1px solid ${C.borde}`,
    borderRadius: 12,
    fontSize: 11.5, color: C.textoTenue, lineHeight: 1.45,
  },
  infoLegalCopy: { display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 },
}

export default Alertas
