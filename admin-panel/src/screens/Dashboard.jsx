import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

const METRICS = [
  { key: 'comercios', table: 'commerces', label: 'Comercios', icon: '🏪', tone: 'green' },
  { key: 'usuarios', table: 'profiles', label: 'Vecinos registrados', icon: '👥', tone: 'blue' },
  { key: 'incidentes', table: 'incident_reports', label: 'Incidentes', icon: '🚨', tone: 'red' },
  { key: 'farmacias', table: 'farmacias', label: 'Farmacias', icon: '💊', tone: 'orange' },
]

export default function Dashboard({ profile, onNavigate }) {
  const [counts, setCounts] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    Promise.all(METRICS.map(metric => (
      supabase.from(metric.table).select('id', { count: 'exact', head: true })
    ))).then(results => {
      if (!active) return
      const next = {}
      results.forEach((result, index) => {
        next[METRICS[index].key] = result.error ? null : result.count
      })
      setCounts(next)
      setLoading(false)
    })
    return () => { active = false }
  }, [])

  const name = (profile?.full_name || 'Administrador').split(' ')[0]

  return (
    <div className="dashboard">
      <section className="page-heading">
        <div><p className="eyebrow">Resumen general</p><h1>Buenos días, {name}</h1><p>Este es el estado actual de la comunidad.</p></div>
        <span className="date-pill">Actualizado ahora</span>
      </section>

      <section className="metrics-grid" aria-label="Métricas generales">
        {METRICS.map(metric => (
          <article className="metric-card" key={metric.key}>
            <span className={`metric-icon tone-${metric.tone}`}>{metric.icon}</span>
            <div><small>{metric.label}</small><strong>{loading ? '…' : (counts[metric.key] ?? '—')}</strong></div>
          </article>
        ))}
      </section>

      <section className="dashboard-grid">
        <article className="welcome-card">
          <span className="welcome-pattern" />
          <div>
            <p className="eyebrow eyebrow-light">Próximo paso</p>
            <h2>Comercios y productos</h2>
            <p>Centraliza la información de los negocios y carga sus productos desde el computador.</p>
            <button className="button button-light" type="button" onClick={() => onNavigate('comercios')}>Preparar módulo →</button>
          </div>
          <span className="welcome-emoji">🏪</span>
        </article>

        <article className="activity-card">
          <div className="card-heading"><div><p className="eyebrow">Estado del panel</p><h2>Base operativa</h2></div><span className="status-pill">Activa</span></div>
          <ul className="status-list">
            <li><span>✓</span><div><strong>Supabase conectado</strong><small>Usando el proyecto actual de El Barrio</small></div></li>
            <li><span>✓</span><div><strong>Acceso protegido</strong><small>Solo perfiles con rol administrador</small></div></li>
            <li><span>✓</span><div><strong>Panel independiente</strong><small>La aplicación de vecinos no fue modificada</small></div></li>
          </ul>
        </article>
      </section>
    </div>
  )
}
