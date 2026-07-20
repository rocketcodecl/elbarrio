import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { C, T, S, iniciales, hace } from '../lib/design'

/*
  AdminUsuarios — Gestión de usuarios.

  Pantalla del panel admin. Solo visible para profile.role === 'admin'.

  Funciones:
    · Lista todos los perfiles (tabla `profiles`).
    · Cada perfil: avatar (o iniciales), nombre, RUT, email, role, barrio.
    · Cambiar role vecino ↔ admin (botón directo).
    · Botón "Banear" → muestra confirmación; como la tabla no tiene columna
      `banned`, dejamos el botón pero marca con toast "Próximamente".
    · Buscador por nombre, email o RUT.

  "el barrio" siempre minúscula y verde.
*/

export default function AdminUsuarios({ currentUser, onNavigate }) {
  const [profile, setProfile] = useState(null)
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [toast, setToast] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [cambiandoId, setCambiandoId] = useState(null) // id con role en proceso

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
      // select('*') trae TODAS las columnas que existan en profiles.
      // No lista columnas específicas, así que NUNCA falla con
      // "column X does not exist" aunque falten barrio/comuna/verified/etc.
      // Accedemos a cada columna defensivamente en la UI (|| '' o condicionales).
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500)

      if (error) throw error
      setUsuarios(data || [])
    } catch (e) {
      console.error('[admin usuarios] Error:', e)
      const msg = e?.message || (typeof e === 'string' ? e : 'Error desconocido')
      showToast('No pudimos cargar los usuarios. Error: ' + msg)
    } finally {
      setLoading(false)
    }
  }

  // ── CAMBIAR ROLE (vecino ↔ admin) ──
  const cambiarRole = async (u) => {
    const nuevo = u.role === 'admin' ? 'vecino' : 'admin'
    setCambiandoId(u.id)
    setUsuarios(prev => prev.map(x => x.id === u.id ? { ...x, role: nuevo } : x))
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: nuevo })
        .eq('id', u.id)
      if (error) throw error
      showToast(nuevo === 'admin'
        ? `${u.full_name?.split(' ')[0] || 'Usuario'} ahora es admin ✅`
        : 'Quitaste permisos de admin')
    } catch (e) {
      console.error('[admin usuarios] cambiarRole:', e)
      // Revertir
      setUsuarios(prev => prev.map(x => x.id === u.id ? { ...x, role: u.role } : x))
      const msg = e?.message || (typeof e === 'string' ? e : 'Error desconocido')
      showToast('No pudimos cambiar el rol. Error: ' + msg)
    } finally {
      setCambiandoId(null)
    }
  }

  // ── BANEAR (placeholder) ──
  const banear = (u) => {
    showToast(`Banear a ${u.full_name?.split(' ')[0] || 'usuario'} — próximamente 🚧`)
  }

  // ── FILTRO POR BÚSQUEDA ──
  const q = busqueda.trim().toLowerCase()
  const filtrados = q
    ? usuarios.filter((u) => {
        const nombre = (u.full_name || '').toLowerCase()
        const email = (u.email || '').toLowerCase()
        const rut = (u.rut || '').toLowerCase()
        const comuna = (u.comuna || '').toLowerCase()
        const barrio = (u.barrio || '').toLowerCase()
        return nombre.includes(q) || email.includes(q) || rut.includes(q)
          || comuna.includes(q) || barrio.includes(q)
      })
    : usuarios

  // ── COUNTS PARA RESUMEN ──
  // Verificado si: verification_status === 'verified' O verified === true
  // O verified_at existe (algunos schemas usan timestamp en vez de bool/enum).
  const esVerificado = (u) =>
    u.verification_status === 'verified' || u.verified === true || !!u.verified_at

  const stats = usuarios.reduce((acc, u) => {
    acc.total++
    if (u.role === 'admin') acc.admins++
    if (esVerificado(u)) acc.verificados++
    return acc
  }, { total: 0, admins: 0, verificados: 0 })

  // ── RENDER ──
  if (loading) {
    return (
      <div style={s.wrap}>
        <Header onBack={() => nav('back')} />
        <div style={s.cargando}>
          <div style={{ fontSize: 44 }}>👥</div>
          <div style={{ fontSize: 14, color: C.textoTenue, marginTop: 10 }}>
            Cargando usuarios…
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
        {/* ══════ STATS RÁPIDAS ══════ */}
        <div style={s.statsRow}>
          <div style={{ ...s.statMini, background: C.verdeBg }}>
            <div style={{ ...s.statMiniNum, color: C.verdeOsc }}>{stats.total}</div>
            <div style={s.statMiniLabel}>Total</div>
          </div>
          <div style={{ ...s.statMini, background: C.doradoSuave }}>
            <div style={{ ...s.statMiniNum, color: C.dorado }}>{stats.verificados}</div>
            <div style={s.statMiniLabel}>✅ Verificados</div>
          </div>
          <div style={{ ...s.statMini, background: C.moradoSuave }}>
            <div style={{ ...s.statMiniNum, color: C.morado }}>{stats.admins}</div>
            <div style={s.statMiniLabel}>🛠️ Admins</div>
          </div>
        </div>

        {/* ══════ BUSCADOR ══════ */}
        <div style={s.buscarWrap}>
          <span style={s.buscarIcono}>🔍</span>
          <input
            style={s.buscarInput}
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder='Buscar por nombre, email o RUT…'
          />
          {busqueda && (
            <button style={s.buscarClear} onClick={() => setBusqueda('')}>
              ✕
            </button>
          )}
        </div>

        {/* ══════ LISTA ══════ */}
        {filtrados.length === 0 ? (
          <div style={s.vacio}>
            <div style={s.vacioEmoji}>👥</div>
            <div style={s.vacioTit}>
              {busqueda ? 'No hay coincidencias' : 'No hay usuarios'}
            </div>
            <div style={s.vacioTxt}>
              {busqueda
                ? 'Probá con otro nombre o email.'
                : 'Los vecinos que se sumen a el barrio van a aparecer acá.'}
            </div>
          </div>
        ) : (
          <div style={s.lista}>
            {filtrados.map((u) => (
              <UsuarioCard
                key={u.id}
                u={u}
                esYo={!!(profile && (u.id === profile.id || u.user_id === profile.user_id))}
                onToggleRole={() => cambiarRole(u)}
                onBan={() => banear(u)}
                cambiando={cambiandoId === u.id}
              />
            ))}
          </div>
        )}

        {/* ══════ INFO ══════ */}
        <div style={s.infoBox}>
          ⚠️ Dar permisos de admin a alguien le da acceso al panel completo.
          Solo se lo das a vecinos de confianza.
        </div>
      </div>

      {toast && <div style={s.toast}>{toast}</div>}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// CARD DE USUARIO
// ──────────────────────────────────────────────────────────────
function UsuarioCard({ u, esYo, onToggleRole, onBan, cambiando }) {
  const esAdmin = u.role === 'admin'
  return (
    <div style={{
      ...s.card,
      borderLeft: `4px solid ${esAdmin ? C.morado : (esYo ? C.verde : C.borde)}`,
    }}>
      <div style={s.cardTop}>
        {/* Avatar */}
        {u.avatar_url ? (
          <img src={u.avatar_url} alt={u.full_name || ''} style={s.avatar} />
        ) : (
          <div style={s.avatarFallback}>
            {iniciales(u.full_name)}
          </div>
        )}

        <div style={s.cardTexto}>
          <div style={s.cardTitRow}>
            <span style={s.cardTit}>{u.full_name || 'Vecino sin nombre'}</span>
            {esYo && <span style={s.yoBadge}>VOS</span>}
            {esAdmin && <span style={s.adminBadge}>🛠️ ADMIN</span>}
            {(u.verification_status === 'verified' || u.verified === true || u.verified_at) && (
              <span style={s.verifBadge}>✅ Verificado</span>
            )}
            {u.badge_founder && <span style={s.founderBadge}>🏅</span>}
          </div>
          <div style={s.cardMeta}>
            {u.rut && <span style={s.metaItem}>🆔 {u.rut}</span>}
            {u.email && <span style={s.metaItem}>✉️ {u.email}</span>}
          </div>
          <div style={s.cardMeta}>
            {(u.comuna || u.barrio) && (
              <span style={s.metaItem}>
                📍 {[u.barrio, u.comuna].filter(Boolean).join(', ')}
              </span>
            )}
            {u.created_at && (
              <span style={s.metaItem}>🗓️ Se sumó {hace(u.created_at)}</span>
            )}
          </div>
        </div>
      </div>

      {/* ACCIONES */}
      <div style={s.accionesRow}>
        <button
          style={{
            ...s.btnRole,
            background: esAdmin ? C.moradoSuave : C.fondo,
            color: esAdmin ? C.morado : C.texto,
            border: esAdmin ? `1px solid ${C.morado}` : `1px solid ${C.borde}`,
          }}
          onClick={onToggleRole}
          disabled={esYo || cambiando}
        >
          {cambiando
            ? 'Guardando…'
            : esYo
              ? '🛡️ Vos sos admin'
              : esAdmin
                ? '⬇️ Quitar admin'
                : '⬆️ Hacer admin'}
        </button>
        <button
          style={s.btnBan}
          onClick={onBan}
          disabled={esYo}
        >
          🚫 Banear
        </button>
      </div>
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
        👥 Usuarios · <span style={s.marca}>el barrio</span>
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

  /* ── stats mini ── */
  statsRow: {
    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 8, marginBottom: 12,
  },
  statMini: {
    borderRadius: 12, padding: '12px 8px',
    textAlign: 'center',
    border: '1px solid rgba(0,0,0,0.04)',
  },
  statMiniNum: {
    fontSize: 22, fontWeight: 800, letterSpacing: '-0.4px',
  },
  statMiniLabel: {
    fontSize: 12, fontWeight: 700, color: C.textoSuave, marginTop: 2,
  },

  /* ── buscar ── */
  buscarWrap: {
    display: 'flex', alignItems: 'center',
    background: C.card,
    border: `1px solid ${C.borde}`,
    borderRadius: 12, padding: '0 12px',
    marginBottom: 14,
    height: 44,
  },
  buscarIcono: { fontSize: 16, marginRight: 8, opacity: 0.7 },
  buscarInput: {
    flex: 1, border: 'none', outline: 'none',
    background: 'transparent',
    fontSize: 14, fontFamily: 'inherit', color: C.texto,
  },
  buscarClear: {
    background: C.fondo, border: 'none',
    width: 24, height: 24, borderRadius: '50%',
    color: C.textoSuave, cursor: 'pointer', padding: 0,
    fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },

  /* ── lista ── */
  lista: { display: 'flex', flexDirection: 'column', gap: 10 },

  /* ── card ── */
  card: {
    background: C.card,
    border: `1px solid ${C.borde}`,
    borderRadius: 16, padding: '14px 15px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
  },
  cardTop: {
    display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12,
  },
  avatar: {
    width: 48, height: 48, borderRadius: '50%',
    objectFit: 'cover', flexShrink: 0,
    border: `1px solid ${C.borde}`,
  },
  avatarFallback: {
    width: 48, height: 48, borderRadius: '50%',
    background: C.verdeBg, color: C.verdeOsc,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 16, fontWeight: 800, flexShrink: 0,
    border: `1px solid ${C.verdeSuave}`,
  },
  cardTexto: { flex: 1, minWidth: 0 },
  cardTitRow: {
    display: 'flex', alignItems: 'center', gap: 6,
    flexWrap: 'wrap',
  },
  cardTit: {
    fontSize: 15.5, fontWeight: 700, color: C.texto,
    letterSpacing: '-0.1px', lineHeight: 1.3,
  },
  yoBadge: {
    fontSize: 10, fontWeight: 800, letterSpacing: 0.4,
    color: '#fff', background: C.verde,
    padding: '2px 7px', borderRadius: 5,
  },
  adminBadge: {
    fontSize: 10, fontWeight: 800, letterSpacing: 0.4,
    color: '#fff', background: C.morado,
    padding: '2px 7px', borderRadius: 5,
  },
  verifBadge: {
    fontSize: 10, fontWeight: 800, letterSpacing: 0.4,
    color: C.verdeOsc, background: C.verdeBg,
    padding: '2px 7px', borderRadius: 5,
    border: `1px solid ${C.verdeSuave}`,
  },
  founderBadge: { fontSize: 13 },
  cardMeta: {
    display: 'flex', flexWrap: 'wrap', gap: 10,
    marginTop: 4,
  },
  metaItem: {
    fontSize: 12.5, color: C.textoTenue, fontWeight: 500,
  },

  /* ── acciones ── */
  accionesRow: {
    display: 'flex', gap: 8, flexWrap: 'wrap',
    borderTop: '1px solid rgba(0,0,0,0.05)',
    paddingTop: 12,
  },
  btnRole: {
    flex: 1, minWidth: 130,
    padding: '9px 12px', borderRadius: 10,
    fontSize: 13, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit',
  },
  btnBan: {
    flexShrink: 0,
    background: C.rojoBg,
    border: `1px solid ${C.rojoSuave}`,
    color: C.rojo,
    padding: '9px 14px', borderRadius: 10,
    fontSize: 13, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit',
  },
  btnRoleDisabled: {
    opacity: 0.5, cursor: 'not-allowed',
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
    background: C.doradoSuave,
    border: `1px solid #fde68a`,
    borderRadius: 12,
    fontSize: 13, color: '#92400e', lineHeight: 1.45,
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
