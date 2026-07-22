import { useState } from 'react'

const VERDE = '#16a34a'

const TIPOS = [
  { key: 'corte_agua', emoji: '💧', label: 'Corte de agua' },
  { key: 'corte_luz',  emoji: '💡', label: 'Corte de luz' },
  { key: 'jjvv',       emoji: '🏛️', label: 'Aviso JJVV' },
  { key: 'operativo',  emoji: '🩺', label: 'Operativo' },
  { key: 'alert',      emoji: '📢', label: 'Otro' },
]

function AvisoForm({ onClose, onPublicar }) {
  const [tipo, setTipo] = useState('alert')
  const [titulo, setTitulo] = useState('')
  const [contenido, setContenido] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    if (!titulo.trim()) return setError('Escribe el título del aviso')
    if (!contenido.trim()) return setError('Escribe el contenido')
    setSaving(true)
    try {
      await onPublicar({ tipo, titulo, contenido })
    } catch {
      setError('No se pudo publicar')
      setSaving(false)
    }
  }

  return (
    <div style={s.backdrop} onClick={onClose}>
      <div style={s.sheet} onClick={(e) => e.stopPropagation()}>
        <div style={s.header}>
          <div style={s.headerTitle}>📢 Aviso oficial</div>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={s.body}>
          <div style={s.infoBox}>
            Solo tú (el operador) puedes publicar avisos oficiales.
            Los vecinos solo pueden reportar incidentes.
          </div>

          <label style={s.label}>Tipo</label>
          <div style={s.tipoGrid}>
            {TIPOS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTipo(t.key)}
                style={{
                  ...s.tipoBtn,
                  background: tipo === t.key ? VERDE : '#fff',
                  color: tipo === t.key ? '#fff' : '#374151',
                  border: `1.5px solid ${tipo === t.key ? VERDE : '#e5e7eb'}`,
                }}
              >
                <span style={{ fontSize: 18 }}>{t.emoji}</span>
                <span style={{ fontSize: 11.5, fontWeight: 700 }}>{t.label}</span>
              </button>
            ))}
          </div>

          <label style={s.label}>Título</label>
          <input
            style={s.input}
            placeholder="Ej: Corte de agua programado"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            maxLength={80}
          />

          <label style={s.label}>Contenido</label>
          <textarea
            style={{ ...s.input, minHeight: 90, resize: 'vertical' }}
            placeholder="Describe el aviso con los detalles que necesitan saber los vecinos..."
            value={contenido}
            onChange={(e) => setContenido(e.target.value)}
            maxLength={500}
          />

          {error && (
            <div style={s.errorBar}>⚠️ {error}</div>
          )}
        </div>

        <div style={s.footer}>
          <button
            style={{ ...s.saveBtn, opacity: saving ? 0.6 : 1 }}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Publicando...' : 'Publicar aviso'}
          </button>
        </div>
      </div>
    </div>
  )
}

const s = {
  backdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(17,24,39,0.55)',
    display: 'flex', alignItems: 'flex-end', zIndex: 600,
  },
  sheet: {
    width: '100%', maxHeight: '90%',
    background: '#f4f7f4',
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
    display: 'flex', flexDirection: 'column',
    fontFamily: '"Plus Jakarta Sans", system-ui, -apple-system, sans-serif',
    overflow: 'hidden',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '18px 20px 14px',
    background: '#fff', borderBottom: '1px solid #f0f2f0', flexShrink: 0,
  },
  headerTitle: { fontSize: 16, fontWeight: 800, color: '#111' },
  closeBtn: {
    width: 34, height: 34, borderRadius: '50%',
    background: '#f4f7f4', color: '#374151',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: 'none', cursor: 'pointer', fontSize: 14,
  },
  body: { flex: 1, overflowY: 'auto', padding: '18px 20px 20px' },
  infoBox: {
    padding: '12px 14px', background: '#dcfce7', color: '#0f5f36',
    borderRadius: 12, fontSize: 12.5, lineHeight: 1.5, marginBottom: 18,
    fontWeight: 500,
  },
  label: {
    display: 'block', fontSize: 12, fontWeight: 700,
    color: '#374151', marginBottom: 8, marginTop: 16,
  },
  tipoGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8,
  },
  tipoBtn: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
    padding: '10px 6px', borderRadius: 12,
    cursor: 'pointer', fontFamily: 'inherit',
  },
  input: {
    width: '100%', padding: '13px 14px', fontSize: 14.5,
    background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 12,
    color: '#111', fontFamily: 'inherit', outline: 'none',
    boxSizing: 'border-box',
  },
  errorBar: {
    padding: '12px 14px', marginTop: 14,
    background: '#fee2e2', color: '#991b1b',
    borderRadius: 12, fontSize: 13, fontWeight: 600,
  },
  footer: {
    padding: '14px 20px 24px',
    background: '#fff', borderTop: '1px solid #f0f2f0', flexShrink: 0,
  },
  saveBtn: {
    width: '100%', padding: 15,
    background: VERDE, color: '#fff',
    borderRadius: 999, fontSize: 15, fontWeight: 700,
    border: 'none', cursor: 'pointer', fontFamily: 'inherit',
    boxShadow: '0 6px 20px rgba(22,163,74,0.3)',
  },
}

export default AvisoForm
