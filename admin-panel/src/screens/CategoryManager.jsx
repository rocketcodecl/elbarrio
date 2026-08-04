import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase.js'

const SCOPES = [
  ['marketplace', 'Mercado'],
  ['service', 'Servicios'],
  ['incident', 'Alertas'],
]

const slug = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')

export default function CategoryManager({ profile }) {
  const [scope, setScope] = useState('marketplace')
  const [rows, setRows] = useState([])
  const [editing, setEditing] = useState(null)
  const [draft, setDraft] = useState({ name: '', icon: '📌', sort_order: 100 })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    const { data, error: loadError } = await supabase.from('content_categories').select('*').order('scope').order('sort_order').order('name')
    if (loadError) setError(`No fue posible cargar las categorías: ${loadError.message}`)
    setRows(data || []); setLoading(false)
  }, [])

  useEffect(() => { Promise.resolve().then(load) }, [load])
  const visible = useMemo(() => rows.filter(item => item.scope === scope), [rows, scope])
  const reset = () => { setEditing(null); setDraft({ name: '', icon: '📌', sort_order: (visible.length + 1) * 10 }); setError('') }

  const save = async event => {
    event.preventDefault()
    const name = draft.name.trim(); const icon = draft.icon.trim() || '📌'
    if (!name) return setError('Escribe el nombre de la categoría.')
    setSaving(true); setError('')
    const payload = { name, icon, sort_order: Number(draft.sort_order) || 100 }
    const request = editing
      ? supabase.from('content_categories').update(payload).eq('id', editing.id)
      : supabase.from('content_categories').insert({ ...payload, scope, key: scope === 'marketplace' ? name : slug(name), is_active: true })
    const { error: saveError } = await request
    setSaving(false)
    if (saveError) return setError(saveError.code === '23505' ? 'Ya existe una categoría con ese nombre.' : saveError.message)
    setNotice(editing ? 'Categoría actualizada' : 'Categoría creada'); setTimeout(() => setNotice(''), 2200)
    reset(); await load()
  }

  const toggle = async item => {
    setError('')
    const { error: updateError } = await supabase.from('content_categories').update({ is_active: !item.is_active }).eq('id', item.id)
    if (updateError) return setError(updateError.message)
    await load()
  }

  if (!profile?.is_superadmin) return <div className="panel-empty"><strong>Acceso exclusivo del superadministrador</strong></div>

  return <div className="category-manager-page">
    <section className="page-heading commerce-page-heading"><div><p className="eyebrow">Configuración operativa</p><h1>Categorías</h1><p>Crea, ordena y oculta opciones sin recompilar la aplicación.</p></div></section>
    {error && <div className="admin-alert" role="alert"><span>⚠️</span><p>{error}</p><button onClick={() => setError('')}>×</button></div>}
    {notice && <div className="admin-toast">✓ {notice}</div>}
    <div className="category-scope-tabs">{SCOPES.map(([key, label]) => <button key={key} className={scope === key ? 'is-active' : ''} onClick={() => { setScope(key); reset() }}>{label}</button>)}</div>
    <section className="event-category-layout">
      <form className="event-category-form" onSubmit={save}>
        <p className="eyebrow">{editing ? 'Editar categoría' : 'Nueva categoría'}</p><h2>{editing ? editing.name : `Agregar a ${SCOPES.find(item => item[0] === scope)?.[1]}`}</h2>
        <label className="field">Nombre<input value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} maxLength="40" required /></label>
        <label className="field">Ícono<input value={draft.icon} onChange={e => setDraft(d => ({ ...d, icon: e.target.value }))} maxLength="12" placeholder="📌" /></label>
        <label className="field">Orden<input type="number" min="0" step="1" value={draft.sort_order} onChange={e => setDraft(d => ({ ...d, sort_order: e.target.value }))} /></label>
        <div className="event-category-actions"><button className="button button-primary" disabled={saving}>{saving ? 'Guardando…' : 'Guardar categoría'}</button>{editing && <button className="button button-secondary" type="button" onClick={reset}>Cancelar</button>}</div>
      </form>
      <section className="event-category-list"><div className="category-list-heading"><div><p className="eyebrow">Disponibles</p><h2>{SCOPES.find(item => item[0] === scope)?.[1]}</h2></div><span>{visible.length}</span></div>
        {loading ? <div className="panel-loading">Cargando categorías…</div> : visible.map(item => <article key={item.id} className={`event-category-row ${item.is_active ? '' : 'is-inactive'}`}><span>{item.icon}</span><div><strong>{item.name}</strong><small>{item.key} · orden {item.sort_order} · {item.is_active ? 'Visible' : 'Oculta'}</small></div><button onClick={() => { setEditing(item); setDraft({ name: item.name, icon: item.icon, sort_order: item.sort_order }) }}>Editar</button><button onClick={() => toggle(item)}>{item.is_active ? 'Ocultar' : 'Activar'}</button></article>)}
      </section>
    </section>
  </div>
}
