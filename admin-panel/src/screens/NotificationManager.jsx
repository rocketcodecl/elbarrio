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

export default function NotificationManager({ profile }) {
  const isSuperadmin = profile?.is_superadmin === true
  const [audience, setAudience] = useState('all')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [counts, setCounts] = useState({})
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [neighborhoods, setNeighborhoods] = useState([])
  const [targetNeighborhoodId, setTargetNeighborhoodId] = useState('')

  const selectedAudience = useMemo(() => AUDIENCES.find(item => item.id === audience) || AUDIENCES[0], [audience])
  const recipientCount = Number(counts[audience] || 0)

  useEffect(() => {
    if (!isSuperadmin) return
    supabase.from('neighborhoods').select('id, name, uv_code').order('name').then(({ data, error: loadError }) => {
      if (loadError) setError(`No fue posible cargar los barrios: ${loadError.message}`)
      setNeighborhoods(data || [])
    })
  }, [isSuperadmin])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    if (isSuperadmin && !targetNeighborhoodId) {
      setCounts({})
      setHistory([])
      setLoading(false)
      return
    }
    const rpcArgs = isSuperadmin ? { p_neighborhood_id: targetNeighborhoodId } : undefined
    const [countsResult, historyResult] = await Promise.all([
      supabase.rpc(
        isSuperadmin ? 'admin_super_notification_audience_counts' : 'admin_notification_audience_counts',
        rpcArgs
      ),
      supabase.rpc(
        isSuperadmin ? 'admin_super_list_notification_campaigns' : 'admin_list_notification_campaigns',
        rpcArgs
      ),
    ])
    setLoading(false)
    if (countsResult.error || historyResult.error) {
      setError(countsResult.error?.message || historyResult.error?.message || 'No fue posible cargar el módulo.')
      return
    }
    setCounts(countsResult.data || {})
    setHistory(historyResult.data || [])
  }, [isSuperadmin, targetNeighborhoodId])

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
    const rpcName = isSuperadmin
      ? 'admin_super_send_broadcast_notification'
      : 'admin_send_broadcast_notification'
    const rpcArgs = {
      ...(isSuperadmin ? { p_neighborhood_id: targetNeighborhoodId } : {}),
      p_audience: audience,
      p_title: cleanTitle,
      p_body: cleanBody,
    }
    const { data, error: sendError } = await supabase.rpc(rpcName, rpcArgs)
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
          {isSuperadmin && (
            <>
              <div className="notification-section-heading"><span>0</span><div><h2>Elige el barrio</h2><p>Cada campaña queda limitada a un solo barrio.</p></div></div>
              <label className="field">Barrio<select value={targetNeighborhoodId} onChange={event => setTargetNeighborhoodId(event.target.value)} required><option value="">Selecciona un barrio</option>{neighborhoods.map(neighborhood => <option key={neighborhood.id} value={neighborhood.id}>{neighborhood.name}{neighborhood.uv_code ? ` · UV ${neighborhood.uv_code}` : ''}</option>)}</select></label>
            </>
          )}
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
