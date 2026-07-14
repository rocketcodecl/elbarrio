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
*/

const TABS = [
  { id: 'inicio',    emoji: '🏠', label: 'Inicio' },
  { id: 'mercado',   emoji: '🏷️', label: 'Mercado' },
  { id: 'servicios', emoji: '🔧', label: 'Servicios' },
  { id: 'eventos',   emoji: '📅', label: 'Eventos' },
  { id: 'chat',      emoji: '💬', label: 'Chat' },
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

function TabBar({ activeTab, onChangeTab, onCrear, noLeidos = 0 }) {
  const [abierto, setAbierto] = useState(false)

  const elegir = (id) => {
    setAbierto(false)
    onCrear?.(id)
  }

  return (
    <>
      {/* ═══ MENÚ DEL "+" ═══ */}
      {abierto && (
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

      {/* ═══ BARRA ═══ */}
      <div style={s.barra}>
        {TABS.map((t) => {
          const activo = activeTab === t.id
          return (
            <button
              key={t.id}
              style={s.tab}
              onClick={() => { setAbierto(false); onChangeTab(t.id) }}
            >
              <span style={{
                ...s.tabEmoji,
                filter: activo ? 'none' : 'grayscale(1)',
                opacity: activo ? 1 : 0.45,
              }}>
                {t.emoji}
              </span>
              <span style={{
                ...s.tabLabel,
                color: activo ? C.verde : C.textoTenue,
                fontWeight: activo ? 800 : 600,
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
  tabEmoji: { fontSize: 21, lineHeight: 1.1, transition: 'all .15s' },
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