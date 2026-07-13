import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
  C, T, S, TIPOS, REPORTES, ACCESOS, FARMACIAS,
  iniciales, hace, plata, distancia, saludo,
} from '../lib/design'

/*
  INICIO — el Radar del barrio.

  "¿Qué está pasando cerca mío, ahora?"
  Ordenado por urgencia y frescura. Lo que envejece, se va.
  El Radar NO guarda nada: lee de incident_reports y de posts.

  Clima: Open-Meteo. Gratis, sin API key, sin tarjeta.
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

function Home({ currentUser, onNavigate }) {
  const [profile, setProfile] = useState(null)
  const [barrio, setBarrio] = useState(null)
  const [alertas, setAlertas] = useState([])
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

      const [hoodRes, alertRes, postRes, msgRes] = await Promise.all([
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

        supabase.from('posts')
          .select('*, author:profiles!author_id (full_name, avatar_url, badge_founder, verified)')
          .eq('neighborhood_id', p.neighborhood_id)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(20),

        supabase.from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('receiver_id', p.id).eq('read', false),
      ])

      setBarrio(hoodRes.data)
      setAlertas(alertRes.data || [])
      setActividad(postRes.data || [])
      setNoLeidos(msgRes.count || 0)

      cargarClima(hoodRes.data?.lat, hoodRes.data?.lng)
    } catch (err) {
      console.error('Error cargando el radar:', err)
    } finally {
      setCargando(false)
    }
  }

  /* Clima real. Open-Meteo es gratis y no pide API key ni tarjeta. */
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
    } catch {
      // Sin clima, la tira simplemente no se muestra. Nunca datos inventados.
    }
  }

  const nav = onNavigate || (() => {})

  const filtrados = busqueda.trim()
    ? actividad.filter((p) =>
        (p.title || '').toLowerCase().includes(busqueda.toLowerCase()) ||
        (p.content || '').toLowerCase().includes(busqueda.toLowerCase()))
    : actividad

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
            <button style={s.iconBtn} onClick={() => setVerBuscador(!verBuscador)}>🔍</button>
            <button style={s.iconBtn} onClick={() => nav('notificaciones')}>
              🔔
              {noLeidos > 0 && (
                <span style={s.badge}>{noLeidos > 9 ? '9+' : noLeidos}</span>
              )}
            </button>
            <button style={s.avatarBtn} onClick={() => nav('perfil')}>
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

            {/* Clima: emoji grande arriba, temp, texto abajo */}
            <div style={s.climaBloque}>
              <span style={s.climaEmoji}>{clima.e}</span>
              <div>
                <div style={s.climaTemp}>{clima.temp}°C</div>
                <div style={s.climaTxt}>{clima.t}</div>
                <div style={s.climaTxt}>{barrio?.city || 'Santiago'}</div>
              </div>
            </div>

            {/* Divisor vertical */}
            <div style={s.tiraDivisor} />

            {/* Farmacia: alineada a la derecha */}
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

        {/* ══════ ACCESOS RÁPIDOS ══════ */}
        <div style={s.accesos}>
          {ACCESOS.map((a) => (
            <button
              key={a.id}
              style={s.acceso}
              onClick={() => nav(a.id)}
            >
              <span style={{ ...s.accesoIcono, background: a.bg }}>{a.emoji}</span>
              <span style={s.accesoLabel}>{a.label}</span>
            </button>
          ))}
        </div>

        {/* ══════ ALERTAS ══════ */}
        {alertas.length > 0 && (
          <div style={s.seccion}>
            <div style={s.seccionTit}>
              <span style={s.seccionTxt}>🚨 Alertas del barrio</span>
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
            <span style={s.seccionTxt}>🏘️ Actividad del barrio</span>
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

  /* ── cabecera ── */
  header: {
    background: C.card,
    padding: '52px 18px 16px',
    borderBottom: `1px solid ${C.borde}`,
    flexShrink: 0,
  },
  headerTop: { display: 'flex', alignItems: 'center', gap: 10 },
  saludo: {
    fontSize: 21, fontWeight: 800, color: C.texto,
    letterSpacing: '-0.3px',
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  barrioRow: { display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 },
  barrioNombre: { fontSize: 13.5, color: C.textoSuave, fontWeight: 600 },
  beta: {
    fontSize: 9, fontWeight: 900, letterSpacing: 0.5, color: '#fff',
    background: C.verde, padding: '2px 6px', borderRadius: 5,
  },

  headerBtns: { display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 },
  iconBtn: {
    position: 'relative', width: 40, height: 40, borderRadius: '50%',
    background: C.fondo, border: `1px solid ${C.borde}`,
    fontSize: 17, cursor: 'pointer', padding: 0,
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
    width: 42, height: 42, borderRadius: '50%',
    background: C.verdeSuave, color: C.verde,
    border: `2px solid ${C.verde}`, padding: 0, overflow: 'hidden',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', flexShrink: 0,
  },
  avatarImg: { width: '100%', height: '100%', objectFit: 'cover' },
  avatarTxt: { fontSize: 13.5, fontWeight: 800 },

  buscador: {
    width: '100%', marginTop: 14, padding: '13px 16px',
    fontSize: 15, background: C.fondo,
    border: `1.5px solid ${C.borde}`, borderRadius: 999,
    outline: 'none', fontFamily: 'inherit', color: C.texto,
    boxSizing: 'border-box',
  },

  scroll: { flex: 1, overflowY: 'auto', padding: '16px 16px 120px' },

  /* ── clima + farmacia ── */
  tiraInfo: {
    display: 'flex', alignItems: 'center',
    gap: 0,
    background: C.tira, border: `1px solid ${C.tiraBorde}`,
    borderRadius: 14, padding: '14px 16px', marginBottom: 16,
  },
  climaBloque: {
    display: 'flex', alignItems: 'center', gap: 10,
    flexShrink: 0,
  },
  climaEmoji: { fontSize: 28, lineHeight: 1 },
  climaTemp: { fontSize: 20, fontWeight: 800, color: C.texto, lineHeight: 1.1 },
  climaTxt: { fontSize: 11, color: C.textoTenue, fontWeight: 500, marginTop: 2 },
  tiraDiv: {},
  tiraDivisor: {
    width: 1, height: 36,
    background: C.tiraBorde,
    margin: '0 14px', flexShrink: 0,
  },
  farmaciaBloque: {
    flex: 1, minWidth: 0,
    background: 'none', border: 'none', padding: 0,
    cursor: 'pointer', fontFamily: 'inherit', textAlign: 'right',
    display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
  },
  farmaciaLabel: { fontSize: 10, color: C.textoTenue, fontWeight: 500 },
  farmaciaNombre: {
    fontSize: 13.5, fontWeight: 700, color: C.texto, marginTop: 2,
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
    fontSize: 18, fontWeight: 800, color: C.texto, marginBottom: 16,
  },
  farmCard: {
    background: C.tira, border: `1px solid ${C.tiraBorde}`,
    borderRadius: 16, padding: 15, marginBottom: 11,
  },
  farmNombre: { fontSize: 16, fontWeight: 800, color: C.texto },
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
    gap: 9, marginBottom: 22,
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
  seccion: { marginBottom: 22 },
  seccionTit: { display: 'flex', alignItems: 'center', marginBottom: 11 },
  seccionTxt: { fontSize: 15.5, fontWeight: 800, color: C.texto },
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
  alertaTitulo: { fontSize: 13.5, fontWeight: 800, flex: 1, minWidth: 0 },
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
  vacioTit: { fontSize: 16.5, fontWeight: 800, color: C.texto, marginBottom: 5 },
  vacioTxt: { fontSize: 14, color: C.textoTenue, lineHeight: 1.5 },
}

export default Home