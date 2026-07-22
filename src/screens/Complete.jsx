import { useState, useEffect } from 'react'
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
const IcoCheck = (p) => <Ico {...p} stroke={2.8}><polyline points="20 6 9 17 4 12" /></Ico>
const IcoPin = (p) => <Ico {...p}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></Ico>
const IcoMedalla = (p) => <Ico {...p}><circle cx="12" cy="8" r="7" /><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" /></Ico>

function Complete({ onFinish }) {
  const [profile, setProfile] = useState(null)
  const [neighborhood, setNeighborhood] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadUserData() }, [])

  const loadUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: p } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      setProfile(p)

      if (p?.neighborhood_id) {
        const { data: hood } = await supabase
          .from('neighborhoods')
          .select('*')
          .eq('id', p.neighborhood_id)
          .single()
        setNeighborhood(hood)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={s.loadingWrap}>
        <div style={s.spinner} />
      </div>
    )
  }

  const esFundador = profile?.badge_founder && profile?.founder_number

  const iniciales =
    profile?.full_name
      ?.split(' ')
      .filter((n) => n.length > 0)
      .slice(0, 2)
      .map((n) => n[0])
      .join('')
      .toUpperCase() || '?'

  return (
    <div style={s.container}>
      {/* HEADER */}
      <div style={s.header}>
        <div style={{ width: 40 }} />
        <div style={{ flex: 1, marginLeft: 12 }}>
          <Stepper currentStep={4} totalSteps={4} />
        </div>
      </div>

      {/* CELEBRACIÓN */}
      <div style={s.celebration}>
        <div style={s.successWrap}>
          <div style={s.successRing} />
          <div style={s.successCircle}>
            <IcoCheck size={40} />
          </div>
        </div>

        <h1 style={s.title}>Bienvenido a tu barrio</h1>
        <p style={s.subtitle}>
          Ya eres un vecino verificado de {neighborhood?.name || 'tu barrio'}
        </p>
      </div>

      {/* RESUMEN */}
      <div style={s.card}>
        <div style={s.hoodSection}>
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" style={s.avatar} />
          ) : (
            <div style={s.avatarFallback}>{iniciales}</div>
          )}

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={s.hoodPill}>
              <IcoPin size={13} />
              <span>{neighborhood?.name || 'Mi barrio'}</span>
            </div>
            <div style={s.hoodMembers}>
              <span style={s.dot} />
              {neighborhood?.total_members || 0} vecinos activos
            </div>
          </div>
        </div>

        <div style={s.divider} />

        <div style={s.dataList}>
          <Row label="Nombre" value={profile?.full_name || '—'} />
          <Row label="RUT" value={profile?.rut || '—'} />
          <Row label="Comuna" value={profile?.comuna || '—'} />
          <div style={s.dataRow}>
            <span style={s.dataLabel}>Ubicación</span>
            <span style={s.dataVerified}>
              <IcoCheck size={13} />
              <span>Confirmada por GPS</span>
            </span>
          </div>
        </div>
      </div>

      {/* BADGE FUNDADOR */}
      {esFundador && (
        <div style={s.founderCard}>
          <div style={s.founderIcon}>
            <IcoMedalla size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={s.founderTitle}>
              Eres Vecino Fundador #{profile.founder_number}
            </div>
            <div style={s.founderText}>
              Uno de los 70 primeros que confiaron en El Barrio.
              Este badge es tuyo para siempre.
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <div style={s.footer}>
        <button style={s.primaryBtn} onClick={onFinish}>
          Entrar a mi barrio
        </button>
      </div>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div style={s.dataRow}>
      <span style={s.dataLabel}>{label}</span>
      <span style={s.dataValue}>{value}</span>
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
  loadingWrap: {
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    width: 40, height: 40,
    border: '3px solid rgba(22,163,74,0.15)',
    borderTop: `3px solid ${VERDE}`,
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },

  header: {
    display: 'flex', alignItems: 'center',
    paddingTop: 50, paddingBottom: 24,
  },

  celebration: { textAlign: 'center', marginBottom: 26 },
  successWrap: {
    position: 'relative',
    width: 92, height: 92,
    margin: '0 auto 22px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  successRing: {
    position: 'absolute',
    width: '100%', height: '100%',
    borderRadius: '50%',
    background: VERDE,
    opacity: 0.18,
    animation: 'pulse 2s infinite',
  },
  successCircle: {
    width: 92, height: 92,
    background: '#dcfce7',
    color: VERDE,
    borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    position: 'relative', zIndex: 2,
  },
  title: {
    fontSize: 24, fontWeight: 800, color: '#111827',
    marginBottom: 6, letterSpacing: '-0.4px',
  },
  subtitle: { fontSize: 13, color: '#6b7280', lineHeight: 1.5 },

  card: {
    background: '#fff',
    borderRadius: 20,
    padding: 20,
    border: '1px solid #eef0ee',
    boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
    marginBottom: 16,
  },
  hoodSection: { display: 'flex', alignItems: 'center', gap: 14 },
  avatar: {
    width: 56, height: 56, borderRadius: 14,
    objectFit: 'cover', background: '#f3f4f6', flexShrink: 0,
  },
  avatarFallback: {
    width: 56, height: 56, borderRadius: 14, flexShrink: 0,
    background: VERDE, color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 20, fontWeight: 800,
  },
  hoodPill: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    background: '#f0fdf4', color: VERDE,
    padding: '5px 12px', borderRadius: 999,
    fontSize: 13, fontWeight: 700, marginBottom: 6,
  },
  hoodMembers: {
    fontSize: 11.5, color: '#6b7280',
    display: 'flex', alignItems: 'center', gap: 5, marginLeft: 4,
  },
  dot: { width: 6, height: 6, background: '#22c55e', borderRadius: '50%' },

  divider: { height: 1, background: '#f3f4f6', margin: '18px 0' },

  dataList: { display: 'flex', flexDirection: 'column', gap: 12 },
  dataRow: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', gap: 12,
  },
  dataLabel: { fontSize: 13, color: '#6b7280', fontWeight: 500, flexShrink: 0 },
  dataValue: {
    fontSize: 13, color: '#111827', fontWeight: 700,
    textAlign: 'right', overflow: 'hidden',
    textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  dataVerified: {
    fontSize: 13, color: VERDE, fontWeight: 700,
    display: 'flex', alignItems: 'center', gap: 5,
  },

  founderCard: {
    display: 'flex', alignItems: 'flex-start', gap: 12,
    padding: 16,
    background: 'linear-gradient(135deg, #fef9c3 0%, #fef3c7 100%)',
    borderRadius: 16,
    border: '1.5px solid #fde68a',
    marginBottom: 16,
  },
  founderIcon: {
    width: 38, height: 38, borderRadius: 11, flexShrink: 0,
    background: 'rgba(255,255,255,0.65)', color: '#78350f',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  founderTitle: {
    fontSize: 13.5, fontWeight: 800, color: '#78350f', marginBottom: 4,
  },
  founderText: {
    fontSize: 11.5, color: '#92400e', lineHeight: 1.5, fontWeight: 500,
  },

  footer: { marginTop: 'auto', paddingTop: 20 },
  primaryBtn: {
    width: '100%', padding: 16,
    background: VERDE, color: '#fff',
    borderRadius: 999, fontSize: 15, fontWeight: 700,
    border: 'none', cursor: 'pointer', fontFamily: 'inherit',
    boxShadow: '0 6px 20px rgba(22,163,74,0.3)',
  },
}

export default Complete
