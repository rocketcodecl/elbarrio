import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import NewsCategoryManager, { NEWS_CATEGORY_ICONS, newsCategoryKey } from './NewsCategoryManager.jsx'
import { prepareImageUpload } from '../../../shared/imageUpload.js'
import { normalizeHttpUrl } from '../../../shared/externalUrl.js'
import usePersistentDraft from '../hooks/usePersistentDraft.js'

const DEFAULT_CATEGORIES = [
  { key: 'general', icon: '📰', name: 'General' },
  { key: 'asamblea', icon: '🗳️', name: 'Asamblea' },
  { key: 'obras', icon: '🚧', name: 'Obras' },
  { key: 'servicios', icon: '💧', name: 'Servicios' },
  { key: 'seguridad', icon: '🚨', name: 'Seguridad' },
]

const imagesOf = news => Array.isArray(news?.images) && news.images.some(Boolean)
  ? news.images.filter(Boolean)
  : (news?.image_url ? [news.image_url] : [])
const imageOf = news => imagesOf(news)[0] || null
const dateLabel = value => value ? new Date(value).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' }) : 'Sin fecha'

const initialState = news => ({
  title: news?.title || '',
  content: news?.content || '',
  category: news?.category || 'general',
  source: news?.news_source || '',
  url: news?.news_url || '',
  images: imagesOf(news),
  isOfficial: news?.news_is_official === true,
  showInActivity: news?.show_in_activity === true,
  status: news?.status || 'active',
})

function NewsEditor({ news, profile, categories, onCategoryCreated, onBack, onSaved, onDeleted }) {
  const draftKey = `news:${profile?.id || 'admin'}:${news?.id || 'new'}`
  const draftVersion = news?.updated_at || 'new-v1'
  const [draft, setDraft, clearFormDraft] = usePersistentDraft(`${draftKey}:form`, initialState(news), draftVersion)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [showCategoryCreator, setShowCategoryCreator] = useState(false)
  const [categoryName, setCategoryName] = useState('')
  const [categoryIcon, setCategoryIcon] = useState('📰')
  const [categorySaving, setCategorySaving] = useState(false)
  const [neighborhoods, setNeighborhoods] = useState([])
  const [targetNeighborhoodId, setTargetNeighborhoodId, clearNeighborhoodDraft] = usePersistentDraft(
    `${draftKey}:neighborhood`,
    news?.neighborhood_id || (profile?.is_superadmin ? '' : profile?.neighborhood_id || ''),
    draftVersion,
  )
  const clearNewsDraft = () => { clearFormDraft(); clearNeighborhoodDraft() }
  const discardAndClose = () => { clearNewsDraft(); onBack() }
  const set = (field, value) => setDraft(current => ({ ...current, [field]: value }))

  useEffect(() => {
    if (!profile?.is_superadmin || news) return
    supabase.from('neighborhoods').select('id, name, uv_code').order('name').then(({ data, error: loadError }) => {
      if (loadError) setError(`No fue posible cargar los barrios: ${loadError.message}`)
      setNeighborhoods(data || [])
    })
  }, [news, profile?.is_superadmin])

  const createCategory = async event => {
    event.preventDefault()
    const name = categoryName.trim()
    const key = newsCategoryKey(name)
    if (!name || !key) return setError('Escribe un nombre válido para la categoría.')
    setCategorySaving(true)
    setError('')
    const { data, error: categoryError } = await supabase.from('news_categories').insert({ name, key, icon: categoryIcon, sort_order: (categories.length + 1) * 10, is_active: true }).select('key, name, icon, is_active').single()
    setCategorySaving(false)
    if (categoryError) return setError(categoryError.code === '23505' ? 'Ya existe una categoría con ese nombre.' : categoryError.message || 'No fue posible crear la categoría.')
    onCategoryCreated(data)
    set('category', data.key)
    setCategoryName('')
    setCategoryIcon('📰')
    setShowCategoryCreator(false)
  }

  const uploadImages = async event => {
    const available = Math.max(0, 8 - draft.images.length)
    const files = Array.from(event.target.files || []).slice(0, available)
    event.target.value = ''
    if (!files.length) return
    if (files.some(file => !file.type.startsWith('image/'))) return setError('Selecciona solamente imágenes válidas.')
    if (files.some(file => file.size > 5 * 1024 * 1024)) return setError('Cada imagen debe pesar menos de 5 MB.')
    setUploading(true)
    setError('')
    try {
      const uploaded = []
      for (const file of files) {
        const extension = (file.name.split('.').pop() || 'jpg').toLowerCase()
        const path = `news-${profile?.id || 'admin'}-${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`
        const prepared = await prepareImageUpload(file, path)
        const { error: uploadError } = await supabase.storage.from('posts').upload(prepared.path, prepared.file, { cacheControl: '3600', contentType: prepared.file.type })
        if (uploadError) throw uploadError
        const { data } = supabase.storage.from('posts').getPublicUrl(prepared.path)
        if (data?.publicUrl) uploaded.push(data.publicUrl)
      }
      setDraft(current => ({ ...current, images: [...current.images, ...uploaded] }))
    } catch (uploadError) {
      setError(uploadError?.message || 'No fue posible subir las imágenes.')
    } finally {
      setUploading(false)
    }
  }

  const save = async event => {
    event.preventDefault()
    if (!draft.title.trim() || !draft.content.trim()) {
      setError('Completa el título y el contenido de la noticia.')
      return
    }
    const normalizedUrl = draft.url.trim() ? normalizeHttpUrl(draft.url) : null
    if (draft.url.trim() && !normalizedUrl) {
      setError('Escribe un enlace válido, por ejemplo lascondes.cl/evento')
      return
    }
    const neighborhoodId = news?.neighborhood_id || targetNeighborhoodId
    if (!neighborhoodId) {
      setError('Selecciona el barrio donde se publicará la noticia.')
      return
    }
    const payload = {
      type: 'news',
      title: draft.title.trim(),
      content: draft.content.trim(),
      category: draft.category,
      news_source: draft.source.trim() || null,
      news_url: normalizedUrl || null,
      news_is_official: draft.isOfficial,
      show_in_activity: draft.showInActivity,
      images: draft.images.length ? draft.images : null,
      status: draft.status,
    }
    setSaving(true)
    setError('')
    const request = news
      ? supabase.from('posts').update(payload).eq('id', news.id).select().single()
      : supabase.from('posts').insert({ ...payload, author_id: profile?.id, neighborhood_id: neighborhoodId }).select().single()
    const { error: saveError } = await request
    setSaving(false)
    if (saveError) {
      setError(saveError.message || 'No fue posible guardar la noticia.')
      return
    }
    clearNewsDraft()
    onSaved()
  }

  const remove = async () => {
    if (!news || !window.confirm(`¿Eliminar “${news.title}”? Esta acción no se puede deshacer.`)) return
    setSaving(true)
    const { error: deleteError } = await supabase.from('posts').delete().eq('id', news.id).eq('type', 'news')
    setSaving(false)
    if (deleteError) return setError(deleteError.message || 'No fue posible eliminar la noticia.')
    clearNewsDraft()
    onDeleted()
  }

  return (
    <div className="news-editor-page">
      <header className="subpage-header">
        <button className="subpage-back" type="button" onClick={onBack}>←</button>
        <div><p className="eyebrow">Noticias</p><h1>{news ? 'Editar noticia' : 'Nueva noticia'}</h1><span>{news ? news.title : 'Publica información clara para los vecinos.'}</span></div>
        <div className="editor-header-actions">{news && <button className="delete-commerce-button" type="button" onClick={remove} disabled={saving}>Eliminar</button>}<button className="button button-primary" type="submit" form="news-form" disabled={saving || uploading}>{saving ? 'Guardando…' : news ? 'Guardar cambios' : 'Publicar noticia'}</button></div>
      </header>

      {error && <div className="admin-alert" role="alert"><span>⚠️</span><p>{error}</p><button type="button" onClick={() => setError('')}>×</button></div>}

      <form id="news-form" className="news-editor-form" onSubmit={save}>
        {profile?.is_superadmin && !news && (
          <section className="editor-section">
            <div className="editor-section-title"><span>0</span><div><h2>Barrio de publicación</h2><p>La noticia solo será visible para los vecinos del barrio seleccionado.</p></div></div>
            <label className="field">Barrio<select value={targetNeighborhoodId} onChange={event => setTargetNeighborhoodId(event.target.value)} required><option value="">Selecciona un barrio</option>{neighborhoods.map(neighborhood => <option key={neighborhood.id} value={neighborhood.id}>{neighborhood.name}{neighborhood.uv_code ? ` · UV ${neighborhood.uv_code}` : ''}</option>)}</select></label>
          </section>
        )}
        <section className="editor-section">
          <div className="editor-section-title"><span>1</span><div><h2>Imágenes y contenido</h2><p>La primera imagen será la portada. Puedes cargar hasta ocho.</p></div></div>
          <div className="event-cover-uploader news-cover-uploader">
            {draft.images[0] ? <img src={draft.images[0]} alt="Portada" /> : <span>📰 <strong>Subir imágenes</strong><small>Formato horizontal, máximo 5 MB cada una.</small></span>}
            <em>{draft.images.length ? 'Portada actual' : 'Sin portada'}</em>
          </div>
          <input id="news-images-input" className="news-images-input" type="file" accept="image/*" multiple onChange={uploadImages} disabled={uploading || draft.images.length >= 8} />
          <label htmlFor="news-images-input" className={`news-add-images ${uploading || draft.images.length >= 8 ? 'is-disabled' : ''}`}>{uploading ? 'Subiendo imágenes…' : draft.images.length >= 8 ? 'Máximo de 8 imágenes alcanzado' : `＋ Agregar imágenes · ${draft.images.length}/8`}</label>
          {draft.images.length > 0 && <div className="news-image-gallery">{draft.images.map((image, index) => <article key={image}><img src={image} alt={`Imagen ${index + 1}`} /><div>{index === 0 ? <strong>Portada</strong> : <button type="button" onClick={() => setDraft(current => ({ ...current, images: [image, ...current.images.filter(item => item !== image)] }))}>Usar de portada</button>}<button type="button" className="news-image-remove" onClick={() => setDraft(current => ({ ...current, images: current.images.filter(item => item !== image) }))}>Eliminar</button></div></article>)}</div>}
          <div className="admin-form-grid news-data-grid">
            <label className="field field-full">Título<input value={draft.title} onChange={event => set('title', event.target.value)} maxLength={140} placeholder="Título claro y directo" required /></label>
            <div className="field news-category-field"><label>Categoría<select value={draft.category} onChange={event => set('category', event.target.value)}>{categories.map(category => <option value={category.key} key={category.key}>{category.icon} {category.name}</option>)}</select></label><button type="button" onClick={() => setShowCategoryCreator(current => !current)}>＋ Crear categoría</button></div>
            <label className="field">Fuente <small>Opcional</small><input value={draft.source} onChange={event => set('source', event.target.value)} maxLength={100} placeholder="Ej: Municipalidad de Las Condes" /></label>
            <label className="field field-full">Fuente o enlace relacionado <small>Opcional</small><input inputMode="url" value={draft.url} onChange={event => set('url', event.target.value)} maxLength={500} placeholder="lascondes.cl/noticia" /><small>Si no agregas un enlace, la noticia se leerá íntegramente dentro de El Barrio.</small></label>
            {showCategoryCreator && <div className="news-inline-category field-full"><div><label>Nombre<input value={categoryName} onChange={event => setCategoryName(event.target.value)} maxLength="32" placeholder="Ej: Comunidad" autoFocus /></label><span>Ícono</span><div className="category-icon-picker news-icon-picker">{NEWS_CATEGORY_ICONS.map(icon => <button key={icon} type="button" className={categoryIcon === icon ? 'is-selected' : ''} onClick={() => setCategoryIcon(icon)}>{icon}</button>)}</div><label>Usar otro emoji<input value={categoryIcon} onChange={event => setCategoryIcon(event.target.value)} maxLength="12" placeholder="Pega cualquier emoji" /></label></div><footer><button type="button" className="button button-secondary" onClick={() => setShowCategoryCreator(false)}>Cancelar</button><button type="button" className="button button-primary" disabled={categorySaving} onClick={createCategory}>{categorySaving ? 'Creando…' : 'Crear y seleccionar'}</button></footer></div>}
            <label className="field field-full">Contenido<textarea value={draft.content} onChange={event => set('content', event.target.value)} rows="8" maxLength={5000} placeholder="Escribe la información completa…" required /></label>
          </div>
        </section>

        <section className="editor-section">
          <div className="editor-section-title"><span>2</span><div><h2>Publicación y alcance</h2><p>Controla dónde aparecerá esta noticia.</p></div></div>
          <div className="event-status-row"><button type="button" className={draft.status === 'active' ? 'is-selected' : ''} onClick={() => set('status', 'active')}>● Publicada</button><button type="button" className={draft.status !== 'active' ? 'is-selected' : ''} onClick={() => set('status', 'closed')}>○ Pausada</button></div>
          <div className="news-option-grid">
            <label className={`activity-feed-toggle ${draft.isOfficial ? 'is-selected is-official' : ''}`}><input type="checkbox" checked={draft.isOfficial} onChange={event => set('isOfficial', event.target.checked)} /><span>📢</span><div><strong>Noticia oficial</strong><small>Se identificará claramente como comunicación oficial.</small></div></label>
            <label className={`activity-feed-toggle ${draft.showInActivity ? 'is-selected' : ''}`}><input type="checkbox" checked={draft.showInActivity} onChange={event => set('showInActivity', event.target.checked)} /><span>📣</span><div><strong>Mostrar también en Actividad</strong><small>Aparecerá además en el feed inicial de el barrio.</small></div></label>
          </div>
        </section>

        <footer className="commerce-editor-footer"><button className="button button-secondary" type="button" onClick={discardAndClose}>Descartar borrador</button><button className="button button-primary" type="submit" disabled={saving || uploading}>{saving ? 'Guardando…' : news ? 'Guardar cambios' : 'Publicar noticia'}</button></footer>
      </form>
    </div>
  )
}

export default function NewsManager({ profile }) {
  const isSuperadmin = profile?.is_superadmin === true
  const neighborhoodId = profile?.neighborhood_id
  const [news, setNews] = useState([])
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [view, setView] = useState({ type: 'list', news: null })
  const [changingId, setChangingId] = useState(null)
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES)

  const showNotice = message => {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 2600)
  }

  const loadNews = useCallback(async () => {
    setLoading(true)
    setError('')
    if (!isSuperadmin && !neighborhoodId) {
      setNews([])
      setError('Tu cuenta administrativa no tiene un barrio asignado.')
      setLoading(false)
      return
    }
    let request = supabase.from('posts').select('*').eq('type', 'news').order('created_at', { ascending: false }).limit(300)
    if (!isSuperadmin) request = request.eq('neighborhood_id', neighborhoodId)
    const { data, error: loadError } = await request
    if (loadError) setError(loadError.message || 'No fue posible cargar las noticias.')
    setNews(data || [])
    setLoading(false)
  }, [isSuperadmin, neighborhoodId])

  // La carga remota es el sistema externo sincronizado por este efecto.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadNews() }, [loadNews])

  useEffect(() => {
    supabase.from('news_categories').select('key, name, icon, is_active').order('sort_order').then(({ data }) => {
      if (data?.length) setCategories(data.filter(category => category.is_active))
    })
  }, [view.type])

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return news.filter(item => {
      const matchesText = !normalized || [item.title, item.content, item.category, item.news_source].some(value => String(value || '').toLowerCase().includes(normalized))
      const matchesState = filter === 'all' || (filter === 'active' && item.status === 'active') || (filter === 'paused' && item.status !== 'active') || (filter === 'official' && item.news_is_official)
      return matchesText && matchesState
    })
  }, [filter, news, query])

  const returnToList = async message => {
    await loadNews()
    setView({ type: 'list', news: null })
    if (message) showNotice(message)
  }

  const toggleStatus = async item => {
    const nextStatus = item.status === 'active' ? 'closed' : 'active'
    setChangingId(item.id)
    const { error: updateError } = await supabase.from('posts').update({ status: nextStatus }).eq('id', item.id).eq('type', 'news')
    setChangingId(null)
    if (updateError) return setError(updateError.message || 'No fue posible actualizar la noticia.')
    setNews(current => current.map(currentItem => currentItem.id === item.id ? { ...currentItem, status: nextStatus } : currentItem))
    showNotice(nextStatus === 'active' ? 'Noticia publicada' : 'Noticia pausada')
  }

  if (view.type === 'edit') return <NewsEditor news={view.news} profile={profile} categories={categories} onCategoryCreated={category => setCategories(current => current.some(item => item.key === category.key) ? current : [...current, category])} onBack={() => setView({ type: 'list', news: null })} onSaved={() => returnToList(view.news ? 'Noticia actualizada' : 'Noticia publicada')} onDeleted={() => returnToList('Noticia eliminada')} />
  if (view.type === 'categories') return <NewsCategoryManager onBack={() => setView({ type: 'list', news: null })} />

  const categoryMap = Object.fromEntries(categories.map(category => [category.key, { icon: category.icon, label: category.name }]))

  return (
    <div className="news-manager">
      <section className="page-heading commerce-page-heading">
        <div><p className="eyebrow">Contenido editorial</p><h1>Noticias</h1><p>Publica información oficial y comunitaria para el barrio.</p></div>
        <div className="event-heading-actions"><button className="button button-secondary" type="button" onClick={() => setView({ type: 'categories', news: null })}>⚙ Categorías</button><button className="button button-primary new-commerce-button" type="button" onClick={() => setView({ type: 'edit', news: null })}>＋ Nueva noticia</button></div>
      </section>
      {error && <div className="admin-alert" role="alert"><span>⚠️</span><p>{error}</p><button type="button" onClick={() => setError('')}>×</button></div>}
      {notice && <div className="admin-toast">✓ {notice}</div>}
      <section className="commerce-directory">
        <header className="directory-toolbar"><label className="admin-search directory-search"><span>⌕</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar por título, contenido o fuente…" /></label><div className="filter-row directory-filters">{[['all', 'Todas'], ['active', 'Publicadas'], ['official', 'Oficiales'], ['paused', 'Pausadas']].map(([value, label]) => <button key={value} type="button" className={filter === value ? 'is-active' : ''} onClick={() => setFilter(value)}>{label}</button>)}</div><span className="directory-count">{filtered.length} noticias</span></header>
        {loading && <div className="panel-loading directory-loading">Cargando noticias…</div>}
        {!loading && filtered.length === 0 && <div className="panel-empty directory-empty"><span>📰</span><strong>Sin noticias</strong><small>Crea la primera publicación real del barrio.</small></div>}
        {!loading && filtered.length > 0 && <div className="commerce-table-wrap"><table className="commerce-table news-table"><thead><tr><th>Noticia</th><th>Publicación</th><th>Fuente</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{filtered.map(item => { const category = categoryMap[item.category] || { icon: '📰', label: item.category || 'General' }; return <tr key={item.id}><td><div className="table-commerce"><span>{imageOf(item) ? <img src={imageOf(item)} alt="" /> : category.icon}</span><div><strong>{item.title}</strong><small>{category.icon} {category.label}{item.news_is_official ? ' · 📢 Oficial' : ''}</small></div></div></td><td><span className="event-date-cell">{dateLabel(item.created_at)}</span></td><td><span className="table-address">{item.news_source || 'el barrio'}</span></td><td><span className={`table-status ${item.status === 'active' ? 'active' : ''}`}><i />{item.status === 'active' ? 'Publicada' : 'Pausada'}</span></td><td><div className="table-actions"><button type="button" onClick={() => setView({ type: 'edit', news: item })}>Editar</button><button className={item.status === 'active' ? 'event-pause-action' : 'table-products-action'} type="button" disabled={changingId === item.id} onClick={() => toggleStatus(item)}>{changingId === item.id ? 'Guardando…' : item.status === 'active' ? 'Pausar' : 'Publicar'}</button></div></td></tr> })}</tbody></table></div>}
      </section>
    </div>
  )
}
