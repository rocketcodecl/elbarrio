import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
  C, T, S, TIPOS, REPORTES, FARMACIAS,
  iniciales, hace, plata, distancia, saludo,
} from '../lib/design'
import PedidoCard from '../components/PedidoCard'

/*
  INICIO — el Radar del barrio.

  Estructura del feed:
    1. Header (saludo + ubicación)
    2. Clima + Farmacia
    3. Accesos rápidos (NO repetidos con el footer):
       Pedidos · Comercios · Trueques · Favoritos
    4. Pedidos vecinales
       - Barra amarilla "¿Necesitás una mano?" (siempre)
       - Cards de pedidos activos (si hay)
    5. Alertas de el barrio
    6. Actividad de el barrio

  "el barrio" va SIEMPRE en minúscula y en verde marca (C.verde).

  Un pedido = post type='request'. Vive en la tabla posts.
  No se muestra si needed_by ya pasó (filtro en JS).
*/

const CLIMA_EMOJI = (code) => {
  if (code === 0) return { e: '☀️', t: 'Despejado' }
  if (code <= 2) return { e: '🌤️', t: 'Parcial' }
  if (code === 3) return { e: '☁️', t: 'Nublado' }
  if (code <= 48) return { e: '🌫️', t: 'Neblina' }
  if (code <= 67) return { e: '🌧️', t: 'Lluvia' }
  if (code <= 77) return { e: '🌨️', t: 'Nieve' }
  if (code <= 82) return { e: '🌦️', t: 'Chubascos' }
  if (code <= 99) return { e: '⛈️', t: 'Tormenta' }
  return { e: '🌤️', t: '' }
}

/* Accesos de la grilla de Inicio (NO se repiten con el footer). */
const ACCESOS_HOME = [
  { id: 'pedidos',   emoji: '🙋', label: 'Pedidos',   bg: C.doradoSuave },
  { id: 'comercios', emoji: '🏪', label: 'Comercios', bg: C.verdeSuave },
  { id: 'trueques',  emoji: '🔄', label: 'Trueques',  bg: C.azulSuave },
  { id: 'favoritos', emoji: '⭐', label: 'Favoritos', bg: C.moradoSuave },
]

function Home({ currentUser, onNavigate, onCrear }) {
  const [profile, setProfile] = useState(null)
  const [barrio, setBarrio] = useState(null)
  const [alertas, setAlertas] = useState([])
  const [pedidos, setPedidos] = useState([])
  const [actividad, setActividad] = useState([])
  const [noLeidos, setNoLeidos] = useState(0)
  const [clima, setClima] = useState(null)
  const [verFarmacias, setVerFarmacias] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [verBuscador, setVerBuscador] = useState(false)

  useEffect(() => { cargar() }, [currentUser?.id])

  const cargar = async () => {
    if (!currentUser?.id) return
    setCargando(true)
    try {
      const { data: p } = await supabase
        .from('profiles').select('*')
        .eq('user_id', currentUser.id).maybeSingle()
      if (!p) return
      setProfile(p)

      const [hoodRes, alertRes, pedidosRes, otrosRes, msgRes] = await Promise.all([
        supabase.from('neighborhoods').select('*')
          .eq('id', p.neighborhood_id).maybeSingle(),

        supabase.from('incident_reports')
          .select('*, reporter:profiles!reporter_id (full_name, avatar_url, badge_founder)')
          .eq('neighborhood_id', p.neighborhood_id)
          .eq('status', 'active')
          .gt('expires_at', new Date().toISOString())
          .order('confirms_count', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(5),

        // Pedidos: type='request', traemos 10 y filtramos vencidos en JS
        supabase.from('posts')
          .select('*, author:profiles!author_id (full_name, avatar_url, badge_founder, verified)')
          .eq('neighborhood_id', p.neighborhood_id)
          .eq('status', 'active')
          .eq('type', 'request')
          .order('created_at', { ascending: false })
          .limit(10),

        // Otros posts: excluimos request para que no se mezclen
        supabase.from('posts')
          .select('*, author:profiles!author_id (full_name, avatar_url, badge_founder, verified)')
          .eq('neighborhood_id', p.neighborhood_id)
          .eq('status', 'active')
          .neq('type', 'request')
          .order('created_at', { ascending: false })
          .limit(20),

        supabase.from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('receiver_id', p.id).eq('read', false),
      ])

      setBarrio(hoodRes.data)
      setAlertas(alertRes.data || [])

      // Filtrar pedidos vencidos (needed_by ya pasado) y ordenar por urgencia
      const ahora = Date.now()
      const pedidosActivos = (pedidosRes.data || []).filter((p) => {
        if (!p.needed_by) return true
        return new Date(p.needed_by).getTime() > ahora
      })
      pedidosActivos.sort((a, b) => {
        const pa = a.needed_by ? new Date(a.needed_by).getTime() : Infinity
        const pb = b.needed_by ? new Date(b.needed_by).getTime() : Infinity
        return pa - pb
      })
      setPedidos(pedidosActivos)

      setActividad(otrosRes.data || [])
      setNoLeidos(msgRes.count || 0)

      cargarClima(hoodRes.data?.lat, hoodRes.data?.lng)
    } catch (err) {
      console.error('Error cargando el radar:', err)
    } finally {
      setCargando(false)
    }
  }

  const cargarClima = async (lat, lng) => {
    if (!lat || !lng) return
    try {
      const r = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
        `&current=temperature_2m,weather_code&timezone=America%2FSantiago`
      )
      const d = await r.json()
      if (d?.current) {
        setClima({
          temp: Math.round(d.current.temperature_2m),
          ...CLIMA_EMOJI(d.current.weather_code),
        })
      }
    } catch {}
  }

  const nav = onNavigate || (() => {})
  const crear = onCrear || (() => {})

  const filtrados = busqueda.trim()
    ? actividad.filter((p) =>
        (p.title || '').toLowerCase().includes(busqueda.toLowerCase()) ||
        (p.content || '').toLowerCase().includes(busqueda.toLowerCase()))
    : actividad

  const onAcceso = (id) => {
    if (id === 'pedidos') {
      crear('request')
    } else if (id === 'comercios') {
      nav('comercios')
    } else {
      nav(id)
    }
  }

  if (cargando) {
    return (
      <div style={s.wrap}>
        <div style={s.cargando}>
          <img src="/isotipo.png" alt="" style={{ width: 58, opacity: 0.4 }} />
        </div>
      </div>
    )
  }

  const nombre = (profile?.full_name || '').split(' ')[0] || 'vecino'

  return (
    <div style={s.wrap}>

      {/* ══════ CABECERA ══════ */}
      <div style={s.header}>
        <div style={s.headerTop}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={s.saludo}>¡{saludo()}, {nombre}! 👋</div>
            <div style={s.barrioRow}>
              <span style={{ fontSize: 13 }}>📍</span>
              <span style={s.barrioNombre}>
                {barrio?.name || 'Mi barrio'}
                {barrio?.city ? `, ${barrio.city}` : ''}
              </span>
              {barrio?.is_beta && <span style={s.beta}>BETA</span>}
            </div>
          </div>

          <div style={s.headerBtns}>
            <button style={s.iconBtn} onClick={() => setVerBuscador(!verBuscador)} aria-label="Buscar">🔍</button>
            <button style={s.iconBtn} onClick={() => nav('notificaciones')} aria-label="Notificaciones">
              🔔
              {noLeidos > 0 && (
                <span style={s.badge}>{noLeidos > 9 ? '9+' : noLeidos}</span>
              )}
            </button>
            <button style={s.avatarBtn} onClick={() => nav('perfil')} aria-label="Mi perfil">
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt="" style={s.avatarImg} />
                : <span style={s.avatarTxt}>{iniciales(profile?.full_name)}</span>}
            </button>
          </div>
        </div>

        {verBuscador && (
          <input
            autoFocus
            placeholder="Buscar en el barrio..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={s.buscador}
          />
        )}
      </div>

      <div style={s.scroll}>

        {/* ══════ CLIMA + FARMACIA ══════ */}
        {clima && (
          <div style={s.tiraInfo}>
            <div style={s.climaBloque}>
              <span style={s.climaEmoji}>{clima.e}</span>
              <div>
                <div style={s.climaTemp}>{clima.temp}°C</div>
                <div style={s.climaTxt}>{clima.t}</div>
                <div style={s.climaTxt}>{barrio?.city || 'Santiago'}</div>
              </div>
            </div>

            <div style={s.tiraDivisor} />

            {FARMACIAS.length > 0 && (
              <button style={s.farmaciaBloque} onClick={() => setVerFarmacias(true)}>
                <div style={s.farmaciaLabel}>
                  💊 Farmacia de turno
                  {FARMACIAS.length > 1 && (
                    <span style={s.farmaciaMas}> +{FARMACIAS.length - 1}</span>
                  )}
                </div>
                <div style={s.farmaciaNombre}>{FARMACIAS[0].nombre}</div>
                <div style={s.farmaciaDir}>
                  {FARMACIAS[0].direccion} · {FARMACIAS[0].horario}
                </div>
              </button>
            )}
          </div>
        )}

        {/* ══════ ACCESOS RÁPIDOS (no repetidos con el footer) ══════ */}
        <div style={s.accesos}>
          {ACCESOS_HOME.map((a) => (
            <button
              key={a.id}
              style={s.acceso}
              onClick={() => onAcceso(a.id)}
            >
              <span style={{ ...s.accesoIcono, background: a.bg }}>{a.emoji}</span>
              <span style={s.accesoLabel}>{a.label}</span>
            </button>
          ))}
        </div>

        {/* ══════ PEDIDOS VECINALES ══════ */}
        <div style={s.seccion}>
          {/* Barra amarilla siempre visible, sin título */}
          <button
            style={s.pedirBarra}
            onClick={() => crear('request')}
          >
            <span style={s.pedirBarraEmoji}>🙋</span>
            <span style={s.pedirBarraTxt}>
              <span style={s.pedirBarraTit}>¿Necesitás una mano?</span>
              <span style={s.pedirBarraSub}>Gasfíter, flete, cuidado de perro...</span>
            </span>
            <span style={s.pedirBarraCta}>Pedir</span>
          </button>

          {/* Cards de pedidos activos (si hay) */}
          {pedidos.map((p) => (
            <PedidoCard
              key={p.id}
              post={{ ...p, deadline: p.needed_by }}
              onAyudar={(pedido) => nav('chat', {
                postId: pedido.id,
                mensajeInicial: '🙋 Me anoté para ayudarte con esto',
              })}
              onVerDetalle={(pedido) => nav('post', { postId: pedido.id })}
            />
          ))}
        </div>

        {/* ══════ ALERTAS ══════ */}
        {alertas.length > 0 && (
          <div style={s.seccion}>
            <div style={s.seccionTit}>
              <span style={s.seccionTxt}>
                🚨 Alertas de <span style={s.marca}>el barrio</span>
              </span>
              <span style={s.pulso} />
            </div>

            {alertas.map((a) => {
              const cat = REPORTES[a.category] || REPORTES.seguridad
              const urgente = a.category === 'seguridad' || a.category === 'salud'
              const confirmado = a.confirms_count >= 3
              return (
                <div
                  key={a.id}
                  style={{ ...s.alertaCard, borderLeft: `4px solid ${cat.color}` }}
                  onClick={() => nav('alerta', { id: a.id })}
                >
                  <div style={s.alertaTop}>
                    <span style={s.alertaEmoji}>{cat.emoji}</span>
                    <span style={{ ...s.alertaTitulo, color: cat.color }}>
                      {cat.label}
                    </span>
                    {urgente && <span style={s.urgentePill}>URGENTE</span>}
                  </div>

                  <div style={s.alertaTexto}>{a.description}</div>

                  <div style={s.alertaMeta}>
                    {a.location_text && (
                      <span style={s.metaItem}>📍 {a.location_text}</span>
                    )}
                    <span style={s.metaItem}>🕐 {hace(a.created_at)}</span>
                    {confirmado && (
                      <span style={s.confirmado}>✅ {a.confirms_count} vecinos</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ══════ ACTIVIDAD ══════ */}
        <div style={s.seccion}>
          <div style={s.seccionTit}>
            <span style={s.seccionTxt}>
              🏘️ Actividad de <span style={s.marca}>el barrio</span>
            </span>
          </div>

          {filtrados.length === 0 ? (
            <div style={s.vacio}>
              <div style={s.vacioEmoji}>🏘️</div>
              <div style={s.vacioTit}>Todavía no hay movimiento</div>
              <div style={s.vacioTxt}>Sé el primero en publicar algo.</div>
            </div>
          ) : (
            filtrados.map((p) => {
              const t = TIPOS[p.type] || TIPOS.general
              const dist = distancia(p.distance_meters)
              return (
                <div
                  key={p.id}
                  style={s.postCard}
                  onClick={() => nav('post', { postId: p.id })}
                >
                  <div style={{ ...s.postFoto, background: t.bg }}>
                    {p.images?.[0]
                      ? <img src={p.images[0]} alt="" style={s.postImg} />
                      : <span style={s.postEmoji}>{t.emoji}</span>}
                  </div>

                  <div style={s.postInfo}>
                    <div style={s.postChips}>
                      <span style={{ ...s.chip, background: t.bg, color: t.color }}>
                        {t.corto}
                      </span>
                      {p.price > 0 && <span style={s.precio}>{plata(p.price)}</span>}
                      {p.is_negotiable && <span style={s.chipNeg}>Conversable</span>}
                    </div>

                    <div style={s.postTit}>{p.title}</div>
                    {p.content && <div style={s.postTxt}>{p.content}</div>}

                    <div style={s.postPie}>
                      <span style={s.autorAvatar}>
                        {p.author?.avatar_url
                          ? <img src={p.author.avatar_url} alt="" style={s.autorImg} />
                          : iniciales(p.author?.full_name)}
                      </span>
                      <span style={s.autorNombre}>
                        {(p.author?.full_name || 'Vecino').split(' ')[0]}
                      </span>
                      {p.author?.verified && <span style={s.badgeMini}>✅</span>}
                      {p.author?.badge_founder && <span style={s.badgeMini}>⭐</span>}
                      {dist && <span style={s.postMeta}>· 📍 {dist}</span>}
                      <span style={s.postMeta}>· {hace(p.created_at)}</span>
                    </div>

                    <div style={s.stats}>
                      <span style={s.stat}>❤️ {p.likes_count || 0}</span>
                      <span style={s.stat}>💬 {p.comments_count || 0}</span>
                      <span style={s.stat}>👁️ {p.views_count || 0}</span>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* ══════ MODAL DE FARMACIAS ══════ */}
      {verFarmacias && (
        <div style={s.modalFondo} onClick={() => setVerFarmacias(false)}>
          <div style={s.modalCaja} onClick={(e) => e.stopPropagation()}>
            <div style={s.modalTit}>💊 Farmacias de turno hoy</div>

            {FARMACIAS.map((f, i) => (
              <div key={i} style={s.farmCard}>
                <div style={s.farmNombre}>{f.nombre}</div>
                <div style={s.farmDir}>📍 {f.direccion}, {f.comuna}</div>
                <div style={s.farmHora}>🕐 {f.horario}</div>

                <div style={s.farmBtns}>
                  <button
                    style={s.farmBtn}
                    onClick={() => window.open(
                      `https://www.openstreetmap.org/search?query=${encodeURIComponent(
                        f.direccion + ', ' + f.comuna
                      )}`, '_blank'
                    )}
                  >
                    📍 Cómo llegar
                  </button>
                  {f.telefono && (
                    <button
                      style={{ ...s.farmBtn, background: C.verde, color: '#fff' }}
                      onClick={() => window.open(`tel:${f.telefono}`)}
                    >
                      📞 Llamar
                    </button>
                  )}
                </div>
              </div>
            ))}

            <button style={s.modalCerrar} onClick={() => setVerFarmacias(false)}>
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ═════════════════════════════════════════════════
const s = {
  wrap: {
    width: '100%', height: '100%',
    background: C.fondo, fontFamily: T.font,
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
  },
  cargando: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' },

  /* ── marca ("el barrio" en verde, minúscula) ── */
  marca: { color: C.verde, fontWeight: 600 },

  /* ── cabecera ── */
  header: {
    background: C.card,
    padding: '28px 18px 10px',
    borderBottom: `1px solid ${C.borde}`,
    flexShrink: 0,
  },
  headerTop: { display: 'flex', alignItems: 'center', gap: 10 },
  saludo: {
    fontSize: 16,
    fontWeight: 500,
    color: C.texto,
    letterSpacing: '-0.1px',
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  barrioRow: { display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 },
  barrioNombre: { fontSize: 13, color: C.textoSuave, fontWeight: 500 },
  beta: {
    fontSize: 9, fontWeight: 800, letterSpacing: 0.5, color: '#fff',
    background: C.verde, padding: '2px 6px', borderRadius: 5,
  },

  headerBtns: { display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 },
  iconBtn: {
    position: 'relative', width: 36, height: 36, borderRadius: '50%',
    background: C.fondo, border: `1px solid ${C.borde}`,
    fontSize: 15, cursor: 'pointer', padding: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  badge: {
    position: 'absolute', top: -3, right: -3,
    minWidth: 18, height: 18, padding: '0 4px',
    borderRadius: 999, background: C.rojo, color: '#fff',
    fontSize: 10, fontWeight: 800,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: '2px solid #fff',
  },
  avatarBtn: {
    width: 38, height: 38, borderRadius: '50%',
    background: C.verdeSuave, color: C.verde,
    border: `2px solid ${C.verde}`, padding: 0, overflow: 'hidden',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', flexShrink: 0,
  },
  avatarImg: { width: '100%', height: '100%', objectFit: 'cover' },
  avatarTxt: { fontSize: 13, fontWeight: 700 },

  buscador: {
    width: '100%', marginTop: 10, padding: '11px 16px',
    fontSize: 14, background: C.fondo,
    border: `1.5px solid ${C.borde}`, borderRadius: 999,
    outline: 'none', fontFamily: 'inherit', color: C.texto,
    boxSizing: 'border-box',
  },

  scroll: { flex: 1, overflowY: 'auto', padding: '6px 16px 120px' },

  /* ── clima + farmacia ── */
  tiraInfo: {
    display: 'flex', alignItems: 'center',
    gap: 0,
    background: C.tira, border: `1px solid ${C.tiraBorde}`,
    borderRadius: 14, padding: '12px 14px', marginBottom: 14,
  },
  climaBloque: {
    display: 'flex', alignItems: 'center', gap: 10,
    flexShrink: 0,
  },
  climaEmoji: { fontSize: 26, lineHeight: 1 },
  climaTemp: { fontSize: 19, fontWeight: 700, color: C.texto, lineHeight: 1.1 },
  climaTxt: { fontSize: 11, color: C.textoTenue, fontWeight: 500, marginTop: 2 },
  tiraDivisor: {
    width: 1, height: 34,
    background: C.tiraBorde,
    margin: '0 12px', flexShrink: 0,
  },
  farmaciaBloque: {
    flex: 1, minWidth: 0,
    background: 'none', border: 'none', padding: 0,
    cursor: 'pointer', fontFamily: 'inherit', textAlign: 'right',
    display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
  },
  farmaciaLabel: { fontSize: 10, color: C.textoTenue, fontWeight: 500 },
  farmaciaNombre: {
    fontSize: 13, fontWeight: 700, color: C.texto, marginTop: 2,
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
    maxWidth: '100%',
  },
  farmaciaDir: {
    fontSize: 10, color: C.textoTenue, fontWeight: 400, marginTop: 2,
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
    maxWidth: '100%',
  },
  farmaciaMas: { fontSize: 9, fontWeight: 700, color: C.verde },

  modalFondo: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(22,33,26,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 22, zIndex: 400,
  },
  modalCaja: {
    width: '100%', background: '#fff',
    borderRadius: 22, padding: 20,
    boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
    maxHeight: '80%', overflowY: 'auto',
  },
  modalTit: {
    fontSize: 18, fontWeight: 700, color: C.texto, marginBottom: 16,
  },
  farmCard: {
    background: C.tira, border: `1px solid ${C.tiraBorde}`,
    borderRadius: 16, padding: 15, marginBottom: 11,
  },
  farmNombre: { fontSize: 16, fontWeight: 700, color: C.texto },
  farmDir: { fontSize: 13.5, color: C.textoSuave, marginTop: 6, fontWeight: 500 },
  farmHora: { fontSize: 13.5, color: C.textoSuave, marginTop: 3, fontWeight: 500 },
  farmBtns: { display: 'flex', gap: 8, marginTop: 12 },
  farmBtn: {
    flex: 1, padding: '11px 8px', borderRadius: 12,
    background: '#fff', border: `1px solid ${C.tiraBorde}`,
    color: C.verdeOsc, fontSize: 13, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit',
  },
  modalCerrar: {
    width: '100%', padding: 14, marginTop: 4,
    background: C.fondo, border: `1px solid ${C.borde}`,
    borderRadius: 999, color: C.textoSuave,
    fontSize: 14.5, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit',
  },

  /* ── accesos ── */
  accesos: {
    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 9, marginBottom: 18,
  },
  acceso: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
    background: C.card, border: `1px solid ${C.borde}`,
    borderRadius: 13, padding: '11px 3px',
    cursor: 'pointer', fontFamily: 'inherit',
  },
  accesoIcono: {
    width: 34, height: 34, borderRadius: 10,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 18,
  },
  accesoLabel: { fontSize: 11, fontWeight: 600, color: C.textoSuave },

  /* ── secciones ── */
  seccion: { marginBottom: 20 },
  seccionTit: { display: 'flex', alignItems: 'center', marginBottom: 10, gap: 8 },
  seccionTxt: { fontSize: 15, fontWeight: 700, color: C.texto },
  pulso: {
    width: 8, height: 8, borderRadius: '50%', background: C.rojo,
    marginLeft: 'auto', boxShadow: `0 0 0 4px ${C.rojoSuave}`,
  },

  /* ── alertas ── */
  alertaCard: {
    background: C.rojoBg, borderRadius: 12, padding: '12px 13px',
    marginBottom: 9, border: `1px solid ${C.rojoSuave}`,
    borderLeftWidth: 3, cursor: 'pointer',
  },
  alertaTop: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 },
  alertaEmoji: { fontSize: 14 },
  alertaTitulo: { fontSize: 13.5, fontWeight: 700, flex: 1, minWidth: 0 },
  urgentePill: {
    fontSize: 8.5, fontWeight: 800, letterSpacing: 0.3, color: '#fff',
    background: C.rojo, padding: '3px 6px', borderRadius: 4, flexShrink: 0,
  },
  alertaTexto: {
    fontSize: 13, color: C.textoSuave, lineHeight: 1.5, fontWeight: 400,
    display: '-webkit-box', WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical', overflow: 'hidden',
  },
  alertaMeta: {
    display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 9,
    marginTop: 7,
  },
  metaItem: { fontSize: 11, color: C.textoTenue, fontWeight: 500 },
  confirmado: {
    fontSize: 10.5, fontWeight: 700, color: C.verdeOsc,
    background: C.verdeSuave, padding: '3px 7px', borderRadius: 999,
  },

  /* ── posts ── */
  postCard: {
    display: 'flex', gap: 12,
    background: C.card, borderRadius: 14, padding: 12,
    border: `1px solid ${C.borde}`,
    marginBottom: 9, cursor: 'pointer',
  },
  postFoto: {
    width: 66, height: 66, borderRadius: 11, flexShrink: 0, overflow: 'hidden',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  postImg: { width: '100%', height: '100%', objectFit: 'cover' },
  postEmoji: { fontSize: 26 },

  postInfo: { flex: 1, minWidth: 0 },
  postChips: { display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' },
  chip: { fontSize: 10.5, fontWeight: 700, padding: '3px 7px', borderRadius: 5 },
  precio: { fontSize: 13, fontWeight: 800, color: C.texto },
  chipNeg: {
    fontSize: 10, fontWeight: 600, color: C.textoSuave,
    background: C.fondo, padding: '3px 6px', borderRadius: 5,
  },

  postTit: {
    fontSize: 14, fontWeight: 700, color: C.texto,
    lineHeight: 1.35, marginTop: 5,
  },
  postTxt: {
    fontSize: 12.5, color: C.textoSuave, lineHeight: 1.45, marginTop: 3,
    display: '-webkit-box', WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical', overflow: 'hidden',
  },

  postPie: {
    display: 'flex', alignItems: 'center', gap: 4,
    marginTop: 7, flexWrap: 'wrap',
  },
  autorAvatar: {
    width: 19, height: 19, borderRadius: '50%',
    background: C.verdeSuave, color: C.verde,
    fontSize: 8, fontWeight: 800, overflow: 'hidden', flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  autorImg: { width: '100%', height: '100%', objectFit: 'cover' },
  autorNombre: { fontSize: 11.5, fontWeight: 700, color: C.texto },
  badgeMini: { fontSize: 9 },
  postMeta: { fontSize: 10.5, color: C.textoTenue, fontWeight: 500 },

  stats: { display: 'flex', gap: 11, marginTop: 6 },
  stat: { fontSize: 10.5, color: C.textoTenue, fontWeight: 500 },

  /* ── vacío ── */
  vacio: {
    textAlign: 'center', padding: '46px 20px',
    background: C.card, borderRadius: 18, border: `1px solid ${C.borde}`,
  },
  vacioEmoji: { fontSize: 46, marginBottom: 12 },
  vacioTit: { fontSize: 16.5, fontWeight: 700, color: C.texto, marginBottom: 5 },
  vacioTxt: { fontSize: 14, color: C.textoTenue, lineHeight: 1.5 },

  /* ── pedidos vecinales ── */
  pedirBarra: {
    display: 'flex', alignItems: 'center', gap: 11,
    width: '100%',
    background: '#fffbeb', border: '1px solid #fde68a',
    borderRadius: 14, padding: '11px 13px',
    cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
  },
  pedirBarraEmoji: { fontSize: 20, flexShrink: 0, lineHeight: 1 },
  pedirBarraTxt: {
    display: 'flex', flexDirection: 'column', gap: 1,
    flex: 1, minWidth: 0,
  },
  pedirBarraTit: {
    fontSize: 13.5, fontWeight: 700, color: C.texto,
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  pedirBarraSub: {
    fontSize: 11.5, fontWeight: 400, color: C.textoTenue,
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  pedirBarraCta: {
    fontSize: 12, fontWeight: 700, color: '#fff',
    background: C.verde, padding: '7px 14px',
    borderRadius: 999, flexShrink: 0,
    display: 'flex', alignItems: 'center',
  },
}

export default Home