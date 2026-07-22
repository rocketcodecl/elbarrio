import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

// FIX Task 54: antes este archivo usaba `animation: confettiFall ...` en los
// piezas de confetti, pero NINGÚN <style> definía el keyframe → el confetti
// no caía, se quedaba estático. Agregado el keyframe acá.
const CONFETTI_STYLE = `
@keyframes confettiFall {
  0%   { transform: translateY(0) rotate(0deg); opacity: 1; }
  100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
}
`;

const Icon = {
  Package: ({ size = 24, color = "#666" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
    </svg>
  ),
  User: ({ size = 24, color = "#0f5f36" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  Shield: ({ size = 16, color = "#16a34a" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  Star: ({ size = 16, color = "#fff" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke={color} strokeWidth="1">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  ),
  Verified: ({ size = 15, color = "#16a34a" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="8 12 11 15 16 9" stroke="#fff" fill="none"/>
    </svg>
  ),
  Phone: ({ size = 16, color = "#16a34a" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
    </svg>
  ),
  Mail: ({ size = 16, color = "#16a34a" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
    </svg>
  ),
  WhatsApp: ({ size = 16, color = "#fff" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
    </svg>
  )
};

// ==== CONFETTI ====
function Confetti() {
  const pieces = Array.from({ length: 60 });
  return (
    <div style={confettiStyles.wrap}>
      {pieces.map((_, i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 0.8;
        const duration = 2.5 + Math.random() * 1.5;
        const size = 6 + Math.random() * 6;
        const rot = Math.random() * 360;
        const colors = ['#16a34a', '#22c55e', '#ffffff', '#86efac', '#4ade80'];
        const color = colors[i % colors.length];
        const shape = i % 3;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: -20,
              left: `${left}%`,
              width: size,
              height: shape === 0 ? size : size * 0.5,
              backgroundColor: color,
              borderRadius: shape === 2 ? '50%' : 2,
              transform: `rotate(${rot}deg)`,
              animation: `confettiFall ${duration}s ${delay}s ease-out forwards`,
              opacity: 0
            }}
          />
        );
      })}
    </div>
  );
}

const confettiStyles = {
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '100%',
    overflow: 'hidden',
    pointerEvents: 'none',
    zIndex: 50
  }
};

export default function DealDone({ postId, sellerId, currentUser, onNavigate }) {
  const [seller, setSeller] = useState(null);
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showConfetti, setShowConfetti] = useState(true);
  const nav = onNavigate || (() => {});

  useEffect(() => {
    fetchData();
    const t = setTimeout(() => setShowConfetti(false), 5000);
    return () => clearTimeout(t);
  }, [postId, sellerId]);

  const fetchData = async () => {
    setLoading(true);
    const [sellerRes, postRes] = await Promise.all([
      supabase.from("profiles")
        .select("id, full_name, avatar_url, badge_founder, reputation_score, phone, email")
        .eq("id", sellerId)
        .single(),
      supabase.from("posts")
        .select("title, price, type, images")
        .eq("id", postId)
        .single()
    ]);
    if (sellerRes.data) setSeller(sellerRes.data);
    if (postRes.data) setPost(postRes.data);
    setLoading(false);
  };

  const getInitials = (name) => {
    if (!name) return "??";
    return name.split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase();
  };

  const getPriceLabel = () => {
    if (!post) return "";
    if (["regalo","regalar","regala","gift","free"].includes(post.type)) return "Gratis";
    if (["intercambio","intercambiar","trueque","swap"].includes(post.type)) return "Trueque";
    return post.price ? `$${Number(post.price).toLocaleString('es-CL')} CLP` : "Consultar";
  };

  // FIX Task 54: antes `firstName` se declaraba DESPUÉS de openWhatsApp/openEmail.
  // Funcionaba por closure (se evalúa al click) pero era frágil y mala práctica.
  // Ahora se declara primero, arriba de las funciones que lo usan.
  const firstName = seller?.full_name?.split(' ')[0] || 'tu vecino';

  const cleanPhone = (phone) => (phone || '').replace(/\D/g, '');

  const openWhatsApp = () => {
    if (!seller?.phone) return;
    const msg = encodeURIComponent(`¡Hola ${firstName}! Somos vecinos por El Barrio. Coordinemos el encuentro por la publicación "${post?.title}".`);
    window.open(`https://wa.me/${cleanPhone(seller.phone)}?text=${msg}`, '_blank');
  };

  const openEmail = () => {
    if (!seller?.email) return;
    const subject = encodeURIComponent(`Coordinación por: ${post?.title}`);
    window.location.href = `mailto:${seller.email}?subject=${subject}`;
  };

  return (
    <div style={s.wrap}>
      <style dangerouslySetInnerHTML={{ __html: CONFETTI_STYLE }} />
      {showConfetti && <Confetti />}

      <div style={s.scrollArea}>
        <div style={s.illustration}>
          <img src="/isotipo.png" alt="" style={s.isoImg} />
        </div>

        <h1 style={s.title}>¡Trato hecho!</h1>
        <div style={s.subtitle}>
          Has acordado la compra con <b>&nbsp;{firstName}</b>
          {seller?.badge_founder && <span style={{marginLeft: 4}}><Icon.Verified /></span>}
        </div>

        {/* RESUMEN */}
        <div style={s.card}>
          <div style={s.sectionLabel}>RESUMEN DE LA OPERACIÓN</div>

          <div style={s.row}>
            <div style={s.iconBox}>
              <Icon.Package />
            </div>
            <div style={{ flex: 1 }}>
              <div style={s.rowTitle}>{post?.title || 'Publicación'}</div>
              <div style={s.rowSub}>{getPriceLabel()}</div>
            </div>
          </div>

          <div style={s.divider} />

          <div style={s.row}>
            <div style={s.iconBox}>
              <Icon.User />
            </div>
            <div style={{ flex: 1 }}>
              <div style={s.rowTitle}>Datos del Vecino</div>

              <div style={s.sellerBlock}>
                {seller?.avatar_url ? (
                  <img src={seller.avatar_url} style={s.sellerAvatar} alt="" />
                ) : (
                  <div style={s.sellerAvatarFallback}>{getInitials(seller?.full_name)}</div>
                )}
                <div>
                  <div style={s.sellerNameRow}>
                    <span style={s.sellerName}>{seller?.full_name || 'Vecino'}</span>
                    {seller?.badge_founder && <Icon.Verified size={12} />}
                  </div>
                  <div style={s.sellerRep}>
                    ⭐ {seller?.reputation_score || '0.0'}
                  </div>
                </div>
              </div>

              {seller?.phone && (
                <div style={s.contactRow}>
                  <Icon.Phone />
                  <span style={s.contactText}>{seller.phone}</span>
                </div>
              )}
              {seller?.email && (
                <div style={s.contactRow}>
                  <Icon.Mail />
                  <span style={s.contactText}>{seller.email}</span>
                </div>
              )}

              <div style={s.contactBtns}>
                {seller?.phone && (
                  <button onClick={openWhatsApp} style={s.whatsappBtn}>
                    <Icon.WhatsApp />
                    <span>WhatsApp</span>
                  </button>
                )}
                {seller?.email && (
                  <button onClick={openEmail} style={s.mailBtn}>
                    <Icon.Mail color="#fff" />
                    <span>Email</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tips seguridad */}
        <div style={s.tipsCard}>
          <div style={s.tipsHeader}>
            <Icon.Shield />
            <span style={s.tipsTitle}>Tips de Seguridad</span>
          </div>
          <ul style={s.tipsList}>
            <li style={s.tipItem}>Revisa el artículo junto a {firstName} antes de transferir.</li>
            <li style={s.tipItem}>Procura realizar el intercambio de día y en un lugar público.</li>
          </ul>
        </div>

        {/* Botones */}
        <button style={s.btnPrimary} onClick={() => nav('back')}>
          <Icon.Star />
          <span>Dar Reputación</span>
        </button>

        <button style={s.btnGhost} onClick={() => nav('home')}>
          Volver al Inicio
        </button>

        <div style={{ height: 40 }} />
      </div>
    </div>
  );
}

const s = {
  wrap: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f4f7f4',
    fontFamily: '"Plus Jakarta Sans", system-ui, -apple-system, sans-serif',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    paddingTop: 40,
    position: 'relative'
  },
  scrollArea: {
    flex: 1,
    overflowY: 'auto',
    padding: '10px 18px 20px'
  },
  illustration: {
    width: 130,
    height: 130,
    margin: '10px auto 18px',
    backgroundColor: '#fff',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
    border: '2px solid #d1fae5'
  },
  isoImg: {
    width: 65,
    opacity: 0.7
  },
  title: {
    fontSize: 26,
    fontWeight: 800,
    color: '#16a34a',
    textAlign: 'center',
    margin: '4px 0 6px'
  },
  subtitle: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center'
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
    boxShadow: '0 1px 4px rgba(0,0,0,0.05)'
  },
  sectionLabel: {
    fontSize: 10.5,
    fontWeight: 800,
    color: '#888',
    letterSpacing: 0.6,
    marginBottom: 12
  },
  row: {
    display: 'flex',
    gap: 12,
    alignItems: 'flex-start'
  },
  iconBox: {
    width: 40, height: 40,
    borderRadius: 10,
    backgroundColor: '#f4f4f4',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: '#111',
    marginBottom: 3
  },
  rowSub: {
    fontSize: 13,
    color: '#555'
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    margin: '14px 0'
  },
  sellerBlock: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
    marginBottom: 10
  },
  sellerAvatar: {
    width: 36, height: 36, borderRadius: '50%', objectFit: 'cover'
  },
  sellerAvatarFallback: {
    width: 36, height: 36, borderRadius: '50%',
    backgroundColor: '#16a34a', color: '#fff',
    fontSize: 12, fontWeight: 700,
    display: 'flex', alignItems: 'center', justifyContent: 'center'
  },
  sellerNameRow: {
    display: 'flex', alignItems: 'center', gap: 5
  },
  sellerName: {
    fontSize: 13, fontWeight: 700, color: '#111'
  },
  sellerRep: {
    fontSize: 11, color: '#666', marginTop: 2
  },
  contactRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 12.5,
    color: '#333',
    marginTop: 6
  },
  contactText: {
    fontWeight: 500
  },
  contactBtns: {
    display: 'flex',
    gap: 8,
    marginTop: 12
  },
  whatsappBtn: {
    flex: 1,
    padding: '10px',
    borderRadius: 10,
    border: 'none',
    backgroundColor: '#25D366',
    color: '#fff',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6
  },
  mailBtn: {
    flex: 1,
    padding: '10px',
    borderRadius: 10,
    border: 'none',
    backgroundColor: '#333',
    color: '#fff',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6
  },
  tipsCard: {
    backgroundColor: '#ecfdf5',
    border: '1px solid #d1fae5',
    borderRadius: 12,
    padding: '12px 14px',
    marginBottom: 18
  },
  tipsHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6
  },
  tipsTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: '#065f46'
  },
  tipsList: {
    margin: 0,
    paddingLeft: 18,
    color: '#047857'
  },
  tipItem: {
    fontSize: 12,
    lineHeight: 1.5,
    marginBottom: 3
  },
  btnPrimary: {
    width: '100%',
    padding: 14,
    backgroundColor: '#0f5f36',
    color: '#fff',
    border: 'none',
    borderRadius: 14,
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 10
  },
  btnGhost: {
    width: '100%',
    padding: 14,
    backgroundColor: '#fff',
    color: '#111',
    border: '1.5px solid #e5e5e5',
    borderRadius: 14,
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer'
  }
};
