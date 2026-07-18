import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from './lib/supabase'
import { C, T } from './lib/design'

/* ── LOGIN FLOW (tu Login completo, intacto) ── */
import Splash from './screens/Splash'
import Onboarding from './screens/Onboarding'
import Register from './screens/Register'
import Profile from './screens/Profile'
import Verification from './screens/Verification'
import Complete from './screens/Complete'

/* ── MAIN APP (tabs nuevas + Comercios + Mercado) ── */
import Home from './screens/Home'
import Alertas from './screens/Alertas'
import Comercios from './screens/Comercios'
import Marketplace from './screens/Marketplace'
import ProductDetail from './screens/ProductDetail'
import ChatConversation from './screens/ChatConversation'
import ChatList from './screens/ChatList'
import DealDone from './screens/DealDone'
import MyProfile from './screens/MyProfile'
import CreatePost from './screens/CreatePost'
import TabBar from './components/TabBar'
import CommerceForm from './components/CommerceForm'

/* ── TASK 59: pantallas nuevas (Services, Events, Notifications, AlertaDetail) ── */
import Services from './screens/Services'
import Events from './screens/Events'
import Notifications from './screens/Notifications'
import AlertaDetail from './screens/AlertaDetail'

/* ── TASK 62: pantallas nuevas (SellerProfile, Noticias) ── */
import SellerProfile from './screens/SellerProfile'
import Noticias from './screens/Noticias'

/* ── Search ── */
import Search from './screens/Search'

function Placeholder({ titulo, onBack, mensaje }) {
  return (
    <div style={s.placeholderWrap}>
      <div style={s.placeholderHeader}>
        <button style={s.placeholderBack} onClick={() => onBack && onBack('back')}>←</button>
        <div style={s.placeholderTit}>{titulo}</div>
        <div style={{ width: 40 }} />
      </div>
      <div style={s.placeholderBody}>
        <div style={s.placeholderEmoji}>🚧</div>
        <div style={s.placeholderTit2}>{titulo}</div>
        <div style={s.placeholderTxt}>
          {mensaje || 'Esta pantalla todavía no está integrada.'}
        </div>
      </div>
    </div>
  )
}

export default function App() {
  /* ── LOGIN FLOW STATE ── */
  const [currentScreen, setCurrentScreen] = useState('splash')
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)

  /* ── MAIN APP STATE ── */
  const [activeTab, setActiveTab] = useState('inicio')
  const [params, setParams] = useState({})
  const [createOpen, setCreateOpen] = useState(false)
  const [createType, setCreateType] = useState(null)
  const [noLeidos, setNoLeidos] = useState(0)
  const historyRef = useRef([])

  /* ── AUTH + checkSession (decide pantalla inicial según perfil) ── */
  const checkSession = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) {
      setUser(null)
      setProfile(null)
      setCurrentScreen('splash')
      setLoading(false)
      return
    }
    setUser({ id: session.user.id, email: session.user.email })

    const { data: p } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', session.user.id)
      .maybeSingle()
    setProfile(p || null)

    if (!p || !p.full_name || !p.rut) {
      setCurrentScreen('profile')
    } else if (p.verification_status !== 'verified') {
      setCurrentScreen('verification')
    } else {
      setCurrentScreen('main')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    checkSession()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email })
      } else {
        setUser(null)
        setProfile(null)
      }
    })
    return () => subscription.unsubscribe()
  }, [checkSession])

  const recargarPerfil = useCallback(async () => {
    if (!user?.id) return null
    const { data: p } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
    setProfile(p || null)
    return p
  }, [user?.id])

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setActiveTab('inicio')
    setCurrentScreen('splash')
    historyRef.current = []
  }, [])

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

  /* ── NAVIGATION (con back/home y sub-pantallas) ── */
  const onNavigate = useCallback((next, p = {}) => {
    const lower = typeof next === 'string' ? next.toLowerCase() : next

    if (lower === 'back') {
      const prev = historyRef.current.pop()
      if (prev) {
        setCurrentScreen(prev.screen || 'main')
        setParams(prev.params || {})
      } else {
        setCurrentScreen('main')
      }
      return
    }
    if (lower === 'home') {
      historyRef.current = []
      setActiveTab('inicio')
      setCurrentScreen('main')
      setParams({})
      return
    }

    const subScreens = ['post', 'productdetail', 'chatconversation', 'dealdone', 'alerta', 'notificaciones', 'sellerprofile', 'noticias', 'search']
    if (subScreens.includes(lower)) {
      historyRef.current.push({ screen: currentScreen, params })
    }

    setParams(p)
    const tabMap = {
      inicio: 'inicio', mercado: 'mercado', marketplace: 'mercado',
      servicios: 'servicios', events: 'eventos', eventos: 'eventos',
      chat: 'chat', chatlist: 'chat', comercios: 'comercios',
      alertas: 'alertas', perfil: 'perfil', profile: 'perfil',
    }

    if (lower === 'post' || lower === 'productdetail') {
      setCurrentScreen('productDetail')
    } else if (lower === 'chatconversation') {
      setCurrentScreen('chatConversation')
    } else if (lower === 'dealdone') {
      setCurrentScreen('dealDone')
    } else if (lower === 'alerta') {
      setCurrentScreen('alertaDetail')
    } else if (lower === 'notificaciones') {
      setCurrentScreen('notificaciones')
    } else if (lower === 'sellerprofile') {
      setCurrentScreen('sellerProfile')
    } else if (lower === 'noticias') {
      setCurrentScreen('noticiasScreen')
    } else if (lower === 'search') {
      setCurrentScreen('searchScreen')
    } else if (lower === 'chat' || lower === 'chatlist') {
      setActiveTab('chat')
      setCurrentScreen('main')
    } else if (tabMap[lower]) {
      setActiveTab(tabMap[lower])
      setCurrentScreen('main')
    } else {
      console.log(`Navegación a ${next} no implementada`)
    }

    requestAnimationFrame(() => {
      const el = document.getElementById('elbarrio-scroll')
      if (el) el.scrollTop = 0
    })
  }, [currentScreen, params])

  /* ── CREAR (post / commerce) ── */
  const onCrear = useCallback((type = null) => {
    setCreateType(type)
    setCreateOpen(true)
  }, [])

  const onCerrarCrear = useCallback(() => {
    setCreateOpen(false)
    setCreateType(null)
  }, [])

  const onPublicadoComercio = useCallback(() => {
    setCreateOpen(false)
    setCreateType(null)
    setCurrentScreen('main')
    setActiveTab('comercios')
  }, [])

  const onPublicado = useCallback(() => {
    setCreateOpen(false)
    setCreateType(null)
    setCurrentScreen('main')
    setActiveTab('inicio')
  }, [])

  const onChangeTab = useCallback((tabId) => {
    historyRef.current = []
    setActiveTab(tabId)
    setCurrentScreen('main')
    setParams({})
  }, [])

  /* ── SCREEN RENDER ── */
  const flowScreens = ['splash', 'onboarding', 'register', 'profile', 'verification', 'complete']
  const modalScreens = ['productDetail', 'chatConversation', 'dealDone', 'alertaDetail', 'notificaciones', 'sellerProfile', 'noticiasScreen', 'searchScreen']
  const isModalScreen = modalScreens.includes(currentScreen)
  const isMainApp = !flowScreens.includes(currentScreen) && !isModalScreen

  const renderScreen = () => {
    if (loading) {
      return (
        <div style={{
          height: '100%', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          background: C.fondo, fontFamily: T.font, gap: 12,
          flexDirection: 'column',
        }}>
          <div style={{ fontSize: 56 }}>🏘️</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.verde }}>el barrio</div>
        </div>
      )
    }

    /* ── LOGIN FLOW ── */
    if (currentScreen === 'splash') return <Splash onFinish={() => setCurrentScreen('onboarding')} />
    if (currentScreen === 'onboarding') return <Onboarding onFinish={() => setCurrentScreen('register')} />

    if (currentScreen === 'register') {
      return (
        <Register
          onFinish={async () => { await checkSession() }}
          onBack={() => setCurrentScreen('onboarding')}
        />
      )
    }

    if (currentScreen === 'profile') {
      return (
        <Profile
          onFinish={async () => {
            await recargarPerfil()
            setCurrentScreen('verification')
          }}
          onBack={handleLogout}
        />
      )
    }

    if (currentScreen === 'verification') {
      const isPending = !!profile?.address && profile?.verification_status !== 'verified'
      return (
        <Verification
          profile={profile}
          isPending={isPending}
          onFinish={async () => {
            await recargarPerfil()
            setCurrentScreen('complete')
          }}
          onBack={handleLogout}
          onLogout={handleLogout}
        />
      )
    }

    if (currentScreen === 'complete') {
      return <Complete onFinish={() => setCurrentScreen('main')} />
    }

    /* ── SUB-SCREENS DEL MERCADO ── */
    if (currentScreen === 'productDetail') {
      return <ProductDetail postId={params?.postId} currentUser={user} onNavigate={onNavigate} />
    }
    if (currentScreen === 'chatConversation') {
      return (
        <ChatConversation
          postId={params?.postId}
          sellerId={params?.sellerId || params?.otherUserId}
          currentUser={user}
          onNavigate={onNavigate}
        />
      )
    }
    if (currentScreen === 'dealDone') {
      return <DealDone postId={params?.postId} sellerId={params?.sellerId} currentUser={user} onNavigate={onNavigate} />
    }

    /* ── TASK 59: SUB-SCREENS NUEVAS (AlertaDetail, Notifications) ── */
    if (currentScreen === 'alertaDetail') {
      return (
        <AlertaDetail
          alertId={params?.id}
          currentUser={user}
          onNavigate={onNavigate}
        />
      )
    }
    if (currentScreen === 'notificaciones') {
      return <Notifications currentUser={user} onNavigate={onNavigate} />
    }
    if (currentScreen === 'sellerProfile') {
      return (
        <SellerProfile
          sellerId={params?.sellerId}
          currentUser={user}
          onNavigate={onNavigate}
        />
      )
    }
    if (currentScreen === 'noticiasScreen') {
      return <Noticias currentUser={user} onNavigate={onNavigate} />
    }

    /* ── Search ── */
    if (currentScreen === 'searchScreen') {
      return <Search currentUser={user} onNavigate={onNavigate} />
    }

    /* ── No hay user → Register ── */
    if (!user) {
      return <Register onFinish={() => checkSession()} onBack={() => setCurrentScreen('onboarding')} />
    }

    /* ── MAIN APP (TABS) ── */
    if (activeTab === 'inicio') return <Home currentUser={user} onNavigate={onNavigate} onCrear={onCrear} />
    if (activeTab === 'mercado') return <Marketplace currentUser={user} onNavigate={onNavigate} />
    if (activeTab === 'servicios') return <Services currentUser={user} onNavigate={onNavigate} />
    if (activeTab === 'eventos') return <Events currentUser={user} onNavigate={onNavigate} />
    if (activeTab === 'chat') return <ChatList currentUser={user} onNavigate={onNavigate} />
    if (activeTab === 'comercios') return <Comercios currentUser={user} onNavigate={onNavigate} onCrear={onCrear} />
    if (activeTab === 'alertas') return <Alertas currentUser={user} onNavigate={onNavigate} onCrear={onCrear} />
    if (activeTab === 'perfil') return <MyProfile currentUser={user} onLogout={handleLogout} />

    return <Home currentUser={user} onNavigate={onNavigate} onCrear={onCrear} />
  }

  return (
    <div className="phone-frame">
      <div className="phone-notch" />
      <div className="phone-content" style={isModalScreen ? s.contentPadModal : s.contentPad}>
        <div style={s.root}>
          <div id="elbarrio-scroll" style={s.screenArea}>
            {renderScreen()}
          </div>

          {isMainApp && user && (
            <TabBar
              activeTab={activeTab}
              onChangeTab={onChangeTab}
              onCrear={onCrear}
              noLeidos={noLeidos}
            />
          )}

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

/* ── ESTILOS ── */
const s = {
  contentPad: { paddingTop: 30, paddingBottom: 0 },
  /* modalScreens (chat, noticias, sellerprofile, productDetail, alertaDetail, search)
     controlan su propio safe-area-top dentro de su header. Acá NO agregamos
     padding superior, para que la pantalla llegue hasta el borde superior del
     teléfono (fix bug: "chat no llega hasta el top del teléfono"). */
  contentPadModal: { paddingTop: 0, paddingBottom: 0 },
  root: {
    width: '100%', height: '100%',
    background: C.fondo, fontFamily: T.font,
    position: 'relative', overflow: 'hidden',
    display: 'flex', flexDirection: 'column',
  },
  screenArea: {
    flex: 1, minHeight: 0, width: '100%',
    position: 'relative', overflow: 'hidden',
  },
  createOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 500, background: C.fondo,
  },
  placeholderWrap: {
    width: '100%', height: '100%',
    background: C.fondo, fontFamily: T.font,
    display: 'flex', flexDirection: 'column',
  },
  placeholderHeader: {
    background: C.card, padding: '28px 18px 12px',
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
}
