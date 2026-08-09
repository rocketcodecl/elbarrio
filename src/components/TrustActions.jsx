import { useState } from 'react'
import { supabase } from '../lib/supabase'

const REASONS = [
  ['spam', 'Spam o publicidad engañosa'], ['fraude', 'Posible fraude'], ['acoso', 'Acoso o amenazas'],
  ['ilegal', 'Producto o actividad ilegal'], ['informacion_falsa', 'Información falsa'], ['privacidad', 'Expone información privada'], ['otro', 'Otro motivo'],
]

export default function TrustActions({ contentType, contentId, authorId, compact = false, onBlocked }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('spam')
  const [details, setDetails] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const report = async event => {
    event.preventDefault(); setSaving(true); setMessage('')
    const { error } = await supabase.rpc('submit_content_report', { p_content_type: contentType, p_content_id: contentId, p_reason: reason, p_details: details.trim() || null })
    setSaving(false)
    if (error) return setMessage(error.message || 'No pudimos enviar el reporte.')
    setMessage('Reporte enviado. Lo revisaremos sin avisar al autor.')
    window.setTimeout(() => setOpen(false), 1500)
  }

  const block = async () => {
    if (!authorId || !window.confirm('Dejarás de ver contenido de esta persona. ¿Bloquear?')) return
    setSaving(true)
    const { data: auth } = await supabase.auth.getUser()
    const { data: me } = await supabase.from('profiles').select('id').eq('user_id', auth?.user?.id).maybeSingle()
    const { error } = me ? await supabase.from('user_blocks').upsert({ blocker_id: me.id, blocked_id: authorId }) : { error: new Error('No encontramos tu perfil.') }
    setSaving(false)
    if (error) return setMessage(error.message)
    setOpen(false); onBlocked?.(authorId)
  }

  return <>
    <button type="button" className={`trust-more-button ${compact ? 'is-compact' : ''}`} onClick={() => setOpen(true)} aria-label="Seguridad y reporte">•••</button>
    {open && <div className="trust-modal-backdrop" onClick={() => !saving && setOpen(false)}><section className="trust-modal" onClick={event => event.stopPropagation()}>
      <header><div><small>CONVIVENCIA SEGURA</small><h2>Reportar contenido</h2></div><button type="button" onClick={() => setOpen(false)}>×</button></header>
      <form onSubmit={report}><label>¿Qué ocurre?<select value={reason} onChange={event => setReason(event.target.value)}>{REASONS.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Cuéntanos un poco más <span>(opcional)</span><textarea rows="3" value={details} onChange={event => setDetails(event.target.value)} placeholder="No compartas información sensible." /></label>{message && <p>{message}</p>}<button className="trust-report-submit" disabled={saving}>{saving ? 'Enviando…' : 'Enviar reporte'}</button>{authorId && <button className="trust-block-button" type="button" disabled={saving} onClick={block}>Bloquear a esta persona</button>}</form>
    </section></div>}
  </>
}

const CSS=`.trust-more-button{width:34px;height:34px;border:1px solid #dce5df;border-radius:50%;background:#fff;color:#65736a;font-size:15px;letter-spacing:1px}.trust-more-button.is-compact{width:30px;height:30px}.trust-modal-backdrop{position:absolute;inset:0;z-index:500;display:flex;align-items:flex-end;background:rgba(12,25,18,.38);backdrop-filter:blur(2px)}.trust-modal{width:100%;padding:18px 18px calc(20px + env(safe-area-inset-bottom));border-radius:22px 22px 0 0;background:#fff}.trust-modal header{display:flex;align-items:flex-start;justify-content:space-between}.trust-modal header small{color:#14865f;font-size:9px;font-weight:800}.trust-modal h2{margin:3px 0 15px;font-size:19px}.trust-modal header button{width:34px;height:34px;border:1px solid #dce5df;border-radius:50%;background:#fff;font-size:20px}.trust-modal form,.trust-modal label{display:grid;gap:7px}.trust-modal form{gap:13px}.trust-modal label{color:#35443a;font-size:11px;font-weight:700}.trust-modal label span{color:#879087;font-weight:500}.trust-modal select,.trust-modal textarea{width:100%;padding:11px;border:1px solid #d7e1da;border-radius:11px;background:#fff;font:inherit;box-sizing:border-box}.trust-modal form p{margin:0;padding:9px;border-radius:9px;background:#eaf8f2;color:#126d4c;font-size:11px}.trust-report-submit,.trust-block-button{min-height:44px;border-radius:12px;font-weight:800}.trust-report-submit{border:0;background:#1b9e75;color:#fff}.trust-block-button{border:1px solid #ffd0d4;background:#fff5f6;color:#c12835}`
if(typeof document!=='undefined'&&!document.getElementById('trust-actions-css')){const style=document.createElement('style');style.id='trust-actions-css';style.textContent=CSS;document.head.appendChild(style)}
