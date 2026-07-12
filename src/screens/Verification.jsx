import { useState } from 'react'
import { supabase } from '../lib/supabase'
import Stepper from '../components/Stepper'

// Lista de comunas de Santiago (puedes ampliar después)
const COMUNAS = [
  'Cerrillos', 'Cerro Navia', 'Conchalí', 'El Bosque', 'Estación Central',
  'Huechuraba', 'Independencia', 'La Cisterna', 'La Florida', 'La Granja',
  'La Pintana', 'La Reina', 'Las Condes', 'Lo Barnechea', 'Lo Espejo',
  'Lo Prado', 'Macul', 'Maipú', 'Ñuñoa', 'Pedro Aguirre Cerda',
  'Peñalolén', 'Providencia', 'Pudahuel', 'Quilicura', 'Quinta Normal',
  'Recoleta', 'Renca', 'San Joaquín', 'San Miguel', 'San Ramón',
  'Santiago', 'Vitacura'
]

function Verification({ onFinish, onBack }) {
  const [address, setAddress] = useState('')
  const [comuna, setComuna] = useState('')
  const [showComunaList, setShowComunaList] = useState(false)
  const [gpsState, setGpsState] = useState('idle') // idle | locating | success | mismatch
  const [gpsLocation, setGpsLocation] = useState(null)
  const [neighborhood, setNeighborhood] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Filtrar comunas según lo que escribe el usuario
  const filteredComunas = COMUNAS.filter(c =>
    c.toLowerCase().includes(comuna.toLowerCase())
  )

  const handleUseGPS = () => {
    if (!address.trim() || !comuna.trim()) {
      setError('Ingresa primero tu dirección y comuna')
      return
    }

    setError('')
    setGpsState('locating')

    // Simulamos el GPS (después se conecta a Google Maps real)
    setTimeout(async () => {
      try {
        // Simulamos coordenadas GPS
        setGpsLocation({
          lat: -33.4372 + (Math.random() - 0.5) * 0.01,
          lng: -70.6222 + (Math.random() - 0.5) * 0.01,
        })

        // Buscar el barrio en la BD
        const { data } = await supabase
          .from('neighborhoods')
          .select('*')
          .eq('name', 'Barrio Italia')
          .single()

        setNeighborhood(data)
        setGpsState('success')
      } catch (err) {
        setGpsState('mismatch')
      }
    }, 2500)
  }

  const handleContinue = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No hay usuario')

      // Actualizar profile con dirección + barrio
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          address: address,
          comuna: comuna,
          neighborhood_id: neighborhood.id,
          verified: true,
          verification_method: 'gps',
        })
        .eq('user_id', user.id)

      if (updateError) throw updateError

      // Actualizar contador del barrio
      await supabase
        .from('neighborhoods')
        .update({ total_members: neighborhood.total_members + 1 })
        .eq('id', neighborhood.id)

      onFinish()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      {/* HEADER */}
      <div style={styles.header}>
        <button style={styles.backButton} onClick={onBack}>
          <span style={{ fontSize: 18 }}>←</span>
        </button>
        <div style={{ flex: 1, marginLeft: 12 }}>
          <Stepper currentStep={3} totalSteps={4} />
        </div>
      </div>

      {/* TÍTULO */}
      <div style={styles.titleSection}>
        <h1 style={styles.title}>¿Dónde vives?</h1>
        <p style={styles.subtitle}>
          Verificamos tu ubicación para conectarte con tu barrio
        </p>
      </div>

      {/* FORMULARIO */}
      <div style={styles.form}>
        <div style={styles.inputGroup}>
          <label style={styles.label}>Dirección</label>
          <div style={styles.inputWrapper}>
            <span style={styles.inputIcon}>🏠</span>
            <input
              type="text"
              placeholder="Ej: Av. Italia 1234, Depto 5B"
              value={address}
              onChange={(e) => {
                setAddress(e.target.value)
                setGpsState('idle')
              }}
              style={styles.input}
            />
          </div>
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.label}>Comuna</label>
          <div style={styles.inputWrapper}>
            <span style={styles.inputIcon}>📍</span>
            <input
              type="text"
              placeholder="Ej: Ñuñoa"
              value={comuna}
              onChange={(e) => {
                setComuna(e.target.value)
                setShowComunaList(true)
                setGpsState('idle')
              }}
              onFocus={() => setShowComunaList(true)}
              style={styles.input}
            />
          </div>
          {showComunaList && comuna.length > 0 && filteredComunas.length > 0 && (
            <div style={styles.comunaList}>
              {filteredComunas.slice(0, 5).map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    setComuna(c)
                    setShowComunaList(false)
                  }}
                  style={styles.comunaItem}
                >
                  <span style={{ fontSize: 14 }}>📍</span>
                  <span>{c}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* GPS SECTION */}
        <div style={styles.gpsSection}>
          {gpsState === 'idle' && (
            <button 
              onClick={handleUseGPS}
              style={styles.gpsButton}
            >
              <span style={{ fontSize: 18 }}>📡</span>
              <span>Confirmar con GPS</span>
            </button>
          )}

          {gpsState === 'locating' && (
            <div style={styles.gpsLocating}>
              <div style={styles.miniSpinner} />
              <div>
                <div style={styles.gpsLocatingTitle}>Verificando ubicación...</div>
                <div style={styles.gpsLocatingText}>Comparando con tu dirección</div>
              </div>
            </div>
          )}

          {gpsState === 'success' && (
            <div style={styles.gpsSuccess}>
              <div style={styles.gpsSuccessIcon}>
                <span style={{ fontSize: 20 }}>✅</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={styles.gpsSuccessTitle}>Ubicación verificada</div>
                <div style={styles.gpsSuccessText}>
                  Tu dirección coincide con tu ubicación GPS
                </div>
              </div>
            </div>
          )}

          {gpsState === 'mismatch' && (
            <div style={styles.gpsError}>
              <div style={styles.gpsErrorIcon}>
                <span style={{ fontSize: 20 }}>⚠️</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={styles.gpsErrorTitle}>No pudimos verificar</div>
                <div style={styles.gpsErrorText}>
                  Verifica tu dirección o inténtalo de nuevo
                </div>
                <button 
                  onClick={handleUseGPS}
                  style={styles.retryButton}
                >
                  Reintentar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* BARRIO ENCONTRADO */}
        {gpsState === 'success' && neighborhood && (
          <div style={styles.neighborhoodCard}>
            <div style={styles.neighborhoodTop}>
              <div style={styles.logoIcon}>ñ</div>
              <div style={{ flex: 1 }}>
                <div style={styles.neighborhoodLabel}>Tu barrio</div>
                <div style={styles.neighborhoodName}>{neighborhood.name}</div>
              </div>
              <div style={styles.neighborhoodMembers}>
                <span style={styles.greenDot} />
                {neighborhood.total_members} vecinos
              </div>
            </div>
          </div>
        )}

        <div style={styles.privacyNote}>
          🔒 Tu dirección exacta nunca se muestra a otros vecinos. Solo el barrio.
        </div>

        {error && (
          <div style={styles.errorBox}>
            ⚠️ {error}
          </div>
        )}
      </div>

      {/* BOTÓN CONTINUAR */}
      <div style={styles.footer}>
        <button
          onClick={handleContinue}
          disabled={loading || gpsState !== 'success'}
          style={{
            ...styles.primaryButton,
            opacity: (loading || gpsState !== 'success') ? 0.4 : 1,
            cursor: (loading || gpsState !== 'success') ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Guardando...' : 'Continuar'}
        </button>
      </div>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100%',
    background: '#FAFAF7',
    padding: '0 24px 40px',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    background: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    flexShrink: 0,
  },
  titleSection: {
    textAlign: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: 800,
    color: '#1A1A1A',
    marginBottom: 6,
    letterSpacing: '-0.5px',
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 1.4,
    padding: '0 20px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    flex: 1,
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    position: 'relative',
  },
  label: {
    fontSize: 12,
    fontWeight: 600,
    color: '#374151',
    marginLeft: 4,
  },
  inputWrapper: {
    display: 'flex',
    alignItems: 'center',
    background: 'white',
    border: '1.5px solid #E5E7EB',
    borderRadius: 12,
    padding: '0 14px',
  },
  inputIcon: {
    fontSize: 16,
    marginRight: 8,
    opacity: 0.6,
  },
  input: {
    flex: 1,
    padding: '14px 0',
    fontSize: 15,
    background: 'transparent',
    color: '#1A1A1A',
    border: 'none',
    outline: 'none',
    width: '100%',
    minWidth: 0,
  },
  comunaList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    background: 'white',
    borderRadius: 12,
    marginTop: 4,
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
    border: '1px solid #E5E7EB',
    overflow: 'hidden',
    zIndex: 10,
  },
  comunaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 14px',
    fontSize: 14,
    color: '#1A1A1A',
    background: 'transparent',
    width: '100%',
    textAlign: 'left',
    borderBottom: '1px solid #F3F4F6',
  },
  gpsSection: {
    marginTop: 8,
  },
  gpsButton: {
    width: '100%',
    padding: '14px 16px',
    background: 'white',
    border: '2px dashed #138864',
    borderRadius: 12,
    fontSize: 14,
    fontWeight: 700,
    color: '#138864',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  gpsLocating: {
    padding: '14px 16px',
    background: '#EFF6FF',
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    border: '1.5px solid #DBEAFE',
  },
  miniSpinner: {
    width: 24,
    height: 24,
    border: '3px solid #DBEAFE',
    borderTop: '3px solid #457B9D',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  gpsLocatingTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: '#1E40AF',
  },
  gpsLocatingText: {
    fontSize: 11,
    color: '#3B82F6',
    marginTop: 2,
  },
  gpsSuccess: {
    padding: '14px 16px',
    background: '#F0FDF4',
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    border: '1.5px solid #86EFAC',
  },
  gpsSuccessIcon: {
    width: 36,
    height: 36,
    background: '#DCFCE7',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  gpsSuccessTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: '#138864',
  },
  gpsSuccessText: {
    fontSize: 11,
    color: '#059669',
    marginTop: 2,
  },
  gpsError: {
    padding: '14px 16px',
    background: '#FEF2F2',
    borderRadius: 12,
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    border: '1.5px solid #FECACA',
  },
  gpsErrorIcon: {
    width: 36,
    height: 36,
    background: '#FEE2E2',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  gpsErrorTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: '#991B1B',
  },
  gpsErrorText: {
    fontSize: 11,
    color: '#DC2626',
    marginTop: 2,
    marginBottom: 8,
  },
  retryButton: {
    fontSize: 12,
    fontWeight: 700,
    color: '#991B1B',
    background: 'white',
    padding: '6px 12px',
    borderRadius: 999,
    border: '1px solid #FECACA',
  },
  neighborhoodCard: {
    padding: 16,
    background: 'white',
    borderRadius: 16,
    border: '1.5px solid #E5E7EB',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  neighborhoodTop: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  logoIcon: {
    width: 40,
    height: 40,
    background: '#138864',
    borderRadius: 12,
    color: 'white',
    fontWeight: 900,
    fontSize: 20,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  neighborhoodLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: 500,
  },
  neighborhoodName: {
    fontSize: 16,
    fontWeight: 800,
    color: '#1A1A1A',
    marginTop: 2,
  },
  neighborhoodMembers: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    background: '#F0FDF4',
    padding: '6px 10px',
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 700,
    color: '#138864',
  },
  greenDot: {
    width: 6,
    height: 6,
    background: '#22c55e',
    borderRadius: '50%',
  },
  privacyNote: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 1.5,
    padding: '4px 20px',
  },
  errorBox: {
    padding: 12,
    background: '#FEE2E2',
    color: '#991B1B',
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 500,
    textAlign: 'center',
  },
  footer: {
    paddingTop: 24,
  },
  primaryButton: {
    width: '100%',
    padding: 16,
    background: '#138864',
    color: 'white',
    borderRadius: 999,
    fontSize: 15,
    fontWeight: 700,
    boxShadow: '0 6px 16px rgba(19, 136, 100, 0.3)',
    transition: 'all 0.2s',
  },
}

export default Verification