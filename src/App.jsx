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
import EventDetail from './screens/EventDetail'
import Notifications from './screens/Notifications'
import AlertaDetail from './screens/AlertaDetail'

/* ── TASK 62: pantallas nuevas (SellerProfile, Noticias) ── */
import SellerProfile from './screens/SellerProfile'
import Noticias from './screens/Noticias'

/* ── ADMIN PANEL: pantallas de administracion ── */
import Admin from './screens/Admin'
import AdminFarmacias from './screens/AdminFarmacias'
import AdminComercios from './screens/AdminComercios'
import AdminUsuarios from './screens/AdminUsuarios'
import AdminIncidentes from './screens/AdminIncidentes'
import { AboutUs, Terms, ProhibitedProducts, InviteNeighbors, ContactUs, SettingsHub } from './screens/CommunityPagesV2'

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
  const [editingPost, setEditingPost] = useState(null)
  const [eventsRevision, setEventsRevision] = useState(0)
  const [noLeidos, setNoLeidos] = useState(0)
  const historyRef = useRef([])
  // Track del tab previo para que el back desde tabs con flecha (ej: perfil) funcione.
  // El perfil es un tab, no una sub-pantalla, así que no entra en historyRef.
  // Sin esto, el back desde el perfil no hace nada visible (activeTab sigue siendo 'perfil').
  const prevTabRef = useRef('inicio')
  const activeTabRef = useRef('inicio')

  // Mantiene activeTabRef sincronizado con activeTab para poder leerlo
  // dentro de useCallback sin agregarlo a las dependencias.
  useEffect(() => { activeTabRef.current = activeTab }, [activeTab])

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
    prevTabRef.current = 'inicio'
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
        if (prev.tab) setActiveTab(prev.tab)
        setCurrentScreen(prev.screen || 'main')
        setParams(prev.params || {})
      } else {
        // Sin sub-pantalla en historial: si estamos en un tab con flecha back
        // (ej: perfil), volver al tab previo para que el back sea efectivo.
        // Sin esto, el back desde el perfil no cambia nada visible porque
        // currentScreen ya era 'main' y activeTab seguía siendo 'perfil'.
        setCurrentScreen('main')
        const currentTab = activeTabRef.current
        if (currentTab && currentTab !== 'inicio') {
          const fallback = prevTabRef.current && prevTabRef.current !== currentTab
            ? prevTabRef.current
            : 'inicio'
          setActiveTab(fallback)
        }
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

    const subScreens = ['post', 'productdetail', 'eventdetail', 'chatconversation', 'dealdone', 'alerta', 'notificaciones', 'sellerprofile', 'noticias', 'admin', 'adminfarmacias', 'admincomercios', 'adminusuarios', 'adminincidentes', 'settings', 'about', 'terms', 'prohibited', 'invite', 'contact']
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
    } else if (lower === 'eventdetail') {
      setCurrentScreen('eventDetail')
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
    } else if (lower === 'admin') {
      setCurrentScreen('admin')
    } else if (lower === 'adminfarmacias') {
      setCurrentScreen('adminFarmacias')
    } else if (lower === 'admincomercios') {
      setCurrentScreen('adminComercios')
    } else if (lower === 'adminusuarios') {
      setCurrentScreen('adminUsuarios')
    } else if (lower === 'adminincidentes') {
      setCurrentScreen('adminIncidentes')
    } else if (lower === 'settings') {
      setCurrentScreen('settings')
    } else if (lower === 'about' || lower === 'nosotros') {
      setCurrentScreen('about')
    } else if (lower === 'terms' || lower === 'terminos') {
      setCurrentScreen('terms')
    } else if (lower === 'prohibited' || lower === 'productosprohibidos') {
      setCurrentScreen('prohibited')
    } else if (lower === 'invite' || lower === 'invitar') {
      setCurrentScreen('invite')
    } else if (lower === 'contact' || lower === 'contactanos') {
      setCurrentScreen('contact')
    } else if (lower === 'chat' || lower === 'chatlist') {
      if (activeTabRef.current !== 'chat') prevTabRef.current = activeTabRef.current
      setActiveTab('chat')
      setCurrentScreen('main')
    } else if (tabMap[lower]) {
      if (activeTabRef.current !== tabMap[lower]) prevTabRef.current = activeTabRef.current
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
    setEditingPost(null)
    setCreateType(type)
    setCreateOpen(true)
  }, [])

  const onEditarPost = useCallback((post) => {
    setEditingPost(post)
    setCreateType(post?.type || null)
    setCreateOpen(true)
  }, [])

  const onCerrarCrear = useCallback(() => {
    setCreateOpen(false)
    setCreateType(null)
    setEditingPost(null)
  }, [])

  const onPublicadoComercio = useCallback(() => {
    setCreateOpen(false)
    setCreateType(null)
    setCurrentScreen('main')
    setActiveTab('comercios')
  }, [])

  const onPublicado = useCallback((publishedType) => {
    setCreateOpen(false)
    setCreateType(null)
    setEditingPost(null)
    setCurrentScreen('main')
    if (publishedType === 'event') {
      setEventsRevision(value => value + 1)
      setActiveTab('eventos')
    }
    else if (publishedType === 'service') setActiveTab('servicios')
    else if (['sell', 'gift', 'trade'].includes(publishedType)) setActiveTab('mercado')
    else setActiveTab('inicio')
  }, [])

  const onActualizado = useCallback(() => {
    setCreateOpen(false)
    setCreateType(null)
    setEditingPost(null)
  }, [])

  const onChangeTab = useCallback((tabId) => {
    // Track del tab previo para que el back desde tabs con flecha (perfil) vuelva aquí.
    const current = activeTabRef.current
    if (tabId !== current) {
      prevTabRef.current = current
    }
    historyRef.current = []
    setActiveTab(tabId)
    setCurrentScreen('main')
    setParams({})
  }, [])

  /* ── SCREEN RENDER ── */
  const flowScreens = ['splash', 'onboarding', 'register', 'profile', 'verification', 'complete']
  const modalScreens = ['productDetail', 'chatConversation', 'dealDone', 'alertaDetail', 'notificaciones', 'sellerProfile', 'noticiasScreen', 'admin', 'adminFarmacias', 'adminComercios', 'adminUsuarios', 'adminIncidentes', 'settings', 'about', 'terms', 'prohibited', 'invite', 'contact']
  const isModalScreen = modalScreens.includes(currentScreen)
  const isCommunityScreen = ['settings', 'about', 'terms', 'prohibited', 'invite', 'contact'].includes(currentScreen)
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
      return <ProductDetail postId={params?.postId} currentUser={user} onNavigate={onNavigate} onEdit={onEditarPost} />
    }
    if (currentScreen === 'eventDetail') {
      return <EventDetail postId={params?.postId} currentUser={user} onNavigate={onNavigate} />
    }
    if (currentScreen === 'chatConversation') {
      return (
        <ChatConversation
          postId={params?.postId}
          sellerId={params?.sellerId || params?.otherUserId}
          currentUser={{ ...user, profileId: profile?.id }}
          previewMode={params?.preview === true}
          onNavigate={onNavigate}
        />
      )
    }
    if (currentScreen === 'dealDone') {
      return <DealDone postId={params?.postId} sellerId={params?.sellerId} currentUser={{ ...user, profileId: profile?.id }} onNavigate={onNavigate} />
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

    /* ── ADMIN PANEL: pantallas de administracion ── */
    if (currentScreen === 'admin') {
      return <Admin currentUser={user} profile={profile} onNavigate={onNavigate} onLogout={handleLogout} />
    }
    if (currentScreen === 'adminFarmacias') {
      return <AdminFarmacias currentUser={user} profile={profile} onNavigate={onNavigate} />
    }
    if (currentScreen === 'adminComercios') {
      return <AdminComercios currentUser={user} profile={profile} onNavigate={onNavigate} />
    }
    if (currentScreen === 'adminUsuarios') {
      return <AdminUsuarios currentUser={user} profile={profile} onNavigate={onNavigate} />
    }
    if (currentScreen === 'adminIncidentes') {
      return <AdminIncidentes currentUser={user} profile={profile} onNavigate={onNavigate} />
    }
    if (currentScreen === 'settings') return <SettingsHub onNavigate={onNavigate} />
    if (currentScreen === 'about') return <AboutUs onNavigate={onNavigate} />
    if (currentScreen === 'terms') return <Terms onNavigate={onNavigate} />
    if (currentScreen === 'prohibited') return <ProhibitedProducts onNavigate={onNavigate} />
    if (currentScreen === 'invite') return <InviteNeighbors onNavigate={onNavigate} />
    if (currentScreen === 'contact') return <ContactUs onNavigate={onNavigate} />

    /* ── No hay user → Register ── */
    if (!user) {
      return <Register onFinish={() => checkSession()} onBack={() => setCurrentScreen('onboarding')} />
    }

    /* ── MAIN APP (TABS) ── */
    if (activeTab === 'inicio') return <Home currentUser={user} onNavigate={onNavigate} onCrear={onCrear} />
    if (activeTab === 'mercado') return <Marketplace currentUser={user} onNavigate={onNavigate} onCrear={onCrear} />
    if (activeTab === 'servicios') return <Services currentUser={user} onNavigate={onNavigate} onCrear={onCrear} />
    if (activeTab === 'eventos') return <Events key={`events-${eventsRevision}`} currentUser={user} onNavigate={onNavigate} onCrear={onCrear} />
    if (activeTab === 'chat') return <ChatList currentUser={{ ...user, profileId: profile?.id }} onNavigate={onNavigate} />
    if (activeTab === 'comercios') return <Comercios currentUser={user} onNavigate={onNavigate} onCrear={onCrear} />
    if (activeTab === 'alertas') return <Alertas currentUser={user} onNavigate={onNavigate} onCrear={onCrear} />
    if (activeTab === 'perfil') return <MyProfile currentUser={user} onNavigate={onNavigate} onLogout={handleLogout} />
    
    return <Home currentUser={user} onNavigate={onNavigate} onCrear={onCrear} />
  }

  return (
    <div className="phone-frame">
      <div className="phone-notch" />
      <div className="phone-content" style={isCommunityScreen ? s.contentPad : (isModalScreen ? s.contentPadModal : s.contentPad)}>
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
              showCreateButton={activeTab !== 'comercios'}
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
                existingPost={editingPost}
                onClose={onCerrarCrear}
                onPublished={editingPost ? onActualizado : onPublicado}
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
  /* modalScreens (chat, noticias, sellerprofile, productDetail, alertaDetail)
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
