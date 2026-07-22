import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

const EMPTY = { name: '', description: '', price: '', unit_label: '', image_url: '', is_available: true, is_featured: true, sort_order: 0 }

const formatPrice = product => {
  if (product.price == null || product.price === '') return 'Precio por consultar'
  const amount = Number(product.price)
  const price = Number.isFinite(amount) ? `$${Math.round(amount).toLocaleString('es-CL')}` : 'Precio por consultar'
  return product.unit_label ? `${price} / ${product.unit_label}` : price
}

export default function ProductCatalog({ commerce, onBack }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [draft, setDraft] = useState(EMPTY)
  const [imageFile, setImageFile] = useState(null)
  const [preview, setPreview] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error: loadError } = await supabase.from('commerce_products').select('*').eq('commerce_id', commerce.id).order('is_featured', { ascending: false }).order('sort_order').order('created_at', { ascending: false })
    setProducts(loadError ? [] : (data || []))
    if (loadError) setError('No fue posible cargar los productos.')
    setLoading(false)
  }, [commerce.id])

  useEffect(() => { load() }, [load])
  useEffect(() => () => { if (preview.startsWith('blob:')) URL.revokeObjectURL(preview) }, [preview])

  const showNotice = message => { setNotice(message); window.setTimeout(() => setNotice(''), 2400) }
  const openCreate = () => { setEditing(null); setDraft(EMPTY); setImageFile(null); setPreview(''); setEditorOpen(true) }
  const openEdit = product => {
    setEditing(product)
    setDraft({ name: product.name || '', description: product.description || '', price: product.price ?? '', unit_label: product.unit_label || '', image_url: product.image_url || '', is_available: product.is_available !== false, is_featured: product.is_featured !== false, sort_order: product.sort_order || 0 })
    setImageFile(null); setPreview(product.image_url || ''); setEditorOpen(true)
  }
  const close = () => { if (!saving) { setEditorOpen(false); setEditing(null); setDraft(EMPTY); setImageFile(null); setPreview('') } }
  const chooseImage = event => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) { setError('Selecciona una imagen de menos de 5 MB.'); return }
    if (preview.startsWith('blob:')) URL.revokeObjectURL(preview)
    setImageFile(file); setPreview(URL.createObjectURL(file))
  }
  const upload = async () => {
    if (!imageFile) return draft.image_url || null
    const extension = (imageFile.name.split('.').pop() || 'jpg').toLowerCase()
    const path = `products/${commerce.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`
    const { error: uploadError } = await supabase.storage.from('commerces').upload(path, imageFile, { cacheControl: '3600' })
    if (uploadError) throw uploadError
    return supabase.storage.from('commerces').getPublicUrl(path).data?.publicUrl || null
  }
  const save = async event => {
    event.preventDefault()
    if (!draft.name.trim()) return
    if (draft.price !== '' && (!Number.isFinite(Number(draft.price)) || Number(draft.price) < 0)) { setError('El precio debe ser un número igual o mayor que cero.'); return }
    setSaving(true); setError('')
    try {
      const payload = { commerce_id: commerce.id, name: draft.name.trim(), description: draft.description.trim() || null, price: draft.price === '' ? null : Number(draft.price), unit_label: draft.unit_label.trim() || null, image_url: await upload(), is_available: !!draft.is_available, is_featured: !!draft.is_featured, sort_order: Math.max(0, Number.parseInt(draft.sort_order, 10) || 0) }
      const request = editing ? supabase.from('commerce_products').update(payload).eq('id', editing.id).select().single() : supabase.from('commerce_products').insert(payload).select().single()
      const { error: saveError } = await request
      if (saveError) throw saveError
      setSaving(false); setEditorOpen(false); setEditing(null); setDraft(EMPTY); setImageFile(null); setPreview('')
      await load(); showNotice(editing ? 'Producto actualizado' : 'Producto creado')
    } catch (saveError) { setSaving(false); setError(saveError?.message || 'No fue posible guardar el producto.') }
  }
  const toggle = async (product, field) => {
    const value = !product[field]
    setProducts(current => current.map(item => item.id === product.id ? { ...item, [field]: value } : item))
    const { error: toggleError } = await supabase.from('commerce_products').update({ [field]: value }).eq('id', product.id)
    if (toggleError) { await load(); setError('No fue posible actualizar el producto.') }
  }
  const remove = async product => {
    if (!window.confirm(`¿Eliminar “${product.name}”?`)) return
    const { error: removeError } = await supabase.from('commerce_products').delete().eq('id', product.id)
    if (removeError) { setError('No fue posible eliminar el producto.'); return }
    await load(); showNotice('Producto eliminado')
  }

  return (
    <div className="product-catalog-page">
      <header className="subpage-header catalog-subpage-header">
        <button className="subpage-back" type="button" onClick={onBack}>←</button>
        <div className="catalog-commerce-title"><span className="selected-commerce-logo">{commerce.logo_url ? <img src={commerce.logo_url} alt="" /> : commerce.name.slice(0, 2).toUpperCase()}</span><div><p className="eyebrow">Productos</p><h1>{commerce.name}</h1><span>Catálogo independiente del Mercado.</span></div></div>
        <button className="button button-primary product-add-button" type="button" onClick={openCreate}>＋ Nuevo producto</button>
      </header>
      {error && <div className="admin-alert"><span>⚠️</span><p>{error}</p><button type="button" onClick={() => setError('')}>×</button></div>}
      {notice && <div className="admin-toast">✓ {notice}</div>}

      <section className="catalog-surface">
        <div className="products-toolbar"><div><strong>{products.length}</strong><span>productos cargados</span></div><div className="products-legend"><span><i className="state-dot active" /> Disponible</span><span>★ Destacado</span></div></div>
        {loading && <div className="panel-loading products-loading">Cargando productos…</div>}
        {!loading && products.length === 0 && <div className="products-empty catalog-empty"><span>📦</span><h2>Aún no hay productos</h2><p>Carga el primero para mostrarlo en la ficha del comercio.</p><button className="button button-secondary" type="button" onClick={openCreate}>Crear primer producto</button></div>}
        {!loading && products.length > 0 && <div className="admin-products-grid catalog-products-grid">{products.map(product => <article className={`admin-product-card ${!product.is_available ? 'is-unavailable' : ''}`} key={product.id}><div className="admin-product-image">{product.image_url ? <img src={product.image_url} alt={product.name} /> : <span>📦</span>}<div className="admin-product-badges">{product.is_featured && <span className="feature-badge">★ Destacado</span>}{!product.is_available && <span className="unavailable-badge">No disponible</span>}</div></div><div className="admin-product-body"><div><h3>{product.name}</h3><strong className="admin-product-price">{formatPrice(product)}</strong></div>{product.description && <p>{product.description}</p>}<div className="product-actions"><button type="button" onClick={() => toggle(product, 'is_available')}>{product.is_available ? 'Ocultar' : 'Activar'}</button><button type="button" onClick={() => toggle(product, 'is_featured')}>{product.is_featured ? 'Quitar ★' : 'Destacar'}</button><button type="button" onClick={() => openEdit(product)}>Editar</button><button className="danger-link" type="button" onClick={() => remove(product)}>Eliminar</button></div></div></article>)}</div>}
      </section>

      {editorOpen && <div className="admin-modal-backdrop" onMouseDown={event => event.target === event.currentTarget && close()}><form className="product-editor" onSubmit={save}><header><div><p className="eyebrow">{editing ? 'Editar producto' : 'Nuevo producto'}</p><h2>{commerce.name}</h2></div><button type="button" onClick={close}>×</button></header><div className="product-editor-scroll"><label className="product-image-picker">{preview ? <img src={preview} alt="Vista previa" /> : <span><b>📷</b><strong>Subir fotografía</strong><small>Máximo 5 MB</small></span>}<input type="file" accept="image/*" onChange={chooseImage} />{preview && <em>Cambiar fotografía</em>}</label><div className="admin-form-grid"><label className="field field-full">Nombre<input value={draft.name} onChange={event => setDraft(current => ({ ...current, name: event.target.value }))} required /></label><label className="field">Precio en CLP<input type="number" min="0" value={draft.price} onChange={event => setDraft(current => ({ ...current, price: event.target.value }))} /></label><label className="field">Unidad opcional<input value={draft.unit_label} onChange={event => setDraft(current => ({ ...current, unit_label: event.target.value }))} placeholder="Ej: 4 unidades" /></label><label className="field field-full">Descripción<textarea rows="4" value={draft.description} onChange={event => setDraft(current => ({ ...current, description: event.target.value }))} /></label><label className="field">Orden<input type="number" min="0" value={draft.sort_order} onChange={event => setDraft(current => ({ ...current, sort_order: event.target.value }))} /></label><div className="product-switches"><label><input type="checkbox" checked={draft.is_available} onChange={event => setDraft(current => ({ ...current, is_available: event.target.checked }))} />Disponible</label><label><input type="checkbox" checked={draft.is_featured} onChange={event => setDraft(current => ({ ...current, is_featured: event.target.checked }))} />Destacado</label></div></div></div><footer><button className="button button-secondary" type="button" onClick={close}>Cancelar</button><button className="button button-primary" type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Guardar producto'}</button></footer></form></div>}
    </div>
  )
}
