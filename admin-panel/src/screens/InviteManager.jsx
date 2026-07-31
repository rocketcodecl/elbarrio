import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase.js'

export default function InviteManager() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    const { data, error: loadError } = await supabase.rpc('admin_list_neighbor_invite_metrics')
    setLoading(false)
    if (loadError) {
      setError(`No fue posible cargar invitaciones: ${loadError.message}`)
      return
    }
    setRows(data || [])
  }

  useEffect(() => {
    const timer = window.setTimeout(load, 0)
    return () => window.clearTimeout(timer)
  }, [])

  const totals = useMemo(() => rows.reduce((result, row) => ({
    started: result.started + Number(row.started_count || 0),
    verified: result.verified + Number(row.verified_count || 0),
    connectors: result.connectors + Number(row.connector_count || 0),
  }), { started: 0, verified: 0, connectors: 0 }), [rows])
  const conversion = totals.started + totals.verified
    ? Math.round((totals.verified / (totals.started + totals.verified)) * 100)
    : 0

  return (
    <section className="invite-manager">
      <header className="page-heading invite-admin-heading">
        <div><p className="eyebrow">Crecimiento orgánico</p><h1>Invitaciones</h1><p>Mide vecinos que comenzaron y completaron la verificación territorial.</p></div>
        <button className="button button-secondary" type="button" onClick={load} disabled={loading}>{loading ? 'Actualizando…' : 'Actualizar'}</button>
      </header>
      {error && <div className="admin-message error">{error}</div>}
      <div className="invite-admin-metrics">
        <article><span>En proceso</span><strong>{totals.started}</strong><small>registros iniciados</small></article>
        <article><span>Verificados</span><strong>{totals.verified}</strong><small>vecinos incorporados</small></article>
        <article><span>Conversión</span><strong>{conversion}%</strong><small>de inicio a verificación</small></article>
        <article><span>Conectores</span><strong>{totals.connectors}</strong><small>insignias obtenidas</small></article>
      </div>
      <div className="commerce-table-wrap invite-admin-table">
        <table className="commerce-table">
          <thead><tr><th>Barrio</th><th>En proceso</th><th>Verificados</th><th>Conectores</th><th>Conversión</th></tr></thead>
          <tbody>{rows.map(row => {
            const total = Number(row.started_count || 0) + Number(row.verified_count || 0)
            const rowConversion = total ? Math.round((Number(row.verified_count || 0) / total) * 100) : 0
            return <tr key={row.neighborhood_id}><td><strong>{row.neighborhood_name}</strong></td><td>{row.started_count}</td><td>{row.verified_count}</td><td>{row.connector_count}</td><td><span className="invite-conversion">{rowConversion}%</span></td></tr>
          })}</tbody>
        </table>
        {!loading && rows.length === 0 && !error && <p className="waitlist-empty">Todavía no hay actividad de invitaciones.</p>}
      </div>
    </section>
  )
}
