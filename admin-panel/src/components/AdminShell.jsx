const NAVIGATION = [
  { id: 'dashboard', icon: '▦', label: 'Resumen' },
  { id: 'portada', icon: '▤', label: 'Portada de Inicio' },
  { id: 'publicaciones', icon: '◫', label: 'Publicaciones', superOnly: true },
  { id: 'categorias', icon: '☷', label: 'Categorías', superOnly: true },
  { id: 'comercios', icon: '🏪', label: 'Comercios' },
  { id: 'servicios', icon: '🧰', label: 'Servicios' },
  { id: 'eventos', icon: '📅', label: 'Eventos' },
  { id: 'farmacias', icon: '💊', label: 'Farmacias' },
  { id: 'noticias', icon: '📰', label: 'Noticias' },
  { id: 'incidentes', icon: '🚨', label: 'Incidentes' },
  { id: 'usuarios', icon: '👥', label: 'Usuarios' },
  { id: 'espera', icon: '📍', label: 'Lista de espera' },
  { id: 'invitaciones', icon: '🔗', label: 'Invitaciones' },
  { id: 'consultas', icon: '💬', label: 'Consultas' },
  { id: 'contenido', icon: '✎', label: 'Contenido de la app', superOnly: true },
  { id: 'notificaciones', icon: '🔔', label: 'Notificaciones' },
  { id: 'uso', icon: '◔', label: 'Uso y servicios', superOnly: true },
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
          {NAVIGATION.filter(item => !item.superOnly || profile?.is_superadmin).map(item => (
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
            <div><strong>{firstName}</strong><small>{profile?.is_superadmin ? 'Superadministrador' : 'Administrador territorial'}</small></div>
          </div>
          <button className="logout-link" type="button" onClick={onLogout}>Cerrar sesión</button>
        </div>
      </aside>

      <div className="admin-main">
        <header className="topbar">
          <div><p>Panel de administración</p><strong>{profile?.is_superadmin ? 'El Barrio · Alcance global' : `El Barrio · ${profile?.barrio || profile?.comuna || 'Barrio asignado'}`}</strong></div>
          <div className="topbar-status"><span /> Conectado a Supabase</div>
        </header>
        <main className="content-area">{children}</main>
      </div>
    </div>
  )
}
