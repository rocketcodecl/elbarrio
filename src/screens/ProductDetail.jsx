import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const Icon = {
  Back: ({ size = 20, color = "#111" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
    </svg>
  ),
  Share: ({ size = 18, color = "#111" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
    </svg>
  ),
  Heart: ({ size = 22, color = "#111", filled = false }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "#e11d48" : "none"} stroke={filled ? "#e11d48" : color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  ),
  Pin: ({ size = 12, color = "#16a34a" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
    </svg>
  ),
  Clock: ({ size = 12, color = "#666" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  Tag: ({ size = 12, color = "#666" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>
    </svg>
  ),
  Star: ({ size = 12, color = "#e11d48" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke={color} strokeWidth="1">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  ),
  Verified: ({ size = 13, color = "#16a34a" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="8 12 11 15 16 9" stroke="#fff" fill="none"/>
    </svg>
  ),
  ChevronRight: ({ size = 18, color = "#999" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  ),
  Shield: ({ size = 16, color = "#16a34a" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  Message: ({ size = 18, color = "#fff" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  )
};

export default function ProductDetail({ postId, currentUser, onNavigate }) {
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentImage, setCurrentImage] = useState(0);
  const [liked, setLiked] = useState(false);
  const [touchStart, setTouchStart] = useState(null);

  useEffect(() => {
    if (postId) fetchPost();
  }, [postId]);

  const fetchPost = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("posts")
      .select(`
        *,
        author:profiles!author_id (id, full_name, avatar_url, reputation_score, badge_founder, badge_trusted_seller, member_since)
      `)
      .eq("id", postId)
      .single();

    if (error) console.error("Error:", error);
    if (data) setPost(data);
    setLoading(false);
  };

  const nav = onNavigate || (() => {});

  const getPriceLabel = () => {
    if (!post) return "";
    if (["regalo","regalar","regala","gift","free"].includes(post.type)) return "Gratis";
    if (["intercambio","intercambiar","trueque","swap"].includes(post.type)) return "Trueque";
    return post.price ? `$${Number(post.price).toLocaleString('es-CL')}` : "Consultar";
  };

  const getTimeAgo = (date) => {
    if (!date) return "";
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `Hace ${mins}min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Hace ${hours}h`;
    const days = Math.floor(hours / 24);
    return `Hace ${days}d`;
  };

  const getDistance = (post) => {
    const meters = post?.distance_meters || Math.floor(Math.random() * 900) + 100;
    if (meters < 1000) return `${meters}m`;
    return `${(meters/1000).toFixed(1)}km`;
  };

  const getInitials = (name) => {
    if (!name) return "??";
    return name.split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase();
  };

  const handleTouchStart = (e) => setTouchStart(e.touches[0].clientX);
  const handleTouchEnd = (e) => {
    if (!touchStart || !post?.images) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (diff > 50 && currentImage < post.images.length - 1) setCurrentImage(currentImage + 1);
    if (diff < -50 && currentImage > 0) setCurrentImage(currentImage - 1);
    setTouchStart(null);
  };

  if (loading) {
    return (
      <div style={s.loadingWrap}>
        <img src="/isotipo.png" alt="" style={{ width: 70, opacity: 0.5 }} />
      </div>
    );
  }

  if (!post) {
    return (
      <div style={s.loadingWrap}>
        <img src="/isotipo.png" alt="" style={{ width: 80, opacity: 0.4, marginBottom: 16 }} />
        <div style={{ fontWeight: 600, color: '#111' }}>Esta publicación ya no existe</div>
        <button onClick={() => nav('back')} style={s.backBtnEmpty}>Volver</button>
      </div>
    );
  }

  const images = post.images && post.images.length > 0 ? post.images : [];

  return (
    <div style={s.wrap}>
      <div style={s.scrollArea}>
        <div 
          style={s.galleryWrap}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {images.length > 0 ? (
            <>
              <img src={images[currentImage]} alt="" style={s.mainImg} />
              {images.length > 1 && (
                <div style={s.dots}>
                  {images.map((_, i) => (
                    <div
                      key={i}
                      onClick={() => setCurrentImage(i)}
                      style={{
                        ...s.dot,
                        backgroundColor: i === currentImage ? '#fff' : 'rgba(255,255,255,0.5)',
                        width: i === currentImage ? 22 : 7
                      }}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div style={s.noImg}>
              <img src="/isotipo.png" alt="" style={{ width: 100, opacity: 0.4 }} />
            </div>
          )}

          <button onClick={() => nav('back')} style={{...s.floatBtn, left: 16}}>
            <Icon.Back />
          </button>
          <button style={{...s.floatBtn, right: 16}}>
            <Icon.Share />
          </button>
        </div>

        <div style={s.content}>
          <h1 style={s.title}>{post.title || 'Sin título'}</h1>

          <div style={s.priceRow}>
            <span style={s.price}>{getPriceLabel()}</span>
            {post.price && <span style={s.currency}>CLP</span>}
            {post.is_negotiable && <span style={s.negotiable}>Negociable</span>}
          </div>

          <div style={s.chipsScroll}>
            <div style={s.chip}>
              <Icon.Clock />
              <span>{getTimeAgo(post.created_at)}</span>
            </div>
            <div style={s.chip}>
              <Icon.Pin size={11} color="#666" />
              <span>a {getDistance(post)}</span>
            </div>
            {post.category && (
              <div style={s.chip}>
                <Icon.Tag />
                <span>{post.category}</span>
              </div>
            )}
          </div>

          <div 
            style={s.sellerCard} 
            onClick={() => nav('SellerProfile', { sellerId: post.author?.id })}
          >
            {post.author?.avatar_url ? (
              <img src={post.author.avatar_url} style={s.sellerAvatar} alt="" />
            ) : (
              <div style={s.sellerAvatarFallback}>{getInitials(post.author?.full_name)}</div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={s.sellerNameRow}>
                <span style={s.sellerName}>{post.author?.full_name || 'Vecino'}</span>
                {post.author?.badge_founder && <Icon.Verified />}
              </div>
              <div style={s.sellerRepRow}>
                <Icon.Star />
                <span style={s.sellerRepText}>
                  {post.author?.reputation_score || '0.0'} · 0 reseñas
                </span>
              </div>
            </div>
            <Icon.ChevronRight />
          </div>

          <div style={s.shieldCard}>
            <div style={s.shieldIconWrap}>
              <Icon.Shield />
            </div>
            <div style={{ flex: 1 }}>
              <div style={s.shieldTitle}>Transacción protegida por la comunidad</div>
              <div style={s.shieldText}>
                Revisa nuestros consejos de seguridad antes de concretar la compra.
              </div>
            </div>
          </div>

          <div style={s.section}>
            <div style={s.sectionTitle}>Descripción</div>
            <div style={s.descBlock}>
              <div style={s.description}>
                {post.content || 'Sin descripción.'}
              </div>
            </div>
          </div>

          <div style={s.section}>
            <div style={s.sectionTitle}>Ubicación aproximada</div>
            <div style={s.mapBox}>
              <div style={s.mapGrid} />
              <div style={s.pulseWrap}>
                <div style={{...s.pulse, animationDelay: '0s'}} />
                <div style={{...s.pulse, animationDelay: '1s'}} />
                <div style={{...s.pulse, animationDelay: '2s'}} />
                <div style={s.pulseDot} />
              </div>
              <div style={s.mapCaption}>Se comparte solo al coordinar</div>
            </div>
          </div>

          <div style={{ height: 40 }} />
        </div>
      </div>

      <div style={s.bottomBar}>
        <button 
          style={s.heartBtn}
          onClick={() => setLiked(!liked)}
        >
          <Icon.Heart filled={liked} />
        </button>
        <button
          style={s.contactBtn}
          onClick={() => nav('Chat', { postId: post.id, sellerId: post.author_id })}
        >
          <Icon.Message />
          <span>Mensaje al Vendedor</span>
        </button>
      </div>
    </div>
  );
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
    justifyContent: 'center',
    padding: 40
  },
  backBtnEmpty: {
    marginTop: 16,
    padding: '10px 20px',
    backgroundColor: '#16a34a',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    fontWeight: 600,
    cursor: 'pointer'
  },
  scrollArea: {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
    WebkitOverflowScrolling: 'touch'
  },
  galleryWrap: {
    position: 'relative',
    width: '100%',
    aspectRatio: '1/1',
    backgroundColor: '#e8e8e8'
  },
  mainImg: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  noImg: {
    width: '100%', height: '100%',
    display: 'flex', alignItems: 'center', justifyContent: 'center'
  },
  dots: {
    position: 'absolute',
    bottom: 14,
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'center',
    gap: 5
  },
  dot: {
    height: 7,
    borderRadius: 4,
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  floatBtn: {
    position: 'absolute',
    top: 50,
    width: 38,
    height: 38,
    borderRadius: '50%',
    backgroundColor: 'rgba(255,255,255,0.95)',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
  },
  content: {
    padding: '18px 16px 20px'
  },
  title: {
    fontSize: 22,
    fontWeight: 800,
    color: '#111',
    margin: 0,
    lineHeight: 1.25,
    marginBottom: 8
  },
  priceRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 14
  },
  price: {
    fontSize: 22,
    fontWeight: 800,
    color: '#16a34a'
  },
  currency: {
    fontSize: 12,
    fontWeight: 600,
    color: '#888'
  },
  negotiable: {
    fontSize: 11,
    padding: '3px 8px',
    backgroundColor: '#dcfce7',
    color: '#166534',
    borderRadius: 6,
    fontWeight: 600,
    marginLeft: 6
  },
  chipsScroll: {
    display: 'flex',
    gap: 8,
    overflowX: 'auto',
    paddingBottom: 4,
    marginBottom: 16,
    scrollbarWidth: 'none',
    WebkitOverflowScrolling: 'touch'
  },
  chip: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    padding: '5px 11px',
    backgroundColor: '#fff',
    borderRadius: 20,
    fontSize: 11.5,
    color: '#555',
    fontWeight: 600,
    whiteSpace: 'nowrap',
    flexShrink: 0,
    border: '1px solid #eee'
  },
  sellerCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 14px',
    backgroundColor: '#fff',
    borderRadius: 14,
    cursor: 'pointer',
    marginBottom: 12,
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
  },
  sellerAvatar: {
    width: 42, height: 42, borderRadius: '50%', objectFit: 'cover'
  },
  sellerAvatarFallback: {
    width: 42, height: 42, borderRadius: '50%',
    backgroundColor: '#16a34a', color: '#fff',
    fontWeight: 700, fontSize: 14,
    display: 'flex', alignItems: 'center', justifyContent: 'center'
  },
  sellerNameRow: {
    display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3
  },
  sellerName: {
    fontSize: 14, fontWeight: 700, color: '#111'
  },
  sellerRepRow: {
    display: 'flex', alignItems: 'center', gap: 4
  },
  sellerRepText: {
    fontSize: 11.5, color: '#666', fontWeight: 500
  },
  shieldCard: {
    display: 'flex',
    gap: 10,
    padding: '10px 12px',
    backgroundColor: '#ecfdf5',
    borderRadius: 12,
    marginBottom: 18,
    border: '1px solid #d1fae5'
  },
  shieldIconWrap: {
    paddingTop: 2
  },
  shieldTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: '#065f46',
    marginBottom: 2
  },
  shieldText: {
    fontSize: 11,
    color: '#047857',
    lineHeight: 1.4
  },
  section: { marginBottom: 18 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: '#111',
    marginBottom: 8
  },
  descBlock: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: '12px 14px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
  },
  description: {
    fontSize: 13.5,
    color: '#333',
    lineHeight: 1.55,
    whiteSpace: 'pre-wrap'
  },
  mapBox: {
    position: 'relative',
    width: '100%',
    height: 160,
    backgroundColor: '#e8f0e8',
    borderRadius: 12,
    overflow: 'hidden',
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
  },
  mapGrid: {
    position: 'absolute',
    inset: 0,
    backgroundImage: 'linear-gradient(#d1e0d1 1px, transparent 1px), linear-gradient(90deg, #d1e0d1 1px, transparent 1px)',
    backgroundSize: '30px 30px',
    opacity: 0.6
  },
  pulseWrap: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 20,
    height: 20,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  pulse: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: '50%',
    backgroundColor: '#16a34a',
    opacity: 0.6,
    animation: 'pulseRing 3s ease-out infinite'
  },
  pulseDot: {
    width: 14,
    height: 14,
    borderRadius: '50%',
    backgroundColor: '#16a34a',
    border: '3px solid #fff',
    boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
    zIndex: 2
  },
  mapCaption: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 10.5,
    color: '#547554',
    fontWeight: 600,
    letterSpacing: 0.2
  },
  bottomBar: {
    flexShrink: 0,
    display: 'flex',
    gap: 10,
    padding: '12px 14px 28px',
    backgroundColor: '#fff',
    borderTop: '1px solid #eee',
    boxSizing: 'border-box'
  },
  heartBtn: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#fff',
    border: '1.5px solid #e5e5e5',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  contactBtn: {
    flex: 1,
    height: 50,
    backgroundColor: '#16a34a',
    color: '#fff',
    border: 'none',
    borderRadius: 14,
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8
  }
};