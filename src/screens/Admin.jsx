import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { C, T, S, hace } from '../lib/design'

/*
  Admin — Panel de administración de el barrio.

  Sección oculta: solo visible para usuarios con profile.role === 'admin'.
  Desde acá se accede a las sub-secciones:
    · Farmacias de turno (CRUD)         → onNavigate('adminFarmacias')
    · Comercios (gestión)               → onNavigate('adminComercios')
    · Promociones (CRUD ligero)         → vista inline 'promos'
    · Usuarios (gestión)                → onNavigate('adminUsuarios')
    · Incidentes/Alertas (cambiar status) → onNavigate('adminIncidentes')
    · Estadísticas (resumen general)    → vista inline 'stats'

  El botón de entrada lo agrega el agente principal en MyProfile.jsx
  (botón "Panel de administración" → onNavigate('admin')).

  Cada sub-sección es una card grande con emoji + título + count + flecha.
  "el barrio" siempre minúscula y verde.
*/

// Estado inicial del formulario de nueva promoción.
// Sirve para alta y para resetear después de guardar/cancelar.
// Columnas REALES de commerce_promos (CSV del usuario):
//   id, commerce_id, neighborhood_id, title, description, image_url,
//   starts_at, expires_at, is_active, views_count, created_at
// OJO: NO existen discount_text, promo_code ni is_featured en esta tabla.
const PROMO_VACIA = {
  commerce_id: '',
  title: '',
  description: '',
  image_url: '',
  starts_at: '',
  expires_at: '',
  is_active: true,
}

// ──────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ──────────────────────────────────────────────────────────────
export default function Admin({ currentUser, onNavigate }) {
  const [profile, setProfile] = useState(null)
  const [counts, setCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [vista, setVista] = useState('panel') // 'panel' | 'promos' | 'stats'
  const [toast, setToast] = useState('')

  const nav = onNavigate || (() => {})

  useEffect(() => { cargar() }, [currentUser?.id])

  // Cierra el toast solo si está abierto
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 2400)
    return () => clearTimeout(t)
  }, [toast])

  const showToast = (msg) => setToast(msg)

  const cargar = async () => {
    if (!currentUser?.id) { setLoading(false); return }
    setLoading(true)
    try {
      const uid = currentUser.user_id || currentUser.id
      // Si currentUser ya trae el rol (mergeado en App), lo usamos directo
      let prof = (currentUser && (currentUser.role || currentUser.full_name))
        ? currentUser
        : null
      if (!prof || !prof.role) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', uid)
          .maybeSingle()
        if (error) throw error
        prof = data || prof
      }
      setProfile(prof)

      if (!prof || prof.role !== 'admin') {
        setForbidden(true)
        setLoading(false)
        return
      }

      // Cargar counts en paralelo (head:true = sin body, solo count)
      const [
        farmacias, comercios, promos, usuarios,
        incidentes, posts, barrios
      ] = await Promise.all([
        supabase.from('farmacias').select('*', { count: 'exact', head: true }),
        supabase.from('commerces').select('*', { count: 'exact', head: true }),
        supabase.from('commerce_promos').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('incident_reports').select('*', { count: 'exact', head: true }).eq('status', 'pendiente'),
        supabase.from('posts').select('*', { count: 'exact', head: true }),
        supabase.from('neighborhoods').select('*', { count: 'exact', head: true }),
      ])

      setCounts({
        farmacias: farmacias.count ?? 0,
        comercios: comercios.count ?? 0,
        promos: promos.count ?? 0,
        usuarios: usuarios.count ?? 0,
        incidentes: incidentes.count ?? 0,
        posts: posts.count ?? 0,
        barrios: barrios.count ?? 0,
      })
    } catch (e) {
      console.error('[admin] Error cargando panel:', e)
      showToast('Error: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  // ── ESTADOS DE CARGA ──
  if (loading) {
    return (
      <div style={s.wrap}>
        <Header onBack={() => nav('back')} title={<span>Admin · <span style={s.marca}>el barrio</span></span>} />
        <div style={s.cargando}>
          <div style={{ fontSize: 44 }}>📊</div>
          <div style={{ fontSize: 14, color: C.textoTenue, marginTop: 10 }}>
            Cargando panel…
          </div>
        </div>
      </div>
    )
  }

  if (forbidden) {
    return (
      <div style={s.wrap}>
        <Header onBack={() => nav('back')} title={<span>Admin · <span style={s.marca}>el barrio</span></span>} />
        <div style={s.scroll}>
          <div style={s.vacio}>
            <div style={s.vacioEmoji}>🔒</div>
            <div style={s.vacioTit}>No tienes permiso</div>
            <div style={s.vacioTxt}>
              Esta sección es solo para administradores de{' '}
              <span style={s.marca}>el barrio</span>. Si creés que es un error,
              contactá a soporte.
            </div>
            <button style={s.vacioCta} onClick={() => nav('back')}>
              ← Volver
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── VISTA PROMOS (inline) ──
  if (vista === 'promos') {
    return (
      <PromocionesInline
        currentUser={currentUser}
        profile={profile}
        onBack={() => setVista('panel')}
        showToast={showToast}
      />
    )
  }

  // ── VISTA STATS (inline) ──
  if (vista === 'stats') {
    return (
      <EstadisticasInline
        counts={counts}
        onBack={() => setVista('panel')}
        profile={profile}
      />
    )
  }

  // ── VISTA PANEL PRINCIPAL ──
  const secciones = [
    {
      key: 'adminFarmacias',
      emoji: '💊',
      label: 'Farmacias de turno',
      sub: `${counts.farmacias ?? 0} registradas`,
      bg: C.verdeSuave,
      color: C.verde,
    },
    {
      key: 'adminComercios',
      emoji: '🏪',
      label: 'Comercios',
      sub: `${counts.comercios ?? 0} en el directorio`,
      bg: C.doradoSuave,
      color: C.dorado,
    },
    {
      key: 'promos',
      emoji: '🎁',
      label: 'Promociones',
      sub: `${counts.promos ?? 0} activas o programadas`,
      bg: C.moradoSuave,
      color: C.morado,
    },
    {
      key: 'adminUsuarios',
      emoji: '👥',
      label: 'Usuarios',
      sub: `${counts.usuarios ?? 0} vecinos registrados`,
      bg: C.azulSuave,
      color: C.azul,
    },
    {
      key: 'adminIncidentes',
      emoji: '🚨',
      label: 'Alertas e incidentes',
      sub: `${counts.incidentes ?? 0} pendientes`,
      bg: C.rojoSuave,
      color: C.rojo,
    },
    {
      key: 'stats',
      emoji: '📊',
      label: 'Estadísticas',
      sub: 'Resumen general del barrio',
      bg: C.naranjoSuave,
      color: C.naranjo,
    },
  ]

  return (
    <div style={s.wrap}>
      <Header
        onBack={() => nav('back')}
        title={<span>Admin · <span style={s.marca}>el barrio</span></span>}
      />

      <div style={s.scroll}>
        {/* ══════ HERO ══════ */}
        <div style={s.hero}>
          <div style={s.heroEmoji}>🛠️</div>
          <div style={s.heroTexto}>
            <div style={s.heroTit}>Panel de administración</div>
            <div style={s.heroSub}>
              Hola <strong>{(profile?.full_name || 'Admin').split(' ')[0]}</strong>,
              desde acá manejás <span style={s.marca}>el barrio</span>.
            </div>
          </div>
        </div>

        {/* ══════ STATS RÁPIDAS ══════ */}
        <div style={s.statsGrid}>
          <StatCard n={counts.usuarios ?? '–'} label='👥 Vecinos' bg={C.verdeBg} color={C.verdeOsc} />
          <StatCard n={counts.comercios ?? '–'} label='🏪 Comercios' bg={C.doradoSuave} color={C.dorado} />
          <StatCard n={counts.incidentes ?? '–'} label='🚨 Alertas' bg={C.rojoBg} color={C.rojo} />
          <StatCard n={counts.posts ?? '–'} label='📢 Posts' bg={C.moradoSuave} color={C.morado} />
        </div>

        {/* ══════ SECCIONES ══════ */}
        <div style={s.seccionTit}>Gestión</div>
        <div style={s.lista}>
          {secciones.map((sec) => (
            <button
              key={sec.key}
              style={s.cardBtn}
              onClick={() => {
                if (sec.key === 'promos') return setVista('promos')
                if (sec.key === 'stats') return setVista('stats')
                nav(sec.key)
              }}
            >
              <div style={{ ...s.cardEmoji, background: sec.bg, color: sec.color }}>
                {sec.emoji}
              </div>
              <div style={s.cardTexto}>
                <div style={s.cardTit}>{sec.label}</div>
                <div style={s.cardSub}>{sec.sub}</div>
              </div>
              <div style={s.cardFlecha}>→</div>
            </button>
          ))}
        </div>

        {/* ══════ INFO ══════ */}
        <div style={s.infoBox}>
          ⚠️ Los cambios que hacés acá afectan a todos los vecinos. Si tenés
          dudas, escribí a soporte antes de tocar algo.
        </div>
      </div>

      {/* ══════ TOAST ══════ */}
      {toast && (
        <div style={s.toast}>{toast}</div>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// SUB-VISTA: PROMOCIONES (inline) — lista + CREATE + DELETE + toggle
// ──────────────────────────────────────────────────────────────
function PromocionesInline({ currentUser, profile, onBack, showToast }) {
  const [promos, setPromos] = useState([])
  const [loading, setLoading] = useState(true)
  const [commerces, setCommerces] = useState([])   // para el <select> del form

  // Form de alta
  const [mostrarForm, setMostrarForm] = useState(false)
  const [nueva, setNueva] = useState(PROMO_VACIA)
  const [guardando, setGuardando] = useState(false)

  // Borrado con confirmación (2 pasos)
  const [confirmDelete, setConfirmDelete] = useState(null)

  useEffect(() => {
    cargar()
    cargarCommerces()
  }, [currentUser?.id])

  const cargar = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('commerce_promos')
        .select('id, title, description, image_url, is_active, starts_at, expires_at, views_count, commerce_id, neighborhood_id, created_at')
        .order('created_at', { ascending: false })
        .limit(100)
      if (error) throw error
      setPromos(data || [])
    } catch (e) {
      console.error('[admin promos] Error:', e)
      showToast('Error: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  // Lista de comercios para el <select> del formulario de alta.
  // Si falla, no rompemos la vista: el admin sigue viendo las promos existentes.
  const cargarCommerces = async () => {
    try {
      const { data, error } = await supabase
        .from('commerces')
        .select('id, name')
        .order('name', { ascending: true })
        .limit(200)
      if (error) throw error
      setCommerces(data || [])
    } catch (e) {
      console.error('[admin promos] commerces:', e)
      // Silencioso: el select quedará vacío y la validación del form avisará.
    }
  }

  // ── TOGGLE is_active (optimistic + rollback) ──
  const toggle = async (p) => {
    const nuevo = !p.is_active
    setPromos(prev => prev.map(x => x.id === p.id ? { ...x, is_active: nuevo } : x))
    try {
      const { error } = await supabase
        .from('commerce_promos')
        .update({ is_active: nuevo })
        .eq('id', p.id)
      if (error) throw error
      showToast(nuevo ? 'Promo activada ✅' : 'Promo pausada ⏸️')
    } catch (e) {
      console.error('[admin promos] Error toggle:', e)
      setPromos(prev => prev.map(x => x.id === p.id ? { ...x, is_active: !nuevo } : x))
      showToast('Error: ' + e.message)
    }
  }

  // ── ALTA ──
  const abrirAlta = () => {
    setNueva(PROMO_VACIA)
    setMostrarForm(true)
  }
  const cancelarAlta = () => {
    setMostrarForm(false)
    setNueva(PROMO_VACIA)
  }
  const guardarAlta = async () => {
    if (!nueva.title.trim()) {
      showToast('Falta el título de la promo.')
      return
    }
    if (!nueva.commerce_id) {
      showToast('Elegí un comercio para asociar la promo.')
      return
    }
    if (!nueva.expires_at) {
      showToast('Elegí la fecha de vencimiento de la promo.')
      return
    }
    setGuardando(true)
    try {
      const payload = {
        commerce_id: nueva.commerce_id,
        title: nueva.title.trim(),
        description: nueva.description.trim() || null,
        image_url: nueva.image_url.trim() || null,
        starts_at: nueva.starts_at ? new Date(nueva.starts_at).toISOString() : null,
        expires_at: nueva.expires_at ? new Date(nueva.expires_at).toISOString() : null,
        is_active: !!nueva.is_active,
        neighborhood_id: profile?.neighborhood_id || null,
      }
      console.log('[admin promos] insertando:', payload)
      const { data, error } = await supabase
        .from('commerce_promos')
        .insert(payload)
        .select()
      if (error) throw error
      // Optimistic: append al tope de la lista (ya viene ordenado por created_at desc).
      if (data && data[0]) {
        setPromos(prev => [data[0], ...prev])
      }
      setMostrarForm(false)
      setNueva(PROMO_VACIA)
      showToast('Promo agregada 🎁')
    } catch (e) {
      console.error('[admin promos] alta:', e)
      // "Error: " + e.message → el admin ve RLS / FK / not-null / etc.
      showToast('Error: ' + e.message)
    } finally {
      setGuardando(false)
    }
  }

  // ── BORRADO (2 pasos) ──
  const pedirConfirm = (p) => setConfirmDelete(p)
  const cancelarDelete = () => setConfirmDelete(null)
  const confirmarDelete = async () => {
    const p = confirmDelete
    if (!p) return
    try {
      const { error } = await supabase
        .from('commerce_promos')
        .delete()
        .eq('id', p.id)
      if (error) throw error
      setPromos(prev => prev.filter(x => x.id !== p.id))
      setConfirmDelete(null)
      showToast('Promo eliminada 🗑️')
    } catch (e) {
      console.error('[admin promos] delete:', e)
      showToast('Error: ' + e.message)
    }
  }

  // Helper: nombre del comercio a partir del id (para mostrar en la card)
  const commerceName = (id) => {
    if (!id) return 'Sin comercio'
    const c = commerces.find(x => x.id === id)
    return c ? c.name : ('Comercio #' + String(id).slice(0, 8))
  }

  return (
    <div style={s.wrap}>
      <Header
        onBack={onBack}
        title={<span>🎁 Promociones · <span style={s.marca}>el barrio</span></span>}
      />
      <div style={s.scroll}>
        {/* ══════ RESUMEN + BOTÓN AGREGAR ══════ */}
        <div style={s.topRow}>
          <div style={s.resumen}>
            <span style={s.resumenNum}>{promos.length}</span>
            <span style={s.resumenTxt}>
              promo{promos.length === 1 ? '' : 's'} en total
            </span>
          </div>
          <button style={s.btnAdd} onClick={abrirAlta} disabled={mostrarForm}>
            <span style={{ fontSize: 16, fontWeight: 700 }}>+</span>
            <span>Agregar</span>
          </button>
        </div>

        {/* ══════ FORM DE ALTA ══════ */}
        {mostrarForm && (
          <FormPromo
            titulo='Nueva promoción'
            values={nueva}
            onChange={setNueva}
            onGuardar={guardarAlta}
            onCancelar={cancelarAlta}
            guardando={guardando}
            commerces={commerces}
          />
        )}

        {/* ══════ LISTA ══════ */}
        {loading ? (
          <div style={s.cargandoSmall}>Cargando promociones…</div>
        ) : promos.length === 0 && !mostrarForm ? (
          <div style={s.vacioSmall}>
            <div style={s.vacioEmoji}>🎁</div>
            <div style={s.vacioTit}>No hay promociones</div>
            <div style={s.vacioTxt}>
              Las promos que creen los comercios van a aparecer acá.
              Agregá la primera con el botón de arriba.
            </div>
            <button style={s.vacioCta} onClick={abrirAlta}>
              + Agregar la primera
            </button>
          </div>
        ) : (
          <div style={s.lista}>
            {promos.map((p) => {
              const activa = !!p.is_active
              const vigente = p.expires_at
                ? new Date(p.expires_at).getTime() > Date.now()
                : true
              const confirmando = confirmDelete?.id === p.id
              return (
                <div key={p.id} style={{
                  ...s.card,
                  opacity: activa ? 1 : 0.65,
                  borderLeft: `4px solid ${activa ? C.verde : C.borde}`,
                }}>
                  <div style={s.cardRow}>
                    <div style={{ ...s.cardEmoji, background: activa ? C.verdeSuave : C.fondo, color: activa ? C.verde : C.textoTenue }}>
                      🎁
                    </div>
                    <div style={s.cardTexto}>
                      <div style={s.cardTit}>
                        {p.title || 'Sin título'}
                      </div>
                      <div style={s.cardSub}>
                        {p.description
                          ? (p.description.length > 60
                              ? p.description.slice(0, 60) + '…'
                              : p.description)
                          : 'Sin descripción'}
                      </div>
                      <div style={s.cardMeta}>
                        <span style={s.metaItem}>
                          🏪 {commerceName(p.commerce_id)}
                        </span>
                        <span style={s.metaItem}>
                          👁️ {p.views_count || 0} vistas
                        </span>
                        {p.expires_at && (
                          <span style={s.metaItem}>
                            ⏰ {hace(p.expires_at)} {vigente ? '' : '(vencida)'}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      style={{
                        ...s.toggleBtn,
                        background: activa ? C.verde : C.borde,
                        color: activa ? '#fff' : C.textoSuave,
                      }}
                      onClick={() => toggle(p)}
                    >
                      {activa ? '✅ Activa' : '⏸️ Pausada'}
                    </button>
                  </div>

                  {/* ══════ ACCIONES (eliminar con 2 pasos) ══════ */}
                  <div style={s.cardAcciones}>
                    {confirmando ? (
                      <>
                        <span style={s.confirmTxt}>¿Eliminar esta promo?</span>
                        <button style={s.btnCancelarChico} onClick={cancelarDelete}>Cancelar</button>
                        <button style={s.btnBorrarConfirm} onClick={confirmarDelete}>🗑️ Sí, borrar</button>
                      </>
                    ) : (
                      <button style={s.btnBorrar} onClick={() => pedirConfirm(p)}>🗑️ Eliminar</button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// FORMULARIO DE PROMO (alta) — tema MORADO para diferenciar de farmacias (verde)
// ──────────────────────────────────────────────────────────────
function FormPromo({ titulo, values, onChange, onGuardar, onCancelar, guardando, commerces }) {
  const set = (campo, val) => onChange({ ...values, [campo]: val })
  return (
    <div style={s.formCard}>
      <div style={s.formTit}>{titulo}</div>

      <Field label='Comercio *'>
        <select
          style={s.formSelect}
          value={values.commerce_id}
          onChange={(e) => set('commerce_id', e.target.value)}
        >
          <option value=''>Elegí un comercio…</option>
          {commerces.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </Field>

      <Field label='Título *'>
        <input
          style={s.formInput}
          value={values.title}
          onChange={(e) => set('title', e.target.value)}
          placeholder='20% OFF en frutas y verduras'
          autoFocus
        />
      </Field>

      <Field label='Descripción'>
        <textarea
          style={s.formTextarea}
          value={values.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder='Solo por esta semana, en todas las verduras de hoja.'
          rows={3}
        />
      </Field>

      <Field label='URL de imagen'>
        <input
          style={s.formInput}
          value={values.image_url}
          onChange={(e) => set('image_url', e.target.value)}
          placeholder='https://…'
          inputMode='url'
        />
        <div style={s.formHelper}>Pegá la URL de la imagen</div>
      </Field>

      <Field label='Empieza (opcional)'>
        <input
          type='datetime-local'
          style={s.formInput}
          value={values.starts_at}
          onChange={(e) => set('starts_at', e.target.value)}
        />
      </Field>

      <Field label='Vence *'>
        <input
          type='datetime-local'
          style={s.formInput}
          value={values.expires_at}
          onChange={(e) => set('expires_at', e.target.value)}
        />
      </Field>

      <Field label='Estado'>
        <button
          type='button'
          style={{
            ...s.toggleBtn,
            width: '100%',
            height: 42,
            background: values.is_active ? C.morado : C.borde,
            color: values.is_active ? '#fff' : C.textoSuave,
          }}
          onClick={() => set('is_active', !values.is_active)}
        >
          {values.is_active ? '✅ Activa' : '⏸️ Pausada'}
        </button>
      </Field>

      <div style={s.formActions}>
        <button style={s.btnCancelar} onClick={onCancelar} disabled={guardando} type='button'>
          ✕ Cancelar
        </button>
        <button style={s.btnGuardar} onClick={onGuardar} disabled={guardando} type='button'>
          {guardando ? 'Guardando…' : '💾 Guardar'}
        </button>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div style={s.field}>
      <label style={s.formLabel}>{label}</label>
      {children}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// SUB-VISTA: ESTADÍSTICAS (inline)
// ──────────────────────────────────────────────────────────────
function EstadisticasInline({ counts, onBack, profile }) {
  const items = [
    { emoji: '👥', label: 'Vecinos registrados', value: counts.usuarios ?? '–', bg: C.verdeBg, color: C.verdeOsc },
    { emoji: '📢', label: 'Publicaciones', value: counts.posts ?? '–', bg: C.moradoSuave, color: C.morado },
    { emoji: '🏪', label: 'Comercios', value: counts.comercios ?? '–', bg: C.doradoSuave, color: C.dorado },
    { emoji: '🎁', label: 'Promociones', value: counts.promos ?? '–', bg: C.azulSuave, color: C.azul },
    { emoji: '🚨', label: 'Alertas pendientes', value: counts.incidentes ?? '–', bg: C.rojoBg, color: C.rojo },
    { emoji: '💊', label: 'Farmacias', value: counts.farmacias ?? '–', bg: C.verdeSuave, color: C.verde },
    { emoji: '🏘️', label: 'Barrios', value: counts.barrios ?? '–', bg: C.naranjoSuave, color: C.naranjo },
  ]
  return (
    <div style={s.wrap}>
      <Header
        onBack={onBack}
        title={<span>📊 Estadísticas · <span style={s.marca}>el barrio</span></span>}
      />
      <div style={s.scroll}>
        <div style={s.hero}>
          <div style={s.heroEmoji}>📈</div>
          <div style={s.heroTexto}>
            <div style={s.heroTit}>Resumen general</div>
            <div style={s.heroSub}>
              Estos son los números de <span style={s.marca}>el barrio</span> ahora mismo.
            </div>
          </div>
        </div>

        <div style={s.statsGridBig}>
          {items.map((it) => (
            <div key={it.label} style={{ ...s.statBig, background: it.bg }}>
              <div style={{ ...s.statBigEmoji, color: it.color }}>{it.emoji}</div>
              <div style={s.statBigNum}>{it.value}</div>
              <div style={s.statBigLabel}>{it.label}</div>
            </div>
          ))}
        </div>

        <div style={s.infoBox}>
          📌 Estos conteos vienen directo de Supabase. Si algo no cuadra,
          revisá si hay filtros RLS que te estén ocultando filas.
        </div>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// COMPONENTES AUXILIARES
// ──────────────────────────────────────────────────────────────
function Header({ onBack, title }) {
  return (
    <div style={s.header}>
      <button style={s.backBtn} onClick={onBack} aria-label="Volver">
        ←
      </button>
      <div style={s.headerTit}>{title}</div>
      <div style={{ width: 40 }} />
    </div>
  )
}

function StatCard({ n, label, bg, color }) {
  return (
    <div style={{ ...s.statCard, background: bg }}>
      <div style={{ ...s.statNum, color }}>{n}</div>
      <div style={s.statLabel}>{label}</div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
const s = {
  wrap: {
    width: '100%', height: '100%',
    background: C.fondo, fontFamily: T.font,
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
    position: 'relative',
  },
  cargando: {
    flex: 1, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    color: C.textoSuave,
  },
  cargandoSmall: {
    padding: '32px 16px', textAlign: 'center',
    fontSize: 13, color: C.textoTenue,
  },
  marca: { color: C.verde, fontWeight: 700 },

  /* ── header ── */
  header: {
    background: C.card,
    padding: '28px 18px 12px',
    borderBottom: `1px solid ${C.borde}`,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    flexShrink: 0,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: '50%',
    background: C.fondo, border: `1px solid ${C.borde}`,
    color: C.texto, cursor: 'pointer', padding: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 20, fontWeight: 700, fontFamily: 'inherit',
  },
  headerTit: {
    fontSize: 16, fontWeight: 800, color: C.texto,
    letterSpacing: '-0.2px',
  },

  scroll: { flex: 1, overflowY: 'auto', padding: '14px 16px 110px' },

  /* ── hero ── */
  hero: {
    display: 'flex', alignItems: 'center', gap: 14,
    background: 'linear-gradient(135deg, #0f5f36 0%, #16a34a 100%)',
    borderRadius: 18, padding: '18px 18px',
    marginBottom: 16,
    boxShadow: '0 8px 22px rgba(22,163,74,0.20)',
  },
  heroEmoji: {
    width: 52, height: 52, borderRadius: 14,
    background: 'rgba(255,255,255,0.18)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 28, flexShrink: 0,
  },
  heroTexto: { flex: 1, minWidth: 0 },
  heroTit: { fontSize: 17, fontWeight: 800, color: '#fff', letterSpacing: '-0.2px' },
  heroSub: {
    fontSize: 13.5, color: 'rgba(255,255,255,0.92)',
    fontWeight: 500, marginTop: 3, lineHeight: 1.4,
  },

  /* ── stats grid ── */
  statsGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 10, marginBottom: 18,
  },
  statCard: {
    borderRadius: 14, padding: '14px 14px',
    border: '1px solid rgba(0,0,0,0.04)',
  },
  statNum: { fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px' },
  statLabel: {
    fontSize: 13, fontWeight: 600, color: C.textoSuave, marginTop: 2,
  },

  /* ── stats grid grande (Estadísticas) ── */
  statsGridBig: {
    display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 10, marginBottom: 18,
  },
  statBig: {
    borderRadius: 16, padding: '16px 14px',
    border: '1px solid rgba(0,0,0,0.04)',
    textAlign: 'center',
  },
  statBigEmoji: { fontSize: 28, marginBottom: 4 },
  statBigNum: { fontSize: 30, fontWeight: 800, color: C.texto, letterSpacing: '-0.5px' },
  statBigLabel: {
    fontSize: 13, fontWeight: 600, color: C.textoSuave, marginTop: 2,
  },

  /* ── secciones ── */
  seccionTit: {
    fontSize: 14, fontWeight: 800, color: C.textoTenue,
    textTransform: 'uppercase', letterSpacing: 0.4,
    marginBottom: 10, paddingLeft: 2,
  },
  lista: { display: 'flex', flexDirection: 'column', gap: 10 },
  cardBtn: {
    display: 'flex', alignItems: 'center', gap: 13,
    width: '100%',
    background: C.card,
    border: `1px solid ${C.borde}`,
    borderRadius: 16, padding: '14px 15px',
    cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
    boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
  },
  cardEmoji: {
    width: 46, height: 46, borderRadius: 12,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 22, flexShrink: 0,
  },
  cardTexto: { flex: 1, minWidth: 0 },
  cardTit: {
    fontSize: 15, fontWeight: 700, color: C.texto,
    letterSpacing: '-0.1px',
  },
  cardSub: {
    fontSize: 13, color: C.textoTenue, fontWeight: 500,
    marginTop: 2,
  },
  cardFlecha: {
    fontSize: 18, color: C.textoTenue, fontWeight: 600, flexShrink: 0,
  },

  /* ── card (en sub-vistas) ── */
  card: {
    background: C.card,
    border: `1px solid ${C.borde}`,
    borderRadius: 16, padding: '14px 15px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
  },
  cardRow: { display: 'flex', alignItems: 'flex-start', gap: 12 },
  cardMeta: {
    display: 'flex', flexWrap: 'wrap', gap: 10,
    marginTop: 5,
  },
  metaItem: {
    fontSize: 12, color: C.textoTenue, fontWeight: 600,
  },
  toggleBtn: {
    flexShrink: 0,
    border: 'none', borderRadius: 999,
    padding: '8px 12px', fontSize: 12.5, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit',
    whiteSpace: 'nowrap',
  },
  featuredBadge: {
    fontSize: 13, fontWeight: 700,
  },

  /* ── card acciones (eliminar) ── */
  cardAcciones: {
    display: 'flex', gap: 8, alignItems: 'center',
    borderTop: '1px solid rgba(0,0,0,0.05)',
    paddingTop: 10, marginTop: 10,
  },
  btnBorrar: {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    background: C.rojoBg, border: `1px solid ${C.rojoSuave}`,
    color: C.rojo, padding: '7px 12px', borderRadius: 10,
    fontSize: 12.5, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit',
  },
  confirmTxt: {
    fontSize: 13, fontWeight: 600, color: C.rojo, flex: 1,
  },
  btnCancelarChico: {
    background: C.fondo, border: `1px solid ${C.borde}`,
    color: C.textoSuave, padding: '7px 12px', borderRadius: 10,
    fontSize: 12.5, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit',
  },
  btnBorrarConfirm: {
    background: C.rojo, border: 'none',
    color: '#fff', padding: '7px 12px', borderRadius: 10,
    fontSize: 12.5, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit',
  },

  /* ── resumen ── */
  resumen: {
    display: 'flex', alignItems: 'baseline', gap: 6,
  },
  resumenNum: { fontSize: 22, fontWeight: 800, color: C.texto },
  resumenTxt: { fontSize: 13.5, color: C.textoSuave, fontWeight: 500 },

  /* ── top row (resumen + botón agregar) ── */
  topRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 14, gap: 10,
  },
  btnAdd: {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    background: C.morado, color: '#fff', border: 'none',
    padding: '9px 14px', borderRadius: 999,
    fontSize: 13.5, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit',
    boxShadow: '0 4px 12px rgba(124,58,237,0.22)',
  },

  /* ── form (tema MORADO) ── */
  formCard: {
    background: C.card,
    border: `2px solid ${C.morado}`,
    borderRadius: 16, padding: '16px 16px',
    boxShadow: '0 4px 14px rgba(124,58,237,0.12)',
    marginBottom: 10,
  },
  formTit: {
    fontSize: 14, fontWeight: 800, color: C.morado,
    marginBottom: 12, letterSpacing: '-0.1px',
  },
  formRow: {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
  },
  field: { marginBottom: 11 },
  formLabel: {
    display: 'block', fontSize: 12.5, fontWeight: 700,
    color: C.textoSuave, marginBottom: 4,
  },
  formHelper: {
    fontSize: 11.5, fontWeight: 500, color: C.textoTenue,
    marginTop: 4, lineHeight: 1.4,
  },
  formInput: {
    width: '100%',
    minWidth: 0,
    padding: '10px 12px',
    fontSize: 14, fontFamily: 'inherit',
    color: C.texto,
    background: C.fondo,
    border: `1px solid ${C.borde}`,
    borderRadius: 10,
    outline: 'none',
    boxSizing: 'border-box',
    height: 42,
  },
  formSelect: {
    width: '100%',
    padding: '10px 12px',
    fontSize: 14, fontFamily: 'inherit',
    color: C.texto,
    background: C.fondo,
    border: `1px solid ${C.borde}`,
    borderRadius: 10,
    outline: 'none',
    boxSizing: 'border-box',
    height: 42,
  },
  formTextarea: {
    width: '100%',
    padding: '10px 12px',
    fontSize: 14, fontFamily: 'inherit',
    color: C.texto,
    background: C.fondo,
    border: `1px solid ${C.borde}`,
    borderRadius: 10,
    outline: 'none',
    boxSizing: 'border-box',
    minHeight: 80,
    resize: 'vertical',
  },
  formActions: {
    display: 'flex', gap: 8, marginTop: 14,
  },
  btnCancelar: {
    flex: 1,
    background: C.fondo, border: `1px solid ${C.borde}`,
    color: C.textoSuave, padding: '11px 14px', borderRadius: 10,
    fontSize: 14, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit',
  },
  btnGuardar: {
    flex: 1,
    background: C.morado, border: 'none',
    color: '#fff', padding: '11px 14px', borderRadius: 10,
    fontSize: 14, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit',
    boxShadow: '0 4px 12px rgba(124,58,237,0.22)',
  },

  /* ── vacío ── */
  vacio: {
    textAlign: 'center', padding: '40px 20px 28px',
    background: C.card, borderRadius: 18, border: `1px solid ${C.borde}`,
    marginTop: 20,
  },
  vacioSmall: {
    textAlign: 'center', padding: '32px 16px',
    background: C.card, borderRadius: 18, border: `1px solid ${C.borde}`,
  },
  vacioEmoji: { fontSize: 44, marginBottom: 10 },
  vacioTit: { fontSize: 16, fontWeight: 700, color: C.texto, marginBottom: 5 },
  vacioTxt: {
    fontSize: 13, color: C.textoTenue, lineHeight: 1.5,
    marginBottom: 16, maxWidth: 280, margin: '0 auto 16px',
  },
  vacioCta: {
    display: 'inline-flex', alignItems: 'center', gap: 7,
    padding: '11px 18px', borderRadius: 999,
    background: C.verde, color: '#fff', border: 'none',
    fontSize: 14, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit',
  },

  /* ── info box ── */
  infoBox: {
    marginTop: 18,
    padding: '12px 14px',
    background: C.doradoSuave,
    border: `1px solid #fde68a`,
    borderRadius: 12,
    fontSize: 13, color: '#92400e', lineHeight: 1.45,
    fontWeight: 500,
  },

  /* ── toast ── */
  toast: {
    position: 'absolute', bottom: 26, left: '50%',
    transform: 'translateX(-50%)',
    background: C.texto, color: '#fff',
    padding: '11px 18px', borderRadius: 999,
    fontSize: 13.5, fontWeight: 600,
    boxShadow: '0 8px 22px rgba(0,0,0,0.20)',
    zIndex: 50, maxWidth: '90%',
    textAlign: 'center',
  },
}
