import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from './lib/supabase'
import { App as CapacitorApp } from '@capacitor/app'
import { finishNativeAuth, isNativeApp } from './lib/mobileAuth'
import { setupPushNotifications } from './lib/pushNotifications'
import { C, T } from './lib/design'
import './App.css'

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
import ServiceDetail from './screens/ServiceDetail'
import Events from './screens/Events'
import EventDetail from './screens/EventDetail'
import Notifications from './screens/Notifications'
import NotificationPreferences from './screens/NotificationPreferences'
import Search from './screens/Search'
import AlertaDetail from './screens/AlertaDetail'
import NeighborhoodMap from './screens/NeighborhoodMap'

/* ── TASK 62: pantallas nuevas (SellerProfile, Noticias) ── */
import SellerProfile from './screens/SellerProfile'
import Noticias from './screens/Noticias'

/* ── ADMIN PANEL: pantallas de administracion ── */
import Admin from './screens/Admin'
import AdminFarmacias from './screens/AdminFarmacias'
import AdminComercios from './screens/AdminComercios'
import AdminUsuarios from './screens/AdminUsuarios'
import AdminIncidentes from './screens/AdminIncidentes'
import { AboutUs, Terms, PrivacyPolicy, ProhibitedProducts, InviteNeighbors, ContactUs, SettingsHub, DeleteAccount } from './screens/CommunityPagesV2'

const ACCESSIBLE_MODE_KEY = 'elbarrio:accessible-mode'
const INVITE_CODE_KEY = 'elbarrio:pending-invite'
const PASSWORD_RECOVERY_KEY = 'elbarrio:password-recovery-pending'
const isPasswordRecoveryUrl = () => {
  const search = new URLSearchParams(window.location.search)
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  let pending = false
  try { pending = localStorage.getItem(PASSWORD_RECOVERY_KEY) === 'true' } catch { /* usa la URL */ }
  return window.location.pathname.endsWith('/recovery')
    || search.get('recovery') === 'password'
    || hash.get('type') === 'recovery'
    || pending
}

export default function App() {
  /* ── LOGIN FLOW STATE ── */
  const [currentScreen, setCurrentScreen] = useState('onboarding')
  const [bootSplashVisible, setBootSplashVisible] = useState(true)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [verificationDraft, setVerificationDraft] = useState(null)
  const [passwordRecovery, setPasswordRecovery] = useState(isPasswordRecoveryUrl)

  /* ── MAIN APP STATE ── */
  const [activeTab, setActiveTab] = useState('inicio')
  const [params, setParams] = useState({})
  const [createOpen, setCreateOpen] = useState(false)
  const [createType, setCreateType] = useState(null)
  const [editingPost, setEditingPost] = useState(null)
  const [homeRevision, setHomeRevision] = useState(0)
  const [eventsRevision, setEventsRevision] = useState(0)
  const [detailRevision, setDetailRevision] = useState(0)
  const [noLeidos, setNoLeidos] = useState(0)
  const [navigationMotion, setNavigationMotion] = useState('forward')
  const [accessibleMode, setAccessibleMode] = useState(() => {
    try { return localStorage.getItem(ACCESSIBLE_MODE_KEY) === 'true' } catch { return false }
  })
  const historyRef = useRef([])
  // Track del tab previo para que el back desde tabs con flecha (ej: perfil) funcione.
  // El perfil es un tab, no una sub-pantalla, así que no entra en historyRef.
  // Sin esto, el back desde el perfil no hace nada visible (activeTab sigue siendo 'perfil').
  const prevTabRef = useRef('inicio')
  const activeTabRef = useRef('inicio')

  // Mantiene activeTabRef sincronizado con activeTab para poder leerlo
  // dentro de useCallback sin agregarlo a las dependencias.
  useEffect(() => { activeTabRef.current = activeTab }, [activeTab])

  useEffect(() => {
    document.documentElement.classList.toggle('accessible-mode', accessibleMode)
    try { localStorage.setItem(ACCESSIBLE_MODE_KEY, String(accessibleMode)) } catch { /* almacenamiento no disponible */ }
  }, [accessibleMode])

  useEffect(() => {
    const inviteCode = new URLSearchParams(window.location.search).get('invite')?.trim().toUpperCase()
    if (inviteCode) {
      try { localStorage.setItem(INVITE_CODE_KEY, inviteCode) } catch { /* el vínculo permanece en la URL */ }
    }
  }, [])

  /* ── AUTH + checkSession (decide pantalla inicial según perfil) ── */
  const checkSession = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) {
      setUser(null)
      setProfile(null)
      setCurrentScreen('onboarding')
      setLoading(false)
      return
    }
    setUser({ id: session.user.id, email: session.user.email })

    if (isPasswordRecoveryUrl()) {
      setPasswordRecovery(true)
      setCurrentScreen('register')
      setLoading(false)
      return
    }

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
    const sessionTimer = window.setTimeout(checkSession, 0)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email })
        if (event === 'PASSWORD_RECOVERY') {
          setPasswordRecovery(true)
          setCurrentScreen('register')
          setLoading(false)
        } else if (event === 'SIGNED_IN') window.setTimeout(checkSession, 0)
      } else {
        setUser(null)
        setProfile(null)
      }
    })
    return () => {
      window.clearTimeout(sessionTimer)
      subscription.unsubscribe()
    }
  }, [checkSession])

  useEffect(() => {
    if (!isNativeApp()) return undefined
    let active = true
    let listener
    const processUrl = async (url) => {
      if (!url || !active) return
      try {
        const result = await finishNativeAuth(url)
        if (!result.handled || !active) return
        if (result.recovery) {
          setPasswordRecovery(true)
          setCurrentScreen('register')
          setLoading(false)
        } else {
          await checkSession()
        }
      } catch (error) {
        console.error('[auth] No pudimos completar el retorno nativo:', error)
      }
    }
    CapacitorApp.addListener('appUrlOpen', ({ url }) => processUrl(url)).then(handle => { listener = handle })
    CapacitorApp.getLaunchUrl().then(result => processUrl(result?.url))
    return () => { active = false; listener?.remove() }
  }, [checkSession])

  const userId = user?.id
  const recargarPerfil = useCallback(async () => {
    if (!userId) return null
    const { data: p } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
    setProfile(p || null)
    return p
  }, [userId])

  useEffect(() => {
    if (!user?.id) return undefined
    const channel = supabase
      .channel(`profile-access-${user.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `user_id=eq.${user.id}`,
      }, payload => setProfile(payload.new || null))
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user?.id])

  useEffect(() => {
    if (!user?.id || !profile?.id) return
    let inviteCode = new URLSearchParams(window.location.search).get('invite')?.trim().toUpperCase() || ''
    try { inviteCode = localStorage.getItem(INVITE_CODE_KEY) || inviteCode } catch { /* usa la URL */ }
    if (!inviteCode) return
    let active = true
    supabase.rpc('accept_neighbor_invite', { p_invite_code: inviteCode }).then(({ error }) => {
      if (!active) return
      const terminalError = /no es válida|propia invitación/i.test(error?.message || '')
      if (!error || terminalError) {
        try { localStorage.removeItem(INVITE_CODE_KEY) } catch { /* almacenamiento no disponible */ }
        const url = new URL(window.location.href)
        url.searchParams.delete('invite')
        window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
      }
    })
    return () => { active = false }
  }, [user?.id, profile?.id])

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut()
    try { localStorage.removeItem(PASSWORD_RECOVERY_KEY) } catch { /* no bloquea la salida */ }
    setUser(null)
    setProfile(null)
    setVerificationDraft(null)
    setPasswordRecovery(false)
    setActiveTab('inicio')
    setCurrentScreen('onboarding')
    setBootSplashVisible(true)
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
      } catch {
        // El contador se recupera en el próximo evento o al volver a montar.
      }
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
  const performInternalBack = useCallback(() => {
    setNavigationMotion('back')
    const prev = historyRef.current.pop()
    if (prev) {
      if (prev.tab) setActiveTab(prev.tab)
      setCurrentScreen(prev.screen || 'main')
      setParams(prev.params || {})
      return
    }
    setCurrentScreen('main')
    const currentTab = activeTabRef.current
    if (currentTab && currentTab !== 'inicio') {
      const fallback = prevTabRef.current && prevTabRef.current !== currentTab
        ? prevTabRef.current
        : 'inicio'
      setActiveTab(fallback)
    }
  }, [])

  const onNavigate = useCallback((next, p = {}) => {
    const lower = typeof next === 'string' ? next.toLowerCase() : next

    if (lower === 'back') {
      if (!isNativeApp() && window.history.state?.elBarrioNavigation) {
        window.history.back()
      } else {
        performInternalBack()
      }
      return
    }
    if (lower === 'home') {
      setNavigationMotion('back')
      historyRef.current = []
      setActiveTab('inicio')
      setCurrentScreen('main')
      setParams({})
      return
    }

    const subScreens = ['post', 'productdetail', 'servicedetail', 'eventdetail', 'chatconversation', 'dealdone', 'alerta', 'notificaciones', 'notificationpreferences', 'search', 'mapa', 'sellerprofile', 'noticias', 'admin', 'adminfarmacias', 'admincomercios', 'adminusuarios', 'adminincidentes', 'settings', 'editprofile', 'about', 'terms', 'privacy', 'prohibited', 'invite', 'contact', 'deleteaccount']
    if (subScreens.includes(lower)) {
      setNavigationMotion('forward')
      historyRef.current.push({ screen: currentScreen, tab: activeTabRef.current, params })
      if (!isNativeApp()) window.history.pushState({ elBarrioNavigation: true }, '', window.location.href)
    }

    setParams(p)
    const tabMap = {
      inicio: 'inicio', mercado: 'mercado', marketplace: 'mercado',
      servicios: 'servicios', events: 'eventos', eventos: 'eventos',
      chat: 'chat', chatlist: 'chat', comercios: 'comercios',
      alertas: 'alertas', perfil: 'perfil', profile: 'perfil',
    }
    if (tabMap[lower] && tabMap[lower] !== activeTabRef.current && !isNativeApp()) {
      window.history.pushState({ elBarrioNavigation: true }, '', window.location.href)
    }

    if (lower === 'post' || lower === 'productdetail') {
      setCurrentScreen('productDetail')
    } else if (lower === 'servicedetail') {
      setCurrentScreen('serviceDetail')
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
    } else if (lower === 'notificationpreferences') {
      setCurrentScreen('notificationPreferences')
    } else if (lower === 'search') {
      setCurrentScreen('search')
    } else if (lower === 'mapa') {
      setCurrentScreen('neighborhoodMap')
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
    } else if (lower === 'editprofile' || lower === 'editarperfil') {
      setCurrentScreen('editProfile')
    } else if (lower === 'about' || lower === 'nosotros') {
      setCurrentScreen('about')
    } else if (lower === 'terms' || lower === 'terminos') {
      setCurrentScreen('terms')
    } else if (lower === 'privacy' || lower === 'privacidad') {
      setCurrentScreen('privacy')
    } else if (lower === 'prohibited' || lower === 'productosprohibidos') {
      setCurrentScreen('prohibited')
    } else if (lower === 'invite' || lower === 'invitar') {
      setCurrentScreen('invite')
    } else if (lower === 'contact' || lower === 'contactanos') {
      setCurrentScreen('contact')
    } else if (lower === 'deleteaccount' || lower === 'eliminarcuenta') {
      setCurrentScreen('deleteAccount')
    } else if (lower === 'chat' || lower === 'chatlist') {
      setNavigationMotion('tab')
      if (activeTabRef.current !== 'chat') prevTabRef.current = activeTabRef.current
      setActiveTab('chat')
      setCurrentScreen('main')
    } else if (tabMap[lower]) {
      setNavigationMotion('tab')
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
  }, [currentScreen, params, performInternalBack])

  useEffect(() => {
    if (isNativeApp()) return undefined
    const handleBrowserBack = () => performInternalBack()
    window.addEventListener('popstate', handleBrowserBack)
    return () => window.removeEventListener('popstate', handleBrowserBack)
  }, [performInternalBack])

  useEffect(() => {
    if (!profile?.id || !isNativeApp()) return undefined
    let disposed = false
    let cleanup = () => {}
    setupPushNotifications({
      onOpen: data => {
        if (data?.screen === 'notificaciones') onNavigate('notificaciones')
        else onNavigate('notificaciones')
      },
    }).then(removeListeners => {
      if (disposed) removeListeners()
      else cleanup = removeListeners
    }).catch(error => console.warn('[push] inicialización falló:', error?.message || error))
    return () => { disposed = true; cleanup() }
  }, [profile?.id, onNavigate])

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

  /* Android: el botón/gesto Atrás debe recorrer la navegación interna.
     Solo permite salir cuando el vecino ya está en Inicio. */
  useEffect(() => {
    if (!isNativeApp()) return undefined
    let listener
    CapacitorApp.addListener('backButton', () => {
      if (createOpen) {
        onCerrarCrear()
        return
      }

      if (currentScreen === 'main') {
        if (activeTab !== 'inicio') onNavigate('home')
        else CapacitorApp.exitApp()
        return
      }

      if (currentScreen === 'register') {
        setCurrentScreen('onboarding')
        return
      }
      if (currentScreen === 'profile') {
        setCurrentScreen('register')
        return
      }
      if (currentScreen === 'verification') {
        setCurrentScreen('profile')
        return
      }
      if (currentScreen === 'splash' || currentScreen === 'onboarding') {
        CapacitorApp.exitApp()
        return
      }

      onNavigate('back')
    }).then(handle => { listener = handle })
    return () => { listener?.remove() }
  }, [activeTab, createOpen, currentScreen, onCerrarCrear, onNavigate])

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
    else {
      setHomeRevision(value => value + 1)
      setActiveTab('inicio')
    }
  }, [])

  const onActualizado = useCallback(() => {
    setCreateOpen(false)
    setCreateType(null)
    setEditingPost(null)
    setDetailRevision(value => value + 1)
  }, [])

  const onChangeTab = useCallback((tabId) => {
    // Track del tab previo para que el back desde tabs con flecha (perfil) vuelva aquí.
    const current = activeTabRef.current
    if (tabId !== current) {
      prevTabRef.current = current
      if (!isNativeApp()) window.history.pushState({ elBarrioNavigation: true }, '', window.location.href)
    }
    historyRef.current = []
    setNavigationMotion('tab')
    setActiveTab(tabId)
    setCurrentScreen('main')
    setParams({})
  }, [])

  /* ── SCREEN RENDER ── */
  const flowScreens = ['splash', 'onboarding', 'register', 'profile', 'verification', 'complete']
  const modalScreens = ['productDetail', 'serviceDetail', 'chatConversation', 'dealDone', 'alertaDetail', 'notificaciones', 'neighborhoodMap', 'sellerProfile', 'noticiasScreen', 'admin', 'adminFarmacias', 'adminComercios', 'adminUsuarios', 'adminIncidentes', 'settings', 'editProfile', 'about', 'terms', 'privacy', 'prohibited', 'invite', 'contact', 'deleteAccount']
  const isModalScreen = modalScreens.includes(currentScreen)
  const isCommunityScreen = ['settings', 'editProfile', 'about', 'terms', 'privacy', 'prohibited', 'invite', 'contact', 'deleteAccount'].includes(currentScreen)
  const isMainApp = !flowScreens.includes(currentScreen) && !isModalScreen
  const screenIdentity = currentScreen === 'main'
    ? `main-${activeTab}`
    : `${currentScreen}-${params?.postId || params?.id || params?.sellerId || ''}-${detailRevision}`

  const renderScreen = () => {
    if (bootSplashVisible) {
      return <Splash onFinish={() => setBootSplashVisible(false)} />
    }

    if (loading) {
      return (
        <div style={{
          height: '100%', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          background: C.fondo, fontFamily: T.font, gap: 12,
          flexDirection: 'column',
        }}>
          <img src={`${import.meta.env.BASE_URL}icons/icon-192.webp`} alt="" style={{ width: 66, height: 66, borderRadius: 18 }} />
          <div style={{ fontSize: 22, fontWeight: 700, color: C.verde }}>el barrio</div>
        </div>
      )
    }

    if (profile?.account_status === 'suspended') {
      return (
        <div style={{ height: '100%', padding: 30, display: 'grid', placeContent: 'center', justifyItems: 'center', gap: 14, color: C.texto, background: C.fondo, fontFamily: T.font, textAlign: 'center' }}>
          <div style={{ fontSize: 48 }}>🔒</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>Tu cuenta está suspendida</div>
          <div style={{ maxWidth: 310, color: C.textoSuave, fontSize: 14, lineHeight: 1.55 }}>No puedes utilizar El Barrio mientras revisamos tu cuenta. Contacta a soporte si necesitas ayuda.</div>
          <button type="button" onClick={handleLogout} style={{ marginTop: 8, minHeight: 44, padding: '0 22px', border: 0, borderRadius: 12, color: '#fff', background: C.verde, fontWeight: 700 }}>Cerrar sesión</button>
        </div>
      )
    }

    /* ── LOGIN FLOW ── */
    if (currentScreen === 'splash') return <Splash onFinish={() => setCurrentScreen('onboarding')} />
    if (currentScreen === 'onboarding') return <Onboarding onFinish={() => setCurrentScreen('register')} />

    if (currentScreen === 'register') {
      return (
        <Register
          existingAccount={!!user}
          initialEmail={user?.email || ''}
          recoveryMode={passwordRecovery}
          onFinish={async () => { setPasswordRecovery(false); await checkSession() }}
          onBack={passwordRecovery ? handleLogout : () => setCurrentScreen('onboarding')}
          onLogout={handleLogout}
          onNavigate={onNavigate}
        />
      )
    }

    if (currentScreen === 'profile') {
      return (
        <Profile
          onFinish={async () => {
            const updatedProfile = await recargarPerfil()
            setCurrentScreen(updatedProfile?.verification_status === 'verified' ? 'main' : 'verification')
          }}
          onBack={() => setCurrentScreen('register')}
        />
      )
    }

    if (currentScreen === 'verification') {
      const isPending = !!profile?.address && profile?.verification_status !== 'verified'
      return (
        <Verification
          profile={profile}
          draft={verificationDraft}
          onDraftChange={setVerificationDraft}
          isPending={isPending}
          onFinish={async () => {
            await recargarPerfil()
            setVerificationDraft(null)
            setCurrentScreen('complete')
          }}
          onBack={async () => {
            await recargarPerfil()
            setCurrentScreen('profile')
          }}
          onLogout={handleLogout}
        />
      )
    }

    if (currentScreen === 'complete') {
      return <Complete onFinish={() => setCurrentScreen('main')} />
    }

    /* ── SUB-SCREENS DEL MERCADO ── */
    if (currentScreen === 'productDetail') {
      return (
        <ProductDetail
          postId={params?.postId}
          currentUser={{
            ...user,
            profileId: profile?.id,
            neighborhoodId: profile?.neighborhood_id,
            full_name: profile?.full_name,
            avatar_url: profile?.avatar_url,
          }}
          onNavigate={onNavigate}
          onEdit={onEditarPost}
        />
      )
    }
    if (currentScreen === 'serviceDetail') {
      return (
        <ServiceDetail
          postId={params?.postId}
          currentUser={{
            ...user,
            profileId: profile?.id,
            neighborhoodId: profile?.neighborhood_id,
          }}
          onNavigate={onNavigate}
          onEdit={onEditarPost}
        />
      )
    }
    if (currentScreen === 'eventDetail') {
      return (
        <EventDetail
          postId={params?.postId}
          neighborhoodId={profile?.neighborhood_id}
          profileId={profile?.id}
          onNavigate={onNavigate}
        />
      )
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
          currentUser={{ ...user, neighborhoodId: profile?.neighborhood_id }}
          onNavigate={onNavigate}
          onEdit={onEditarPost}
        />
      )
    }
    if (currentScreen === 'notificaciones') {
      return <Notifications currentUser={{ ...user, profileId: profile?.id }} onNavigate={onNavigate} />
    }
    if (currentScreen === 'notificationPreferences') return <NotificationPreferences profileId={profile?.id} onNavigate={onNavigate} />
    if (currentScreen === 'search') return <Search currentUser={{ ...user, profileId: profile?.id, neighborhoodId: profile?.neighborhood_id }} onNavigate={onNavigate} />
    if (currentScreen === 'neighborhoodMap') {
      return <NeighborhoodMap currentUser={user} neighborhoodId={profile?.neighborhood_id} onNavigate={onNavigate} />
    }
    if (currentScreen === 'sellerProfile') {
      return (
        <SellerProfile
          sellerId={params?.sellerId}
          currentUser={{ ...user, neighborhoodId: profile?.neighborhood_id }}
          onNavigate={onNavigate}
        />
      )
    }
    if (currentScreen === 'noticiasScreen') {
      return (
        <Noticias
          currentUser={{ ...user, neighborhoodId: profile?.neighborhood_id }}
          onNavigate={onNavigate}
          initialNewsId={params?.newsId || null}
        />
      )
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
    if (currentScreen === 'settings') return <SettingsHub onNavigate={onNavigate} accessibleMode={accessibleMode} onAccessibleModeChange={setAccessibleMode} />
    if (currentScreen === 'editProfile') return <Profile editMode onBack={() => onNavigate('back')} onFinish={async () => { await checkSession(); onNavigate('back') }} />
    if (currentScreen === 'about') return <AboutUs onNavigate={onNavigate} />
    if (currentScreen === 'terms') return <Terms onNavigate={onNavigate} />
    if (currentScreen === 'privacy') return <PrivacyPolicy onNavigate={onNavigate} />
    if (currentScreen === 'prohibited') return <ProhibitedProducts onNavigate={onNavigate} />
    if (currentScreen === 'invite') return <InviteNeighbors onNavigate={onNavigate} profile={profile} />
    if (currentScreen === 'contact') return <ContactUs onNavigate={onNavigate} />
    if (currentScreen === 'deleteAccount') return <DeleteAccount onNavigate={onNavigate} onDeleted={handleLogout} />

    /* ── No hay user → Register ── */
    if (!user) {
      return <Register onFinish={() => checkSession()} onBack={() => setCurrentScreen('onboarding')} onNavigate={onNavigate} />
    }

    /* ── MAIN APP (TABS) ── */
    if (activeTab === 'inicio') return <Home key={`home-${homeRevision}`} currentUser={user} onNavigate={onNavigate} onCrear={onCrear} />
    if (activeTab === 'mercado') {
      return (
        <Marketplace
          currentUser={{
            ...user,
            profileId: profile?.id,
            neighborhoodId: profile?.neighborhood_id,
          }}
          onNavigate={onNavigate}
          onCrear={onCrear}
        />
      )
    }
    if (activeTab === 'servicios') {
      return (
        <Services
          currentUser={{
            ...user,
            profileId: profile?.id,
            neighborhoodId: profile?.neighborhood_id,
          }}
          onNavigate={onNavigate}
          onCrear={onCrear}
        />
      )
    }
    if (activeTab === 'eventos') return <Events key={`events-${eventsRevision}`} currentUser={user} onNavigate={onNavigate} onCrear={onCrear} />
    if (activeTab === 'chat') return <ChatList currentUser={{ ...user, profileId: profile?.id }} onNavigate={onNavigate} />
    if (activeTab === 'comercios') {
      return (
        <Comercios
          currentUser={{ ...user, profileData: profile }}
          onNavigate={onNavigate}
          onCrear={onCrear}
          initialCommerceId={params?.commerceId}
        />
      )
    }
    if (activeTab === 'alertas') return <Alertas currentUser={user} onNavigate={onNavigate} onCrear={onCrear} />
    if (activeTab === 'perfil') return (
      <MyProfile
        currentUser={user}
        profile={profile}
        onNavigate={onNavigate}
        onLogout={handleLogout}
        accessibleMode={accessibleMode}
        onAccessibleModeChange={setAccessibleMode}
      />
    )
    
    return <Home key={`home-${homeRevision}`} currentUser={user} onNavigate={onNavigate} onCrear={onCrear} />
  }

  return (
    <div className="phone-frame">
      <div className="phone-notch" />
      <div className="phone-content" style={isCommunityScreen ? s.contentPad : (isModalScreen ? s.contentPadModal : s.contentPad)}>
        <div style={s.root}>
          <div id="elbarrio-scroll" style={s.screenArea}>
            <div
              key={screenIdentity}
              className={`app-screen-transition app-screen-transition--${navigationMotion}`}
            >
              {renderScreen()}
            </div>
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
            <div className="app-create-transition" style={s.createOverlay}>
              <CommerceForm
                neighborhoodId={profile?.neighborhood_id}
                onClose={onCerrarCrear}
                onSaved={onPublicadoComercio}
              />
            </div>
          )}

          {createOpen && createType !== 'commerce' && (
            <div className="app-create-transition" style={s.createOverlay}>
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
  contentPad: { paddingTop: 0, paddingBottom: 0 },
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
