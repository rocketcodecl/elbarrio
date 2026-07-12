import { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabase";

const Icon = {
  Back: ({ size = 22, color = "#111" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
    </svg>
  ),
  Dots: ({ size = 20, color = "#111" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/>
    </svg>
  ),
  Send: ({ size = 20, color = "#fff" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  ),
  Plus: ({ size = 22, color = "#666" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
    </svg>
  ),
  Tag: ({ size = 15, color = "#111" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>
    </svg>
  ),
  Handshake: ({ size = 15, color = "#fff" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 12l4 4 8-8"/><path d="M2 12l4 4"/>
    </svg>
  ),
  Verified: ({ size = 13, color = "#16a34a" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="8 12 11 15 16 9" stroke="#fff" fill="none"/>
    </svg>
  ),
  Shield: ({ size = 14, color = "#16a34a" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  Check: ({ size = 12, color = "#16a34a" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
};

export default function ChatConversation({ postId, sellerId, currentUser, onNavigate }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [seller, setSeller] = useState(null);
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showOffer, setShowOffer] = useState(false);
  const [offerAmount, setOfferAmount] = useState("");
  const scrollRef = useRef(null);
  const nav = onNavigate || (() => {});

  useEffect(() => {
    fetchInitial();
    const sub = supabase.channel('chat_' + postId)
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `post_id=eq.${postId}` }, 
        (payload) => {
          setMessages(prev => [...prev, payload.new]);
        }
      )
      .subscribe();
    return () => supabase.removeChannel(sub);
  }, [postId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchInitial = async () => {
  setLoading(true);
  const [msgRes, sellerRes, postRes] = await Promise.all([
    supabase.from("messages")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: true }),
    supabase.from("profiles")
      .select("id, full_name, avatar_url, badge_founder, reputation_score")
      .eq("id", sellerId)
      .single(),
    supabase.from("posts")
      .select("title, price, type, images")
      .eq("id", postId)
      .single()
  ]);
  if (msgRes.data) setMessages(msgRes.data);
  if (sellerRes.data) setSeller(sellerRes.data);
  if (postRes.data) setPost(postRes.data);
  setLoading(false);

    // Marcar como leídos los mensajes que me llegaron y aún no leo
  const updateResult = await supabase
    .from("messages")
    .update({ read: true })
    .eq("post_id", postId)
    .eq("sender_id", sellerId)
    .eq("receiver_id", currentUser.id)
    .eq("read", false)
    .select();
  
  console.log('UPDATE READS:', updateResult);
};

  const sendMessage = async (customText = null) => {
    const content = customText || text.trim();
    if (!content) return;
    setText("");
    const { error } = await supabase.from("messages").insert({
      sender_id: currentUser.id,
      receiver_id: sellerId,
      post_id: postId,
      content
    });
    if (error) console.error("Error mensaje:", error);
  };

  const sendOffer = () => {
    if (!offerAmount) return;
    sendMessage(`💰 Oferta: $${Number(offerAmount).toLocaleString('es-CL')} CLP`);
    setOfferAmount("");
    setShowOffer(false);
  };

  const goToDeal = () => {
    nav('DealDone', { postId, sellerId });
  };

  const getInitials = (name) => {
    if (!name) return "??";
    return name.split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase();
  };

  const formatTime = (date) => {
    if (!date) return "";
    const d = new Date(date);
    return d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  return (
    <div style={s.wrap}>
      {/* HEADER */}
      <div style={s.header}>
        <button onClick={() => nav('back')} style={s.iconBtn}>
          <Icon.Back />
        </button>
        {seller?.avatar_url ? (
          <img src={seller.avatar_url} style={s.avatar} alt="" />
        ) : (
          <div style={s.avatarFallback}>{getInitials(seller?.full_name)}</div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={s.nameRow}>
            <span style={s.name}>{seller?.full_name || 'Vecino'}</span>
            {seller?.badge_founder && <Icon.Verified />}
          </div>
          <div style={s.postRef}>
            <Icon.Tag size={11} color="#666" />
            <span>{post?.title || 'Publicación'}</span>
          </div>
        </div>
        <button style={s.iconBtn}>
          <Icon.Dots />
        </button>
      </div>

      {/* MENSAJES */}
      <div style={s.messagesWrap} ref={scrollRef}>
        <div style={s.dateChip}>Hoy</div>

        {loading ? (
          <div style={s.emptyChat}>Cargando conversación...</div>
        ) : messages.length === 0 ? (
          <div style={s.emptyChat}>
            <img src="/isotipo.png" alt="" style={{ width: 70, opacity: 0.4, marginBottom: 12 }} />
            <div style={{ fontSize: 13, fontWeight: 600, color: '#555' }}>Aún no hay mensajes</div>
            <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>Rompe el hielo con un saludo</div>
          </div>
        ) : (
          messages.map(msg => {
            const mine = msg.sender_id === currentUser.id;
            return (
              <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: mine ? 'flex-end' : 'flex-start' }}>
                <div style={mine ? s.bubbleMine : s.bubbleTheirs}>
                  {msg.content}
                </div>
                <div style={s.msgTime}>
                  {formatTime(msg.created_at)}
                  {mine && <Icon.Check />}
                </div>
              </div>
            );
          })
        )}

        {/* Asistente de vecindario */}
        <div style={s.assistantCard}>
          <div style={s.assistantHeader}>
            <Icon.Shield />
            <span style={s.assistantTitle}>Asistente de Vecindario</span>
          </div>
          <div style={s.assistantText}>
            Punto de encuentro sugerido: <b>Plaza Italia</b>. Recomendamos coordinar de día y en un lugar público.
          </div>
        </div>
      </div>

      {/* POPUP OFERTA */}
      {showOffer && (
        <div style={s.overlay} onClick={() => setShowOffer(false)}>
          <div style={s.popup} onClick={(e) => e.stopPropagation()}>
            <div style={s.popupTitle}>Enviar una oferta</div>
            <div style={s.popupSub}>Propón un precio para el vendedor</div>
            <div style={s.offerInputWrap}>
              <span style={s.currencyPrefix}>$</span>
              <input
                type="number"
                placeholder="0"
                value={offerAmount}
                onChange={(e) => setOfferAmount(e.target.value)}
                style={s.offerInput}
                autoFocus
              />
              <span style={s.currencySuffix}>CLP</span>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button onClick={() => setShowOffer(false)} style={s.popupBtnGhost}>Cancelar</button>
              <button onClick={sendOffer} style={s.popupBtnPrimary}>Enviar</button>
            </div>
          </div>
        </div>
      )}

      {/* ACCIONES + INPUT */}
      <div style={s.bottomBar}>
        <div style={s.actionsRow}>
          <button onClick={() => setShowOffer(true)} style={s.actionGhost}>
            <Icon.Tag />
            <span>Enviar Oferta</span>
          </button>
          <button onClick={goToDeal} style={s.actionPrimary}>
            <Icon.Handshake />
            <span>Acordar Encuentro</span>
          </button>
        </div>

        <div style={s.inputLabel}>Escribe tu mensaje</div>
        <div style={s.inputRow}>
          <button style={s.plusBtn}>
            <Icon.Plus />
          </button>
          <textarea
            placeholder=""
            value={text}
            onChange={(e) => setText(e.target.value)}
            style={s.input}
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
          />
          <button onClick={() => sendMessage()} style={s.sendBtn}>
            <Icon.Send />
          </button>
        </div>
      </div>
    </div>
  );
}

const s = {
  wrap: {
    width: '100%',
    height: '100%',
    backgroundColor: '#fff',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  },

  header: {
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '48px 12px 12px',
    borderBottom: '1px solid #eee',
    backgroundColor: '#fff'
  },
  iconBtn: {
    width: 34, height: 34,
    background: 'none', border: 'none', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center'
  },
  avatar: { width: 38, height: 38, borderRadius: '50%', objectFit: 'cover' },
  avatarFallback: {
    width: 38, height: 38, borderRadius: '50%',
    backgroundColor: '#16a34a', color: '#fff',
    fontSize: 13, fontWeight: 700,
    display: 'flex', alignItems: 'center', justifyContent: 'center'
  },
  nameRow: { display: 'flex', alignItems: 'center', gap: 5 },
  name: { fontSize: 15, fontWeight: 700, color: '#111' },
  postRef: {
    display: 'flex', alignItems: 'center', gap: 4,
    fontSize: 11, color: '#666', fontWeight: 500, marginTop: 1,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
  },

  messagesWrap: {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
    padding: '14px 14px',
    backgroundColor: '#fafafa',
    WebkitOverflowScrolling: 'touch'
  },
  dateChip: {
    alignSelf: 'center',
    fontSize: 11,
    color: '#666',
    backgroundColor: '#eee',
    padding: '4px 12px',
    borderRadius: 20,
    fontWeight: 600,
    width: 'fit-content',
    margin: '4px auto 14px'
  },
  emptyChat: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '60px 20px'
  },
  bubbleTheirs: {
    maxWidth: '78%',
    backgroundColor: '#e8e8e8',
    color: '#111',
    padding: '10px 13px',
    borderRadius: 14,
    borderBottomLeftRadius: 4,
    fontSize: 14,
    lineHeight: 1.4,
    marginBottom: 2,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word'
  },
  bubbleMine: {
    maxWidth: '78%',
    backgroundColor: '#16a34a',
    color: '#fff',
    padding: '10px 13px',
    borderRadius: 14,
    borderBottomRightRadius: 4,
    fontSize: 14,
    lineHeight: 1.4,
    marginBottom: 2,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word'
  },
  msgTime: {
    fontSize: 10.5,
    color: '#999',
    marginBottom: 10,
    display: 'flex',
    alignItems: 'center',
    gap: 4
  },

  assistantCard: {
    marginTop: 8,
    padding: '10px 12px',
    backgroundColor: '#ecfdf5',
    border: '1px solid #d1fae5',
    borderRadius: 12
  },
  assistantHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4
  },
  assistantTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: '#065f46'
  },
  assistantText: {
    fontSize: 12,
    color: '#047857',
    lineHeight: 1.4
  },

  bottomBar: {
    flexShrink: 0,
    padding: '10px 12px 22px',
    borderTop: '1px solid #eee',
    backgroundColor: '#fff'
  },
  actionsRow: {
    display: 'flex',
    gap: 10,
    marginBottom: 12
  },
  actionGhost: {
    flex: 1,
    padding: '10px',
    borderRadius: 12,
    border: '1px solid #e5e5e5',
    backgroundColor: '#fff',
    color: '#111',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6
  },
  actionPrimary: {
    flex: 1,
    padding: '10px',
    borderRadius: 12,
    border: 'none',
    backgroundColor: '#c04a4a',
    color: '#fff',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6
  },
  inputLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
    fontWeight: 500
  },
  inputRow: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: 8
  },
  plusBtn: {
    width: 32, height: 32,
    borderRadius: '50%',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    padding: '10px 12px',
    borderRadius: 12,
    border: '1px solid #e5e5e5',
    backgroundColor: '#fafafa',
    fontSize: 14,
    fontFamily: 'inherit',
    outline: 'none',
    resize: 'none',
    boxSizing: 'border-box'
  },
  sendBtn: {
    width: 40, height: 40,
    borderRadius: 12,
    backgroundColor: '#16a34a',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },

  // ==== POPUP ====
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    padding: 20
  },
  popup: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 320,
    boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
  },
  popupTitle: {
    fontSize: 16,
    fontWeight: 800,
    color: '#111',
    marginBottom: 4
  },
  popupSub: {
    fontSize: 12,
    color: '#666',
    marginBottom: 14
  },
  offerInputWrap: {
    display: 'flex',
    alignItems: 'center',
    border: '1.5px solid #e5e5e5',
    borderRadius: 12,
    padding: '10px 12px',
    gap: 6
  },
  currencyPrefix: {
    fontSize: 18,
    fontWeight: 700,
    color: '#16a34a'
  },
  offerInput: {
    flex: 1,
    border: 'none',
    outline: 'none',
    fontSize: 18,
    fontWeight: 700,
    color: '#111',
    background: 'none'
  },
  currencySuffix: {
    fontSize: 12,
    fontWeight: 600,
    color: '#888'
  },
  popupBtnGhost: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    border: '1px solid #e5e5e5',
    backgroundColor: '#fff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer'
  },
  popupBtnPrimary: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    border: 'none',
    backgroundColor: '#16a34a',
    color: '#fff',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer'
  }
};