import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

// ===== ICONOS =====
const Icon = {
  Search: ({ size = 18, color = "#999" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  Tag: ({ size = 14, color = "#fff" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>
    </svg>
  ),
  Gift: ({ size = 14, color = "#fff" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
    </svg>
  ),
  Swap: ({ size = 14, color = "#fff" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
    </svg>
  ),
  Pin: ({ size = 12, color = "#16a34a" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
    </svg>
  ),
  Star: ({ size = 11, color = "#e11d48" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke={color} strokeWidth="1">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  ),
  Verified: ({ size = 11, color = "#16a34a" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="8 12 11 15 16 9" stroke="#fff" fill="none"/>
    </svg>
  ),
  Box: ({ size = 40, color = "#ccc" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
    </svg>
  ),
  Bell: ({ size = 22, color = "#16a34a" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  ),
  PinHeader: ({ size = 22, color = "#16a34a" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
    </svg>
  )
};

export default function Marketplace({ currentUser, onNavigate }) {
  const [activeTab, setActiveTab] = useState("venta");
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todo");

  const tabs = [
    { id: "venta", label: "Venta", icon: Icon.Tag, alts: ["venta", "vender", "vende", "sell", "sale"] },
    { id: "regalo", label: "Regalos", icon: Icon.Gift, alts: ["regalo", "regalar", "regala", "gift", "free"] },
    { id: "intercambio", label: "Trueque", icon: Icon.Swap, alts: ["intercambio", "intercambiar", "trueque", "swap"] },
  ];

  const categories = ["Todo", "Muebles", "Ropa", "Tecnología", "Electrónica", "Hogar", "Deportes", "Libros", "Juguetes", "Otros"];

  const nav = onNavigate || (() => {});

  useEffect(() => {
    fetchMarketplace();
  }, [activeTab, category]);

  const fetchMarketplace = async () => {
    setLoading(true);
    const currentTab = tabs.find(t => t.id === activeTab);

    let query = supabase.from("posts").select(`
        *,
        author:profiles!author_id (full_name, avatar_url, reputation_score, badge_founder, badge_trusted_seller)
      `)
      .in("type", currentTab.alts)
      .order("created_at", { ascending: false });

    if (category !== "Todo") query = query.eq("category", category);
    if (search.trim()) query = query.ilike("title", `%${search}%`);

    const { data, error } = await query.limit(40);
    if (error) console.error("Error marketplace:", error);
    setPosts(data || []);
    setLoading(false);
  };

  const getInitials = (name) => {
    if (!name) return "??";
    return name.split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase();
  };

  const getPriceLabel = (post) => {
    if (tabs[1].alts.includes(post.type)) return "Gratis";
    if (tabs[2].alts.includes(post.type)) return "Trueque";
    return post.price ? `$${Number(post.price).toLocaleString('es-CL')}` : "Consultar";
  };

  const getDistance = (post) => {
    const meters = post.distance_meters || Math.floor(Math.random() * 900) + 100;
    if (meters < 1000) return `${meters}m`;
    return `${(meters/1000).toFixed(1)}km`;
  };

  const FeaturedCard = ({ post }) => (
    <div style={s.featuredCard} onClick={() => nav('ProductDetail', { postId: post.id })}>
      <div style={s.featuredImgBox}>
        {post.images?.[0] ? (
          <img src={post.images[0]} style={s.featuredImg} alt="" />
        ) : (
          <div style={s.noImg}><Icon.Box size={60} /></div>
        )}
        <div style={s.distancePill}>
          <Icon.Pin />
          <span>{getDistance(post)}</span>
        </div>
      </div>
      <div style={s.featuredBody}>
        <div style={s.featuredTitleRow}>
          <div style={s.featuredTitle}>{post.title || post.content?.slice(0,50)}</div>
          <div style={s.featuredPrice}>{getPriceLabel(post)}</div>
        </div>
        <div style={s.divider} />
        <div style={s.authorBlock}>
          {post.author?.avatar_url ? (
            <img src={post.author.avatar_url} style={s.avatarMd} alt="" />
          ) : (
            <div style={s.avatarMdFallback}>{getInitials(post.author?.full_name)}</div>
          )}
          <div>
            <div style={s.authorNameRow}>
              <span style={s.authorNameMd}>{post.author?.full_name?.split(' ')[0] || 'Vecino'}</span>
              {post.author?.badge_founder && <Icon.Verified />}
            </div>
            <div style={s.scoreRow}>
              <Icon.Star />
              <span style={s.scoreText}>Neighbor Score: {post.author?.reputation_score || '0.0'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const NormalCard = ({ post }) => (
  <div style={s.card} onClick={() => nav('ProductDetail', { postId: post.id })}>
    <div style={s.imgBox}>
      {post.images?.[0] ? (
        <img src={post.images[0]} style={s.img} alt="" />
      ) : (
        <div style={s.noImg}><Icon.Box /></div>
      )}
      <div style={s.distancePillSm}>
        <Icon.Pin size={10} />
        <span>{getDistance(post)}</span>
      </div>
    </div>
    <div style={s.cardBody}>
      <div style={s.postTitle}>{post.title || post.content?.slice(0,40)}</div>
      <div style={s.priceSm}>{getPriceLabel(post)}</div>
      <div style={s.dividerSm} />
      <div style={s.authorBlockSm}>
        {post.author?.avatar_url ? (
          <img src={post.author.avatar_url} style={s.avatarSm} alt="" />
        ) : (
          <div style={s.avatarSmFallback}>{getInitials(post.author?.full_name)}</div>
        )}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={s.authorNameRowSm}>
            <span style={s.authorNameSm}>{post.author?.full_name?.split(' ')[0] || 'Vecino'}</span>
            {post.author?.badge_founder && <Icon.Verified size={10} />}
          </div>
          <div style={s.scoreRowSm}>
            <Icon.Star size={9} />
            <span style={s.scoreTextSm}>Score: {post.author?.reputation_score || '0.0'}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
);

  const featured = posts[0];
  const rest = posts.slice(1);

  return (
    <div style={s.wrap}>
      {/* HEADER FIJO (sticky) */}
      <div style={s.stickyTop}>
        <div style={s.header}>
          <div style={s.headerTop}>
            <div style={s.headerLeft}>
              <Icon.PinHeader />
            </div>
            <img src="/isotipo.png" alt="" style={s.isoLogo} />
            <div style={s.headerRight}>
              <button style={s.bellBtn}>
                <Icon.Bell />
              </button>
            </div>
          </div>
          <div style={s.searchWrap}>
            <div style={s.searchIcon}><Icon.Search /></div>
            <input
              placeholder="¿Qué estás buscando en el barrio?"
              style={s.search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchMarketplace()}
            />
          </div>
        </div>

        <div style={s.tabRow}>
          {tabs.map(tab => {
            const TabIcon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setCategory("Todo"); }}
                style={{
                  ...s.tab,
                  color: active ? '#16a34a' : '#888',
                  borderBottom: active ? '3px solid #16a34a' : '3px solid transparent'
                }}
              >
                <TabIcon size={14} color={active ? '#16a34a' : '#888'} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SCROLL AREA */}
      <div style={s.scrollArea}>
        <div style={s.catWrap}>
          <div style={s.catScroll}>
            {categories.map(cat => {
              const active = category === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  style={{
                    ...s.catBtn,
                    backgroundColor: active ? '#16a34a' : '#fff',
                    color: active ? '#fff' : '#555',
                    border: active ? 'none' : '1px solid #e5e5e5'
                  }}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        <div style={s.content}>
          {loading ? (
            <>
              <div style={s.skeletonFeatured} />
              <div style={s.grid}>
                {[1,2,3,4].map(i => <div key={i} style={s.skeleton} />)}
              </div>
            </>
          ) : posts.length === 0 ? (
            <div style={s.empty}>
              <img src="/isotipo.png" alt="" style={{ width: 90, height: 90, opacity: 0.5, marginBottom: 16 }} />
              <div style={{fontWeight:600, marginBottom:4, color:'#111'}}>Nada por aquí todavía</div>
              <div style={{fontSize:13, color:'#888'}}>Sé el primero en publicar algo en tu barrio</div>
            </div>
          ) : (
            <>
              {featured && <FeaturedCard post={featured} />}
              {rest.length > 0 && (
                <div style={s.grid}>
                  {rest.map(post => <NormalCard key={post.id} post={post} />)}
                </div>
              )}
            </>
          )}
        </div>
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
    overflow: 'hidden',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column'
  },

  // ==== STICKY TOP ====
  stickyTop: {
    flexShrink: 0,
    backgroundColor: '#f4f7f4',
    paddingTop: 44,
    zIndex: 10,
    boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
  },
  header: {
    padding: '14px 16px 16px'
  },
  headerTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  headerLeft: { width: 40, display: 'flex', alignItems: 'center' },
  headerRight: { width: 40, display: 'flex', justifyContent: 'flex-end' },
  isoLogo: { height: 32, objectFit: 'contain' },
  bellBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 4,
    display: 'flex'
  },
  searchWrap: { position: 'relative' },
  searchIcon: {
    position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
    display: 'flex', alignItems: 'center'
  },
  search: {
    width: '100%',
    padding: '13px 16px 13px 44px',
    borderRadius: 30,
    border: 'none',
    fontSize: 14,
    outline: 'none',
    backgroundColor: '#fff',
    boxSizing: 'border-box',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
  },
  tabRow: {
    display: 'flex',
    padding: '0 8px 4px'
  },
  tab: {
    flex: 1,
    padding: '10px 4px',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6
  },

  // ==== SCROLL AREA ====
  scrollArea: {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
    WebkitOverflowScrolling: 'touch'
  },

  catWrap: {
    padding: '12px 0'
  },
  catScroll: {
    display: 'flex',
    gap: 8,
    overflowX: 'auto',
    padding: '0 16px',
    scrollbarWidth: 'none',
    WebkitOverflowScrolling: 'touch'
  },
  catBtn: {
    padding: '8px 18px',
    borderRadius: 24,
    whiteSpace: 'nowrap',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    flexShrink: 0
  },
  content: { padding: '4px 12px 120px' },

  featuredCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    overflow: 'hidden',
    boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
    cursor: 'pointer',
    marginBottom: 14
  },
  featuredImgBox: {
  position: 'relative',
  width: '100%',
  aspectRatio: '16/10',
  backgroundColor: '#f0f0f0',
  borderTopLeftRadius: 18,
  borderTopRightRadius: 18,
  overflow: 'hidden'
},
  featuredImg: { width: '100%', height: '100%', objectFit: 'cover', display: 'block', borderTopLeftRadius: 18, borderTopRightRadius: 18 },
  featuredBody: { padding: '16px 18px 18px' },
  featuredTitleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 12
  },
  featuredTitle: {
    fontSize: 17,
    fontWeight: 800,
    color: '#111',
    lineHeight: 1.25,
    flex: 1
  },
  featuredPrice: {
    fontSize: 17,
    fontWeight: 800,
    color: '#16a34a',
    whiteSpace: 'nowrap'
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    margin: '0 0 12px 0'
  },
  authorBlock: {
    display: 'flex',
    alignItems: 'center',
    gap: 10
  },
  avatarMd: { width: 30, height: 30, borderRadius: '50%', objectFit: 'cover' },
  avatarMdFallback: {
    width: 30, height: 30, borderRadius: '50%',
    backgroundColor: '#16a34a', color: '#fff',
    fontSize: 12, fontWeight: 700,
    display: 'flex', alignItems: 'center', justifyContent: 'center'
  },
  authorNameRow: { display: 'flex', alignItems: 'center', gap: 5 },
  authorNameMd: { fontSize: 14, fontWeight: 700, color: '#111' },
  scoreRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    marginTop: 2
  },
  scoreText: { fontSize: 11, color: '#888', fontWeight: 500 },

  distancePill: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#fff',
    color: '#111',
    padding: '6px 12px',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
  },
  distancePillSm: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#fff',
    color: '#111',
    padding: '4px 9px',
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    gap: 3,
    boxShadow: '0 1px 4px rgba(0,0,0,0.1)'
  },

  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column'
  },
  imgBox: { position: 'relative', width: '100%', aspectRatio: '1/1', backgroundColor: '#f0f0f0' },
  img: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  noImg: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  cardBody: { padding: '10px 12px 12px' },
  postTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: '#111',
    marginBottom: 6,
    minHeight: 34,
    lineHeight: '17px',
    overflow: 'hidden',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical'
  },
  priceSm: {
    fontSize: 15,
    fontWeight: 800,
    color: '#16a34a',
    marginBottom: 10
  },
  authorRowSm: { display: 'flex', alignItems: 'center', gap: 6 },
  avatar: { width: 20, height: 20, borderRadius: '50%', objectFit: 'cover' },
  avatarFallback: {
    width: 20, height: 20, borderRadius: '50%',
    backgroundColor: '#16a34a', color: '#fff',
    fontSize: 9, fontWeight: 700,
    display: 'flex', alignItems: 'center', justifyContent: 'center'
  },
  authorName: { fontSize: 12, color: '#555', fontWeight: 600 },

  skeletonFeatured: {
    width: '100%',
    aspectRatio: '16/13',
    backgroundColor: '#e8e8e8',
    borderRadius: 18,
    marginBottom: 14
  },

  dividerSm: { height: 1, backgroundColor: '#eee', margin: '0 0 8px 0' },
  authorBlockSm: { display: 'flex', alignItems: 'center', gap: 6 },
  avatarSm: { width: 22, height: 22, borderRadius: '50%', objectFit: 'cover' },
  avatarSmFallback: {
    width: 22, height: 22, borderRadius: '50%',
    backgroundColor: '#16a34a', color: '#fff',
    fontSize: 9, fontWeight: 700,
    display: 'flex', alignItems: 'center', justifyContent: 'center'
  },
  authorNameRowSm: { display: 'flex', alignItems: 'center', gap: 4 },
  authorNameSm: { fontSize: 12, fontWeight: 700, color: '#111' },
  scoreRowSm: { display: 'flex', alignItems: 'center', gap: 3, marginTop: 1 },
  scoreTextSm: { fontSize: 10, color: '#888', fontWeight: 500 
  },

  skeleton: { width: '100%', aspectRatio: '1/1.4', backgroundColor: '#e8e8e8', borderRadius: 16 },
  empty: { textAlign: 'center', padding: '60px 20px', color: '#666', display: 'flex', flexDirection: 'column', alignItems: 'center' }
};