import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import CreatePost from './CreatePost'

// ===== ICONOS =====
const Icon = {
  Pin: ({ size = 18, color = '#16a34a' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  ),
  ChevronDown: ({ size = 14, color = '#666' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),
  Search: ({ size = 16, color = '#999' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  Bell: ({ size = 20, color = '#333' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  ),
  Bag: ({ size = 22, color = '#16a34a' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  ),
  Gift: ({ size = 22, color = '#8b5cf6' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 12 20 22 4 22 4 12" />
      <rect x="2" y="7" width="20" height="5" />
      <line x1="12" y1="22" x2="12" y2="7" />
      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
      <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
    </svg>
  ),
  Wrench: ({ size = 22, color = '#f59e0b' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  ),
  Calendar: ({ size = 22, color = '#ef4444' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  Store: ({ size = 22, color = '#ec4899' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  Alert: ({ size = 16, color = '#dc2626' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  Star: ({ size = 11, color = '#f59e0b' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke={color} strokeWidth="1">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  Verified: ({ size = 13, color = '#16a34a' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="8 12 11 15 16 9" stroke="#fff" fill="none" />
    </svg>
  ),
  PinSm: ({ size = 11, color = '#666' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  ),
  Clock: ({ size = 11, color = '#666' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  Message: ({ size = 14, color = '#999' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  Dots: ({ size = 16, color = '#bbb' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <circle cx="12" cy="5" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="12" cy="19" r="1.5" />
    </svg>
  ),
  Plus: ({ size = 28, color = '#fff' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  Users: ({ size = 10, color = '#fff' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

const ALERT_STYLES = {
  critical: { bg: '#fef2f2', border: '#fecaca', iconColor: '#dc2626', badgeColor: '#dc2626' },
  high: { bg: '#fff7ed', border: '#fed7aa', iconColor: '#ea580c', badgeColor: '#ea580c' },
  medium: { bg: '#fefce8', border: '#fde68a', iconColor: '#ca8a04', badgeColor: '#ca8a04' },
  low: { bg: '#eff6ff', border: '#bfdbfe', iconColor: '#2563eb', badgeColor: '#2563eb' }
}

function Feed({ currentUser, onNavigate }) {
  const [posts, setPosts] = useState([])
  const [profiles, setProfiles] = useState({})
  const [commerces, setCommerces] = useState([])
  const [neighborhood, setNeighborhood] = useState(null)
  const [currentProfile, setCurrentProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('todos')
  const [showCreate, setShowCreate] = useState(false)
  const notifCount = 3

  useEffect(() => {
    loadFeed()
  }, [currentUser?.id])

  const loadFeed = async () => {
    try {
      setLoading(true)

      const { data: hoodData } = await supabase
        .from('neighborhoods')
        .select('*')
        .eq('name', 'Barrio Italia')
        .single()

      setNeighborhood(hoodData || null)

      let meProfile = null

      if (currentUser?.id) {
        const { data: meByProfileId } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .maybeSingle()

        if (meByProfileId) {
          meProfile = meByProfileId
        } else {
          const { data: meByUserId } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', currentUser.id)
            .maybeSingle()

          meProfile = meByUserId || null
        }
      }

      setCurrentProfile(meProfile)

      const { data: postsData } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })

      const sorted = (postsData || []).sort((a, b) => {
        const aCritical = a.urgency === 'critical'
        const bCritical = b.urgency === 'critical'
        if (aCritical && !bCritical) return -1
        if (!aCritical && bCritical) return 1
        return new Date(b.created_at) - new Date(a.created_at)
      })

      setPosts(sorted)

      const authorIds = [...new Set((postsData || []).map(p => p.author_id).filter(Boolean))]

      if (authorIds.length) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('*')
          .in('id', authorIds)

        const map = {}
        profilesData?.forEach(profile => {
          map[profile.id] = profile
        })
        setProfiles(map)
      } else {
        setProfiles({})
      }

      const { data: commData } = await supabase
        .from('commerces')
        .select('*')
        .eq('is_active', true)

      setCommerces(commData || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const getInitials = (name) => {
    if (!name) return '??'
    return name
      .split(' ')
      .map(part => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()
  }

  const getTimeAgo = (date) => {
    if (!date) return ''
    const diff = Date.now() - new Date(date).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `Hace ${mins} min`
    const h = Math.floor(mins / 60)
    if (h < 24) return `Hace ${h}h`
    return `Hace ${Math.floor(h / 24)}d`
  }

  const getPriceLabel = (post) => {
    const gift = ['regalo', 'regalar', 'regala', 'gift', 'free'].includes(post.type)
    const swap = ['intercambio', 'intercambiar', 'trueque', 'swap'].includes(post.type)
    if (gift) return 'Gratis'
    if (swap) return 'Trueque'
    return post.price ? `$${Number(post.price).toLocaleString('es-CL')}` : ''
  }

  const getTypeBadge = (post) => {
    if (['venta', 'vender', 'vende', 'sell', 'sale'].includes(post.type)) {
      return { label: 'VENTA', color: '#16a34a', bg: '#dcfce7' }
    }
    if (['regalo', 'regalar', 'regala', 'gift', 'free'].includes(post.type)) {
      return { label: 'REGALO', color: '#8b5cf6', bg: '#f3e8ff' }
    }
    if (['servicio', 'service'].includes(post.type)) {
      return { label: 'SERVICIO', color: '#ea580c', bg: '#fed7aa' }
    }
    return null
  }

  const getDistance = (post) => {
    const m = post.distance_meters || Math.floor(Math.random() * 900) + 100
    return m < 1000 ? `${m}m` : `${(m / 1000).toFixed(1)}km`
  }

  const myProfile = currentProfile || (currentUser?.id ? profiles[currentUser.id] : null)

  const alerts = posts.filter(p => p.urgency === 'critical' || p.urgency === 'high' || p.urgency === 'medium')
  const ventas = posts.filter(p => ['venta', 'vender', 'vende', 'sell', 'sale'].includes(p.type))
  const regalos = posts.filter(p => ['regalo', 'regalar', 'regala', 'gift', 'free'].includes(p.type))
  const servicios = posts.filter(p => ['servicio', 'service'].includes(p.type))
  const eventos = posts.filter(p => ['evento', 'event'].includes(p.type))

  const ventasConImg = ventas.filter(p => p.images?.length > 0)
  const serviciosConImg = servicios.filter(p => p.images?.length > 0)

  const bigPosts = [...ventas, ...regalos].sort(() => Math.random() - 0.5).slice(0, 4)

  const filters = [
    { id: 'todos', label: 'Todos' },
    { id: 'ventas', label: 'Ventas' },
    { id: 'regalos', label: 'Regalos' },
    { id: 'servicios', label: 'Servicios' }
  ]

  const quickActions = [
    { icon: Icon.Bag, label: 'Mercado', bg: '#dcfce7' },
    { icon: Icon.Gift, label: 'Regalos', bg: '#f3e8ff' },
    { icon: Icon.Wrench, label: 'Servicios', bg: '#fef3c7' },
    { icon: Icon.Calendar, label: 'Eventos', bg: '#fee2e2' },
    { icon: Icon.Store, label: 'Comercios', bg: '#fce7f3' }
  ]

  const renderAlert = (alert) => {
    const style = ALERT_STYLES[alert.urgency] || ALERT_STYLES.medium
    const author = profiles[alert.author_id]

    return (
      <div
        key={alert.id}
        style={{
          ...s.alertCard,
          backgroundColor: style.bg,
          border: `1px solid ${style.border}`
        }}
      >
        <div style={s.alertHeader}>
          <Icon.Alert color={style.iconColor} />
          <span style={{ ...s.alertBadge, color: style.badgeColor }}>ALERTA COMUNITARIA</span>
          <span style={s.alertTime}>· {getTimeAgo(alert.created_at)}</span>
        </div>

        <div style={s.alertTitle}>{alert.title || 'Alerta'}</div>
        <div style={s.alertDesc}>{alert.content}</div>

        <div style={s.alertAuthorBlock}>
          <div style={s.alertDivider} />
          <div style={s.alertAuthorLabel}>Alertado por:</div>

          <div style={s.alertAuthorRow}>
            {author?.avatar_url ? (
              <img src={author.avatar_url} alt="" style={s.alertAuthorAvatarSm} />
            ) : (
              <div style={s.alertAuthorAvatarFallbackSm}>
                {getInitials(author?.full_name)}
              </div>
            )}

            <span style={s.alertAuthorNameSm}>
              {author?.full_name || 'Vecino del barrio'}
            </span>

            {author?.verified && (
              <span style={s.alertVerifiedWrap}>
                <Icon.Verified size={14} />
              </span>
            )}
          </div>
        </div>
      </div>
    )
  }

  const renderBigPost = (post) => {
    const author = profiles[post.author_id]
    const badge = getTypeBadge(post)

    return (
      <div key={post.id} style={s.postCard}>
        <div style={s.postHeader}>
          {author?.avatar_url ? (
            <img src={author.avatar_url} style={s.postAvatar} alt="" />
          ) : (
            <div style={s.postAvatarFallback}>{getInitials(author?.full_name)}</div>
          )}

          <div style={{ flex: 1 }}>
            <div style={s.postNameRow}>
              <span style={s.postName}>{author?.full_name || 'Vecino'}</span>
              {author?.badge_founder && <Icon.Verified />}
              {badge && (
                <span style={{ ...s.typeBadge, backgroundColor: badge.bg, color: badge.color }}>
                  {badge.label}
                </span>
              )}
            </div>

            <div style={s.postMeta}>
              <Icon.PinSm />
              <span>A {getDistance(post)}</span>
              <span style={s.metaDot}>·</span>
              <Icon.Star />
              <span>{author?.reputation_score || '0.0'} ({author?.total_sales || 0} ventas)</span>
            </div>
          </div>

          <button style={s.dotsBtn}>
            <Icon.Dots />
          </button>
        </div>

        {post.images?.[0] && (
          <div style={s.postImgBox}>
            <img src={post.images[0]} alt="" style={s.postImg} />
          </div>
        )}

        <div style={s.postBody}>
          <div style={s.postTitle}>{post.title || post.content?.slice(0, 60)}</div>

          {post.content && post.title && (
            <div style={s.postDesc}>{post.content}</div>
          )}

          <div style={s.postFooter}>
            {post.price ? (
              <>
                <span style={s.postPrice}>{getPriceLabel(post)}</span>
                <button
                  style={s.contactBtn}
                  onClick={() => onNavigate?.('Chat', { postId: post.id, sellerId: post.author_id })}
                >
                  Contactar
                </button>
              </>
            ) : (
              <>
                <span style={s.postPriceGratis}>{getPriceLabel(post)}</span>
                <button
                  style={s.msgBtn}
                  onClick={() => onNavigate?.('Chat', { postId: post.id, sellerId: post.author_id })}
                >
                  <Icon.Message />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  const renderCommerce = (c) => (
    <div key={c.id} style={s.commerceCard}>
      <div style={s.commerceHeader}>
        <span style={s.commerceBadge}>◆ COMERCIO DESTACADO</span>
        {c.discount_text && <span style={s.commerceDiscount}>{c.discount_text}</span>}
      </div>

      <div style={s.commerceBody}>
        <div style={s.commerceLogo}>
          {c.logo_url ? (
            <img
              src={c.logo_url}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12 }}
            />
          ) : (
            <Icon.Store size={30} color="#fff" />
          )}
        </div>

        <div style={{ flex: 1 }}>
          <div style={s.commerceName}>{c.name}</div>
          <div style={s.commerceDesc}>{c.description}</div>
          <div style={s.commerceLink}>Ver ubicación →</div>
        </div>
      </div>
    </div>
  )

  const renderCarousel = (title, items, isVenta = true) => (
    <div style={s.section}>
      <div style={s.sectionHeader}>
        <span style={s.sectionTitle}>{title}</span>
        <span style={s.sectionLink}>Ver todas →</span>
      </div>

      <div style={s.carousel}>
        {items.slice(0, 8).map(post => (
          <div key={post.id} style={s.carouselCard}>
            <div style={s.carouselImgBox}>
              <img src={post.images[0]} alt="" style={s.carouselImg} />
            </div>

            <div style={s.carouselTitle}>{post.title || post.content?.slice(0, 30)}</div>

            {isVenta ? (
              <div style={s.carouselPrice}>{getPriceLabel(post)}</div>
            ) : (
              <div style={s.carouselSub}>Servicios</div>
            )}
          </div>
        ))}
      </div>
    </div>
  )

  const renderEvent = (post) => {
    const d = post.expires_at ? new Date(post.expires_at) : new Date(post.created_at)
    const month = d.toLocaleString('es-CL', { month: 'short' }).toUpperCase()

    return (
      <div key={post.id} style={s.eventCard}>
        <div style={s.eventImgBox}>
          {post.images?.[0] ? (
            <img src={post.images[0]} alt="" style={s.eventImg} />
          ) : (
            <div style={{ ...s.eventImg, backgroundColor: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon.Calendar size={50} color="#ccc" />
            </div>
          )}

          <div style={s.eventDateBadge}>
            <div style={s.eventMonth}>{month}</div>
            <div style={s.eventDay}>{d.getDate()}</div>
          </div>

          <div style={s.eventTypeBadge}>EVENTO LOCAL</div>
        </div>

        <div style={s.eventBody}>
          <div style={s.eventTitle}>{post.title || 'Evento'}</div>

          <div style={s.eventMeta}>
            <Icon.Clock />
            <span>10:00 AM</span>
            <span style={s.metaDot}>·</span>
            <Icon.PinSm />
            <span>{post.category || 'Plaza Las Lilas'}</span>
          </div>

          <div style={s.eventFooter}>
            <div style={s.eventAttendees}>
              <div style={s.attendeeDot}>
                <Icon.Users />
              </div>
              <span style={s.attendeeText}>+25</span>
            </div>

            <button style={s.eventJoinBtn}>Unirse gratis</button>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={s.loadingWrap}>
        <img src="/isotipo.png" alt="" style={{ width: 60, opacity: 0.5 }} />
        <p style={{ marginTop: 12, color: '#888', fontSize: 13 }}>Cargando tu barrio...</p>
      </div>
    )
  }

  return (
    <div style={s.wrap}>
      <div style={s.stickyTop}>
        <div style={s.header}>
          <div style={s.headerLeft}>
            <Icon.Pin />
            <div>
              <div style={s.hoodName}>
                {neighborhood?.name || 'Providencia'}
                <Icon.ChevronDown />
              </div>
              <div style={s.hoodMeta}>
                Santiago · {neighborhood?.total_members || 1247} vecinos activos
              </div>
            </div>
          </div>

          <div style={s.headerRight}>
            <button style={s.bellBtn}>
              <Icon.Bell />
              {notifCount > 0 && <span style={s.notifBadge}>{notifCount}</span>}
            </button>

            <div style={s.headerAvatar}>
              {myProfile?.avatar_url ? (
                <img src={myProfile.avatar_url} alt="" style={s.headerAvatarImg} />
              ) : myProfile?.full_name ? (
                <div style={s.headerAvatarFallback}>
                  {getInitials(myProfile.full_name)}
                </div>
              ) : (
                <img src="/isotipo.png" alt="" style={{ width: 22, opacity: 0.6 }} />
              )}
            </div>
          </div>
        </div>

        <div style={s.searchWrap}>
          <div style={s.searchIcon}>
            <Icon.Search />
          </div>
          <input placeholder="Buscar en el barrio..." style={s.searchInput} />
        </div>

        <div style={s.quickRow}>
          {quickActions.map((qa, i) => {
            const QaIcon = qa.icon
            return (
              <button key={i} style={s.quickBtn}>
                <div style={{ ...s.quickIconWrap, backgroundColor: qa.bg }}>
                  <QaIcon />
                </div>
                <span style={s.quickLabel}>{qa.label}</span>
              </button>
            )
          })}
        </div>

        <div style={s.filterRow}>
          {filters.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              style={{
                ...s.filterPill,
                backgroundColor: filter === f.id ? '#16a34a' : '#fff',
                color: filter === f.id ? '#fff' : '#555',
                border: filter === f.id ? 'none' : '1px solid #e5e5e5'
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div style={s.scrollArea}>
        {alerts.map(renderAlert)}
        {ventasConImg.length > 0 && renderCarousel('Últimas ventas', ventasConImg, true)}
        {bigPosts.slice(0, 2).map(renderBigPost)}
        {commerces[0] && renderCommerce(commerces[0])}
        {bigPosts.slice(2, 4).map(renderBigPost)}
        {serviciosConImg.length > 0 && renderCarousel('Últimos anuncios', serviciosConImg, false)}
        {eventos.slice(0, 2).map(renderEvent)}

        {posts.length === 0 && (
          <div style={s.empty}>
            <img src="/isotipo.png" alt="" style={{ width: 80, opacity: 0.4, marginBottom: 12 }} />
            <div style={{ fontWeight: 600, color: '#111' }}>Tu barrio está tranquilo hoy</div>
            <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>Sé el primero en publicar algo</div>
          </div>
        )}

        <div style={{ height: 120 }} />
      </div>

    </div>
  )
}

const s = {
  wrap: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f4f7f4',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  },
  loadingWrap: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center'
  },

  stickyTop: {
    flexShrink: 0,
    backgroundColor: '#fff',
    zIndex: 10,
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '52px 18px 14px'
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 10
  },
  hoodName: {
    fontSize: 17,
    fontWeight: 800,
    color: '#111',
    display: 'flex',
    alignItems: 'center',
    gap: 5
  },
  hoodMeta: {
    fontSize: 11.5,
    color: '#888',
    fontWeight: 500,
    marginTop: 1
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 10
  },
  bellBtn: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    backgroundColor: '#f3f4f6',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative'
  },
  notifBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: '50%',
    backgroundColor: '#dc2626',
    color: '#fff',
    fontSize: 9,
    fontWeight: 800,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px solid #fff'
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    backgroundColor: '#f3f4f6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden'
  },
  headerAvatarImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block'
  },
  headerAvatarFallback: {
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    backgroundColor: '#16a34a',
    color: '#fff',
    fontSize: 13,
    fontWeight: 800,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },

  searchWrap: {
    position: 'relative',
    margin: '0 18px 16px'
  },
  searchIcon: {
    position: 'absolute',
    left: 14,
    top: '50%',
    transform: 'translateY(-50%)',
    display: 'flex'
  },
  searchInput: {
    width: '100%',
    padding: '12px 14px 12px 40px',
    borderRadius: 14,
    border: '1px solid #ececec',
    backgroundColor: '#f9fafb',
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box'
  },

  quickRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '4px 18px 18px',
    gap: 4
  },
  quickBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    flex: 1
  },
  quickIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  quickLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: '#555'
  },

  filterRow: {
    display: 'flex',
    gap: 8,
    padding: '0 18px 16px',
    overflowX: 'auto',
    scrollbarWidth: 'none'
  },
  filterPill: {
    padding: '8px 18px',
    borderRadius: 22,
    fontSize: 13,
    fontWeight: 600,
    whiteSpace: 'nowrap',
    cursor: 'pointer',
    flexShrink: 0
  },

  scrollArea: {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
    WebkitOverflowScrolling: 'touch'
  },

  alertCard: {
    margin: '16px 18px 0',
    padding: '14px 16px',
    borderRadius: 14
  },
  alertHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    marginBottom: 8
  },
  alertBadge: {
    fontSize: 10.5,
    fontWeight: 800,
    letterSpacing: 0.6
  },
  alertTime: {
    fontSize: 10.5,
    color: '#888',
    fontWeight: 500
  },
  alertTitle: {
    fontSize: 15,
    fontWeight: 800,
    color: '#111',
    marginBottom: 5
  },
  alertDesc: {
    fontSize: 12.5,
    color: '#555',
    lineHeight: 1.5
  },
  alertAuthorBlock: {
    marginTop: 10
  },
  alertDivider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.07)',
    marginBottom: 8
  },
  alertAuthorLabel: {
    fontSize: 10.5,
    color: '#777',
    fontWeight: 600,
    marginBottom: 6
  },
  alertAuthorRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6
  },
  alertAuthorAvatarSm: {
    width: 18,
    height: 18,
    borderRadius: '50%',
    objectFit: 'cover',
    flexShrink: 0
  },
  alertAuthorAvatarFallbackSm: {
    width: 18,
    height: 18,
    borderRadius: '50%',
    backgroundColor: '#16a34a',
    color: '#fff',
    fontSize: 8,
    fontWeight: 800,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  alertAuthorNameSm: {
    fontSize: 11.5,
    fontWeight: 700,
    color: '#111'
  },
  alertVerifiedWrap: {
    display: 'flex',
    alignItems: 'center',
    opacity: 0.95
  },

  section: {
    marginTop: 22
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 18px 12px'
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 800,
    color: '#111'
  },
  sectionLink: {
    fontSize: 12,
    fontWeight: 600,
    color: '#16a34a',
    cursor: 'pointer'
  },
  carousel: {
    display: 'flex',
    gap: 12,
    overflowX: 'auto',
    padding: '0 18px 8px',
    scrollSnapType: 'x mandatory',
    scrollbarWidth: 'none',
    WebkitOverflowScrolling: 'touch'
  },
  carouselCard: {
    flexShrink: 0,
    width: 150,
    scrollSnapAlign: 'start',
    cursor: 'pointer'
  },
  carouselImgBox: {
    width: 150,
    height: 150,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
    marginBottom: 8
  },
  carouselImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block'
  },
  carouselTitle: {
    fontSize: 12.5,
    fontWeight: 700,
    color: '#111',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  carouselPrice: {
    fontSize: 12,
    fontWeight: 800,
    color: '#16a34a',
    marginTop: 2
  },
  carouselSub: {
    fontSize: 11,
    color: '#888',
    fontWeight: 500,
    marginTop: 2
  },

  postCard: {
    margin: '16px 18px 0',
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
  },
  postHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 11,
    padding: '14px 16px'
  },
  postAvatar: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    objectFit: 'cover'
  },
  postAvatarFallback: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    backgroundColor: '#16a34a',
    color: '#fff',
    fontSize: 13,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  postNameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6
  },
  postName: {
    fontSize: 14,
    fontWeight: 700,
    color: '#111'
  },
  typeBadge: {
    fontSize: 9,
    fontWeight: 800,
    padding: '2px 7px',
    borderRadius: 4,
    letterSpacing: 0.5
  },
  postMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 11.5,
    color: '#888',
    marginTop: 3
  },
  metaDot: {
    color: '#ccc'
  },
  dotsBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 4
  },
  postImgBox: {
    width: '100%',
    aspectRatio: '4/3',
    backgroundColor: '#f0f0f0'
  },
  postImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block'
  },
  postBody: {
    padding: '14px 16px 16px'
  },
  postTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: '#111',
    marginBottom: 5,
    lineHeight: 1.35
  },
  postDesc: {
    fontSize: 13,
    color: '#555',
    lineHeight: 1.5,
    marginBottom: 12
  },
  postFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10
  },
  postPrice: {
    fontSize: 20,
    fontWeight: 800,
    color: '#111'
  },
  postPriceGratis: {
    fontSize: 15,
    fontWeight: 800,
    color: '#8b5cf6'
  },
  contactBtn: {
    padding: '10px 22px',
    backgroundColor: '#16a34a',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer'
  },
  msgBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },

  commerceCard: {
    margin: '16px 18px 0',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: '14px 16px 16px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
  },
  commerceHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  commerceBadge: {
    fontSize: 9.5,
    fontWeight: 800,
    color: '#16a34a',
    letterSpacing: 0.6
  },
  commerceDiscount: {
    fontSize: 10,
    fontWeight: 800,
    color: '#16a34a',
    backgroundColor: '#dcfce7',
    padding: '3px 8px',
    borderRadius: 6
  },
  commerceBody: {
    display: 'flex',
    gap: 12,
    alignItems: 'flex-start'
  },
  commerceLogo: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#fed7aa',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  commerceName: {
    fontSize: 14.5,
    fontWeight: 800,
    color: '#111',
    marginBottom: 3
  },
  commerceDesc: {
    fontSize: 12,
    color: '#666',
    lineHeight: 1.4,
    marginBottom: 6
  },
  commerceLink: {
    fontSize: 12,
    fontWeight: 700,
    color: '#16a34a',
    cursor: 'pointer'
  },

  eventCard: {
    margin: '16px 18px 0',
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
  },
  eventImgBox: {
    position: 'relative',
    width: '100%',
    aspectRatio: '16/9',
    backgroundColor: '#f0f0f0'
  },
  eventImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block'
  },
  eventDateBadge: {
    position: 'absolute',
    top: 14,
    left: 14,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: '6px 12px',
    textAlign: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
  },
  eventMonth: {
    fontSize: 9.5,
    fontWeight: 800,
    color: '#dc2626',
    letterSpacing: 0.5
  },
  eventDay: {
    fontSize: 18,
    fontWeight: 800,
    color: '#111',
    lineHeight: 1
  },
  eventTypeBadge: {
    position: 'absolute',
    bottom: 14,
    left: 14,
    backgroundColor: '#16a34a',
    color: '#fff',
    fontSize: 9.5,
    fontWeight: 800,
    padding: '5px 11px',
    borderRadius: 6,
    letterSpacing: 0.5
  },
  eventBody: {
    padding: '14px 16px 16px'
  },
  eventTitle: {
    fontSize: 15.5,
    fontWeight: 700,
    color: '#111',
    marginBottom: 8
  },
  eventMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    fontSize: 12,
    color: '#888',
    marginBottom: 12
  },
  eventFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  eventAttendees: {
    display: 'flex',
    alignItems: 'center',
    gap: 7
  },
  attendeeDot: {
    width: 24,
    height: 24,
    borderRadius: '50%',
    backgroundColor: '#16a34a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  attendeeText: {
    fontSize: 12,
    fontWeight: 600,
    color: '#666'
  },
  eventJoinBtn: {
    padding: '9px 18px',
    backgroundColor: '#fff',
    color: '#16a34a',
    border: '1.5px solid #16a34a',
    borderRadius: 10,
    fontSize: 12.5,
    fontWeight: 700,
    cursor: 'pointer'
  },

  fab: {
    position: 'absolute',
    bottom: 22,
    right: 22,
    width: 58,
    height: 58,
    borderRadius: '50%',
    backgroundColor: '#16a34a',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 6px 20px rgba(22,163,74,0.4)',
    zIndex: 80
  },

  modalOverlay: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 390,
    height: 844,
    maxWidth: '100vw',
    maxHeight: '100vh',
    background: '#f4f7f4',
    zIndex: 9999,
    overflow: 'hidden',
    borderRadius: 48
  },

  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '60px 20px',
    textAlign: 'center'
  }
}

export default Feed