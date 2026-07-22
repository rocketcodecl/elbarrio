import { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabase";

const Icon = {
  Back: ({ size = 22, color = "#111" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
    </svg>
  ),
  Send: ({ size = 20, color = "#fff" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
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
  // Check simple (✓) — mensaje enviado pero no leído
  Check: ({ size = 12, color = "#999" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  // Doble check (✓✓) — mensaje leído por el otro
  CheckDouble: ({ size = 13, color = "#3b82f6" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="18 7 9 16 4 11"/>
      <polyline points="22 7 13 16 11 14"/>
    </svg>
  ),
  // Reloj — mensaje enviándose (optimistic, aún sin confirmar en DB)
  Clock: ({ size = 11, color = "#999" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/>
    </svg>
  ),
  // Error — mensaje fallido
  Alert: ({ size = 12, color = "#dc2626" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  )
};

// Animaciones CSS: typing dots + entrada de burbuja nueva
const CHAT_STYLE = `
@keyframes typingBounce {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
  30% { transform: translateY(-4px); opacity: 1; }
}
@keyframes bubbleIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}
.chat-typing-dot { animation: typingBounce 1.2s infinite; }
.chat-bubble-in { animation: bubbleIn 0.18s ease-out; }
`;

export default function ChatConversation({ postId, sellerId, currentUser, previewMode = false, onNavigate }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [seller, setSeller] = useState(null);
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showOffer, setShowOffer] = useState(false);
  const [offerAmount, setOfferAmount] = useState("");
  // "X está escribiendo..." — llega por broadcast del canal realtime
  const [otherTyping, setOtherTyping] = useState(false);
  const scrollRef = useRef(null);
  const channelRef = useRef(null);
  const typingResetRef = useRef(null);
  const lastTypingSentRef = useRef(0);
  const nav = onNavigate || (() => {});
  const myProfileId = currentUser?.profileId || currentUser?.id;
  const myIds = [...new Set([myProfileId, currentUser?.id].filter(Boolean))];
  const otherUserId = previewMode ? '__demo_neighbor__' : sellerId;

  const isConversationMessage = (message) => {
    if (!message || message.post_id !== postId) return false;
    return (
      (myIds.includes(message.sender_id) && message.receiver_id === otherUserId) ||
      (message.sender_id === otherUserId && myIds.includes(message.receiver_id))
    );
  };

  useEffect(() => {
    if (previewMode) {
      const now = Date.now();
      setSeller({ full_name: 'Camila, vecina', avatar_url: null, badge_founder: false });
      setMessages([
        { id: 'demo_1', sender_id: otherUserId, receiver_id: myProfileId, post_id: postId, content: '¡Hola! ¿Todavía está disponible?', created_at: new Date(now - 8 * 60000).toISOString(), read: true },
        { id: 'demo_2', sender_id: myProfileId, receiver_id: otherUserId, post_id: postId, content: 'Hola, sí. Está disponible 😊', created_at: new Date(now - 6 * 60000).toISOString(), read: true },
        { id: 'demo_3', sender_id: otherUserId, receiver_id: myProfileId, post_id: postId, content: 'Perfecto, ¿podemos coordinar para mañana?', created_at: new Date(now - 3 * 60000).toISOString(), read: true },
      ]);
      supabase.from('posts').select('title, price, type, images, author_id, status').eq('id', postId).maybeSingle()
        .then(({ data }) => { if (data) setPost(data); setLoading(false); });
      return;
    }
    fetchInitial();
    // Canal aislado por publicación y por los dos participantes.
    // Así tampoco se cruza el indicador de escritura entre interesados.
    const participantKey = [myProfileId, otherUserId].sort().join('_');
    const channel = supabase.channel(`chat_${postId}_${participantKey}`, {
      config: { broadcast: { self: false } }
    });
    channelRef.current = channel;

    channel
      // INSERT: mensaje nuevo (mío o del otro). Evitamos duplicar si ya lo
      // agregamos optimistamente (comparamos por content + timestamp cercano).
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `sender_id=eq.${otherUserId}` },
        (payload) => {
          setMessages(prev => {
            if (!isConversationMessage(payload.new)) return prev;
            // Si ya existe (insert optimista con mismo content en los últimos 3s), reemplazar
            const idx = prev.findIndex(m =>
              m._pending &&
              m.content === payload.new.content &&
              m.sender_id === payload.new.sender_id &&
              Math.abs(new Date(m.created_at) - new Date(payload.new.created_at)) < 5000
            );
            if (idx >= 0) {
              const copy = [...prev];
              copy[idx] = { ...payload.new, _justArrived: true };
              return copy;
            }
            // Si ya está por id, no duplicar
            if (prev.some(m => m.id === payload.new.id)) return prev;
            return [...prev, { ...payload.new, _justArrived: true }];
          });
          // Si el mensaje es del otro, marcarlo como leído automáticamente
          // (estoy en la conversación, lo estoy viendo).
          if (payload.new.sender_id === otherUserId && payload.new.receiver_id === myProfileId && !payload.new.read) {
            supabase.from('messages')
              .update({ read: true })
              .eq('id', payload.new.id)
              .then(() => {});
          }
        }
      )
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `sender_id=eq.${myProfileId}` },
        (payload) => {
          if (!isConversationMessage(payload.new)) return;
          setMessages(prev => {
            const idx = prev.findIndex(m =>
              m._pending && m.content === payload.new.content &&
              Math.abs(new Date(m.created_at) - new Date(payload.new.created_at)) < 5000
            );
            if (idx >= 0) {
              const copy = [...prev];
              copy[idx] = payload.new;
              return copy;
            }
            return prev.some(m => m.id === payload.new.id) ? prev : [...prev, payload.new];
          });
        }
      )
      // UPDATE: cuando el otro marca mi mensaje como leído (abre el chat).
      // Cambiamos el check ✓ a ✓✓ azul.
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `sender_id=eq.${myProfileId}` },
        (payload) => {
          if (!isConversationMessage(payload.new)) return;
          setMessages(prev => prev.map(m =>
            m.id === payload.new.id ? { ...payload.new, _justArrived: m._justArrived } : m
          ));
        }
      )
      // Broadcast: typing indicator. El otro escribe → llega este evento.
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload?.senderId !== otherUserId || payload?.receiverId !== myProfileId) return;
        setOtherTyping(true);
        // Si no llega otro typing en 3s, ocultamos el indicador.
        if (typingResetRef.current) clearTimeout(typingResetRef.current);
        typingResetRef.current = setTimeout(() => setOtherTyping(false), 3000);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (typingResetRef.current) clearTimeout(typingResetRef.current);
    };
  }, [postId, myProfileId, otherUserId, previewMode]);

  // Scroll suave al final cuando llegan mensajes nuevos o cambia el typing
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, otherTyping]);

  const fetchInitial = async () => {
    setLoading(true);
    const [msgRes, sellerRes, postRes] = await Promise.all([
      supabase.from("messages")
        .select("*")
        .eq("post_id", postId)
        .or(myIds.flatMap(myId => [
          `and(sender_id.eq.${myId},receiver_id.eq.${otherUserId})`,
          `and(sender_id.eq.${otherUserId},receiver_id.eq.${myId})`
        ]).join(','))
        .order("created_at", { ascending: true }),
      supabase.from("profiles")
        .select("id, full_name, avatar_url, badge_founder, reputation_score")
        .or(`id.eq.${otherUserId},user_id.eq.${otherUserId}`)
        .maybeSingle(),
      supabase.from("posts")
        .select("title, price, type, images, author_id, status")
        .eq("id", postId)
        .single()
    ]);
    if (msgRes.data) setMessages(msgRes.data);
    if (sellerRes.data) setSeller(sellerRes.data);
    if (postRes.data) setPost(postRes.data);
    setLoading(false);

    // Marcar como leídos los mensajes que me llegaron y aún no leo
    await supabase
      .from("messages")
      .update({ read: true })
      .eq("post_id", postId)
      .eq("sender_id", otherUserId)
      .eq("receiver_id", myProfileId)
      .eq("read", false);
  };

  // Inserción optimista: el mensaje aparece INSTANTÁNEAMENTE con un reloj,
  // luego se reemplaza por el real cuando llega por realtime (o falla).
  const sendMessage = async (customText = null) => {
    const content = (customText || text).trim();
    if (!content) return;
    setText("");

    if (previewMode) {
      setMessages(prev => [...prev, {
        id: 'demo_' + Date.now(), sender_id: myProfileId, receiver_id: otherUserId,
        post_id: postId, content, created_at: new Date().toISOString(), read: true
      }]);
      return;
    }

    const tempId = 'temp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    const optimisticMsg = {
      id: tempId,
      sender_id: myProfileId,
      receiver_id: otherUserId,
      post_id: postId,
      content,
      created_at: new Date().toISOString(),
      read: false,
      _pending: true,
    };
    setMessages(prev => [...prev, optimisticMsg]);

    const { data, error } = await supabase.from("messages").insert({
      sender_id: myProfileId,
      receiver_id: otherUserId,
      post_id: postId,
      content
    }).select();

    if (error) {
      console.error("Error mensaje:", error);
      // Marcar como fallido para mostrar el ícono de error y poder reintentar
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, _failed: true, _pending: false } : m));
    } else if (data && data[0]) {
      // El INSERT llegará por realtime y reemplazará el temporal automáticamente
      // (por el filtro de content + timestamp en el handler de INSERT).
      // Pero si realtime tarda, reemplazamos acá directamente.
      setMessages(prev => prev.map(m => m.id === tempId ? data[0] : m));
    }
  };

  // Reintentar envío de un mensaje fallido
  const retryMessage = (msg) => {
    setMessages(prev => prev.filter(m => m.id !== msg.id));
    sendMessage(msg.content);
  };

  // Typing indicator: mandamos broadcast 'typing' con debounce de 1.5s
  // para no saturar el canal. El otro lo recibe y muestra "escribiendo...".
  const handleTyping = () => {
    const now = Date.now();
    if (now - lastTypingSentRef.current > 1500) {
      channelRef.current?.send({
        type: 'broadcast',
        event: 'typing',
        payload: { senderId: myProfileId, receiverId: otherUserId }
      });
      lastTypingSentRef.current = now;
    }
  };

  const sendOffer = () => {
    if (!offerAmount) return;
    sendMessage(`💰 Oferta: $${Number(offerAmount).toLocaleString('es-CL')} CLP`);
    setOfferAmount("");
    setShowOffer(false);
  };

  const proposeMeeting = () => {
    sendMessage('🤝 Me gustaría que coordinemos el encuentro. ¿Qué día, hora y lugar público te acomoda?');
  };

  const postType = (post?.type || '').toLowerCase();
  const isGift = ['regalo', 'gratis', 'gift'].includes(postType);
  const isTrade = ['trueque', 'intercambio', 'trade'].includes(postType);
  const quickActionLabel = isGift ? 'Solicitar regalo' : isTrade ? 'Proponer trueque' : 'Hacer oferta';
  const sendQuickAction = () => {
    if (isGift) sendMessage('🎁 Me interesa este regalo. ¿Sigue disponible?');
    else if (isTrade) sendMessage('🔄 Me interesa hacer un trueque. ¿Qué tipo de intercambio buscas?');
    else setShowOffer(true);
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

  // Agrupar mensajes por día: "Hoy", "Ayer", "12 mar"
  // Muestra un chip de fecha entre grupos (antes era siempre "Hoy" hardcodeado).
  const groupMessagesByDate = (msgs) => {
    const groups = [];
    let lastLabel = null;
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];

    for (const msg of msgs) {
      const d = new Date(msg.created_at);
      let label;
      if (d.toDateString() === today.toDateString()) label = 'Hoy';
      else if (d.toDateString() === yesterday.toDateString()) label = 'Ayer';
      else label = `${d.getDate()} ${meses[d.getMonth()]}`;

      if (label !== lastLabel) {
        groups.push({ type: 'date', label, key: 'date_' + label });
        lastLabel = label;
      }
      groups.push({ type: 'msg', msg, key: msg.id });
    }
    return groups;
  };

  const grouped = groupMessagesByDate(messages);

  return (
    <div style={s.wrap}>
      <style dangerouslySetInnerHTML={{ __html: CHAT_STYLE }} />

      {/* HEADER */}
      <div style={s.header}>
        <button onClick={() => nav('back')} style={s.backBtn} aria-label="Volver">
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
          {/* Subtítulo: si está escribiendo, mostramos eso. Sino, la ref al post. */}
          {otherTyping ? (
            <div style={s.typingText}>escribiendo…</div>
          ) : (
            <div style={s.postRef}>
              <Icon.Tag size={11} color="#666" />
              <span>{post?.title || 'Publicación'}</span>
            </div>
          )}
        </div>
        {post?.images?.[0] && <img src={post.images[0]} alt="" style={s.postThumb} />}
      </div>

      {previewMode && (
        <div style={s.previewBanner}>Vista previa · nada de este chat se guardará</div>
      )}

      {/* MENSAJES */}
      <div style={s.messagesWrap} ref={scrollRef}>
        {loading ? (
          <div style={s.emptyChat}>Cargando conversación…</div>
        ) : messages.length === 0 ? (
          <div style={s.emptyChat}>
            <img src="/isotipo.png" alt="" style={{ width: 70, opacity: 0.4, marginBottom: 12 }} />
            <div style={{ fontSize: 13, fontWeight: 600, color: '#555' }}>Aún no hay mensajes</div>
            <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>Rompe el hielo con un saludo</div>
          </div>
        ) : (
          grouped.map((item) => {
            if (item.type === 'date') {
              return <div key={item.key} style={s.dateChip}>{item.label}</div>;
            }
            const msg = item.msg;
            const mine = myIds.includes(msg.sender_id);
            return (
              <div key={item.key} style={{ display: 'flex', flexDirection: 'column', alignItems: mine ? 'flex-end' : 'flex-start' }}>
                <div className="chat-bubble-in" style={mine ? s.bubbleMine : s.bubbleTheirs}>
                  {msg.content}
                </div>
                <div style={s.msgTime}>
                  {formatTime(msg.created_at)}
                  {/* Estado del mensaje: reloj (enviando) / error (fallido) / check (enviado) / doble check (leído) */}
                  {mine && msg._pending && <Icon.Clock />}
                  {mine && msg._failed && (
                    <button onClick={() => retryMessage(msg)} style={s.retryBtn} aria-label="Reintentar">
                      <Icon.Alert />
                    </button>
                  )}
                  {mine && !msg._pending && !msg._failed && msg.read && <Icon.CheckDouble />}
                  {mine && !msg._pending && !msg._failed && !msg.read && <Icon.Check />}
                </div>
              </div>
            );
          })
        )}

        {/* Indicador "escribiendo..." como burbuja animada de 3 puntos */}
        {otherTyping && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: 4 }}>
            <div style={s.typingBubble}>
              <span style={{ ...s.typingDot, animationDelay: '0s' }} className="chat-typing-dot" />
              <span style={{ ...s.typingDot, animationDelay: '0.2s' }} className="chat-typing-dot" />
              <span style={{ ...s.typingDot, animationDelay: '0.4s' }} className="chat-typing-dot" />
            </div>
          </div>
        )}

        {/* Asistente de vecindario */}
        <div style={s.assistantCard}>
          <div style={s.assistantHeader}>
            <Icon.Shield />
            <span style={s.assistantTitle}>Asistente de Vecindario</span>
          </div>
          <div style={s.assistantText}>
            Coordinen de día y en un lugar público. No pagues por adelantado ni compartas claves o códigos de verificación.
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
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); sendOffer(); } }}
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
          <button onClick={sendQuickAction} style={s.actionGhost}>
            <Icon.Tag />
            <span>{quickActionLabel}</span>
          </button>
          <button onClick={proposeMeeting} style={s.actionPrimary}>
            <Icon.Handshake />
            <span>Proponer encuentro</span>
          </button>
        </div>

        <div style={s.inputRow}>
          <textarea
            placeholder="Escribe un mensaje…"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              handleTyping();
            }}
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
    fontFamily: '"Plus Jakarta Sans", system-ui, -apple-system, sans-serif',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  },

  header: {
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: 'max(env(safe-area-inset-top, 44px), 44px) 12px 12px',
    borderBottom: '1px solid #eee',
    backgroundColor: '#fff'
  },
  previewBanner: {
    flexShrink: 0, background: '#fff7d6', color: '#7c5b00',
    borderBottom: '1px solid #f2df99', padding: '7px 12px',
    fontSize: 11.5, fontWeight: 600, textAlign: 'center',
  },
  backBtn: {
    width: 38, height: 38,
    borderRadius: '50%',
    background: '#f5f5f5',
    border: '1px solid #e5e5e5',
    cursor: 'pointer', padding: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  iconBtn: {
    width: 34, height: 34,
    background: 'none', border: 'none', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  avatar: { width: 38, height: 38, borderRadius: '50%', objectFit: 'cover' },
  postThumb: { width: 38, height: 38, borderRadius: 9, objectFit: 'cover', flexShrink: 0, border: '1px solid #e5e7eb' },
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
  // Texto "escribiendo…" reemplaza al postRef cuando el otro está tipeando
  typingText: {
    fontSize: 11,
    color: '#16a34a',
    fontWeight: 600,
    fontStyle: 'italic',
    marginTop: 1,
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
    margin: '14px auto 10px'
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
  // Botón de reintentar mensaje fallido
  retryBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Burbuja de "escribiendo..." con 3 puntos animados
  typingBubble: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#e8e8e8',
    padding: '12px 16px',
    borderRadius: 14,
    borderBottomLeftRadius: 4,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    backgroundColor: '#888',
    display: 'inline-block',
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
    backgroundColor: '#0f5f36',
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
