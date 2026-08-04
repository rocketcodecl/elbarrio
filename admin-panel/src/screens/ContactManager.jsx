import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase.js'

const LABELS = { new: 'Nueva', in_progress: 'En gestión', resolved: 'Resuelta' }
const dateLabel = value => new Date(value).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' })

export default function ContactManager() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')
  const [changing, setChanging] = useState('')

  const load = async () => {
    setLoading(true); setError('')
    const { data, error: loadError } = await supabase.rpc('admin_list_contact_requests')
    setLoading(false)
    if (loadError) { setError(`No fue posible cargar las consultas: ${loadError.message}`); return }
    setItems(data || [])
  }

  useEffect(() => { const timer = window.setTimeout(load, 0); return () => window.clearTimeout(timer) }, [])

  const visible = useMemo(() => filter === 'all' ? items : items.filter(item => item.status === filter), [filter, items])
  const changeStatus = async (id, status) => {
    setChanging(id); setError('')
    const { error: updateError } = await supabase.rpc('admin_update_contact_request_status', { p_id: id, p_status: status })
    setChanging('')
    if (updateError) { setError(`No fue posible actualizar la consulta: ${updateError.message}`); return }
    setItems(current => current.map(item => item.id === id ? { ...item, status } : item))
  }

  return <section className="contact-manager">
    <header className="page-heading">
      <div><p className="eyebrow">Atención y oportunidades</p><h1>Consultas</h1><p>Mensajes enviados desde Contáctanos, publicidad y destacados.</p></div>
      <span className="date-pill">{items.filter(item => item.status === 'new').length} nuevas</span>
    </header>
    {error && <div className="admin-message error">{error}</div>}
    <div className="contact-filters">
      {[['all','Todas'],['new','Nuevas'],['in_progress','En gestión'],['resolved','Resueltas']].map(([value,label])=><button key={value} className={filter===value?'is-active':''} onClick={()=>setFilter(value)}>{label}</button>)}
      <button className="contact-refresh" onClick={load} disabled={loading}>{loading?'Cargando…':'Actualizar'}</button>
    </div>
    <div className="contact-list">
      {!loading && visible.map(item => <article className="contact-card" key={item.id}>
        <div className="contact-card-top"><span className={`contact-status is-${item.status}`}>{LABELS[item.status] || item.status}</span><time>{dateLabel(item.created_at)}</time></div>
        <p className="contact-reason">{item.reason}</p><h2>{item.name}</h2>
        <a href={`mailto:${item.email}`}>{item.email}</a><p className="contact-message">{item.message}</p>
        <div className="contact-actions">
          <a href={`mailto:${item.email}?subject=${encodeURIComponent(`Respuesta de El Barrio: ${item.reason}`)}`}>Responder por correo</a>
          <select value={item.status} disabled={changing===item.id} onChange={event=>changeStatus(item.id,event.target.value)}><option value="new">Nueva</option><option value="in_progress">En gestión</option><option value="resolved">Resuelta</option></select>
        </div>
      </article>)}
      {loading&&<p className="contact-empty">Cargando consultas…</p>}
      {!loading&&visible.length===0&&<p className="contact-empty">No hay consultas en esta categoría.</p>}
    </div>
  </section>
}
