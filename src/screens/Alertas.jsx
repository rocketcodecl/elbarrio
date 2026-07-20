import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
  C, T, REPORTES, iniciales, hace, distancia,
} from '../lib/design'

/*
  ALERTAS — Central hub de alertas de el barrio.

  Acá se unifican TODAS las alertas activas del barrio del user.
  Estructura:
    1. Header con back + título "Alertas"
    2. CTA grande "Reportar una alerta" (invoca onCrear('alert'))
    3. Filtros por categoría (Todas, Seguridad, Salud, Infra, Mascotas, Otro)
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
  { key: 'salud',     label: 'Salud',     emoji: REPORTES.salud?.emoji || '💊' },
  { key: 'infra',     label: 'Infra',     emoji: REPORTES.infra?.emoji || '🚧' },
  { key: 'mascotas',  label: 'Mascotas',  emoji: REPORTES.mascotas?.emoji || '🐾' },
  { key: 'otro',      label: 'Otro',      emoji: REPORTES.otro?.emoji || '📌' },
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
  const [profile, setProfile] = useState(null)
  const [alertas, setAlertas] = useState([])
  const [filtro, setFiltro] = useState('todas')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [userCoords, setUserCoords] = useState(null)

  useEffect(() => { cargar() }, [currentUser?.id])

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
    if (!currentUser?.id) return
    setCargando(true)
    setError('')
    try {
      const { data: p } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', currentUser.id)
        .maybeSingle()
      if (!p) return
      setProfile(p)

      // Query robusto:
      // · Si el user tiene neighborhood_id, mostramos incidentes de SU barrio
      //   + los que no tengan neighborhood asignado (is.null).
      //   Uso .or() porque .eq('col', null) en Postgres devuelve 0 rows.
      // · Si el user NO tiene neighborhood_id, no filtramos por barrio y
      //   mostramos TODOS los incidentes (para que la lista no quede vacía).
      // · Status: el admin normaliza 'active' → 'pendiente' al mostrar, pero
      //   en la DB pueden existir ambos valores. Usamos .in() para captarlos.
      let q = supabase
        .from('incident_reports')
        .select('*, reporter:profiles!reporter_id (full_name, avatar_url, badge_founder, verified)')
        .in('status', ['active', 'pendiente'])

      if (p.neighborhood_id) {
        q = q.or(`neighborhood_id.eq.${p.neighborhood_id},neighborhood_id.is.null`)
      }

      const res = await q
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

  const nav = onNavigate || (() => {})
  const crear = onCrear || (() => {})

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

  if (cargando) {
    return (
      <div style={s.wrap}>
        <div style={s.cargando}>
          <img src="/isotipo.png" alt="" style={{ width: 58, opacity: 0.4 }} />
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
        <div style={s.headerTit}>Alertas</div>
        <div style={{ width: 40 }} />
      </div>

      <div style={s.scroll}>

        {/* ══════ CTA GRANDE: REPORTAR ══════ */}
        <button style={s.ctaReportar} onClick={() => crear('alert')}>
          <div style={s.ctaIcono}>
            <IcoAlerta size={20} color="#fff" />
          </div>
          <div style={s.ctaTexto}>
            <div style={s.ctaTit}>Reportar una alerta</div>
            <div style={s.ctaSub}>
              Avisa a tus vecinos de algo urgente que pasa ahora
            </div>
          </div>
          <div style={s.ctaFlecha}>→</div>
        </button>

        {/* ══════ RESUMEN ══════ */}
        <div style={s.resumen}>
          <span style={s.resumenNum}>{alertas.length}</span>
          <span style={s.resumenTxt}>
            alerta{alertas.length === 1 ? '' : 's'} activa{alertas.length === 1 ? '' : 's'} en{' '}
            <span style={s.marca}>el barrio</span>
          </span>
        </div>

        {error && <div style={s.errorBox}>{error}</div>}

        {/* ══════ FILTROS ══════ */}
        {alertas.length > 0 && (
          <div style={s.filtros}>
            {CATS.map((c) => {
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
              const cat = REPORTES[a.category] || REPORTES.seguridad
              const urgente = a.category === 'seguridad' || a.category === 'salud'
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
                    background: cat.bg,
                    borderColor: cat.color,
                  }}
                  onClick={() => nav('alerta', { id: a.id })}
                >
                  {/* Banda superior de color */}
                  <div style={{ ...s.alertaBanda, background: cat.color }} />

                  <div style={s.alertaCuerpo}>
                    <div style={s.alertaTop}>
                      <div style={{ ...s.alertaIcono, background: '#fff', color: cat.color }}>
                        <IcoAlerta size={15} color={cat.color} />
                      </div>
                      <span style={{ ...s.alertaCat, color: cat.color }}>
                        {cat.label}
                      </span>
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
          <span>
            Las alertas son reportes de vecinos, no avisos oficiales.
            En emergencias llamá a Carabineros al <strong>133</strong>.
          </span>
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

  scroll: { flex: 1, overflowY: 'auto', padding: '14px 16px 120px' },

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
    padding: 0,
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
    fontSize: 13, fontWeight: 800, letterSpacing: 0.2,
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
}

export default Alertas
