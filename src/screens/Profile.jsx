import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Stepper from '../components/Stepper'

// ============================================================
// MODO DESARROLLO: no se consulta una whitelist de RUTs porque
// la RPC is_rut_allowed no existe en el schema actual. El formulario
// sí valida Módulo 11 y bloquea los RUTs duplicados informados por
// la restricción única de la base de datos.
// ============================================================

function Profile({ onFinish, onBack, editMode = false }) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
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

  // ============================================================
  // Validacion REAL: algoritmo Módulo 11 chileno.
  // Calcula el digito verificador (DV) que deberia tener el RUT
  // y lo compara con el DV que ingreso la persona. Si no matchea,
  // el RUT es falso.
  // ============================================================
  const validateRut = (rutValue) => {
    const cleaned = rutValue.replace(/[^0-9kK]/g, '').toUpperCase()
    if (cleaned.length < 8) return false

    const dv = cleaned.slice(-1)
    const numbers = cleaned.slice(0, -1)

    // Multiplicaciones con secuencia 2,3,4,5,6,7 (reinicia en 2 despues de 7)
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

  useEffect(() => {
    let active = true

    const loadExistingProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !active) return

      const { data: existingProfile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, rut, phone, avatar_url')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!active) return
      if (profileError) {
        setError('No pudimos recuperar tus datos. Inténtalo nuevamente.')
        return
      }

      if (existingProfile?.full_name) {
        const nameParts = existingProfile.full_name.trim().split(/\s+/).filter(Boolean)
        setFirstName(nameParts[0] || '')
        setLastName(nameParts.slice(1).join(' '))
      }
      if (existingProfile?.rut) {
        const formattedRut = formatRut(existingProfile.rut)
        setRut(formattedRut)
        setRutValid(validateRut(formattedRut))
      }
      if (existingProfile?.phone) {
        setPhone(existingProfile.phone.replace(/\D/g, '').slice(-9))
      }
      if (existingProfile?.avatar_url) setAvatarPreview(existingProfile.avatar_url)
    }

    loadExistingProfile()
    return () => { active = false }
  }, [])

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

    if (!firstName.trim() || !lastName.trim()) {
      setError('Ingresa tu nombre y apellido')
      return
    }
    if (!editMode && !rut.trim()) {
      setError('Ingresa tu RUT')
      return
    }
    if (!editMode && !validateRut(rut)) {
      setError('El RUT ingresado no es valido. Revisa el digito verificador (el numero despues del guion).')
      return
    }
    if (phone.replace(/\D/g, '').length < 8) {
      setError('Ingresa tu telefono. Los vecinos lo necesitan para contactarte.')
      return
    }

    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No hay usuario autenticado')

      // ============================================================
      // MODO DEV: NO llamamos a is_rut_allowed (la RPC no existe
      // en el schema actual). Si en el futuro se crea, descomentar
      // este bloque y manejar el caso rutAllowed === false.
      // ============================================================
      // const { data: rutAllowed, error: rpcError } = await supabase
      //   .rpc('is_rut_allowed', { rut_input: rut })
      // if (!rpcError && rutAllowed === false) {
      //   setError('Tu RUT no esta autorizado para unirse a El Barrio.')
      //   return
      // }

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
      const fullName = [firstName, lastName]
        .map(value => value.trim())
        .filter(Boolean)
        .join(' ')
      const updateData = {
        full_name: fullName,
        phone: phone || null,
        email: user.email || null,
      }
      if (!editMode) updateData.rut = rut
      if (avatarUrl) updateData.avatar_url = avatarUrl

      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('user_id', user.id)
        .select('id')
        .maybeSingle()

      if (updateError) throw updateError
      if (!updatedProfile) throw new Error('No encontramos el perfil asociado a tu cuenta.')

      onFinish()
    } catch (err) {
      if (err.code === '23505') {
        setError('Este RUT ya está asociado a otra cuenta. Usa la cuenta anterior o ingresa un RUT diferente.')
        return
      }
      setError(err.message || 'Ocurrio un error al guardar')
    } finally {
      setLoading(false)
    }
  }

  const initials = [firstName, lastName]
    .filter(n => n.trim().length > 0)
    .map(n => n[0])
    .join('')
    .toUpperCase() || '?'

  return (
    <div style={styles.container}>
      {/* HEADER */}
      <div style={styles.header}>
        <button style={styles.backButton} onClick={onBack} aria-label="Volver">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
        </button>
        {editMode
          ? <div style={{ flex: 1, marginRight: 40, textAlign: 'center', fontSize: 16, fontWeight: 700 }}>Editar mi perfil</div>
          : <div style={{ flex: 1, marginLeft: 12 }}><Stepper currentStep={2} totalSteps={4} /></div>}
      </div>

      {/* TÍTULO */}
      <div style={styles.titleSection}>
        <h1 style={styles.title}>{editMode ? 'Tus datos' : 'Cuéntanos sobre ti'}</h1>
        <p style={styles.subtitle}>
          {editMode ? 'Mantén actualizada la información que ven tus vecinos' : 'Esta información ayuda a generar confianza con tus vecinos'}
        </p>
      </div>

      {/* FOTO DE PERFIL */}
      <div style={styles.avatarSection}>
        <div style={styles.avatarWrapper}>
          {avatarPreview ? (
            <img src={avatarPreview} alt="Avatar" style={styles.avatarImg} />
          ) : (
            <div style={styles.avatarPlaceholder}>
              {firstName ? (
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
          <label style={styles.label}>Nombre</label>
          <div style={styles.inputWrapper}>
            <input
              type="text"
              autoComplete="given-name"
              placeholder="Ej: Carlos"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              style={styles.input}
            />
          </div>
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.label}>Apellido</label>
          <div style={styles.inputWrapper}>
            <input
              type="text"
              autoComplete="family-name"
              placeholder="Ej: Mendoza"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              style={styles.input}
            />
          </div>
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.label}>
            RUT
            {rutValid === true && (
              <span style={styles.validBadge}>{editMode ? 'Identidad verificada' : '✓ Válido'}</span>
            )}
            {rutValid === false && (
              <span style={styles.invalidBadge}>✗ Inválido</span>
            )}
          </label>
          <div style={{
            ...styles.inputWrapper,
            ...(editMode ? styles.inputWrapperDisabled : {}),
            borderColor: editMode ? '#D8DDD9' : rutValid === true ? '#138864' : rutValid === false ? '#E63946' : '#E5E7EB',
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
              style={{ ...styles.input, ...(editMode ? styles.inputDisabled : {}) }}
              maxLength={12}
              disabled={editMode}
              aria-readonly={editMode}
            />
          </div>
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

        <div style={styles.privacyBox}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <span>
            Tu nombre identifica tu perfil vecinal. El RUT se usa solo para verificar tu identidad y nunca se muestra.
          </span>
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
          {loading ? 'Guardando...' : editMode ? 'Guardar cambios' : 'Continuar'}
        </button>
      </div>
    </div>
  )
}

const styles = {
  container: {
    height: '100%',
    minHeight: 0,
    background: '#FAFAF7',
    padding: '0 24px max(40px, env(safe-area-inset-bottom))',
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
    overscrollBehavior: 'contain',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 20,
  },
  backButton: {
    width: 38,
    height: 38,
    minWidth: 38,
    minHeight: 38,
    padding: 0,
    borderRadius: '50%',
    background: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    flexShrink: 0,
    color: '#1D211F',
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
  inputWrapperDisabled: { background: '#EEF1EF' },
  inputDisabled: { color: '#727A75', cursor: 'not-allowed', WebkitTextFillColor: '#727A75', opacity: 1 },
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
  privacyBox: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 9,
    padding: 12,
    color: '#0F5F48',
    background: '#EDF8F3',
    border: '1px solid #B8DFD0',
    borderRadius: 12,
    fontSize: 11,
    lineHeight: 1.45,
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
