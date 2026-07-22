import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import CommerceEditor from './CommerceEditor.jsx'
import ProductCatalog from './ProductCatalog.jsx'

const commerceImage = commerce => commerce.cover_url || commerce.logo_url || null

export default function CommerceManager({ profile }) {
  const [commerces, setCommerces] = useState([])
  const [productCounts, setProductCounts] = useState({})
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [view, setView] = useState({ type: 'list', commerce: null })

  const showNotice = message => {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 2600)
  }

  const loadCommerces = useCallback(async () => {
    setLoading(true)
    setError('')
    let request = supabase
      .from('commerces')
      .select('*')
      .order('is_premium', { ascending: false })
      .order('is_active', { ascending: false })
      .order('name', { ascending: true })
    if (profile?.neighborhood_id) request = request.eq('neighborhood_id', profile.neighborhood_id)

    const [commerceResult, productResult] = await Promise.all([
      request.limit(300),
      supabase.from('commerce_products').select('id, commerce_id'),
    ])
    if (commerceResult.error) {
      setError('No fue posible cargar los comercios.')
      setLoading(false)
      return
    }
    const counts = {}
    ;(productResult.data || []).forEach(product => {
      counts[product.commerce_id] = (counts[product.commerce_id] || 0) + 1
    })
    setCommerces(commerceResult.data || [])
    setProductCounts(counts)
    setLoading(false)
  }, [profile?.neighborhood_id])

  useEffect(() => { loadCommerces() }, [loadCommerces])

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return commerces.filter(commerce => {
      const matchesText = !normalized || [commerce.name, commerce.category, commerce.address]
        .some(value => (value || '').toLowerCase().includes(normalized))
      const matchesState = filter === 'all'
        || (filter === 'active' && commerce.is_active)
        || (filter === 'featured' && commerce.is_premium)
        || (filter === 'inactive' && !commerce.is_active)
      return matchesText && matchesState
    })
  }, [commerces, filter, query])

  const returnToList = async message => {
    await loadCommerces()
    setView({ type: 'list', commerce: null })
    if (message) showNotice(message)
  }

  if (view.type === 'edit') {
    return (
      <CommerceEditor
        commerce={view.commerce}
        profile={profile}
        onBack={() => setView({ type: 'list', commerce: null })}
        onSaved={() => returnToList(view.commerce ? 'Comercio actualizado' : 'Comercio creado')}
        onDeleted={() => returnToList('Comercio eliminado')}
      />
    )
  }

  if (view.type === 'products' && view.commerce) {
    return (
      <ProductCatalog
        commerce={view.commerce}
        onBack={() => returnToList()}
      />
    )
  }

  return (
    <div className="commerce-manager commerce-list-page">
      <section className="page-heading commerce-page-heading">
        <div><p className="eyebrow">Gestión comercial</p><h1>Comercios</h1><p>Crea y administra los negocios que aparecen en El Barrio.</p></div>
        <button className="button button-primary new-commerce-button" type="button" onClick={() => setView({ type: 'edit', commerce: null })}>＋ Nuevo comercio</button>
      </section>

      {error && <div className="admin-alert" role="alert"><span>⚠️</span><p>{error}</p><button type="button" onClick={() => setError('')}>×</button></div>}
      {notice && <div className="admin-toast">✓ {notice}</div>}

      <section className="commerce-directory">
        <header className="directory-toolbar">
          <label className="admin-search directory-search"><span>⌕</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar por nombre, rubro o dirección…" /></label>
          <div className="filter-row directory-filters">
            {[
              ['all', 'Todos'], ['active', 'Activos'], ['featured', 'Destacados'], ['inactive', 'Inactivos'],
            ].map(([value, label]) => <button key={value} type="button" className={filter === value ? 'is-active' : ''} onClick={() => setFilter(value)}>{label}</button>)}
          </div>
          <span className="directory-count">{filtered.length} comercios</span>
        </header>

        {loading && <div className="panel-loading directory-loading">Cargando comercios…</div>}
        {!loading && filtered.length === 0 && <div className="panel-empty directory-empty"><span>🏪</span><strong>Sin comercios</strong><small>No hay resultados para esta búsqueda.</small></div>}

        {!loading && filtered.length > 0 && (
          <div className="commerce-table-wrap">
            <table className="commerce-table">
              <thead><tr><th>Comercio</th><th>Estado</th><th>Dirección</th><th>Productos</th><th>Acciones</th></tr></thead>
              <tbody>
                {filtered.map(commerce => (
                  <tr key={commerce.id}>
                    <td><div className="table-commerce"><span>{commerceImage(commerce) ? <img src={commerceImage(commerce)} alt="" /> : '🏪'}</span><div><strong>{commerce.name}</strong><small>{commerce.category || 'Sin categoría'} {commerce.is_premium ? ' · ★ Destacado' : ''}</small></div></div></td>
                    <td><span className={`table-status ${commerce.is_active ? 'active' : ''}`}><i />{commerce.is_active ? 'Activo' : 'Inactivo'}</span></td>
                    <td><span className="table-address">{commerce.address || 'Sin dirección'}</span></td>
                    <td><button className="product-count-button" type="button" onClick={() => setView({ type: 'products', commerce })}><strong>{productCounts[commerce.id] || 0}</strong><span>Ver productos</span></button></td>
                    <td><div className="table-actions"><button type="button" onClick={() => setView({ type: 'edit', commerce })}>Editar</button><button className="table-products-action" type="button" onClick={() => setView({ type: 'products', commerce })}>Productos →</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
