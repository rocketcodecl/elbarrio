/*
  TopBar — cabecera superior reusable.

  La usa Marketplace (y cualquier pantalla que quiera header con
  brand + lupa de búsqueda + campana de notificaciones + avatar).

  Props:
    · notifCount  → número de notificaciones sin leer (se muestra en la campana).
    · onAvatar    → callback al tocar el avatar (suele ser nav('Perfil')).
    · onBell      → callback al tocar la campana (opcional, default nav('Notificaciones')).
    · onSearch    → callback al tocar la lupa (opcional, default nav('search')).
    · onNavigate  → si llega, se usa como fallback para bell/avatar/search.
    · userName    → nombre del usuario para mostrar iniciales en el avatar.
    · showSearch  → si es false, oculta el botón de búsqueda (default: true).
*/

import { C, T, iniciales } from '../lib/design'

export default function TopBar({
  notifCount = 0,
  onAvatar,
  onBell,
  onSearch,
  onNavigate,
  userName = '',
  showSearch = true,
}) {
  const nav = onNavigate || (() => {})
  const avatar = onAvatar || (() => nav('Perfil'))
  const bell = onBell || (() => nav('Notificaciones'))
  const search = onSearch || (() => nav('search'))

  return (
    <div style={s.bar}>
      <div style={s.brand} onClick={() => nav('inicio')}>
        <span style={s.logo}>🏘️</span>
        <span style={s.brandText}>el barrio</span>
      </div>

      <div style={s.actions}>
        {showSearch && (
          <button style={s.iconBtn} onClick={search} aria-label="Buscar">
            <svg width={19} height={19} viewBox="0 0 24 24" fill="none"
              stroke={C.texto} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <line x1="20" y1="20" x2="16.65" y2="16.65" />
            </svg>
          </button>
        )}

        <button style={s.iconBtn} onClick={bell} aria-label="Notificaciones">
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
    gap: 4,
  },
  // Botón genérico para iconos (lupa + campana comparten el mismo estilo)
  iconBtn: {
    position: 'relative',
    width: 38, height: 38,
    borderRadius: '50%',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
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
