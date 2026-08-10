import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { openWhatsApp } from '../lib/contact'

const TYPE_LABELS = {
  sell: 'Venta',
  gift: 'Regalo',
  trade: 'Trueque',
  request: 'Ayuda',
  service: 'Servicio',
  event: 'Evento',
  alert: 'Alerta',
}

const DEAL_LABELS = {
  proposed: 'Propuesta enviada',
  matched: 'Encuentro acordado',
  completed: 'Trato cerrado',
  rejected: 'Propuesta rechazada',
  cancelled: 'Trato cancelado',
}

const initials = name => String(name || 'Vecino')
  .trim()
  .split(/\s+/)
  .slice(0, 2)
  .map(part => part[0])
  .join('')
  .toUpperCase()

const memberYear = profile => {
  const value = profile?.member_since || profile?.verified_at || profile?.created_at
  const date = value ? new Date(value) : null
  return date && !Number.isNaN(date.getTime()) ? date.getFullYear() : null
}

const normalizeScore = value => {
  const score = Number(value)
  if (!Number.isFinite(score) || score <= 0) return null
  return Math.min(5, Math.max(0, score))
}

function LineIcon({ name, size = 20 }) {
  if (name === 'whatsapp') return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 0 1 8.413 3.488 11.824 11.824 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24Zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 0 0 1.51 5.26l-.999 3.648 3.978-1.607Zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414Z" />
    </svg>
  )
  const paths = {
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21h-4v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3v-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5V3h4v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.1v4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M14 21h-4" /></>,
    post: <><path d="M5 5h14v12H8l-3 3Z" /><path d="M8 9h8M8 13h5" /></>,
    heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />,
    deals: <><path d="M4 7h16v12H4Z" /><path d="M8 7V5h8v2M8 12h8" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    accessible: <><circle cx="12" cy="4" r="2" /><path d="M5 8h14M12 6v6m0 0-4 8m4-8 4 8" /></>,
    shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="m9 12 2 2 4-4" /></>,
    logout: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5" /></>,
    chevron: <path d="m9 18 6-6-6-6" />,
    back: <><path d="m15 18-6-6 6-6" /><path d="M9 12h10" /></>,
    close: <path d="m6 6 12 12M18 6 6 18" />,
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  )
}

function MenuRow({ icon, tone, title, subtitle, count, danger, onClick, active }) {
  return (
    <button className={`profile-menu-row${danger ? ' is-danger' : ''}`} type="button" onClick={onClick}>
      <span className="profile-menu-icon" style={{ background: tone, color: danger ? '#ef3340' : undefined }}>
        <LineIcon name={icon} />
      </span>
      <span className="profile-menu-copy">
        <strong>{title}</strong>
        {subtitle && <small>{subtitle}</small>}
      </span>
      {count != null && <span className="profile-menu-count">{count}</span>}
      {active != null && <span className={`profile-switch${active ? ' is-on' : ''}`} aria-label={active ? 'Activado' : 'Desactivado'}><i /></span>}
      {active == null && !danger && <LineIcon name="chevron" size={17} />}
    </button>
  )
}

function DetailSheet({ section, posts, favorites, deals, onClose, onNavigate }) {
  const [reviewing, setReviewing] = useState('')
  const [reviewMessage, setReviewMessage] = useState('')
  const config = {
    posts: ['Mis publicaciones', posts],
    favorites: ['Mis favoritos', favorites],
    deals: ['Mis compras y ventas', deals],
  }[section]
  if (!config) return null

  const [title, items] = config
  const reviewDeal = async item => {
    const rawRating = window.prompt('Califica este trato del 1 al 5:')
    if (rawRating === null) return
    const rating = Number(rawRating)
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return setReviewMessage('La calificación debe ser un número entero entre 1 y 5.')
    const comment = window.prompt('Comentario opcional sobre la experiencia:')
    if (comment === null) return
    setReviewing(item.id); setReviewMessage('')
    const { error } = await supabase.rpc('submit_deal_review', { p_deal_id: item.id, p_rating: rating, p_comment: comment.trim() || null })
    setReviewing('')
    setReviewMessage(error ? error.message : 'Gracias. Tu evaluación quedó registrada.')
  }
  return (
    <div className="profile-sheet-backdrop">
      <section className="profile-sheet" role="dialog" aria-modal="true" aria-label={title}>
        <header>
          <button type="button" onClick={onClose} aria-label="Volver a Mi perfil"><LineIcon name="back" /></button>
          <div><small>Mi perfil</small><h2>{title}</h2></div>
          <span aria-hidden="true" />
        </header>
        <div className="profile-sheet-list">
          {reviewMessage && <div className="profile-sheet-message">{reviewMessage}</div>}
          {items.length === 0 && <div className="profile-sheet-empty">Todavía no hay actividad en esta sección.</div>}
          {items.map(item => {
            if (section === 'posts') {
              return (
                <button type="button" className="profile-activity-row" key={item.id} onClick={() => onNavigate?.('productdetail', { postId: item.id })}>
                  <span>{item.images?.[0] ? <img src={item.images[0]} alt="" /> : '📦'}</span>
                  <div><strong>{item.title || 'Publicación sin título'}</strong><small>{TYPE_LABELS[item.type] || 'Publicación'} · {item.status === 'sold' ? 'Cerrada' : 'Activa'}</small></div>
                  <LineIcon name="chevron" size={17} />
                </button>
              )
            }
            if (section === 'favorites') {
              const isMarketplacePost = item.favoriteKind === 'post'
              return (
                <button
                  type="button"
                  className="profile-favorite-card"
                  key={item.id}
                  onClick={() => isMarketplacePost
                    ? onNavigate?.('productdetail', { postId: item.id })
                    : onNavigate?.('comercios', { commerceId: item.id })}
                  aria-label={`Abrir ${item.title || item.name || 'favorito'}`}
                >
                  <span className="profile-favorite-cover">
                    {item.images?.[0] || item.cover_url || item.logo_url
                      ? <img src={item.images?.[0] || item.cover_url || item.logo_url} alt="" />
                      : <span aria-hidden="true">{isMarketplacePost ? '📦' : '🏪'}</span>}
                  </span>
                  <div className="profile-favorite-copy">
                    <small>{isMarketplacePost ? 'Publicación guardada' : 'Comercio guardado'}</small>
                    <strong>{item.title || item.name}</strong>
                    <span>{TYPE_LABELS[item.type] || item.category || (isMarketplacePost ? 'Mercado' : 'Comercio del barrio')}</span>
                  </div>
                  <span className="profile-favorite-heart" aria-label="Favorito">♥</span>
                </button>
              )
            }
            return <div className="profile-deal-row" key={item.id}>
              <button type="button" className="profile-activity-row" onClick={() => onNavigate?.('productdetail', { postId: item.post_id })}>
                <span>{item.post?.images?.[0] ? <img src={item.post.images[0]} alt="" /> : '🤝'}</span>
                <div><strong>{item.post?.title || 'Publicación del Mercado'}</strong><small>{item.role === 'seller' ? 'Venta' : 'Compra'} · {DEAL_LABELS[item.status] || item.status}</small></div>
                <LineIcon name="chevron" size={17} />
              </button>
              {item.status === 'completed' && <button type="button" className="profile-review-deal" disabled={reviewing === item.id} onClick={() => reviewDeal(item)}>{reviewing === item.id ? 'Guardando…' : '★ Evaluar trato'}</button>}
            </div>
          })}
        </div>
      </section>
    </div>
  )
}

function SettingsSheet({ onClose, onNavigate, accessibleMode, onAccessibleModeChange }) {
  return <div className="profile-sheet-backdrop"><section className="profile-sheet" role="dialog" aria-modal="true" aria-label="Configuración"><header><button type="button" onClick={onClose} aria-label="Volver a Mi perfil"><LineIcon name="back" /></button><div><small>Mi perfil</small><h2>Configuración</h2></div><span aria-hidden="true" /></header><div className="profile-sheet-list"><section className="profile-menu">
    <MenuRow icon="settings" tone="#e5f5ef" title="Editar mi perfil" onClick={() => onNavigate?.('editprofile')} />
    <MenuRow icon="bell" tone="#fff7dc" title="Notificaciones" subtitle="Elige qué avisos llegan a tu teléfono" onClick={() => onNavigate?.('notificationpreferences')} />
    <MenuRow icon="accessible" tone="#fff0e5" title="Modo accesible" subtitle="Fuentes y controles más grandes" active={accessibleMode} onClick={() => onAccessibleModeChange?.(!accessibleMode)} />
    <MenuRow icon="shield" tone="#e9f3f8" title="Privacidad y seguridad" onClick={() => onNavigate?.('settings')} />
    <MenuRow icon="heart" tone="#e5f5ef" title="Nosotros" onClick={() => onNavigate?.('about')} />
    <MenuRow icon="logout" tone="#ffe9eb" title="Eliminar mi cuenta" danger onClick={() => onNavigate?.('deleteaccount')} />
  </section></div></section></div>
}

export default function MyProfile({
  currentUser,
  profile: profileProp,
  onNavigate,
  onLogout,
  accessibleMode = false,
  onAccessibleModeChange,
}) {
  const [profile, setProfile] = useState(profileProp || null)
  const [neighborhoodName, setNeighborhoodName] = useState('')
  const [posts, setPosts] = useState([])
  const [favorites, setFavorites] = useState([])
  const [deals, setDeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [section, setSection] = useState('')

  useEffect(() => {
    let active = true
    const load = async () => {
      if (!currentUser?.id) {
        if (active) setLoading(false)
        return
      }
      const loadedProfile = profileProp || (await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', currentUser.id)
        .maybeSingle()).data
      if (!active) return
      setProfile(loadedProfile || null)
      if (!loadedProfile?.id) {
        setLoading(false)
        return
      }

      const [postResult, favoriteResult, postFavoriteResult, dealResult, neighborhoodResult] = await Promise.all([
        supabase.from('posts').select('id, title, type, status, images, created_at').eq('author_id', loadedProfile.id).order('created_at', { ascending: false }).limit(40),
        supabase.from('commerce_favorites').select('commerce_id').eq('profile_id', loadedProfile.id),
        supabase.from('post_likes').select('post_id').eq('user_id', currentUser.id),
        supabase.from('marketplace_deals').select('id, post_id, buyer_id, seller_id, status, updated_at').or(`buyer_id.eq.${loadedProfile.id},seller_id.eq.${loadedProfile.id}`).order('updated_at', { ascending: false }).limit(40),
        loadedProfile.neighborhood_id
          ? supabase.from('neighborhoods').select('name').eq('id', loadedProfile.neighborhood_id).maybeSingle()
          : Promise.resolve({ data: null }),
      ])
      if (!active) return
      const loadedPosts = postResult.data || []
      const favoriteIds = [...new Set((favoriteResult.data || []).map(item => item.commerce_id).filter(Boolean))]
      const favoritePostIds = [...new Set((postFavoriteResult.data || []).map(item => item.post_id).filter(Boolean))]
      const loadedDeals = dealResult.data || []
      const dealPostIds = [...new Set(loadedDeals.map(item => item.post_id).filter(Boolean))]

      const [favoriteCommerceResult, favoritePostsResult, dealPostsResult] = await Promise.all([
        favoriteIds.length
          ? supabase.from('commerces').select('id, name, category, cover_url, logo_url').in('id', favoriteIds)
          : Promise.resolve({ data: [] }),
        favoritePostIds.length
          ? supabase.from('posts').select('id, title, type, category, images').in('id', favoritePostIds)
          : Promise.resolve({ data: [] }),
        dealPostIds.length
          ? supabase.from('posts').select('id, title, type, images').in('id', dealPostIds)
          : Promise.resolve({ data: [] }),
      ])
      if (!active) return
      const dealPosts = new Map((dealPostsResult.data || []).map(item => [item.id, item]))
      setPosts(loadedPosts)
      setFavorites([
        ...(favoritePostsResult.data || []).map(item => ({ ...item, favoriteKind: 'post' })),
        ...(favoriteCommerceResult.data || []).map(item => ({ ...item, favoriteKind: 'commerce' })),
      ])
      setDeals(loadedDeals.map(item => ({
        ...item,
        role: item.seller_id === loadedProfile.id ? 'seller' : 'buyer',
        post: dealPosts.get(item.post_id),
      })))
      setNeighborhoodName(neighborhoodResult.data?.name || loadedProfile.neighborhood_name || loadedProfile.barrio || '')
      setLoading(false)
    }
    load()
    return () => { active = false }
  }, [currentUser?.id, profileProp])

  const stats = useMemo(() => {
    const completedSales = deals.filter(deal => deal.role === 'seller' && deal.status === 'completed').length
    const sales = Number(profile?.total_sales) || completedSales
    const gifts = Number(profile?.total_gifts) || posts.filter(post => post.type === 'gift' && post.status === 'sold').length
    const helps = Number(profile?.total_helps) || posts.filter(post => post.type === 'request' && ['sold', 'resolved', 'closed'].includes(post.status)).length
    return { sales, gifts, helps }
  }, [deals, posts, profile])

  const name = profile?.full_name || currentUser?.user_metadata?.full_name || 'Vecino del barrio'
  const verified = profile?.verification_status === 'verified' || profile?.verified === true
  const score = normalizeScore(profile?.reputation_score ?? profile?.rating)
  const actions = stats.sales + stats.gifts + stats.helps
  const target = 12
  const progress = Math.min(target, actions)
  const remaining = Math.max(0, target - progress)
  const year = memberYear(profile)
  const activeLabel = score && score >= 4.5 ? 'Vecino Destacado' : verified ? 'Vecino Activo' : 'Vecino nuevo'
  const badges = [
    { emoji: '🏅', label: 'Fundador', earned: profile?.badge_founder === true },
    { emoji: '🔗', label: 'Conector', earned: profile?.badge_connector === true },
    { emoji: '🤝', label: 'Colaborador', earned: stats.helps > 0 },
    { emoji: '🛒', label: 'Vendedor', earned: stats.sales > 0 },
    { emoji: '🎁', label: 'Generoso', earned: stats.gifts > 0 },
  ]

  return (
    <div className="my-profile">
      <style>{PROFILE_CSS}</style>
      <div className="profile-scroll">
        <header className="profile-header">
          <h1>Mi perfil</h1>
          <button className="profile-settings-button" type="button" onClick={() => setSection('settings')} aria-label="Abrir configuración"><LineIcon name="settings" /></button>
        </header>

        <section className="profile-identity">
          <div className="profile-avatar">
            {profile?.avatar_url ? <img src={profile.avatar_url} alt={name} /> : <span>{initials(name)}</span>}
          </div>
          <h2>{name}{verified && <span className="profile-verified" title="Perfil verificado">✓</span>}</h2>
          <p>{year ? `Vecino desde ${year}` : 'Vecino de El Barrio'}{neighborhoodName ? ` · ${neighborhoodName}` : ''}</p>
        </section>

        <section className="profile-reputation">
          {loading ? <div className="profile-loading">Cargando tu actividad…</div> : (
            <>
              <div className="profile-reputation-top">
                <div><strong>{score ? score.toFixed(1) : '—'} <small>Reputación</small></strong><span>{activeLabel}</span></div>
                <span className="profile-star">{score ? '★' : '☆'}</span>
              </div>
              <div className="profile-stats">
                <div><strong>{stats.sales}</strong><span>ventas</span></div>
                <div><strong>{stats.gifts}</strong><span>regalos</span></div>
                <div><strong>{stats.helps}</strong><span>ayudas</span></div>
              </div>
              <div className="profile-progress-title"><span>Progreso a Vecino Destacado</span><strong>{progress}/{target}</strong></div>
              <div className="profile-progress"><i style={{ width: `${(progress / target) * 100}%` }} /></div>
              <p>{remaining ? `Te faltan ${remaining} acciones para Vecino Destacado` : '¡Ya alcanzaste el nivel Vecino Destacado!'}</p>
            </>
          )}
        </section>

        <section className="profile-badges">
          <h3>Insignias</h3>
          <div>
            {badges.map(badge => <span className={badge.earned ? '' : 'is-locked'} key={badge.label}><i>{badge.emoji}</i><small>{badge.label}</small></span>)}
          </div>
        </section>

        <section className="profile-menu">
          <MenuRow icon="post" tone="#e5f5ef" title="Mis publicaciones" count={posts.length} onClick={() => setSection('posts')} />
          <MenuRow icon="heart" tone="#f3e8ff" title="Mis favoritos" count={favorites.length} onClick={() => setSection('favorites')} />
          <MenuRow icon="deals" tone="#e7f3f6" title="Mis compras y ventas" count={deals.length} onClick={() => setSection('deals')} />
          <MenuRow icon="users" tone="#e8f5ec" title="Invitar vecinos" onClick={() => onNavigate?.('invite')} />
          <MenuRow icon="whatsapp" tone="#e4f8ed" title="Hablemos por WhatsApp" onClick={() => openWhatsApp('Hola El Barrio, necesito ayuda.')} />
          <MenuRow icon="logout" tone="#ffe9eb" title="Cerrar sesión" danger onClick={onLogout} />
        </section>
        <div className="profile-bottom-space" />
      </div>

      <DetailSheet section={section} posts={posts} favorites={favorites} deals={deals} onClose={() => setSection('')} onNavigate={onNavigate} />
      {section === 'settings' && <SettingsSheet onClose={() => setSection('')} onNavigate={onNavigate} accessibleMode={accessibleMode} onAccessibleModeChange={onAccessibleModeChange} />}
    </div>
  )
}

const PROFILE_CSS = `
.my-profile{width:100%;height:100%;background:#f7faf7;color:#1d211f;font-family:'Plus Jakarta Sans',system-ui,sans-serif;overflow:hidden}
.profile-scroll{height:100%;overflow-y:auto;padding:52px 20px 92px;scrollbar-width:none}.profile-scroll::-webkit-scrollbar{display:none}
.profile-header{height:44px;display:flex;align-items:center;justify-content:space-between}.profile-header h1{margin:0;font-size:26px;line-height:1;font-weight:800;letter-spacing:-.7px}.profile-settings-button{width:40px;height:40px;display:grid;place-items:center;border:1px solid #dce2de;border-radius:50%;background:#fff;color:#34423a}
.profile-identity{text-align:center;padding:16px 0 15px}.profile-avatar{width:98px;height:98px;margin:0 auto 9px;border-radius:50%;overflow:hidden;background:linear-gradient(145deg,#daf3e7,#a8d5c0);display:grid;place-items:center;color:#126a45;font-size:28px;font-weight:800}.profile-avatar img{width:100%;height:100%;object-fit:cover}.profile-identity h2{margin:0;font-size:23px;line-height:1.25;font-weight:800;letter-spacing:-.45px}.profile-verified{display:inline-grid;place-items:center;width:15px;height:15px;margin-left:5px;border-radius:50%;background:#159969;color:#fff;font-size:10px;vertical-align:2px}.profile-identity p{margin:4px 0 0;color:#657078;font-size:14px}
.profile-reputation{background:#fff;border:1px solid #dce2de;border-radius:16px;padding:16px;margin-top:0}.profile-reputation-top{display:flex;align-items:center;justify-content:space-between;padding-bottom:12px}.profile-reputation-top>div{display:flex;flex-direction:column;gap:3px}.profile-reputation-top strong{font-size:24px;line-height:1;font-weight:800}.profile-reputation-top strong small{font-size:12px;color:#727a83;font-weight:600}.profile-reputation-top>div>span{font-size:11px;color:#128155;font-weight:700}.profile-star{font-size:35px;line-height:1;color:#ffc52d;text-shadow:0 1px 0 #e59c00}
.profile-stats{display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid #e7ebe8;border-bottom:1px solid #e7ebe8;padding:12px 0}.profile-stats div{text-align:center;border-right:1px solid #e7ebe8}.profile-stats div:last-child{border:0}.profile-stats strong,.profile-stats span{display:block}.profile-stats strong{font-size:18px}.profile-stats span{font-size:10px;color:#657078;margin-top:2px}.profile-progress-title{display:flex;justify-content:space-between;margin:12px 0 6px;color:#626d75;font-size:10.5px}.profile-progress-title strong{color:#128155}.profile-progress{height:8px;border-radius:999px;background:#e4e8ee;overflow:hidden}.profile-progress i{display:block;height:100%;min-width:0;border-radius:inherit;background:#139b70;transition:width .3s ease}.profile-reputation>p{margin:7px 0 0;color:#68727b;font-size:9.5px}.profile-loading{min-height:150px;display:grid;place-items:center;color:#68727b;font-size:12px}
.profile-badges{padding:17px 3px 15px}.profile-badges h3{font-size:15px;margin:0 0 11px}.profile-badges>div{display:grid;grid-template-columns:repeat(5,1fr);gap:6px}.profile-badges>div>span{display:flex;flex-direction:column;align-items:center;gap:6px}.profile-badges i{width:44px;height:44px;border-radius:13px;background:#e4f2ed;display:grid;place-items:center;font-style:normal;font-size:20px}.profile-badges span:nth-child(1) i{background:#fff7d7}.profile-badges span:nth-child(5) i{background:#f2e7fb}.profile-badges small{font-size:9.5px;font-weight:600}.profile-badges .is-locked{opacity:.38;filter:grayscale(.8)}
.profile-menu{background:#fff;border:1px solid #dce2de;border-radius:16px;overflow:hidden}.profile-menu-row{width:100%;min-height:64px;padding:9px 14px;display:flex;align-items:center;gap:12px;border-bottom:1px solid #e7ebe8;color:#1d211f;text-align:left}.profile-menu-row:last-child{border:0}.profile-menu-icon{width:36px;height:36px;border-radius:11px;display:grid;place-items:center;flex:0 0 auto;color:#159969}.profile-menu-copy{flex:1;min-width:0}.profile-menu-copy strong{display:block;font-size:14px;font-weight:700}.profile-menu-copy small{display:block;margin-top:2px;color:#7c858d;font-size:10px}.profile-menu-count{font-size:12px;color:#657078}.profile-menu-row>svg{color:#6f7a82}.profile-menu-row.is-danger{color:#ef3340}.profile-switch{width:38px;height:22px;padding:3px;border-radius:999px;background:#cfd6d2;transition:background .2s}.profile-switch i{display:block;width:16px;height:16px;border-radius:50%;background:#fff;transition:transform .2s;box-shadow:0 1px 3px rgba(0,0,0,.2)}.profile-switch.is-on{background:#159969}.profile-switch.is-on i{transform:translateX(16px)}.profile-bottom-space{height:18px}
.profile-sheet-backdrop{position:absolute;inset:0;z-index:120;background:#f7faf7}.profile-sheet{width:100%;height:100%;min-height:0;background:#f7faf7;display:flex;flex-direction:column;animation:profilePageIn .24s cubic-bezier(.22,1,.36,1)}.profile-sheet header{min-height:var(--screen-header-height);padding:calc(env(safe-area-inset-top, 0px) + 22px) 16px 16px;display:grid;grid-template-columns:38px 1fr 38px;align-items:center;gap:10px;background:#fff;border-bottom:1px solid #e1e7e3;box-sizing:border-box}.profile-sheet header>div{text-align:center}.profile-sheet header>span{width:38px}.profile-sheet header small{display:block;color:#159969;font-size:9px;font-weight:700}.profile-sheet header h2{margin:2px 0 0;font-size:16px;font-weight:600}.profile-sheet header button{width:38px;height:38px;border-radius:50%;display:grid;place-items:center;background:#f7faf7;border:1px solid #dce2de;color:#1d211f}.profile-sheet-list{flex:1;min-height:0;overflow:auto;padding:14px 16px 110px;overscroll-behavior:contain}.profile-activity-row{width:100%;min-height:72px;display:flex;align-items:center;gap:11px;padding:10px 8px;border-bottom:1px solid #e1e7e3;text-align:left;color:#1d211f}.profile-activity-row>span:first-child{width:50px;height:50px;border-radius:12px;overflow:hidden;background:#e5f5ef;display:grid;place-items:center;flex:0 0 auto}.profile-activity-row img{width:100%;height:100%;object-fit:cover}.profile-activity-row div{flex:1;min-width:0}.profile-activity-row strong,.profile-activity-row small{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.profile-activity-row strong{font-size:12px}.profile-activity-row small{margin-top:4px;color:#68727b;font-size:9.5px}.profile-sheet-empty{margin-top:14px;padding:28px 20px;text-align:center;color:#68727b;font-size:12px;line-height:1.5;background:#fff;border:1px solid #dce2de;border-radius:16px}
.profile-favorite-card{position:relative;width:100%;display:grid;grid-template-columns:96px minmax(0,1fr);min-height:112px;margin-bottom:12px;padding:8px;text-align:left;color:inherit;background:#fff;border:1px solid #dce2de;border-radius:17px;overflow:hidden;box-shadow:0 5px 16px rgba(31,63,46,.06);cursor:pointer}.profile-favorite-card:focus-visible{outline:3px solid #159969;outline-offset:2px}.profile-favorite-cover{width:96px;height:96px;display:grid;place-items:center;overflow:hidden;border-radius:12px;background:#e5f5ef;font-size:30px}.profile-favorite-cover img{width:100%;height:100%;object-fit:cover}.profile-favorite-copy{min-width:0;padding:10px 35px 8px 13px;align-self:center}.profile-favorite-copy small,.profile-favorite-copy strong,.profile-favorite-copy>span{display:block}.profile-favorite-copy small{color:#159969;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.04em}.profile-favorite-copy strong{margin-top:5px;color:#1d211f;font-size:15px;line-height:1.25;white-space:normal}.profile-favorite-copy>span{margin-top:6px;color:#68727b;font-size:11px;line-height:1.35}.profile-favorite-heart{position:absolute;top:13px;right:13px;color:#8b5cf6;font-size:18px;line-height:1}
.profile-sheet-message{margin-bottom:10px;padding:10px 12px;border-radius:11px;background:#e8f7f1;color:#116e50;font-size:11px;font-weight:700}.profile-deal-row{margin-bottom:8px;border-bottom:1px solid #e1e7e3}.profile-deal-row .profile-activity-row{border-bottom:0}.profile-review-deal{margin:0 8px 10px 69px;padding:7px 11px;border:1px solid #b9dfd0;border-radius:9px;background:#eff9f5;color:#147653;font-size:10px;font-weight:800}
@keyframes profilePageIn{from{transform:translate3d(36px,0,0);opacity:.72}to{transform:translate3d(0,0,0);opacity:1}}
@media(max-width:500px){.profile-scroll{padding-top:max(28px,env(safe-area-inset-top))}}
@media(prefers-reduced-motion:reduce){.profile-sheet,.profile-progress i,.profile-switch,.profile-switch i{animation:none;transition:none}}
`
