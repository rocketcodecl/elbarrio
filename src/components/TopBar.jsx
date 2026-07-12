import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

/*
  TopBar — cabecera del barrio, reutilizable en cualquier pantalla.

  Uso mínimo:
      <TopBar />

  Con opciones:
      <TopBar
        title="Barrio Italia"
        subtitle="Providencia, Santiago"
        notifCount={3}
        onBell={() => onNavigate('Notificaciones')}
        onAvatar={() => onNavigate('Perfil')}
      />
*/

function TopBar({
  title = 'El Barrio',
  subtitle = 'Las Condes, Santiago',
  beta = true,
  notifCount = 0,
  onBell,
  onAvatar,
}) {
  const [avatar, setAvatar] = useState(null)
  const [initials, setInitials] = useState('')

  useEffect(() => {
    let vivo = true

    const cargar = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('user_id', user.id)
          .single()

        if (!vivo || !profile) return

        setAvatar(profile.avatar_url || null)

        const nombre = (profile.full_name || '').trim()
        if (nombre) {
          const partes = nombre.split(' ').filter(Boolean)
          setInitials(
            (partes[0]?.[0] || '') + (partes[1]?.[0] || '')
          )
        }
      } catch {
        // Silencio: si falla, se muestra el avatar por defecto.
      }
    }

    cargar()
    return () => { vivo = false }
  }, [])

  return (
    <div style={s.bar}>
      {/* Izquierda: pin + barrio */}
      <div style={s.left}>
        <span style={s.pin}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" strokeWidth="1.9"
               strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        </span>
        <div style={s.textCol}>
          <div style={s.titleRow}>
            <span style={s.title}>{title}</span>
            {beta && <span style={s.betaPill}>Beta</span>}
          </div>
          <div style={s.subtitle}>{subtitle}</div>
        </div>
      </div>

      {/* Derecha: campana + avatar */}
      <div style={s.right}>
        <button style={s.bell} onClick={onBell}>
          <svg width="21" height="21" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" strokeWidth="1.8"
               strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {notifCount > 0 && (
            <span style={s.badge}>{notifCount > 9 ? '9+' : notifCount}</span>
          )}
        </button>

        <button style={s.avatarBtn} onClick={onAvatar}>
          {avatar ? (
            <img src={avatar} alt="" style={s.avatarImg} />
          ) : (
            <span style={s.avatarInitials}>{initials || '·'}</span>
          )}
        </button>
      </div>
    </div>
  )
}

const VERDE = '#16a34a'

const s = {
  bar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '50px 16px 14px',
    background: '#fff',
    borderBottom: '1px solid #f0f2f0',
    flexShrink: 0,
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },

  left: { display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 },
  pin: { color: VERDE, display: 'flex', flexShrink: 0 },
  textCol: { display: 'flex', flexDirection: 'column', minWidth: 0 },
  titleRow: { display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 },
  betaPill: {
    fontSize: 9.5,
    fontWeight: 800,
    letterSpacing: 0.4,
    color: '#fff',
    background: VERDE,
    padding: '3px 7px',
    borderRadius: 6,
    textTransform: 'uppercase',
    flexShrink: 0,
    lineHeight: 1.3,
  },
  title: {
    fontSize: 17,
    fontWeight: 800,
    color: '#111827',
    lineHeight: 1.2,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  subtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 1,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },

  right: { display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 },

  bell: {
    position: 'relative',
    width: 40,
    height: 40,
    borderRadius: '50%',
    background: '#f4f7f4',
    color: '#374151',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
  },
  badge: {
    position: 'absolute',
    top: 1,
    right: 1,
    minWidth: 17,
    height: 17,
    padding: '0 4px',
    borderRadius: 999,
    background: '#dc2626',
    color: '#fff',
    fontSize: 10,
    fontWeight: 800,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px solid #fff',
    boxSizing: 'content-box',
  },

  avatarBtn: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    overflow: 'hidden',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
    background: '#dcfce7',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarImg: { width: '100%', height: '100%', objectFit: 'cover' },
  avatarInitials: {
    fontSize: 13,
    fontWeight: 800,
    color: VERDE,
    textTransform: 'uppercase',
  },
}

export default TopBar