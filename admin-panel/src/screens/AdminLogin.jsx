import { useState } from 'react'
import { supabase } from '../lib/supabase.js'

export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')

    const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (signInError) setError('El correo o la contraseña no son correctos.')
    setSubmitting(false)
  }

  return (
    <main className="login-page">
      <section className="login-story">
        <div className="login-brand"><span>EB</span> El Barrio</div>
        <div className="login-message">
          <p className="eyebrow eyebrow-light">Administración</p>
          <h1>Todo tu barrio,<br />en un solo lugar.</h1>
          <p>Gestiona comercios, contenidos y comunidad desde una herramienta diseñada para trabajar cómodamente.</p>
        </div>
        <div className="login-note">🔐 Acceso exclusivo para administradores autorizados</div>
      </section>

      <section className="login-form-panel">
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="mobile-brand"><span>EB</span> El Barrio</div>
          <p className="eyebrow">Bienvenido</p>
          <h2>Ingresa al panel</h2>
          <p className="form-intro">Utiliza la misma cuenta administrativa registrada en El Barrio.</p>

          <label>
            Correo electrónico
            <input type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="tu@correo.cl" autoComplete="email" required />
          </label>
          <label>
            Contraseña
            <input type="password" value={password} onChange={event => setPassword(event.target.value)} placeholder="Tu contraseña" autoComplete="current-password" required />
          </label>

          {error && <div className="form-error" role="alert">{error}</div>}

          <button className="button button-primary" type="submit" disabled={submitting}>
            {submitting ? 'Ingresando…' : 'Ingresar al panel'}
          </button>
          <small className="login-help">Si no tienes acceso, solicita autorización al administrador principal.</small>
        </form>
      </section>
    </main>
  )
}
