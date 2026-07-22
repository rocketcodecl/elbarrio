import { useState } from 'react'
import { C, T, TIPOS } from '../lib/design'

/*
  TabBar — la navegación del demo.

  Inicio · Mercado · Servicios · Eventos · Chat
  (El Perfil vive en el avatar de la cabecera, no en un tab.)

  Y el botón "+" que se despliega en las 7 formas de publicar.
  "Pedir ayuda" va primero porque es el motor del negocio.

  REGLA DE ORO: cada cosa se crea donde se ve, pero el "+" es el atajo
  universal. Cada opción aterriza en SU tabla:
    · Pedir ayuda                    → posts (type='request')
    · Vender/Regalar/Trueque/Publicar → posts
    · Alerta                          → incident_reports (reporte de vecino)
    · Evento                          → events
  La Alerta del vecino NUNCA es un aviso oficial. Esa distinción es
  lo que le da credibilidad al canal oficial.

  ÍCONOS: la barra inferior usa SVG lineales (estilo Rappi).
  El menú CREAR mantiene emojis (tiles coloridos de categorías).
*/

// ─── Íconos lineales (SVG stroke, estilo Rappi) ───
const Ico = {
  inicio: (color) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <path d="M9 22V12h6v10" />
    </svg>
  ),
  mercado: (color) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  ),
  servicios: (color) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  ),
  eventos: (color) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M3 10h18" />
      <path d="M8 2v4M16 2v4" />
    </svg>
  ),
  chat: (color) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z" />
    </svg>
  ),
}

const TABS = [
  { id: 'inicio',    icon: Ico.inicio,    label: 'Inicio' },
  { id: 'mercado',   icon: Ico.mercado,   label: 'Mercado' },
  { id: 'servicios', icon: Ico.servicios, label: 'Servicios' },
  { id: 'eventos',   icon: Ico.eventos,   label: 'Eventos' },
  { id: 'chat',      icon: Ico.chat,      label: 'Chat' },
]

const CREAR = [
  { id: 'request', ...TIPOS.request },  // 🙋 Pedir ayuda — primero, motor del negocio
  { id: 'sell',    ...TIPOS.sell },
  { id: 'gift',    ...TIPOS.gift },
  { id: 'trade',   ...TIPOS.trade },
  { id: 'alert',   ...TIPOS.alert },
  { id: 'event',   ...TIPOS.event },
  { id: 'general', ...TIPOS.general },
]

function TabBar({ activeTab, onChangeTab, onCrear, noLeidos = 0, showCreateButton = true }) {
  const [abierto, setAbierto] = useState(false)

  const elegir = (id) => {
    setAbierto(false)
    onCrear?.(id)
  }

  return (
    <>
      {/* ═══ MENÚ DEL "+" ═══ */}
      {showCreateButton && abierto && (
        <div style={s.overlay} onClick={() => setAbierto(false)}>
          <div style={s.menu} onClick={(e) => e.stopPropagation()}>
            {CREAR.map((c) => (
              <button key={c.id} style={s.menuItem} onClick={() => elegir(c.id)}>
                <span style={{ ...s.menuIcono, background: c.bg }}>{c.emoji}</span>
                <span style={s.menuLabel}>{c.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ═══ BOTÓN "+" (squircle, no círculo) ═══ */}
      {showCreateButton && (
        <button
          style={{
            ...s.fab,
            transform: abierto ? 'rotate(45deg)' : 'rotate(0deg)',
            background: abierto ? C.texto : C.verde,
          }}
          onClick={() => setAbierto(!abierto)}
          aria-label="Crear"
        >
          +
        </button>
      )}

      {/* ═══ BARRA ═══ */}
      <div style={s.barra}>
        {TABS.map((t) => {
          const activo = activeTab === t.id
          const color = activo ? C.verde : C.textoTenue
          return (
            <button
              key={t.id}
              style={s.tab}
              onClick={() => { setAbierto(false); onChangeTab(t.id) }}
            >
              <span style={{
                ...s.tabIcon,
                opacity: activo ? 1 : 0.5,
              }}>
                {t.icon(color)}
              </span>
              <span style={{
                ...s.tabLabel,
                color,
                fontWeight: activo ? 700 : 500,
              }}>
                {t.label}
              </span>

              {t.id === 'chat' && noLeidos > 0 && (
                <span style={s.badge}>{noLeidos > 9 ? '9+' : noLeidos}</span>
              )}
            </button>
          )
        })}
      </div>
    </>
  )
}

const s = {
  barra: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: 76,
    display: 'flex', alignItems: 'flex-start',
    background: '#fff',
    borderTop: `1px solid ${C.borde}`,
    paddingTop: 9,
    boxShadow: '0 -2px 16px rgba(0,0,0,0.05)',
    zIndex: 100,
    fontFamily: T.font,
  },
  tab: {
    flex: 1, position: 'relative',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: 3,
    background: 'none', border: 'none',
    cursor: 'pointer', padding: 0, fontFamily: 'inherit',
  },
  tabIcon: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    height: 24,
    transition: 'opacity .15s',
  },
  tabLabel: { fontSize: 10.5 },
  badge: {
    position: 'absolute', top: -3, right: '50%', marginRight: -22,
    minWidth: 17, height: 17, padding: '0 4px',
    borderRadius: 999, background: C.rojo, color: '#fff',
    fontSize: 10, fontWeight: 800,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: '2px solid #fff',
  },

  /* ── FAB squircle (cuadrado con puntas redondeadas) ── */
  fab: {
    position: 'absolute',
    bottom: 90, right: 18,
    width: 56, height: 56, borderRadius: 18,
    color: '#fff', fontSize: 30, fontWeight: 300,
    border: 'none', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 6px 22px rgba(22,163,74,0.4)',
    zIndex: 300,
    transition: 'transform .2s, background .2s',
    lineHeight: 1,
    fontFamily: T.font,
  },

  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(255,255,255,0.75)',
    backdropFilter: 'blur(4px)',
    WebkitBackdropFilter: 'blur(4px)',
    zIndex: 200,
  },
  menu: {
    position: 'absolute',
    bottom: 158, right: 18,
    background: '#fff',
    borderRadius: 20,
    padding: 10,
    boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
    border: `1px solid ${C.borde}`,
    display: 'flex', flexDirection: 'column', gap: 2,
    minWidth: 218,
    fontFamily: T.font,
  },
  menuItem: {
    display: 'flex', alignItems: 'center', gap: 13,
    padding: '12px 13px', borderRadius: 14,
    background: 'none', border: 'none',
    cursor: 'pointer', fontFamily: 'inherit',
    width: '100%', textAlign: 'left',
  },
  menuIcono: {
    width: 40, height: 40, borderRadius: 12,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 20, flexShrink: 0,
  },
  menuLabel: { fontSize: 15, fontWeight: 700, color: C.texto },
}

export default TabBar
