import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { C, T, S, hace } from '../lib/design'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

/*
  AdminFarmacias — CRUD de farmacias de turno.

  Pantalla del panel admin. Solo visible para profile.role === 'admin'.
  Si no es admin, muestra "No tienes permiso".

  Funciones:
    · Lista todas las farmacias (tabla `farmacias`).
    · Cada farmacia es una card con nombre, dirección, comuna, horario,
      teléfono y toggles de is_active.
    · Botón "Agregar farmacia" abre un form inline (campos: nombre,
      direccion, comuna, horario, telefono, lat, lng, is_active, sort_order).
    · Editar inline: cada card tiene un botón ✏️ que la pasa a modo
      formulario. ✕ cancela, 💾 guarda.
    · Eliminar con confirmación (botón 🗑️ → "¿Seguro?" → 🗑️ Confirmar).
    · Toggle is_active directo en la card (sin abrir form).

  "el barrio" siempre minúscula y verde.
*/

const VACIA = {
  nombre: '',
  direccion: '',
  comuna: '',
  horario: '24 horas',
  telefono: '',
  lat: '',
  lng: '',
  is_active: true,
  sort_order: 0,
}

export default function AdminFarmacias({ currentUser, onNavigate }) {
  const [profile, setProfile] = useState(null)
  const [farmacias, setFarmacias] = useState([])
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [toast, setToast] = useState('')

  const [mostrarForm, setMostrarForm] = useState(false)        // form de alta
  const [nueva, setNueva] = useState(VACIA)
  const [guardando, setGuardando] = useState(false)

  const [editandoId, setEditandoId] = useState(null)           // id en edición
  const [editDraft, setEditDraft] = useState(VACIA)

  const [confirmDelete, setConfirmDelete] = useState(null)     // id pendiente de borrar

  const nav = onNavigate || (() => {})

  useEffect(() => { cargar() }, [currentUser?.id])

  useEffect(() => {
    if (!toast) return
    // 4000ms para dar tiempo a leer el mensaje (especialmente errores con detalle)
    const t = setTimeout(() => setToast(''), 4000)
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
        const { data } = await supabase
          .from('profiles').select('*')
          .eq('user_id', uid).maybeSingle()
        prof = data || prof
      }
      setProfile(prof)
      if (!prof || prof.role !== 'admin') {
        setForbidden(true)
        setLoading(false)
        return
      }
      const { data, error } = await supabase
        .from('farmacias')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('nombre', { ascending: true })
      if (error) throw error
      setFarmacias(data || [])
    } catch (e) {
      console.error('[admin farmacias] Error:', e)
      showToast('No pudimos cargar las farmacias.')
    } finally {
      setLoading(false)
    }
  }

  // ── Helper: parse numérico defensivo ──
  // Devuelve null para '', null, undefined o strings no-numéricos.
  // Evita NaN en el payload (que rompe el INSERT en Supabase).
  const parseNum = (v) => {
    if (v === '' || v === null || v === undefined) return null
    const n = parseFloat(v)
    return isNaN(n) ? null : n
  }

  // ── TOGGLE is_active (directo, sin abrir form) ──
  const toggleActive = async (f) => {
    const nuevo = !f.is_active
    setFarmacias(prev => prev.map(x => x.id === f.id ? { ...x, is_active: nuevo } : x))
    try {
      const { error } = await supabase
        .from('farmacias')
        .update({ is_active: nuevo })
        .eq('id', f.id)
      if (error) throw error
      showToast(nuevo ? 'Farmacia activada ✅' : 'Farmacia pausada ⏸️')
    } catch (e) {
      console.error('[admin farmacias] toggle error completo:', e)
      setFarmacias(prev => prev.map(x => x.id === f.id ? { ...x, is_active: !nuevo } : x))
      showToast('Error: ' + (e?.message || JSON.stringify(e)))
    }
  }

  // ── ALTA ──
  const abrirAlta = () => {
    setNueva(VACIA)
    setMostrarForm(true)
  }
  const cancelarAlta = () => {
    setMostrarForm(false)
    setNueva(VACIA)
  }
  const guardarAlta = async () => {
    if (!nueva.nombre.trim() || !nueva.direccion.trim()) {
      showToast('Falta nombre y dirección.')
      return
    }
    setGuardando(true)
    try {
      const payload = {
        nombre: nueva.nombre.trim(),
        direccion: nueva.direccion.trim(),
        comuna: nueva.comuna.trim() || null,
        horario: nueva.horario.trim() || '24 horas',
        telefono: nueva.telefono.trim() || null,
        lat: parseNum(nueva.lat),
        lng: parseNum(nueva.lng),
        is_active: !!nueva.is_active,
        sort_order: Number(nueva.sort_order) || 0,
      }
      console.log('[admin farmacias] insertando payload:', payload)
      const { data, error } = await supabase
        .from('farmacias')
        .insert(payload)
        .select()
      if (error) throw error
      if (data && data[0]) {
        setFarmacias(prev => [...prev, data[0]].sort((a, b) =>
          (a.sort_order || 0) - (b.sort_order || 0) || a.nombre.localeCompare(b.nombre)
        ))
      } else {
        // Fallback: el INSERT pudo haberse hecho pero .select() no devolvió la fila
        // (RLS a veces bloquea el SELECT post-INSERT aunque el INSERT haya tenido éxito).
        // Recargamos la lista completa desde el server.
        cargar()
      }
      setMostrarForm(false)
      setNueva(VACIA)
      showToast('Farmacia agregada ✅')
    } catch (e) {
      console.error('[admin farmacias] alta error completo:', e)
      showToast('Error: ' + (e?.message || JSON.stringify(e)))
    } finally {
      setGuardando(false)
    }
  }

  // ── EDICIÓN INLINE ──
  const empezarEdit = (f) => {
    setEditandoId(f.id)
    setEditDraft({
      nombre: f.nombre || '',
      direccion: f.direccion || '',
      comuna: f.comuna || '',
      horario: f.horario || '24 horas',
      telefono: f.telefono || '',
      lat: f.lat ?? '',
      lng: f.lng ?? '',
      is_active: !!f.is_active,
      sort_order: f.sort_order ?? 0,
    })
  }
  const cancelarEdit = () => {
    setEditandoId(null)
    setEditDraft(VACIA)
  }
  const guardarEdit = async (id) => {
    if (!editDraft.nombre.trim() || !editDraft.direccion.trim()) {
      showToast('Falta nombre y dirección.')
      return
    }
    setGuardando(true)
    try {
      const payload = {
        nombre: editDraft.nombre.trim(),
        direccion: editDraft.direccion.trim(),
        comuna: editDraft.comuna.trim() || null,
        horario: editDraft.horario.trim() || '24 horas',
        telefono: editDraft.telefono.trim() || null,
        lat: parseNum(editDraft.lat),
        lng: parseNum(editDraft.lng),
        is_active: !!editDraft.is_active,
        sort_order: Number(editDraft.sort_order) || 0,
      }
      console.log('[admin farmacias] actualizando payload (id=' + id + '):', payload)
      const { data, error } = await supabase
        .from('farmacias')
        .update(payload)
        .eq('id', id)
        .select()
      if (error) throw error
      if (data && data[0]) {
        setFarmacias(prev => prev
          .map(x => x.id === id ? { ...x, ...data[0] } : x)
          .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0) || a.nombre.localeCompare(b.nombre))
        )
      } else {
        // Fallback: UPDATE pudo tener éxito pero .select() no devolvió la fila.
        cargar()
      }
      setEditandoId(null)
      setEditDraft(VACIA)
      showToast('Cambios guardados ✅')
    } catch (e) {
      console.error('[admin farmacias] edit error completo:', e)
      showToast('Error: ' + (e?.message || JSON.stringify(e)))
    } finally {
      setGuardando(false)
    }
  }

  // ── BORRADO ──
  const pedirConfirm = (f) => setConfirmDelete(f)
  const cancelarDelete = () => setConfirmDelete(null)
  const confirmarDelete = async () => {
    const f = confirmDelete
    if (!f) return
    try {
      const { error } = await supabase
        .from('farmacias')
        .delete()
        .eq('id', f.id)
      if (error) throw error
      setFarmacias(prev => prev.filter(x => x.id !== f.id))
      setConfirmDelete(null)
      showToast('Farmacia eliminada 🗑️')
    } catch (e) {
      console.error('[admin farmacias] delete error completo:', e)
      showToast('Error: ' + (e?.message || JSON.stringify(e)))
    }
  }

  // ── RENDER ──
  if (loading) {
    return (
      <div style={s.wrap}>
        <Header onBack={() => nav('back')} />
        <div style={s.cargando}>
          <div style={{ fontSize: 44 }}>💊</div>
          <div style={{ fontSize: 14, color: C.textoTenue, marginTop: 10 }}>
            Cargando farmacias…
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
        {/* ══════ RESUMEN + ALTA ══════ */}
        <div style={s.topRow}>
          <div style={s.resumen}>
            <span style={s.resumenNum}>{farmacias.length}</span>
            <span style={s.resumenTxt}>
              farmacia{farmacias.length === 1 ? '' : 's'} registrada{farmacias.length === 1 ? '' : 's'}
            </span>
          </div>
          <button style={s.btnAdd} onClick={abrirAlta} disabled={mostrarForm}>
            <span style={{ fontSize: 16, fontWeight: 700 }}>+</span>
            <span>Agregar</span>
          </button>
        </div>

        {/* ══════ FORM DE ALTA ══════ */}
        {mostrarForm && (
          <FormFarmacia
            titulo='Nueva farmacia'
            values={nueva}
            onChange={setNueva}
            onGuardar={guardarAlta}
            onCancelar={cancelarAlta}
            guardando={guardando}
          />
        )}

        {/* ══════ LISTA ══════ */}
        {farmacias.length === 0 && !mostrarForm ? (
          <div style={s.vacio}>
            <div style={s.vacioEmoji}>💊</div>
            <div style={s.vacioTit}>No hay farmacias cargadas</div>
            <div style={s.vacioTxt}>
              Agregá las farmacias de turno de <span style={s.marca}>el barrio</span>{' '}
              para que aparezcan en el Inicio.
            </div>
            <button style={s.vacioCta} onClick={abrirAlta}>
              + Agregar la primera
            </button>
          </div>
        ) : (
          <div style={s.lista}>
            {farmacias.map((f) => {
              if (editandoId === f.id) {
                return (
                  <FormFarmacia
                    key={f.id}
                    titulo='Editar farmacia'
                    values={editDraft}
                    onChange={setEditDraft}
                    onGuardar={() => guardarEdit(f.id)}
                    onCancelar={cancelarEdit}
                    guardando={guardando}
                  />
                )
              }
              return (
                <FarmaciaCard
                  key={f.id}
                  f={f}
                  onToggle={() => toggleActive(f)}
                  onEdit={() => empezarEdit(f)}
                  onDelete={() => pedirConfirm(f)}
                  confirmando={confirmDelete?.id === f.id}
                  onConfirmDelete={confirmarDelete}
                  onCancelDelete={cancelarDelete}
                />
              )
            })}
          </div>
        )}

        {/* ══════ INFO ══════ */}
        <div style={s.infoBox}>
          💡 Las farmacias acá cargadas aparecen en la tira del Inicio. Las
          que tienen <strong>is_active</strong> apagado no se muestran, pero
          siguen guardadas.
        </div>
      </div>

      {toast && <div style={s.toast}>{toast}</div>}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// CARD DE FARMACIA
// ──────────────────────────────────────────────────────────────
function FarmaciaCard({ f, onToggle, onEdit, onDelete, confirmando, onConfirmDelete, onCancelDelete }) {
  const activa = !!f.is_active
  return (
    <div style={{
      ...s.card,
      opacity: activa ? 1 : 0.6,
      borderLeft: `4px solid ${activa ? C.verde : C.borde}`,
    }}>
      <div style={s.cardTop}>
        <div style={{ ...s.cardEmoji, background: C.verdeBg, color: C.verde }}>
          💊
        </div>
        <div style={s.cardTexto}>
          <div style={s.cardTit}>{f.nombre || 'Sin nombre'}</div>
          <div style={s.cardSub}>{f.direccion || 'Sin dirección'}</div>
        </div>
        <button
          style={{
            ...s.togglePill,
            background: activa ? C.verde : C.borde,
            color: activa ? '#fff' : C.textoSuave,
          }}
          onClick={onToggle}
        >
          {activa ? '✅ Activa' : '⏸️ Pausada'}
        </button>
      </div>

      <div style={s.cardMeta}>
        {f.comuna && (
          <span style={s.metaItem}>📍 {f.comuna}</span>
        )}
        <span style={s.metaItem}>🕐 {f.horario || '24 horas'}</span>
        {f.telefono && (
          <span style={s.metaItem}>📞 {f.telefono}</span>
        )}
        {f.sort_order != null && f.sort_order !== 0 && (
          <span style={s.metaItem}>🔢 Orden {f.sort_order}</span>
        )}
      </div>

      <div style={s.cardAcciones}>
        {confirmando ? (
          <>
            <span style={s.confirmTxt}>¿Eliminar esta farmacia?</span>
            <button style={s.btnCancelarChico} onClick={onCancelDelete}>Cancelar</button>
            <button style={s.btnBorrarConfirm} onClick={onConfirmDelete}>🗑️ Sí, borrar</button>
          </>
        ) : (
          <>
            <button style={s.btnEdit} onClick={onEdit}>✏️ Editar</button>
            <button style={s.btnBorrar} onClick={onDelete}>🗑️ Eliminar</button>
          </>
        )}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// FORMULARIO (alta o edición)
// ──────────────────────────────────────────────────────────────
function FormFarmacia({ titulo, values, onChange, onGuardar, onCancelar, guardando }) {
  const set = (campo, val) => onChange({ ...values, [campo]: val })
  return (
    <div style={s.formCard}>
      <div style={s.formTit}>{titulo}</div>

      <Field label='Nombre *'>
        <input
          style={s.input}
          value={values.nombre}
          onChange={(e) => set('nombre', e.target.value)}
          placeholder='Farmacia Cruz Verde'
          autoFocus
        />
      </Field>

      <Field label='Dirección *'>
        <input
          style={s.input}
          value={values.direccion}
          onChange={(e) => set('direccion', e.target.value)}
          placeholder='Av. Las Hualtatas 1234'
        />
      </Field>

      <div style={s.formRow}>
        <Field label='Comuna'>
          <input
            style={s.input}
            value={values.comuna}
            onChange={(e) => set('comuna', e.target.value)}
            placeholder='Las Condes'
          />
        </Field>
        <Field label='Horario'>
          <input
            style={s.input}
            value={values.horario}
            onChange={(e) => set('horario', e.target.value)}
            placeholder='24 horas'
          />
        </Field>
      </div>

      <Field label='Teléfono'>
        <input
          style={s.input}
          value={values.telefono}
          onChange={(e) => set('telefono', e.target.value)}
          placeholder='+56 2 2345 6789'
        />
      </Field>

      <Field label='Ubicación en el mapa'>
        <MapaPicker
          lat={values.lat}
          lng={values.lng}
          onPick={(la, ln) => onChange({ ...values, lat: la, lng: ln })}
          direccion={values.direccion}
        />
      </Field>

      <div style={s.formRow}>
        <Field label='Orden'>
          <input
            style={s.input}
            value={values.sort_order}
            onChange={(e) => set('sort_order', e.target.value)}
            placeholder='0'
            inputMode='numeric'
          />
        </Field>
        <Field label='Estado'>
          <button
            style={{
              ...s.togglePill,
              background: values.is_active ? C.verde : C.borde,
              color: values.is_active ? '#fff' : C.textoSuave,
              marginTop: 4,
              height: 42,
            }}
            onClick={() => set('is_active', !values.is_active)}
          >
            {values.is_active ? '✅ Activa' : '⏸️ Pausada'}
          </button>
        </Field>
      </div>

      <div style={s.formAcciones}>
        <button style={s.btnCancelar} onClick={onCancelar} disabled={guardando}>
          ✕ Cancelar
        </button>
        <button style={s.btnGuardar} onClick={onGuardar} disabled={guardando}>
          {guardando ? 'Guardando…' : '💾 Guardar'}
        </button>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div style={s.field}>
      <label style={s.fieldLabel}>{label}</label>
      {children}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// MAPA PICKER — buscador de dirección + mapa clickeable
// (mismo componente que AdminComercios, sin lat/lng manuales)
// ──────────────────────────────────────────────────────────────
function MapController({ lat, lng, onPick }) {
  const map = useMap()
  useEffect(() => {
    if (!isNaN(lat) && !isNaN(lng)) {
      map.setView([lat, lng], 16, { animate: true })
    }
  }, [lat, lng, map])
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng)
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
  useEffect(() => {
    const d = direccion || ''
    if (d && (busqueda === ultimaDirSync.current || !busqueda)) {
      setBusqueda(d)
    }
    ultimaDirSync.current = d
  }, [direccion]) // eslint-disable-line react-hooks/exhaustive-deps

  // invalidateSize: fuerza al mapa a recalcular su tamaño al montar.
  useEffect(() => {
    const t = setTimeout(() => window.dispatchEvent(new Event('resize')), 250)
    return () => clearTimeout(t)
  }, [])

  const la = parseFloat(lat)
  const ln = parseFloat(lng)
  const tienePos = !isNaN(la) && !isNaN(ln)
  const numLat = tienePos ? la : -33.4489
  const numLng = tienePos ? ln : -70.6693

  const buscarDireccion = async () => {
    const q = busqueda.trim()
    if (!q) {
      setErrorBusq('Escribí una dirección primero.')
      return
    }
    setBuscando(true)
    setErrorBusq('')
    try {
      const query = q.toLowerCase().includes('chile') ? q : `${q}, Chile`
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=cl&q=${encodeURIComponent(query)}`
      const res = await fetch(url, { headers: { 'Accept-Language': 'es' } })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const arr = await res.json()
      if (arr && arr[0] && arr[0].lat && arr[0].lon) {
        onPick(parseFloat(arr[0].lat), parseFloat(arr[0].lon))
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
        💊 Farmacias · <span style={s.marca}>el barrio</span>
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

  /* ── top row ── */
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
    display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10,
  },
  cardEmoji: {
    width: 42, height: 42, borderRadius: 11,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 20, flexShrink: 0,
  },
  cardTexto: { flex: 1, minWidth: 0 },
  cardTit: {
    fontSize: 15.5, fontWeight: 700, color: C.texto,
    letterSpacing: '-0.1px', lineHeight: 1.3,
  },
  cardSub: {
    fontSize: 13, color: C.textoTenue, fontWeight: 500,
    marginTop: 2, lineHeight: 1.4,
  },
  togglePill: {
    flexShrink: 0,
    border: 'none', borderRadius: 999,
    padding: '7px 11px', fontSize: 12, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit',
    whiteSpace: 'nowrap',
  },
  cardMeta: {
    display: 'flex', flexWrap: 'wrap', gap: 10,
    marginBottom: 10,
  },
  metaItem: {
    fontSize: 12.5, color: C.textoSuave, fontWeight: 600,
  },
  cardAcciones: {
    display: 'flex', gap: 8, alignItems: 'center',
    borderTop: '1px solid rgba(0,0,0,0.05)',
    paddingTop: 10,
  },
  btnEdit: {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    background: C.fondo, border: `1px solid ${C.borde}`,
    color: C.texto, padding: '7px 12px', borderRadius: 10,
    fontSize: 12.5, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit',
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
