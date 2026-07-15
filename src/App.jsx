import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Splash from './screens/Splash'
import Onboarding from './screens/Onboarding'
import Register from './screens/Register'
import Profile from './screens/Profile'
import Verification from './screens/Verification'
import Complete from './screens/Complete'
import Feed from './screens/Feed'
import MyProfile from './screens/MyProfile'
import Marketplace from './screens/Marketplace'
import ProductDetail from './screens/ProductDetail'
import ChatConversation from './screens/ChatConversation'
import DealDone from './screens/DealDone'
import CreatePost from './screens/CreatePost'
import TabBar from './components/TabBar'
import Barrio from './screens/Barrio'
import ChatList from './screens/ChatList'

const Icon = {
  Building: ({ size = 34, color = '#9ca3af' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M10 22v-4h4v4" />
    </svg>
  ),
  Message: ({ size = 34, color = '#9ca3af' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  Alert: ({ size = 34, color = '#9ca3af' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
}

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('splash')
  const [activeTab, setActiveTab] = useState('feed')
  const [selectedPostId, setSelectedPostId] = useState(null)
  const [selectedSellerId, setSelectedSellerId] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    checkSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setCurrentUser({ id: session.user.id, email: session.user.email })
      } else {
        setCurrentUser(null)
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  /* ============================================================
     DECIDE DÓNDE ENTRA EL USUARIO SEGÚN EL ESTADO DE SU PERFIL.
     Antes se iba directo a 'main' con solo tener sesión: se podía
     entrar a la app sin nombre, sin RUT y sin verificar.
     ============================================================ */
  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      setCurrentScreen('splash')
      setLoading(false)
      return
    }

    setCurrentUser({ id: session.user.id, email: session.user.email })

    const { data: p } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', session.user.id)
      .maybeSingle()

    setProfile(p || null)

    // Falta completar los datos personales
    if (!p || !p.full_name || !p.rut) {
      setCurrentScreen('profile')
    }
    // Datos listos, pero la ubicación no está confirmada → puerta cerrada
    else if (p.verification_status !== 'verified') {
      setCurrentScreen('verification')
    }
    // Todo listo
    else {
      setCurrentScreen('main')
    }

    setLoading(false)
  }

  const recargarPerfil = async () => {
    if (!currentUser?.id) return null
    const { data: p } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', currentUser.id)
      .maybeSingle()
    setProfile(p || null)
    return p
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setCurrentUser(null)
    setProfile(null)
    setActiveTab('feed')
    setCurrentScreen('splash')
  }

  const flowScreens = ['splash', 'onboarding', 'register', 'profile', 'verification', 'complete']
  const modalScreens = ['productDetail', 'chatConversation', 'dealDone']
  const isMainApp = !flowScreens.includes(currentScreen) && !modalScreens.includes(currentScreen)

  const onNavigate = (screen, params = {}) => {
    if (screen === 'ProductDetail' && params.postId) {
      setSelectedPostId(params.postId)
      setCurrentScreen('productDetail')
    } else if (screen === 'Chat' && params.postId && params.sellerId) {
      setSelectedPostId(params.postId)
      setSelectedSellerId(params.sellerId)
      setCurrentScreen('chatConversation')
    } else if (screen === 'ChatConversation') {
      setSelectedPostId(params.postId || null)
      setSelectedSellerId(params.otherUserId)
      setCurrentScreen('chatConversation')
    } else if (screen === 'DealDone') {
      setSelectedPostId(params.postId)
      setSelectedSellerId(params.sellerId)
      setCurrentScreen('dealDone')
    } else if (screen === 'Perfil') {
      setActiveTab('profile')
      setCurrentScreen('main')
    } else if (screen === 'back') {
      if (currentScreen === 'dealDone') setCurrentScreen('chatConversation')
      else if (currentScreen === 'chatConversation') setCurrentScreen('productDetail')
      else setCurrentScreen('main')
    } else if (screen === 'home') {
      setActiveTab('feed')
      setCurrentScreen('main')
      setSelectedPostId(null)
      setSelectedSellerId(null)
    } else {
      console.log(`Navegación a ${screen} no implementada`)
    }
  }

  const renderScreen = () => {
    if (loading) {
      return (
        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4f7f4' }}>
          <img src="/isotipo.png" alt="" style={{ width: 60, opacity: 0.5 }} />
        </div>
      )
    }

    if (currentScreen === 'splash') return <Splash onFinish={() => setCurrentScreen('onboarding')} />
    if (currentScreen === 'onboarding') return <Onboarding onFinish={() => setCurrentScreen('register')} />

    if (currentScreen === 'register') {
      return (
        <Register
          onFinish={async () => {
            // checkSession decide sola dónde entra:
            //   sin datos  -> profile
            //   sin verificar -> verification (cuenta en espera)
            //   verificado -> main
            await checkSession()
          }}
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
      // isPending = ya se había registrado antes y volvió sin verificar
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

    if (currentScreen === 'productDetail') return <ProductDetail postId={selectedPostId} currentUser={currentUser} onNavigate={onNavigate} />
    if (currentScreen === 'chatConversation') return <ChatConversation postId={selectedPostId} sellerId={selectedSellerId} currentUser={currentUser} onNavigate={onNavigate} />
    if (currentScreen === 'dealDone') return <DealDone postId={selectedPostId} sellerId={selectedSellerId} currentUser={currentUser} onNavigate={onNavigate} />

    if (!currentUser) {
      return <Register onFinish={() => checkSession()} onBack={() => setCurrentScreen('onboarding')} />
    }

    if (activeTab === 'feed') return <Feed currentUser={currentUser} onNavigate={onNavigate} />
    if (activeTab === 'barrio') return <Barrio currentUser={currentUser} onNavigate={onNavigate} />
    if (activeTab === 'marketplace') return <Marketplace currentUser={currentUser} onNavigate={onNavigate} />
    if (activeTab === 'chat') return <ChatList currentUser={currentUser} onNavigate={onNavigate} />
    if (activeTab === 'profile') return <MyProfile currentUser={currentUser} onLogout={handleLogout} />

    return <PlaceholderScreen title="Pantalla no encontrada" icon="alert" />
  }

  return (
    <div className="phone-frame">
      <div className="phone-notch"></div>

      <div className="phone-content">{renderScreen()}</div>

      {isMainApp && currentUser && (
        <TabBar
          activeTab={activeTab}
          onChangeTab={setActiveTab}
          onPublish={() => setShowCreate(true)}
        />
      )}

      {showCreate && (
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          background: '#f4f7f4',
          zIndex: 9999,
          overflow: 'hidden',
        }}>
          <CreatePost
            onClose={() => setShowCreate(false)}
            onPublished={() => setShowCreate(false)}
          />
        </div>
      )}

      <div className="phone-home-indicator"></div>
    </div>
  )
}

function PlaceholderScreen({ title, icon = 'alert' }) {
  const iconMap = {
    building: <Icon.Building />,
    message: <Icon.Message />,
    alert: <Icon.Alert />,
  }

  return (
    <div style={s.wrap}>
      <div style={s.iconBox}>{iconMap[icon] || <Icon.Alert />}</div>
      <h2 style={s.title}>{title}</h2>
      <p style={s.text}>Próximamente</p>
    </div>
  )
}

const s = {
  wrap: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: 40,
    backgroundColor: '#f4f7f4',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  iconBox: {
    width: 74,
    height: 74,
    borderRadius: 22,
    backgroundColor: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    marginBottom: 18,
  },
  title: { fontSize: 22, fontWeight: 800, margin: 0, marginBottom: 8, color: '#111' },
  text: { color: '#6b7280', fontSize: 14, margin: 0 },
}