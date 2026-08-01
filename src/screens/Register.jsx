import { useState } from 'react'
import { supabase } from '../lib/supabase'
import Stepper from '../components/Stepper'

const PASSWORD_RECOVERY_KEY = 'elbarrio:password-recovery-pending'

function Register({ existingAccount = false, initialEmail = '', recoveryMode = false, onFinish, onBack, onLogout, onNavigate }) {
  const [mode, setMode] = useState(recoveryMode ? 'password-update' : 'signup')
  const [email, setEmail] = useState(initialEmail)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const requestPasswordReset = async () => {
    setError('')
    setNotice('')
    if (!email.trim() || !email.includes('@')) {
      setError('Escribe el correo de tu cuenta para recuperar el acceso.')
      return
    }
    setLoading(true)
    try {
      const redirectUrl = new URL(import.meta.env.BASE_URL, window.location.origin)
      redirectUrl.pathname = `${redirectUrl.pathname.replace(/\/$/, '')}/recovery`
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: redirectUrl.toString(),
      })
      if (resetError) throw resetError
      try { localStorage.setItem(PASSWORD_RECOVERY_KEY, 'true') } catch { /* la ruta sigue disponible */ }
      setNotice('Si te registraste con contraseña, revisa tu correo.\nSi te registraste con Google, ingresa con tu cuenta de Google.')
    } catch (err) {
      setError(err.message || 'No pudimos enviar el correo de recuperación.')
    } finally {
      setLoading(false)
    }
  }

  const updatePassword = async () => {
    setError('')
    setNotice('')
    if (password.length < 8) {
      setError('La nueva contraseña debe tener al menos 8 caracteres.')
      return
    }
    setLoading(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError
      try { localStorage.removeItem(PASSWORD_RECOVERY_KEY) } catch { /* no bloquea el cierre */ }
      const baseUrl = new URL(import.meta.env.BASE_URL, window.location.origin)
      window.history.replaceState({}, '', `${baseUrl.pathname}${baseUrl.search}`)
      setNotice('Contraseña actualizada correctamente.')
      window.setTimeout(() => onFinish(), 700)
    } catch (err) {
      setError(err.message || 'El enlace venció o no pudimos actualizar tu contraseña.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    setError('')

    if (recoveryMode || mode === 'password-update') {
      await updatePassword()
      return
    }

    if (existingAccount) {
      onFinish()
      return
    }

    if (!email.trim() || !email.includes('@')) {
      setError('Ingresa un email válido')
      return
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    setLoading(true)

    try {
      if (mode === 'signup') {
        const { error: authError } = await supabase.auth.signUp({
          email,
          password,
        })

        if (authError) throw authError

        // El perfil se crea solo, con el trigger de Supabase (on_auth_user_created).
        // No hay que insertarlo acá: duplicaba el perfil y rompía el UNIQUE de user_id.

        onFinish()
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (authError) throw authError
        try { localStorage.removeItem(PASSWORD_RECOVERY_KEY) } catch { /* no bloquea el acceso */ }
        onFinish()
      }
    } catch (err) {
      setError(err.message || 'Ocurrió un error')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setError('')
    setLoading(true)
    try {
      try { localStorage.removeItem(PASSWORD_RECOVERY_KEY) } catch { /* no bloquea Google */ }
      const redirectTo = new URL(import.meta.env.BASE_URL, window.location.origin).toString()
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
        },
      })
      if (authError) throw authError
    } catch (err) {
      setError(err.message || 'No pudimos conectar con Google. Inténtalo nuevamente.')
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      {/* HEADER: back + stepper */}
      <div style={styles.header}>
        <button style={styles.backButton} onClick={onBack}>
          <span style={{ fontSize: 18 }}>←</span>
        </button>
        <div style={{ flex: 1, marginLeft: 12 }}>
          <Stepper currentStep={1} totalSteps={4} />
        </div>
      </div>

      {/* LOGO */}
      <div style={styles.logoSection}>
        <div style={styles.logoBox}>
          <svg width="30" height="30" viewBox="0 0 100 100" fill="none">
            <circle cx="30" cy="25" r="7" fill="white" />
            <circle cx="70" cy="25" r="7" fill="white" />
            <path
              d="M18 45 L18 78 L38 78 L38 60 Q38 55 43 55 L57 55 Q62 55 62 60 L62 78 L82 78 L82 45 Q82 38 75 38 L25 38 Q18 38 18 45 Z"
              fill="white"
            />
          </svg>
        </div>
      </div>

      {/* TÍTULO */}
      <div style={styles.titleSection}>
        <h1 style={styles.title}>
          {recoveryMode ? 'Crea una nueva contraseña' : existingAccount ? 'Tu cuenta está creada' : mode === 'signup' ? 'Únete a tu barrio' : '¡Bienvenido de vuelta!'}
        </h1>
        <p style={styles.subtitle}>
          {recoveryMode
            ? 'Usa al menos 8 caracteres y guárdala en un lugar seguro'
            : existingAccount
            ? 'Este es el correo asociado a tu registro'
            : mode === 'signup'
            ? 'Crea tu cuenta para conectar con tu comunidad'
            : 'Ingresa a tu cuenta para continuar'}
        </p>
      </div>

      {/* TABS */}
      {!existingAccount && !recoveryMode && <div style={styles.tabs}>
        <button
          onClick={() => { setMode('signup'); setError('') }}
          style={{
            ...styles.tab,
            ...(mode === 'signup' ? styles.tabActive : {}),
          }}
        >
          Crear cuenta
        </button>
        <button
          onClick={() => { setMode('login'); setError('') }}
          style={{
            ...styles.tab,
            ...(mode === 'login' ? styles.tabActive : {}),
          }}
        >
          Iniciar sesión
        </button>
      </div>}

      {/* FORMULARIO */}
      <div style={styles.form}>
        {!recoveryMode && <div style={styles.inputGroup}>
          <label style={styles.label}>Email</label>
          <div style={styles.inputWrapper}>
            <span style={styles.inputIcon}>✉️</span>
            <input
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={existingAccount}
              style={styles.input}
            />
          </div>
        </div>}

        {(!existingAccount || recoveryMode) && <div style={styles.inputGroup}>
          <label style={styles.label}>Contraseña</label>
          <div style={styles.inputWrapper}>
            <span style={styles.inputIcon}>🔒</span>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder={recoveryMode ? 'Mínimo 8 caracteres' : 'Mínimo 6 caracteres'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
            />
            <button
              onClick={() => setShowPassword(!showPassword)}
              style={styles.eyeButton}
              type="button"
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>
        </div>}

        {!existingAccount && mode === 'login' && (
          <button type="button" style={styles.forgotPassword} onClick={requestPasswordReset} disabled={loading}>
            ¿Olvidaste tu contraseña?
          </button>
        )}

        {error && (
          <div style={styles.errorBox}>
            ⚠️ {error}
          </div>
        )}

        {notice && <div style={styles.noticeBox}>{notice}</div>}

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            ...styles.primaryButton,
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading
            ? 'Cargando...'
            : recoveryMode
            ? 'Guardar nueva contraseña'
            : existingAccount
            ? 'Continuar'
            : mode === 'signup'
            ? 'Continuar'
            : 'Iniciar sesión'}
        </button>

        {existingAccount && (
          <button type="button" style={styles.forgotPassword} onClick={onLogout}>
            Cerrar sesión y usar otra cuenta
          </button>
        )}
      </div>

      {/* GOOGLE LOGIN */}
      {!existingAccount && !recoveryMode && <div style={styles.googleSection}>
        <div style={styles.divider}>
          <div style={styles.dividerLine} />
          <span style={styles.dividerText}>o continúa con</span>
          <div style={styles.dividerLine} />
        </div>

        <button type="button" style={styles.googleButton} onClick={handleGoogleLogin} disabled={loading}>
          <GoogleIcon />
          <span>{loading ? 'Conectando con Google…' : 'Continuar con Google'}</span>
        </button>

        <p style={styles.terms}>
          Al continuar aceptas nuestros{' '}
          <button type="button" style={styles.termsLink} onClick={() => onNavigate?.('terms')}>Términos y Condiciones</button> y{' '}
          <button type="button" style={styles.termsLink} onClick={() => onNavigate?.('privacy')}>Política de Privacidad</button>
        </p>
      </div>}
    </div>
  )
}

// LOGO DE GOOGLE CON COLORES OFICIALES
function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
      <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
      <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
      <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
    </svg>
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
  logoSection: {
    display: 'flex',
    justifyContent: 'center',
    paddingTop: 8,
    paddingBottom: 16,
  },
  logoBox: {
    width: 52,
    height: 52,
    background: '#138864',
    borderRadius: 14,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 6px 20px rgba(19, 136, 100, 0.25)',
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
  tabs: {
    display: 'flex',
    background: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    gap: 4,
  },
  tab: {
    flex: 1,
    padding: 10,
    fontSize: 13,
    fontWeight: 600,
    color: '#6B7280',
    borderRadius: 10,
    background: 'transparent',
    transition: 'all 0.2s',
  },
  tabActive: {
    background: 'white',
    color: '#138864',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
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
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    background: 'white',
    border: '1.5px solid #E5E7EB',
    borderRadius: 12,
    padding: '0 14px',
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
  },
  eyeButton: {
    padding: 8,
    background: 'transparent',
    fontSize: 16,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    fontSize: 12,
    fontWeight: 600,
    color: '#138864',
    padding: 4,
    background: 'transparent',
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
  noticeBox: {
    padding: 12,
    background: '#F3F4F6',
    color: '#4B5563',
    borderRadius: 10,
    fontSize: 12,
    fontWeight: 400,
    textAlign: 'center',
    lineHeight: 1.45,
    whiteSpace: 'pre-line',
  },
  primaryButton: {
    padding: 16,
    background: '#138864',
    color: 'white',
    borderRadius: 999,
    fontSize: 15,
    fontWeight: 700,
    boxShadow: '0 6px 16px rgba(19, 136, 100, 0.3)',
    marginTop: 4,
  },
  googleSection: {
    marginTop: 20,
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    background: '#E5E7EB',
  },
  dividerText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: 500,
  },
  googleButton: {
    padding: 14,
    background: 'white',
    border: '1.5px solid #E5E7EB',
    borderRadius: 999,
    fontSize: 14,
    fontWeight: 700,
    color: '#374151',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
    transition: 'all 0.2s',
  },
  terms: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 1.5,
    marginTop: 4,
    padding: '0 10px',
  },
  termsLink: {
    color: '#138864',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'inline',
    padding: 0,
    background: 'transparent',
    fontSize: 'inherit',
  },
}

export default Register
