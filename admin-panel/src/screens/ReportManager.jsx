import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase.js'

const REASONS = {
  spam: 'Spam', fraude: 'Fraude', acoso: 'Acoso', ilegal: 'Contenido ilegal',
  informacion_falsa: 'Información falsa', privacidad: 'Privacidad', otro: 'Otro',
}

const CONTENT = {
  post: 'Publicación', incident: 'Alerta', comment: 'Comentario',
  commerce_review: 'Opinión de comercio', service_review: 'Opinión de servicio', profile: 'Perfil',
}

const dateLabel = value => new Date(value).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' })

export default function ReportManager({ onNavigate }) {
  const [reports, setReports] = useState([])
  const [filter, setFilter] = useState('pending')
  const [loading, setLoading] = useState(true)
  const [changing, setChanging] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    const { data, error: loadError } = await supabase.rpc('admin_list_content_reports')
    if (loadError) setError(`No fue posible cargar los reportes: ${loadError.message}`)
    setReports(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const visible = useMemo(() => reports.filter(report => filter === 'all' || report.status === filter), [filter, reports])

  const resolve = async (report, status) => {
    const note = window.prompt(status === 'dismissed' ? 'Motivo para descartar el reporte:' : 'Acción o conclusión de la revisión:')
    if (note === null) return
    if (note.trim().length < 3) return setError('Registra una nota de al menos 3 caracteres.')
    setChanging(report.id); setError('')
    const { error: saveError } = await supabase.rpc('admin_resolve_content_report', {
      p_report_id: report.id, p_status: status, p_note: note.trim(),
    })
    setChanging('')
    if (saveError) return setError(`No fue posible resolver el reporte: ${saveError.message}`)
    await load()
  }

  return <div className="report-manager">
    <section className="page-heading commerce-page-heading"><div><p className="eyebrow">Confianza y seguridad</p><h1>Reportes de vecinos</h1><p>Revisa contenido señalado y deja cada decisión registrada.</p></div><div className="user-metrics"><span><strong>{reports.filter(item => item.status === 'pending').length}</strong>Pendientes</span><span><strong>{reports.length}</strong>Total</span></div></section>
    {error && <div className="admin-alert" role="alert"><span>⚠️</span><p>{error}</p><button type="button" onClick={() => setError('')}>×</button></div>}
    <div className="filter-row report-filters">{[['pending', 'Pendientes'], ['actioned', 'Con acción'], ['dismissed', 'Descartados'], ['all', 'Todos']].map(([value, label]) => <button key={value} type="button" className={filter === value ? 'is-active' : ''} onClick={() => setFilter(value)}>{label}</button>)}<button type="button" onClick={load}>Actualizar</button></div>
    {loading && <div className="panel-loading">Cargando reportes…</div>}
    {!loading && visible.length === 0 && <div className="panel-empty"><span>✓</span><strong>No hay reportes en este estado</strong><small>La bandeja está al día.</small></div>}
    {!loading && visible.length > 0 && <div className="report-grid">{visible.map(report => <article className="report-card" key={report.id}>
      <header><span>{CONTENT[report.content_type] || report.content_type}</span><small>{dateLabel(report.created_at)}</small></header>
      <h2>{REASONS[report.reason] || report.reason}</h2>
      <p>{report.details || 'El vecino no agregó detalles.'}</p>
      <dl><div><dt>Reportado por</dt><dd>{report.reporter_name || 'Vecino'}</dd></div><div><dt>ID del contenido</dt><dd>{report.content_id}</dd></div></dl>
      {report.status === 'pending' ? <footer><button type="button" onClick={() => onNavigate?.(report.content_type === 'incident' ? 'incidentes' : report.content_type === 'profile' ? 'usuarios' : ['comment', 'commerce_review', 'service_review'].includes(report.content_type) ? 'contenido-usuarios' : 'publicaciones')}>Abrir moderación</button><button type="button" disabled={changing === report.id} onClick={() => resolve(report, 'dismissed')}>Descartar</button><button className="button-primary" type="button" disabled={changing === report.id} onClick={() => resolve(report, 'actioned')}>{changing === report.id ? 'Guardando…' : 'Marcar acción tomada'}</button></footer> : <span className={`report-state ${report.status}`}>{report.status === 'actioned' ? 'Acción tomada' : report.status === 'dismissed' ? 'Descartado' : 'Revisado'}</span>}
    </article>)}</div>}
  </div>
}
