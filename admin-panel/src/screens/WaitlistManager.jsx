import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase.js'

const dateLabel = value => value
  ? new Date(value).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' })
  : 'Sin fecha'

export default function WaitlistManager() {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    const { data, error: loadError } = await supabase.rpc('admin_list_neighborhood_waitlist')
    setLoading(false)
    if (loadError) {
      setError(`No fue posible cargar la lista: ${loadError.message}`)
      return
    }
    setEntries(data || [])
  }

  useEffect(() => {
    const timer = window.setTimeout(load, 0)
    return () => window.clearTimeout(timer)
  }, [])

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return entries
    return entries.filter(item => [item.email, item.address, item.comuna]
      .some(value => String(value || '').toLowerCase().includes(normalized)))
  }, [entries, query])

  const comunas = useMemo(() => new Set(entries.map(item => item.comuna).filter(Boolean)).size, [entries])

  return (
    <section className="waitlist-manager">
      <header className="page-heading waitlist-heading">
        <div><p className="eyebrow">Expansión territorial</p><h1>Lista de espera</h1><p>Personas que quieren recibir un aviso cuando El Barrio llegue a su zona.</p></div>
        <div className="waitlist-metrics"><span><strong>{entries.length}</strong> interesados</span><span><strong>{comunas}</strong> comunas</span></div>
      </header>

      {error && <div className="admin-message error">{error}</div>}

      <div className="waitlist-toolbar">
        <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar por comuna, dirección o email" />
        <button type="button" onClick={load} disabled={loading}>{loading ? 'Cargando…' : 'Actualizar'}</button>
      </div>

      <div className="commerce-table-wrap waitlist-table-wrap">
        <table className="commerce-table">
          <thead><tr><th>Comuna</th><th>Dirección</th><th>Email</th><th>Estado</th><th>Registro</th></tr></thead>
          <tbody>
            {!loading && filtered.map(item => (
              <tr key={item.id}>
                <td><strong>{item.comuna}</strong></td>
                <td><span className="table-address" title={item.address}>{item.address}</span></td>
                <td><a className="waitlist-email" href={`mailto:${item.email}`}>{item.email}</a></td>
                <td><span className={`table-status ${item.status === 'activated' ? 'active' : ''}`}><i />{item.status === 'notified' ? 'Avisado' : item.status === 'activated' ? 'Activado' : 'Esperando'}</span></td>
                <td>{dateLabel(item.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && <p className="waitlist-empty">Cargando lista de espera…</p>}
        {!loading && filtered.length === 0 && <p className="waitlist-empty">No hay registros que coincidan con la búsqueda.</p>}
      </div>
    </section>
  )
}
