/*
  NOTA: Para subir imágenes, crear bucket 'commerces' en Supabase:
  1. Supabase Dashboard → Storage → New bucket → Name: commerces → Public: YES
  2. SQL Editor: CREATE POLICY "commerces_upload_admin" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'commerces' AND public.is_admin());
  3. CREATE POLICY "commerces_read_all" ON storage.objects FOR SELECT USING (bucket_id = 'commerces');
*/

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { C, T, S, COMERCIOS, COMERCIOS_CATS, iniciales, hace } from '../lib/design'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix del icono default de Leaflet (issue conocido con bundlers Vite/Webpack).
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

/*
  AdminComercios — CRUD de comercios del barrio.

  Pantalla del panel admin. Solo visible para profile.role === 'admin'.

  Funciones:
    · Lista todos los comercios (tabla `commerces`). Si el admin tiene
      neighborhood_id, filtra por barrio; si no, trae todos.
    · Cada comercio es una card con logo/emoji, nombre, categoría,
      toggles de is_active e is_premium.
    · Toggle is_active  → activa/desactiva el comercio (no aparece en el
      directorio si está apagado).
    · Toggle is_premium → destaca/quita destacado (aparece arriba con ribbon).
    · Botón "+ Agregar" abre un form inline con los campos del comercio
      que existen en el schema (name, category, description, address,
      phone, email, website, logo_url, cover_url, discount_text,
      opening_hours, lat, lng, is_active, is_premium).
      neighborhood_id se autocompleta desde el perfil del admin (no se
      muestra en el form). NO se envían barrio, comuna, whatsapp.
    · Imágenes (logo + portada): subida directa a Supabase Storage
      (bucket 'commerces') + input de URL como fallback.
    · Horarios: editor de 7 días (Lun-Dom) → se guarda como jsonb
      en `opening_hours`.
    · Ubicación: mapa Leaflet para picar lat/lng.
    · Botón ✏️ Editar abre el mismo form pre-cargado para edición.
    · Botón 🗑️ Eliminar con confirmación inline (2 pasos).
    · Buscador por nombre o categoría.
    · Stats mini (Total / Activos / Premium).

  Errores: los toasts muestran "Error: " + e.message para que el admin vea
  si es RLS, columna faltante, etc.

  "el barrio" siempre minúscula y verde.
*/

// ── Días de la semana para el editor de opening_hours ──
const DIAS = [
  { k: 'lun', label: 'Lun' },
  { k: 'mar', label: 'Mar' },
  { k: 'mie', label: 'Mié' },
  { k: 'jue', label: 'Jue' },
  { k: 'vie', label: 'Vie' },
  { k: 'sab', label: 'Sáb' },
  { k: 'dom', label: 'Dom' },
]

// ── Sube una imagen al bucket 'commerces' de Supabase Storage ──
// Devuelve la URL pública o null (muestra toast de error vía onToast).
// Requiere que el bucket 'commerces' esté creado y sea público (ver NOTA arriba).
const subirImagen = async (file, carpeta, onToast) => {
  if (!file) return null
  try {
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const nombre = `${carpeta}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { error } = await supabase.storage.from('commerces').upload(nombre, file)
    if (error) throw error
    const { data: urlData } = supabase.storage.from('commerces').getPublicUrl(nombre)
    return urlData?.publicUrl || null
  } catch (e) {
    const msg = (e && e.message) || String(e)
    if (onToast) onToast('Error al subir imagen: ' + msg)
    return null
  }
}

// ── Limpia el objeto opening_hours: solo días con valor, o null si todo vacío ──
const limpiarHoras = (horas) => {
  const obj = (horas && typeof horas === 'object') ? horas : {}
  const limpio = {}
  let tiene = false
  DIAS.forEach((d) => {
    const v = (obj[d.k] || '').trim()
    if (v) { limpio[d.k] = v; tiene = true }
  })
  return tiene ? limpio : null
}

// ── Convierte un string/number a número o null ──
const toNum = (v) => {
  if (v == null || v === '') return null
  const n = typeof v === 'number' ? v : parseFloat(v)
  return isNaN(n) ? null : n
}

// ── Estado vacío para el form de alta ──
// Solo campos que existen en la tabla `commerces` del schema real.
// `instagram` requiere que se agregue la columna a la BD (ver fix_promos_rls.sql).
// Si la columna no existe, el INSERT/UPDATE va a dar error; correr el SQL primero.
// neighborhood_id NO va acá: se autocompleta desde el perfil del admin
// al momento de guardar (guardarAlta / guardarEdit).
const VACIA = {
  name: '',
  category: 'Otro',
  description: '',
  address: '',
  phone: '',
  email: '',
  website: '',
  instagram: '',
  logo_url: '',
  cover_url: '',
  gallery: '',
  discount_text: '',
  opening_hours: {},
  lat: '',
  lng: '',
  is_active: true,
  is_premium: false,
}

// ── Helpers de emoji/color/bg por categoría (defensivos) ──
const emojiDeCat = (cat) => {
  const c = COMERCIOS && COMERCIOS[cat]
  return c && c.emoji ? c.emoji : '🏪'
}
const colorDeCat = (cat) => {
  const c = COMERCIOS && COMERCIOS[cat]
  return c && c.color ? c.color : C.textoTenue
}
const bgDeCat = (cat) => {
  const c = COMERCIOS && COMERCIOS[cat]
  return c && c.bg ? c.bg : C.fondo
}

// ── Orden de la lista: premium primero, luego activos, luego alfabético ──
const ordenar = (arr) => [...arr].sort((a, b) => {
  if (!!b.is_premium - !!a.is_premium) return (!!b.is_premium - !!a.is_premium)
  if (!!b.is_active - !!a.is_active) return (!!b.is_active - !!a.is_active)
  return (a.name || '').localeCompare(b.name || '')
})

// ── Mensaje de error útil (muestra el mensaje real de Supabase/Postgres) ──
const errMsg = (e) => {
  const m = (e && (e.message || e.error_description || e.toString?.())) || 'Error desconocido'
  return 'Error: ' + m
}

export default function AdminComercios({ currentUser, onNavigate, params }) {
  const [profile, setProfile] = useState(null)
  const [comercios, setComercios] = useState([])
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [toast, setToast] = useState('')
  const [busqueda, setBusqueda] = useState('')

  // ── Alta ──
  const [mostrarForm, setMostrarForm] = useState(false)
  const [nueva, setNueva] = useState(VACIA)
  const [guardando, setGuardando] = useState(false)

  // ── Edición ──
  const [editandoId, setEditandoId] = useState(null)
  const [editDraft, setEditDraft] = useState(VACIA)

  // ── Borrado (2 pasos) ──
  const [confirmDelete, setConfirmDelete] = useState(null)

  const nav = onNavigate || (() => {})

  useEffect(() => { cargar() }, [currentUser?.id])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 3200)
    return () => clearTimeout(t)
  }, [toast])

  const showToast = (msg) => setToast(msg)

  const cargar = async () => {
    if (!currentUser?.id) { setLoading(false); return }
    setLoading(true)
    try {
      const uid = currentUser.user_id || currentUser.id
      let prof = (currentUser && (currentUser.role || currentUser.full_name))
        ? currentUser : null
      if (!prof || !prof.role) {
        const { data, error: eProf } = await supabase
          .from('profiles').select('*')
          .eq('user_id', uid).maybeSingle()
        if (eProf) throw eProf
        prof = data || prof
      }
      setProfile(prof)
      if (!prof || prof.role !== 'admin') {
        setForbidden(true)
        setLoading(false)
        return
      }
      let query = supabase
        .from('commerces')
        .select('*')
        .order('is_premium', { ascending: false })
        .order('is_active', { ascending: false })
        .order('name', { ascending: true })
      // Si el admin tiene barrio, filtra por barrio. Si no, trae todos.
      if (prof.neighborhood_id) {
        query = query.eq('neighborhood_id', prof.neighborhood_id)
      }
      const { data, error } = await query.limit(200)
      if (error) throw error
      setComercios(ordenar(data || []))
    } catch (e) {
      console.error('[admin comercios] Error:', e)
      showToast(errMsg(e))
    } finally {
      setLoading(false)
    }
  }

  // ── Si viene params.editarComercio (desde el botón Editar del detalle),
  //     abrir automáticamente la edición de ese comercio.
  //     IMPORTANTE: si mostrarForm quedó en true (de una sesión anterior de
  //     alta), el form de CREATE se renderiza arriba y tapa el de edición.
  //     Por eso forzamos setMostrarForm(false) acá.
  //     Usamos un ref para no re-procesar el mismo id (sino, al cancelar la
  //     edición, el useEffect reabriría el form porque params sigue igual).
  //     Si params cambia a un NUEVO id, reseteamos el ref para que procese.
  const editarProcesadoRef = useRef(null)
  useEffect(() => {
    const target = params?.editarComercio
    const id = typeof target === 'string' ? target : target?.id
    // Si cambió a un nuevo id distinto al último procesado, reseteamos el ref.
    if (id && editarProcesadoRef.current && editarProcesadoRef.current !== id) {
      editarProcesadoRef.current = null
    }
    if (target && id && editarProcesadoRef.current !== id) {
      editarProcesadoRef.current = id
      // Asegurar que el form de CREATE NO esté visible (sino tapa el de edición).
      setMostrarForm(false)
      const c = typeof target === 'string' ? null : target
      if (c && c.id) {
        empezarEdit(c)
      } else if (typeof target === 'string' && comercios.length > 0) {
        const found = comercios.find(x => x.id === target)
        if (found) empezarEdit(found)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.editarComercio, comercios])

  // ── TOGGLE is_active ──
  const toggleActive = async (c) => {
    const nuevo = !c.is_active
    setComercios(prev => ordenar(prev.map(x => x.id === c.id ? { ...x, is_active: nuevo } : x)))
    try {
      const { error } = await supabase
        .from('commerces')
        .update({ is_active: nuevo })
        .eq('id', c.id)
      if (error) throw error
      showToast(nuevo ? 'Comercio activado ✅' : 'Comercio desactivado ⏸️')
    } catch (e) {
      console.error('[admin comercios] toggleActive:', e)
      setComercios(prev => ordenar(prev.map(x => x.id === c.id ? { ...x, is_active: !nuevo } : x)))
      showToast(errMsg(e))
    }
  }

  // ── TOGGLE is_premium ──
  const togglePremium = async (c) => {
    const nuevo = !c.is_premium
    setComercios(prev => ordenar(prev.map(x => x.id === c.id ? { ...x, is_premium: nuevo } : x)))
    try {
      const { error } = await supabase
        .from('commerces')
        .update({ is_premium: nuevo })
        .eq('id', c.id)
      if (error) throw error
      showToast(nuevo ? '⭐ Comercio destacado' : 'Quitado de destacados')
    } catch (e) {
      console.error('[admin comercios] togglePremium:', e)
      setComercios(prev => ordenar(prev.map(x => x.id === c.id ? { ...x, is_premium: !nuevo } : x)))
      showToast(errMsg(e))
    }
  }

  // ── ALTA ──
  const abrirAlta = () => {
    // neighborhood_id se autocompleta desde el perfil del admin al guardar.
    setNueva(VACIA)
    setMostrarForm(true)
  }
  const cancelarAlta = () => {
    setMostrarForm(false)
    setNueva(VACIA)
  }
  const guardarAlta = async () => {
    if (!nueva.name.trim()) {
      showToast('Falta el nombre del comercio.')
      return
    }
    setGuardando(true)
    try {
      const payload = {
        name: nueva.name.trim(),
        category: nueva.category || 'Otro',
        description: nueva.description.trim() || null,
        address: nueva.address.trim() || null,
        phone: nueva.phone.trim() || null,
        email: nueva.email.trim() || null,
        website: nueva.website.trim() || null,
        instagram: nueva.instagram.trim() || null,
        logo_url: nueva.logo_url.trim() || null,
        cover_url: nueva.cover_url.trim() || null,
        gallery: nueva.gallery.trim()
          ? nueva.gallery.split('\n').map(s => s.trim()).filter(Boolean)
          : null,
        discount_text: nueva.discount_text.trim() || null,
        opening_hours: limpiarHoras(nueva.opening_hours),
        lat: toNum(nueva.lat),
        lng: toNum(nueva.lng),
        is_active: !!nueva.is_active,
        is_premium: !!nueva.is_premium,
        neighborhood_id: profile?.neighborhood_id || null,
      }
      console.log('[admin comercios] insertando:', payload)
      const { data, error } = await supabase
        .from('commerces')
        .insert(payload)
        .select()
      if (error) throw error
      if (data && data[0]) {
        setComercios(prev => ordenar([...prev, data[0]]))
      }
      setMostrarForm(false)
      setNueva(VACIA)
      showToast('Comercio agregado ✅')
    } catch (e) {
      console.error('[admin comercios] alta:', e)
      showToast(errMsg(e))
    } finally {
      setGuardando(false)
    }
  }

  // ── EDICIÓN ──
  const empezarEdit = (c) => {
    setEditandoId(c.id)
    // Normalizar opening_hours: acepta objeto o string JSON, default {}.
    let horasInicial = {}
    if (c.opening_hours) {
      if (typeof c.opening_hours === 'string') {
        try { horasInicial = JSON.parse(c.opening_hours) || {} } catch (_) { horasInicial = {} }
      } else if (typeof c.opening_hours === 'object') {
        horasInicial = c.opening_hours
      }
    }
    setEditDraft({
      name: c.name || '',
      category: c.category || (c.categories && c.categories[0]) || 'Otro',
      description: c.description || '',
      address: c.address || '',
      phone: c.phone || '',
      email: c.email || '',
      website: c.website || '',
      instagram: c.instagram || '',
      logo_url: c.logo_url || '',
      cover_url: c.cover_url || '',
      gallery: Array.isArray(c.gallery) ? c.gallery.join('\n') : (c.gallery || ''),
      discount_text: c.discount_text || '',
      opening_hours: horasInicial,
      lat: (c.lat != null && c.lat !== '') ? String(c.lat) : '',
      lng: (c.lng != null && c.lng !== '') ? String(c.lng) : '',
      is_active: !!c.is_active,
      is_premium: !!c.is_premium,
    })
  }
  const cancelarEdit = () => {
    setEditandoId(null)
    setEditDraft(VACIA)
  }
  const guardarEdit = async (id) => {
    if (!editDraft.name.trim()) {
      showToast('Falta el nombre del comercio.')
      return
    }
    setGuardando(true)
    try {
      const payload = {
        name: editDraft.name.trim(),
        category: editDraft.category || 'Otro',
        description: editDraft.description.trim() || null,
        address: editDraft.address.trim() || null,
        phone: editDraft.phone.trim() || null,
        email: editDraft.email.trim() || null,
        website: editDraft.website.trim() || null,
        instagram: editDraft.instagram.trim() || null,
        logo_url: editDraft.logo_url.trim() || null,
        cover_url: editDraft.cover_url.trim() || null,
        gallery: editDraft.gallery.trim()
          ? editDraft.gallery.split('\n').map(s => s.trim()).filter(Boolean)
          : null,
        discount_text: editDraft.discount_text.trim() || null,
        opening_hours: limpiarHoras(editDraft.opening_hours),
        lat: toNum(editDraft.lat),
        lng: toNum(editDraft.lng),
        is_active: !!editDraft.is_active,
        is_premium: !!editDraft.is_premium,
        neighborhood_id: profile?.neighborhood_id || null,
      }
      console.log('[admin comercios] actualizando:', payload)
      const { data, error } = await supabase
        .from('commerces')
        .update(payload)
        .eq('id', id)
        .select()
      if (error) throw error
      if (data && data[0]) {
        setComercios(prev => ordenar(prev.map(x => x.id === id ? { ...x, ...data[0] } : x)))
      }
      setEditandoId(null)
      setEditDraft(VACIA)
      showToast('Cambios guardados ✅')
    } catch (e) {
      console.error('[admin comercios] edit:', e)
      showToast(errMsg(e))
    } finally {
      setGuardando(false)
    }
  }

  // ── BORRADO (2 pasos) ──
  const pedirConfirm = (c) => setConfirmDelete(c)
  const cancelarDelete = () => setConfirmDelete(null)
  const confirmarDelete = async () => {
    const c = confirmDelete
    if (!c) return
    try {
      const { error } = await supabase
        .from('commerces')
        .delete()
        .eq('id', c.id)
      if (error) throw error
      setComercios(prev => prev.filter(x => x.id !== c.id))
      setConfirmDelete(null)
      showToast('Comercio eliminado 🗑️')
    } catch (e) {
      console.error('[admin comercios] delete:', e)
      showToast(errMsg(e))
    }
  }

  // ── FILTRO POR BÚSQUEDA ──
  const q = busqueda.trim().toLowerCase()
  const filtrados = q
    ? comercios.filter((c) => {
        const nombre = (c.name || '').toLowerCase()
        const cat = (c.category || '').toLowerCase()
        const cats = Array.isArray(c.categories)
          ? c.categories.join(' ').toLowerCase()
          : ''
        return nombre.includes(q) || cat.includes(q) || cats.includes(q)
      })
    : comercios

  // ── COUNTS PARA RESUMEN ──
  const stats = comercios.reduce((acc, c) => {
    acc.total++
    if (c.is_active) acc.activos++
    if (c.is_premium) acc.premium++
    return acc
  }, { total: 0, activos: 0, premium: 0 })

  // ── RENDER ──
  if (loading) {
    return (
      <div style={s.wrap}>
        <Header onBack={() => nav('back')} />
        <div style={s.cargando}>
          <div style={{ fontSize: 44 }}>🏪</div>
          <div style={{ fontSize: 14, color: C.textoTenue, marginTop: 10 }}>
            Cargando comercios…
          </div>
        </div>
      </div>
    )
  }

  if (forbidden) {
    return (
      <div style={s.wrap}>
        <Header onBack={() => nav('back')} />
        <div style={s.scroll}>
          <PantallaPermiso onVolver={() => nav('back')} />
        </div>
      </div>
    )
  }

  return (
    <div style={s.wrap}>
      <Header onBack={() => nav('back')} />

      <div style={s.scroll}>
        {/* ══════ STATS RÁPIDAS ══════ */}
        <div style={s.statsRow}>
          <div style={{ ...s.statMini, background: C.verdeBg }}>
            <div style={{ ...s.statMiniNum, color: C.verdeOsc }}>{stats.total}</div>
            <div style={s.statMiniLabel}>Total</div>
          </div>
          <div style={{ ...s.statMini, background: C.azulSuave }}>
            <div style={{ ...s.statMiniNum, color: C.azul }}>{stats.activos}</div>
            <div style={s.statMiniLabel}>Activos</div>
          </div>
          <div style={{ ...s.statMini, background: C.doradoSuave }}>
            <div style={{ ...s.statMiniNum, color: C.dorado }}>{stats.premium}</div>
            <div style={s.statMiniLabel}>⭐ Premium</div>
          </div>
        </div>

        {/* ══════ RESUMEN + ALTA ══════ */}
        <div style={s.topRow}>
          <div style={s.resumen}>
            <span style={s.resumenNum}>{comercios.length}</span>
            <span style={s.resumenTxt}>
              comercio{comercios.length === 1 ? '' : 's'} registrado{comercios.length === 1 ? '' : 's'}
            </span>
          </div>
          <button style={s.btnAdd} onClick={abrirAlta} disabled={mostrarForm}>
            <span style={{ fontSize: 16, fontWeight: 700 }}>+</span>
            <span>Agregar</span>
          </button>
        </div>

        {/* ══════ BUSCADOR ══════ */}
        <div style={s.buscarWrap}>
          <span style={s.buscarIcono}>🔍</span>
          <input
            style={s.buscarInput}
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder='Buscar por nombre o categoría…'
          />
          {busqueda && (
            <button style={s.buscarClear} onClick={() => setBusqueda('')}>
              ✕
            </button>
          )}
        </div>

        {/* ══════ FORM DE ALTA ══════ */}
        {mostrarForm && (
          <FormComercio
            titulo='Nuevo comercio'
            values={nueva}
            onChange={setNueva}
            onGuardar={guardarAlta}
            onCancelar={cancelarAlta}
            guardando={guardando}
            onToast={showToast}
          />
        )}

        {/* ══════ LISTA ══════ */}
        {/* Si estamos editando un comercio que no está en la lista filtrada
            (ej: vino de params.editarComercio y la lista aún no cargó o el
            filtro de barrio lo excluye), mostramos el form de edición arriba. */}
        {editandoId && !filtrados.some(x => x.id === editandoId) && !mostrarForm && (
          <FormComercio
            titulo='Editar comercio'
            values={editDraft}
            onChange={setEditDraft}
            onGuardar={() => guardarEdit(editandoId)}
            onCancelar={cancelarEdit}
            guardando={guardando}
            onToast={showToast}
            commerceId={editandoId}
          />
        )}
        {filtrados.length === 0 && !mostrarForm && !editandoId ? (
          <div style={s.vacio}>
            <div style={s.vacioEmoji}>🏪</div>
            <div style={s.vacioTit}>
              {busqueda ? 'No hay coincidencias' : 'No hay comercios'}
            </div>
            <div style={s.vacioTxt}>
              {busqueda
                ? 'Probá con otro nombre o categoría.'
                : 'Los comercios que se sumen a el barrio van a aparecer acá.'}
            </div>
            {!busqueda && (
              <button style={s.vacioCta} onClick={abrirAlta}>
                + Agregar el primero
              </button>
            )}
          </div>
        ) : (
          <div style={s.lista}>
            {filtrados.map((c) => {
              if (editandoId === c.id) {
                return (
                  <FormComercio
                    key={c.id}
                    titulo='Editar comercio'
                    values={editDraft}
                    onChange={setEditDraft}
                    onGuardar={() => guardarEdit(c.id)}
                    onCancelar={cancelarEdit}
                    guardando={guardando}
                    onToast={showToast}
                    commerceId={c.id}
                  />
                )
              }
              return (
                <ComercioCard
                  key={c.id}
                  c={c}
                  onToggleActive={() => toggleActive(c)}
                  onTogglePremium={() => togglePremium(c)}
                  onEdit={() => empezarEdit(c)}
                  onDelete={() => pedirConfirm(c)}
                  confirmando={confirmDelete?.id === c.id}
                  onConfirmDelete={confirmarDelete}
                  onCancelDelete={cancelarDelete}
                />
              )
            })}
          </div>
        )}

        {/* ══════ INFO ══════ */}
        <div style={s.infoBox}>
          💡 <strong>Activo</strong>: aparece en el directorio del barrio.{' '}
          <strong>Premium</strong>: aparece destacado arriba con ribbon.
        </div>
      </div>

      {toast && <div style={s.toast}>{toast}</div>}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// CARD DE COMERCIO
// ──────────────────────────────────────────────────────────────
function ComercioCard({
  c,
  onToggleActive,
  onTogglePremium,
  onEdit,
  onDelete,
  confirmando,
  onConfirmDelete,
  onCancelDelete,
}) {
  const activo = !!c.is_active
  const premium = !!c.is_premium
  const cat = c.category || (c.categories && c.categories[0]) || 'Otro'
  const emoji = emojiDeCat(cat)
  const colorCat = colorDeCat(cat)
  const bgCat = bgDeCat(cat)

  return (
    <div style={{
      ...s.card,
      opacity: activo ? 1 : 0.65,
      borderLeft: `4px solid ${premium ? C.dorado : (activo ? C.verde : C.borde)}`,
    }}>
      <div style={s.cardTop}>
        {/* Logo o emoji fallback */}
        {c.logo_url ? (
          <img src={c.logo_url} alt={c.name || ''} style={s.cardLogo} />
        ) : (
          <div style={{ ...s.cardEmoji, background: bgCat, color: colorCat }}>
            {emoji}
          </div>
        )}

        <div style={s.cardTexto}>
          <div style={s.cardTitRow}>
            <span style={s.cardTit}>{c.name || 'Sin nombre'}</span>
            {premium && <span style={s.premiumBadge}>⭐ PREMIUM</span>}
          </div>
          <div style={s.cardSubRow}>
            {cat && <span style={s.cardCat}>{cat}</span>}
            {c.address && (
              <span style={s.cardMetaItem}>📍 {c.address}</span>
            )}
          </div>
          {(c.discount_text || c.rating || c.phone) && (
            <div style={s.cardSubRow}>
              {c.discount_text && (
                <span style={s.cardMetaItem}>🎁 {c.discount_text}</span>
              )}
              {c.rating != null && Number(c.rating) > 0 && (
                <span style={s.cardMetaItem}>
                  ⭐ {Number(c.rating).toFixed(1)}
                  {c.total_reviews ? ` (${c.total_reviews})` : ''}
                </span>
              )}
              {c.phone && (
                <span style={s.cardMetaItem}>📞 {c.phone}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* TOGGLES + ACCIONES */}
      {confirmando ? (
        <div style={s.togglesRow}>
          <span style={s.confirmTxt}>¿Eliminar este comercio?</span>
          <button style={s.btnCancelarChico} onClick={onCancelDelete}>Cancelar</button>
          <button style={s.btnBorrarConfirm} onClick={onConfirmDelete}>🗑️ Sí, borrar</button>
        </div>
      ) : (
        <div style={s.togglesRow}>
          <button
            style={{
              ...s.toggleBtn,
              background: activo ? C.verde : C.borde,
              color: activo ? '#fff' : C.textoSuave,
            }}
            onClick={onToggleActive}
          >
            {activo ? '✅ Activo' : '⏸️ Inactivo'}
          </button>
          <button
            style={{
              ...s.toggleBtn,
              background: premium ? C.dorado : C.fondo,
              color: premium ? '#fff' : C.dorado,
              border: premium ? 'none' : `1px solid ${C.doradoSuave}`,
            }}
            onClick={onTogglePremium}
          >
            {premium ? '⭐ Destacado' : '☆ Destacar'}
          </button>
          <button style={s.btnEdit} onClick={onEdit}>
            ✏️ Editar
          </button>
          <button style={s.btnBorrar} onClick={onDelete}>
            🗑️ Eliminar
          </button>
        </div>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// FORMULARIO (alta o edición)
// ──────────────────────────────────────────────────────────────
function FormComercio({ titulo, values, onChange, onGuardar, onCancelar, guardando, onToast, commerceId }) {
  const set = (campo, val) => onChange({ ...values, [campo]: val })
  const [uploading, setUploading] = useState(false)
  // Lista de categorías: usa COMERCIOS_CATS de design.js (no hardcodear).
  // Fallback defensivo a Object.keys(COMERCIOS) si por algún motivo no viniera.
  const cats = (Array.isArray(COMERCIOS_CATS) && COMERCIOS_CATS.length)
    ? COMERCIOS_CATS
    : (COMERCIOS ? Object.keys(COMERCIOS) : ['Otro'])

  // Setea un día específico del objeto opening_hours.
  const setHora = (dia, val) => {
    const horasActuales = values.opening_hours || {}
    set('opening_hours', { ...horasActuales, [dia]: val })
  }

  // Maneja la subida de archivo → setea el campo correspondiente con la URL pública.
  const handleUpload = async (e, campo, carpeta) => {
    const input = e.target
    const file = input.files && input.files[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await subirImagen(file, carpeta, onToast)
      if (url) set(campo, url)
    } finally {
      setUploading(false)
      try { input.value = '' } catch (_) {}
    }
  }

  return (
    <div style={s.formCard}>
      <div style={s.formTit}>{titulo}</div>

      {/* Nombre */}
      <Field label='Nombre *'>
        <input
          style={s.input}
          value={values.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder='Panadería Don Luis'
          autoFocus
        />
      </Field>

      {/* Categoría — datalist: elegí de la lista O escribí una nueva */}
      <Field label='Categoría' helper='Elegí de la lista o escribí una nueva'>
        <input
          style={s.input}
          list='lista-categorias-comercio'
          value={values.category}
          onChange={(e) => set('category', e.target.value)}
          placeholder='Panadería, Peluquería, Verdulería…'
          autoComplete='off'
        />
        <datalist id='lista-categorias-comercio'>
          {cats.map((k) => {
            const meta = COMERCIOS && COMERCIOS[k]
            const e = meta && meta.emoji ? meta.emoji + ' ' : ''
            return (
              <option key={k} value={k}>{e}{k}</option>
            )
          })}
        </datalist>
      </Field>

      {/* Descripción */}
      <Field label='Descripción'>
        <textarea
          style={s.textarea}
          value={values.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder='El pan amasado más rico del barrio. Encargos al WhatsApp.'
          rows={3}
        />
      </Field>

      {/* Dirección */}
      <Field label='Dirección'>
        <input
          style={s.input}
          value={values.address}
          onChange={(e) => set('address', e.target.value)}
          placeholder='Av. Las Hualtatas 1234'
        />
      </Field>

      {/* Teléfono + Email */}
      <div style={s.formRow}>
        <Field label='Teléfono'>
          <input
            style={s.input}
            value={values.phone}
            onChange={(e) => set('phone', e.target.value)}
            placeholder='+56 2 2345 6789'
          />
        </Field>
        <Field label='Email'>
          <input
            style={s.input}
            type='email'
            value={values.email}
            onChange={(e) => set('email', e.target.value)}
            placeholder='hola@comercio.cl'
          />
        </Field>
      </div>

      {/* Website */}
      <Field label='Sitio web'>
        <input
          style={s.input}
          type='url'
          value={values.website}
          onChange={(e) => set('website', e.target.value)}
          placeholder='https://…'
        />
      </Field>

      {/* Instagram — se guarda en columna `instagram` de commerces
          (ver fix_promos_rls.sql para agregar la columna si no existe). */}
      <Field
        label='Instagram'
        helper='Usuario (@usuario) o URL completa. Aparece como botón rosa en el detalle.'
      >
        <input
          style={s.input}
          value={values.instagram}
          onChange={(e) => set('instagram', e.target.value)}
          placeholder='@micomerco o https://instagram.com/micomerco'
          autoComplete='off'
        />
      </Field>

      {/* Descuento / Promo */}
      <Field
        label='Descuento / Promo'
        helper='Ej: 20% OFF, 2x1, Envío gratis'
      >
        <input
          style={s.input}
          value={values.discount_text}
          onChange={(e) => set('discount_text', e.target.value)}
          placeholder='20% OFF'
        />
      </Field>

      {/* Horarios de atención */}
      <Field
        label='Horarios de atención'
        helper='Formato: 09:00-22:00 o "Cerrado"'
      >
        <div style={s.horasWrap}>
          {DIAS.map((d) => (
            <div key={d.k} style={s.horaRow}>
              <span style={s.horaLabel}>{d.label}</span>
              <input
                style={s.horaInput}
                value={(values.opening_hours && values.opening_hours[d.k]) || ''}
                onChange={(e) => setHora(d.k, e.target.value)}
                placeholder='09:00-22:00'
              />
            </div>
          ))}
        </div>
      </Field>

      {/* Logo (subida + URL) */}
      <Field
        label='Logo'
        helper='Subí un archivo o pegá la URL'
      >
        {values.logo_url && (
          <img src={values.logo_url} alt='Logo' style={s.imgPreview} />
        )}
        <input
          type='file'
          accept='image/*'
          style={s.fileInput}
          onChange={(e) => handleUpload(e, 'logo_url', 'logos')}
          disabled={uploading}
        />
        <input
          style={{ ...s.input, marginTop: 6 }}
          type='url'
          value={values.logo_url}
          onChange={(e) => set('logo_url', e.target.value)}
          placeholder='https://…/logo.png'
        />
      </Field>

      {/* Foto de portada (subida + URL) */}
      <Field
        label='Foto de portada'
        helper='Subí un archivo o pegá la URL'
      >
        {values.cover_url && (
          <img src={values.cover_url} alt='Portada' style={s.imgPreview} />
        )}
        <input
          type='file'
          accept='image/*'
          style={s.fileInput}
          onChange={(e) => handleUpload(e, 'cover_url', 'covers')}
          disabled={uploading}
        />
        <input
          style={{ ...s.input, marginTop: 6 }}
          type='url'
          value={values.cover_url}
          onChange={(e) => set('cover_url', e.target.value)}
          placeholder='https://…/portada.jpg'
        />
        {uploading && <div style={s.uploadingTxt}>⏳ Subiendo…</div>}
      </Field>

      {/* Galería de imágenes (slider en el feed + detalle)
          Uploader MÚLTIPLE con previews y borrado individual.
          Internamente gallery se guarda como string de URLs separadas
          por salto de línea (igual que antes), pero acá se manipula
          como array para que sea fácil subir/borrar. */}
      <Field
        label='Galería de imágenes'
        helper='Subí varias fotos (se ven como carrusel en el comercio). Podés borrar cada una con la ✕.'
      >
        {(() => {
          // gallery es un string de URLs separadas por \n. Lo parseamos a array.
          const galArr = (values.gallery || '')
            .split('\n').map(s => s.trim()).filter(Boolean)
          return (
            <>
              {/* Previews en grid */}
              {galArr.length > 0 && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 8, marginBottom: 10,
                }}>
                  {galArr.map((url, i) => (
                    <div key={i + url} style={{
                      position: 'relative', borderRadius: 10, overflow: 'hidden',
                      aspectRatio: '1 / 1', background: C.fondo,
                      border: `1px solid ${C.borde}`,
                    }}>
                      <img src={url} alt={`Foto ${i + 1}`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        loading='lazy'
                        onError={(e) => { e.target.style.opacity = 0.3 }}
                      />
                      {/* Botón borrar */}
                      <button
                        type='button'
                        onClick={() => {
                          const nuevo = galArr.filter((_, idx) => idx !== i)
                          set('gallery', nuevo.join('\n'))
                        }}
                        style={{
                          position: 'absolute', top: 4, right: 4,
                          width: 24, height: 24, borderRadius: '50%',
                          background: 'rgba(220,38,38,0.92)', color: '#fff',
                          border: '1.5px solid #fff', cursor: 'pointer',
                          fontSize: 13, fontWeight: 700, lineHeight: 1,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          padding: 0, fontFamily: 'inherit',
                          boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                        }}
                        aria-label='Borrar foto'
                        title='Borrar esta foto'
                      >✕</button>
                      {/* Badge número */}
                      <span style={{
                        position: 'absolute', bottom: 4, left: 4,
                        background: 'rgba(0,0,0,0.6)', color: '#fff',
                        fontSize: 10, fontWeight: 700, padding: '2px 6px',
                        borderRadius: 6,
                      }}>{i + 1}</span>
                    </div>
                  ))}
                </div>
              )}
              {/* Input file múltiple */}
              <input
                type='file'
                accept='image/*'
                multiple
                style={s.fileInput}
                onChange={async (e) => {
                  const input = e.target
                  const files = Array.from(input.files || [])
                  if (!files.length) return
                  setUploading(true)
                  try {
                    const nuevas = []
                    for (const f of files) {
                      const url = await subirImagen(f, 'gallery', onToast)
                      if (url) nuevas.push(url)
                    }
                    if (nuevas.length) {
                      const combinado = [...galArr, ...nuevas].join('\n')
                      set('gallery', combinado)
                      if (onToast) onToast(`${nuevas.length} imagen(es) agregada(s) a la galería`)
                    }
                  } finally {
                    setUploading(false)
                    try { input.value = '' } catch (_) {}
                  }
                }}
                disabled={uploading}
              />
              {uploading && <div style={s.uploadingTxt}>⏳ Subiendo imágenes…</div>}
              {/* Helper: también se puede pegar URL manual */}
              <input
                style={{ ...s.input, marginTop: 8 }}
                type='url'
                placeholder='O pegá una URL y presioná Enter para agregar'
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    const v = e.target.value.trim()
                    if (v) {
                      const combinado = [...galArr, v].join('\n')
                      set('gallery', combinado)
                      e.target.value = ''
                    }
                  }
                }}
              />
            </>
          )
        })()}
      </Field>

      {/* Ubicación (mapa con buscador de dirección) */}
      <Field
        label='Ubicación'
        helper='Escribí la dirección y tocá Buscar, o hacé clic en el mapa'
      >
        <MapaPicker
          lat={values.lat}
          lng={values.lng}
          direccion={values.address}
          onPick={(la, ln) => {
            set('lat', String(la))
            set('lng', String(ln))
          }}
        />
      </Field>

      {/* Toggles is_active / is_premium */}
      <div style={s.formRow}>
        <Field label='Estado'>
          <button
            type='button'
            style={{
              ...s.togglePill,
              background: values.is_active ? C.verde : C.borde,
              color: values.is_active ? '#fff' : C.textoSuave,
              marginTop: 4,
              height: 42,
              width: '100%',
            }}
            onClick={() => set('is_active', !values.is_active)}
          >
            {values.is_active ? '✅ Activo' : '⏸️ Inactivo'}
          </button>
        </Field>
        <Field label='Premium'>
          <button
            type='button'
            style={{
              ...s.togglePill,
              background: values.is_premium ? C.dorado : C.fondo,
              color: values.is_premium ? '#fff' : C.dorado,
              border: values.is_premium ? 'none' : `1px solid ${C.doradoSuave}`,
              marginTop: 4,
              height: 42,
              width: '100%',
            }}
            onClick={() => set('is_premium', !values.is_premium)}
          >
            {values.is_premium ? '⭐ Destacado' : '☆ No destacado'}
          </button>
        </Field>
      </div>

      {/* Acciones */}
      <div style={s.formAcciones}>
        <button style={s.btnCancelar} onClick={onCancelar} disabled={guardando || uploading}>
          ✕ Cancelar
        </button>
        <button style={s.btnGuardar} onClick={onGuardar} disabled={guardando || uploading}>
          {guardando ? 'Guardando…' : '💾 Guardar'}
        </button>
      </div>

      {/* ── PROMOCIONES EXISTENTES (solo en modo edición) ──
          Lista las promos del comercio con un botón "Borrar" en cada una.
          Así el admin puede borrar promos stale directamente desde el form. */}
      {commerceId && (
        <PromosEditor commerceId={commerceId} onToast={onToast} />
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// PROMOS EDITOR — lista promos de un comercio con botón borrar
// (solo se renderiza dentro del FormComercio en modo edición)
// ──────────────────────────────────────────────────────────────
function PromosEditor({ commerceId, onToast }) {
  const [promos, setPromos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [borrandoId, setBorrandoId] = useState(null)

  const cargar = async () => {
    if (!commerceId) return
    setCargando(true)
    try {
      const { data, error } = await supabase
        .from('commerce_promos')
        .select('*')
        .eq('commerce_id', commerceId)
        .order('created_at', { ascending: false })
      if (error) throw error
      const ahora = Date.now()
      const conVigencia = (data || []).map(p => ({
        ...p,
        _vigente: !p.expires_at ? true : new Date(p.expires_at).getTime() > ahora,
      }))
      setPromos(conVigencia)
    } catch (e) {
      console.warn('[promos editor] cargar:', e?.message)
      if (onToast) onToast('No se pudieron cargar las promos: ' + (e?.message || ''))
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => { cargar() }, [commerceId])

  const borrar = async (promoId) => {
    if (!promoId) return
    if (!confirm('¿Eliminar esta promoción? Se borra definitivamente.')) return
    setBorrandoId(promoId)
    try {
      const { error } = await supabase
        .from('commerce_promos')
        .delete()
        .eq('id', promoId)
      if (error) throw error
      setPromos(prev => prev.filter(p => p.id !== promoId))
      if (onToast) onToast('Promoción eliminada 🗑️')
    } catch (e) {
      console.warn('[promos editor] borrar:', e?.message)
      if (onToast) onToast('Error al borrar: ' + (e?.message || ''))
    } finally {
      setBorrandoId(null)
    }
  }

  return (
    <div style={s.promosBox}>
      <div style={s.promosTit}>🎁 Promociones de este comercio</div>
      <div style={s.promosSub}>
        Si una promo no corresponde (ej: descuento viejo que sigue apareciendo),
        borrala acá con el botón <strong>Borrar</strong>.
      </div>

      {cargando ? (
        <div style={s.promosEmpty}>Cargando promociones…</div>
      ) : promos.length === 0 ? (
        <div style={s.promosEmpty}>
          ✅ Sin promociones. Este comercio no tiene banners de descuento activos.
        </div>
      ) : (
        <div style={s.promosList}>
          {promos.map((p) => {
            const vigente = p._vigente
            return (
              <div key={p.id} style={s.promoItem}>
                <div style={s.promoItemMain}>
                  <div style={s.promoItemTit}>
                    {p.title || 'Promoción'}
                  </div>
                  {p.description && (
                    <div style={s.promoItemDesc}>{p.description}</div>
                  )}
                  <div style={{
                    ...s.promoItemBadge,
                    background: vigente ? C.verdeSuave : C.rojoBg,
                    color: vigente ? C.verdeOsc : C.rojo,
                    border: `1px solid ${vigente ? C.verdeSuave : C.rojoSuave}`,
                  }}>
                    {vigente ? '⏰ Vigente' : '⏰ Vencida'}
                    {!p.is_active && p.is_active !== undefined && ' · Inactiva'}
                  </div>
                </div>
                <button
                  style={{
                    ...s.btnBorrar,
                    marginLeft: 0,
                    flexShrink: 0,
                    opacity: borrandoId === p.id ? 0.6 : 1,
                  }}
                  onClick={() => borrar(p.id)}
                  disabled={borrandoId === p.id}
                >
                  {borrandoId === p.id ? '…' : '🗑️ Borrar'}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Field({ label, helper, children }) {
  return (
    <div style={s.field}>
      <label style={s.fieldLabel}>{label}</label>
      {children}
      {helper && <div style={s.fieldHelper}>{helper}</div>}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// MAPA LEAFLET — picker de lat/lng con buscador de dirección
// ──────────────────────────────────────────────────────────────

// Controller interno: captura clicks Y recientra el mapa cuando
// lat/lng cambian desde afuera (ej: después de buscar una dirección).
// DEFINIDO AFUERA de MapaPicker para evitar remounts en cada render.
function MapController({ lat, lng, onPick }) {
  const map = useMap()
  useEffect(() => {
    if (lat != null && lng != null && !isNaN(lat) && !isNaN(lng)) {
      map.setView([lat, lng], 16, { animate: true })
    }
  }, [lat, lng, map])
  useMapEvents({
    click(e) {
      if (onPick) onPick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

function MapaPicker({ lat, lng, onPick, direccion }) {
  const [busqueda, setBusqueda] = useState(direccion || '')
  const [buscando, setBuscando] = useState(false)
  const [errorBusq, setErrorBusq] = useState('')
  const [mostrarManual, setMostrarManual] = useState(false)
  const ultimaDirSync = useRef(direccion || '')

  // SINCRONIZAR el input de búsqueda con el campo "Dirección" del formulario.
  // Si el usuario cambia la dirección en el form y la búsqueda está vacía
  // o coincide con el valor anterior, la actualizamos para que pueda
  // buscar directamente sin re-escribir.
  useEffect(() => {
    const d = direccion || ''
    if (d && (busqueda === ultimaDirSync.current || !busqueda)) {
      setBusqueda(d)
    }
    ultimaDirSync.current = d
  }, [direccion]) // eslint-disable-line react-hooks/exhaustive-deps

  // invalidateSize: si el mapa nace dentro de un form/scroll, Leaflet no
  // calcula bien su tamaño. Disparamos un resize event para forzar el recálculo.
  useEffect(() => {
    const t = setTimeout(() => window.dispatchEvent(new Event('resize')), 250)
    return () => clearTimeout(t)
  }, [])

  // Parseo robusto: si el input no es un número válido, cae al default Santiago.
  const la = parseFloat(lat)
  const ln = parseFloat(lng)
  const tienePos = !isNaN(la) && !isNaN(ln)
  const numLat = tienePos ? la : -33.4489
  const numLng = tienePos ? ln : -70.6693

  // Geocoding con Nominatim (OpenStreetMap). Gratis, sin API key.
  // Mostramos el error real (no un mensaje genérico) para que el usuario
  // sepa si fue red, rate-limit, o dirección no encontrada.
  const buscarDireccion = async () => {
    const q = busqueda.trim()
    if (!q) {
      setErrorBusq('Escribí una dirección primero.')
      return
    }
    setBuscando(true)
    setErrorBusq('')
    try {
      // Agregamos ", Chile" si no está, para mejorar precisión.
      const query = q.toLowerCase().includes('chile') ? q : `${q}, Chile`
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=cl&q=${encodeURIComponent(query)}`
      const res = await fetch(url, { headers: { 'Accept-Language': 'es' } })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const arr = await res.json()
      if (arr && arr[0] && arr[0].lat && arr[0].lon) {
        const rLat = parseFloat(arr[0].lat)
        const rLon = parseFloat(arr[0].lon)
        onPick(rLat, rLon)
      } else {
        setErrorBusq(`No se encontró "${q}". Probá con más detalle, ej: "Av Las Condes 1234, Santiago".`)
      }
    } catch (e) {
      const msg = (e && e.message) || String(e)
      setErrorBusq(`Error al buscar: ${msg}. Revisá tu conexión a internet.`)
    } finally {
      setBuscando(false)
    }
  }

  return (
    <div>
      {/* Buscador de dirección */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        <input
          style={{
            flex: 1, height: 40, fontSize: 13.5, fontFamily: 'inherit',
            padding: '0 12px', color: C.texto, background: C.fondo,
            border: `1px solid ${C.borde}`, borderRadius: 10, outline: 'none',
            boxSizing: 'border-box',
          }}
          value={busqueda}
          onChange={(e) => { setBusqueda(e.target.value); setErrorBusq('') }}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); buscarDireccion() } }}
          placeholder='Ej: Av Las Condes 1234, Santiago'
          autoComplete='off'
        />
        <button
          type='button'
          style={{
            background: C.verde, color: '#fff', border: 'none',
            borderRadius: 10, padding: '0 14px', fontSize: 13, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
            boxShadow: '0 2px 8px rgba(22,163,74,0.20)',
            opacity: buscando ? 0.7 : 1,
          }}
          onClick={buscarDireccion}
          disabled={buscando}
        >
          {buscando ? 'Buscando…' : '🔍 Buscar'}
        </button>
      </div>

      {/* Mensaje de error (si lo hay) */}
      {errorBusq && (
        <div style={{
          fontSize: 12, color: '#dc2626', background: '#fef2f2',
          border: '1px solid #fecaca', borderRadius: 8,
          padding: '8px 10px', marginBottom: 8, lineHeight: 1.4,
        }}>
          ⚠️ {errorBusq}
        </div>
      )}

      <MapContainer
        center={[numLat, numLng]}
        zoom={16}
        style={{ height: 280, width: '100%', borderRadius: 12, zIndex: 0 }}
        scrollWheelZoom={false}
      >
        <TileLayer
          url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
          attribution='&copy; OpenStreetMap'
        />
        <MapController lat={numLat} lng={numLng} onPick={onPick} />
        <Marker position={[numLat, numLng]} />
      </MapContainer>

      {/* Coordenadas actuales + toggle manual */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 8, marginTop: 8, flexWrap: 'wrap',
      }}>
        <div style={{ fontSize: 11.5, color: C.textoTenue, lineHeight: 1.4 }}>
          {tienePos
            ? <>📍 Lat <strong style={{ color: C.texto }}>{la.toFixed(5)}</strong> · Lng <strong style={{ color: C.texto }}>{ln.toFixed(5)}</strong></>
            : '💡 Buscá la dirección arriba o tocá el mapa para fijar la ubicación.'}
        </div>
        <button
          type='button'
          onClick={() => setMostrarManual(!mostrarManual)}
          style={{
            background: 'transparent', border: 'none', color: C.verde,
            fontSize: 11.5, fontWeight: 700, cursor: 'pointer',
            fontFamily: 'inherit', padding: 0, textDecoration: 'underline',
          }}
        >
          {mostrarManual ? '− Ocultar manual' : '+ Ingresar coordenadas manual'}
        </button>
      </div>

      {/* Inputs manuales de lat/lng (fallback si la búsqueda falla) */}
      {mostrarManual && (
        <div style={{
          display: 'flex', gap: 8, marginTop: 8,
          background: C.fondo, padding: 10, borderRadius: 10,
          border: `1px solid ${C.borde}`,
        }}>
          <label style={{ flex: 1, fontSize: 11.5, color: C.textoTenue, display: 'flex', flexDirection: 'column', gap: 4 }}>
            Latitud
            <input
              type='number' step='any'
              style={{ ...s.input, height: 36, marginTop: 0 }}
              value={lat || ''}
              onChange={(e) => {
                const v = parseFloat(e.target.value)
                if (!isNaN(v)) onPick(v, ln)
              }}
              placeholder='-33.4489'
            />
          </label>
          <label style={{ flex: 1, fontSize: 11.5, color: C.textoTenue, display: 'flex', flexDirection: 'column', gap: 4 }}>
            Longitud
            <input
              type='number' step='any'
              style={{ ...s.input, height: 36, marginTop: 0 }}
              value={lng || ''}
              onChange={(e) => {
                const v = parseFloat(e.target.value)
                if (!isNaN(v)) onPick(la, v)
              }}
              placeholder='-70.6693'
            />
          </label>
        </div>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// PANTALLA "NO TIENES PERMISO"
// ──────────────────────────────────────────────────────────────
function PantallaPermiso({ onVolver }) {
  return (
    <div style={s.vacio}>
      <div style={s.vacioEmoji}>🔒</div>
      <div style={s.vacioTit}>No tienes permiso</div>
      <div style={s.vacioTxt}>
        Esta sección es solo para administradores de{' '}
        <span style={s.marca}>el barrio</span>.
      </div>
      <button style={s.vacioCta} onClick={onVolver}>← Volver</button>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// HEADER
// ──────────────────────────────────────────────────────────────
function Header({ onBack }) {
  return (
    <div style={s.header}>
      <button style={s.backBtn} onClick={onBack} aria-label="Volver">←</button>
      <div style={s.headerTit}>
        🏪 Comercios · <span style={s.marca}>el barrio</span>
      </div>
      <div style={{ width: 40 }} />
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

  /* ── stats mini ── */
  statsRow: {
    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 8, marginBottom: 12,
  },
  statMini: {
    borderRadius: 12, padding: '12px 8px',
    textAlign: 'center',
    border: '1px solid rgba(0,0,0,0.04)',
  },
  statMiniNum: {
    fontSize: 22, fontWeight: 800, letterSpacing: '-0.4px',
  },
  statMiniLabel: {
    fontSize: 12, fontWeight: 700, color: C.textoSuave, marginTop: 2,
  },

  /* ── top row (resumen + alta) ── */
  topRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 14, gap: 10,
  },
  resumen: {
    display: 'flex', alignItems: 'baseline', gap: 6,
  },
  resumenNum: { fontSize: 22, fontWeight: 800, color: C.texto },
  resumenTxt: { fontSize: 13.5, color: C.textoSuave, fontWeight: 500 },
  btnAdd: {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    background: C.verde, color: '#fff', border: 'none',
    padding: '9px 14px', borderRadius: 999,
    fontSize: 13.5, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit',
    boxShadow: '0 4px 12px rgba(22,163,74,0.20)',
  },

  /* ── buscar ── */
  buscarWrap: {
    display: 'flex', alignItems: 'center',
    background: C.card,
    border: `1px solid ${C.borde}`,
    borderRadius: 12, padding: '0 12px',
    marginBottom: 14,
    height: 44,
  },
  buscarIcono: { fontSize: 16, marginRight: 8, opacity: 0.7 },
  buscarInput: {
    flex: 1, border: 'none', outline: 'none',
    background: 'transparent',
    fontSize: 14, fontFamily: 'inherit', color: C.texto,
  },
  buscarClear: {
    background: C.fondo, border: 'none',
    width: 24, height: 24, borderRadius: '50%',
    color: C.textoSuave, cursor: 'pointer', padding: 0,
    fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },

  /* ── lista ── */
  lista: { display: 'flex', flexDirection: 'column', gap: 10 },

  /* ── card ── */
  card: {
    background: C.card,
    border: `1px solid ${C.borde}`,
    borderRadius: 16, padding: '14px 15px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
  },
  cardTop: {
    display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12,
  },
  cardLogo: {
    width: 48, height: 48, borderRadius: 12,
    objectFit: 'cover', flexShrink: 0,
    border: `1px solid ${C.borde}`,
  },
  cardEmoji: {
    width: 48, height: 48, borderRadius: 12,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 22, flexShrink: 0,
  },
  cardTexto: { flex: 1, minWidth: 0 },
  cardTitRow: {
    display: 'flex', alignItems: 'center', gap: 8,
    flexWrap: 'wrap',
  },
  cardTit: {
    fontSize: 15.5, fontWeight: 700, color: C.texto,
    letterSpacing: '-0.1px', lineHeight: 1.3,
  },
  premiumBadge: {
    fontSize: 10, fontWeight: 800, letterSpacing: 0.4,
    color: '#fff', background: C.dorado,
    padding: '2px 7px', borderRadius: 5,
  },
  cardSubRow: {
    display: 'flex', flexWrap: 'wrap', gap: 8,
    marginTop: 4, alignItems: 'center',
  },
  cardCat: {
    fontSize: 12.5, fontWeight: 700, color: C.textoSuave,
    background: C.fondo,
    padding: '2px 8px', borderRadius: 999,
  },
  cardMetaItem: {
    fontSize: 12.5, color: C.textoTenue, fontWeight: 500,
  },
  togglesRow: {
    display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center',
    borderTop: '1px solid rgba(0,0,0,0.05)',
    paddingTop: 12,
  },
  toggleBtn: {
    flexShrink: 0,
    border: 'none', borderRadius: 999,
    padding: '8px 12px', fontSize: 12.5, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit',
    whiteSpace: 'nowrap',
  },
  togglePill: {
    flexShrink: 0,
    border: 'none', borderRadius: 999,
    padding: '7px 11px', fontSize: 13, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit',
    whiteSpace: 'nowrap',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  },
  btnEdit: {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    background: C.fondo, border: `1px solid ${C.borde}`,
    color: C.texto, padding: '8px 12px', borderRadius: 999,
    fontSize: 12.5, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit',
  },
  btnBorrar: {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    background: C.rojoBg, border: `1px solid ${C.rojoSuave}`,
    color: C.rojo, padding: '8px 12px', borderRadius: 999,
    fontSize: 12.5, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit',
    marginLeft: 'auto',
  },
  confirmTxt: {
    fontSize: 13, fontWeight: 600, color: C.rojo, flex: 1,
  },
  btnCancelarChico: {
    background: C.fondo, border: `1px solid ${C.borde}`,
    color: C.textoSuave, padding: '8px 12px', borderRadius: 999,
    fontSize: 12.5, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit',
  },
  btnBorrarConfirm: {
    background: C.rojo, border: 'none',
    color: '#fff', padding: '8px 12px', borderRadius: 999,
    fontSize: 12.5, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit',
  },

  /* ── form ── */
  formCard: {
    background: C.card,
    border: `2px solid ${C.verde}`,
    borderRadius: 16, padding: '16px 16px',
    boxShadow: '0 4px 14px rgba(22,163,74,0.10)',
    marginBottom: 10,
  },
  formTit: {
    fontSize: 14, fontWeight: 800, color: C.verdeOsc,
    marginBottom: 12, letterSpacing: '-0.1px',
  },
  formRow: {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
  },
  field: { marginBottom: 11 },
  fieldLabel: {
    display: 'block', fontSize: 12.5, fontWeight: 700,
    color: C.textoSuave, marginBottom: 4,
  },
  fieldHelper: {
    fontSize: 11.5, fontWeight: 500, color: C.textoTenue,
    marginTop: 4, lineHeight: 1.3,
  },

  /* ── horarios (opening_hours) ── */
  horasWrap: {
    display: 'flex', flexDirection: 'column', gap: 6,
  },
  horaRow: {
    display: 'flex', alignItems: 'center', gap: 8,
  },
  horaLabel: {
    fontSize: 13, fontWeight: 700, color: C.textoSuave,
    width: 38, flexShrink: 0,
  },
  horaInput: {
    flex: 1, minWidth: 0,
    padding: '8px 12px',
    fontSize: 13, fontFamily: 'inherit',
    color: C.texto, background: C.fondo,
    border: `1px solid ${C.borde}`,
    borderRadius: 8,
    outline: 'none',
    boxSizing: 'border-box',
    height: 38,
  },

  /* ── mapa leaflet ── */
  mapWrap: {
    width: '100%', height: 200,
    borderRadius: 12, overflow: 'hidden',
    border: `1px solid ${C.borde}`,
    position: 'relative',
  },

  /* ── upload de imágenes ── */
  imgPreview: {
    display: 'block',
    width: '100%', maxHeight: 140,
    objectFit: 'cover', borderRadius: 10,
    marginBottom: 6,
    border: `1px solid ${C.borde}`,
  },
  fileInput: {
    width: '100%',
    fontSize: 13, fontFamily: 'inherit',
    padding: '8px 0',
    boxSizing: 'border-box',
    color: C.textoSuave,
  },
  uploadingTxt: {
    fontSize: 12, fontWeight: 600, color: C.dorado,
    marginTop: 4,
  },

  input: {
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
  textarea: {
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
    lineHeight: 1.45,
  },
  selectWrap: { position: 'relative', width: '100%' },
  select: {
    width: '100%',
    padding: '0 32px 0 12px',
    fontSize: 14, fontFamily: 'inherit',
    color: C.texto,
    background: C.fondo,
    border: `1px solid ${C.borde}`,
    borderRadius: 10,
    outline: 'none',
    boxSizing: 'border-box',
    height: 42,
    appearance: 'none',
    WebkitAppearance: 'none',
    MozAppearance: 'none',
    cursor: 'pointer',
  },
  selectFlecha: {
    position: 'absolute', right: 12, top: '50%',
    transform: 'translateY(-50%)',
    fontSize: 12, color: C.textoSuave, pointerEvents: 'none',
  },
  formAcciones: {
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
    background: C.verde, border: 'none',
    color: '#fff', padding: '11px 14px', borderRadius: 10,
    fontSize: 14, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit',
    boxShadow: '0 4px 12px rgba(22,163,74,0.22)',
  },

  /* ── vacío ── */
  vacio: {
    textAlign: 'center', padding: '40px 20px 28px',
    background: C.card, borderRadius: 18, border: `1px solid ${C.borde}`,
    marginTop: 10,
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
    background: C.verdeBg,
    border: `1px solid ${C.verdeSuave}`,
    borderRadius: 12,
    fontSize: 13, color: C.verdeOsc, lineHeight: 1.45,
    fontWeight: 500,
  },

  /* ── promos editor (dentro del form de edición) ── */
  promosBox: {
    marginTop: 16,
    padding: '12px 14px',
    background: C.rojoBg,
    border: `1px solid ${C.rojoSuave}`,
    borderRadius: 12,
  },
  promosTit: {
    fontSize: 13.5, fontWeight: 800, color: C.rojo,
    marginBottom: 4, letterSpacing: '-0.1px',
  },
  promosSub: {
    fontSize: 11.5, color: C.textoTenue, lineHeight: 1.4,
    marginBottom: 10,
  },
  promosEmpty: {
    fontSize: 12.5, color: C.textoSuave, fontWeight: 500,
    padding: '8px 0',
  },
  promosList: {
    display: 'flex', flexDirection: 'column', gap: 8,
  },
  promoItem: {
    display: 'flex', alignItems: 'flex-start', gap: 10,
    padding: '10px 10px',
    background: C.card,
    border: `1px solid ${C.borde}`,
    borderRadius: 10,
  },
  promoItemMain: { flex: 1, minWidth: 0 },
  promoItemTit: {
    fontSize: 13.5, fontWeight: 700, color: C.texto,
    marginBottom: 2, lineHeight: 1.3,
    overflow: 'hidden', textOverflow: 'ellipsis',
    display: '-webkit-box', WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  },
  promoItemDesc: {
    fontSize: 12, color: C.textoTenue, lineHeight: 1.4,
    marginBottom: 6,
  },
  promoItemBadge: {
    display: 'inline-flex', alignItems: 'center',
    fontSize: 10.5, fontWeight: 800,
    padding: '3px 8px', borderRadius: 999,
    letterSpacing: '0.2px',
  },

  /* ── toast ── */
  toast: {
    position: 'absolute', bottom: 26, left: '50%',
    transform: 'translateX(-50%)',
    background: C.texto, color: '#fff',
    padding: '11px 18px', borderRadius: 12,
    fontSize: 13, fontWeight: 600,
    boxShadow: '0 8px 22px rgba(0,0,0,0.20)',
    zIndex: 50, maxWidth: '92%',
    textAlign: 'center', lineHeight: 1.4,
  },
}
