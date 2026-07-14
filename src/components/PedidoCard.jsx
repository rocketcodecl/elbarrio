// src/components/PedidoCard.jsx
import { useRef } from 'react'

const fmtCLP = (n) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n || 0)

const fmtPlazo = (iso) => {
  if (!iso) return { txt: 'Sin plazo', color: '#94a3b8' }
  const diff = new Date(iso).getTime() - Date.now()
  const h = diff / 3600000
  if (h < 0) return { txt: 'Vencido', color: '#dc2626' }
  if (h < 3) return { txt: `Faltan ${Math.max(1, Math.floor(h))}h`, color: '#dc2626' }
  if (h < 12) return { txt: `Faltan ${Math.floor(h)}h`, color: '#ea580c' }
  if (h < 48) return { txt: `Faltan ${Math.floor(h / 24)}d`, color: '#ca8a04' }
  return { txt: `Faltan ${Math.floor(h / 24)}d`, color: '#16a34a' }
}

export default function PedidoCard({ post, onAyudar, onVerDetalle }) {
  const cardRef = useRef(null)
  const plazo = fmtPlazo(post.deadline || post.plazo)
  const presupuesto = post.budget || post.presupuesto
  const autor = post.author || post.perfil || {}
  const nombreAutor = autor.full_name || autor.name || 'Vecino'

  const s = {
    card: {
      background: '#fffbeb',
      border: '1px solid #fde68a',
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
    },
    top: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 8,
      marginBottom: 8,
    },
    titulo: {
      fontSize: 17,
      fontWeight: 700,
      color: '#1f2937',
      margin: 0,
      lineHeight: 1.3,
    },
    plazoBadge: {
      fontSize: 12,
      fontWeight: 700,
      color: '#fff',
      background: plazo.color,
      padding: '4px 10px',
      borderRadius: 999,
      whiteSpace: 'nowrap',
      flexShrink: 0,
    },
    desc: {
      fontSize: 14,
      color: '#4b5563',
      lineHeight: 1.45,
      margin: '0 0 12px',
    },
    fila: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
    },
    presupuesto: {
      fontSize: 20,
      fontWeight: 800,
      color: '#16a34a',
    },
    autor: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      fontSize: 13,
      color: '#6b7280',
    },
    avatar: {
      width: 26,
      height: 26,
      borderRadius: 999,
      background: '#16a34a',
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 13,
      fontWeight: 700,
    },
    btn: {
      width: '100%',
      padding: '12px 16px',
      borderRadius: 12,
      border: 'none',
      background: '#16a34a',
      color: '#fff',
      fontSize: 15,
      fontWeight: 700,
      cursor: 'pointer',
    },
  }

  return (
    <div ref={cardRef} style={s.card} onClick={() => onVerDetalle?.(post)}>
      <div style={s.top}>
        <h3 style={s.titulo}>🙋 {post.title || post.titulo || 'Pedido vecinal'}</h3>
        <span style={s.plazoBadge}>{plazo.txt}</span>
      </div>
      {post.description || post.descripcion ? (
        <p style={s.desc}>{post.description || post.descripcion}</p>
      ) : null}
      <div style={s.fila}>
        <div style={s.presupuesto}>{presupuesto ? fmtCLP(presupuesto) : 'A acordar'}</div>
        <div style={s.autor}>
          <div style={s.avatar}>{nombreAutor.charAt(0).toUpperCase()}</div>
          <span>{nombreAutor}</span>
        </div>
      </div>
      <button
        style={s.btn}
        onClick={(e) => {
          e.stopPropagation()
          onAyudar?.(post)
        }}
      >
        🙋 Yo puedo ayudar
      </button>
    </div>
  )
}