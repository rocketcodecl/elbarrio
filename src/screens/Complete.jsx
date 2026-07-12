import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Stepper from '../components/Stepper'

function Complete({ onFinish }) {
  const [profile, setProfile] = useState(null)
  const [neighborhood, setNeighborhood] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUserData()
  }, [])

  const loadUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Cargar perfil actualizado (con founder_number ya asignado)
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      setProfile(profileData)

      // Cargar barrio
      if (profileData?.neighborhood_id) {
        const { data: hoodData } = await supabase
          .from('neighborhoods')
          .select('*')
          .eq('id', profileData.neighborhood_id)
          .single()
        setNeighborhood(hoodData)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />
      </div>
    )
  }

  const isFounder = profile?.badge_founder && profile?.founder_number
  const initials = profile?.full_name
    ?.split(' ')
    .filter(n => n.length > 0)
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase() || '?'

  return (
    <div style={styles.container}>
      {/* HEADER con Stepper todo verde */}
      <div style={styles.header}>
        <button style={styles.backButton}>
          <span style={{ fontSize: 18 }}>←</span>
        </button>
        <div style={{ flex: 1, marginLeft: 12 }}>
          <Stepper currentStep={4} totalSteps={4} />
        </div>
      </div>

      {/* CONFETI/CELEBRACIÓN */}
      <div style={styles.celebration} className="fade-in">
        {/* Icono de éxito animado */}
        <div style={styles.successIcon}>
          <div style={styles.successCircle}>
            <div style={styles.checkmark}>✓</div>
          </div>
          <div style={styles.successRing} />
        </div>

        <h1 style={styles.title}>¡Verificación completa!</h1>
        <p style={styles.subtitle}>
          Tu identidad ha sido confirmada correctamente
        </p>
      </div>

      {/* CARD DE RESUMEN */}
      <div style={styles.summaryCard}>
        {/* Barrio */}
        <div style={styles.hoodSection}>
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="Avatar" style={styles.hoodAvatar} />
          ) : (
            <div style={styles.hoodAvatarPlaceholder}>
              {initials}
            </div>
          )}
          <div style={{ flex: 1 }}>
            <div style={styles.hoodPill}>
              <span style={{ fontSize: 12 }}>📍</span>
              <span>{neighborhood?.name || 'Mi barrio'}</span>
            </div>
            <div style={styles.hoodMembers}>
              <span style={styles.greenDot} />
              {neighborhood?.total_members || 0} vecinos activos
            </div>
          </div>
        </div>

        <div style={styles.divider} />

        {/* Datos */}
        <div style={styles.dataList}>
          <div style={styles.dataRow}>
            <span style={styles.dataLabel}>Nombre</span>
            <span style={styles.dataValue}>{profile?.full_name || '—'}</span>
          </div>
          <div style={styles.dataRow}>
            <span style={styles.dataLabel}>RUT</span>
            <span style={styles.dataValue}>{profile?.rut || '—'}</span>
          </div>
          <div style={styles.dataRow}>
            <span style={styles.dataLabel}>Comuna</span>
            <span style={styles.dataValue}>{profile?.comuna || '—'}</span>
          </div>
          <div style={styles.dataRow}>
            <span style={styles.dataLabel}>Verificación</span>
            <span style={styles.dataVerified}>
              ✓ Identidad confirmada
            </span>
          </div>
        </div>
      </div>

      {/* BADGE FUNDADOR (solo si aplica) */}
      {isFounder && (
        <div style={styles.founderBadge} className="fade-in">
          <div style={styles.founderIcon}>🏅</div>
          <div style={{ flex: 1 }}>
            <div style={styles.founderTitle}>
              ¡Eres Fundador #{profile.founder_number}!
            </div>
            <div style={styles.founderText}>
              Serás reconocido como uno de los 70 primeros vecinos que confiaron en El Barrio.
            </div>
          </div>
        </div>
      )}

      {/* BOTÓN ENTRAR */}
      <div style={styles.footer}>
        <button style={styles.primaryButton} onClick={onFinish}>
          Entrar a mi barrio
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
  loadingContainer: {
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    width: 40,
    height: 40,
    border: '3px solid #13886425',
    borderTop: '3px solid #138864',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 24,
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
    opacity: 0.5,
    cursor: 'default',
  },
  celebration: {
    textAlign: 'center',
    marginBottom: 24,
  },
  successIcon: {
    position: 'relative',
    width: 90,
    height: 90,
    margin: '0 auto 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successCircle: {
    width: 90,
    height: 90,
    background: '#DCFCE7',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    zIndex: 2,
  },
  checkmark: {
    fontSize: 40,
    color: '#138864',
    fontWeight: 900,
  },
  successRing: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    background: '#138864',
    opacity: 0.2,
    animation: 'pulse 2s infinite',
  },
  title: {
    fontSize: 24,
    fontWeight: 800,
    color: '#1A1A1A',
    marginBottom: 6,
    letterSpacing: '-0.5px',
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 1.4,
  },
  summaryCard: {
    background: 'white',
    borderRadius: 20,
    padding: 20,
    boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
    border: '1px solid #E5E7EB',
    marginBottom: 16,
  },
  hoodSection: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
  },
  hoodAvatar: {
    width: 56,
    height: 56,
    borderRadius: 14,
    objectFit: 'cover',
    background: '#F3F4F6',
  },
  hoodAvatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 14,
    background: '#138864',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 20,
    fontWeight: 800,
  },
  hoodPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: '#F0FDF4',
    color: '#138864',
    padding: '5px 12px',
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 700,
    marginBottom: 6,
  },
  hoodMembers: {
    fontSize: 11,
    color: '#6B7280',
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    marginLeft: 4,
  },
  greenDot: {
    width: 6,
    height: 6,
    background: '#22c55e',
    borderRadius: '50%',
  },
  divider: {
    height: 1,
    background: '#F3F4F6',
    margin: '18px 0',
  },
  dataList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  dataRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dataLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: 500,
  },
  dataValue: {
    fontSize: 13,
    color: '#1A1A1A',
    fontWeight: 700,
  },
  dataVerified: {
    fontSize: 13,
    color: '#138864',
    fontWeight: 700,
  },
  founderBadge: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    background: 'linear-gradient(135deg, #FEF9C3 0%, #FEF3C7 100%)',
    borderRadius: 16,
    border: '1.5px solid #FDE68A',
    marginBottom: 16,
  },
  founderIcon: {
    fontSize: 28,
    lineHeight: 1,
    flexShrink: 0,
  },
  founderTitle: {
    fontSize: 13,
    fontWeight: 800,
    color: '#78350F',
    marginBottom: 4,
  },
  founderText: {
    fontSize: 11,
    color: '#92400E',
    lineHeight: 1.5,
    fontWeight: 500,
  },
  footer: {
    marginTop: 'auto',
    paddingTop: 20,
  },
  primaryButton: {
    width: '100%',
    padding: 16,
    background: '#138864',
    color: 'white',
    borderRadius: 999,
    fontSize: 15,
    fontWeight: 700,
    boxShadow: '0 6px 20px rgba(19, 136, 100, 0.35)',
  },
}

export default Complete