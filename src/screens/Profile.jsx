import { useState } from 'react'
import { supabase } from '../lib/supabase'
import Stepper from '../components/Stepper'

function Profile({ onFinish, onBack }) {
  const [fullName, setFullName] = useState('')
  const [rut, setRut] = useState('')
  const [rutValid, setRutValid] = useState(null)
  const [phone, setPhone] = useState('')
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Formatear RUT: 123456789 → 12.345.678-9
  const formatRut = (value) => {
    let cleaned = value.replace(/[^0-9kK]/g, '').toUpperCase()
    if (cleaned.length === 0) return ''
    if (cleaned.length > 9) cleaned = cleaned.slice(0, 9)

    const dv = cleaned.slice(-1)
    const numbers = cleaned.slice(0, -1)

    let formatted = ''
    for (let i = numbers.length; i > 0; i -= 3) {
      const chunk = numbers.slice(Math.max(0, i - 3), i)
      formatted = chunk + (formatted ? '.' + formatted : '')
    }

    return numbers.length > 0 ? `${formatted}-${dv}` : dv
  }

  // Validar RUT chileno con algoritmo Módulo 11
  const validateRut = (rutValue) => {
    const cleaned = rutValue.replace(/[^0-9kK]/g, '').toUpperCase()
    if (cleaned.length < 8) return false

    const dv = cleaned.slice(-1)
    const numbers = cleaned.slice(0, -1)

    let sum = 0
    let multiplier = 2
    for (let i = numbers.length - 1; i >= 0; i--) {
      sum += parseInt(numbers[i]) * multiplier
      multiplier = multiplier === 7 ? 2 : multiplier + 1
    }

    const remainder = 11 - (sum % 11)
    const calculatedDv = remainder === 11 ? '0' : remainder === 10 ? 'K' : remainder.toString()

    return calculatedDv === dv
  }

  const handleRutChange = (e) => {
    const formatted = formatRut(e.target.value)
    setRut(formatted)

    if (formatted.length >= 11) {
      setRutValid(validateRut(formatted))
    } else {
      setRutValid(null)
    }
  }

  const handlePhoneChange = (e) => {
    let cleaned = e.target.value.replace(/[^0-9]/g, '')
    if (cleaned.length > 9) cleaned = cleaned.slice(0, 9)
    setPhone(cleaned)
  }

  const handleAvatarChange = (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen debe pesar menos de 5MB')
      return
    }

    setAvatarFile(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setAvatarPreview(reader.result)
    }
    reader.readAsDataURL(file)
  }

  const handleContinue = async () => {
    setError('')

    if (!fullName.trim() || fullName.trim().split(' ').length < 2) {
      setError('Ingresa tu nombre y apellido')
      return
    }
    if (!rut.trim()) {
      setError('Ingresa tu RUT')
      return
    }
    if (!validateRut(rut)) {
      setError('El RUT ingresado no es válido')
      return
    }
    if (phone.replace(/\D/g, '').length < 8) {
      setError('Ingresa tu teléfono. Los vecinos lo necesitan para contactarte.')
      return
    }

    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No hay usuario autenticado')

      // ============================================================
      // NUEVO: Verificar que el RUT esté en la whitelist de El Barrio.
      // Llama a la función RPC `is_rut_allowed` definida en Supabase.
      // Si la RPC no existe o falla, NO bloquea al usuario (fallback
      // graceful: solo avisa por consola y sigue el flujo normal).
      // ============================================================
      const { data: rutAllowed, error: rpcError } = await supabase
        .rpc('is_rut_allowed', { rut_input: rut })

      if (rpcError) {
        // La tabla/function probablemente no existe todavía → no bloqueamos.
        console.warn('[Profile] is_rut_allowed RPC falló:', rpcError.message)
      } else if (rutAllowed === false) {
        setError('Tu RUT no está autorizado para unirse a El Barrio. Si crees que es un error, contacta al administrador.')
        return
      }
      // ============================================================

      let avatarUrl = null

      // Subir avatar si existe
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop()
        const fileName = `${user.id}-${Date.now()}.${fileExt}`
        
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, avatarFile, { upsert: true })

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from('avatars')
            .getPublicUrl(fileName)
          avatarUrl = urlData.publicUrl
        }
      }

      // Actualizar profile
      const updateData = {
        full_name: fullName.trim(),
        rut: rut,
        phone: phone || null,
      }
      if (avatarUrl) updateData.avatar_url = avatarUrl

      const { error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('user_id', user.id)

      if (updateError) throw updateError

      onFinish()
    } catch (err) {
      if (err.code === '23505' && err.message?.includes('rut')) {
        setError('Ese RUT ya está registrado en El Barrio. Cada persona puede tener una sola cuenta.')
      } else {
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  const initials = fullName
    .split(' ')
    .filter(n => n.length > 0)
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase() || '?'

  return (
    <div style={styles.container}>
      {/* HEADER */}
      <div style={styles.header}>
        <button style={styles.backButton} onClick={onBack}>
          <span style={{ fontSize: 18 }}>←</span>
        </button>
        <div style={{ flex: 1, marginLeft: 12 }}>
          <Stepper currentStep={2} totalSteps={4} />
        </div>
      </div>

      {/* TÍTULO */}
      <div style={styles.titleSection}>
        <h1 style={styles.title}>Cuéntanos sobre ti</h1>
        <p style={styles.subtitle}>
          Esta información ayuda a generar confianza con tus vecinos
        </p>
      </div>

      {/* FOTO DE PERFIL */}
      <div style={styles.avatarSection}>
        <div style={styles.avatarWrapper}>
          {avatarPreview ? (
            <img src={avatarPreview} alt="Avatar" style={styles.avatarImg} />
          ) : (
            <div style={styles.avatarPlaceholder}>
              {fullName ? (
                <span style={styles.avatarInitials}>{initials}</span>
              ) : (
                <span style={{ fontSize: 36, opacity: 0.4 }}>👤</span>
              )}
            </div>
          )}
          <label htmlFor="avatar-upload" style={{
            ...styles.cameraButton,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </label>
          <input
            id="avatar-upload"
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            style={{ display: 'none' }}
          />
        </div>
        <p style={styles.avatarHint}>
          Foto de perfil <span style={styles.optional}>(opcional pero recomendada)</span>
        </p>
      </div>

      {/* FORMULARIO */}
      <div style={styles.form}>
        <div style={styles.inputGroup}>
          <label style={styles.label}>Escribe tu nombre y tu apellido</label>
          <div style={styles.inputWrapper}>
            <span style={styles.inputIcon}>
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
</span>
            <input
              type="text"
              placeholder="Ej: Carlos Mendoza"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              style={styles.input}
            />
          </div>
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.label}>
            RUT
            {rutValid === true && (
              <span style={styles.validBadge}>✓ Válido</span>
            )}
            {rutValid === false && (
              <span style={styles.invalidBadge}>✗ Inválido</span>
            )}
          </label>
          <div style={{
            ...styles.inputWrapper,
            borderColor: rutValid === true ? '#138864' : rutValid === false ? '#E63946' : '#E5E7EB',
          }}>
            <span style={styles.inputIcon}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <circle cx="8.5" cy="11" r="2" />
          <path d="M5.5 17a3.5 3.5 0 0 1 6 0" />
          <line x1="15" y1="10" x2="19" y2="10" />
          <line x1="15" y1="14" x2="19" y2="14" />
        </svg>
      </span>
            <input
              type="text"
              placeholder="12.345.678-9"
              value={rut}
              onChange={handleRutChange}
              style={styles.input}
              maxLength={12}
            />
          </div>
          <p style={styles.hintText}>
            Solo lo usamos para verificar tu identidad. Nunca se comparte.
          </p>
        </div>

       <div style={styles.inputGroup}>
          <label style={styles.label}>
            Teléfono
          </label>
          <div style={styles.inputWrapper}>
            <span style={styles.inputIcon}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="2" width="14" height="20" rx="2" />
                <line x1="12" y1="18" x2="12.01" y2="18" />
              </svg>
            </span>
            <span style={styles.phonePrefix}>+56 9</span>
            <input
              type="tel"
              placeholder="1234 5678"
              value={phone}
              onChange={handlePhoneChange}
              style={styles.input}
              maxLength={9}
            />
          </div>
        </div>

        {error && (
          <div style={styles.errorBox}>
            {error && (
  <div style={{ ...styles.error, display: 'flex', alignItems: 'center', gap: 8 }}>
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
    <span>{error}</span>
  </div>
)}
          </div>
        )}
      </div>

      {/* BOTÓN CONTINUAR */}
      <div style={styles.footer}>
        <button
          onClick={handleContinue}
          disabled={loading}
          style={{
            ...styles.primaryButton,
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? 'Guardando...' : 'Continuar'}
        </button>
      </div>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100%',
    background: '#FAFAF7',
    padding: '0 24px 40px',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    background: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    flexShrink: 0,
  },
  titleSection: {
    textAlign: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 800,
    color: '#1A1A1A',
    marginBottom: 6,
    letterSpacing: '-0.5px',
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 1.4,
    padding: '0 20px',
  },
  avatarSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarWrapper: {
    position: 'relative',
    width: 100,
    height: 100,
    marginBottom: 8,
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    background: '#E5E7EB',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '3px dashed #9CA3AF',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '3px solid #138864',
  },
  avatarInitials: {
    fontSize: 32,
    fontWeight: 800,
    color: '#6B7280',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: '50%',
    background: '#138864',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(19, 136, 100, 0.4)',
    border: '3px solid #FAFAF7',
  },
  avatarHint: {
    fontSize: 12,
    color: '#374151',
    fontWeight: 600,
  },
  optional: {
    color: '#9CA3AF',
    fontWeight: 500,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    flex: 1,
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: 600,
    color: '#374151',
    marginLeft: 4,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  validBadge: {
    fontSize: 11,
    fontWeight: 700,
    color: '#138864',
    background: '#DCFCE7',
    padding: '2px 8px',
    borderRadius: 999,
  },
  invalidBadge: {
    fontSize: 11,
    fontWeight: 700,
    color: '#E63946',
    background: '#FEE2E2',
    padding: '2px 8px',
    borderRadius: 999,
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    background: 'white',
    border: '1.5px solid #E5E7EB',
    borderRadius: 12,
    padding: '0 14px',
    transition: 'border-color 0.2s',
  },
  inputIcon: {
    fontSize: 16,
    marginRight: 8,
    opacity: 0.6,
  },
  input: {
    flex: 1,
    padding: '14px 0',
    fontSize: 15,
    background: 'transparent',
    color: '#1A1A1A',
    border: 'none',
    outline: 'none',
    width: '100%',
    minWidth: 0,
  },
  phonePrefix: {
    fontSize: 14,
    fontWeight: 600,
    color: '#6B7280',
    marginRight: 8,
  },
  hintText: {
    fontSize: 11,
    color: '#6B7280',
    marginLeft: 4,
    marginTop: 2,
  },
  errorBox: {
    padding: 12,
    background: '#FEE2E2',
    color: '#991B1B',
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 500,
    textAlign: 'center',
  },
  footer: {
    paddingTop: 24,
  },
  primaryButton: {
    width: '100%',
    padding: 16,
    background: '#138864',
    color: 'white',
    borderRadius: 999,
    fontSize: 15,
    fontWeight: 700,
    boxShadow: '0 6px 16px rgba(19, 136, 100, 0.3)',
  },
}

export default Profile
