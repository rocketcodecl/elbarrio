import { useState } from 'react'
import { supabase } from '../lib/supabase'

/* ============================================================
   ICONOS SVG LINEALES (sin emojis)
   ============================================================ */
const Ico = ({ d, size = 24, stroke = 1.8, children }) => (
  <svg
    width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={stroke}
    strokeLinecap="round" strokeLinejoin="round"
  >
    {children || <path d={d} />}
  </svg>
)

const IcoPedir = ({ size }) => (
  <Ico size={size}>
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </Ico>
)
const IcoVender = ({ size }) => (
  <Ico size={size}>
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
    <line x1="7" y1="7" x2="7.01" y2="7" />
  </Ico>
)
const IcoRegalar = ({ size }) => (
  <Ico size={size}>
    <polyline points="20 12 20 22 4 22 4 12" />
    <rect x="2" y="7" width="20" height="5" />
    <line x1="12" y1="22" x2="12" y2="7" />
    <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
    <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
  </Ico>
)
const IcoTrueque = ({ size }) => (
  <Ico size={size}>
    <polyline points="17 1 21 5 17 9" />
    <path d="M3 11V9a4 4 0 0 1 4-4h14" />
    <polyline points="7 23 3 19 7 15" />
    <path d="M21 13v2a4 4 0 0 1-4 4H3" />
  </Ico>
)
const IcoCamara = ({ size = 22 }) => (
  <Ico size={size}>
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </Ico>
)
const IcoCerrar = ({ size = 20 }) => (
  <Ico size={size}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </Ico>
)
const IcoVolver = ({ size = 20 }) => (
  <Ico size={size}>
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </Ico>
)
const IcoCheck = ({ size = 44 }) => (
  <Ico size={size} stroke={2.5}>
    <polyline points="20 6 9 17 4 12" />
  </Ico>
)
const IcoAlerta = ({ size = 16 }) => (
  <Ico size={size}>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </Ico>
)

/* ============================================================
   CONFIGURACIÓN
   ============================================================ */
const VERDE = '#16a34a'
const VERDE_OSC = '#0f5f36'

const POST_TYPES = [
  {
    id: 'request', label: 'Pedir', Icon: IcoPedir,
    sub: 'Necesito algo del barrio',
    color: VERDE, bg: '#dcfce7', primary: true,
  },
  {
    id: 'sell', label: 'Vender', Icon: IcoVender,
    sub: 'Vende lo que ya no usas',
    color: '#0369a1', bg: '#e0f2fe',
  },
  {
    id: 'gift', label: 'Regalar', Icon: IcoRegalar,
    sub: 'Dale otra vida a algo',
    color: '#7c3aed', bg: '#f3e8ff',
  },
  {
    id: 'trade', label: 'Intercambiar', Icon: IcoTrueque,
    sub: 'Cambia con un vecino',
    color: '#c2410c', bg: '#ffedd5',
  },
]

// Los 18 rubros de servicio + Otro
const RUBROS = [
  { key: 'gasfiter', label: 'Gasfíter' },
  { key: 'electrico', label: 'Eléctrico' },
  { key: 'cerrajero', label: 'Cerrajero' },
  { key: 'pintor', label: 'Pintor' },
  { key: 'carpintero', label: 'Carpintero' },
  { key: 'maestro', label: 'Maestro' },
  { key: 'techos', label: 'Techos' },
  { key: 'aseo', label: 'Aseo' },
  { key: 'jardinero', label: 'Jardinero' },
  { key: 'piscinas', label: 'Piscinas' },
  { key: 'fumigacion', label: 'Fumigación' },
  { key: 'aire', label: 'Aire acondicionado' },
  { key: 'electrodomesticos', label: 'Electrodomésticos' },
  { key: 'internet', label: 'Internet y redes' },
  { key: 'mascotas', label: 'Paseo de mascotas' },
  { key: 'adulto_mayor', label: 'Cuidado adulto mayor' },
  { key: 'ninera', label: 'Niñera' },
  { key: 'fletes', label: 'Fletes' },
  { key: 'otro', label: 'Otro' },
]

const PLAZOS = [
  { key: 'hoy', label: 'Hoy', hours: 12 },
  { key: 'manana', label: 'Mañana', hours: 36 },
  { key: 'semana', label: 'Esta semana', hours: 168 },
  { key: 'sin_apuro', label: 'Sin apuro', hours: null },
]

const CATEGORIES = [
  'Muebles', 'Tecnología', 'Bicicletas', 'Herramientas',
  'Ropa', 'Mascotas', 'Libros', 'Deportes', 'Hogar', 'Otro',
]

/* ============================================================
   COMPONENTE
   ============================================================ */
// startWith='request'  -> abre directo el formulario de Pedido (desde Inicio/Radar)
// sin startWith         -> muestra Vender / Regalar / Intercambiar (desde el + del Mercado)
function CreatePost({ onClose, onPublished, startWith }) {
  const initialType = startWith
    ? POST_TYPES.find((t) => t.id === startWith)
    : null

  const [step, setStep] = useState(initialType ? 'form' : 'type')
  const [selectedType, setSelectedType] = useState(initialType)

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [price, setPrice] = useState('')
  const [isNegotiable, setIsNegotiable] = useState(false)
  const [category, setCategory] = useState('')
  const [lookingFor, setLookingFor] = useState('')

  // Pedido Vecinal
  const [rubro, setRubro] = useState('')
  const [budget, setBudget] = useState('')
  const [budgetOpen, setBudgetOpen] = useState(false) // "a convenir"
  const [plazo, setPlazo] = useState('')

  const [images, setImages] = useState([])
  const [previews, setPreviews] = useState([])
  const [error, setError] = useState('')

  const handleSelectType = (type) => {
    setSelectedType(type)
    setStep('form')
    setError('')
  }

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files)
    if (files.length === 0) return
    if (images.length + files.length > 4) {
      setError('Máximo 4 fotos')
      return
    }
    setImages([...images, ...files])
    files.forEach((file) => {
      const reader = new FileReader()
      reader.onloadend = () => setPreviews((prev) => [...prev, reader.result])
      reader.readAsDataURL(file)
    })
  }

  const removeImage = (i) => {
    setImages(images.filter((_, idx) => idx !== i))
    setPreviews(previews.filter((_, idx) => idx !== i))
  }

  const formatPrice = (v) =>
    v.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.')

  const toNumber = (v) => parseInt(v.replace(/\./g, ''), 10)

  const calcNeededBy = (plazoKey) => {
    const p = PLAZOS.find((x) => x.key === plazoKey)
    if (!p || p.hours === null) return null
    return new Date(Date.now() + p.hours * 3600 * 1000).toISOString()
  }

  /* ---------- PUBLICAR ---------- */
  const handlePublish = async () => {
    setError('')
    const t = selectedType.id

    // Validación
    if (t === 'request') {
      if (!title.trim()) return setError('Escribe qué necesitas')
      if (!rubro) return setError('Elige una categoría')
      if (!plazo) return setError('Indica para cuándo lo necesitas')
      if (!budgetOpen && !budget) return setError('Indica un presupuesto o marca "A convenir"')
    } else if (t === 'sell') {
      if (!title.trim()) return setError('Ponle un título a tu producto')
      if (!price) return setError('Ingresa un precio')
      if (images.length === 0) return setError('Agrega al menos 1 foto')
    } else if (t === 'gift') {
      if (!title.trim()) return setError('¿Qué estás regalando?')
    } else if (t === 'trade') {
      if (!title.trim()) return setError('¿Qué ofreces?')
      if (!lookingFor.trim()) return setError('¿Qué buscas a cambio?')
    }

    setStep('publishing')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No hay sesión iniciada')

      const { data: profile, error: pErr } = await supabase
        .from('profiles')
        .select('id, neighborhood_id')
        .eq('user_id', user.id)
        .single()

      if (pErr || !profile) throw new Error('No se encontró tu perfil')
      if (!profile.neighborhood_id) throw new Error('Tu perfil no tiene barrio asignado')

      // Subir fotos. Si una falla, se aborta (nunca en silencio).
      const urls = []
      for (const img of images) {
        const ext = img.name.split('.').pop()
        const fileName = `${user.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

        const { error: upErr } = await supabase.storage
          .from('posts')
          .upload(fileName, img)

        if (upErr) throw new Error('No se pudo subir una de las fotos. Intenta de nuevo.')

        const { data: urlData } = supabase.storage.from('posts').getPublicUrl(fileName)
        urls.push(urlData.publicUrl)
      }

      // Payload base
      const post = {
        author_id: profile.id,
        neighborhood_id: profile.neighborhood_id,
        type: t,
        title: title.trim(),
        content: content.trim() || null,
        images: urls.length > 0 ? urls : null,
        // distance_meters queda NULL a propósito: se calculará con GPS real.
      }

      if (t === 'request') {
        post.service_key = rubro
        post.budget = budgetOpen ? null : toNumber(budget)
        post.needed_by = calcNeededBy(plazo)
        post.urgency = plazo === 'hoy' ? 'critical' : 'low'
        post.expires_at = new Date(Date.now() + 24 * 3600 * 1000).toISOString()
      } else if (t === 'sell') {
        post.price = toNumber(price)
        post.is_negotiable = isNegotiable
        post.category = category || null
      } else if (t === 'trade') {
        post.looking_for = lookingFor.trim()
        post.category = category || null
      }

      const { error: insErr } = await supabase.from('posts').insert([post])
      if (insErr) throw insErr

      setStep('success')
      setTimeout(() => {
        onPublished?.()
        onClose?.()
      }, 1400)
    } catch (err) {
      setError(err.message || 'Algo salió mal. Intenta de nuevo.')
      setStep('form')
    }
  }

  /* ============================================================
     PANTALLA 1 — ELEGIR TIPO
     ============================================================ */
  if (step === 'type') {
    const marketTypes = POST_TYPES.filter((t) => !t.primary)

    return (
      <div style={s.container}>
        <div style={s.header}>
          <button style={s.iconBtn} onClick={onClose}><IcoCerrar /></button>
          <div style={s.headerTitle}>Publicar en el Mercado</div>
          <div style={{ width: 40 }} />
        </div>

        <div style={s.typeScroll}>
          <div style={s.intro}>
            <div style={s.introTitle}>¿Qué quieres publicar?</div>
            <div style={s.introSub}>Solo lo verán vecinos de tu barrio</div>
          </div>

          <div style={s.typeList}>
            {marketTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => handleSelectType(type)}
                style={s.typeRow}
              >
                <div style={s.typeRowIcon}><type.Icon size={22} /></div>
                <div style={s.typeRowText}>
                  <div style={s.typeRowLabel}>{type.label}</div>
                  <div style={s.typeRowSub}>{type.sub}</div>
                </div>
                <span style={s.typeRowChevron}>
                  <Ico size={18}><polyline points="9 18 15 12 9 6" /></Ico>
                </span>
              </button>
            ))}
          </div>

          {/* Reglas del barrio */}
          <div style={s.rulesCard}>
            <div style={s.rulesTitle}>Cómo funciona en El Barrio</div>

            <div style={s.ruleRow}>
              <span style={s.ruleIcon}>
                <Ico size={16}>
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </Ico>
              </span>
              <span style={s.ruleText}>
                Solo tus vecinos verificados van a ver lo que publiques.
              </span>
            </div>

            <div style={s.ruleRow}>
              <span style={s.ruleIcon}>
                <Ico size={16}>
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </Ico>
              </span>
              <span style={s.ruleText}>
                Tu dirección nunca se muestra. Solo la distancia aproximada.
              </span>
            </div>

            <div style={s.ruleRow}>
              <span style={s.ruleIcon}>
                <Ico size={16}>
                  <polyline points="20 6 9 17 4 12" />
                </Ico>
              </span>
              <span style={s.ruleText}>
                Regalar e intercambiar es gratis. Siempre lo será.
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  /* ============================================================
     PANTALLA — PUBLICANDO
     ============================================================ */
  if (step === 'publishing') {
    return (
      <div style={s.container}>
        <div style={s.overlay}>
          <div style={s.spinner} />
          <div style={s.overlayText}>Publicando...</div>
        </div>
      </div>
    )
  }

  /* ============================================================
     PANTALLA — ÉXITO
     ============================================================ */
  if (step === 'success') {
    return (
      <div style={s.container}>
        <div style={s.overlay}>
          <div style={s.successCircle}><IcoCheck /></div>
          <div style={s.successTitle}>Listo</div>
          <div style={s.successText}>
            {selectedType.id === 'request'
              ? 'Tus vecinos ya recibieron tu pedido'
              : 'Tus vecinos ya lo pueden ver'}
          </div>
        </div>
      </div>
    )
  }

  /* ============================================================
     PANTALLA — FORMULARIO
     ============================================================ */
  const t = selectedType.id

  return (
    <div style={s.container}>
      <div style={s.header}>
        <button
          style={s.iconBtn}
          onClick={() => (startWith ? onClose?.() : setStep('type'))}
        >
          {startWith ? <IcoCerrar /> : <IcoVolver />}
        </button>
        <div style={s.headerTitleRow}>
          <span style={{ color: selectedType.color, display: 'flex' }}>
            <selectedType.Icon size={18} />
          </span>
          <span style={s.headerTitle}>{selectedType.label}</span>
        </div>
        <div style={{ width: 40 }} />
      </div>

      <div style={s.formScroll}>

        {/* ---------- PEDIDO VECINAL ---------- */}
        {t === 'request' && (
          <div style={s.form}>
            <div style={s.hintBox}>
              Tu pedido llega solo a vecinos y comercios de tu barrio.
              Expira en 24 horas.
            </div>

            <label style={s.labelFirst}>¿Qué necesitas?</label>
            <input
              type="text"
              placeholder="Ej: Un gasfíter, se me picó una cañería"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={s.input}
            />

            <label style={s.label}>Categoría</label>
            <div style={s.chipGrid2}>
              {RUBROS.map((r) => (
                <button
                  key={r.key}
                  onClick={() => setRubro(r.key)}
                  style={{
                    ...s.chip,
                    background: rubro === r.key ? VERDE : '#fff',
                    color: rubro === r.key ? '#fff' : '#374151',
                    borderColor: rubro === r.key ? VERDE : '#e5e7eb',
                  }}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <label style={s.label}>Presupuesto</label>
            <div style={s.row}>
              <div style={{ ...s.priceBox, opacity: budgetOpen ? 0.4 : 1 }}>
                <span style={s.pricePrefix}>$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  disabled={budgetOpen}
                  value={budget}
                  onChange={(e) => setBudget(formatPrice(e.target.value))}
                  style={s.priceInput}
                />
              </div>
              <button
                onClick={() => setBudgetOpen(!budgetOpen)}
                style={{
                  ...s.toggleBtn,
                  background: budgetOpen ? VERDE : '#f3f4f6',
                  color: budgetOpen ? '#fff' : '#6b7280',
                }}
              >
                A convenir
              </button>
            </div>

            <label style={s.label}>¿Para cuándo?</label>
            <div style={s.chipGrid4}>
              {PLAZOS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setPlazo(p.key)}
                  style={{
                    ...s.chip,
                    background: plazo === p.key ? VERDE : '#fff',
                    color: plazo === p.key ? '#fff' : '#374151',
                    borderColor: plazo === p.key ? VERDE : '#e5e7eb',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <label style={s.label}>Detalles <span style={s.opt}>(opcional)</span></label>
            <textarea
              placeholder="Cuenta un poco más para que te respondan mejor..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              style={{ ...s.input, minHeight: 80, resize: 'vertical' }}
            />

            <Fotos images={images} previews={previews} onUpload={handleImageUpload} onRemove={removeImage} />
          </div>
        )}

        {/* ---------- VENDER ---------- */}
        {t === 'sell' && (
          <div style={s.form}>
            <Fotos
              images={images} previews={previews}
              onUpload={handleImageUpload} onRemove={removeImage}
              required first
              hint="Empieza por la foto. Pronto la app va a completar el titulo y la descripcion por ti."
            />

            <label style={s.label}>¿Qué vendes?</label>
            <input
              type="text"
              placeholder="Ej: Bicicleta MTB Trek talla M"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={s.input}
            />

            <label style={s.label}>Descripción <span style={s.opt}>(opcional)</span></label>
            <textarea
              placeholder="Estado, año, detalles..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              style={{ ...s.input, minHeight: 70, resize: 'vertical' }}
            />

            <label style={s.label}>Precio</label>
            <div style={s.row}>
              <div style={s.priceBox}>
                <span style={s.pricePrefix}>$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={price}
                  onChange={(e) => setPrice(formatPrice(e.target.value))}
                  style={s.priceInput}
                />
              </div>
              <button
                onClick={() => setIsNegotiable(!isNegotiable)}
                style={{
                  ...s.toggleBtn,
                  background: isNegotiable ? VERDE : '#f3f4f6',
                  color: isNegotiable ? '#fff' : '#6b7280',
                }}
              >
                Conversable
              </button>
            </div>

            <label style={s.label}>Categoría</label>
            <div style={s.chipGrid3}>
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  style={{
                    ...s.chip,
                    background: category === c ? VERDE : '#fff',
                    color: category === c ? '#fff' : '#374151',
                    borderColor: category === c ? VERDE : '#e5e7eb',
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ---------- REGALAR ---------- */}
        {t === 'gift' && (
          <div style={s.form}>
            <Fotos
              images={images} previews={previews}
              onUpload={handleImageUpload} onRemove={removeImage}
              first
              hint="Empieza por la foto. Pronto la app va a completar el titulo y la descripcion por ti."
            />

            <label style={s.label}>¿Qué regalas?</label>
            <input
              type="text"
              placeholder="Ej: Libros infantiles"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={s.input}
            />

            <label style={s.label}>Detalles</label>
            <textarea
              placeholder="Estado, cantidad, dónde retirar..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              style={{ ...s.input, minHeight: 80, resize: 'vertical' }}
            />

            <div style={{ ...s.hintBox, marginTop: 18, marginBottom: 0 }}>
              Regalar siempre es gratis en El Barrio. Y siempre lo será.
            </div>
          </div>
        )}

        {/* ---------- INTERCAMBIAR ---------- */}
        {t === 'trade' && (
          <div style={s.form}>
            <Fotos
              images={images} previews={previews}
              onUpload={handleImageUpload} onRemove={removeImage}
              first
              hint="Empieza por la foto. Pronto la app va a completar el titulo y la descripcion por ti."
            />

            <label style={s.label}>¿Qué ofreces?</label>
            <input
              type="text"
              placeholder="Ej: Guitarra acústica"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={s.input}
            />

            <label style={s.label}>¿Qué buscas a cambio?</label>
            <input
              type="text"
              placeholder="Ej: Teclado electrónico"
              value={lookingFor}
              onChange={(e) => setLookingFor(e.target.value)}
              style={s.input}
            />

            <label style={s.label}>Descripción <span style={s.opt}>(opcional)</span></label>
            <textarea
              placeholder="Estado, características..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              style={{ ...s.input, minHeight: 70, resize: 'vertical' }}
            />

            <label style={s.label}>Categoría</label>
            <div style={s.chipGrid3}>
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  style={{
                    ...s.chip,
                    background: category === c ? VERDE : '#fff',
                    color: category === c ? '#fff' : '#374151',
                    borderColor: category === c ? VERDE : '#e5e7eb',
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div style={s.errorBox}>
            <IcoAlerta />
            <span>{error}</span>
          </div>
        )}
      </div>

      <div style={s.footer}>
        <button onClick={handlePublish} style={s.publishBtn}>
          {t === 'request' ? 'Enviar pedido al barrio' :
           t === 'sell' ? 'Publicar venta' :
           t === 'gift' ? 'Publicar regalo' :
           'Publicar intercambio'}
        </button>
      </div>
    </div>
  )
}

/* ============================================================
   SUBCOMPONENTE: FOTOS
   ============================================================ */
function Fotos({ images, previews, onUpload, onRemove, required, first, hint }) {
  return (
    <div style={{ marginTop: first ? 0 : 18 }}>
      <label style={first ? s.labelFirst : s.label}>
        Fotos {required && <span style={{ color: '#dc2626' }}>*</span>}
        <span style={s.opt}> ({images.length}/4)</span>
      </label>
      {hint && <div style={s.photoHint}>{hint}</div>}
      <div style={s.photoGrid}>
        {previews.map((p, i) => (
          <div key={i} style={s.photoItem}>
            <img src={p} alt="" style={s.photoImg} />
            <button onClick={() => onRemove(i)} style={s.photoRemove}>
              <IcoCerrar size={12} />
            </button>
          </div>
        ))}
        {images.length < 4 && (
          <label htmlFor="upload-images" style={s.photoAdd}>
            <span style={{ color: '#9ca3af' }}><IcoCamara /></span>
            <span style={s.photoAddText}>Agregar</span>
            <input
              id="upload-images"
              type="file"
              accept="image/*"
              multiple
              onChange={onUpload}
              style={{ display: 'none' }}
            />
          </label>
        )}
      </div>
    </div>
  )
}

/* ============================================================
   ESTILOS
   ============================================================ */
const s = {
  container: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    width: '100%', height: '100%',
    display: 'flex', flexDirection: 'column',
    background: '#f4f7f4',
    overflow: 'hidden',
    zIndex: 100,
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },

  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '50px 16px 16px',
    background: '#fff',
    borderBottom: '1px solid #f0f0f0',
    flexShrink: 0,
  },
  headerTitle: { fontSize: 15, fontWeight: 700, color: '#111827' },
  headerTitleRow: { display: 'flex', alignItems: 'center', gap: 8 },
  iconBtn: {
    width: 40, height: 40, borderRadius: '50%',
    background: '#f3f4f6', color: '#374151',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: 'none', cursor: 'pointer', flexShrink: 0,
  },

  /* --- selección de tipo --- */
  typeScroll: { flex: 1, minHeight: 0, overflowY: 'auto', padding: '28px 20px 40px' },
  intro: { textAlign: 'center', marginBottom: 24 },
  introTitle: { fontSize: 21, fontWeight: 800, color: '#111827', marginBottom: 5 },
  introSub: { fontSize: 13, color: '#6b7280' },

  typeList: { display: 'flex', flexDirection: 'column', gap: 10 },
  typeRow: {
    width: '100%',
    display: 'flex', alignItems: 'center', gap: 14,
    padding: '16px 16px',
    background: '#fff',
    border: '1px solid #eef0ee',
    borderRadius: 16,
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    cursor: 'pointer',
    textAlign: 'left',
    fontFamily: 'inherit',
  },
  typeRowIcon: {
    width: 44, height: 44, borderRadius: 12, flexShrink: 0,
    background: '#dcfce7', color: VERDE,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  typeRowText: { flex: 1, display: 'flex', flexDirection: 'column', gap: 2 },
  typeRowLabel: { fontSize: 15, fontWeight: 700, color: '#111827' },
  typeRowSub: { fontSize: 12.5, color: '#6b7280' },
  typeRowChevron: { color: '#c7cdc7', display: 'flex', flexShrink: 0 },

  rulesCard: {
    marginTop: 28,
    padding: '18px 16px',
    background: '#fff',
    border: '1px solid #eef0ee',
    borderRadius: 16,
    display: 'flex', flexDirection: 'column', gap: 12,
  },
  rulesTitle: {
    fontSize: 12, fontWeight: 700, color: '#111827',
    textTransform: 'uppercase', letterSpacing: 0.4,
  },
  ruleRow: { display: 'flex', alignItems: 'flex-start', gap: 10 },
  ruleIcon: { color: VERDE, display: 'flex', flexShrink: 0, marginTop: 1 },
  ruleText: { fontSize: 12.5, color: '#6b7280', lineHeight: 1.45 },

  /* --- formulario --- */
  formScroll: { flex: 1, minHeight: 0, overflowY: 'auto', padding: '18px 20px 20px' },
  form: { display: 'flex', flexDirection: 'column' },

  labelFirst: {
    display: 'block', fontSize: 12, fontWeight: 700,
    color: '#374151', marginBottom: 8, marginTop: 0,
  },
  label: {
    display: 'block', fontSize: 12, fontWeight: 700,
    color: '#374151', marginBottom: 8, marginTop: 18,
  },
  opt: { color: '#9ca3af', fontWeight: 500 },

  input: {
    width: '100%', padding: '14px 16px', fontSize: 15,
    background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 12,
    color: '#111827', fontFamily: 'inherit', outline: 'none',
    boxSizing: 'border-box',
  },

  hintBox: {
    padding: '12px 14px',
    background: '#dcfce7', color: VERDE_OSC,
    borderRadius: 12, fontSize: 12.5, fontWeight: 500,
    lineHeight: 1.45, marginBottom: 18,
  },

  chipGrid2: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 },
  chipGrid3: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 },
  chipGrid4: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 },
  chip: {
    padding: '11px 8px', borderRadius: 12,
    fontSize: 12.5, fontWeight: 600,
    border: '1.5px solid #e5e7eb', cursor: 'pointer',
    fontFamily: 'inherit',
    textAlign: 'center',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  photoHint: {
    fontSize: 11.5, color: '#6b7280', lineHeight: 1.4,
    marginTop: -2, marginBottom: 10,
  },

  row: { display: 'flex', gap: 8, alignItems: 'stretch' },
  priceBox: {
    flex: 1, display: 'flex', alignItems: 'center',
    background: '#fff', border: '1.5px solid #e5e7eb',
    borderRadius: 12, padding: '0 14px',
  },
  pricePrefix: { fontSize: 15, fontWeight: 700, color: '#374151', marginRight: 4 },
  priceInput: {
    flex: 1, border: 'none', outline: 'none', background: 'transparent',
    padding: '14px 0', fontSize: 15, color: '#111827',
    fontFamily: 'inherit', width: '100%',
  },
  toggleBtn: {
    padding: '0 16px', borderRadius: 12,
    fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap',
    border: 'none', cursor: 'pointer', fontFamily: 'inherit',
  },

  /* --- fotos --- */
  photoGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 },
  photoItem: {
    position: 'relative', aspectRatio: '1 / 1',
    borderRadius: 10, overflow: 'hidden', background: '#f3f4f6',
  },
  photoImg: { width: '100%', height: '100%', objectFit: 'cover' },
  photoRemove: {
    position: 'absolute', top: 4, right: 4,
    width: 20, height: 20, borderRadius: '50%',
    background: 'rgba(0,0,0,0.65)', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: 'none', cursor: 'pointer', padding: 0,
  },
  photoAdd: {
    aspectRatio: '1 / 1', borderRadius: 10,
    border: '2px dashed #e5e7eb', background: '#fff',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', gap: 3,
    cursor: 'pointer',
  },
  photoAddText: { fontSize: 10.5, fontWeight: 600, color: '#9ca3af' },

  /* --- error --- */
  errorBox: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '12px 14px', marginTop: 16,
    background: '#fee2e2', color: '#991b1b',
    borderRadius: 12, fontSize: 13, fontWeight: 600,
  },

  /* --- footer --- */
  footer: {
    padding: '16px 20px 30px',
    background: '#fff', borderTop: '1px solid #f0f0f0',
    flexShrink: 0,
  },
  publishBtn: {
    width: '100%', padding: 16,
    background: VERDE, color: '#fff',
    borderRadius: 999, fontSize: 15, fontWeight: 700,
    border: 'none', cursor: 'pointer', fontFamily: 'inherit',
    boxShadow: '0 6px 20px rgba(22,163,74,0.3)',
  },

  /* --- overlays --- */
  overlay: {
    flex: 1, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', gap: 16, padding: 40,
  },
  spinner: {
    width: 48, height: 48,
    border: '4px solid rgba(22,163,74,0.15)',
    borderTop: `4px solid ${VERDE}`,
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  overlayText: { fontSize: 15, fontWeight: 700, color: '#374151' },
  successCircle: {
    width: 88, height: 88, borderRadius: '50%',
    background: VERDE, color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 10px 30px rgba(22,163,74,0.35)',
  },
  successTitle: { fontSize: 22, fontWeight: 800, color: '#111827', marginTop: 6 },
  successText: { fontSize: 13, color: '#6b7280', textAlign: 'center' },
}

export default CreatePost