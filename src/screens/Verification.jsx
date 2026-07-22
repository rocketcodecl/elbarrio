import { useState } from 'react'
import { supabase } from '../lib/supabase'
import Stepper from '../components/Stepper'

const VERDE = '#16a34a'
const VERDE_OSC = '#0f5f36'

/* ===== ICONOS SVG (sin emojis) ===== */
const Ico = ({ size = 18, children, stroke = 1.9 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={stroke}
    strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
)
const IcoCasa = (p) => <Ico {...p}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></Ico>
const IcoPin = (p) => <Ico {...p}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></Ico>
const IcoRadar = (p) => <Ico {...p}><circle cx="12" cy="12" r="2" /><path d="M16.24 7.76a6 6 0 0 1 0 8.49" /><path d="M7.76 16.24a6 6 0 0 1 0-8.49" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /><path d="M4.93 19.07a10 10 0 0 1 0-14.14" /></Ico>
const IcoCheck = (p) => <Ico {...p} stroke={2.6}><polyline points="20 6 9 17 4 12" /></Ico>
const IcoAlerta = (p) => <Ico {...p}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></Ico>
const IcoCandado = (p) => <Ico {...p}><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></Ico>
const IcoAtras = (p) => <Ico {...p}><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></Ico>
const IcoPulgar = (p) => <Ico {...p}><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" /></Ico>

const COMUNAS = [
  'Cerrillos', 'Cerro Navia', 'Conchalí', 'El Bosque', 'Estación Central',
  'Huechuraba', 'Independencia', 'La Cisterna', 'La Florida', 'La Granja',
  'La Pintana', 'La Reina', 'Las Condes', 'Lo Barnechea', 'Lo Espejo',
  'Lo Prado', 'Macul', 'Maipú', 'Ñuñoa', 'Pedro Aguirre Cerda',
  'Peñalolén', 'Providencia', 'Pudahuel', 'Quilicura', 'Quinta Normal',
  'Recoleta', 'Renca', 'San Joaquín', 'San Miguel', 'San Ramón',
  'Santiago', 'Vitacura',
]

const MAX_FUNDADORES = 70

function Verification({ profile, isPending, onFinish, onBack, onLogout }) {
  const [address, setAddress] = useState(profile?.address || '')
  const [comuna, setComuna] = useState(profile?.comuna || '')
  const [showComunaList, setShowComunaList] = useState(false)

  // idle | locating | success | denied | outside | unavailable
  const [gpsState, setGpsState] = useState('idle')
  const [coords, setCoords] = useState(null)
  const [neighborhood, setNeighborhood] = useState(null)

  const [loading, setLoading] = useState(false)
  const [savingLater, setSavingLater] = useState(false)
  const [showSavedModal, setShowSavedModal] = useState(false)
  const [error, setError] = useState('')

  // Atajos para el update (evita repetir coords.lat/coords.lng)
  // DECLARADOS ARRIBA para que los handlers de más abajo los vean siempre.
  const lat = coords?.lat ?? null
  const lng = coords?.lng ?? null

  const comunasFiltradas = COMUNAS.filter((c) =>
    c.toLowerCase().includes(comuna.toLowerCase())
  )

  const resetGps = () => {
    setGpsState('idle')
    setCoords(null)
  }

  /* ================= GPS REAL + POLÍGONO DE LA UV ================= */
  const handleUseGPS = () => {
    if (!address.trim() || !comuna.trim()) {
      setError('Ingresa primero tu dirección y comuna')
      return
    }

    setError('')

    if (!navigator.geolocation) {
      setGpsState('unavailable')
      return
    }

    setGpsState('locating')

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        setCoords({ lat, lng })

        try {
          // Le preguntamos a Postgres (PostGIS): ¿este punto cae dentro
          // del polígono de alguna unidad vecinal activa?
          const { data, error: rpcErr } = await supabase.rpc('barrio_en_punto', {
            p_lat: lat,
            p_lng: lng,
          })

          if (rpcErr) throw rpcErr

          const hood = data?.[0]

          if (hood) {
            setNeighborhood(hood)
            setGpsState('success')
          } else {
            setNeighborhood(null)
            setGpsState('outside')
          }
        } catch (err) {
          setError(err.message)
          setGpsState('unavailable')
        }
      },
      (err) => {
        // 1 = permiso denegado · 2 = posición no disponible · 3 = timeout
        setGpsState(err.code === 1 ? 'denied' : 'unavailable')
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  }

  /* ========== GUARDAR LA CUENTA Y CONFIRMAR DESPUÉS ==========
     Para el que se registra desde la oficina: no pierde nada.
     La cuenta queda en espera y confirma cuando llegue a su casa. */
  const handleLater = async () => {
    if (!address.trim() || !comuna.trim()) {
      setError('Escribe tu dirección y comuna antes de continuar')
      return
    }

    setSavingLater(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No hay sesión iniciada')

      const { error: upErr } = await supabase
        .from('profiles')
        .update({
          address: address.trim(),
          comuna: comuna.trim(),
          verification_status: 'pending',
        })
        .eq('user_id', user.id)

      if (upErr) throw upErr

      setShowSavedModal(true)
    } catch (err) {
      setError(err.message || 'No se pudo guardar')
    } finally {
      setSavingLater(false)
    }
  }

  /* ================= GUARDAR ================= */
  const handleContinue = async () => {
    if (gpsState !== 'success' || !neighborhood || !coords) return

    setLoading(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No hay sesión iniciada')

      // ¿Es de los primeros 70 del barrio? → Vecino Fundador
      const { count } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('neighborhood_id', neighborhood.id)
        .eq('verified', true)

      const yaVerificados = count || 0
      const esFundador = yaVerificados < MAX_FUNDADORES

      const update = {
        address: address.trim(),
        comuna: comuna.trim(),
        lat,
        lng,
        neighborhood_id: neighborhood.id,
        verified: true,
        verification_status: 'verified',
        verification_method: 'gps_polygon',
        verified_at: new Date().toISOString(),
      }

      if (esFundador) {
        update.badge_founder = true
        update.founder_number = yaVerificados + 1
      }

      const { error: upErr } = await supabase
        .from('profiles')
        .update(update)
        .eq('user_id', user.id)

      if (upErr) throw upErr

      onFinish()
    } catch (err) {
      setError(err.message || 'No se pudo guardar. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const puedeContinuar = gpsState === 'success' && !loading

  return (
    <div style={s.container}>
      {/* HEADER */}
      <div style={s.header}>
        <button style={s.backBtn} onClick={onBack}>
          <IcoAtras />
        </button>
        <div style={{ flex: 1, marginLeft: 12 }}>
          <Stepper currentStep={3} totalSteps={4} />
        </div>
      </div>

      {/* TÍTULO */}
      <div style={s.titleSection}>
        <h1 style={s.title}>
          {isPending ? 'Tu cuenta está en espera' : '¿Dónde vives?'}
        </h1>
        <p style={s.subtitle}>
          {isPending
            ? 'Tus datos están guardados. Para entrar al barrio, confirma tu ubicación desde tu casa. Es un solo toque.'
            : 'Confirmamos con tu GPS que vives dentro del barrio. Es lo que hace que tus vecinos puedan confiar en ti.'}
        </p>
      </div>

      <div style={s.form}>
        {/* DIRECCIÓN */}
        <div style={s.group}>
          <label style={s.label}>Dirección</label>
          <div style={s.inputWrap}>
            <span style={s.inputIcon}><IcoCasa size={17} /></span>
            <input
              type="text"
              placeholder="Ej: Av. Italia 1234, Depto 5B"
              value={address}
              onChange={(e) => { setAddress(e.target.value); resetGps() }}
              style={s.input}
            />
          </div>
        </div>

        {/* COMUNA */}
        <div style={s.group}>
          <label style={s.label}>Comuna</label>
          <div style={s.inputWrap}>
            <span style={s.inputIcon}><IcoPin size={17} /></span>
            <input
              type="text"
              placeholder="Ej: Providencia"
              value={comuna}
              onChange={(e) => {
                setComuna(e.target.value)
                setShowComunaList(true)
                resetGps()
              }}
              onFocus={() => setShowComunaList(true)}
              style={s.input}
            />
          </div>

          {showComunaList && comuna.length > 0 && comunasFiltradas.length > 0 && (
            <div style={s.comunaList}>
              {comunasFiltradas.slice(0, 5).map((c) => (
                <button
                  key={c}
                  onClick={() => { setComuna(c); setShowComunaList(false) }}
                  style={s.comunaItem}
                >
                  <span style={{ color: VERDE, display: 'flex' }}><IcoPin size={14} /></span>
                  <span>{c}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ===== GPS ===== */}
        <div style={{ marginTop: 8 }}>
          {gpsState === 'idle' && (
            <button onClick={handleUseGPS} style={s.gpsBtn}>
              <IcoRadar size={19} />
              <span>Confirmar mi ubicación</span>
            </button>
          )}

          {gpsState === 'locating' && (
            <div style={s.boxInfo}>
              <div style={s.spinner} />
              <div>
                <div style={s.boxTitleInfo}>Leyendo tu ubicación...</div>
                <div style={s.boxTextInfo}>
                  Acepta el permiso de ubicación si el teléfono te lo pide
                </div>
              </div>
            </div>
          )}

          {gpsState === 'success' && (
            <div style={s.boxOk}>
              <div style={s.boxIconOk}><IcoCheck size={19} /></div>
              <div style={{ flex: 1 }}>
                <div style={s.boxTitleOk}>Ubicación confirmada</div>
                <div style={s.boxTextOk}>
                  Vives dentro de la Unidad Vecinal {neighborhood?.uv_code}
                </div>
              </div>
            </div>
          )}

          {gpsState === 'outside' && (
            <div style={s.boxErr}>
              <div style={s.boxIconErr}><IcoAlerta size={19} /></div>
              <div style={{ flex: 1 }}>
                <div style={s.boxTitleErr}>Todavía no llegamos a tu barrio</div>
                <div style={s.boxTextErr}>
                  Tu ubicación está fuera de las unidades vecinales que ya tienen
                  El Barrio activo. Si crees que es un error, verifícate desde tu casa.
                </div>
                <button onClick={handleUseGPS} style={s.retryBtn}>Reintentar</button>
              </div>
            </div>
          )}

          {gpsState === 'denied' && (
            <div style={s.boxErr}>
              <div style={s.boxIconErr}><IcoAlerta size={19} /></div>
              <div style={{ flex: 1 }}>
                <div style={s.boxTitleErr}>Nos falta el permiso de ubicación</div>
                <div style={s.boxTextErr}>
                  Sin GPS no podemos confirmar que vives en el barrio.
                  Actívalo en los ajustes de tu navegador o teléfono.
                </div>
                <button onClick={handleUseGPS} style={s.retryBtn}>Reintentar</button>
              </div>
            </div>
          )}

          {gpsState === 'unavailable' && (
            <div style={s.boxErr}>
              <div style={s.boxIconErr}><IcoAlerta size={19} /></div>
              <div style={{ flex: 1 }}>
                <div style={s.boxTitleErr}>No pudimos leer tu ubicación</div>
                <div style={s.boxTextErr}>
                  Puede ser señal débil. Intenta de nuevo cerca de una ventana.
                </div>
                <button onClick={handleUseGPS} style={s.retryBtn}>Reintentar</button>
              </div>
            </div>
          )}
        </div>

        {/* BARRIO */}
        {gpsState === 'success' && neighborhood && (
          <div style={s.hoodCard}>
            <div style={s.hoodIcon}><IcoPin size={20} /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={s.hoodLabel}>
                Tu barrio · Unidad Vecinal {neighborhood.uv_code}
              </div>
              <div style={s.hoodNameRow}>
                <span style={s.hoodName}>{neighborhood.name}</span>
                {neighborhood.is_beta && <span style={s.betaPill}>Beta</span>}
              </div>
            </div>
            <div style={s.hoodMembers}>
              <span style={s.dot} />
              {neighborhood.total_members || 0} vecinos
            </div>
          </div>
        )}

        <div style={s.privacy}>
          <span style={{ color: '#9ca3af', display: 'flex', flexShrink: 0 }}>
            <IcoCandado size={14} />
          </span>
          <span>
            Tu dirección exacta nunca se muestra a otros vecinos.
            Solo verán una distancia aproximada.
          </span>
        </div>

        {error && (
          <div style={s.errorBox}>
            <IcoAlerta size={15} />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* MODAL: cuenta guardada */}
      {showSavedModal && (
        <div style={s.modalOverlay}>
          <div style={s.modalCard}>
            <div style={s.modalIcon}><IcoPulgar size={26} /></div>
            <div style={s.modalTitle}>Tu cuenta quedó guardada</div>
            <div style={s.modalText}>
              Ya tenemos tus datos. Vuelve a abrir El Barrio cuando estés en tu
              casa y confirma tu ubicación con un toque. Nada se pierde.
            </div>
            <button style={s.modalBtn} onClick={() => onLogout?.()}>
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <div style={s.footer}>
        <button
          onClick={handleContinue}
          disabled={!puedeContinuar}
          style={{
            ...s.primaryBtn,
            opacity: puedeContinuar ? 1 : 0.4,
            cursor: puedeContinuar ? 'cursor' : 'not-allowed',
          }}
        >
          {loading ? 'Guardando...' : 'Continuar'}
        </button>

        {!isPending && gpsState !== 'success' && (
          <button
            onClick={handleLater}
            disabled={savingLater}
            style={s.laterBtn}
          >
            {savingLater ? 'Guardando...' : 'No estoy en mi casa, lo confirmo después'}
          </button>
        )}

        {isPending && (
          <button onClick={onLogout} style={s.laterBtn}>
            Cerrar sesión
          </button>
        )}
      </div>
    </div>
  )
}

const s = {
  container: {
    minHeight: '100%',
    background: '#f4f7f4',
    padding: '0 24px 40px',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: '"Plus Jakarta Sans", system-ui, -apple-system, sans-serif',
  },
  header: { display: 'flex', alignItems: 'center', paddingTop: 50, paddingBottom: 20 },
  backBtn: {
    width: 40, height: 40, borderRadius: '50%',
    background: '#fff', color: '#374151',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    border: 'none', cursor: 'pointer', flexShrink: 0,
  },

  titleSection: { textAlign: 'center', marginBottom: 24 },
  title: {
    fontSize: 22, fontWeight: 800, color: '#111827',
    marginBottom: 8, letterSpacing: '-0.4px',
  },
  subtitle: { fontSize: 13, color: '#6b7280', lineHeight: 1.5, padding: '0 8px' },

  form: { display: 'flex', flexDirection: 'column', gap: 14, flex: 1 },
  group: { display: 'flex', flexDirection: 'column', gap: 6, position: 'relative' },
  label: { fontSize: 12, fontWeight: 700, color: '#374151', marginLeft: 2 },

  inputWrap: {
    display: 'flex', alignItems: 'center',
    background: '#fff', border: '1.5px solid #e5e7eb',
    borderRadius: 12, padding: '0 14px',
  },
  inputIcon: { color: '#9ca3af', marginRight: 10, display: 'flex', flexShrink: 0 },
  input: {
    flex: 1, padding: '14px 0', fontSize: 15,
    background: 'transparent', color: '#111827',
    border: 'none', outline: 'none', width: '100%', minWidth: 0,
    fontFamily: 'inherit',
  },

  comunaList: {
    position: 'absolute', top: '100%', left: 0, right: 0,
    background: '#fff', borderRadius: 12, marginTop: 4,
    boxShadow: '0 6px 24px rgba(0,0,0,0.10)',
    border: '1px solid #e5e7eb', overflow: 'hidden', zIndex: 10,
  },
  comunaItem: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '12px 14px', fontSize: 14, color: '#111827',
    background: 'transparent', width: '100%', textAlign: 'left',
    borderBottom: '1px solid #f3f4f6',
    border: 'none', cursor: 'pointer', fontFamily: 'inherit',
  },

  gpsBtn: {
    width: '100%', padding: '15px 16px',
    background: '#fff', border: `2px dashed ${VERDE}`,
    borderRadius: 12, fontSize: 14, fontWeight: 700, color: VERDE,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
    cursor: 'pointer', fontFamily: 'inherit',
  },

  boxInfo: {
    padding: '14px 16px', background: '#eff6ff', borderRadius: 12,
    display: 'flex', alignItems: 'center', gap: 12,
    border: '1.5px solid #dbeafe',
  },
  spinner: {
    width: 22, height: 22, flexShrink: 0,
    border: '3px solid #dbeafe', borderTop: '3px solid #2563eb',
    borderRadius: '50%', animation: 'spin 1s linear infinite',
  },
  boxTitleInfo: { fontSize: 13, fontWeight: 700, color: '#1e40af' },
  boxTextInfo: { fontSize: 11.5, color: '#3b82f6', marginTop: 2, lineHeight: 1.4 },

  boxOk: {
    padding: '14px 16px', background: '#f0fdf4', borderRadius: 12,
    display: 'flex', alignItems: 'center', gap: 12,
    border: `1.5px solid #86efac`,
  },
  boxIconOk: {
    width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
    background: '#dcfce7', color: VERDE,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  boxTitleOk: { fontSize: 13, fontWeight: 700, color: VERDE_OSC },
  boxTextOk: { fontSize: 11.5, color: '#059669', marginTop: 2, lineHeight: 1.4 },

  boxErr: {
    padding: '14px 16px', background: '#fef2f2', borderRadius: 12,
    display: 'flex', alignItems: 'flex-start', gap: 12,
    border: '1.5px solid #fecaca',
  },
  boxIconErr: {
    width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
    background: '#fee2e2', color: '#dc2626',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  boxTitleErr: { fontSize: 13, fontWeight: 700, color: '#991b1b' },
  boxTextErr: { fontSize: 11.5, color: '#dc2626', marginTop: 3, marginBottom: 8, lineHeight: 1.45 },
  retryBtn: {
    fontSize: 12, fontWeight: 700, color: '#991b1b',
    background: '#fff', padding: '7px 14px', borderRadius: 999,
    border: '1px solid #fecaca', cursor: 'pointer', fontFamily: 'inherit',
  },

  hoodCard: {
    padding: 16, background: '#fff', borderRadius: 16,
    border: '1px solid #eef0ee', boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    display: 'flex', alignItems: 'center', gap: 12,
  },
  hoodIcon: {
    width: 40, height: 40, borderRadius: 12, flexShrink: 0,
    background: VERDE, color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  hoodLabel: { fontSize: 11, color: '#6b7280', fontWeight: 500 },
  hoodNameRow: { display: 'flex', alignItems: 'center', gap: 7, marginTop: 3 },
  hoodName: { fontSize: 16, fontWeight: 800, color: '#111827' },
  betaPill: {
    fontSize: 9.5, fontWeight: 800, letterSpacing: 0.4,
    color: '#fff', background: VERDE,
    padding: '3px 7px', borderRadius: 6,
    textTransform: 'uppercase', flexShrink: 0,
  },
  hoodMembers: {
    display: 'flex', alignItems: 'center', gap: 5,
    background: '#f0fdf4', padding: '6px 10px', borderRadius: 999,
    fontSize: 11, fontWeight: 700, color: VERDE, flexShrink: 0,
  },
  dot: { width: 6, height: 6, background: '#22c55e', borderRadius: '50%' },

  privacy: {
    display: 'flex', alignItems: 'flex-start', gap: 7,
    fontSize: 11.5, color: '#6b7280', lineHeight: 1.5,
    padding: '4px 4px',
  },

  errorBox: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '12px 14px', background: '#fee2e2', color: '#991b1b',
    borderRadius: 12, fontSize: 13, fontWeight: 600,
  },

  modalOverlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(17,24,39,0.55)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 28, zIndex: 999,
  },
  modalCard: {
    width: '100%', maxWidth: 320,
    background: '#fff', borderRadius: 22,
    padding: '28px 24px 22px',
    textAlign: 'center',
    boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
  },
  modalIcon: {
    width: 56, height: 56, borderRadius: 16,
    background: '#dcfce7', color: VERDE,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    margin: '0 auto 16px',
  },
  modalTitle: {
    fontSize: 17, fontWeight: 800, color: '#111827', marginBottom: 8,
  },
  modalText: {
    fontSize: 13, color: '#6b7280', lineHeight: 1.55, marginBottom: 22,
  },
  modalBtn: {
    width: '100%', padding: 14,
    background: VERDE, color: '#fff',
    borderRadius: 999, fontSize: 14.5, fontWeight: 700,
    border: 'none', cursor: 'pointer', fontFamily: 'inherit',
  },

  footer: { paddingTop: 24 },
  laterBtn: {
    width: '100%',
    marginTop: 12,
    padding: '12px',
    background: 'transparent',
    color: '#6b7280',
    border: 'none',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    textDecoration: 'underline',
  },
  primaryBtn: {
    width: '100%', padding: 16,
    background: VERDE, color: '#fff',
    borderRadius: 999, fontSize: 15, fontWeight: 700,
    border: 'none', fontFamily: 'inherit',
    boxShadow: `0 6px 20px rgba(22,163,74,0.3)`,
  },
}

export default Verification
