import { useState } from 'react'
import { supabase } from '../lib/supabase'

const POST_TYPES = [
  { id: 'general', label: 'Publicación', emoji: '📢', color: '#6B7280', bg: '#F3F4F6' },
  { id: 'sell', label: 'Vender', emoji: '💰', color: '#138864', bg: '#DCFCE7' },
  { id: 'gift', label: 'Regalar', emoji: '🎁', color: '#9B5DE5', bg: '#F3E8FF' },
  { id: 'trade', label: 'Intercambiar', emoji: '🔄', color: '#2EC4B6', bg: '#CFFAFE' },
  { id: 'alert', label: 'Alerta', emoji: '🚨', color: '#E63946', bg: '#FEE2E2' },
  { id: 'event', label: 'Evento', emoji: '🎉', color: '#F4A261', bg: '#FED7AA' },
]

const ALERT_TYPES = [
  { id: 'robo', label: 'Robo', emoji: '🚨' },
  { id: 'incendio', label: 'Incendio', emoji: '🔥' },
  { id: 'accidente', label: 'Accidente', emoji: '🚗' },
  { id: 'corte_agua', label: 'Corte de agua', emoji: '💧' },
  { id: 'corte_luz', label: 'Corte de luz', emoji: '⚡' },
  { id: 'ruido', label: 'Ruido molesto', emoji: '📢' },
  { id: 'mascota', label: 'Mascota perdida', emoji: '🐕' },
  { id: 'objeto', label: 'Objeto perdido', emoji: '🔑' },
  { id: 'otro', label: 'Otro', emoji: '❓' },
]

const CATEGORIES_SELL = [
  'Muebles', 'Tecnología', 'Bicicletas', 'Herramientas',
  'Ropa', 'Mascotas', 'Libros', 'Deportes', 'Hogar', 'Otro'
]

function CreatePost({ onClose, onPublished }) {
  const [step, setStep] = useState('type')
  const [selectedType, setSelectedType] = useState(null)
  
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [price, setPrice] = useState('')
  const [isNegotiable, setIsNegotiable] = useState(false)
  const [category, setCategory] = useState('')
  const [alertType, setAlertType] = useState('')
  const [isUrgent, setIsUrgent] = useState(false)
  const [eventDate, setEventDate] = useState('')
  const [eventLocation, setEventLocation] = useState('')
  const [images, setImages] = useState([])
  const [imagePreviews, setImagePreviews] = useState([])
  const [tradeFor, setTradeFor] = useState('')
  
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
      setError('Máximo 4 imágenes')
      return
    }

    const newImages = [...images, ...files]
    setImages(newImages)

    files.forEach((file) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreviews((prev) => [...prev, reader.result])
      }
      reader.readAsDataURL(file)
    })
  }

  const removeImage = (index) => {
    setImages(images.filter((_, i) => i !== index))
    setImagePreviews(imagePreviews.filter((_, i) => i !== index))
  }

  const formatPrice = (value) => {
    const cleaned = value.replace(/\D/g, '')
    return cleaned.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  }

  const handlePublish = async () => {
    setError('')

    if (selectedType.id === 'alert') {
      if (!alertType) { setError('Selecciona un tipo de alerta'); return }
      if (!content.trim()) { setError('Describe la situación'); return }
    } else if (selectedType.id === 'sell') {
  if (!title.trim()) { setError('Ponle un título a tu producto'); return }
  if (!price) { setError('Ingresa un precio'); return }
  if (images.length === 0) { setError('Agrega al menos 1 foto de tu producto'); return }
    } else if (selectedType.id === 'event') {
      if (!title.trim()) { setError('Ponle un título al evento'); return }
      if (!eventDate) { setError('Ingresa la fecha del evento'); return }
      if (!eventLocation.trim()) { setError('Ingresa el lugar'); return }
    } else if (selectedType.id === 'trade') {
      if (!title.trim()) { setError('¿Qué ofreces?'); return }
      if (!tradeFor.trim()) { setError('¿Qué buscas a cambio?'); return }
    } else {
      if (!content.trim()) { setError('Escribe algo'); return }
    }

    setStep('publishing')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No hay usuario')

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, neighborhood_id')
        .eq('user_id', user.id)
        .single()

      if (!profile) throw new Error('No se encontró tu perfil')

      const uploadedUrls = []
      for (const image of images) {
        const fileExt = image.name.split('.').pop()
        const fileName = `${user.id}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        
        const { error: uploadError } = await supabase.storage
          .from('posts')
          .upload(fileName, image)

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from('posts')
            .getPublicUrl(fileName)
          uploadedUrls.push(urlData.publicUrl)
        }
      }

      const postData = {
        author_id: profile.id,
        neighborhood_id: profile.neighborhood_id,
        type: selectedType.id,
        distance_meters: Math.floor(Math.random() * 500) + 50,
        images: uploadedUrls.length > 0 ? uploadedUrls : null,
      }

      if (selectedType.id === 'alert') {
        postData.title = ALERT_TYPES.find(a => a.id === alertType)?.label
        postData.content = content
        postData.category = alertType
        postData.urgency = isUrgent ? 'critical' : 'high'
      } else if (selectedType.id === 'sell') {
        postData.title = title
        postData.content = content || title
        postData.price = parseInt(price.replace(/\./g, ''))
        postData.is_negotiable = isNegotiable
        postData.category = category
      } else if (selectedType.id === 'event') {
        postData.title = title
        postData.content = `${content}\n\n📍 ${eventLocation}\n📅 ${eventDate}`
      } else if (selectedType.id === 'trade') {
        postData.title = title
        postData.content = `${content}\n\n🔄 Busco a cambio: ${tradeFor}`
      } else if (selectedType.id === 'gift') {
        postData.title = title || 'Regalo'
        postData.content = content
      } else {
        postData.title = title || null
        postData.content = content
      }

      const { error: insertError } = await supabase
        .from('posts')
        .insert([postData])

      if (insertError) throw insertError

      setStep('success')
      
      setTimeout(() => {
        if (onPublished) onPublished()
        if (onClose) onClose()
      }, 1500)

    } catch (err) {
      setError(err.message)
      setStep('form')
    }
  }

  // ============================================
  // RENDER: SELECCIÓN DE TIPO
  // ============================================
  if (step === 'type') {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <button style={styles.closeButton} onClick={onClose}>
            <span style={{ fontSize: 20 }}>✕</span>
          </button>
          <div style={styles.headerTitle}>Nueva publicación</div>
          <div style={{ width: 40 }} />
        </div>

        <div style={styles.typeContent}>
          <div style={styles.typeIntro}>
            <div style={styles.typeIntroTitle}>¿Qué quieres compartir?</div>
            <div style={styles.typeIntroSubtitle}>Elige el tipo de publicación</div>
          </div>

          <div style={styles.typeGrid}>
            {POST_TYPES.map((type) => (
              <button
                key={type.id}
                onClick={() => handleSelectType(type)}
                style={{
                  ...styles.typeCard,
                  background: type.bg,
                }}
              >
                <div style={styles.typeEmoji}>{type.emoji}</div>
                <div style={{ ...styles.typeLabel, color: type.color }}>
                  {type.label}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ============================================
  // RENDER: PUBLICANDO
  // ============================================
  if (step === 'publishing') {
    return (
      <div style={styles.container}>
        <div style={styles.overlayContent}>
          <div style={styles.spinner} />
          <div style={styles.publishingText}>Publicando...</div>
        </div>
      </div>
    )
  }

  // ============================================
  // RENDER: ÉXITO
  // ============================================
  if (step === 'success') {
    return (
      <div style={styles.container}>
        <div style={styles.overlayContent}>
          <div style={styles.successCircle}>✓</div>
          <div style={styles.successTitle}>¡Publicado!</div>
          <div style={styles.successText}>Tus vecinos ya lo pueden ver</div>
        </div>
      </div>
    )
  }

  // ============================================
  // RENDER: FORMULARIO
  // ============================================
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button style={styles.closeButton} onClick={() => setStep('type')}>
          <span style={{ fontSize: 18 }}>←</span>
        </button>
        <div style={styles.headerTitle}>
          {selectedType.emoji} {selectedType.label}
        </div>
        <div style={{ width: 40 }} />
      </div>

      <div style={styles.formScroll} className="scroll-hide">
        
        {/* FORMULARIO ALERTA */}
        {selectedType.id === 'alert' && (
          <div style={styles.formContent}>
            <label style={styles.firstLabel}>¿Qué está pasando?</label>
            <div style={styles.alertGrid}>
              {ALERT_TYPES.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setAlertType(a.id)}
                  style={{
                    ...styles.alertButton,
                    background: alertType === a.id ? '#FEE2E2' : 'white',
                    borderColor: alertType === a.id ? '#E63946' : '#E5E7EB',
                  }}
                >
                  <span style={{ fontSize: 18 }}>{a.emoji}</span>
                  <span style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: alertType === a.id ? '#E63946' : '#374151',
                  }}>{a.label}</span>
                </button>
              ))}
            </div>

            <label style={styles.label}>Describe la situación</label>
            <textarea
              placeholder="Sé lo más claro posible..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              style={{ ...styles.input, minHeight: 100, resize: 'vertical' }}
            />

            <div style={styles.urgentToggle}>
              <div>
                <div style={styles.urgentTitle}>🔴 Marcar como URGENTE</div>
                <div style={styles.urgentText}>Se destaca con borde rojo</div>
              </div>
              <button
                onClick={() => setIsUrgent(!isUrgent)}
                style={{
                  ...styles.toggle,
                  background: isUrgent ? '#E63946' : '#E5E7EB',
                }}
              >
                <div style={{
                  ...styles.toggleKnob,
                  transform: isUrgent ? 'translateX(20px)' : 'translateX(0)',
                }} />
              </button>
            </div>

            <div style={styles.imagesSection}>
              <label style={styles.label}>
                Fotos <span style={styles.optional}>({images.length}/4)</span>
              </label>
              <ImageUploader 
                images={images} 
                previews={imagePreviews} 
                onUpload={handleImageUpload} 
                onRemove={removeImage} 
              />
            </div>
          </div>
        )}

        {/* FORMULARIO VENDER */}
        {selectedType.id === 'sell' && (
          <div style={styles.formContent}>
            <label style={styles.firstLabel}>¿Qué vendes?</label>
            <input
              type="text"
              placeholder="Ej: Bicicleta MTB Trek talla M"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={styles.input}
            />

            <label style={styles.label}>Descripción (opcional)</label>
            <textarea
              placeholder="Detalles, estado, año..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              style={{ ...styles.input, minHeight: 70, resize: 'vertical' }}
            />

            <label style={styles.label}>Precio</label>
            <div style={styles.priceRow}>
              <div style={styles.priceInputWrapper}>
                <span style={styles.pricePrefix}>$</span>
                <input
                  type="text"
                  placeholder="0"
                  value={price}
                  onChange={(e) => setPrice(formatPrice(e.target.value))}
                  style={{ ...styles.input, border: 'none', padding: '14px 0' }}
                />
              </div>
              <button
                onClick={() => setIsNegotiable(!isNegotiable)}
                style={{
                  ...styles.negotiableBtn,
                  background: isNegotiable ? '#138864' : '#F3F4F6',
                  color: isNegotiable ? 'white' : '#6B7280',
                }}
              >
                {isNegotiable && '✓ '}Conversable
              </button>
            </div>

            <label style={styles.label}>Categoría</label>
            <div style={styles.categoryGrid}>
              {CATEGORIES_SELL.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  style={{
                    ...styles.categoryChip,
                    background: category === cat ? '#138864' : 'white',
                    color: category === cat ? 'white' : '#374151',
                    borderColor: category === cat ? '#138864' : '#E5E7EB',
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div style={styles.imagesSection}>
              <label style={styles.label}>
                Fotos <span style={styles.optional}>({images.length}/4)</span>
              </label>
              <ImageUploader 
                images={images} 
                previews={imagePreviews} 
                onUpload={handleImageUpload} 
                onRemove={removeImage} 
              />
            </div>
          </div>
        )}

        {/* FORMULARIO REGALO */}
        {selectedType.id === 'gift' && (
          <div style={styles.formContent}>
            <label style={styles.firstLabel}>¿Qué regalas?</label>
            <input
              type="text"
              placeholder="Ej: Libros infantiles"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={styles.input}
            />

            <label style={styles.label}>Detalles</label>
            <textarea
              placeholder="Estado, cantidad, dónde retirar..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              style={{ ...styles.input, minHeight: 80, resize: 'vertical' }}
            />

            <div style={styles.infoBox}>
              💚 Los regalos fomentan la economía circular en tu barrio
            </div>

            <div style={styles.imagesSection}>
              <label style={styles.label}>
                Fotos <span style={styles.optional}>({images.length}/4)</span>
              </label>
              <ImageUploader 
                images={images} 
                previews={imagePreviews} 
                onUpload={handleImageUpload} 
                onRemove={removeImage} 
              />
            </div>
          </div>
        )}

        {/* FORMULARIO TRUEQUE */}
        {selectedType.id === 'trade' && (
          <div style={styles.formContent}>
            <label style={styles.firstLabel}>¿Qué ofreces?</label>
            <input
              type="text"
              placeholder="Ej: Guitarra acústica"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={styles.input}
            />

            <label style={styles.label}>Descripción</label>
            <textarea
              placeholder="Estado, características..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              style={{ ...styles.input, minHeight: 70, resize: 'vertical' }}
            />

            <label style={styles.label}>¿Qué buscas a cambio?</label>
            <input
              type="text"
              placeholder="Ej: Teclado electrónico"
              value={tradeFor}
              onChange={(e) => setTradeFor(e.target.value)}
              style={styles.input}
            />

            <div style={styles.imagesSection}>
              <label style={styles.label}>
                Fotos <span style={styles.optional}>({images.length}/4)</span>
              </label>
              <ImageUploader 
                images={images} 
                previews={imagePreviews} 
                onUpload={handleImageUpload} 
                onRemove={removeImage} 
              />
            </div>
          </div>
        )}

        {/* FORMULARIO EVENTO */}
        {selectedType.id === 'event' && (
          <div style={styles.formContent}>
            <label style={styles.firstLabel}>Nombre del evento</label>
            <input
              type="text"
              placeholder="Ej: Feria de las Pulgas"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={styles.input}
            />

            <label style={styles.label}>Descripción</label>
            <textarea
              placeholder="¿De qué se trata?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              style={{ ...styles.input, minHeight: 70, resize: 'vertical' }}
            />

            <label style={styles.label}>Fecha y hora</label>
            <input
              type="datetime-local"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              style={styles.input}
            />

            <label style={styles.label}>Lugar</label>
            <input
              type="text"
              placeholder="Ej: Plaza Bombero Ossa"
              value={eventLocation}
              onChange={(e) => setEventLocation(e.target.value)}
              style={styles.input}
            />

            <div style={styles.imagesSection}>
              <label style={styles.label}>
                Fotos <span style={styles.optional}>({images.length}/4)</span>
              </label>
              <ImageUploader 
                images={images} 
                previews={imagePreviews} 
                onUpload={handleImageUpload} 
                onRemove={removeImage} 
              />
            </div>
          </div>
        )}

        {/* FORMULARIO GENERAL */}
        {selectedType.id === 'general' && (
          <div style={styles.formContent}>
            <label style={styles.firstLabel}>Título (opcional)</label>
            <input
              type="text"
              placeholder="Ej: ¿Alguien conoce un buen dentista?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={styles.input}
            />

            <label style={styles.label}>¿Qué quieres compartir?</label>
            <textarea
              placeholder="Escribe algo para tu barrio..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              style={{ ...styles.input, minHeight: 100, resize: 'vertical' }}
            />

            <div style={styles.imagesSection}>
              <label style={styles.label}>
                Fotos <span style={styles.optional}>({images.length}/4)</span>
              </label>
              <ImageUploader 
                images={images} 
                previews={imagePreviews} 
                onUpload={handleImageUpload} 
                onRemove={removeImage} 
              />
            </div>
          </div>
        )}

        {error && (
          <div style={styles.errorBox}>
            ⚠️ {error}
          </div>
        )}
      </div>

      {/* BOTÓN PUBLICAR */}
      <div style={styles.footer}>
        <button
          onClick={handlePublish}
          style={{
            ...styles.publishButton,
            background: selectedType.color,
            boxShadow: `0 6px 20px ${selectedType.color}55`,
          }}
        >
          {selectedType.id === 'alert' ? 'Publicar alerta' :
           selectedType.id === 'sell' ? 'Publicar venta' :
           selectedType.id === 'gift' ? 'Publicar regalo' :
           selectedType.id === 'trade' ? 'Publicar trueque' :
           selectedType.id === 'event' ? 'Crear evento' :
           'Publicar en mi barrio'}
        </button>
      </div>
    </div>
  )
}

// COMPONENTE REUTILIZABLE: Uploader de imágenes
function ImageUploader({ images, previews, onUpload, onRemove }) {
  return (
    <div style={styles.imageUploader}>
      {previews.map((preview, index) => (
        <div key={index} style={styles.imagePreview}>
          <img src={preview} alt="" style={styles.previewImg} />
          <button
            onClick={() => onRemove(index)}
            style={styles.removeImg}
          >
            ✕
          </button>
        </div>
      ))}
      {images.length < 4 && (
        <label htmlFor="upload-images" style={styles.uploadBox}>
          <span style={{ fontSize: 24 }}>📷</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#6B7280' }}>
            Agregar
          </span>
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
  )
}

const styles = {
  container: {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  background: '#FAFAF7',
  overflow: 'hidden',
  zIndex: 100,
  animation: 'slideUp 0.3s ease',
},
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '50px 16px 16px',
    background: 'white',
    borderBottom: '1px solid #F3F4F6',
    flexShrink: 0,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    background: '#F3F4F6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    cursor: 'pointer',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: 800,
    color: '#1A1A1A',
  },

  // ============ PANTALLA DE SELECCIÓN DE TIPO ============
  // 🔥 FIX: quitamos justifyContent center para que el contenido empiece arriba
  typeContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    padding: '32px 24px 40px',
    overflowY: 'auto',
  },
  typeIntro: {
    textAlign: 'center',
    marginBottom: 28,
  },
  typeIntroTitle: {
    fontSize: 22,
    fontWeight: 800,
    color: '#1A1A1A',
    marginBottom: 6,
  },
  typeIntroSubtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  typeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 12,
  },
  typeCard: {
    aspectRatio: '1 / 1',
    borderRadius: 20,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    transition: 'transform 0.2s',
    padding: 16,
    border: 'none',
    cursor: 'pointer',
  },
  typeEmoji: {
    fontSize: 40,
  },
  typeLabel: {
    fontSize: 14,
    fontWeight: 800,
  },

  // ============ FORMULARIO ============
  // 🔥 FIX: flex 1 + minHeight 0 obliga al scroll a funcionar correctamente
  // sin este minHeight: 0, flex puede sobredimensionarse y causar los gaps
  formScroll: {
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
    padding: '16px 20px 20px',
  },
  formContent: {
    display: 'flex',
    flexDirection: 'column',
  },
  firstLabel: {
    display: 'block',
    fontSize: 12,
    fontWeight: 700,
    color: '#374151',
    marginBottom: 8,
    marginTop: 0,
  },
  label: {
    display: 'block',
    fontSize: 12,
    fontWeight: 700,
    color: '#374151',
    marginBottom: 8,
    marginTop: 16,
  },
  optional: {
    color: '#9CA3AF',
    fontWeight: 500,
  },
  input: {
    width: '100%',
    padding: '14px 16px',
    fontSize: 15,
    background: 'white',
    border: '1.5px solid #E5E7EB',
    borderRadius: 12,
    color: '#1A1A1A',
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box',
  },
  alertGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 8,
  },
  alertButton: {
    padding: '12px 8px',
    borderRadius: 12,
    border: '1.5px solid #E5E7EB',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    transition: 'all 0.2s',
    cursor: 'pointer',
  },
  urgentToggle: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    background: '#FEF2F2',
    borderRadius: 12,
    border: '1px solid #FECACA',
    marginTop: 16,
  },
  urgentTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: '#991B1B',
  },
  urgentText: {
    fontSize: 11,
    color: '#DC2626',
    marginTop: 2,
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 999,
    position: 'relative',
    transition: 'background 0.2s',
    padding: 2,
    flexShrink: 0,
    border: 'none',
    cursor: 'pointer',
  },
  toggleKnob: {
    width: 20,
    height: 20,
    background: 'white',
    borderRadius: '50%',
    transition: 'transform 0.2s',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
  },
  priceRow: {
    display: 'flex',
    gap: 8,
    alignItems: 'stretch',
  },
  priceInputWrapper: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    background: 'white',
    border: '1.5px solid #E5E7EB',
    borderRadius: 12,
    padding: '0 14px',
  },
  pricePrefix: {
    fontSize: 15,
    fontWeight: 700,
    color: '#374151',
    marginRight: 4,
  },
  negotiableBtn: {
    padding: '0 14px',
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 700,
    whiteSpace: 'nowrap',
    transition: 'all 0.2s',
    border: 'none',
    cursor: 'pointer',
  },
  categoryGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
  },
  categoryChip: {
    padding: '8px 14px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 600,
    border: '1.5px solid #E5E7EB',
    transition: 'all 0.2s',
    cursor: 'pointer',
  },
  infoBox: {
    padding: 12,
    background: '#F3E8FF',
    color: '#7C3AED',
    borderRadius: 10,
    fontSize: 12,
    fontWeight: 500,
    textAlign: 'center',
    marginTop: 12,
  },
  imagesSection: {
    marginTop: 4,
  },
  imageUploader: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 8,
  },
  imagePreview: {
    position: 'relative',
    aspectRatio: '1 / 1',
    borderRadius: 10,
    overflow: 'hidden',
    background: '#F3F4F6',
  },
  previewImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  removeImg: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: '50%',
    background: 'rgba(0,0,0,0.7)',
    color: 'white',
    fontSize: 11,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    border: 'none',
    cursor: 'pointer',
  },
  uploadBox: {
    aspectRatio: '1 / 1',
    borderRadius: 10,
    border: '2px dashed #E5E7EB',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    cursor: 'pointer',
    background: 'white',
  },
  errorBox: {
    padding: 12,
    background: '#FEE2E2',
    color: '#991B1B',
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 500,
    textAlign: 'center',
    marginTop: 12,
  },
  footer: {
    padding: '16px 20px 30px',
    background: 'white',
    borderTop: '1px solid #F3F4F6',
    flexShrink: 0,
  },
  publishButton: {
    width: '100%',
    padding: 16,
    color: 'white',
    borderRadius: 999,
    fontSize: 15,
    fontWeight: 700,
    transition: 'all 0.2s',
    border: 'none',
    cursor: 'pointer',
  },
  overlayContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 40,
  },
  spinner: {
    width: 50,
    height: 50,
    border: '4px solid #13886425',
    borderTop: '4px solid #138864',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  publishingText: {
    fontSize: 16,
    fontWeight: 700,
    color: '#374151',
  },
  successCircle: {
    width: 90,
    height: 90,
    background: '#138864',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontSize: 48,
    fontWeight: 900,
    boxShadow: '0 10px 30px rgba(19, 136, 100, 0.4)',
    animation: 'fadeIn 0.3s ease',
  },
  successTitle: {
    fontSize: 22,
    fontWeight: 800,
    color: '#1A1A1A',
    marginTop: 8,
  },
  successText: {
    fontSize: 13,
    color: '#6B7280',
  },
}

export default CreatePost