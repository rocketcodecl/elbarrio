import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase.js'

const bytes = value => {
  const amount = Number(value) || 0
  if (amount < 1024) return `${amount} B`
  if (amount < 1024 ** 2) return `${(amount / 1024).toFixed(1)} KB`
  if (amount < 1024 ** 3) return `${(amount / 1024 ** 2).toFixed(1)} MB`
  return `${(amount / 1024 ** 3).toFixed(2)} GB`
}
const money = value => value == null ? 'No disponible' : `$${Number(value).toFixed(4)} USD`

function Status({ ok, children }) {
  return <span className={`service-status ${ok ? 'is-ok' : 'is-warning'}`}><i />{children}</span>
}

const functionErrorMessage = async (error, fallback) => {
  try {
    const payload = await error?.context?.clone?.().json()
    if (payload?.error) return payload.error
  } catch { /* Supabase no entregó cuerpo JSON */ }
  return error?.message || fallback
}

export default function UsageManager() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cleaning, setCleaning] = useState(false)
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    const { data: response, error: requestError } = await supabase.functions.invoke('admin-service-metrics', { body: {} })
    if (requestError) setError(await functionErrorMessage(requestError, 'No fue posible consultar las métricas.'))
    else setData(response)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const storage = data?.internal?.storage || {}
  const storageTotal = useMemo(() => Object.values(storage).reduce((sum, item) => sum + (Number(item?.bytes) || 0), 0), [storage])
  const cleanup = data?.internal?.cleanup || {}
  const firebase = data?.firebase || {}
  const openrouter = data?.openrouter || {}
  const resend = data?.resend || {}

  const runCleanup = async () => {
    setCleaning(true); setNotice(''); setError('')
    const { data: response, error: requestError } = await supabase.functions.invoke('cleanup-storage-assets', { body: {} })
    if (requestError) setError(await functionErrorMessage(requestError, 'No fue posible ejecutar la limpieza.'))
    else {
      setNotice(`Limpieza terminada: ${response?.deleted || 0} archivos eliminados y ${response?.failed || 0} errores.`)
      await load()
    }
    setCleaning(false)
  }

  return (
    <div className="usage-page">
      <section className="page-heading">
        <div><p className="eyebrow">Control de costos</p><h1>Uso y servicios</h1><p>Almacenamiento, automatizaciones y proveedores conectados.</p></div>
        <button className="button button-secondary" type="button" onClick={load} disabled={loading}>Actualizar</button>
      </section>

      {error && <div className="form-error">{error}</div>}
      {notice && <div className="form-success">{notice}</div>}
      {loading && !data ? <div className="panel-loading">Consultando servicios…</div> : (
        <>
          <section className="usage-summary-grid">
            <article><small>Storage registrado</small><strong>{bytes(storageTotal)}</strong><span>{Object.values(storage).reduce((sum, item) => sum + (Number(item?.files) || 0), 0)} archivos</span></article>
            <article><small>Limpieza pendiente</small><strong>{cleanup.pending ?? '—'}</strong><span>Gracia de {cleanup.grace_days || 7} días</span></article>
            <article><small>Dispositivos push</small><strong>{firebase.active_devices ?? '—'}</strong><span>{firebase.campaigns_30d ?? 0} campañas en 30 días</span></article>
            <article><small>Saldo OpenRouter</small><strong>{money(openrouter.remaining)}</strong><span>Uso total: {money(openrouter.total_usage)}</span></article>
          </section>

          <section className="usage-grid">
            <article className="usage-card">
              <div className="usage-card-heading"><div><p className="eyebrow">Supabase</p><h2>Archivos</h2></div><Status ok>Conectado</Status></div>
              <div className="storage-list">
                {['posts', 'avatars', 'commerces'].map(bucket => <div key={bucket}><span><strong>{bucket}</strong><small>{storage[bucket]?.files || 0} archivos</small></span><b>{bytes(storage[bucket]?.bytes)}</b></div>)}
              </div>
              <div className="cleanup-box"><p>Los archivos sin referencia esperan siete días antes de borrarse.</p><button className="button button-primary" type="button" onClick={runCleanup} disabled={cleaning}>{cleaning ? 'Limpiando…' : 'Ejecutar limpieza segura'}</button></div>
            </article>

            <article className="usage-card">
              <div className="usage-card-heading"><div><p className="eyebrow">Inteligencia artificial</p><h2>OpenRouter</h2></div><Status ok={openrouter.available}>{openrouter.available ? 'Disponible' : 'Sin lectura'}</Status></div>
              <dl className="service-detail"><div><dt>{openrouter.source === 'api_key' ? 'Límite de esta clave' : 'Créditos comprados'}</dt><dd>{money(openrouter.total_credits)}</dd></div><div><dt>Consumo acumulado</dt><dd>{money(openrouter.total_usage)}</dd></div><div><dt>Saldo disponible</dt><dd>{money(openrouter.remaining)}</dd></div></dl>
              {!openrouter.available && <p className="service-note">La IA puede seguir funcionando. La clave actual podría no tener permiso para leer créditos.</p>}
            </article>

            <article className="usage-card">
              <div className="usage-card-heading"><div><p className="eyebrow">Correo</p><h2>Resend</h2></div><Status ok={resend.available}>{resend.available ? 'Disponible' : 'Sin lectura'}</Status></div>
              <dl className="service-detail"><div><dt>Emails recientes</dt><dd>{resend.sampled_emails_30d ?? '—'}</dd></div><div><dt>Muestra consultada</dt><dd>Hasta {resend.sample_limit || 100}</dd></div></dl>
              <p className="service-note">Resend expone el historial de envíos, no la facturación completa en este endpoint.</p>
            </article>

            <article className="usage-card">
              <div className="usage-card-heading"><div><p className="eyebrow">Notificaciones</p><h2>Firebase</h2></div><Status ok={firebase.configured}>{firebase.configured ? 'Configurado' : 'Incompleto'}</Status></div>
              <dl className="service-detail"><div><dt>Tokens activos</dt><dd>{firebase.active_devices ?? '—'}</dd></div><div><dt>Campañas internas, 30 días</dt><dd>{firebase.campaigns_30d ?? '—'}</dd></div></dl>
              <p className="service-note">FCM no cobra por enviar mensajes. El Barrio registra envíos y errores propios; las estadísticas avanzadas de entrega requieren enlazar Firebase con BigQuery.</p>
            </article>
          </section>
        </>
      )}
    </div>
  )
}
