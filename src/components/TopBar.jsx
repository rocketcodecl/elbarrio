/*
  TopBar — cabecera superior reusable.

  La usa Marketplace (y cualquier pantalla que quiera header con
  brand + campana de notificaciones + avatar).

  Props:
    · notifCount  → número de notificaciones sin leer (se muestra en la campana).
    · onAvatar    → callback al tocar el avatar (suele ser nav('Perfil')).
    · onBell      → callback al tocar la campana (opcional, default nav('Notificaciones')).
    · onNavigate  → si llega, se usa como fallback para bell/avatar.
*/

import { C, T, iniciales } from '../lib/design'

export default function TopBar({ notifCount = 0, onAvatar, onBell, onNavigate, userName = '' }) {
  const nav = onNavigate || (() => {})
  const avatar = onAvatar || (() => nav('Perfil'))
  const bell = onBell || (() => nav('Notificaciones'))

  return (
    <div style={s.bar}>
      <div style={s.brand} onClick={() => nav('inicio')}>
        <span style={s.logo}>🏘️</span>
        <span style={s.brandText}>el barrio</span>
      </div>

      <div style={s.actions}>
        <button style={s.bellBtn} onClick={bell} aria-label="Notificaciones">
          <svg width={20} height={20} viewBox="0 0 24 24" fill="none"
            stroke={C.texto} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {notifCount > 0 && <span style={s.badge}>{notifCount > 9 ? '9+' : notifCount}</span>}
        </button>

        <button style={s.avatarBtn} onClick={avatar} aria-label="Mi perfil">
          <span style={s.avatarFallback}>{iniciales(userName)}</span>
        </button>
      </div>
    </div>
  )
}

const s = {
  bar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 16px 10px',
    background: C.card,
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    cursor: 'pointer',
  },
  logo: { fontSize: 24 },
  brandText: {
    fontSize: 19,
    fontWeight: 800,
    color: C.verde,
    letterSpacing: '-0.3px',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  bellBtn: {
    position: 'relative',
    width: 38, height: 38,
    borderRadius: '50%',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 4, right: 4,
    minWidth: 16, height: 16,
    borderRadius: 8,
    background: C.rojo,
    color: '#fff',
    fontSize: 10,
    fontWeight: 800,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 4px',
    boxSizing: 'border-box',
    border: '1.5px solid #fff',
  },
  avatarBtn: {
    width: 38, height: 38,
    borderRadius: '50%',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    padding: 0,
    display: 'flex',
  },
  avatarFallback: {
    width: 36, height: 36,
    borderRadius: '50%',
    background: C.verde,
    color: '#fff',
    fontSize: 13,
    fontWeight: 800,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
}