import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { DIAS_SEMANA, horarioVacio } from '../lib/horarios'
import MiniMap from './MiniMap'

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

const CATEGORIAS = [
  'Panadería', 'Almacén', 'Verdulería', 'Carnicería', 'Cafetería',
  'Restaurante', 'Farmacia', 'Peluquería', 'Ferretería', 'Botillería',
  'Librería', 'Lavandería', 'Veterinaria', 'Bazar', 'Otro',
]

/*
  CommerceForm — el operador (admin) da de alta y edita comercios.
  Se abre desde la pestaña Comercios del Barrio.
  (Regla de oro: cada cosa se crea desde donde se ve.)
*/
function CommerceForm({ commerce, neighborhoodId, onClose, onSaved }) {
  const editando = !!commerce

  const [name, setName] = useState(commerce?.name || '')
  const [cats, setCats] = useState(
    commerce?.categories?.length
      ? commerce.categories
      : commerce?.category ? [commerce.category] : []
  )
  const [description, setDescription] = useState(commerce?.description || '')
  const [address, setAddress] = useState(commerce?.address || '')
  const [phone, setPhone] = useState(commerce?.phone || '')
  const [discount, setDiscount] = useState(commerce?.discount_text || '')
  const [isPremium, setIsPremium] = useState(commerce?.is_premium || false)
  const [hours, setHours] = useState(commerce?.opening_hours || horarioVacio())
  const [lat, setLat] = useState(commerce?.lat || null)
  const [lng, setLng] = useState(commerce?.lng || null)
  const [showMap, setShowMap] = useState(false)

  const [coverUrl, setCoverUrl] = useState(commerce?.cover_url || null)
  const [coverFile, setCoverFile] = useState(null)
  const [coverPreview, setCoverPreview] = useState(commerce?.cover_url || null)

  const [logoUrl, setLogoUrl] = useState(commerce?.logo_url || null)
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(commerce?.logo_url || null)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [saved, setSaved] = useState(false)

  const toggleCat = (c) => {
    setCats((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    )
  }

  const setDia = (key, campo, valor) => {
    setHours((h) => ({
      ...h,
      [key]: { ...(h[key] || { o: '09:00', c: '19:00' }), [campo]: valor },
    }))
  }

  const toggleDia = (key) => {
    setHours((h) => ({
      ...h,
      [key]: h[key] ? null : { o: '09:00', c: '19:00' },
    }))
  }

  const onPickCover = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    setCoverFile(f)
    const r = new FileReader()
    r.onloadend = () => setCoverPreview(r.result)
    r.readAsDataURL(f)
  }

  const onPickLogo = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    setLogoFile(f)
    const r = new FileReader()
    r.onloadend = () => setLogoPreview(r.result)
    r.readAsDataURL(f)
  }

  const subir = async (file, prefijo) => {
    const ext = file.name.split('.').pop()
    const fileName = `${prefijo}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const { error: upErr } = await supabase.storage.from('posts').upload(fileName, file)
    if (upErr) throw new Error('No se pudo subir la imagen. Intenta de nuevo.')
    const { data } = supabase.storage.from('posts').getPublicUrl(fileName)
    return data.publicUrl
  }

  const handleSave = async () => {
    if (!name.trim()) return setError('Ponle el nombre del comercio')
    if (cats.length === 0) return setError('Elige al menos una categoría')
    if (!address.trim()) return setError('Escribe la dirección')

    setError('')
    setSaving(true)

    try {
      // Subir imágenes. Si falla, se aborta (nunca en silencio).
      let finalCover = coverUrl
      let finalLogo = logoUrl

      if (coverFile) finalCover = await subir(coverFile, 'frontis')
      if (logoFile)  finalLogo  = await subir(logoFile, 'logo')

      const payload = {
        name: name.trim(),
        category: cats[0],          // principal (compatibilidad)
        categories: cats,           // todas
        description: description.trim() || null,
        address: address.trim(),
        phone: phone.trim() || null,
        discount_text: discount.trim() || null,
        is_premium: isPremium,
        is_active: true,
        opening_hours: hours,
        cover_url: finalCover,
        logo_url: finalLogo,
        neighborhood_id: neighborhoodId,
        lat,
        lng,
      }

      if (editando) {
        const { error: e } = await supabase
          .from('commerces')
          .update(payload)
          .eq('id', commerce.id)
        if (e) throw e
      } else {
        const { error: e } = await supabase.from('commerces').insert([payload])
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
        .from('commerces')
        .delete()
        .eq('id', commerce.id)
      if (e) throw e
      onSaved?.()
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
          <div style={s.headerTitle}>
            {editando ? 'Editar comercio' : 'Nuevo comercio'}
          </div>
          <button style={s.closeBtn} onClick={onClose}><IcoX size={19} /></button>
        </div>

        <div style={s.body}>

          {/* FRONTIS */}
          <label style={s.labelFirst}>Foto del frontis</label>
          <label htmlFor="cover-upload" style={s.coverBox}>
            {coverPreview ? (
              <img src={coverPreview} alt="" style={s.coverImg} />
            ) : (
              <div style={s.coverEmpty}>
                <IcoCam size={22} />
                <span style={s.coverEmptyText}>Agregar foto del local</span>
              </div>
            )}
            <input
              id="cover-upload" type="file" accept="image/*"
              onChange={onPickCover} style={{ display: 'none' }}
            />
          </label>

          {/* LOGO */}
          <label style={s.label}>Logo</label>
          <div style={s.logoRow}>
            <label htmlFor="logo-upload" style={s.logoBox}>
              {logoPreview ? (
                <img src={logoPreview} alt="" style={s.logoImg} />
              ) : (
                <div style={s.logoEmpty}><IcoCam size={18} /></div>
              )}
              <input
                id="logo-upload" type="file" accept="image/*"
                onChange={onPickLogo} style={{ display: 'none' }}
              />
            </label>
            <div style={s.logoHint}>
              Es lo que ve el vecino en la lista. Cuadrado, y que se entienda
              en chico. Si no hay logo, se usa la foto del frontis.
            </div>
          </div>

          {/* NOMBRE */}
          <label style={s.label}>Nombre</label>
          <input
            style={s.input}
            placeholder="Ej: Panadería Doña Rosa"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          {/* CATEGORÍAS (varias) */}
          <label style={s.label}>
            Categorías <span style={s.opt}>(puedes elegir varias)</span>
          </label>
          <div style={s.chipGrid}>
            {CATEGORIAS.map((c) => {
              const on = cats.includes(c)
              return (
                <button
                  key={c}
                  onClick={() => toggleCat(c)}
                  style={{
                    ...s.chip,
                    background: on ? VERDE : '#fff',
                    color: on ? '#fff' : '#374151',
                    borderColor: on ? VERDE : '#e5e7eb',
                  }}
                >
                  {c}
                </button>
              )
            })}
          </div>

          {/* DESCRIPCIÓN */}
          <label style={s.label}>Descripción</label>
          <textarea
            style={{ ...s.input, minHeight: 70, resize: 'vertical' }}
            placeholder="Pan artesanal, cafetería y bollería."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          {/* DIRECCIÓN */}
          <label style={s.label}>Dirección</label>
          <input
            style={s.input}
            placeholder="Av. Italia 1234"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />

          <button
            style={{
              ...s.mapToggle,
              borderColor: lat ? '#e5e7eb' : VERDE,
              color: lat ? '#6b7280' : VERDE,
            }}
            onClick={() => setShowMap(!showMap)}
          >
            {showMap
              ? 'Ocultar el mapa'
              : lat
                ? 'Punto marcado — cambiarlo'
                : 'Marcar el punto en el mapa'}
          </button>
          {!lat && !showMap && (
            <div style={s.hint}>
              Sin punto en el mapa, la ficha no muestra el mapa a los vecinos.
            </div>
          )}

          {showMap && (
            <div style={{ marginBottom: 4 }}>
              <MiniMap
                lat={lat} lng={lng}
                editable height={190}
                onPick={(la, ln) => { setLat(la); setLng(ln) }}
              />
              <div style={s.hint}>Toca el mapa donde está el local.</div>
            </div>
          )}

          {/* TELÉFONO */}
          <label style={s.label}>Teléfono (WhatsApp)</label>
          <input
            style={s.input}
            placeholder="+56 9 1234 5678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />

          {/* BENEFICIO */}
          <label style={s.label}>Beneficio Vecinal</label>
          <input
            style={s.input}
            placeholder="Ej: -15% para vecinos de El Barrio"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
          />
          <div style={s.hint}>
            Es la razón por la que un vecino elige el local de la esquina
            en vez del supermercado. Vale la pena pedirlo.
          </div>

          {/* HORARIO */}
          <label style={s.label}>Horario</label>
          <div style={s.horarioBox}>
            {DIAS_SEMANA.map((d) => {
              const h = hours[d.key]
              const abierto = !!h
              return (
                <div key={d.key} style={s.diaRow}>
                  <button
                    onClick={() => toggleDia(d.key)}
                    style={{
                      ...s.diaToggle,
                      background: abierto ? VERDE : '#f3f4f6',
                      color: abierto ? '#fff' : '#9ca3af',
                    }}
                  >
                    {d.corto}
                  </button>

                  {abierto ? (
                    <div style={s.horaRow}>
                      <input
                        type="time"
                        value={h.o}
                        onChange={(e) => setDia(d.key, 'o', e.target.value)}
                        style={s.horaInput}
                      />
                      <span style={s.horaSep}>a</span>
                      <input
                        type="time"
                        value={h.c}
                        onChange={(e) => setDia(d.key, 'c', e.target.value)}
                        style={s.horaInput}
                      />
                    </div>
                  ) : (
                    <span style={s.cerradoText}>Cerrado</span>
                  )}
                </div>
              )
            })}
          </div>

          {/* PATROCINADO */}
          <button
            onClick={() => setIsPremium(!isPremium)}
            style={{
              ...s.premiumRow,
              borderColor: isPremium ? '#d97706' : '#e5e7eb',
              background: isPremium ? '#fef3c7' : '#fff',
            }}
          >
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ ...s.premiumTitle, color: isPremium ? '#78350f' : '#111827' }}>
                Comercio destacado
              </div>
              <div style={s.premiumSub}>
                Aparece arriba y con badge dorado. Es lo que se cobra.
              </div>
            </div>
            <div style={{ ...s.switch, background: isPremium ? '#d97706' : '#d1d5db' }}>
              <div style={{ ...s.switchDot, transform: isPremium ? 'translateX(18px)' : 'translateX(0)' }} />
            </div>
          </button>

          {confirmDelete && (
            <div style={s.deleteBox}>
              <div style={s.deleteText}>¿Borrar este comercio? No se puede deshacer.</div>
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

        {saved && (
          <div style={s.okBar}>
            <span>Guardado</span>
          </div>
        )}

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
            {saving ? 'Guardando...' : editando ? 'Guardar cambios' : 'Crear comercio'}
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
    display: 'flex', alignItems: 'flex-end',
    zIndex: 500,
  },
  sheet: {
    width: '100%', maxHeight: '94%',
    background: '#f4f7f4',
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
    display: 'flex', flexDirection: 'column',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    overflow: 'hidden',
  },

  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '18px 20px 14px',
    background: '#fff', borderBottom: '1px solid #f0f2f0',
    flexShrink: 0,
  },
  headerTitle: { fontSize: 16, fontWeight: 800, color: '#111827' },
  closeBtn: {
    width: 34, height: 34, borderRadius: '50%',
    background: '#f4f7f4', color: '#374151',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: 'none', cursor: 'pointer',
  },

  body: { flex: 1, minHeight: 0, overflowY: 'auto', padding: '18px 20px 20px' },

  labelFirst: {
    display: 'block', fontSize: 12, fontWeight: 700,
    color: '#374151', marginBottom: 7,
  },
  label: {
    display: 'block', fontSize: 12, fontWeight: 700,
    color: '#374151', marginBottom: 7, marginTop: 18,
  },

  input: {
    width: '100%', padding: '13px 14px', fontSize: 14.5,
    background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 12,
    color: '#111827', fontFamily: 'inherit', outline: 'none',
    boxSizing: 'border-box',
  },

  coverBox: {
    display: 'block', width: '100%', aspectRatio: '16/9',
    borderRadius: 14, overflow: 'hidden', cursor: 'pointer',
    background: '#fff', border: '2px dashed #e5e7eb',
  },
  coverImg: { width: '100%', height: '100%', objectFit: 'cover' },
  coverEmpty: {
    width: '100%', height: '100%',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', gap: 6,
    color: '#9ca3af',
  },
  coverEmptyText: { fontSize: 12, fontWeight: 600 },

  logoRow: { display: 'flex', alignItems: 'center', gap: 13 },
  logoBox: {
    width: 76, height: 76, flexShrink: 0,
    borderRadius: 16, overflow: 'hidden', cursor: 'pointer',
    background: '#fff', border: '2px dashed #e5e7eb',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  logoImg: { width: '100%', height: '100%', objectFit: 'cover' },
  logoEmpty: { color: '#9ca3af', display: 'flex' },
  logoHint: { fontSize: 11.5, color: '#9ca3af', lineHeight: 1.5 },

  chipGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 7 },
  chip: {
    padding: '10px 6px', borderRadius: 11,
    fontSize: 12, fontWeight: 600,
    border: '1.5px solid #e5e7eb', cursor: 'pointer',
    fontFamily: 'inherit', textAlign: 'center',
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },

  mapToggle: {
    width: '100%', marginTop: 8, padding: '11px',
    background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12,
    fontSize: 12.5, fontWeight: 700, color: '#6b7280',
    cursor: 'pointer', fontFamily: 'inherit',
  },
  hint: { fontSize: 11, color: '#9ca3af', lineHeight: 1.45, marginTop: 7 },

  horarioBox: {
    background: '#fff', borderRadius: 14, padding: 12,
    border: '1px solid #eef0ee',
    display: 'flex', flexDirection: 'column', gap: 8,
  },
  diaRow: { display: 'flex', alignItems: 'center', gap: 10 },
  diaToggle: {
    width: 48, padding: '7px 0', borderRadius: 8,
    fontSize: 11.5, fontWeight: 800,
    border: 'none', cursor: 'pointer', fontFamily: 'inherit',
    flexShrink: 0,
  },
  horaRow: { display: 'flex', alignItems: 'center', gap: 7, flex: 1 },
  horaInput: {
    flex: 1, padding: '8px 10px', fontSize: 13,
    border: '1px solid #e5e7eb', borderRadius: 9,
    fontFamily: 'inherit', color: '#111827', outline: 'none',
    minWidth: 0,
  },
  horaSep: { fontSize: 12, color: '#9ca3af', fontWeight: 600 },
  cerradoText: { fontSize: 12.5, color: '#9ca3af', fontWeight: 600 },

  premiumRow: {
    width: '100%', marginTop: 20,
    display: 'flex', alignItems: 'center', gap: 12,
    padding: 15, borderRadius: 14,
    border: '1.5px solid #e5e7eb',
    cursor: 'pointer', fontFamily: 'inherit',
  },
  premiumTitle: { fontSize: 13.5, fontWeight: 800 },
  premiumSub: { fontSize: 11.5, color: '#6b7280', marginTop: 2 },
  switch: {
    width: 40, height: 22, borderRadius: 999,
    padding: 2, flexShrink: 0, transition: 'background .15s',
  },
  switchDot: {
    width: 18, height: 18, borderRadius: '50%',
    background: '#fff', transition: 'transform .15s',
  },

  opt: { color: '#9ca3af', fontWeight: 500 },
  errorBar: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '13px 20px',
    background: '#fee2e2', color: '#991b1b',
    fontSize: 13, fontWeight: 700, flexShrink: 0,
    lineHeight: 1.4,
  },
  okBar: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '13px 20px',
    background: '#dcfce7', color: '#0f5f36',
    fontSize: 13.5, fontWeight: 800, flexShrink: 0,
  },

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

  footer: {
    display: 'flex', gap: 10, alignItems: 'center',
    padding: '14px 20px 24px',
    background: '#fff', borderTop: '1px solid #f0f2f0',
    flexShrink: 0,
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

export default CommerceForm