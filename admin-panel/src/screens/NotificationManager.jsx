import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase.js'

const AUDIENCES = [
  { id: 'all', icon: '🏘️', name: 'Todo el barrio', description: 'Todos los perfiles activos del barrio.' },
  { id: 'verified', icon: '✅', name: 'Vecinos verificados', description: 'Solo perfiles cuya identidad ya fue verificada.' },
  { id: 'commerces', icon: '🏪', name: 'Comercios', description: 'Perfiles comerciales o dueños de un comercio.' },
  { id: 'actors', icon: '📣', name: 'Actores autorizados', description: 'Juntas, municipalidades y actores habilitados.' },
]

const dateLabel = value => value
  ? new Date(value).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' })
  : 'Sin fecha'

export default function NotificationManager() {
  const [audience, setAudience] = useState('all')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [counts, setCounts] = useState({})
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const selectedAudience = useMemo(() => AUDIENCES.find(item => item.id === audience) || AUDIENCES[0], [audience])
  const recipientCount = Number(counts[audience] || 0)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    const [countsResult, historyResult] = await Promise.all([
      supabase.rpc('admin_notification_audience_counts'),
      supabase.rpc('admin_list_notification_campaigns'),
    ])
    setLoading(false)
    if (countsResult.error || historyResult.error) {
      setError(countsResult.error?.message || historyResult.error?.message || 'No fue posible cargar el módulo.')
      return
    }
    setCounts(countsResult.data || {})
    setHistory(historyResult.data || [])
  }, [])

  useEffect(() => { load() }, [load])

  const send = async event => {
    event.preventDefault()
    const cleanTitle = title.trim()
    const cleanBody = body.trim()
    setError('')
    setNotice('')
    if (cleanTitle.length < 3 || cleanBody.length < 3) return setError('Escribe un título y un mensaje claros antes de enviar.')
    if (!recipientCount) return setError('Esta audiencia no tiene destinatarios activos.')
    if (!window.confirm(`¿Enviar esta notificación a ${recipientCount} ${recipientCount === 1 ? 'persona' : 'personas'} de “${selectedAudience.name}”?`)) return

    setSending(true)
    const { data, error: sendError } = await supabase.rpc('admin_send_broadcast_notification', { p_audience: audience, p_title: cleanTitle, p_body: cleanBody })
    setSending(false)
    if (sendError) return setError(`No fue posible enviar la notificación: ${sendError.message}`)
    const sent = Number(data?.recipient_count ?? recipientCount)
    setTitle('')
    setBody('')
    await load()
    setNotice(`Notificación enviada correctamente a ${sent} ${sent === 1 ? 'persona' : 'personas'}.`)
  }

  return (
    <div className="notification-manager">
      <header className="page-heading notification-heading">
        <div><p className="eyebrow">Comunicación directa</p><h1>Notificaciones</h1><p>Envía información importante a una audiencia concreta del barrio.</p></div>
        <div className="notification-total"><strong>{counts.all || 0}</strong><span>perfiles activos</span></div>
      </header>
      {error && <div className="admin-message error">{error}</div>}
      {notice && <div className="admin-message success">{notice}</div>}

      <div className="notification-layout">
        <form className="notification-compose" onSubmit={send}>
          <div className="notification-section-heading"><span>1</span><div><h2>Elige la audiencia</h2><p>Solo recibirán el mensaje los perfiles que cumplan este criterio.</p></div></div>
          <div className="audience-grid">
            {AUDIENCES.map(item => <button key={item.id} className={`audience-card ${audience === item.id ? 'is-selected' : ''}`} type="button" onClick={() => setAudience(item.id)}>
              <span className="audience-icon">{item.icon}</span><span className="audience-copy"><strong>{item.name}</strong><small>{item.description}</small></span><b>{loading ? '…' : counts[item.id] || 0}</b>
            </button>)}
          </div>

          <div className="notification-section-heading"><span>2</span><div><h2>Escribe el mensaje</h2><p>Se mostrará dentro de la campana de notificaciones de la aplicación.</p></div></div>
          <div className="notification-fields">
            <label>Título <input value={title} maxLength={90} onChange={event => setTitle(event.target.value)} placeholder="Ej.: Corte programado de agua" /></label>
            <label>Mensaje <textarea value={body} maxLength={300} rows={5} onChange={event => setBody(event.target.value)} placeholder="Explica la información de forma breve y clara…" /></label>
            <div className="notification-send-summary"><span>🔔</span><div><strong>{selectedAudience.name}</strong><small>{recipientCount} {recipientCount === 1 ? 'destinatario' : 'destinatarios'}</small></div><button type="submit" disabled={sending || loading || !recipientCount}>{sending ? 'Enviando…' : 'Revisar y enviar'}</button></div>
          </div>
        </form>

        <aside className="notification-history">
          <div className="notification-history-heading"><div><p className="eyebrow">Registro</p><h2>Últimos envíos</h2></div><button type="button" onClick={load} disabled={loading}>↻</button></div>
          {loading && <p className="notification-empty">Cargando historial…</p>}
          {!loading && history.length === 0 && <p className="notification-empty">Aún no se han realizado envíos masivos.</p>}
          {!loading && history.map(item => {
            const audienceInfo = AUDIENCES.find(option => option.id === item.audience)
            return <article className="notification-history-item" key={item.id}><div><span>{audienceInfo?.icon || '🔔'}</span><small>{dateLabel(item.created_at)}</small></div><h3>{item.title}</h3><p>{item.body}</p><footer><strong>{item.recipient_count} enviados</strong><span>{audienceInfo?.name || item.audience}</span></footer></article>
          })}
        </aside>
      </div>
    </div>
  )
}
