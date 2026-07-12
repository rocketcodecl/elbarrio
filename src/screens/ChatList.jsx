import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// ===== ICONOS SVG =====
const Icon = {
  Search: ({ size = 18, color = '#888' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  ChevronRight: ({ size = 16, color = '#ccc' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  ),
  MessageSquare: ({ size = 32, color = '#16a34a' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  StoreSm: ({ size = 11, color = '#666' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  )
}

const getInitials = (name) => {
  if (!name) return '??'
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}

// Formateador de tiempo estilo chat vecinal
const formatMessageTime = (dateString) => {
  if (!dateString) return ''
  const d = new Date(dateString)
  const now = new Date()
  
  // Hoy: "14:32"
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
  }
  
  // Ayer: "Ayer"
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) {
    return 'Ayer'
  }
  
  // Hace menos de 7 días: "lun", "mié"
  const diffTime = Math.abs(now - d)
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  if (diffDays < 7) {
    const dias = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']
    return dias[d.getDay()]
  }
  
  // Más antiguo: "12 mar"
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  return `${d.getDate()} ${meses[d.getMonth()]}`
}

function ChatList({ currentUser, onNavigate }) {
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (currentUser?.id) {
      loadConversations()
      
      // Suscribirse a realtime para actualizar si entra un mensaje nuevo
      const subscription = supabase
        .channel('realtime-chatlist')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
          loadConversations()
        })
        .subscribe()

      return () => {
        supabase.removeChannel(subscription)
      }
    }
  }, [currentUser?.id])

  const loadConversations = async () => {
    try {
      const myId = currentUser.id
      console.log('MI USER ID EN CHATLIST:', myId)

      // 1. Obtener todos los mensajes donde soy emisor o receptor
      const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${myId},receiver_id.eq.${myId}`)
        .order('created_at', { ascending: false })

      if (error) throw error
      if (!messages || messages.length === 0) {
        setConversations([])
        setLoading(false)
        return
      }

      // 2. Agrupar mensajes para quedarnos con el último por conversación
      // Llave de agrupación: other_user_id + '_' + (post_id || 'general')
      const groups = {}

      for (const msg of messages) {
        const otherUserId = msg.sender_id === myId ? msg.receiver_id : msg.sender_id
        const groupKey = `${otherUserId}_${msg.post_id || 'general'}`

        if (!groups[groupKey]) {
          groups[groupKey] = {
            lastMessage: msg,
            otherUserId,
            postId: msg.post_id,
            unreadCount: 0
          }
        }

        // Si yo soy el receptor y el mensaje está marcado como read = false, sumar al contador
        if (msg.receiver_id === myId && msg.read === false) {
          groups[groupKey].unreadCount += 1
        }
      }

      const rawGroups = Object.values(groups)

      // 3. Cargar información de perfiles y posts asociados
      const populated = await Promise.all(
        rawGroups.map(async (group) => {
          // Traer perfil del otro vecino
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .or(`id.eq.${group.otherUserId},user_id.eq.${group.otherUserId}`)
            .maybeSingle()

          // Traer datos del producto (si existe post_id)
          let post = null
          if (group.postId) {
            const { data: postData } = await supabase
              .from('posts')
              .select('title, images')
              .eq('id', group.postId)
              .maybeSingle()
            
            if (postData) {
              post = {
                title: postData.title,
                // Resguardar que images sea un array o tenga al menos un string
                image: Array.isArray(postData.images) ? postData.images[0] : null
              }
            }
          }

          return {
            ...group,
            otherUser: {
              id: group.otherUserId,
              fullName: profile?.full_name || 'Vecino anónimo',
              avatarUrl: profile?.avatar_url
            },
            post
          }
        })
      )

      // Ordenar por el mensaje más reciente arriba
      populated.sort((a, b) => new Date(b.lastMessage.created_at) - new Date(a.lastMessage.created_at))

      setConversations(populated)
    } catch (err) {
      console.error('Error cargando conversaciones:', err)
    } finally {
      setLoading(false)
    }
  }

  // Filtrar en vivo por buscador
  const filteredConversations = conversations.filter(c => 
    c.otherUser.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.post && c.post.title.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const handleSelectConversation = (conv) => {
    // Redirigir a la pantalla de chat realtime
    // Estructura idéntica a la que espera ChatConversation.jsx
    onNavigate('ChatConversation', {
      otherUserId: conv.otherUser.id,
      postId: conv.postId,
      otherUserName: conv.otherUser.fullName,
      postTitle: conv.post?.title
    })
  }

  if (loading) {
    return (
      <div style={s.loadingWrap}>
        <div style={s.spinner} />
      </div>
    )
  }

  return (
    <div style={s.wrap}>
      {/* HEADER PRINCIPAL */}
      <div style={s.header}>
        <div style={s.titleRow}>
          <span style={s.title}>Mensajes</span>
          <span style={s.subTitle}>Vecinos de Barrio Italia</span>
        </div>
      </div>

      {/* BUSCADOR */}
      <div style={s.searchBoxRow}>
        <div style={s.searchField}>
          <Icon.Search size={16} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por vecino o producto..."
            style={s.searchInput}
          />
          {searchQuery && (
            <button style={s.searchClear} onClick={() => setSearchQuery('')}>
              <Icon.X size={14} color="#999" />
            </button>
          )}
        </div>
      </div>

      {/* ÁREA DE CONTENIDO */}
      <div style={s.scrollArea}>
        {filteredConversations.length === 0 ? (
          <div style={s.empty}>
            <div style={s.emptyIconBox}>
              <Icon.MessageSquare size={36} color="#16a34a" />
            </div>
            <img src="/isotipo.png" alt="" style={s.emptyIso} />
            <div style={s.emptyTitle}>
              {searchQuery ? 'Sin resultados para la búsqueda' : 'Aún no tienes mensajes'}
            </div>
            <div style={s.emptySub}>
              {searchQuery ? 'Prueba con otro nombre o palabra clave' : 'Cuando contactes a un vecino del mercado o respondas un aviso, verás tu conversación aquí.'}
            </div>
          </div>
        ) : (
          <div style={s.list}>
            {filteredConversations.map((conv, idx) => {
              const other = conv.otherUser
              const last = conv.lastMessage
              const post = conv.post
              const unread = conv.unreadCount > 0

              return (
                <div
                  key={idx}
                  style={s.row}
                  onClick={() => handleSelectConversation(conv)}
                >
                  {/* Avatar vecino */}
                  <div style={s.avatarCol}>
                    {other.avatarUrl ? (
                      <img src={other.avatarUrl} alt="" style={s.avatarImg} />
                    ) : (
                      <div style={s.avatarFallback}>{getInitials(other.fullName)}</div>
                    )}
                    {/* Indicador de activo o no leídos en absoluto flotante */}
                    {unread && <div style={s.unreadBadgeFloating} />}
                  </div>

                  {/* Detalle del Mensaje */}
                  <div style={s.contentCol}>
                    <div style={s.topLine}>
                      <span style={{ ...s.neighborName, fontWeight: unread ? 800 : 700 }}>
                        {other.fullName}
                      </span>
                      <span style={{ ...s.timeText, color: unread ? '#16a34a' : '#888', fontWeight: unread ? 700 : 500 }}>
                        {formatMessageTime(last.created_at)}
                      </span>
                    </div>

                    {/* Referencia al Producto (Chip de contexto "Opción B") */}
                    {post && (
                      <div style={s.productChip}>
                        <Icon.StoreSm size={10} color="#16a34a" />
                        <span style={s.productChipText}>{post.title}</span>
                      </div>
                    )}

                    <div style={s.msgLine}>
                      <span style={{
                        ...s.msgText,
                        fontWeight: unread ? 600 : 400,
                        color: unread ? '#111' : '#666'
                      }}>
                        {last.content}
                      </span>

                      {/* Badge de mensajes sin leer */}
                      {unread && (
                        <div style={s.unreadBadgeCounter}>
                          {conv.unreadCount}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Imagen de miniatura del post (si existe) */}
                  {post && post.image && (
                    <div style={s.postMiniCol}>
                      <img src={post.image} alt="" style={s.postMiniImg} />
                    </div>
                  )}

                  {!post?.image && (
                    <div style={s.arrowCol}>
                      <Icon.ChevronRight />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
        <div style={{ height: 100 }} />
      </div>
    </div>
  )
}

// ===== ESTILOS INLINE =====
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
  loadingWrap: {
    width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff'
  },
  spinner: {
    width: 28, height: 28, borderRadius: '50%', border: '3px solid #e5e7eb', borderTopColor: '#16a34a', animation: 'spin 1s linear infinite'
  },

  header: {
    flexShrink: 0,
    backgroundColor: '#fff',
    padding: '52px 18px 12px',
    borderBottom: '1px solid #f3f4f6'
  },
  titleRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: 3
  },
  title: {
    fontSize: 22,
    fontWeight: 800,
    color: '#111'
  },
  subTitle: {
    fontSize: 12,
    color: '#888',
    fontWeight: 500
  },

  searchBoxRow: {
    padding: '12px 18px',
    backgroundColor: '#fff',
    borderBottom: '1px solid #f3f4f6',
    flexShrink: 0
  },
  searchField: {
    height: 42,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    padding: '0 12px',
    gap: 8,
    position: 'relative'
  },
  searchInput: {
    flex: 1,
    border: 'none',
    background: 'none',
    fontSize: 13.5,
    fontFamily: 'inherit',
    outline: 'none',
    color: '#111'
  },
  searchClear: {
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    padding: 4,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },

  scrollArea: {
    flex: 1,
    overflowY: 'auto',
    backgroundColor: '#f4f7f4', // Fondo sutil para destacar las cards blancas estilo Airbnb
    WebkitOverflowScrolling: 'touch'
  },

  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 1, // Espaciado fino entre filas
    backgroundColor: '#e5e7eb', // Actúa como divisor sutil entre filas
  },

  row: {
    display: 'flex',
    alignItems: 'center',
    padding: '16px 18px',
    backgroundColor: '#fff',
    cursor: 'pointer',
    gap: 12,
    transition: 'background-color 0.1s'
  },

  avatarCol: {
    position: 'relative',
    flexShrink: 0
  },
  avatarImg: {
    width: 50,
    height: 50,
    borderRadius: '50%',
    objectFit: 'cover',
    display: 'block'
  },
  avatarFallback: {
    width: 50,
    height: 50,
    borderRadius: '50%',
    backgroundColor: '#16a34a',
    color: '#fff',
    fontSize: 16,
    fontWeight: 800,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  unreadBadgeFloating: {
    position: 'absolute',
    top: 1,
    right: 1,
    width: 12,
    height: 12,
    borderRadius: '50%',
    backgroundColor: '#16a34a',
    border: '2.5px solid #fff'
  },

  contentCol: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 4
  },
  topLine: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 8
  },
  neighborName: {
    fontSize: 15,
    color: '#111',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  timeText: {
    fontSize: 11.5
  },

  productChip: {
    alignSelf: 'flex-start',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#dcfce7',
    padding: '3px 8px',
    borderRadius: 6,
    maxWidth: '90%'
  },
  productChipText: {
    fontSize: 10.5,
    fontWeight: 700,
    color: '#16a34a',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },

  msgLine: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10
  },
  msgText: {
    fontSize: 13,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    flex: 1
  },
  unreadBadgeCounter: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#16a34a',
    color: '#fff',
    fontSize: 10,
    fontWeight: 800,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 4px',
    boxSizing: 'border-box'
  },

  postMiniCol: {
    flexShrink: 0
  },
  postMiniImg: {
    width: 44,
    height: 44,
    borderRadius: 8,
    objectFit: 'cover',
    display: 'block',
    border: '1px solid #eee'
  },
  arrowCol: {
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },

  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 30px',
    textAlign: 'center'
  },
  emptyIconBox: {
    width: 64,
    height: 64,
    borderRadius: '50%',
    backgroundColor: '#dcfce7',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16
  },
  emptyIso: {
    width: 38,
    height: 38,
    opacity: 0.15,
    marginBottom: 12
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: '#111',
    marginBottom: 6
  },
  emptySub: {
    fontSize: 12,
    color: '#888',
    lineHeight: 1.5,
    maxWidth: 240
  }
}

export default ChatList