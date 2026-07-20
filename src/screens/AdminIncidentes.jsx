import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { C, T, S, REPORTES, hace } from '../lib/design'

/*
  AdminIncidentes — Gestión de alertas / incidentes.

  Pantalla del panel admin. Solo visible para profile.role === 'admin'.

  Funciones:
    · Lista todos los incident_reports (tabla `incident_reports`).
    · Cada incidente: emoji de categoría, descripción truncada, status,
      confirms_count, created_at.
    · Cambiar status: pendiente → resuelto (botón "Marcar resuelto").
      También se puede volver a pendiente si fue resuelto por error.
    · Filtro por status: Todos / Pendientes / Resueltos.
    · Click en una card → expande para ver descripción completa y metadatos.

  "el barrio" siempre minúscula y verde.
*/

// Mapa de categorías con fallback al REPORTES de design.js.
const CAT_FALLBACK = { emoji: '📌', label: 'Otro', color: C.textoTenue, bg: C.fondo }
const catDe = (key) => {
  if (!key) return CAT_FALLBACK
  return (REPORTES && REPORTES[key]) || CAT_FALLBACK
}

const FILTROS = [
  { key: 'todos',      label: 'Todos',      emoji: '📋' },
  { key: 'pendiente',  label: 'Pendientes', emoji: '🟡' },
  { key: 'resuelto',   label: 'Resueltos',  emoji: '✅' },
]

export default function AdminIncidentes({ currentUser, onNavigate }) {
  const [profile, setProfile] = useState(null)
  const [incidentes, setIncidentes] = useState([])
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [toast, setToast] = useState('')
  const [filtro, setFiltro] = useState('todos')
  const [expandidoId, setExpandidoId] = useState(null)
  const [cambiandoId, setCambiandoId] = useState(null)

  const nav = onNavigate || (() => {})

  useEffect(() => { cargar() }, [currentUser?.id])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 2400)
    return () => clearTimeout(t)
  }, [toast])

  const showToast = (msg) => setToast(msg)

  const cargar = async () => {
    if (!currentUser?.id) { setLoading(false); return }
    setLoading(true)
    try {
      const uid = currentUser.user_id || currentUser.id
      let prof = (currentUser && (currentUser.role || currentUser.full_name))
        ? currentUser : null
      if (!prof || !prof.role) {
        const { data } = await supabase
          .from('profiles').select('*')
          .eq('user_id', uid).maybeSingle()
        prof = data || prof
      }
      setProfile(prof)
      if (!prof || prof.role !== 'admin') {
        setForbidden(true)
        setLoading(false)
        return
      }
      const { data, error } = await supabase
        .from('incident_reports')
        .select('id, reporter_id, neighborhood_id, category, description, photo_url, is_anonymous, lat, lng, location_text, status, confirms_count, flags_count, severity, title, images, created_at, expires_at, resolved_at, resolved_by')
        .order('created_at', { ascending: false })
        .limit(200)
      if (error) throw error
      // Normalizamos status: históricamente era 'active' en vez de 'pendiente'.
      const norm = (data || []).map((x) => ({
        ...x,
        status: x.status === 'active' ? 'pendiente' : (x.status || 'pendiente'),
      }))
      setIncidentes(norm)
    } catch (e) {
      console.error('[admin incidentes] Error:', e)
      showToast('No pudimos cargar los incidentes.')
    } finally {
      setLoading(false)
    }
  }

  // ── CAMBIAR STATUS ──
  const cambiarStatus = async (inc, nuevoStatus) => {
    setCambiandoId(inc.id)
    const prevStatus = inc.status
    setIncidentes(prev => prev.map(x => x.id === inc.id
      ? {
          ...x,
          status: nuevoStatus,
          resolved_at: nuevoStatus === 'resuelto' ? new Date().toISOString() : null,
          resolved_by: nuevoStatus === 'resuelto' ? (profile?.id || null) : null,
        }
      : x))
    try {
      const payload = { status: nuevoStatus }
      if (nuevoStatus === 'resuelto') {
        payload.resolved_at = new Date().toISOString()
        payload.resolved_by = profile?.id || null
      } else {
        payload.resolved_at = null
        payload.resolved_by = null
      }
      const { error } = await supabase
        .from('incident_reports')
        .update(payload)
        .eq('id', inc.id)
      if (error) throw error
      showToast(nuevoStatus === 'resuelto'
        ? 'Incidente marcado como resuelto ✅'
        : 'Incidente reabierto 🟡')
    } catch (e) {
      console.error('[admin incidentes] cambiarStatus:', e)
      setIncidentes(prev => prev.map(x => x.id === inc.id ? { ...x, status: prevStatus } : x))
      showToast('No pudimos actualizar el incidente.')
    } finally {
      setCambiandoId(null)
    }
  }

  // ── FILTRO POR STATUS ──
  const filtrados = filtro === 'todos'
    ? incidentes
    : incidentes.filter((i) => i.status === filtro)

  // ── COUNTS PARA FILTROS ──
  const conteos = incidentes.reduce((acc, i) => {
    acc.todos = (acc.todos || 0) + 1
    acc[i.status] = (acc[i.status] || 0) + 1
    return acc
  }, { todos: 0, pendiente: 0, resuelto: 0 })

  // ── RENDER ──
  if (loading) {
    return (
      <div style={s.wrap}>
        <Header onBack={() => nav('back')} />
        <div style={s.cargando}>
          <div style={{ fontSize: 44 }}>🚨</div>
          <div style={{ fontSize: 14, color: C.textoTenue, marginTop: 10 }}>
            Cargando incidentes…
          </div>
        </div>
      </div>
    )
  }

  if (forbidden) {
    return (
      <div style={s.wrap}>
        <Header onBack={() => nav('back')} />
        <div style={s.scroll}>
          <PantallaPermiso onVolver={() => nav('back')} />
        </div>
      </div>
    )
  }

  return (
    <div style={s.wrap}>
      <Header onBack={() => nav('back')} />

      <div style={s.scroll}>
        {/* ══════ RESUMEN ══════ */}
        <div style={s.resumen}>
          <span style={s.resumenNum}>{conteos.pendiente}</span>
          <span style={s.resumenTxt}>
            incidente{conteos.pendiente === 1 ? '' : 's'} pendiente{conteos.pendiente === 1 ? '' : 's'} ·{' '}
            <span style={s.marca}>{conteos.resuelto}</span> resuelto{conteos.resuelto === 1 ? '' : 's'}
          </span>
        </div>

        {/* ══════ FILTROS ══════ */}
        <div style={s.filtros}>
          {FILTROS.map((f) => {
            const activo = filtro === f.key
            const count = conteos[f.key] || 0
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
                <span style={{ fontSize: 13 }}>{f.emoji}</span>
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

        {/* ══════ LISTA ══════ */}
        {filtrados.length === 0 ? (
          <div style={s.vacio}>
            <div style={s.vacioEmoji}>🚨</div>
            <div style={s.vacioTit}>
              {filtro === 'pendiente' && 'No hay incidentes pendientes'}
              {filtro === 'resuelto' && 'No hay incidentes resueltos'}
              {filtro === 'todos' && 'No hay incidentes reportados'}
            </div>
            <div style={s.vacioTxt}>
              {filtro === 'todos'
                ? 'Cuando los vecinos reporten alertas, van a aparecer acá para que las gestiones.'
                : 'Probá con otro filtro.'}
            </div>
          </div>
        ) : (
          <div style={s.lista}>
            {filtrados.map((inc) => {
              const cat = catDe(inc.category)
              const expandido = expandidoId === inc.id
              const esResuelto = inc.status === 'resuelto'
              return (
                <div
                  key={inc.id}
                  style={{
                    ...s.card,
                    background: esResuelto ? C.fondo : C.card,
                    borderColor: esResuelto ? C.borde : cat.color,
                    borderLeft: `4px solid ${esResuelto ? C.verde : cat.color}`,
                    opacity: esResuelto ? 0.85 : 1,
                  }}
                >
                  {/* TOP */}
                  <button
                    style={s.cardTopBtn}
                    onClick={() => setExpandidoId(expandido ? null : inc.id)}
                  >
                    <div style={{ ...s.cardEmoji, background: cat.bg, color: cat.color }}>
                      {cat.emoji}
                    </div>
                    <div style={s.cardTexto}>
                      <div style={s.cardTitRow}>
                        <span style={s.cardCat}>{cat.label}</span>
                        <span style={{
                          ...s.statusPill,
                          background: esResuelto ? C.verdeSuave : C.doradoSuave,
                          color: esResuelto ? C.verdeOsc : C.dorado,
                        }}>
                          {esResuelto ? '✅ Resuelto' : '🟡 Pendiente'}
                        </span>
                        {inc.severity === 'alta' && (
                          <span style={{ ...s.severityPill, background: C.rojo }}>
                            URGENTE
                          </span>
                        )}
                      </div>
                      <div style={s.cardDesc}>
                        {(inc.title || inc.description || 'Sin descripción').slice(0, expandido ? 1000 : 90)}
                        {!expandido && (inc.description || '').length > 90 ? '…' : ''}
                      </div>
                      <div style={s.cardMeta}>
                        <span style={s.metaItem}>
                          ✋ {inc.confirms_count || 0} confirma{(inc.confirms_count || 0) === 1 ? '' : 's'}
                        </span>
                        <span style={s.metaItem}>🕐 {hace(inc.created_at)}</span>
                        {inc.location_text && (
                          <span style={s.metaItem}>📍 {inc.location_text}</span>
                        )}
                      </div>
                    </div>
                    <div style={s.cardFlecha}>
                      {expandido ? '▲' : '▼'}
                    </div>
                  </button>

                  {/* EXPANDIDO */}
                  {expandido && (
                    <div style={s.cardDetalle}>
                      {inc.description && inc.description !== inc.title && (
                        <div style={s.detalleBlock}>
                          <div style={s.detalleLabel}>Descripción</div>
                          <div style={s.detalleTxt}>{inc.description}</div>
                        </div>
                      )}
                      <div style={s.detalleGrid}>
                        {inc.is_anonymous != null && (
                          <div style={s.detalleItem}>
                            <span style={s.detalleK}>Anónimo</span>
                            <span style={s.detalleV}>{inc.is_anonymous ? 'Sí' : 'No'}</span>
                          </div>
                        )}
                        {inc.severity && (
                          <div style={s.detalleItem}>
                            <span style={s.detalleK}>Severidad</span>
                            <span style={s.detalleV}>{inc.severity}</span>
                          </div>
                        )}
                        {inc.flags_count != null && Number(inc.flags_count) > 0 && (
                          <div style={s.detalleItem}>
                            <span style={s.detalleK}>Reportes</span>
                            <span style={s.detalleV}>🚩 {inc.flags_count}</span>
                          </div>
                        )}
                        {inc.expires_at && (
                          <div style={s.detalleItem}>
                            <span style={s.detalleK}>Expira</span>
                            <span style={s.detalleV}>{hace(inc.expires_at)}</span>
                          </div>
                        )}
                        {inc.resolved_at && (
                          <div style={s.detalleItem}>
                            <span style={s.detalleK}>Resuelto</span>
                            <span style={s.detalleV}>{hace(inc.resolved_at)}</span>
                          </div>
                        )}
                        {inc.lat != null && inc.lng != null && (
                          <div style={s.detalleItem}>
                            <span style={s.detalleK}>Coords</span>
                            <span style={s.detalleV}>
                              {Number(inc.lat).toFixed(4)}, {Number(inc.lng).toFixed(4)}
                            </span>
                          </div>
                        )}
                      </div>

                      {inc.images && Array.isArray(inc.images) && inc.images.length > 0 && (
                        <div style={s.imagenesRow}>
                          {inc.images.map((img, idx) => (
                            <img
                              key={idx}
                              src={typeof img === 'string' ? img : img.url}
                              alt={`Foto ${idx + 1}`}
                              style={s.imgThumb}
                            />
                          ))}
                        </div>
                      )}

                      {/* ACCIONES */}
                      <div style={s.accionesRow}>
                        {esResuelto ? (
                          <button
                            style={s.btnReabrir}
                            onClick={() => cambiarStatus(inc, 'pendiente')}
                            disabled={cambiandoId === inc.id}
                          >
                            {cambiandoId === inc.id ? 'Guardando…' : '🔄 Reabrir incidente'}
                          </button>
                        ) : (
                          <button
                            style={s.btnResolver}
                            onClick={() => cambiarStatus(inc, 'resuelto')}
                            disabled={cambiandoId === inc.id}
                          >
                            {cambiandoId === inc.id ? 'Guardando…' : '✅ Marcar resuelto'}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ══════ INFO ══════ */}
        <div style={s.infoBox}>
          ⚠️ Las alertas son reportes de vecinos, no avisos oficiales. Si el
          incidente es una emergencia real, llamá a Carabineros al <strong>133</strong>.
        </div>
      </div>

      {toast && <div style={s.toast}>{toast}</div>}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// PANTALLA "NO TIENES PERMISO"
// ──────────────────────────────────────────────────────────────
function PantallaPermiso({ onVolver }) {
  return (
    <div style={s.vacio}>
      <div style={s.vacioEmoji}>🔒</div>
      <div style={s.vacioTit}>No tienes permiso</div>
      <div style={s.vacioTxt}>
        Esta sección es solo para administradores de{' '}
        <span style={s.marca}>el barrio</span>.
      </div>
      <button style={s.vacioCta} onClick={onVolver}>← Volver</button>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// HEADER
// ──────────────────────────────────────────────────────────────
function Header({ onBack }) {
  return (
    <div style={s.header}>
      <button style={s.backBtn} onClick={onBack} aria-label="Volver">←</button>
      <div style={s.headerTit}>
        🚨 Alertas · <span style={s.marca}>el barrio</span>
      </div>
      <div style={{ width: 40 }} />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
const s = {
  wrap: {
    width: '100%', height: '100%',
    background: C.fondo, fontFamily: T.font,
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
    position: 'relative',
  },
  cargando: {
    flex: 1, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    color: C.textoSuave,
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
    fontSize: 20, fontWeight: 700, fontFamily: 'inherit',
  },
  headerTit: {
    fontSize: 16, fontWeight: 800, color: C.texto,
    letterSpacing: '-0.2px',
  },

  scroll: { flex: 1, overflowY: 'auto', padding: '14px 16px 110px' },

  /* ── resumen ── */
  resumen: {
    display: 'flex', alignItems: 'baseline', gap: 6,
    marginBottom: 12, flexWrap: 'wrap',
  },
  resumenNum: { fontSize: 22, fontWeight: 800, color: C.texto },
  resumenTxt: { fontSize: 13.5, color: C.textoSuave, fontWeight: 500 },

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
    padding: '8px 12px', borderRadius: 999,
    border: `1px solid ${C.borde}`,
    background: '#fff',
    fontSize: 13, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit',
  },
  filtroCount: {
    minWidth: 18, height: 18, padding: '0 5px',
    borderRadius: 999,
    fontSize: 10.5, fontWeight: 800,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },

  /* ── lista ── */
  lista: { display: 'flex', flexDirection: 'column', gap: 10 },

  /* ── card ── */
  card: {
    background: C.card,
    border: `1px solid ${C.borde}`,
    borderRadius: 16,
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
  },
  cardTopBtn: {
    display: 'flex', alignItems: 'flex-start', gap: 12,
    width: '100%',
    background: 'transparent', border: 'none',
    padding: '14px 15px', cursor: 'pointer',
    fontFamily: 'inherit', textAlign: 'left',
  },
  cardEmoji: {
    width: 42, height: 42, borderRadius: 11,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 20, flexShrink: 0,
  },
  cardTexto: { flex: 1, minWidth: 0 },
  cardTitRow: {
    display: 'flex', alignItems: 'center', gap: 6,
    flexWrap: 'wrap', marginBottom: 4,
  },
  cardCat: {
    fontSize: 13, fontWeight: 800, color: C.texto,
    textTransform: 'uppercase', letterSpacing: 0.2,
  },
  statusPill: {
    fontSize: 11, fontWeight: 800,
    padding: '3px 8px', borderRadius: 999,
  },
  severityPill: {
    fontSize: 10, fontWeight: 800, letterSpacing: 0.4,
    color: '#fff',
    padding: '3px 7px', borderRadius: 5,
  },
  cardDesc: {
    fontSize: 14, color: C.texto, fontWeight: 500, lineHeight: 1.5,
    marginBottom: 8,
  },
  cardMeta: {
    display: 'flex', flexWrap: 'wrap', gap: 10,
  },
  metaItem: {
    fontSize: 12, color: C.textoTenue, fontWeight: 600,
  },
  cardFlecha: {
    fontSize: 12, color: C.textoTenue, fontWeight: 700, flexShrink: 0,
    padding: '4px 0',
  },

  /* ── detalle expandido ── */
  cardDetalle: {
    borderTop: '1px solid rgba(0,0,0,0.06)',
    padding: '14px 15px',
    background: C.fondo,
  },
  detalleBlock: { marginBottom: 12 },
  detalleLabel: {
    fontSize: 11, fontWeight: 800, color: C.textoTenue,
    textTransform: 'uppercase', letterSpacing: 0.3,
    marginBottom: 4,
  },
  detalleTxt: {
    fontSize: 14, color: C.texto, fontWeight: 500, lineHeight: 1.55,
  },
  detalleGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 8, marginBottom: 12,
  },
  detalleItem: {
    background: C.card,
    borderRadius: 8, padding: '8px 10px',
    border: `1px solid ${C.borde}`,
  },
  detalleK: {
    display: 'block', fontSize: 11, fontWeight: 700,
    color: C.textoTenue, marginBottom: 2,
  },
  detalleV: {
    fontSize: 13, fontWeight: 700, color: C.texto,
  },
  imagenesRow: {
    display: 'flex', gap: 6, marginBottom: 12,
    overflowX: 'auto',
    scrollbarWidth: 'none',
  },
  imgThumb: {
    width: 72, height: 72, borderRadius: 8,
    objectFit: 'cover', flexShrink: 0,
    border: `1px solid ${C.borde}`,
  },

  /* ── acciones ── */
  accionesRow: {
    display: 'flex', gap: 8,
  },
  btnResolver: {
    flex: 1,
    background: C.verde, border: 'none',
    color: '#fff', padding: '11px 14px', borderRadius: 10,
    fontSize: 14, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit',
    boxShadow: '0 4px 12px rgba(22,163,74,0.22)',
  },
  btnReabrir: {
    flex: 1,
    background: C.doradoSuave, border: `1px solid #fde68a`,
    color: '#92400e', padding: '11px 14px', borderRadius: 10,
    fontSize: 14, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit',
  },

  /* ── vacío ── */
  vacio: {
    textAlign: 'center', padding: '40px 20px 28px',
    background: C.card, borderRadius: 18, border: `1px solid ${C.borde}`,
    marginTop: 10,
  },
  vacioEmoji: { fontSize: 44, marginBottom: 10 },
  vacioTit: { fontSize: 16, fontWeight: 700, color: C.texto, marginBottom: 5 },
  vacioTxt: {
    fontSize: 13, color: C.textoTenue, lineHeight: 1.5,
    marginBottom: 16, maxWidth: 280, margin: '0 auto 16px',
  },
  vacioCta: {
    display: 'inline-flex', alignItems: 'center', gap: 7,
    padding: '11px 18px', borderRadius: 999,
    background: C.verde, color: '#fff', border: 'none',
    fontSize: 14, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit',
  },

  /* ── info box ── */
  infoBox: {
    marginTop: 18,
    padding: '12px 14px',
    background: C.rojoBg,
    border: `1px solid ${C.rojoSuave}`,
    borderRadius: 12,
    fontSize: 13, color: C.rojo, lineHeight: 1.45,
    fontWeight: 500,
  },

  /* ── toast ── */
  toast: {
    position: 'absolute', bottom: 26, left: '50%',
    transform: 'translateX(-50%)',
    background: C.texto, color: '#fff',
    padding: '11px 18px', borderRadius: 999,
    fontSize: 13.5, fontWeight: 600,
    boxShadow: '0 8px 22px rgba(0,0,0,0.20)',
    zIndex: 50, maxWidth: '90%',
    textAlign: 'center',
  },
}
