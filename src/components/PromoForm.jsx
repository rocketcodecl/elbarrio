import { useState } from 'react'
import { supabase } from '../lib/supabase'

const VERDE = '#16a34a'

const Ico = ({ size = 18, children, stroke = 1.9 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={stroke}
    strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
)
const IcoX = (p) => <Ico {...p}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></Ico>
const IcoCam = (p) => <Ico {...p}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></Ico>
const IcoAlerta = (p) => <Ico {...p}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></Ico>
const IcoTrash = (p) => <Ico {...p}><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></Ico>

const DURACIONES = [
  { key: 'hoy',      label: 'Solo hoy',    horas: null },   // hasta las 23:59
  { key: '3dias',    label: '3 días',      horas: 72 },
  { key: 'semana',   label: '1 semana',    horas: 168 },
  { key: 'mes',      label: '1 mes',       horas: 720 },
]

/*
  PromoForm — promociones TEMPORALES de un comercio.

  No confundir con el Beneficio Vecinal (permanente, vive en la ficha).
  La promo expira siempre. Es lo que le da al comercio algo nuevo que
  mostrar cada día, y es por lo que paga.
*/
function PromoForm({ promo, commerce, neighborhoodId, onClose, onSaved }) {
  const editando = !!promo

  const [title, setTitle] = useState(promo?.title || '')
  const [description, setDescription] = useState(promo?.description || '')
  const [duracion, setDuracion] = useState('hoy')

  const [imgFile, setImgFile] = useState(null)
  const [imgPreview, setImgPreview] = useState(promo?.image_url || null)

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const onPickImg = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    setImgFile(f)
    const r = new FileReader()
    r.onloadend = () => setImgPreview(r.result)
    r.readAsDataURL(f)
  }

  const calcExpira = () => {
    const d = DURACIONES.find((x) => x.key === duracion)
    if (!d || d.horas === null) {
      // "Solo hoy" = hasta las 23:59 de hoy
      const fin = new Date()
      fin.setHours(23, 59, 59, 0)
      return fin.toISOString()
    }
    return new Date(Date.now() + d.horas * 3600 * 1000).toISOString()
  }

  const handleSave = async () => {
    if (!title.trim()) return setError('Escribe la promoción. Ej: 2x1 en café')

    setError('')
    setSaving(true)

    try {
      let imageUrl = promo?.image_url || null

      if (imgFile) {
        const ext = imgFile.name.split('.').pop()
        const fileName = `promo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

        const { error: upErr } = await supabase.storage
          .from('posts')
          .upload(fileName, imgFile)

        if (upErr) throw new Error('No se pudo subir la foto. Intenta de nuevo.')

        const { data } = supabase.storage.from('posts').getPublicUrl(fileName)
        imageUrl = data.publicUrl
      }

      const payload = {
        commerce_id: commerce.id,
        neighborhood_id: neighborhoodId,
        title: title.trim(),
        description: description.trim() || null,
        image_url: imageUrl,
        expires_at: calcExpira(),
        is_active: true,
      }

      if (editando) {
        const { error: e } = await supabase
          .from('commerce_promos')
          .update(payload)
          .eq('id', promo.id)
        if (e) throw e
      } else {
        const { error: e } = await supabase.from('commerce_promos').insert([payload])
        if (e) throw e
      }

      setSaved(true)
      await onSaved?.()
      setTimeout(() => onClose?.(), 900)
    } catch (err) {
      setError(err.message || 'No se pudo guardar')
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setSaving(true)
    try {
      const { error: e } = await supabase
        .from('commerce_promos')
        .delete()
        .eq('id', promo.id)
      if (e) throw e
      await onSaved?.()
      onClose?.()
    } catch (err) {
      setError(err.message || 'No se pudo borrar')
      setSaving(false)
    }
  }

  return (
    <div style={s.backdrop} onClick={onClose}>
      <div style={s.sheet} onClick={(e) => e.stopPropagation()}>

        <div style={s.header}>
          <div>
            <div style={s.headerTitle}>
              {editando ? 'Editar promoción' : 'Nueva promoción'}
            </div>
            <div style={s.headerSub}>{commerce?.name}</div>
          </div>
          <button style={s.closeBtn} onClick={onClose}><IcoX size={19} /></button>
        </div>

        <div style={s.body}>

          <div style={s.infoBox}>
            Una promoción <strong>expira</strong>. Es lo que hace que los vecinos
            vuelvan a abrir la app. El Beneficio Vecinal permanente se edita
            en la ficha del local.
          </div>

          <label style={s.labelFirst}>La promoción</label>
          <input
            style={s.input}
            placeholder="Ej: 2x1 en café para vecinos"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={60}
          />

          <label style={s.label}>Detalle <span style={s.opt}>(opcional)</span></label>
          <textarea
            style={{ ...s.input, minHeight: 64, resize: 'vertical' }}
            placeholder="Solo mostrando la app. Válido en cafetería."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={160}
          />

          <label style={s.label}>¿Hasta cuándo vale?</label>
          <div style={s.chipGrid}>
            {DURACIONES.map((d) => (
              <button
                key={d.key}
                onClick={() => setDuracion(d.key)}
                style={{
                  ...s.chip,
                  background: duracion === d.key ? VERDE : '#fff',
                  color: duracion === d.key ? '#fff' : '#374151',
                  borderColor: duracion === d.key ? VERDE : '#e5e7eb',
                }}
              >
                {d.label}
              </button>
            ))}
          </div>

          <label style={s.label}>Foto <span style={s.opt}>(opcional)</span></label>
          <label htmlFor="promo-img" style={s.imgBox}>
            {imgPreview ? (
              <img src={imgPreview} alt="" style={s.img} />
            ) : (
              <div style={s.imgEmpty}>
                <IcoCam size={20} />
                <span style={s.imgEmptyText}>Agregar foto</span>
              </div>
            )}
            <input
              id="promo-img" type="file" accept="image/*"
              onChange={onPickImg} style={{ display: 'none' }}
            />
          </label>

          {confirmDelete && (
            <div style={s.deleteBox}>
              <div style={s.deleteText}>¿Borrar esta promoción?</div>
              <div style={s.deleteActions}>
                <button style={s.cancelBtn} onClick={() => setConfirmDelete(false)}>
                  Cancelar
                </button>
                <button style={s.deleteBtn} onClick={handleDelete} disabled={saving}>
                  {saving ? 'Borrando...' : 'Sí, borrar'}
                </button>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div style={s.errorBar}>
            <IcoAlerta size={16} />
            <span>{error}</span>
          </div>
        )}

        {saved && <div style={s.okBar}>Guardado</div>}

        <div style={s.footer}>
          {editando && !confirmDelete && (
            <button style={s.trashBtn} onClick={() => setConfirmDelete(true)}>
              <IcoTrash size={17} />
            </button>
          )}
          <button
            style={{ ...s.saveBtn, opacity: saving ? 0.6 : 1 }}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Guardando...' : editando ? 'Guardar cambios' : 'Publicar promoción'}
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
    width: '100%', maxHeight: '92%',
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
  headerTitle: { fontSize: 16, fontWeight: 800, color: '#111827' },
  headerSub: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  closeBtn: {
    width: 34, height: 34, borderRadius: '50%',
    background: '#f4f7f4', color: '#374151',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: 'none', cursor: 'pointer', flexShrink: 0,
  },

  body: { flex: 1, minHeight: 0, overflowY: 'auto', padding: '18px 20px 20px' },

  infoBox: {
    padding: '12px 14px', background: '#dcfce7', color: '#0f5f36',
    borderRadius: 12, fontSize: 12, lineHeight: 1.5, marginBottom: 18,
  },

  labelFirst: { display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 7 },
  label: { display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 7, marginTop: 18 },
  opt: { color: '#9ca3af', fontWeight: 500 },

  input: {
    width: '100%', padding: '13px 14px', fontSize: 14.5,
    background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 12,
    color: '#111827', fontFamily: 'inherit', outline: 'none',
    boxSizing: 'border-box',
  },

  chipGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 7 },
  chip: {
    padding: '11px 4px', borderRadius: 11,
    fontSize: 11.5, fontWeight: 700,
    border: '1.5px solid #e5e7eb', cursor: 'pointer',
    fontFamily: 'inherit', textAlign: 'center', whiteSpace: 'nowrap',
  },

  imgBox: {
    display: 'block', width: '100%', aspectRatio: '16/9',
    borderRadius: 14, overflow: 'hidden', cursor: 'pointer',
    background: '#fff', border: '2px dashed #e5e7eb',
  },
  img: { width: '100%', height: '100%', objectFit: 'cover' },
  imgEmpty: {
    width: '100%', height: '100%',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', gap: 5,
    color: '#9ca3af',
  },
  imgEmptyText: { fontSize: 11.5, fontWeight: 600 },

  deleteBox: {
    marginTop: 18, padding: 14,
    background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12,
  },
  deleteText: { fontSize: 12.5, fontWeight: 600, color: '#991b1b' },
  deleteActions: { display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 10 },
  cancelBtn: {
    padding: '8px 14px', borderRadius: 999,
    border: '1px solid #e5e7eb', background: '#fff',
    color: '#6b7280', fontSize: 12, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit',
  },
  deleteBtn: {
    padding: '8px 16px', borderRadius: 999, border: 'none',
    background: '#dc2626', color: '#fff',
    fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
  },

  errorBar: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '13px 20px',
    background: '#fee2e2', color: '#991b1b',
    fontSize: 13, fontWeight: 700, flexShrink: 0, lineHeight: 1.4,
  },
  okBar: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '13px 20px',
    background: '#dcfce7', color: '#0f5f36',
    fontSize: 13.5, fontWeight: 800, flexShrink: 0,
  },

  footer: {
    display: 'flex', gap: 10, alignItems: 'center',
    padding: '14px 20px 24px',
    background: '#fff', borderTop: '1px solid #f0f2f0', flexShrink: 0,
  },
  trashBtn: {
    width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
    background: '#fef2f2', color: '#dc2626',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: '1px solid #fecaca', cursor: 'pointer',
  },
  saveBtn: {
    flex: 1, padding: 15,
    background: VERDE, color: '#fff',
    borderRadius: 999, fontSize: 14.5, fontWeight: 700,
    border: 'none', cursor: 'pointer', fontFamily: 'inherit',
    boxShadow: '0 6px 20px rgba(22,163,74,0.3)',
  },
}

export default PromoForm
