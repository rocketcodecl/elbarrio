import { useState, useEffect, useCallback } from 'react'
import { supabase } from './lib/supabase'
import { C, T } from './lib/design'

import Home from './screens/Home'
import Alertas from './screens/Alertas'
import Comercios from './screens/Comercios'            // 👈 NUEVO (1/4)
import CreatePost from './screens/CreatePost'
import TabBar from './components/TabBar'
import CommerceForm from './components/CommerceForm'   // 👈 NUEVO (2/4) — ajustá la ruta si está en otro lado

/* ============================================================
   App — orquestador de El Barrio.

   INCLUYE el phone frame (usa las clases .phone-frame,
   .phone-notch, .phone-content que ya están definidas en
   index.css). No necesita wrapper externo en main.jsx.
   ============================================================ */

function Placeholder({ titulo, onBack, mensaje }) {
  return (
    <div style={s.placeholderWrap}>
      <div style={s.placeholderHeader}>
        <button style={s.placeholderBack} onClick={() => onBack('inicio')}>←</button>
        <div style={s.placeholderTit}>{titulo}</div>
        <div style={{ width: 40 }} />
      </div>
      <div style={s.placeholderBody}>
        <div style={s.placeholderEmoji}>🚧</div>
        <div style={s.placeholderTit2}>{titulo}</div>
        <div style={s.placeholderTxt}>
          {mensaje || 'Esta pantalla todavía no está integrada. Pegá tu componente acá.'}
        </div>
      </div>
    </div>
  )
}

function App() {
  const [user, setUser] = useState(null)
  const [cargandoAuth, setCargandoAuth] = useState(true)

  const [screen, setScreen] = useState('inicio')
  const [params, setParams] = useState({})
  const [activeTab, setActiveTab] = useState('inicio')

  const [createOpen, setCreateOpen] = useState(false)
  const [createType, setCreateType] = useState(null)

  const [noLeidos, setNoLeidos] = useState(0)
  const [profile, setProfile] = useState(null)  // 👈 para pasar neighborhoodId a CommerceForm

  /* ── AUTH ── */
  useEffect(() => {
    let mounted = true
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      setUser(session?.user || null)
      setCargandoAuth(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user || null)
    })
    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [])

  /* ── PERFIL del user (trae neighborhood_id, is_admin, etc.) ── */
  useEffect(() => {
    if (!user?.id) { setProfile(null); return }
    let active = true
    supabase
      .from('profiles').select('*')
      .eq('user_id', user.id).maybeSingle()
      .then(({ data }) => { if (active) setProfile(data) })
    return () => { active = false }
  }, [user?.id])

  /* ── CONTADORES no leídos ── */
  useEffect(() => {
    if (!user) return
    let active = true
    const cargarNoLeidos = async () => {
      try {
        const { data: prof } = await supabase
          .from('profiles').select('id')
          .eq('user_id', user.id).maybeSingle()
        if (!prof?.id || !active) return
        const { count } = await supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('receiver_id', prof.id).eq('read', false)
        if (active) setNoLeidos(count || 0)
      } catch {}
    }
    cargarNoLeidos()
    const canal = supabase
      .channel('app-unread')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        cargarNoLeidos)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        cargarNoLeidos)
      .subscribe()
    return () => {
      active = false
      supabase.removeChannel(canal)
    }
  }, [user])

  /* ── NAVIGACIÓN ── */
  const onNavigate = useCallback((next, p = {}) => {
    setScreen(next)
    setParams(p)
    const tabMap = {
      inicio: 'inicio', mercado: 'mercado', marketplace: 'mercado',
      servicios: 'servicios', events: 'eventos', eventos: 'eventos',
      chat: 'chat', chatlist: 'chat',
      comercios: 'comercios',                                    // 👈 NUEVO (3/4)
    }
    setActiveTab(tabMap[next] || activeTab)
    requestAnimationFrame(() => {
      const el = document.getElementById('elbarrio-scroll')
      if (el) el.scrollTop = 0
    })
  }, [activeTab])

  /* ── CREAR ── */
  const onCrear = useCallback((type = null) => {
    setCreateType(type)
    setCreateOpen(true)
  }, [])

  const onCerrarCrear = useCallback(() => {
    setCreateOpen(false)
    setCreateType(null)
  }, [])

  // Cuando se crea un comercio, volvemos a la pestaña Comercios (no a inicio)
  const onPublicadoComercio = useCallback(() => {
    setCreateOpen(false)
    setCreateType(null)
    setScreen('comercios')
    setActiveTab('comercios')
  }, [])

  const onPublicado = useCallback(() => {
    setCreateOpen(false)
    setCreateType(null)
    setScreen('inicio')
    setActiveTab('inicio')
  }, [])

  const onChangeTab = useCallback((tabId) => {
    const screenMap = {
      inicio: 'inicio', mercado: 'mercado', servicios: 'servicios',
      eventos: 'eventos', chat: 'chat', comercios: 'comercios',  // 👈 NUEVO
    }
    onNavigate(screenMap[tabId] || tabId)
  }, [onNavigate])

  /* ── BOOT ── */
  if (cargandoAuth) {
    return (
      <div className="phone-frame">
        <div className="phone-notch" />
        <div className="phone-content" style={s.bootWrap}>
          <div style={s.bootLogo}>🏘️</div>
          <div style={s.bootTxt}>el barrio</div>
        </div>
        <div className="phone-home-indicator" />
      </div>
    )
  }

  /* ── LOGIN ── */
  if (!user) {
    return (
      <div className="phone-frame">
        <div className="phone-notch" />
        <div className="phone-content">
          <Login />
        </div>
        <div className="phone-home-indicator" />
      </div>
    )
  }

  /* ── RENDER PRINCIPAL con phone-frame ── */
  const mostrarTabBar = !createOpen

  return (
    <div className="phone-frame">
      <div className="phone-notch" />

      <div className="phone-content" style={s.contentPad}>
        <div style={s.root}>
          <div id="elbarrio-scroll" style={s.screenArea}>
            {renderScreen({ screen, params, user, onNavigate, onCrear })}
          </div>

          {mostrarTabBar && (
            <TabBar
              activeTab={activeTab}
              onChangeTab={onChangeTab}
              onCrear={onCrear}
              noLeidos={noLeidos}
            />
          )}

          {/* 👈 NUEVO (4/4): si es comercio, abre CommerceForm; si no, CreatePost.
              CommerceForm acepta { commerce?, neighborhoodId, onClose, onSaved }. */}
          {createOpen && createType === 'commerce' && (
            <div style={s.createOverlay}>
              <CommerceForm
                neighborhoodId={profile?.neighborhood_id}
                onClose={onCerrarCrear}
                onSaved={onPublicadoComercio}
              />
            </div>
          )}

          {createOpen && createType !== 'commerce' && (
            <div style={s.createOverlay}>
              <CreatePost
                startWith={createType}
                onClose={onCerrarCrear}
                onPublished={onPublicado}
              />
            </div>
          )}
        </div>
      </div>

      <div className="phone-home-indicator" />
    </div>
  )
}

/* ============================================================
   renderScreen — switch de navegación
   ============================================================ */
function renderScreen({ screen, params, user, onNavigate, onCrear }) {
  switch (screen) {
    case 'inicio':
      return <Home currentUser={user} onNavigate={onNavigate} onCrear={onCrear} />

    case 'alertas':
      return <Alertas currentUser={user} onNavigate={onNavigate} onCrear={onCrear} />

    case 'alerta':
      return (
        <Placeholder
          titulo="Detalle de alerta"
          mensaje={`ID: ${params?.id || '—'}. Pegá acá tu AlertaDetail.jsx`}
          onBack={onNavigate}
        />
      )

    case 'post':
      return (
        <Placeholder
          titulo="Detalle de publicación"
          mensaje={`postId: ${params?.postId || '—'}. Pegá acá tu ProductDetail.jsx`}
          onBack={onNavigate}
        />
      )

    case 'mercado':
    case 'marketplace':
      return <Placeholder titulo="Mercado" mensaje="Pegá acá tu Marketplace.jsx" onBack={onNavigate} />

    case 'servicios':
      return <Placeholder titulo="Servicios" mensaje="Pegá acá tu Services.jsx" onBack={onNavigate} />

    case 'eventos':
    case 'events':
      return <Placeholder titulo="Eventos" mensaje="Pegá acá tu Events.jsx" onBack={onNavigate} />

    case 'chat':
    case 'chatlist':
      return <Placeholder titulo="Chat" mensaje="Pegá acá tu ChatList.jsx" onBack={onNavigate} />

    case 'chatconversation':
      return (
        <Placeholder
          titulo="Conversación"
          mensaje={`postId: ${params?.postId || '—'}. Pegá acá tu ChatConversation.jsx`}
          onBack={onNavigate}
        />
      )

    case 'perfil':
    case 'profile':
      return <Placeholder titulo="Mi perfil" mensaje="Pegá acá tu Profile.jsx" onBack={onNavigate} />

    case 'notificaciones':
      return <Placeholder titulo="Notificaciones" mensaje="Pegá acá tu Notifications.jsx" onBack={onNavigate} />

    /* 👈 NUEVO: la pantalla de Comercios real */
    case 'comercios':
      return <Comercios currentUser={user} onNavigate={onNavigate} onCrear={onCrear} />

    /* 👈 NUEVO: detalle de un comercio (pantalla pendiente).
       Por ahora rebota a Comercios para no romper. Cuando armes
       ComercioDetalle.jsx, reemplazá este case por:
         return <ComercioDetalle
                  currentUser={user}
                  commerceId={params?.id}
                  commerce={params?.commerce}
                  onNavigate={onNavigate}
                />
    */
    case 'comercio':
      return <Comercios currentUser={user} onNavigate={onNavigate} onCrear={onCrear} />

    case 'noticias':
      return <Placeholder titulo="Noticias" mensaje="Pegá acá tu Noticias.jsx" onBack={onNavigate} />

    default:
      return <Home currentUser={user} onNavigate={onNavigate} onCrear={onCrear} />
  }
}

/* ============================================================
   LOGIN
   ============================================================ */
function Login() {
  const [modo, setModo] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setCargando(true)
    try {
      if (modo === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name: fullName } },
        })
        if (error) throw error
        setError('Revisá tu email para confirmar la cuenta.')
      }
    } catch (err) {
      setError(err.message || 'Algo salió mal')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div style={s.loginWrap}>
      <div style={s.loginCard}>
        <div style={s.loginLogo}>🏘️</div>
        <div style={s.loginBrand}>el barrio</div>
        <div style={s.loginSub}>
          {modo === 'signin' ? 'Bienvenido de vuelta' : 'Unite a tu barrio'}
        </div>

        <form onSubmit={submit} style={s.loginForm}>
          {modo === 'signup' && (
            <input style={s.loginInput} placeholder="Tu nombre"
              value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          )}
          <input style={s.loginInput} type="email" placeholder="email@barrio.cl"
            value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input style={s.loginInput} type="password" placeholder="••••••••"
            value={password} onChange={(e) => setPassword(e.target.value)}
            required minLength={6} />

          {error && <div style={s.loginError}>{error}</div>}

          <button type="submit"
            style={{ ...s.loginBtn, opacity: cargando ? 0.6 : 1 }}
            disabled={cargando}>
            {cargando ? 'Cargando...' : (modo === 'signin' ? 'Entrar' : 'Crear cuenta')}
          </button>
        </form>

        <button style={s.loginToggle}
          onClick={() => {
            setModo(modo === 'signin' ? 'signup' : 'signin')
            setError('')
          }}>
          {modo === 'signin' ? '¿No tenés cuenta? Registrate' : '¿Ya tenés cuenta? Entrá'}
        </button>
      </div>
    </div>
  )
}

/* ============================================================
   ESTILOS
   ============================================================ */
const s = {
  /* ── Pad del phone-content: dejar aire arriba (notch) y abajo (home indicator) ── */
  contentPad: {
    paddingTop: 30,   // espacio para el notch
    paddingBottom: 0, // el home indicator va encima, no necesitamos pad
  },

  /* ── ROOT: llena el .phone-content (que ya tiene height: 100%).
     position: relative → la TabBar (absolute; bottom: 0) se pega acá. ── */
  root: {
    width: '100%',
    height: '100%',
    background: C.fondo,
    fontFamily: T.font,
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },

  /* ── Área de la pantalla (todo menos la TabBar).
     flex: 1 + minHeight: 0 → respeta el overflow interno. ── */
  screenArea: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },

  /* ── Overlay de creación (fullscreen, tapa todo incl. TabBar) ── */
  createOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 500,
    background: C.fondo,
  },

  /* ── Boot ── */
  bootWrap: {
    width: '100%', height: '100%',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    background: C.fondo, fontFamily: T.font, gap: 12,
  },
  bootLogo: { fontSize: 56 },
  bootTxt: {
    fontSize: 22, fontWeight: 700, color: C.verde,
    letterSpacing: '-0.3px',
  },

  /* ── placeholder ── */
  placeholderWrap: {
    width: '100%', height: '100%',
    background: C.fondo, fontFamily: T.font,
    display: 'flex', flexDirection: 'column',
  },
  placeholderHeader: {
    background: C.card,
    padding: '28px 18px 12px',
    borderBottom: `1px solid ${C.borde}`,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    flexShrink: 0,
  },
  placeholderBack: {
    width: 40, height: 40, borderRadius: '50%',
    background: C.fondo, border: `1px solid ${C.borde}`,
    color: C.texto, cursor: 'pointer', padding: 0,
    fontSize: 18, fontFamily: 'inherit',
  },
  placeholderTit: { fontSize: 17, fontWeight: 700, color: C.texto },
  placeholderBody: {
    flex: 1, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    padding: 40, gap: 12,
  },
  placeholderEmoji: { fontSize: 56 },
  placeholderTit2: { fontSize: 20, fontWeight: 700, color: C.texto },
  placeholderTxt: {
    fontSize: 14, color: C.textoTenue, lineHeight: 1.5,
    textAlign: 'center', maxWidth: 280,
  },

  /* ── login ── */
  loginWrap: {
    width: '100%', height: '100%',
    background: C.fondo, fontFamily: T.font,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 24,
  },
  loginCard: {
    width: '100%', maxWidth: 360,
    background: C.card, borderRadius: 22,
    padding: 32, boxShadow: '0 12px 40px rgba(0,0,0,0.06)',
    border: `1px solid ${C.borde}`,
  },
  loginLogo: { fontSize: 48, textAlign: 'center' },
  loginBrand: {
    fontSize: 26, fontWeight: 800, color: C.verde,
    textAlign: 'center', letterSpacing: '-0.3px',
  },
  loginSub: {
    fontSize: 13.5, color: C.textoTenue, textAlign: 'center',
    marginTop: 4, marginBottom: 24,
  },
  loginForm: { display: 'flex', flexDirection: 'column', gap: 10 },
  loginInput: {
    width: '100%', padding: '13px 15px',
    fontSize: 14, background: C.fondo,
    border: `1.5px solid ${C.borde}`, borderRadius: 12,
    outline: 'none', fontFamily: 'inherit', color: C.texto,
    boxSizing: 'border-box',
  },
  loginError: {
    fontSize: 12.5, color: C.rojo,
    background: C.rojoBg, border: `1px solid ${C.rojoSuave}`,
    borderRadius: 10, padding: '9px 11px', lineHeight: 1.4,
  },
  loginBtn: {
    width: '100%', padding: '14px 16px', marginTop: 6,
    background: C.verde, color: '#fff',
    border: 'none', borderRadius: 12,
    fontSize: 15, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit',
  },
  loginToggle: {
    width: '100%', marginTop: 16,
    background: 'none', border: 'none',
    color: C.verde, fontSize: 13, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit',
  },
}

export default App
