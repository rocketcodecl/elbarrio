import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import {
  C, T, COMERCIOS, COMERCIOS_CATS, iniciales, distancia, hace,
} from '../lib/design'
import MiniMap from '../components/MiniMap'
import TopBar from '../components/TopBar'

/*
  COMERCIOS — v8 PIXEL-PERFECT
  Traducción EXACTA del HTML de Stitch (exportado por el usuario).
  Valores tomados literalmente del tailwind.config + clases Tailwind.

  SISTEMA DE COLORES (de Stitch):
    primary:              #006d32
    primary-container:    #1da653
    primary-fixed:        #7ffc9d
    on-primary:           #ffffff
    on-primary-container: #003113
    on-primary-fixed:     #00210a
    surface (fondo):      #f9f9ff
    surface-lowest (card):#ffffff
    surface-low (header): #f0f3ff
    surface-high:         #e2e8f8
    surface-highest:      #dce2f3
    surface-variant:      #dce2f3
    outline-variant:      #bdcabb
    outline:              #6e7a6d
    on-surface:           #151c27
    on-surface-variant:   #3e4a3e
    secondary:            #5c5e68
    error:                #ba1a1a
    tertiary-container:   #989083
    on-tertiary-container:#2f2920
    secondary-container:  #e1e1ee
    on-secondary-container:#62646f

  TIPOGRAFÍA: 'Plus Jakarta Sans'
    headline-md: 20px / 28px / 700
    headline-sm: 16px / 24px / 600
    body-lg:     16px / 24px / 400
    body-md:     14px / 20px / 400
    body-sm:     12px / 16px / 400
    label-md:    12px / 16px / 600 (ls 0.01em)
    label-xs:    10px / 12px / 700

  SPACING: xs 8, sm 12, base 4, md 16, lg 24, xl 32, gutter 12, container-margin 20
  RADIUS: lg 8px, xl 12px, full 9999px
*/

/* ── Tokens mapeados a la paleta de El Barrio (design.js) ──
  Mismos nombres que el Stitch original para no tocar las referencias,
  pero con los valores de C (verde #16a34a, fondo #f4f7f4, etc.). */
const P = {
  // Colores — mapeados a design.js
  primary:              C.verde,        // #16a34a (antes #006d32)
  primaryContainer:     C.verdeOsc,     // #0f5f36 (antes #1da653)
  primaryFixed:         C.verdeSuave,   // #dcfce7 (antes #7ffc9d neón)
  onPrimary:            '#ffffff',
  onPrimaryContainer:   C.verdeOsc,     // #0f5f36
  onPrimaryFixed:       C.verdeOsc,     // #0f5f36
  surface:              C.fondo,        // #f4f7f4 (antes #f9f9ff azulado)
  surfaceLowest:        C.card,         // #ffffff
  surfaceLow:           C.card,         // #ffffff (header blanco como Mercado)
  surfaceHigh:          '#f9fafb',     // bg buscador (como Mercado)
  surfaceHighest:       C.bordeSuave,  // #f1f5f1
  surfaceVariant:       C.bordeSuave,  // #f1f5f1
  outlineVariant:       C.borde,       // #e8ede8
  outline:              C.textoTenue,  // #98a49b
  onSurface:            C.texto,       // #16211a
  onSurfaceVariant:     C.textoSuave,  // #5f6b62
  secondary:            C.textoSuave,  // #5f6b62
  error:                C.rojo,        // #dc2626
  tertiaryContainer:    C.doradoSuave, // #fef3c7
  onTertiaryContainer:  '#92400e',
  secondaryContainer:   C.bordeSuave,  // #f1f5f1
  onSecondaryContainer: C.textoSuave,  // #5f6b62

  // Fuente — system-ui como toda la app (NO Plus Jakarta Sans)
  font: T.font,
}

/* ── Estilos globales ── */
const GLOBAL_STYLES = `
  .com-tap { transition: transform .12s ease; }
  .com-tap:active { transform: scale(0.98); }
  .com-chip { transition: all .14s ease; }
  .com-chip:active { transform: scale(0.95); }
  .com-btn { transition: transform .12s ease, background .2s ease; }
  .com-btn:active { transform: scale(0.9); }
  .com-cta { transition: transform .12s ease, box-shadow .2s ease; }
  .com-cta:active { transform: scale(0.96); }
  @keyframes comSheetUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
  .com-sheet { animation: comSheetUp .28s cubic-bezier(0.16, 1, 0.3, 1) both; }
  @keyframes comPulseSoft {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.05); opacity: 0.85; }
  }
  .com-pulse { animation: comPulseSoft 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
  @keyframes comLightboxIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
  .com-lightbox { animation: comLightboxIn .22s ease-out both; }
  .com-scroll::-webkit-scrollbar { display: none; }
  .com-scroll { scrollbar-width: none; -ms-overflow-style: none; }
  .com-body-scroll::-webkit-scrollbar { width: 0; }
`

/* ── Días ── */
const DIAS = ['dom', 'lun', 'mar', 'mie', 'jue', 'vie', 'sab']
const DIAS_FULL = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

const fmtCountdown = (mins) => {
  if (mins < 60) return `en ${mins} min`
  const hh = Math.floor(mins / 60)
  const mm = mins % 60
  return mm > 0 ? `en ${hh}h ${mm}min` : `en ${hh}h`
}

const proximoDiaAbierto = (hours, startOffset = 1) => {
  const now = new Date()
  for (let i = startOffset; i <= 7; i++) {
    const d = new Date(now)
    d.setDate(now.getDate() + i)
    const key = DIAS[d.getDay()]
    const h = hours[key]
    if (h && h.o && h.c) {
      const etiqueta = i === 1 ? 'mañana' : DIAS_FULL[d.getDay()].toLowerCase()
      return { etiqueta, hora: h.o, dia: key }
    }
  }
  return null
}

const horarioFeed = (hours) => {
  if (!hours) return null
  const now = new Date()
  const dia = DIAS[now.getDay()]
  const h = hours[dia]
  if (!h || !h.o || !h.c) {
    const prox = proximoDiaAbierto(hours, 1)
    if (!prox) return { principal: 'Sin horario', secundario: null, abierto: false }
    return { principal: `Abre ${prox.etiqueta} a las ${prox.hora}`, secundario: null, abierto: false }
  }
  const [ho, mo] = h.o.split(':').map(Number)
  const [hc, mc] = h.c.split(':').map(Number)
  const ahora = now.getHours() * 60 + now.getMinutes()
  const apertura = ho * 60 + mo
  const cierre = hc * 60 + mc
  if (ahora >= apertura && ahora < cierre) {
    const diff = cierre - ahora
    const cierraEn = diff < 60
      ? `cierra en ${diff} min`
      : (diff % 60 > 0 ? `cierra en ${Math.floor(diff / 60)}h ${diff % 60}min` : `cierra en ${Math.floor(diff / 60)}h`)
    return { principal: `Abierto hasta las ${h.c}`, secundario: cierraEn, abierto: true, horaCierre: h.c }
  }
  if (ahora < apertura) {
    return { principal: `Abre hoy a las ${h.o}`, secundario: fmtCountdown(apertura - ahora), abierto: false }
  }
  const prox = proximoDiaAbierto(hours, 1)
  if (!prox) return { principal: 'Cerrado', secundario: null, abierto: false }
  return { principal: `Abre ${prox.etiqueta} a las ${prox.hora}`, secundario: null, abierto: false }
}

const haversine = (lat1, lng1, lat2, lng2) => {
  if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) return null
  const R = 6371000
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))
}

const waLink = (phone) => {
  if (!phone) return null
  const limpio = phone.replace(/[^\d]/g, '')
  if (!limpio) return null
  if (limpio.length === 9 && limpio.startsWith('9')) return `https://wa.me/56${limpio}`
  if (limpio.length === 11 && limpio.startsWith('56')) return `https://wa.me/${limpio}`
  return `https://wa.me/${limpio}`
}

const pseudoRating = (id) => {
  const idStr = String(id || '')
  let hash = 0
  for (let i = 0; i < idStr.length; i++) { hash = idStr.charCodeAt(i) + ((hash << 5) - hash); hash |= 0 }
  return Math.round((4.3 + (Math.abs(hash) % 71) / 100) * 10) / 10
}
const ratingFor = (c) => (typeof c.rating === 'number' && c.rating > 0 ? c.rating : pseudoRating(c.id))

const reviewCountFor = (id) => {
  const idStr = String(id || '')
  let hash = 0
  for (let i = 0; i < idStr.length; i++) { hash = idStr.charCodeAt(i) + ((hash << 5) - hash); hash |= 0 }
  return 8 + (Math.abs(hash) % 38)
}

/* ── Íconos SVG (estilo Material Symbols, lineales/filled) ── */
const Ico = {
  back: ({ size = 22, color = P.onSurface }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  ),
  share: ({ size = 18, color = P.onSurfaceVariant }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
      <line x1="8.6" y1="13.5" x2="15.4" y2="17.5" /><line x1="15.4" y1="6.5" x2="8.6" y2="10.5" />
    </svg>
  ),
  heart: ({ size = 20, color = P.onSurfaceVariant, filled = false }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : 'none'} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
    </svg>
  ),
  bell: ({ size = 22, color = P.primary }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  ),
  pin: ({ size = 14, color = P.primary }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none">
      <path d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" />
    </svg>
  ),
  search: ({ size = 22, color = P.outline }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.5" y2="16.5" />
    </svg>
  ),
  star: ({ size = 14, color = P.primary, filled = true }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : 'none'} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z" />
    </svg>
  ),
  stars: ({ size = 18, color = P.primary }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none">
      <path d="M12 2l2.9 6.3 6.9.6-5.2 4.6 1.6 6.8L12 17.3 5.8 20.9l1.6-6.8L2.2 8.9l6.9-.6z" />
    </svg>
  ),
  phone: ({ size = 18, color = '#fff' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.6A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" />
    </svg>
  ),
  whatsapp: ({ size = 20, color = '#fff' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none">
      <path d="M12 2a10 10 0 0 0-8.6 15l-1.4 5 5.1-1.3A10 10 0 1 0 12 2zm0 2a8 8 0 0 1 6.6 12.5l.3.5-.7 2.6-2.7-.7-.5.3A8 8 0 1 1 12 4zm-3.2 4.3c-.2 0-.5 0-.7.3-.3.3-1 .9-1 2.3s1 2.7 1.2 2.9c.1.2 2 3.1 4.9 4.3 2.4 1 2.9.8 3.4.8.5-.1 1.6-.7 1.9-1.3.2-.6.2-1.2.1-1.3l-.7-.4-1.7-.8c-.2-.1-.4-.1-.6.1l-.7.9c-.1.2-.3.2-.5.1-.7-.3-1.4-.6-2.1-1.4-.5-.5-.9-1.1-1-1.3-.1-.2 0-.4.1-.5l.4-.5c.1-.2.2-.3.2-.5s0-.4-.1-.5l-.8-2c-.2-.4-.4-.4-.6-.4h-.5z" />
    </svg>
  ),
  nav: ({ size = 18, color = '#fff' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="3 11 22 2 13 21 11 13 3 11" />
    </svg>
  ),
  clock: ({ size = 14, color = P.onSurfaceVariant }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 14" />
    </svg>
  ),
  verified: ({ size = 14, color = P.primary }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none">
      <path d="M12 1l2.4 2.1 3.2-.3 1.2 3 3 1.2-.3 3.2L23.6 12l-2.1 2.4.3 3.2-3 1.2-1.2 3-3.2-.3L12 23.6l-2.4-2.1-3.2.3-1.2-3-3-1.2.3-3.2L.4 12l2.1-2.4-.3-3.2 3-1.2 1.2-3 3.2.3L12 1zm-1.4 14.2l5.7-5.7-1.4-1.4-4.3 4.3-2.1-2.1-1.4 1.4 3.5 3.5z" />
    </svg>
  ),
  plus: ({ size = 28, color = '#fff' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  close: ({ size = 22, color = P.onSurface }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  arrowForward: ({ size = 16, color = P.primary }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none">
      <path d="M6.4 4.5l1.4-1.4 8.5 8.5-8.5 8.5-1.4-1.4 7.1-7.1z" />
    </svg>
  ),
  edit: ({ size = 16, color = P.primary }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  ),
}

const STAR_YELLOW = '#FFC107'

/* ── Rating Stars ── */
function RatingStars({ rating, size = 13 }) {
  const filled = Math.round(rating)
  return (
    <span style={{ display: 'inline-flex', gap: 1, alignItems: 'center', lineHeight: 0 }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Ico.star key={i} size={size} color={i < filled ? STAR_YELLOW : P.outlineVariant} filled={i < filled} />
      ))}
    </span>
  )
}

/* ── Placeholder imagen (emoji sobre gradiente suave) ── */
function ImgPlaceholder({ cat }) {
  const meta = COMERCIOS[cat] || COMERCIOS['Otro']
  return (
    <div style={{
      width: '100%', height: '100%',
      background: `linear-gradient(135deg, ${P.surfaceHigh} 0%, ${P.surfaceLowest} 100%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 36,
    }}>
      <span>{meta.emoji}</span>
    </div>
  )
}

/* ── Logo circular del comercio (32px o 72px) ── */
function CommerceLogo({ c, size = 32 }) {
  const cat = c.categories?.[0] || c.category || 'Otro'
  const meta = COMERCIOS[cat] || COMERCIOS['Otro']
  if (c.logo_url) {
    return (
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: P.tertiaryContainer, overflow: 'hidden', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <img src={c.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
    )
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: P.tertiaryContainer, color: P.onTertiaryContainer,
      overflow: 'hidden', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.5,
    }}>
      <span>{meta.emoji}</span>
    </div>
  )
}

/* ════════════════════════════════════════════════════════
   CARD DESTACADA (carrusel horizontal — 260px)
   Jerarquía clara: Imagen → Categoría → Nombre → Estado + Rating
   · Emojis (⭐ 📍) en vez de SVGs fríos.
   · Texto min 12px (badges) / 13px+ (body).
   · Máx 5 elementos por tarjeta.
   ════════════════════════════════════════════════════════ */
function CardDestacada({ c, userCoords, onClick }) {
  const hor = horarioFeed(c.opening_hours)
  const cat = c.categories?.[0] || c.category || 'Otro'
  const meta = COMERCIOS[cat] || COMERCIOS['Otro']
  const dist = userCoords ? haversine(userCoords.lat, userCoords.lng, c.lat, c.lng) : null
  const distTxt = distancia(dist)
  const rating = ratingFor(c)
  const abierto = hor?.abierto

  return (
    <div
      onClick={onClick}
      className="com-tap"
      style={{
        flexShrink: 0, width: 260, borderRadius: 16, overflow: 'hidden',
        background: P.surfaceLowest, border: `1px solid ${P.outlineVariant}`,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)', cursor: 'pointer',
      }}
    >
      {/* ── Imagen (132px) con badge + distancia ── */}
      <div style={{ position: 'relative', height: 132, overflow: 'hidden', background: P.surfaceHigh }}>
        {c.cover_url
          ? <img src={c.cover_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <ImgPlaceholder cat={cat} />}
        {/* Badge ⭐ Destacado (top-left) */}
        <div style={{
          position: 'absolute', top: 10, left: 10,
          background: P.primary, color: '#fff',
          fontSize: 11, fontWeight: 700,
          padding: '4px 10px', borderRadius: 999,
          boxShadow: '0 2px 6px rgba(22,163,74,0.35)',
          display: 'flex', alignItems: 'center', gap: 3,
        }}>⭐ Destacado</div>
        {/* Distancia (bottom-right) */}
        {distTxt && (
          <div style={{
            position: 'absolute', bottom: 8, right: 8,
            background: 'rgba(255,255,255,0.95)', color: P.onSurface,
            fontSize: 11, fontWeight: 700,
            padding: '3px 9px', borderRadius: 999,
            boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
          }}>📍 {distTxt}</div>
        )}
      </div>

      {/* ── Body ── */}
      <div style={{ padding: '12px 14px 14px' }}>
        {/* Categoría (emoji + texto, chiquito, secondary) */}
        <div style={{
          fontSize: 12, fontWeight: 700, color: meta.color || P.secondary,
          marginBottom: 3, display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <span>{meta.emoji}</span> {cat}
        </div>
        {/* Nombre (grande, bold) */}
        <h3 style={{
          fontSize: 15, fontWeight: 700, color: P.onSurface,
          lineHeight: '20px', margin: 0,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {c.name}
        </h3>
        {/* Estado + Rating (una sola fila, separados por ·) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
          <span style={{
            fontSize: 13, fontWeight: 700,
            color: abierto ? P.primary : P.error,
            display: 'inline-flex', alignItems: 'center', gap: 4,
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%',
              background: abierto ? P.primary : P.error,
            }} />
            {abierto ? 'Abierto' : 'Cerrado'}
          </span>
          <span style={{ color: P.outlineVariant, fontSize: 13 }}>·</span>
          <span style={{
            fontSize: 13, fontWeight: 600, color: P.onSurface,
          }}>⭐ {rating.toFixed(1)}</span>
        </div>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════
   CARD CERCA (lista vertical — HORIZONTAL: img 88px izq + body der)
   Jerarquía clara: Imagen → Nombre → Estado → Descripción → Rating + Dist
   · Emojis (⭐ 📍) en vez de SVGs.
   · Texto min 12.5px. Sin uppercase, sin tracking-tighter.
   · Máx 5 elementos por tarjeta. Sin flecha (toda la card es tap).
   ════════════════════════════════════════════════════════ */
function CardCerca({ c, userCoords, onClick }) {
  const hor = horarioFeed(c.opening_hours)
  const cat = c.categories?.[0] || c.category || 'Otro'
  const meta = COMERCIOS[cat] || COMERCIOS['Otro']
  const dist = userCoords ? haversine(userCoords.lat, userCoords.lng, c.lat, c.lng) : null
  const distTxt = distancia(dist)
  const rating = ratingFor(c)
  const abierto = hor?.abierto

  return (
    <div
      onClick={onClick}
      className="com-tap"
      style={{
        display: 'flex', gap: 12, padding: 12,
        borderRadius: 16, background: P.surfaceLowest,
        border: `1px solid ${P.outlineVariant}`,
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        cursor: 'pointer',
      }}
    >
      {/* ── Imagen 88x88 (rounded 12px) ── */}
      <div style={{
        width: 88, height: 88, flexShrink: 0, borderRadius: 12, overflow: 'hidden', background: P.surfaceHigh,
      }}>
        {c.cover_url
          ? <img src={c.cover_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <ImgPlaceholder cat={cat} />}
      </div>

      {/* ── Body (flex-col, justify-center, gap 4) ── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        justifyContent: 'center', minWidth: 0, gap: 3,
      }}>
        {/* Nombre (grande, bold) */}
        <h3 style={{
          fontSize: 15.5, fontWeight: 700, color: P.onSurface,
          lineHeight: '20px', margin: 0,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {c.name}
        </h3>
        {/* Estado (punto de color + texto + countdown si hay) */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          fontSize: 12.5, fontWeight: 700,
          color: abierto ? P.primary : P.error,
        }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            background: abierto ? P.primary : P.error,
            flexShrink: 0,
          }} />
          {abierto ? 'Abierto' : 'Cerrado'}
          {hor?.secundario && (
            <span style={{ fontSize: 11.5, fontWeight: 500, color: P.secondary }}>
              · {hor.secundario}
            </span>
          )}
        </div>
        {/* Descripción (1 línea, secondary) — solo si existe */}
        {c.description && (
          <p style={{
            fontSize: 13, color: P.onSurfaceVariant, lineHeight: '17px', margin: 0,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {c.description}
          </p>
        )}
        {/* Footer: rating + distancia (una fila, separados por ·) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 2 }}>
          <span style={{
            fontSize: 12.5, fontWeight: 700, color: P.onSurface,
          }}>⭐ {rating.toFixed(1)}</span>
          {distTxt && (
            <>
              <span style={{ color: P.outlineVariant, fontSize: 12 }}>·</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: P.secondary }}>
                📍 {distTxt}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════
   MODAL DE DETALLE
   ════════════════════════════════════════════════════════ */
function ComercioDetalle({ c, userCoords, onClose, onEditar, esAdmin, currentUser }) {
  const [fav, setFav] = useState(false)
  const [lightboxIdx, setLightboxIdx] = useState(null)
  const [mapaOpen, setMapaOpen] = useState(false)
  const [opiniones, setOpiniones] = useState(null) // null=cargando, [] vacío=sin opiniones
  const [opinando, setOpinando] = useState(false)
  const [nuevaOpinion, setNuevaOpinion] = useState({ rating: 5, texto: '' })
  const [enviandoOp, setEnviandoOp] = useState(false)
  const [errorOp, setErrorOp] = useState('')
  const galleryRef = useRef(null)

  const cat = c.categories?.[0] || c.category || 'Otro'
  const meta = COMERCIOS[cat] || COMERCIOS['Otro']
  const hor = horarioFeed(c.opening_hours)
  const dist = userCoords ? haversine(userCoords.lat, userCoords.lng, c.lat, c.lng) : null
  const distTxt = distancia(dist)
  // Rating REAL: promedio de las opiniones cargadas desde commerce_reviews.
  // Si no hay opiniones todavía, NO inventamos — mostramos "Nuevo".
  const reviews = opiniones?.length || 0
  const rating = reviews > 0
    ? Math.round((opiniones.reduce((s, o) => s + (Number(o.rating) || 0), 0) / reviews) * 10) / 10
    : null
  const wa = waLink(c.phone)
  const gallery = Array.isArray(c.gallery) ? c.gallery.filter(Boolean) : []

  useEffect(() => {
    if (!galleryRef.current || gallery.length < 3) return
    const el = galleryRef.current
    let raf
    let dir = 1
    const step = () => {
      el.scrollLeft += 0.4 * dir
      if (el.scrollLeft >= el.scrollWidth - el.clientWidth - 1) dir = -1
      else if (el.scrollLeft <= 1) dir = 1
      raf = requestAnimationFrame(step)
    }
    const t = setTimeout(() => { raf = requestAnimationFrame(step) }, 2500)
    return () => { clearTimeout(t); cancelAnimationFrame(raf) }
  }, [gallery.length])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // ── Cargar opiniones REALES desde commerce_reviews ──
  // Si la tabla no existe todavía o RLS bloquea, cae al catch → [] (vacío).
  // El SQL para crear la tabla está en el comentario al final del archivo.
  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const { data, error } = await supabase
          .from('commerce_reviews')
          .select('id, rating, comment, created_at, author:profiles!author_id (full_name, avatar_url)')
          .eq('commerce_id', c.id)
          .order('created_at', { ascending: false })
          .limit(20)
        if (error) throw error
        if (active) setOpiniones(data || [])
      } catch (err) {
        // Tabla no existe o sin permisos — dejamos vacío (no rompe la UI).
        console.warn('[commerce_reviews] no se pudo cargar:', err?.message || err)
        if (active) setOpiniones([])
      }
    })()
    return () => { active = false }
  }, [c.id])

  // ── Enviar opinión nueva a commerce_reviews ──
  const enviarOpinion = async () => {
    setErrorOp('')
    if (!nuevaOpinion.texto.trim()) {
      setErrorOp('Escribe algo antes de enviar')
      return
    }
    if (!currentUser?.id) {
      setErrorOp('Debes iniciar sesión para opinar')
      return
    }
    setEnviandoOp(true)
    try {
      // Resolvemos el profile_id del usuario actual
      const { data: prof } = await supabase
        .from('profiles').select('id').eq('user_id', currentUser.id).maybeSingle()
      if (!prof?.id) throw new Error('No se encontró tu perfil')

      const { data, error } = await supabase
        .from('commerce_reviews')
        .insert({
          commerce_id: c.id,
          author_id: prof.id,
          rating: nuevaOpinion.rating,
          comment: nuevaOpinion.texto.trim(),
        })
        .select('id, rating, comment, created_at, author:profiles!author_id (full_name, avatar_url)')
        .single()
      if (error) throw error

      setOpiniones(prev => [data, ...(prev || [])])
      setNuevaOpinion({ rating: 5, texto: '' })
      setOpinando(false)
    } catch (err) {
      setErrorOp(
        err?.code === '42P01' || /relation .* does not exist/i.test(err?.message || '')
          ? 'La tabla commerce_reviews todavía no existe. Corre el SQL del final del archivo.'
          : (err?.message || 'No se pudo enviar la opinión')
      )
    } finally {
      setEnviandoOp(false)
    }
  }

  const mapsLink = (c.lat && c.lng)
    ? `https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.name + ' ' + (c.address || ''))}`

  return (
    <div
      onClick={onClose}
      style={{
        position: 'absolute', inset: 0, zIndex: 1000,
        background: 'rgba(15,25,20,0.55)', backdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="com-sheet"
        style={{
          width: '100%', maxWidth: 480, maxHeight: '100%',
          background: P.surface, borderRadius: '22px 22px 0 0',
          overflow: 'hidden', display: 'flex', flexDirection: 'column',
          position: 'relative',
        }}
      >
        {/* Header flotante */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, zIndex: 30,
          padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <button
            onClick={onClose}
            className="com-btn"
            style={{
              width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,0.95)',
              border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 10px rgba(0,0,0,0.18)', cursor: 'pointer',
            }}
            aria-label="Volver"
          >
            <Ico.back size={20} color={P.onSurface} />
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            {esAdmin && (
              <button
                onClick={() => onEditar(c)}
                className="com-btn"
                style={{
                  width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,0.95)',
                  border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.18)', cursor: 'pointer',
                }}
                aria-label="Editar"
              >
                <Ico.edit size={16} color={P.primary} />
              </button>
            )}
            <button
              onClick={() => setFav(f => !f)}
              className="com-btn"
              style={{
                width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,0.95)',
                border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 10px rgba(0,0,0,0.18)', cursor: 'pointer',
              }}
              aria-label="Favorito"
            >
              <Ico.heart size={18} color={fav ? P.error : P.onSurface} filled={fav} />
            </button>
          </div>
        </div>

        {/* Body scrollable */}
        <div className="com-body-scroll" style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
          {/* Portada */}
          <div style={{ position: 'relative', height: 220, background: P.surfaceHigh }}>
            {c.cover_url
              ? <img src={c.cover_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <ImgPlaceholder cat={cat} />}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(to top, rgba(0,0,0,0.45) 0%, transparent 55%)',
            }} />
            {/* Logo sobrepuesto */}
            <div style={{ position: 'absolute', left: 16, bottom: -32, zIndex: 5 }}>
              <div style={{
                width: 72, height: 72, borderRadius: '50%',
                background: P.surfaceLowest, padding: 3,
                boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
              }}>
                <CommerceLogo c={c} size={66} />
              </div>
            </div>
            {c.is_premium && (
              <div style={{
                position: 'absolute', top: 60, right: 14,
                background: P.primaryContainer, color: P.onPrimaryContainer,
                fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 999,
                boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
              }}>
                ★ Destacado
              </div>
            )}
          </div>

          {/* Info principal */}
          <div style={{ padding: '44px 20px 18px' }}>
            <h1 style={{
              fontSize: 22, fontWeight: 700, color: P.onSurface,
              letterSpacing: '-0.02em', margin: 0, lineHeight: '28px',
            }}>
              {c.name}
            </h1>

            {/* Rating + reviews + estado (rating REAL de opiniones, o "Nuevo") */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              {rating !== null ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <RatingStars rating={rating} size={14} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: P.onSurface }}>{rating.toFixed(1)}</span>
                  <span style={{ fontSize: 12, color: P.secondary }}>· {reviews} {reviews === 1 ? 'opinión' : 'opiniones'}</span>
                </span>
              ) : (
                <span style={{
                  fontSize: 12, fontWeight: 700, color: P.onPrimaryFixed,
                  background: P.primaryFixed, padding: '3px 10px', borderRadius: 999,
                }}>✨ Nuevo en el barrio</span>
              )}
              <span style={{ color: P.outlineVariant }}>·</span>
              <span style={{
                fontSize: 12, fontWeight: 700,
                color: hor?.abierto ? P.primary : P.error,
                display: 'inline-flex', alignItems: 'center', gap: 4,
              }}>
                <span style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: hor?.abierto ? P.primary : P.error,
                }} />
                {hor ? hor.principal : 'Sin horario'}
                {/* Countdown: "cierra en X min" o "abre en X min" */}
                {hor?.secundario && (
                  <span style={{ fontSize: 11, fontWeight: 600, color: hor.abierto ? P.primary : P.secondary, marginLeft: 2 }}>
                    ({hor.secundario})
                  </span>
                )}
              </span>
            </div>

            {/* Categoría chip + distancia */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              <span style={{
                fontSize: 12, fontWeight: 600, color: P.onSurfaceVariant,
                background: P.surfaceVariant, padding: '4px 10px', borderRadius: 999,
                display: 'inline-flex', alignItems: 'center', gap: 4,
              }}>{meta.emoji} {cat}</span>
              {distTxt && (
                <span style={{
                  fontSize: 12, fontWeight: 600, color: P.onSurfaceVariant,
                  background: P.surfaceVariant, padding: '4px 10px', borderRadius: 999,
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                }}>📍 {distTxt}</span>
              )}
              {c.discount_text && (
                <span style={{
                  fontSize: 12, fontWeight: 700, color: '#9a3412',
                  background: '#ffedd5', padding: '4px 10px', borderRadius: 999,
                }}>{c.discount_text}</span>
              )}
            </div>

            {/* Dirección */}
            {c.address && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6, marginTop: 12,
                fontSize: 13, color: P.onSurfaceVariant,
              }}>
                <Ico.pin size={13} color={P.primary} />
                <span>{c.address}</span>
              </div>
            )}
          </div>

          {/* CTAs */}
          <div style={{ padding: '4px 20px 20px', display: 'flex', gap: 9 }}>
            <a
              href={wa || '#'} target="_blank" rel="noopener noreferrer"
              onClick={(e) => { if (!wa) e.preventDefault() }}
              className="com-cta"
              style={{
                flex: 1, height: 48, borderRadius: 12,
                background: '#25D366', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                fontSize: 14, fontWeight: 700, textDecoration: 'none',
                boxShadow: '0 4px 12px rgba(37,211,102,0.3)',
                opacity: wa ? 1 : 0.45, cursor: wa ? 'pointer' : 'not-allowed',
              }}
            >
              <Ico.whatsapp size={18} /> WhatsApp
            </a>
            <a
              href={c.phone ? `tel:${c.phone}` : '#'}
              onClick={(e) => { if (!c.phone) e.preventDefault() }}
              className="com-cta"
              style={{
                width: 48, height: 48, borderRadius: 12, background: P.primary,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0,109,50,0.25)',
                opacity: c.phone ? 1 : 0.45,
              }}
              aria-label="Llamar"
            >
              <Ico.phone size={18} />
            </a>
            <a
              href={mapsLink} target="_blank" rel="noopener noreferrer"
              className="com-cta"
              style={{
                width: 48, height: 48, borderRadius: 12, background: '#ea580c',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(234,88,12,0.28)',
              }}
              aria-label="Cómo llegar"
            >
              <Ico.nav size={18} />
            </a>
          </div>

          {/* ══ GALERÍA (ARRIBA — justo después de CTAs) ══ */}
          {gallery.length > 0 && (
            <div style={{ padding: '0 0 20px' }}>
              <div style={{ padding: '0 20px' }}>
                <SectionTitle>Galería</SectionTitle>
              </div>
              <div
                ref={galleryRef}
                className="com-scroll"
                style={{
                  display: 'flex', gap: 9, overflowX: 'auto',
                  padding: '10px 20px', scrollBehavior: 'smooth',
                }}
              >
                {gallery.map((src, i) => (
                  <img
                    key={i} src={src} alt={`Foto ${i + 1}`}
                    onClick={() => setLightboxIdx(i)}
                    style={{
                      flexShrink: 0, width: 150, height: 110, objectFit: 'cover',
                      borderRadius: 8, cursor: 'pointer', border: `1px solid ${P.outlineVariant}`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Descripción */}
          {c.description && (
            <div style={{ padding: '0 20px 20px' }}>
              <SectionTitle>Sobre este lugar</SectionTitle>
              <p style={{ fontSize: 14, color: P.onSurfaceVariant, lineHeight: '20px', margin: '8px 0 0' }}>
                {c.description}
              </p>
            </div>
          )}

          {/* ══ OPINIONES DE VECINOS (datos reales de commerce_reviews) ══ */}
          <div style={{ padding: '0 20px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <SectionTitle>Opiniones de vecinos</SectionTitle>
              {reviews > 0 && (
                <span style={{ fontSize: 12, color: P.secondary, fontWeight: 600 }}>{reviews} {reviews === 1 ? 'opinión' : 'opiniones'}</span>
              )}
            </div>

            {/* Botón / link para escribir opinión */}
            {!opinando && (
              <button
                onClick={() => setOpinando(true)}
                className="com-btn"
                style={{
                  width: '100%', padding: '11px 14px', borderRadius: 12,
                  border: `1.5px dashed ${P.primary}`, background: P.primaryFixed,
                  color: P.onPrimaryFixed, fontSize: 13.5, fontWeight: 700,
                  cursor: 'pointer', fontFamily: P.font,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  marginBottom: 14,
                }}
              >
                ✍️ Escribir opinión
              </button>
            )}

            {/* Mini-formulario de opinión (inline) */}
            {opinando && (
              <div style={{
                marginBottom: 14, padding: 14, borderRadius: 12,
                background: P.surfaceLow, border: `1px solid ${P.outlineVariant}`,
              }}>
                {/* Selector de estrellas */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: P.onSurface }}>Tu nota:</span>
                  <div style={{ display: 'flex', gap: 2 }}>
                    {[1,2,3,4,5].map((n) => (
                      <button
                        key={n}
                        onClick={() => setNuevaOpinion(o => ({ ...o, rating: n }))}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                          fontSize: 24, lineHeight: 1,
                          filter: n <= nuevaOpinion.rating ? 'none' : 'grayscale(1)',
                          opacity: n <= nuevaOpinion.rating ? 1 : 0.3,
                        }}
                        aria-label={`${n} estrellas`}
                      >⭐</button>
                    ))}
                  </div>
                </div>
                {/* Textarea */}
                <textarea
                  value={nuevaOpinion.texto}
                  onChange={(e) => setNuevaOpinion(o => ({ ...o, texto: e.target.value }))}
                  placeholder="¿Cómo te fue con este comercio? Sé específico y amable."
                  rows={3}
                  style={{
                    width: '100%', padding: 10, borderRadius: 8,
                    border: `1px solid ${P.outlineVariant}`, background: P.surfaceLowest,
                    color: P.onSurface, fontSize: 14, fontFamily: P.font,
                    resize: 'vertical', outline: 'none', boxSizing: 'border-box',
                  }}
                />
                {errorOp && (
                  <div style={{ fontSize: 12, color: P.error, marginTop: 8, fontWeight: 600 }}>{errorOp}</div>
                )}
                {/* Acciones */}
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button
                    onClick={() => { setOpinando(false); setErrorOp(''); setNuevaOpinion({ rating: 5, texto: '' }) }}
                    style={{
                      flex: 1, padding: '10px 0', borderRadius: 10,
                      border: `1px solid ${P.outlineVariant}`, background: P.surfaceLowest,
                      color: P.onSurface, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: P.font,
                    }}
                  >Cancelar</button>
                  <button
                    onClick={enviarOpinion}
                    disabled={enviandoOp}
                    style={{
                      flex: 2, padding: '10px 0', borderRadius: 10,
                      border: 'none', background: P.primary, color: '#fff',
                      fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: P.font,
                      opacity: enviandoOp ? 0.6 : 1,
                    }}
                  >{enviandoOp ? 'Enviando…' : 'Publicar opinión'}</button>
                </div>
              </div>
            )}

            {/* Lista de opiniones */}
            {opiniones === null ? (
              <div style={{ padding: '20px 0', textAlign: 'center', fontSize: 13, color: P.secondary }}>Cargando opiniones…</div>
            ) : opiniones.length === 0 ? (
              <div style={{
                padding: '24px 16px', textAlign: 'center', borderRadius: 12,
                background: P.surfaceLow, border: `1px solid ${P.outlineVariant}`,
              }}>
                <div style={{ fontSize: 32, marginBottom: 6 }}>💬</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: P.onSurface, marginBottom: 2 }}>Sin opiniones todavía</div>
                <div style={{ fontSize: 12.5, color: P.secondary, lineHeight: '18px' }}>
                  Sé el primero en opinar sobre este comercio.
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {opiniones.map((o) => (
                  <div key={o.id} style={{
                    padding: 12, borderRadius: 12, background: P.surfaceLow,
                    border: `1px solid ${P.outlineVariant}`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      {/* Avatar del autor */}
                      {o.author?.avatar_url
                        ? <img src={o.author.avatar_url} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
                        : <span style={{
                            width: 28, height: 28, borderRadius: '50%', background: P.primary, color: '#fff',
                            fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>{iniciales(o.author?.full_name)}</span>}
                      <span style={{ fontSize: 13, fontWeight: 700, color: P.onSurface, flex: 1, minWidth: 0,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {o.author?.full_name || 'Vecino/a'}
                      </span>
                      <span style={{ fontSize: 12, color: P.primary, fontWeight: 700 }}>
                        {'⭐'.repeat(Number(o.rating) || 0)}
                      </span>
                    </div>
                    {o.comment && (
                      <p style={{ fontSize: 13.5, color: P.onSurfaceVariant, lineHeight: '19px', margin: 0 }}>
                        {o.comment}
                      </p>
                    )}
                    <div style={{ fontSize: 11, color: P.outline, marginTop: 6 }}>{hace(o.created_at)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ══ UBICACIÓN (DROPDOWN — colapsado por defecto) ══ */}
          {c.lat && c.lng && (
            <div style={{ padding: '0 20px 24px' }}>
              <button
                onClick={() => setMapaOpen(v => !v)}
                className="com-btn"
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 16px', borderRadius: 12,
                  border: `1px solid ${P.outlineVariant}`, background: P.surfaceLow,
                  cursor: 'pointer', fontFamily: P.font,
                }}
                aria-expanded={mapaOpen}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 600, color: P.onSurface }}>
                  <span style={{ fontSize: 18 }}>📍</span> Ubicación
                  {distTxt && <span style={{ fontSize: 12, fontWeight: 600, color: P.secondary }}>· {distTxt}</span>}
                </span>
                <span style={{
                  fontSize: 18, color: P.primary, transition: 'transform .2s ease',
                  transform: mapaOpen ? 'rotate(180deg)' : 'none',
                }}>⌄</span>
              </button>
              {mapaOpen && (
                <div style={{ marginTop: 10 }}>
                  <div style={{
                    borderRadius: 12, overflow: 'hidden',
                    border: `1px solid ${P.outlineVariant}`, height: 160,
                  }}>
                    <MiniMap lat={c.lat} lng={c.lng} label={c.name} />
                  </div>
                  {c.address && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 6, marginTop: 10,
                      fontSize: 13, color: P.onSurfaceVariant,
                    }}>
                      <Ico.pin size={13} color={P.primary} />
                      <span>{c.address}</span>
                    </div>
                  )}
                  <a
                    href={mapsLink} target="_blank" rel="noopener noreferrer"
                    className="com-cta"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                      marginTop: 10, height: 42, borderRadius: 12,
                      background: P.primaryFixed, color: P.onPrimaryFixed,
                      fontSize: 14, fontWeight: 700, textDecoration: 'none',
                    }}
                  >
                    <Ico.nav size={16} color={P.onPrimaryFixed} /> Cómo llegar
                  </a>
                </div>
              )}
            </div>
          )}

          {c.instagram && (
            <div style={{ padding: '0 20px 28px', textAlign: 'center' }}>
              <a
                href={`https://instagram.com/${c.instagram.replace('@', '')}`}
                target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 13, color: '#7c3aed', fontWeight: 600, textDecoration: 'none' }}
              >📷 @{c.instagram.replace('@', '')}</a>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxIdx !== null && (
        <div
          onClick={() => setLightboxIdx(null)}
          className="com-lightbox"
          style={{
            position: 'absolute', inset: 0, zIndex: 1010,
            background: 'rgba(0,0,0,0.92)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', padding: 20,
          }}
        >
          <button
            onClick={() => setLightboxIdx(null)}
            style={{
              position: 'absolute', top: 16, right: 16, width: 40, height: 40,
              borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: 'none',
              color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Ico.close size={22} color="#fff" />
          </button>
          <img
            src={gallery[lightboxIdx]} alt=""
            style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: 12, objectFit: 'contain' }}
          />
        </div>
      )}
    </div>
  )
}

function SectionTitle({ children }) {
  return (
    <h2 style={{
      fontSize: 16, fontWeight: 600, color: P.onSurface,
      lineHeight: '24px', margin: 0,
    }}>{children}</h2>
  )
}

/* ════════════════════════════════════════════════════════
   🧪 DEMO — comercios de prueba (3 destacados + 3 cerca de ti)

   Sirven solo para ver cómo se ve la app con varias tarjetas.

   ► PARA QUITARLOS (2 pasos):
     1. Borra todo este bloque (MOCK_COMERCIOS).
     2. En la función cargar(), cambia la línea:
            setComercios([...(data || []), ...MOCK_COMERCIOS])
        de vuelta a:
            setComercios(data || [])
   ════════════════════════════════════════════════════════ */
const MOCK_COMERCIOS = [
  // ── 3 destacados (is_premium: true) ──
  {
    id: 'demo-dest-1',
    name: 'Panadería Las Delicias',
    description: 'Pan amasado al horno de barro, colambres y empanadas. Recién horneado desde las 6 am.',
    address: 'Av. Las Hualtatas 5800, Las Condes',
    lat: -33.3985, lng: -70.5495,
    phone: '+56987654321',
    categories: ['Panadería'],
    opening_hours: { lun:{o:'06:00',c:'21:00'}, mar:{o:'06:00',c:'21:00'}, mie:{o:'06:00',c:'21:00'}, jue:{o:'06:00',c:'21:00'}, vie:{o:'06:00',c:'21:00'}, sab:{o:'06:00',c:'21:00'}, dom:{o:'07:00',c:'14:00'} },
    is_premium: true, is_active: true,
    logo_url: null, cover_url: null, gallery: [],
    discount_text: '10% en pan amasado antes de las 8 am',
    instagram: '@panaderiadelicias',
    neighborhood_id: null,
  },
  {
    id: 'demo-dest-2',
    name: 'Café Alto El Manzano',
    description: 'Café de especialidad, grano chileno. Tortas caseras y sándwiches para llevar.',
    address: 'El Manzano 432, Las Condes',
    lat: -33.3920, lng: -70.5410,
    phone: '+56976543210',
    categories: ['Cafetería'],
    opening_hours: { lun:{o:'07:30',c:'20:00'}, mar:{o:'07:30',c:'20:00'}, mie:{o:'07:30',c:'20:00'}, jue:{o:'07:30',c:'20:00'}, vie:{o:'07:30',c:'21:00'}, sab:{o:'08:00',c:'21:00'}, dom:{o:'08:00',c:'17:00'} },
    is_premium: true, is_active: true,
    logo_url: null, cover_url: null, gallery: [],
    discount_text: '2x1 en café latte de 4 a 6 pm',
    instagram: '@cafealtomanzano',
    neighborhood_id: null,
  },
  {
    id: 'demo-dest-3',
    name: 'Súper Express El Roble',
    description: 'Almacén de barrio con todo lo que olvidaste comprar. Despacho a domicilio en el barrio.',
    address: 'Los Dominicos 1234, Las Condes',
    lat: -33.3890, lng: -70.5520,
    phone: '+56965432109',
    categories: ['Almacén'],
    opening_hours: { lun:{o:'07:00',c:'23:00'}, mar:{o:'07:00',c:'23:00'}, mie:{o:'07:00',c:'23:00'}, jue:{o:'07:00',c:'23:00'}, vie:{o:'07:00',c:'23:30'}, sab:{o:'07:00',c:'23:30'}, dom:{o:'08:00',c:'23:00'} },
    is_premium: true, is_active: true,
    logo_url: null, cover_url: null, gallery: [],
    discount_text: 'Despacho gratis en el barrio desde $15.000',
    instagram: '',
    neighborhood_id: null,
  },
  // ── 3 cerca de ti (is_premium: false) ──
  {
    id: 'demo-cerca-1',
    name: 'Verdulería Doña Rosa',
    description: 'Verduras y frutas frescas de la Vega. Surco nuevo cada lunes y jueves.',
    address: 'Av. Cristóbal Colón 5210, Las Condes',
    lat: -33.4010, lng: -70.5460,
    phone: '+56954321098',
    categories: ['Verdulería'],
    opening_hours: { lun:{o:'08:00',c:'20:00'}, mar:{o:'08:00',c:'20:00'}, mie:{o:'08:00',c:'20:00'}, jue:{o:'08:00',c:'20:00'}, vie:{o:'08:00',c:'20:30'}, sab:{o:'08:00',c:'20:30'}, dom:{o:'09:00',c:'14:00'} },
    is_premium: false, is_active: true,
    logo_url: null, cover_url: null, gallery: [],
    discount_text: '',
    instagram: '',
    neighborhood_id: null,
  },
  {
    id: 'demo-cerca-2',
    name: 'Botillería El Sol',
    description: 'Cervezas nacionales y artesanales, vinos y todo para el once o carrete. Hasta tarde.',
    address: 'Enrique Foster 2150, Las Condes',
    lat: -33.3960, lng: -70.5430,
    phone: '+56943210987',
    categories: ['Botillería'],
    opening_hours: { lun:{o:'09:00',c:'23:00'}, mar:{o:'09:00',c:'23:00'}, mie:{o:'09:00',c:'23:00'}, jue:{o:'09:00',c:'23:00'}, vie:{o:'09:00',c:'04:00'}, sab:{o:'09:00',c:'04:00'}, dom:{o:'10:00',c:'23:00'} },
    is_premium: false, is_active: true,
    logo_url: null, cover_url: null, gallery: [],
    discount_text: '',
    instagram: '',
    neighborhood_id: null,
  },
  {
    id: 'demo-cerca-3',
    name: 'Carnicería Don Pedro',
    description: 'Corte a pedido, carne madurada y pollo de campo. Calidad de mercado oriente.',
    address: 'Av. Américo Vespucio 1800, Las Condes',
    lat: -33.4030, lng: -70.5500,
    phone: '+56932109876',
    categories: ['Carnicería'],
    opening_hours: { lun:{o:'08:00',c:'19:00'}, mar:{o:'08:00',c:'19:00'}, mie:{o:'08:00',c:'19:00'}, jue:{o:'08:00',c:'19:00'}, vie:{o:'08:00',c:'19:30'}, sab:{o:'08:00',c:'19:30'}, dom:{o:'09:00',c:'14:00'} },
    is_premium: false, is_active: true,
    logo_url: null, cover_url: null, gallery: [],
    discount_text: '',
    instagram: '',
    neighborhood_id: null,
  },
]

/* ════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL — estructura EXACTA del HTML de Stitch
   ════════════════════════════════════════════════════════ */
function Comercios({ currentUser, onNavigate, onCrear, onEditar }) {
  const [profile, setProfile] = useState(null)
  const [comercios, setComercios] = useState([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [cat, setCat] = useState('Todas')
  const [userCoords, setUserCoords] = useState(null)
  const [seleccionado, setSeleccionado] = useState(null)

  useEffect(() => { cargar() }, [currentUser?.id])

  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 }
    )
  }, [])

  const cargar = async () => {
    if (!currentUser?.id) { setCargando(false); return }
    setCargando(true)
    try {
      const { data: p } = await supabase
        .from('profiles').select('*')
        .eq('user_id', currentUser.id).maybeSingle()
      if (!p) { setProfile(null); setComercios([]); return }
      setProfile(p)
      const { data, error } = await supabase
        .from('commerces').select('*')
        .eq('neighborhood_id', p.neighborhood_id)
        .eq('is_active', true)
        .order('is_premium', { ascending: false })
        .order('name', { ascending: true })
      if (error) console.error('[comercios] Error:', error)
      // 🧪 DEMO: el spread ...MOCK_COMERCIOS agrega 6 comercios de prueba.
      // Para quitarlos, borra el spread y deja solo: setComercios(data || [])
      setComercios([...(data || []), ...MOCK_COMERCIOS])
    } catch (err) {
      console.error('Error cargando comercios:', err)
    } finally {
      setCargando(false)
    }
  }

  const nav = onNavigate || (() => {})

  const filtrados = comercios.filter((c) => {
    const cats = c.categories?.length ? c.categories : (c.category ? [c.category] : [])
    if (cat !== 'Todas' && !cats.includes(cat)) return false
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase()
      const buscarEn = `${c.name || ''} ${c.description || ''} ${c.address || ''} ${cats.join(' ')}`.toLowerCase()
      if (!buscarEn.includes(q)) return false
    }
    return true
  })

  const destacados = filtrados.filter((c) => c.is_premium)
  const resto = filtrados.filter((c) => !c.is_premium)
  const restoOrdenado = userCoords
    ? [...resto].sort((a, b) => {
        const da = haversine(userCoords.lat, userCoords.lng, a.lat, a.lng) ?? Infinity
        const db = haversine(userCoords.lat, userCoords.lng, b.lat, b.lng) ?? Infinity
        return da - db
      })
    : resto

  const esAdmin = profile?.is_admin || profile?.role === 'admin' || profile?.is_operator
  const tieneFiltro = busqueda || cat !== 'Todas'
  const nombreUsuario = profile?.full_name?.split(' ')[0] || profile?.name?.split(' ')[0] || 'vecino'
  const ubicacionTxt = 'El Barrio' + (profile?.comuna ? ', ' + profile.comuna : ', Las Condes')
  const avatarUrl = profile?.avatar_url

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      background: P.surface, fontFamily: P.font, color: P.onSurface,
      position: 'relative', overflow: 'hidden',
    }}>
      <style>{GLOBAL_STYLES}</style>

      {/* ══════ HEADER — TopBar del Mercado (brand 🏘️ el barrio + campana + avatar) ══════ */}
      <div style={{ flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', position: 'relative', zIndex: 10 }}>
        <TopBar
          notifCount={3}
          onAvatar={() => nav('perfil')}
          onNavigate={onNavigate}
          userName={profile?.full_name || currentUser?.user_metadata?.full_name || ''}
          avatarUrl={avatarUrl}
        />
      </div>

      {/* ══════ CONTENIDO SCROLLABLE (flex:1 + overflowY auto — scroll propio, no escapa del phone-frame) ══════ */}
      <div className="com-scroll" style={{
        flex: 1, minHeight: 0, overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        paddingLeft: 20, paddingRight: 20,
        paddingBottom: esAdmin ? 96 : 32,
      }}>
      {/* ══════ SEARCH BAR ══════ */}
      <div style={{ position: 'relative', marginBottom: 24, marginTop: 4 }}>
        <span style={{
          position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
          display: 'flex', alignItems: 'center', pointerEvents: 'none',
        }}>
          <Ico.search size={22} color={P.outline} />
        </span>
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar tiendas, panaderías..."
          type="text"
          style={{
            width: '100%', paddingLeft: 48, paddingRight: 16, paddingTop: 12, paddingBottom: 12,
            borderRadius: 12, border: '2px solid transparent',
            background: P.surfaceHigh, color: P.onSurface,
            fontSize: 14, fontWeight: 400, lineHeight: '20px',
            fontFamily: P.font, outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* ══════ CATEGORIES CHIP SCROLL ══════ */}
      <div className="com-scroll" style={{
        display: 'flex', gap: 12, overflowX: 'auto',
        marginBottom: 32, paddingTop: 4, paddingBottom: 4,
      }}>
        {['Todas', ...COMERCIOS_CATS].map((cName) => {
          const active = cat === cName
          return (
            <button
              key={cName}
              onClick={() => setCat(cName)}
              className="com-chip"
              style={{
                flexShrink: 0, padding: '8px 16px', borderRadius: 999,
                fontSize: 12, fontWeight: 600, lineHeight: '16px',
                letterSpacing: '0.01em', fontFamily: P.font,
                border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                background: active ? P.primary : P.surfaceHighest,
                color: active ? P.onPrimary : P.onSurfaceVariant,
                boxShadow: active ? '0 2px 4px rgba(0,109,50,0.2)' : 'none',
              }}
            >
              {cName}
            </button>
          )
        })}
      </div>

      {/* ══════ CONTENIDO ══════ */}
      {cargando ? (
        <div style={{ padding: '40px 0', textAlign: 'center' }}>
          <div style={{ fontSize: 14, color: P.onSurfaceVariant }}>Cargando comercios…</div>
        </div>
      ) : filtrados.length === 0 ? (
        <div style={{ padding: '50px 16px', textAlign: 'center' }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>🏪</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: P.onSurface, marginBottom: 4 }}>
            {tieneFiltro ? 'Sin resultados' : 'Aún no hay comercios'}
          </div>
          <div style={{ fontSize: 13, color: P.onSurfaceVariant, lineHeight: '20px' }}>
            {tieneFiltro ? 'Prueba con otra búsqueda o categoría.' : 'Los primeros comercios del barrio aparecerán acá.'}
          </div>
        </div>
      ) : (
        <div>
          {/* ── DESTACADOS (carrusel horizontal) ── */}
          {!tieneFiltro && destacados.length > 0 && (
            <section style={{ marginBottom: 32 }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
                marginBottom: 16,
              }}>
                <h2 style={{
                  fontSize: 16, fontWeight: 600, color: P.onSurface,
                  lineHeight: '24px', margin: 0,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span style={{ fontSize: 18, lineHeight: 1 }}>⭐</span>
                  Comercios Destacados
                </h2>
                <button
                  onClick={() => setBusqueda('')}
                  style={{
                    fontSize: 12, fontWeight: 600, color: P.primary,
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    fontFamily: P.font, padding: 0,
                  }}
                >
                  Ver todos
                </button>
              </div>
              <div className="com-scroll" style={{
                display: 'flex', gap: 12, overflowX: 'auto',
                paddingBottom: 4, paddingLeft: 1, paddingRight: 1,
              }}>
                {destacados.map((c) => (
                  <CardDestacada
                    key={c.id}
                    c={c}
                    userCoords={userCoords}
                    onClick={() => setSeleccionado(c)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* ── CERCA DE TI (lista vertical, cards horizontales) ── */}
          <section>
            <h2 style={{
              fontSize: 16, fontWeight: 600, color: P.onSurface,
              lineHeight: '24px', margin: '0 0 16px',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              {tieneFiltro
                ? <><span style={{ fontSize: 18, lineHeight: 1 }}>🔎</span>Resultados</>
                : <><span style={{ fontSize: 18, lineHeight: 1 }}>📍</span>Cerca de ti</>}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {(tieneFiltro ? filtrados : restoOrdenado).map((c) => (
                <CardCerca
                  key={c.id}
                  c={c}
                  userCoords={userCoords}
                  onClick={() => setSeleccionado(c)}
                />
              ))}
            </div>
          </section>
        </div>
      )}
      </div>{/* end contenido scrollable */}

      {/* ══════ FAB admin (absolute dentro del root relativo — queda sobre el contenido, sobre el TabBar) ══════ */}
      {esAdmin && (
        <button
          onClick={() => onCrear ? onCrear('commerce') : (onEditar && onEditar(null))}
          className="com-cta"
          style={{
            position: 'absolute', bottom: 20, right: 20, zIndex: 40,
            width: 56, height: 56, borderRadius: 16,
            background: P.primary, border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 6px 18px rgba(0,109,50,0.4)',
          }}
          aria-label="Agregar comercio"
        >
          <Ico.plus size={28} color="#fff" />
        </button>
      )}

      {/* ══════ MODAL DETALLE ══════ */}
      {seleccionado && (
        <ComercioDetalle
          c={seleccionado}
          userCoords={userCoords}
          currentUser={currentUser}
          onClose={() => setSeleccionado(null)}
          onEditar={(c) => {
            setSeleccionado(null)
            if (onEditar) onEditar(c)
            else if (onCrear) onCrear('commerce', c)
          }}
          esAdmin={esAdmin}
        />
      )}
    </div>
  )
}

export default Comercios

/* ════════════════════════════════════════════════════════════════════
   🗄️  SQL — CREAR LA TABLA commerce_reviews EN SUPABASE

   Corre esto UNA VEZ en el SQL Editor de tu Supabase para activar
   las Opiniones de Vecinos. Hasta que no lo corras, la sección
   "Opiniones" del detalle mostrará "Sin opiniones todavía" y no
   podrá guardar opiniones nuevas (mostrará un error claro).

   ────────────────────────────────────────────────────────────────────
   create table if not exists public.commerce_reviews (
     id uuid primary key default gen_random_uuid(),
     commerce_id uuid not null references public.commerces(id) on delete cascade,
     author_id uuid not null references public.profiles(id) on delete cascade,
     rating smallint not null check (rating between 1 and 5),
     comment text,
     created_at timestamptz not null default now(),
     unique (commerce_id, author_id)   -- un vecino opina una sola vez por comercio
   );

   create index if not exists commerce_reviews_commerce_id_idx
     on public.commerce_reviews(commerce_id);

   -- RLS: cualquiera logueado puede leer; solo el autor puede borrar/editar lo suyo.
   alter table public.commerce_reviews enable row level security;

   create policy "cualquiera puede leer opiniones"
     on public.commerce_reviews for select
     using (true);

   create policy "vecino puede opinar"
     on public.commerce_reviews for insert
     with check (author_id = auth.uid() OR exists (
       select 1 from public.profiles p where p.id = author_id and p.user_id = auth.uid()
     ));

   create policy "autor puede borrar su opinion"
     on public.commerce_reviews for delete
     using (author_id = auth.uid());
   ════════════════════════════════════════════════════════════════════ */
