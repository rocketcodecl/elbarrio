import { useState, useRef, useEffect } from 'react'

function PostCard({ post, author }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [hasInteracted, setHasInteracted] = useState(false)
  const scrollRef = useRef(null)
  const cardRef = useRef(null)

  const typeConfig = {
    alert: {
      label: '🚨 Alerta',
      color: '#E63946',
      bgColor: '#FEE2E2',
      showAlertHeader: true,
    },
    sell: {
      label: '💰 Vendo',
      color: '#138864',
      bgColor: '#DCFCE7',
    },
    gift: {
      label: '🎁 Regalo',
      color: '#9B5DE5',
      bgColor: '#F3E8FF',
    },
    trade: {
      label: '🔄 Trueque',
      color: '#2EC4B6',
      bgColor: '#CFFAFE',
    },
    event: {
      label: '🎉 Evento',
      color: '#F4A261',
      bgColor: '#FED7AA',
    },
    service: {
      label: '🔧 Servicio',
      color: '#457B9D',
      bgColor: '#DBEAFE',
    },
    general: {
      label: '📢 Publicación',
      color: '#6B7280',
      bgColor: '#F3F4F6',
    },
  }

  const config = typeConfig[post.type] || typeConfig.general
  const isBusiness = author?.user_type === 'business'
  const isOrganization = author?.user_type === 'organization'
  const isService = author?.user_type === 'service_provider'
  const hasImages = post.images && post.images.length > 0
  const hasMultipleImages = hasImages && post.images.length > 1

  // HINT ANIMADO - Solo cuando la card aparece en pantalla
  useEffect(() => {
    if (!hasMultipleImages || hasInteracted || !scrollRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasInteracted) {
            // Esperar un poquito antes de animar (para que se vea)
            setTimeout(() => {
              if (scrollRef.current && !hasInteracted) {
                const width = scrollRef.current.offsetWidth
                // Movimiento sutil hacia la derecha (peek)
                scrollRef.current.scrollTo({
                  left: 60,
                  behavior: 'smooth',
                })
                // Vuelve a la posición original
                setTimeout(() => {
                  if (scrollRef.current && !hasInteracted) {
                    scrollRef.current.scrollTo({
                      left: 0,
                      behavior: 'smooth',
                    })
                  }
                }, 800)
              }
            }, 600)
            observer.disconnect()
          }
        })
      },
      { threshold: 0.5 }
    )

    if (cardRef.current) {
      observer.observe(cardRef.current)
    }

    return () => observer.disconnect()
  }, [hasMultipleImages, hasInteracted])

  const initials = author?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?'

  const timeAgo = (dateStr) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = Math.floor((now - date) / 1000 / 60)
    if (diff < 1) return 'ahora'
    if (diff < 60) return `hace ${diff}m`
    if (diff < 1440) return `hace ${Math.floor(diff / 60)}h`
    return `hace ${Math.floor(diff / 1440)}d`
  }

  const handleScroll = (e) => {
    setHasInteracted(true)
    const scrollLeft = e.target.scrollLeft
    const width = e.target.offsetWidth
    const index = Math.round(scrollLeft / width)
    setCurrentImageIndex(index)
  }

  const goToImage = (index) => {
    setHasInteracted(true)
    if (scrollRef.current) {
      const width = scrollRef.current.offsetWidth
      scrollRef.current.scrollTo({
        left: width * index,
        behavior: 'smooth',
      })
    }
  }

  return (
    <div 
      ref={cardRef}
      style={{
        ...styles.card,
        border: post.urgency === 'critical' ? '2px solid #FCA5A5' : '1px solid #E5E7EB',
      }}
    >
      {config.showAlertHeader && post.urgency === 'critical' && (
        <div style={styles.alertHeader}>
          <div style={styles.alertHeaderLeft}>
            <div style={styles.pulseDot} />
            <span style={styles.alertHeaderText}>ALERTA ACTIVA</span>
          </div>
          <span style={styles.alertTime}>
            {timeAgo(post.created_at)} · {post.distance_meters}m
          </span>
        </div>
      )}

      <div style={styles.content}>
        <div style={styles.authorRow}>
          <div style={{
            ...styles.avatar,
            background: isBusiness ? '#F59E0B' : isOrganization ? '#138864' : isService ? '#457B9D' : '#6366F1',
          }}>
            {initials}
          </div>
          <div style={styles.authorInfo}>
            <div style={styles.authorName}>
              <span>{author?.full_name || 'Usuario'}</span>
              {author?.verified && (
                <span style={styles.verifiedBadge}>✓</span>
              )}
              {isBusiness && (
                <span style={styles.typeBadge}>COMERCIO</span>
              )}
              {isOrganization && (
                <span style={{ ...styles.typeBadge, background: '#DCFCE7', color: '#138864' }}>
                  OFICIAL
                </span>
              )}
              {isService && (
                <span style={{ ...styles.typeBadge, background: '#DBEAFE', color: '#457B9D' }}>
                  SERVICIO
                </span>
              )}
            </div>
            <div style={styles.authorMeta}>
              ⭐ {author?.reputation_score?.toFixed(1) || '5.0'} · a {post.distance_meters}m
              {!config.showAlertHeader && ` · ${timeAgo(post.created_at)}`}
            </div>
          </div>
        </div>

        <div style={{
          ...styles.typeTag,
          background: config.bgColor,
          color: config.color,
        }}>
          {config.label}
        </div>

        {post.title && (
          <div style={styles.title}>{post.title}</div>
        )}

        <div style={styles.text}>{post.content}</div>
      </div>

      {/* CARRUSEL CON HINT ANIMADO */}
      {hasImages && (
        <div style={styles.imageWrapper}>
          <div 
            ref={scrollRef}
            onScroll={handleScroll}
            style={styles.imageScroll}
            className="scroll-hide"
          >
            {post.images.map((img, index) => (
              <div key={index} style={styles.imageSlide}>
                <img 
                  src={img} 
                  alt={`${post.title} - ${index + 1}`}
                  style={styles.image}
                  draggable={false}
                />
              </div>
            ))}
          </div>

          {hasMultipleImages && (
            <div style={styles.imageCounter}>
              {currentImageIndex + 1}/{post.images.length}
            </div>
          )}

          {hasMultipleImages && (
            <div style={styles.dots}>
              {post.images.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToImage(index)}
                  style={{
                    ...styles.dot,
                    width: index === currentImageIndex ? 20 : 6,
                    background: index === currentImageIndex 
                      ? 'white' 
                      : 'rgba(255,255,255,0.5)',
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ ...styles.content, paddingTop: hasImages ? 12 : 0 }}>
        {post.price && (
          <div style={styles.priceBox}>
            <div style={styles.price}>${post.price.toLocaleString('es-CL')}</div>
            {post.is_negotiable && (
              <div style={styles.negotiable}>Conversable</div>
            )}
          </div>
        )}

        <div style={{ ...styles.footer, marginTop: post.price ? 14 : (hasImages ? 4 : 14) }}>
          <div style={styles.reactions}>
            <button style={styles.reactionBtn}>
              <span>❤️</span>
              <span style={styles.reactionCount}>{post.likes_count || 0}</span>
            </button>
            <button style={styles.reactionBtn}>
              <span>💬</span>
              <span style={styles.reactionCount}>{post.comments_count || 0}</span>
            </button>
          </div>

          {post.type === 'alert' && (
            <button style={{ ...styles.actionBtn, color: '#138864' }}>
              Marcar visto ✓
            </button>
          )}
          {post.type === 'sell' && (
            <button style={{ ...styles.actionBtn, background: '#138864', color: 'white', padding: '8px 16px', borderRadius: 999 }}>
              💬 Chatear
            </button>
          )}
          {post.type === 'gift' && (
            <button style={{ ...styles.actionBtn, color: '#9B5DE5' }}>
              Me interesa →
            </button>
          )}
          {post.type === 'event' && (
            <button style={{ ...styles.actionBtn, border: '1.5px solid #F4A261', color: '#F4A261', padding: '6px 14px', borderRadius: 999 }}>
              Asistiré
            </button>
          )}
          {post.type === 'service' && (
            <button style={{ ...styles.actionBtn, background: '#457B9D', color: 'white', padding: '8px 16px', borderRadius: 999 }}>
              Contactar
            </button>
          )}
          {(post.type === 'general' || post.type === 'trade') && (
            <button style={{ ...styles.actionBtn, color: '#138864' }}>
              Ver más →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

const styles = {
  card: {
    background: 'white',
    borderRadius: '20px',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  alertHeader: {
    background: '#FEE2E2',
    padding: '10px 16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  alertHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  pulseDot: {
    width: '8px',
    height: '8px',
    background: '#E63946',
    borderRadius: '50%',
    animation: 'pulse 2s infinite',
  },
  alertHeaderText: {
    fontSize: '11px',
    fontWeight: 800,
    color: '#991B1B',
    letterSpacing: '0.5px',
  },
  alertTime: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#991B1B',
  },
  content: {
    padding: '16px',
  },
  authorRow: {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
    marginBottom: '12px',
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontWeight: 700,
    fontSize: '13px',
    flexShrink: 0,
  },
  authorInfo: {
    flex: 1,
    minWidth: 0,
  },
  authorName: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '14px',
    fontWeight: 700,
    color: '#1A1A1A',
    flexWrap: 'wrap',
  },
  verifiedBadge: {
    background: '#138864',
    color: 'white',
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    fontSize: '10px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
  },
  typeBadge: {
    fontSize: '9px',
    fontWeight: 800,
    background: '#FEF3C7',
    color: '#92400E',
    padding: '2px 6px',
    borderRadius: '4px',
    letterSpacing: '0.5px',
  },
  authorMeta: {
    fontSize: '11px',
    color: '#6B7280',
    marginTop: '2px',
  },
  typeTag: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '10px',
    fontWeight: 700,
    marginBottom: '10px',
    letterSpacing: '0.3px',
  },
  title: {
    fontSize: '15px',
    fontWeight: 700,
    color: '#1A1A1A',
    marginBottom: '6px',
  },
  text: {
    fontSize: '14px',
    color: '#374151',
    lineHeight: 1.5,
  },
  imageWrapper: {
    position: 'relative',
    marginTop: 12,
    background: '#F3F4F6',
  },
  imageScroll: {
    display: 'flex',
    overflowX: 'auto',
    scrollSnapType: 'x mandatory',
    WebkitOverflowScrolling: 'touch',
  },
  imageSlide: {
    minWidth: '100%',
    scrollSnapAlign: 'start',
    scrollSnapStop: 'always',
  },
  image: {
    width: '100%',
    height: 280,
    objectFit: 'cover',
    display: 'block',
    userSelect: 'none',
  },
  imageCounter: {
    position: 'absolute',
    top: 12,
    right: 12,
    background: 'rgba(0,0,0,0.7)',
    color: 'white',
    fontSize: 11,
    fontWeight: 700,
    padding: '4px 10px',
    borderRadius: 999,
    backdropFilter: 'blur(8px)',
  },
  dots: {
    position: 'absolute',
    bottom: 12,
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    gap: 4,
    background: 'rgba(0,0,0,0.4)',
    padding: '5px 8px',
    borderRadius: 999,
    backdropFilter: 'blur(8px)',
  },
  dot: {
    height: 6,
    borderRadius: 3,
    transition: 'all 0.3s ease',
    padding: 0,
    border: 'none',
  },
  priceBox: {
    marginTop: '4px',
  },
  price: {
    fontSize: '22px',
    fontWeight: 800,
    color: '#1A1A1A',
  },
  negotiable: {
    fontSize: '11px',
    color: '#6B7280',
    marginTop: '2px',
  },
  footer: {
    paddingTop: '12px',
    borderTop: '1px solid #F3F4F6',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reactions: {
    display: 'flex',
    gap: '16px',
  },
  reactionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    background: 'transparent',
  },
  reactionCount: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#6B7280',
  },
  actionBtn: {
    fontSize: '13px',
    fontWeight: 700,
    background: 'transparent',
  },
}

export default PostCard