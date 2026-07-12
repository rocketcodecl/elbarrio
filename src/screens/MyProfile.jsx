import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import PostCard from '../components/PostCard'

// ============================================
// ICONOS SVG (estilo Lucide)
// ============================================
const Icon = ({ name, size = 20, color = 'currentColor', strokeWidth = 2 }) => {
  const icons = {
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></>,
    check: <polyline points="20 6 9 17 4 12"/>,
    edit: <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>,
    close: <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
    camera: <><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></>,
    mapPin: <><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></>,
    star: <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>,
    award: <><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></>,
    fileText: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></>,
    users: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
    logOut: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
    inbox: <><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></>,
    creditCard: <><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></>,
    home: <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>,
    phone: <><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></>,
    plus: <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
  }
  
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {icons[name]}
    </svg>
  )
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
function MyProfile({ onLogout, onCreatePost }) {
  const [profile, setProfile] = useState(null)
  const [neighborhood, setNeighborhood] = useState(null)
  const [posts, setPosts] = useState([])
  const [totalNeighbors, setTotalNeighbors] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => { loadProfile() }, [])

  const loadProfile = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profileData } = await supabase
        .from('profiles').select('*').eq('user_id', user.id).single()

      if (!profileData) return
      setProfile(profileData)

      if (profileData.neighborhood_id) {
        const { data: nh } = await supabase
          .from('neighborhoods').select('*').eq('id', profileData.neighborhood_id).single()
        setNeighborhood(nh)
        setTotalNeighbors(nh?.total_members || 0)
      }

      const { data: postsData } = await supabase
        .from('posts')
        .select('*, profiles!posts_author_id_fkey(*)')
        .eq('author_id', profileData.id)
        .order('created_at', { ascending: false })

      setPosts(postsData || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    if (!window.confirm('¿Cerrar sesión?')) return
    await supabase.auth.signOut()
    if (onLogout) onLogout()
  }

  const getInitials = (name) => {
    if (!name) return '?'
    const parts = name.trim().split(' ')
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
    return parts[0].substring(0, 2).toUpperCase()
  }

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />
      </div>
    )
  }

  if (!profile) return null

  return (
    <div style={styles.container} className="scroll-hide">
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerTitle}>Perfil</div>
        <button style={styles.iconButton} onClick={() => setShowEditModal(true)}>
          <Icon name="settings" size={20} color="#1A1A1A" strokeWidth={2} />
        </button>
      </div>

      {/* Hero */}
      <div style={styles.hero}>
        {profile.avatar_url ? (
          <img src={profile.avatar_url} alt="" style={styles.avatar} />
        ) : (
          <div style={styles.avatarInitials}>{getInitials(profile.full_name)}</div>
        )}

        <div style={styles.name}>{profile.full_name}</div>

        {/* Pills verificado + barrio en misma línea */}
        <div style={styles.pillsRow}>
          {profile.verified && (
            <div style={styles.verifiedPill}>
              <Icon name="check" size={13} color="#138864" strokeWidth={3} />
              <span>Verificado</span>
            </div>
          )}
          {neighborhood && (
            <div style={styles.neighborhoodPill}>
              <Icon name="mapPin" size={13} color="#138864" strokeWidth={2.2} />
              <span>{neighborhood.name}</span>
            </div>
          )}
        </div>

        {/* Badge Fundador — grande, dorado, sin número */}
        {profile.badge_founder && (
          <div style={styles.founderBadge}>
            <div style={styles.founderIconBox}>
              <Icon name="award" size={18} color="#78350F" strokeWidth={2.2} />
            </div>
            <div style={styles.founderTextBox}>
              <div style={styles.founderTitle}>Vecino Fundador</div>
              <div style={styles.founderSubtitle}>Uno de los primeros del barrio</div>
            </div>
          </div>
        )}
      </div>

      {/* Stats con iconos */}
      <div style={styles.statsCard}>
        <div style={styles.statItem}>
          <Icon name="star" size={18} color="#138864" strokeWidth={2} />
          <div style={styles.statValue}>{parseFloat(profile.reputation_score).toFixed(1)}</div>
          <div style={styles.statLabel}>Reputación</div>
        </div>
        <div style={styles.statDivider} />
        <div style={styles.statItem}>
          <Icon name="fileText" size={18} color="#138864" strokeWidth={2} />
          <div style={styles.statValue}>{posts.length}</div>
          <div style={styles.statLabel}>Publicaciones</div>
        </div>
        <div style={styles.statDivider} />
        <div style={styles.statItem}>
          <Icon name="users" size={18} color="#138864" strokeWidth={2} />
          <div style={styles.statValue}>{totalNeighbors}</div>
          <div style={styles.statLabel}>Vecinos</div>
        </div>
      </div>

      {/* Botón editar — VERDE, ancho, protagonista */}
      <button style={styles.editButton} onClick={() => setShowEditModal(true)}>
        <Icon name="edit" size={17} color="white" strokeWidth={2.2} />
        <span>Editar perfil</span>
      </button>

      {/* Información personal */}
      <div style={styles.sectionLabel}>Información personal</div>
      <div style={styles.listCard}>
        <DataRow icon="creditCard" label="RUT" value={profile.rut || '—'} />
        <DataRow icon="mapPin" label="Comuna" value={profile.comuna || '—'} />
        <DataRow icon="home" label="Dirección" value={profile.address || '—'} />
        <DataRow icon="phone" label="Teléfono" value={profile.phone ? `+56 9 ${profile.phone}` : '—'} isLast />
      </div>

      {/* Publicaciones - header con botón + */}
      <div style={styles.postsSectionHeader}>
        <div style={styles.sectionLabelInline}>Publicaciones</div>
        <button 
          style={styles.addPostButton} 
          onClick={() => setShowCreate(true)}
          title="Nueva publicación"
        >
          <Icon name="plus" size={18} color="white" strokeWidth={2.5} />
        </button>
      </div>

      {posts.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyIconWrap}>
            <Icon name="inbox" size={44} color="#D1D5DB" strokeWidth={1.5} />
          </div>
          <div style={styles.emptyTitle}>Aún no has publicado</div>
          <div style={styles.emptyText}>Comparte algo con tus vecinos</div>
          <button 
            style={styles.emptyButton}
            onClick={() => setShowCreate(true)}
          >
            <Icon name="plus" size={15} color="white" strokeWidth={2.5} />
            <span>Nueva publicación</span>
          </button>
        </div>
      ) : (
        <div style={styles.postsList}>
          {posts.map((post) => <PostCard key={post.id} post={post} />)}
        </div>
      )}

      {/* Cerrar sesión */}
      <button style={styles.logoutButton} onClick={handleLogout}>
        <Icon name="logOut" size={17} color="#DC2626" strokeWidth={2.2} />
        <span>Cerrar sesión</span>
      </button>

      <div style={{ height: 20 }} />

      {/* Modales */}
      {showEditModal && (
        <EditProfileModal 
          profile={profile}
          onClose={() => setShowEditModal(false)}
          onSaved={() => { setShowEditModal(false); loadProfile() }}
        />
      )}

      {showCreate && (
        <CreatePostWrapper 
          onClose={() => setShowCreate(false)}
          onPublished={() => { setShowCreate(false); loadProfile() }}
        />
      )}
    </div>
  )
}

// ============================================
// SUB-COMPONENTE: Fila de dato con icono
// ============================================
function DataRow({ icon, label, value, isLast }) {
  return (
    <>
      <div style={styles.dataRow}>
        <div style={styles.dataIconWrap}>
          <Icon name={icon} size={17} color="#138864" strokeWidth={2} />
        </div>
        <div style={styles.dataContent}>
          <div style={styles.dataLabel}>{label}</div>
          <div style={styles.dataValue}>{value}</div>
        </div>
      </div>
      {!isLast && <div style={styles.dataDivider} />}
    </>
  )
}

// ============================================
// WRAPPER para importar CreatePost dinámicamente
// (evita loop de imports)
// ============================================
function CreatePostWrapper({ onClose, onPublished }) {
  const [CreatePost, setCreatePost] = useState(null)

  useEffect(() => {
    import('./CreatePost').then(mod => setCreatePost(() => mod.default))
  }, [])

  if (!CreatePost) return null

  return (
    <div style={styles.createPostOverlay}>
      <CreatePost onClose={onClose} onPublished={onPublished} />
    </div>
  )
}

// ============================================
// MODAL EDITAR PERFIL
// ============================================
function EditProfileModal({ profile, onClose, onSaved }) {
  const [fullName, setFullName] = useState(profile.full_name || '')
  const [phone, setPhone] = useState(profile.phone || '')
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url || '')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const getInitials = (name) => {
    if (!name) return '?'
    const parts = name.trim().split(' ')
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
    return parts[0].substring(0, 2).toUpperCase()
  }

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`
      const { error: uploadError } = await supabase.storage
        .from('avatars').upload(fileName, file, { upsert: true })
      if (uploadError) throw uploadError
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName)
      setAvatarUrl(urlData.publicUrl)
    } catch (err) {
      setError('Error al subir foto')
    } finally {
      setUploading(false)
    }
  }

  const handlePhoneChange = (e) => {
    const cleaned = e.target.value.replace(/\D/g, '').substring(0, 8)
    setPhone(cleaned)
  }

  const handleSave = async () => {
    setError('')
    if (!fullName.trim() || fullName.trim().split(' ').length < 2) {
      setError('Ingresa nombre y apellido')
      return
    }
    setSaving(true)
    try {
      const { error: updateError } = await supabase
        .from('profiles').update({
          full_name: fullName.trim(),
          phone: phone || null,
          avatar_url: avatarUrl || null,
        }).eq('id', profile.id)
      if (updateError) throw updateError
      if (onSaved) onSaved()
    } catch (err) {
      setError('Error al guardar')
      setSaving(false)
    }
  }

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modalContainer}>
        <div style={styles.modalHeader}>
          <button style={styles.iconButton} onClick={onClose}>
            <Icon name="close" size={20} color="#1A1A1A" strokeWidth={2} />
          </button>
          <div style={styles.modalTitle}>Editar perfil</div>
          <div style={{ width: 40 }} />
        </div>

        <div style={styles.modalScroll} className="scroll-hide">
          <div style={styles.avatarSection}>
            <div style={styles.avatarWrapper}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="" style={styles.avatarEdit} />
              ) : (
                <div style={styles.avatarEditInitials}>{getInitials(fullName)}</div>
              )}
              <label style={styles.uploadBtn}>
                <Icon name="camera" size={16} color="white" strokeWidth={2} />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  style={{ display: 'none' }}
                  disabled={uploading}
                />
              </label>
            </div>
            <div style={styles.avatarHint}>
              {uploading ? 'Subiendo...' : 'Toca la cámara para cambiar tu foto'}
            </div>
          </div>

          <label style={styles.label}>Nombre completo</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Nombre y apellido"
            style={styles.input}
          />

          <label style={styles.label}>Teléfono</label>
          <div style={styles.phoneWrapper}>
            <div style={styles.phonePrefix}>+56 9</div>
            <input
              type="text"
              value={phone}
              onChange={handlePhoneChange}
              placeholder="12345678"
              style={styles.phoneInput}
            />
          </div>

          <div style={styles.readonlyNote}>
            <div style={styles.readonlyTitle}>Datos protegidos</div>
            <div style={styles.readonlyText}>
              Tu RUT, dirección y comuna no pueden modificarse desde aquí. Contacta a soporte si necesitas actualizarlos.
            </div>
          </div>

          {error && <div style={styles.errorBox}>{error}</div>}
        </div>

        <div style={styles.modalFooter}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ ...styles.saveButton, opacity: saving ? 0.6 : 1 }}
          >
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================
// ESTILOS
// ============================================
const styles = {
  container: {
    height: '100%',
    overflowY: 'auto',
    background: '#FAFAF7',
    paddingBottom: 100,
  },
  loadingContainer: {
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    width: 32,
    height: 32,
    border: '2.5px solid #E5E7EB',
    borderTop: '2.5px solid #138864',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },

  // Header
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '54px 20px 12px',
    background: '#FAFAF7',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: 700,
    color: '#1A1A1A',
    letterSpacing: '-0.02em',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    background: 'white',
    border: '1px solid #EFEEE9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },

  // Hero
  hero: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '16px 20px 20px',
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: '50%',
    objectFit: 'cover',
  },
  avatarInitials: {
    width: 96,
    height: 96,
    borderRadius: '50%',
    background: '#138864',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 32,
    fontWeight: 700,
    letterSpacing: '-0.02em',
  },
  name: {
    fontSize: 22,
    fontWeight: 700,
    color: '#1A1A1A',
    letterSpacing: '-0.01em',
    marginTop: 14,
  },

  // Pills verificado + barrio
  pillsRow: {
    display: 'flex',
    gap: 8,
    marginTop: 12,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  verifiedPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    padding: '6px 12px',
    background: '#DCFCE7',
    color: '#138864',
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 600,
    border: '1px solid #A7F3D0',
  },
  neighborhoodPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    padding: '6px 12px',
    background: '#DCFCE7',
    color: '#138864',
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 600,
    border: '1px solid #A7F3D0',
  },

  // Badge fundador — grande y con presencia
  founderBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
    padding: '12px 16px',
    background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
    border: '1px solid #FCD34D',
    borderRadius: 14,
    width: 'calc(100% - 40px)',
    maxWidth: 320,
    boxShadow: '0 2px 8px rgba(245, 158, 11, 0.15)',
  },
  founderIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    background: 'rgba(255, 255, 255, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  founderTextBox: {
    flex: 1,
  },
  founderTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: '#78350F',
    letterSpacing: '-0.01em',
  },
  founderSubtitle: {
    fontSize: 11,
    color: '#92400E',
    marginTop: 2,
    fontWeight: 500,
  },

  // Stats
  statsCard: {
    display: 'flex',
    alignItems: 'stretch',
    margin: '4px 20px 0',
    padding: '18px 8px',
    background: 'white',
    borderRadius: 16,
    border: '1px solid #EFEEE9',
  },
  statItem: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 700,
    color: '#1A1A1A',
    letterSpacing: '-0.02em',
    marginTop: 6,
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
  },
  statDivider: {
    width: 1,
    background: '#EFEEE9',
  },

  // Botón editar — VERDE PROTAGONISTA
  editButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    margin: '16px 20px 8px',
    padding: '15px',
    width: 'calc(100% - 40px)',
    background: '#138864',
    color: 'white',
    border: 'none',
    borderRadius: 14,
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
    boxShadow: '0 4px 14px rgba(19, 136, 100, 0.3)',
  },

  // Sección label
  sectionLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    padding: '24px 20px 10px',
  },
  sectionLabelInline: {
    fontSize: 11,
    fontWeight: 700,
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },

  // Header sección publicaciones
  postsSectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '24px 20px 10px',
  },
  addPostButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    background: '#138864',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(19, 136, 100, 0.3)',
  },

  // Lista datos con iconos
  listCard: {
    margin: '0 20px',
    background: 'white',
    borderRadius: 16,
    border: '1px solid #EFEEE9',
    overflow: 'hidden',
  },
  dataRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '14px 16px',
  },
  dataIconWrap: {
  width: 24,
  height: 24,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
},
  dataContent: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    minWidth: 0,
  },
  dataLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: 500,
    flexShrink: 0,
  },
  dataValue: {
    fontSize: 14,
    color: '#1A1A1A',
    fontWeight: 600,
    textAlign: 'right',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    minWidth: 0,
  },
  dataDivider: {
    height: 1,
    background: '#F3F4F0',
    marginLeft: 52,  // antes era 64
  },

  // Empty state
  emptyState: {
    margin: '0 20px',
    padding: '32px 20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    background: 'white',
    borderRadius: 16,
    border: '1px solid #EFEEE9',
  },
  emptyIconWrap: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: '#1A1A1A',
  },
  emptyText: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 12,
  },
  emptyButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '10px 18px',
    background: '#138864',
    color: 'white',
    border: 'none',
    borderRadius: 12,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    boxShadow: '0 2px 8px rgba(19, 136, 100, 0.25)',
  },
  postsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    padding: '0 20px',
  },

  // Logout
  logoutButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    margin: '24px 20px 0',
    padding: '15px',
    width: 'calc(100% - 40px)',
    background: 'white',
    color: '#DC2626',
    border: '1px solid #FECACA',
    borderRadius: 14,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },

  // ============ CREATE POST OVERLAY ============
  createPostOverlay: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 390,
    height: 844,
    maxWidth: '100vw',
    maxHeight: '100vh',
    background: 'white',
    zIndex: 9999,
    overflow: 'hidden',
    borderRadius: 48,
  },

  // ============ MODAL EDITAR ============
  modalOverlay: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 390,
    height: 844,
    maxWidth: '100vw',
    maxHeight: '100vh',
    background: '#FAFAF7',
    zIndex: 9999,
    overflow: 'hidden',
    borderRadius: 48,
    animation: 'slideUp 0.3s ease',
  },
  modalContainer: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    display: 'flex',
    flexDirection: 'column',
    background: '#FAFAF7',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '54px 16px 16px',
    background: '#FAFAF7',
    flexShrink: 0,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: '#1A1A1A',
    letterSpacing: '-0.01em',
  },
  modalScroll: {
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
    padding: '8px 20px 20px',
  },
  avatarSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
    padding: '20px 0 28px',
  },
  avatarWrapper: {
    position: 'relative',
    width: 96,
    height: 96,
  },
  avatarEdit: {
    width: 96,
    height: 96,
    borderRadius: '50%',
    objectFit: 'cover',
  },
  avatarEditInitials: {
    width: 96,
    height: 96,
    borderRadius: '50%',
    background: '#138864',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 32,
    fontWeight: 700,
  },
  uploadBtn: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 32,
    height: 32,
    borderRadius: '50%',
    background: '#1A1A1A',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    border: '3px solid #FAFAF7',
  },
  avatarHint: {
    fontSize: 12,
    color: '#6B7280',
  },
  label: {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    color: '#6B7280',
    marginBottom: 8,
    marginTop: 16,
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
  },
  input: {
    width: '100%',
    padding: '14px 16px',
    fontSize: 15,
    background: 'white',
    border: '1px solid #EFEEE9',
    borderRadius: 12,
    color: '#1A1A1A',
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box',
    fontWeight: 500,
  },
  phoneWrapper: {
    display: 'flex',
    alignItems: 'stretch',
    background: 'white',
    border: '1px solid #EFEEE9',
    borderRadius: 12,
    overflow: 'hidden',
  },
  phonePrefix: {
    display: 'flex',
    alignItems: 'center',
    padding: '0 14px',
    fontSize: 15,
    fontWeight: 600,
    color: '#6B7280',
    background: '#F5F5F0',
    borderRight: '1px solid #EFEEE9',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  phoneInput: {
    flex: 1,
    padding: '14px 16px',
    fontSize: 15,
    background: 'transparent',
    border: 'none',
    color: '#1A1A1A',
    fontFamily: 'inherit',
    outline: 'none',
    fontWeight: 500,
    minWidth: 0,
  },
  readonlyNote: {
    marginTop: 24,
    padding: 16,
    background: 'white',
    border: '1px solid #EFEEE9',
    borderRadius: 12,
  },
  readonlyTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: '#1A1A1A',
    marginBottom: 4,
  },
  readonlyText: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 1.5,
  },
  errorBox: {
    marginTop: 16,
    padding: 12,
    background: '#FEF2F2',
    color: '#991B1B',
    border: '1px solid #FEE2E2',
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 500,
    textAlign: 'center',
  },
  modalFooter: {
    padding: '16px 20px 30px',
    background: '#FAFAF7',
    flexShrink: 0,
  },
  saveButton: {
    width: '100%',
    padding: 15,
    background: '#138864',
    color: 'white',
    border: 'none',
    borderRadius: 12,
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    boxShadow: '0 4px 14px rgba(19, 136, 100, 0.3)',
  },
}

export default MyProfile