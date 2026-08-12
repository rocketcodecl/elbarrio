import { useCallback, useEffect, useState } from 'react'
import { supabase } from './lib/supabase.js'
import AdminShell from './components/AdminShell.jsx'
import AdminLogin from './screens/AdminLogin.jsx'
import Dashboard from './screens/Dashboard.jsx'
import CommerceManager from './screens/CommerceManager.jsx'
import ServiceManager from './screens/ServiceManager.jsx'
import PharmacyManager from './screens/PharmacyManager.jsx'
import NewsManager from './screens/NewsManager.jsx'
import EventManager from './screens/EventManager.jsx'
import IncidentManager from './screens/IncidentManager.jsx'
import UserManager from './screens/UserManager.jsx'
import NotificationManager from './screens/NotificationManager.jsx'
import WaitlistManager from './screens/WaitlistManager.jsx'
import ContentManager from './screens/ContentManager.jsx'
import InviteManager from './screens/InviteManager.jsx'
import HomeCarouselManager from './screens/HomeCarouselManager.jsx'
import ContactManager from './screens/ContactManager.jsx'
import CategoryManager from './screens/CategoryManager.jsx'
import PostManager from './screens/PostManager.jsx'
import UsageManager from './screens/UsageManager.jsx'
import UserContentManager from './screens/UserContentManager.jsx'
import ReportManager from './screens/ReportManager.jsx'
import MarketplaceManager from './screens/MarketplaceManager.jsx'
import usePersistentDraft from './hooks/usePersistentDraft.js'
import CommercialRadar from './screens/CommercialRadar.jsx'
import AdvertisingManager from './screens/AdvertisingManager.jsx'

const ADMIN_ROLE = 'admin'

function AccessDenied({ profile, onLogout }) {
  return (
    <main className="access-page">
      <section className="access-card">
        <div className="access-icon">🔒</div>
        <p className="eyebrow">Acceso restringido</p>
        <h1>Esta cuenta no administra El Barrio</h1>
        <p>
          Iniciaste sesión como <strong>{profile?.full_name || profile?.email || 'usuario'}</strong>,
          pero su perfil no tiene permisos de administrador.
        </p>
        <button className="button button-secondary" type="button" onClick={onLogout}>Cerrar sesión</button>
      </section>
    </main>
  )
}

export default function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [profileError, setProfileError] = useState('')
  const [activeSection, setActiveSection, clearActiveSection] = usePersistentDraft('workspace:active-section', 'dashboard', 'v1')

  const loadProfile = useCallback(async (currentSession) => {
    if (!currentSession?.user) {
      setProfile(null)
      setProfileError('')
      setLoading(false)
      return
    }

    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', currentSession.user.id)
      .maybeSingle()

    setProfile(data || null)
    setProfileError(error ? 'No fue posible validar los permisos de esta cuenta.' : '')
    setLoading(false)
  }, [])

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      const currentSession = data.session || null
      setSession(currentSession)
      loadProfile(currentSession)
    })

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return
      setSession(nextSession)
      loadProfile(nextSession)
    })

    return () => {
      mounted = false
      authListener.subscription.unsubscribe()
    }
  }, [loadProfile])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setSession(null)
    setProfile(null)
    clearActiveSection()
    setActiveSection('dashboard')
  }

  if (loading) {
    return <div className="app-loader"><span className="loader-mark">EB</span><p>Validando acceso…</p></div>
  }

  if (!session) return <AdminLogin />

  if (profileError) {
    return (
      <main className="access-page">
        <section className="access-card">
          <div className="access-icon">⚠️</div>
          <h1>No pudimos validar tu acceso</h1>
          <p>{profileError}</p>
          <button className="button button-secondary" type="button" onClick={handleLogout}>Volver al acceso</button>
        </section>
      </main>
    )
  }

  if ((profile?.role || '').toLowerCase() !== ADMIN_ROLE) {
    return <AccessDenied profile={profile} onLogout={handleLogout} />
  }

  if (profile?.account_status === 'suspended') {
    return <AccessDenied profile={profile} onLogout={handleLogout} />
  }

  return (
    <AdminShell
      activeSection={activeSection}
      onSelect={setActiveSection}
      profile={profile}
      onLogout={handleLogout}
    >
      {activeSection === 'dashboard' && <Dashboard profile={profile} onNavigate={setActiveSection} />}
      {activeSection === 'comercios' && <CommerceManager profile={profile} />}
      {activeSection === 'radar-comercial' && <CommercialRadar profile={profile} onNavigate={setActiveSection} />}
      {activeSection === 'servicios' && <ServiceManager profile={profile} />}
      {activeSection === 'farmacias' && <PharmacyManager />}
      {activeSection === 'noticias' && <NewsManager profile={profile} />}
      {activeSection === 'eventos' && <EventManager profile={profile} />}
      {activeSection === 'incidentes' && <IncidentManager profile={profile} />}
      {activeSection === 'usuarios' && <UserManager profile={profile} />}
      {activeSection === 'espera' && <WaitlistManager />}
      {activeSection === 'invitaciones' && <InviteManager />}
      {activeSection === 'contenido' && <ContentManager profile={profile} />}
      {activeSection === 'notificaciones' && <NotificationManager profile={profile} />}
      {activeSection === 'consultas' && <ContactManager />}
      {activeSection === 'portada' && <HomeCarouselManager profile={profile} />}
      {activeSection === 'publicidad' && <AdvertisingManager profile={profile} />}
      {activeSection === 'mercado' && <MarketplaceManager profile={profile} />}
      {activeSection === 'categorias' && <CategoryManager profile={profile} />}
      {activeSection === 'publicaciones' && <PostManager profile={profile} />}
      {activeSection === 'uso' && <UsageManager />}
      {activeSection === 'contenido-usuarios' && <UserContentManager />}
      {activeSection === 'reportes' && <ReportManager onNavigate={setActiveSection} />}
      {!['dashboard', 'mercado', 'comercios', 'radar-comercial', 'servicios', 'eventos', 'farmacias', 'noticias', 'incidentes', 'usuarios', 'espera', 'invitaciones', 'contenido', 'notificaciones', 'consultas', 'portada', 'publicidad', 'categorias', 'publicaciones', 'contenido-usuarios', 'reportes', 'uso'].includes(activeSection) && (
        <section className="placeholder-module"><span>🚧</span><h1>Módulo en preparación</h1><p>Lo construiremos en una siguiente fase.</p></section>
      )}
    </AdminShell>
  )
}
