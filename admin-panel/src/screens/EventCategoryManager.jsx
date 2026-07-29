import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

const ICONS = ['📌', '🏛️', '🥬', '🎨', '⚽', '🎵', '🎬', '🧘', '👨‍👩‍👧', '🛍️', '🌱', '🎓', '🐾', '🚨']
const slugify = value => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

export default function EventCategoryManager({ onBack }) {
  const [categories, setCategories] = useState([])
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('📌')
  const [editing, setEditing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error: loadError } = await supabase.from('event_categories').select('*').order('sort_order').order('name')
    if (loadError) setError('No fue posible cargar las categorías. Ejecuta primero la migración de Eventos en Supabase.')
    setCategories(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])
  const reset = () => { setName(''); setIcon('📌'); setEditing(null); setError('') }

  const save = async event => {
    event.preventDefault()
    const cleanName = name.trim()
    const key = slugify(cleanName)
    if (!cleanName || !key) return setError('Escribe un nombre válido para la categoría.')
    setSaving(true)
    setError('')
    const payload = { name: cleanName, icon, key, sort_order: editing?.sort_order ?? (categories.length + 1) * 10, is_active: editing?.is_active ?? true }
    const request = editing
      ? supabase.from('event_categories').update({ name: cleanName, icon }).eq('id', editing.id)
      : supabase.from('event_categories').insert(payload)
    const { error: saveError } = await request
    setSaving(false)
    if (saveError) return setError(saveError.code === '23505' ? 'Ya existe una categoría con ese nombre.' : saveError.message || 'No fue posible guardar la categoría.')
    reset()
    load()
  }

  const toggle = async category => {
    const { error: updateError } = await supabase.from('event_categories').update({ is_active: !category.is_active }).eq('id', category.id)
    if (updateError) return setError('No fue posible actualizar la categoría.')
    setCategories(current => current.map(item => item.id === category.id ? { ...item, is_active: !item.is_active } : item))
  }

  return (
    <div className="event-category-page">
      <header className="subpage-header"><button className="subpage-back" type="button" onClick={onBack}>←</button><div><p className="eyebrow">Eventos</p><h1>Categorías</h1><span>Define los tipos de actividades que puedes publicar.</span></div></header>
      {error && <div className="admin-alert" role="alert"><span>⚠️</span><p>{error}</p><button type="button" onClick={() => setError('')}>×</button></div>}
      <section className="event-category-layout">
        <form className="event-category-form" onSubmit={save}>
          <p className="eyebrow">{editing ? 'Editar categoría' : 'Nueva categoría'}</p>
          <h2>{editing ? 'Actualiza el nombre o ícono' : 'Crea una categoría'}</h2>
          <label className="field">Nombre<input value={name} onChange={e => setName(e.target.value)} maxLength="32" placeholder="Ej: Música y cultura" required /></label>
          <span className="category-icon-label">Elige un ícono</span>
          <div className="category-icon-picker">{ICONS.map(item => <button type="button" key={item} className={icon === item ? 'is-selected' : ''} onClick={() => setIcon(item)}>{item}</button>)}</div>
          <div className="event-category-actions"><button className="button button-primary" type="submit" disabled={saving}>{saving ? 'Guardando…' : editing ? 'Guardar categoría' : 'Crear categoría'}</button>{editing && <button className="button button-secondary" type="button" onClick={reset}>Cancelar</button>}</div>
        </form>
        <section className="event-category-list"><div className="category-list-heading"><div><p className="eyebrow">Disponibles</p><h2>Categorías de eventos</h2></div><span>{categories.length}</span></div>{loading ? <div className="panel-loading">Cargando categorías…</div> : categories.map(category => <article key={category.id} className={`event-category-row ${category.is_active ? '' : 'is-inactive'}`}><span>{category.icon}</span><div><strong>{category.name}</strong><small>{category.key} · {category.is_active ? 'Visible' : 'Oculta'}</small></div><button type="button" onClick={() => { setEditing(category); setName(category.name); setIcon(category.icon); setError('') }}>Editar</button><button type="button" onClick={() => toggle(category)}>{category.is_active ? 'Ocultar' : 'Activar'}</button></article>)}</section>
      </section>
    </div>
  )
}
