const NAVIGATION = [
  { id: 'dashboard', icon: '▦', label: 'Resumen' },
  { id: 'comercios', icon: '🏪', label: 'Comercios' },
  { id: 'eventos', icon: '📅', label: 'Eventos' },
  { id: 'farmacias', icon: '💊', label: 'Farmacias' },
  { id: 'incidentes', icon: '🚨', label: 'Incidentes' },
  { id: 'usuarios', icon: '👥', label: 'Usuarios' },
]

export default function AdminShell({ activeSection, onSelect, profile, onLogout, children }) {
  const firstName = (profile?.full_name || 'Administrador').split(' ')[0]

  return (
    <div className="admin-layout">
      <aside className="sidebar">
        <div className="brand-lockup">
          <span className="brand-symbol">EB</span>
          <span><strong>El Barrio</strong><small>Administración</small></span>
        </div>

        <nav className="sidebar-nav" aria-label="Administración">
          {NAVIGATION.map(item => (
            <button
              key={item.id}
              type="button"
              className={`nav-item ${activeSection === item.id ? 'is-active' : ''}`}
              onClick={() => onSelect(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="profile-mini">
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt="" />
              : <span>{firstName.slice(0, 1).toUpperCase()}</span>}
            <div><strong>{firstName}</strong><small>Administrador</small></div>
          </div>
          <button className="logout-link" type="button" onClick={onLogout}>Cerrar sesión</button>
        </div>
      </aside>

      <div className="admin-main">
        <header className="topbar">
          <div><p>Panel de administración</p><strong>El Barrio · Las Condes</strong></div>
          <div className="topbar-status"><span /> Conectado a Supabase</div>
        </header>
        <main className="content-area">{children}</main>
      </div>
    </div>
  )
}
