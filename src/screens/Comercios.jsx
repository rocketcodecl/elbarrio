import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import {
  C, T, COMERCIOS, COMERCIOS_CATS, iniciales, distancia,
} from '../lib/design'
import MiniMap from '../components/MiniMap'
import { DIAS_SEMANA } from '../lib/horarios'

/*
  COMERCIOS — el directorio del barrio.

  Feed:
    · Título "Comercios de el barrio"
    · Una SOLA lista (sin secciones). Los premium van primero
      con card grande, el resto con card compacta.
    · Card grande: cover bajo + ribbon + nombre + horario feed
      (gris oscuro + verde) + descripción + beneficio + dirección
      + categorías al final.
    · Card compacta: logo + nombre + horario feed + dirección
      + categorías al final.

  Horario feed (formato unificado):
    · "abierto de 09:00 a 20:00  ·  cierra en 2h 15min"
      (gris oscuro)                    (verde marca)
    · "cerrado  ·  abre a las 09:00"   (si abre hoy más tarde)
    · "cerrado hoy"                    (si no abre hoy)
    Nada en negrita.

  Modal (PREMIUM quality):
    · Sheet 97% del viewport → casi sin gap arriba.
    · Cover solo si is_premium (con ribbon + gradiente inferior).
    · Logo grande (76px) centrado, mitad sobre cover / mitad body.
    · Nombre grande + status pill al lado.
    · Horario feed (mismo formato).
    · Banner de Beneficio RE-DISEÑADO: gradiente verde, badge circular
      con icono, dos líneas tipográficas (label + beneficio).
    · Dropdowns VER UBICACIÓN / VER HORARIOS con chevron animado.
    · Categorías al final con header "Rubros".
    · Footer WhatsApp full-width sticky (sin margen desperdiciado).
*/

/* ── Días de la semana (claves de opening_hours) ── */
const DIAS = ['dom', 'lun', 'mar', 'mie', 'jue', 'vie', 'sab']

/* ── Helper: estado del horario para el FEED y el MODAL ── */
const fmtCountdown = (mins) => {
  if (mins < 60) return `en ${mins} min`
  const hh = Math.floor(mins / 60)
  const mm = mins % 60
  return mm > 0 ? `en ${hh}h ${mm}min` : `en ${hh}h`
}

/* Busca el próximo día con horario empezando desde `startOffset` días desde hoy */
const proximoDiaAbierto = (hours, startOffset = 1) => {
  const now = new Date()
  for (let i = startOffset; i <= 7; i++) {
    const d = new Date(now)
    d.setDate(now.getDate() + i)
    const key = DIAS[d.getDay()]
    const h = hours[key]
    if (h && h.o && h.c) {
      const etiqueta = i === 1 ? 'mañana' : key
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
    // Hoy no abre → buscar próximo día
    const prox = proximoDiaAbierto(hours, 1)
    if (!prox) return { principal: 'sin horario', secundario: null, abierto: false }
    return {
      principal: `cierra hoy · abre ${prox.etiqueta} a las ${prox.hora}`,
      secundario: null,
      abierto: false,
    }
  }

  const [ho, mo] = h.o.split(':').map(Number)
  const [hc, mc] = h.c.split(':').map(Number)
  const ahora = now.getHours() * 60 + now.getMinutes()
  const apertura = ho * 60 + mo
  const cierre = hc * 60 + mc

  // Abierto ahora
  if (ahora >= apertura && ahora < cierre) {
    const diff = cierre - ahora
    const cierraEn = diff < 60
      ? `cierra en ${diff} min`
      : (diff % 60 > 0 ? `cierra en ${Math.floor(diff / 60)}h ${diff % 60}min` : `cierra en ${Math.floor(diff / 60)}h`)
    return {
      principal: `abierto de ${h.o} a ${h.c}`,
      secundario: cierraEn,
      abierto: true,
    }
  }

  // Cerrado pero abre hoy más tarde
  if (ahora < apertura) {
    const diff = apertura - ahora
    return {
      principal: `abre hoy a las ${h.o}`,
      secundario: fmtCountdown(diff),
      abierto: false,
    }
  }

  // Ya cerró hoy → buscar próximo día
  const prox = proximoDiaAbierto(hours, 1)
  if (!prox) return { principal: 'cerrado', secundario: null, abierto: false }
  return {
    principal: `cierra hoy · abre ${prox.etiqueta} a las ${prox.hora}`,
    secundario: null,
    abierto: false,
  }
}

/* ── Haversine ── */
const haversine = (lat1, lng1, lat2, lng2) => {
  if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) return null
  const R = 6371000
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))
}

/* ── Íconos ── */
const Ico = {
  back: ({ size = 20, color = C.texto }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6" />
    </svg>
  ),
  search: ({ size = 16, color = C.textoTenue }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  ),
  pin: ({ size = 11, color = C.verde }) => (
    <svg width={size} height={size + 2} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  ),
  clock: ({ size = 12, color = C.verde }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  whatsapp: ({ size = 15, color = C.whatsapp }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={{ color }}>
      <path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 0 1 8.413 3.488 11.824 11.824 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 0 0 1.51 5.26l-.999 3.648 3.978-1.607zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
    </svg>
  ),
  star: ({ size = 11, color = C.dorado }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  ),
  plus: ({ size = 20, color = C.verde }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  gift: ({ size = 13, color = C.verde }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="8" width="18" height="4" rx="1" />
      <path d="M12 8v13" />
      <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
      <path d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5" />
    </svg>
  ),
  close: ({ size = 22, color = C.textoTenue }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  chevron: ({ size = 16, color = C.textoTenue }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6" />
    </svg>
  ),
  edit: ({ size = 14, color = C.verde }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z" />
    </svg>
  ),
  phone: ({ size = 13, color = C.textoTenue }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.33 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z" />
    </svg>
  ),
  /* Storefront lineal */
  store: ({ size = 20, color = C.verde }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l1.5-5h15L21 9" />
      <path d="M4 9v11a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9" />
      <path d="M3 9c0 1.4 1.1 2.5 2.5 2.5S8 10.4 8 9c0 1.4 1.1 2.5 2.5 2.5S13 10.4 13 9c0 1.4 1.1 2.5 2.5 2.5S18 10.4 18 9c0 1.4 1.1 2.5 2.5 2.5S23 10.4 23 9" transform="translate(-1 0)" />
      <path d="M9 21v-6h6v6" />
    </svg>
  ),
  /* Instagram lineal */
  instagram: ({ size = 18, color = C.texto }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  ),
  /* Globe / web lineal */
  globe: ({ size = 18, color = C.texto }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  ),
  /* Phone fill (para CTA Llamar) */
  phoneFill: ({ size = 18, color = C.texto }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M20 15.5c-1.25 0-2.45-.2-3.57-.57-.35-.11-.74-.03-1.02.24l-2.2 2.2c-2.83-1.44-5.15-3.75-6.59-6.59l2.2-2.21c.28-.26.36-.65.25-1C8.7 6.45 8.5 5.25 8.5 4c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.5c0-.55-.45-1-1-1z"/>
    </svg>
  ),
  /* Verified check badge (premium seal) */
  verified: ({ size = 22 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="11" fill={C.verde} />
      <circle cx="12" cy="12" r="9" fill="#fff" stroke={C.verde} strokeWidth="1.5" />
      <path d="M7 12.5l3 3 7-7" stroke={C.verde} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  ),
  /* Chevron left para carrusel */
  chevronLeft: ({ size = 20, color = "#fff" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6" />
    </svg>
  ),
  /* Chevron right para carrusel */
  chevronRight: ({ size = 20, color = "#fff" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6" />
    </svg>
  ),
  /* Directions (cómo llegar) — flecha de navegación estilo Google Maps */
  directions: ({ size = 18, color = "#fff" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12 12 3 3 12l9 9 9-9Z" />
      <path d="M12 7v10" />
      <path d="m9 14 3 3 3-3" />
    </svg>
  ),
}

/* ── Normaliza teléfono ── */
const waLink = (phone) => {
  if (!phone) return null
  const limpio = phone.replace(/[^\d]/g, '')
  if (!limpio) return null
  if (limpio.length === 9 && limpio.startsWith('9')) return `https://wa.me/56${limpio}`
  if (limpio.length === 11 && limpio.startsWith('56')) return `https://wa.me/${limpio}`
  return `https://wa.me/${limpio}`
}

/* ── Bloque de horario para feed y modal ── */
function HorarioBloque({ horario, size = 'normal' }) {
  if (!horario) return null
  const isSm = size === 'sm'
  const fontSize = isSm ? 11.5 : 12.5
  const iconSize = isSm ? 11 : 12
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize, flexWrap: 'wrap',
    }}>
      <Ico.clock size={iconSize} color={C.textoTenue} />
      <span style={{ color: C.texto, fontWeight: 400 }}>
        {horario.principal}
      </span>
      {horario.secundario && (
        <>
          <span style={{ color: C.textoTenue }}>·</span>
          <span style={{ color: C.verde, fontWeight: 400 }}>
            {horario.secundario}
          </span>
        </>
      )}
    </span>
  )
}

/* ════════════════════════════════════════════════════════════
   CARD GRANDE (premium) — feed
   ════════════════════════════════════════════════════════════ */
function CardGrande({ c, userCoords, onAbrir }) {
  const cats = c.categories?.length ? c.categories : (c.category ? [c.category] : [])
  const horario = horarioFeed(c.opening_hours)
  const metros = haversine(userCoords?.lat, userCoords?.lng, c.lat, c.lng)
  const dist = distancia(metros)
  const catInfo = COMERCIOS[cats[0]] || COMERCIOS['Otro']

  /* ── SLIDER de imágenes en el feed ──
     Cover + gallery en un scroll horizontal con snap.
     Si solo hay 1 imagen (o ninguna), se comporta como antes. */
  const gallery = Array.isArray(c.gallery) ? c.gallery.filter(Boolean) : []
  const slides = []
  if (c.cover_url) slides.push(c.cover_url)
  gallery.forEach(url => { if (!slides.includes(url)) slides.push(url) })
  const tieneMulti = slides.length > 1

  return (
    <div style={s.cardGrande} onClick={() => onAbrir(c)}>
      {/* Tira dorada superior — identidad premium inmediata */}
      <div style={s.premiumStrip} />

      {/* Cover más alto + ribbon + gradiente + logo superpuesto */}
      <div style={s.coverBox}>
        {tieneMulti ? (
          /* SLIDER: scroll horizontal con snap, múltiples imágenes */
          <div style={s.feedSlider}>
            {slides.map((url, i) => (
              <div key={i} style={s.feedSliderSlide}>
                <img src={url} alt="" style={s.coverImg} loading="lazy" />
              </div>
            ))}
          </div>
        ) : slides[0] ? (
          <img src={slides[0]} alt="" style={s.coverImg} />
        ) : (
          <div style={{ ...s.coverEmpty, background: catInfo.bg }}>
            <span style={{ fontSize: 44 }}>{catInfo.emoji}</span>
          </div>
        )}
        {/* Gradiente inferior más fuerte → anclaje visual + legibilidad logo */}
        <div style={s.coverGradient} />
        {/* Ribbon destacado (gradiente dorado, más grande) */}
        <div style={s.ribbonDestacado}>
          <Ico.star size={10} color="#fff" /> <span>Destacado</span>
        </div>
        {/* Distancia flotante (top-right) → info rápida sin ocupar body */}
        {dist && (
          <div style={s.coverDistBadge}>
            <Ico.pin size={9} color="#fff" /> a {dist}
          </div>
        )}
        {/* Contador de fotos (si hay múltiples) */}
        {tieneMulti && (
          <div style={s.feedSliderCount}>
            📷 {slides.length}
          </div>
        )}
        {/* LOGO superpuesto bottom-right → marca visible en el feed */}
        <div style={s.coverLogoBadge}>
          {c.logo_url
            ? <img src={c.logo_url} alt="" style={s.coverLogoBadgeImg} />
            : <div style={s.coverLogoBadgeFallback}>{iniciales(c.name)}</div>}
        </div>
      </div>

      <div style={s.cardGrandeBody}>
        <div style={s.nombreGrande}>{c.name}</div>

        <div style={s.horarioRowFeed}>
          <HorarioBloque horario={horario} />
        </div>

        {c.description && <div style={s.descGrande}>{c.description}</div>}

        {/* Pill de descuento (teaser en el feed) — solo si tiene discount_text.
            El banner verde completo (premium) solo va en el detalle, no acá. */}
        {c.discount_text && (
          <div style={s.beneficioPill}>
            <Ico.gift size={13} color="#fff" />
            <span>{c.discount_text}</span>
          </div>
        )}

        {c.address && (
          <div style={s.ubicacionRow}>
            <span style={s.ubicacionTxt}>
              <Ico.pin size={11} color={C.verde} /> {c.address}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════
   CARD COMPACTA (no premium) — feed
   ════════════════════════════════════════════════════════════ */
function CardCompacta({ c, userCoords, expanded, onToggle }) {
  const cats = c.categories?.length ? c.categories : (c.category ? [c.category] : [])
  const horario = horarioFeed(c.opening_hours)
  const metros = haversine(userCoords?.lat, userCoords?.lng, c.lat, c.lng)
  const dist = distancia(metros)
  const catInfo = COMERCIOS[cats[0]] || COMERCIOS['Otro']
  const wa = waLink(c.phone)
  const telLink = c.phone ? `tel:${c.phone.replace(/[^\d+]/g, '')}` : null

  return (
    <div
      style={{ ...s.cardCompacta, ...(expanded ? s.cardCompactaExpanded : null) }}
      onClick={() => onToggle(c.id)}
    >
      <div style={s.cardCompactaTopRow}>
        <div style={s.logoCuadrado}>
          {c.logo_url || c.cover_url
            ? <img src={c.logo_url || c.cover_url} alt="" style={s.logoCuadradoImg} />
            : <div style={{ ...s.logoCuadradoFallback, background: catInfo.bg }}>
                <span style={{ fontSize: 22 }}>{catInfo.emoji}</span>
              </div>}
        </div>

        <div style={s.cardCompactaBody}>
          <div style={s.nombreCompacto}>{c.name}</div>

          {/* Pill de descuento (teaser en el feed) */}
          {c.discount_text && (
            <div style={s.beneficioSm}>
              <Ico.gift size={10} color={C.verde} /> {c.discount_text}
            </div>
          )}

          <div style={s.horarioRowFeedSm}>
            <HorarioBloque horario={horario} size="sm" />
          </div>

          <div style={s.ubicacionRowSm}>
            {c.address && (
              <span style={s.ubicacionTxtSm}>
                <Ico.pin size={10} color={C.verde} /> {c.address}
                {dist && <span style={s.distTxtSm}> · a {dist}</span>}
              </span>
            )}
          </div>
        </div>

        <div style={s.cardCompactaRight}>
          <span style={{
            ...s.cardCompactaChev,
            transform: expanded ? 'rotate(90deg)' : 'none',
          }}>
            <Ico.chevron size={16} color={expanded ? C.verde : C.textoTenue} />
          </span>
        </div>
      </div>

      {/* ── Sección expandible inline (sin modal) ── */}
      {expanded && (
        <div style={s.cardCompactaExpand}>
          {/* Teléfono */}
          {c.phone && (
            <div style={s.expandInfoRow}>
              <span style={s.expandInfoIcon}><Ico.phone size={13} color={C.verde} /></span>
              <a href={telLink} style={s.expandInfoLink} onClick={(e) => e.stopPropagation()}>
                {c.phone}
              </a>
            </div>
          )}
          {/* Dirección completa (puede cortarse en el resumen) */}
          {c.address && (
            <div style={s.expandInfoRow}>
              <span style={s.expandInfoIcon}><Ico.pin size={13} color={C.verde} /></span>
              <span style={s.expandInfoText}>{c.address}</span>
            </div>
          )}
          {/* Botón WhatsApp full-width */}
          {wa && (
            <a
              href={wa}
              target="_blank"
              rel="noreferrer"
              style={s.expandWaBtn}
              onClick={(e) => e.stopPropagation()}
            >
              <Ico.whatsapp size={16} color="#fff" />
              <span>Contactar por WhatsApp</span>
            </a>
          )}
        </div>
      )}
    </div>
  )
}

/* ════════════════════════════════════════════════════════════
   MODAL DE DETALLE — PREMIUM QUALITY
   · Premium: carrusel (cover + gallery) + 4 CTAs + sello verificado
   · Normal: sin cover (solo header colorido), solo WhatsApp
   · Dropdown VER UBICACIÓN (mapa)
   · Horario al lado del nombre (resumen, sin dropdown semanal)
   ════════════════════════════════════════════════════════════ */
function ComercioDetalle({ c, userCoords, onClose, onEditar, esAdmin }) {
  const [mapaOpen, setMapaOpen] = useState(false)
  const [fotoIdx, setFotoIdx] = useState(0)
  const [lightbox, setLightbox] = useState(null)
  const mapaRef = useRef(null)
  const galeriaRef = useRef(null)
  const galeriaPausaRef = useRef(false)
  const [promos, setPromos] = useState([])

  // Cargar promociones del comercio (commerce_promos).
  // Traemos TODAS las del comercio (activas + inactivas + vencidas) para que
  // el admin pueda verlas y borrarlas. Las inactivas/vencidas se marcan pero
  // siguen visibles solo para admin. Para usuarios normales, solo activas vigentes.
  useEffect(() => {
    if (!c?.id) return
    let cancelado = false
    ;(async () => {
      try {
        const { data, error } = await supabase
          .from('commerce_promos')
          .select('*')
          .eq('commerce_id', c.id)
          .order('created_at', { ascending: false })
        if (error) throw error
        if (!cancelado) {
          const ahora = Date.now()
          // Marcar vigencia pero mostrar todas (el admin decide qué borrar)
          const conVigencia = (data || []).map(p => ({
            ...p,
            _vigente: !p.expires_at ? true : new Date(p.expires_at).getTime() > ahora,
          }))
          setPromos(conVigencia)
        }
      } catch (e) {
        console.warn('[comercio detalle] promos:', e?.message)
      }
    })()
    return () => { cancelado = true }
  }, [c?.id])

  // Borrar promo (solo admin)
  const [borrandoPromoId, setBorrandoPromoId] = useState(null)
  const borrarPromo = async (promoId) => {
    if (!promoId) return
    if (!confirm('¿Eliminar esta promoción? Se borra definitivamente.')) return
    setBorrandoPromoId(promoId)
    try {
      const { error } = await supabase
        .from('commerce_promos')
        .delete()
        .eq('id', promoId)
      if (error) throw error
      setPromos(prev => prev.filter(p => p.id !== promoId))
    } catch (e) {
      alert('Error al borrar: ' + (e?.message || 'desconocido'))
    } finally {
      setBorrandoPromoId(null)
    }
  }

  // Scroll automático al mapa cuando se abre el dropdown
  useEffect(() => {
    if (mapaOpen && mapaRef.current) {
      const t = setTimeout(() => {
        mapaRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 80)
      return () => clearTimeout(t)
    }
  }, [mapaOpen])

  // AUTO-SCROLL del carrusel de galería cuando hay más de 3 thumbnails.
  // Avanza 1 item cada 2.4s. Al llegar al final vuelve al inicio (loop).
  // Se pausa al hacer hover para que el user pueda mirar una foto tranquilo.
  useEffect(() => {
    const el = galeriaRef.current
    if (!el) return
    // Contar thumbnails visibles (cover + gallery items)
    const items = el.querySelectorAll('button')
    if (items.length <= 3) return // solo auto-scroll si hay >3
    const STEP = 104 // 96px item + 8px gap
    const interval = setInterval(() => {
      if (galeriaPausaRef.current) return
      const maxScroll = el.scrollWidth - el.clientWidth
      if (el.scrollLeft >= maxScroll - 2) {
        // llegó al final → vuelve al inicio
        el.scrollTo({ left: 0, behavior: 'smooth' })
      } else {
        el.scrollBy({ left: STEP, behavior: 'smooth' })
      }
    }, 2400)
    return () => clearInterval(interval)
  }, [c?.id, lightbox])

  if (!c) return null
  const cats = c.categories?.length ? c.categories : (c.category ? [c.category] : [])
  const horario = horarioFeed(c.opening_hours)
  const metros = haversine(userCoords?.lat, userCoords?.lng, c.lat, c.lng)
  const dist = distancia(metros)
  const wa = waLink(c.phone)
  const catInfo = COMERCIOS[cats[0]] || COMERCIOS['Otro']
  const isPremium = !!c.is_premium

  // Promos visibles: admin ve TODAS (para poder borrar las que no corresponden).
  // Usuario normal: solo activas y vigentes.
  const promosVisibles = esAdmin
    ? promos
    : promos.filter(p => p.is_active !== false && p._vigente)

  /* Galería de fotos: array puro de gallery (sin cover, sin demos).
     El cover_url va aparte como foto principal del hero.
     NO metemos imágenes demo de Unsplash — confunden al usuario. */
  const gallery = (Array.isArray(c.gallery) ? c.gallery.filter(Boolean) : [])
  /* Foto principal del hero: cover_url, o primera de gallery si no hay cover. */
  const fotoPrincipal = c.cover_url || gallery[0] || null

  /* CTAs premium: WhatsApp, Llamar, Instagram */
  const telLink = c.phone ? `tel:${c.phone.replace(/[^\d+]/g, '')}` : null
  const igUrl = c.instagram
    ? (c.instagram.startsWith('http') ? c.instagram : `https://instagram.com/${c.instagram.replace(/^@/, '')}`)
    : null

  return (
    <div style={s.detalleBackdrop} onClick={onClose}>
      <div style={s.detalleSheet} onClick={(e) => e.stopPropagation()}>

        {/* ── Keyframes globales del modal (shimmer del banner de descuento) ── */}
        <style>{`
          @keyframes benShimmer {
            0%   { transform: translateX(-130%) skewX(-18deg); opacity: 0; }
            18%  { opacity: 0.55; }
            50%  { opacity: 0.35; }
            82%  { opacity: 0.55; }
            100% { transform: translateX(130%) skewX(-18deg); opacity: 0; }
          }
          @keyframes benShineText {
            0%, 100% { text-shadow: 0 0 0 rgba(255,255,255,0); }
            50%      { text-shadow: 0 0 14px rgba(255,255,255,0.45); }
          }
        `}</style>

        {/* ── COVER / HEADER ── */}
        <div style={s.detalleCoverWrap}>
          {isPremium ? (
            /* PREMIUM: hero con foto principal fija (sin carrusel aquí — la galería va abajo) */
            <div style={s.detalleCoverBox}>
              {fotoPrincipal ? (
                <>
                  <img src={fotoPrincipal} alt="" style={s.detalleCoverImg} />
                  <div style={s.detalleCoverGradient} />
                </>
              ) : (
                <div style={{ ...s.detalleCoverEmpty, background: catInfo.bg }}>
                  <span style={{ fontSize: 64 }}>{catInfo.emoji}</span>
                </div>
              )}
              {/* Ribbon destacado — bottom-left (NO choca con el botón cerrar top-left) */}
              <div style={s.ribbonDestacadoModal}>
                <Ico.star size={10} color="#fff" /> <span>Destacado</span>
              </div>
            </div>
          ) : (
            /* NORMAL: cabecera sólida minimal (sin emoji gigante — solo color de categoría) */
            <div style={{ ...s.detalleCoverBox, ...s.detalleCoverSolid, background: catInfo.bg }}>
              <div style={s.detalleCoverSolidGrad} />
            </div>
          )}

          {/* HEADER flotante (botones) encima del cover */}
          <div style={s.detalleHeaderFloat}>
            <button style={s.detalleClose} onClick={onClose} aria-label="Cerrar">
              <Ico.close size={18} color="#fff" />
            </button>
            {esAdmin && (
              <button
                style={s.detalleEditFloat}
                onClick={() => onEditar(c)}
                aria-label="Editar comercio"
              >
                <Ico.edit size={13} color="#fff" /> Editar
              </button>
            )}
          </div>
        </div>

        {/* ── LOGO grande + sello verificado (premium) ── */}
        <div style={{ ...s.detalleLogoWrap, marginTop: isPremium ? -42 : -38 }}>
          <div style={s.detalleLogoBox}>
            {c.logo_url
              ? <img src={c.logo_url} alt="" style={s.detalleLogoImg} />
              : <div style={{ ...s.detalleLogoFallback, fontSize: 34 }}>{catInfo.emoji}</div>}
          </div>
          {isPremium && (
            <div style={s.logoVerifiedBadge}>
              <Ico.verified size={24} />
            </div>
          )}
        </div>

        {/* ── SCROLL CONTENT ── */}
        <div style={s.detalleScroll}>
          <div style={s.detalleBody}>
            {/* Nombre centrado (sin status pill — el horario abajo ya indica el estado) */}
            <h2 style={s.detalleNombre}>{c.name}</h2>

            {/* Horario feed (fuente única de verdad del estado) */}
            <div style={s.detalleHorarioRow}>
              <HorarioBloque horario={horario} />
            </div>

            {/* ── GALERÍA de cuadrados con scroll horizontal (premium, si hay fotos) ── */}
            {gallery.length > 0 && (
              <div style={s.galeriaWrap}>
                <div
                  ref={galeriaRef}
                  style={s.galeriaScroll}
                  onMouseEnter={() => { galeriaPausaRef.current = true }}
                  onMouseLeave={() => { galeriaPausaRef.current = false }}
                >
                  {/* Primero el cover como thumbnail si existe y no está repetido en gallery */}
                  {c.cover_url && !gallery.includes(c.cover_url) && (
                    <button
                      style={s.galeriaItem}
                      onClick={() => setLightbox(c.cover_url)}
                      aria-label="Ver foto"
                    >
                      <img src={c.cover_url} alt="" style={s.galeriaImg} />
                    </button>
                  )}
                  {gallery.map((url, i) => (
                    <button
                      key={i}
                      style={s.galeriaItem}
                      onClick={() => setLightbox(url)}
                      aria-label={`Ver foto ${i + 1}`}
                    >
                      <img src={url} alt="" style={s.galeriaImg} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Descripción */}
            {c.description && (
              <p style={s.detalleDesc}>{c.description}</p>
            )}

            {/* ── BANNER BENEFICIO (discount_text) — RE-HABILITADO ──
                Banner verde premium con el descuento del comercio (discount_text).
                Mismo diseño que las promos: gradiente verde, shimmer animado,
                patrón de puntos, badge circular con icono de regalo, deco esquina.
                Se muestra SOLO si el comercio tiene discount_text cargado.
                Si el descuento no corresponde, el admin lo edita en el editor
                de comercios (campo "Texto del descuento"). */}
            {c.discount_text && c.discount_text.trim() && (
              <div style={s.beneficioCard}>
                <div style={s.beneficioPattern} />
                <div style={s.beneficioShimmer} />
                <div style={s.beneficioInner}>
                  <div style={s.beneficioBadge}>
                    <Ico.gift size={20} color="#fff" />
                  </div>
                  <div style={s.beneficioContent}>
                    <div style={s.beneficioLabel}>Descuento El Barrio</div>
                    <div style={s.beneficioTextShine}>{c.discount_text}</div>
                  </div>
                </div>
                <div style={s.beneficioDeco} />
              </div>
            )}

            {/* ── PROMOCIONES — BANNER VERDE PREMIUM ──
                Cada promo usa el MISMO banner verde que el beneficio
                (gradiente verde, shimmer animado, patrón de puntos,
                badge circular con icono, deco esquina).
                El banner verde que pediste 340 veces.
                Para admin: botón 🗑️ para borrar promo directamente. */}
            {promosVisibles.length > 0 && (
              <div style={{ marginTop: 14, marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {promosVisibles.map((p) => {
                  const vigente = p._vigente
                  return (
                    <div key={p.id} style={{ ...s.beneficioCard, position: 'relative' }}>
                      {/* Botón BORRAR (solo admin) — esquina sup-der del banner,
                          MÁS GRANDE y con texto "Borrar" para que se vea claro. */}
                      {esAdmin && (
                        <button
                          onClick={() => borrarPromo(p.id)}
                          disabled={borrandoPromoId === p.id}
                          style={{
                            position: 'absolute', top: 8, right: 8, zIndex: 20,
                            minHeight: 34, borderRadius: 9,
                            padding: '6px 12px',
                            background: 'rgba(220,38,38,0.92)',
                            border: '1.5px solid rgba(255,255,255,0.65)',
                            color: '#fff', fontSize: 12.5, fontWeight: 800,
                            cursor: 'pointer',
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                            fontFamily: 'inherit',
                            boxShadow: '0 3px 10px rgba(0,0,0,0.28)',
                            letterSpacing: '0.2px',
                          }}
                          aria-label="Borrar promoción"
                          title="Borrar esta promoción"
                        >
                          {borrandoPromoId === p.id
                            ? <span style={{ fontSize: 12 }}>Borrando…</span>
                            : (<><span style={{ fontSize: 14 }}>🗑️</span><span>Borrar</span></>)}
                        </button>
                      )}
                      {/* Imagen de la promo (si existe) — arriba del banner, redondeada */}
                      {p.image_url && (
                        <img src={p.image_url} alt=""
                          style={{
                            position: 'relative', zIndex: 2,
                            width: '100%', height: 150, objectFit: 'cover',
                            borderRadius: 12, marginBottom: 12, display: 'block',
                            border: '1.5px solid rgba(255,255,255,0.3)',
                            boxShadow: '0 2px 10px rgba(0,0,0,0.18)',
                          }}
                          loading="lazy" />
                      )}
                      <div style={s.beneficioPattern} />
                      <div style={s.beneficioShimmer} />
                      <div style={s.beneficioInner}>
                        <div style={s.beneficioBadge}>
                          <Ico.gift size={20} color="#fff" />
                        </div>
                        <div style={s.beneficioContent}>
                          <div style={{
                            fontSize: 10.5, fontWeight: 800, color: 'rgba(255,255,255,0.92)',
                            textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 3,
                          }}>
                            Promoción
                          </div>
                          <div style={{
                            fontSize: 16.5, fontWeight: 800, color: '#fff',
                            lineHeight: 1.22, marginBottom: p.description ? 5 : 7,
                            letterSpacing: '-0.2px',
                            paddingRight: esAdmin ? 92 : 0,
                          }}>
                            {p.title || 'Promoción'}
                          </div>
                          {p.description && (
                            <div style={{
                              fontSize: 12.5, color: 'rgba(255,255,255,0.88)',
                              lineHeight: 1.45, marginBottom: 8,
                            }}>
                              {p.description}
                            </div>
                          )}
                          <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            fontSize: 11, fontWeight: 800,
                            color: '#fff',
                            background: vigente ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.22)',
                            padding: '4px 10px', borderRadius: 999,
                            border: '1px solid rgba(255,255,255,0.35)',
                          }}>
                            {vigente ? '⏰ Vigente' : '⏰ Vencida'}
                          </div>
                        </div>
                      </div>
                      <div style={s.beneficioDeco} />
                    </div>
                  )
                })}
              </div>
            )}

            {/* Info rápida: dirección + teléfono (chips verticales) */}
            <div style={s.detalleQuickInfo}>
              {c.address && (
                <div style={s.quickInfoChip}>
                  <Ico.pin size={13} color={C.verde} />
                  <div style={s.quickInfoAddrCol}>
                    <span style={s.quickInfoAddr}>{c.address}</span>
                    {dist && <span style={s.quickInfoDist}>a {dist}</span>}
                  </div>
                </div>
              )}
              {c.phone && (
                <div style={s.quickInfoChip}>
                  <Ico.phone size={13} color={C.textoTenue} />
                  <span>{c.phone}</span>
                </div>
              )}
            </div>

            {/* DROPDOWN: VER UBICACIÓN */}
            <button
              style={s.dropdownBar}
              onClick={() => setMapaOpen(!mapaOpen)}
            >
              <span style={s.dropdownBarLeft}>
                <span style={s.dropdownIconBox}>
                  <Ico.pin size={14} color={C.verde} />
                </span>
                Ver ubicación
              </span>
              <span style={{
                ...s.dropdownChev,
                transform: mapaOpen ? 'rotate(90deg)' : 'none',
              }}>
                <Ico.chevron size={16} color={C.textoTenue} />
              </span>
            </button>
            {mapaOpen && (
              <div ref={mapaRef} style={s.dropdownContent}>
                {c.lat != null && c.lng != null ? (
                  <>
                    <div style={s.detalleMapaBox}>
                      <MiniMap lat={c.lat} lng={c.lng} height={180} />
                    </div>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}`}
                      target="_blank"
                      rel="noreferrer"
                      style={s.comoLlegarBtn}
                    >
                      <Ico.directions size={16} color="#fff" />
                      <span>Cómo llegar</span>
                    </a>
                  </>
                ) : (
                  <div style={s.detalleSinMapa}>
                    Este comercio no tiene ubicación en el mapa.
                  </div>
                )}
              </div>
            )}

            {/* CATEGORÍAS AL FINAL */}
            {cats.length > 0 && (
              <div style={s.detalleCategoriasFinal}>
                <div style={s.detalleSectionTit}>Rubros</div>
                <div style={s.detalleCatsRow}>
                  {cats.map((cat) => {
                    const ci = COMERCIOS[cat] || COMERCIOS['Otro']
                    return (
                      <span key={cat} style={{ ...s.rubroChipModal, background: ci.bg, color: ci.color }}>
                        {ci.emoji} {cat}
                      </span>
                    )
                  })}
                </div>
              </div>
            )}

            <div style={{ height: 8 }} />
          </div>
        </div>

        {/* ── FOOTER: BARRA DE ACCIÓN INFERIOR ──
            Para TODOS los comercios (premium + no premium).
            WhatsApp (verde WhatsApp) + Llamar (verde marca) + Instagram (rosa).
            Cada botón solo se muestra si el dato existe (c.phone, c.instagram).
            Si NO hay ninguno de los tres, mostramos un placeholder pequeño
            para no romper el layout. */}
        {/* ── FOOTER: BOTONES CIRCULARES ──
            3 botones circulares (como en la referencia):
            WhatsApp (verde WhatsApp) + Llamar (verde marca) + Instagram (rosa).
            Solo icono, sin texto. Centrados, con gap. */}
        <div style={s.ctaRow}>
          {wa && (
            <a href={wa} target="_blank" rel="noreferrer"
              style={{ ...s.ctaBtn, ...s.ctaWhatsapp }}
              aria-label="WhatsApp" title="WhatsApp">
              <Ico.whatsapp size={24} color="#fff" />
            </a>
          )}
          {telLink && (
            <a href={telLink}
              style={{ ...s.ctaBtn, ...s.ctaCall }}
              aria-label="Llamar" title="Llamar">
              <Ico.phoneFill size={22} color="#fff" />
            </a>
          )}
          {igUrl && (
            <a href={igUrl} target="_blank" rel="noreferrer"
              style={{ ...s.ctaBtn, ...s.ctaInstagram }}
              aria-label="Instagram" title="Instagram">
              <Ico.instagram size={22} color="#fff" />
            </a>
          )}
        </div>
      </div>

      {/* ── LIGHTBOX (fullscreen al tocar una foto de la galería) ──
          IMPORTANTE: stopPropagation en backdrop y close para que el click
          NO burbujee hasta detalleBackdrop (que tiene onClick={onClose}) y
          cierre el modal entero. Solo queremos cerrar el lightbox. */}
      {lightbox && (
        <div style={s.lightboxBackdrop} onClick={(e) => { e.stopPropagation(); setLightbox(null) }}>
          <button
            style={s.lightboxClose}
            onClick={(e) => { e.stopPropagation(); setLightbox(null) }}
            aria-label="Cerrar foto"
          >
            <Ico.close size={22} color="#fff" />
          </button>
          <img
            src={lightbox}
            alt=""
            style={s.lightboxImg}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}

/* ════════════════════════════════════════════════════════════
   COMERCIOS — componente principal
   ════════════════════════════════════════════════════════════ */
function Comercios({ currentUser, onNavigate, onCrear, onEditar }) {
  const [profile, setProfile] = useState(null)
  const [comercios, setComercios] = useState([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [cat, setCat] = useState('Todas')
  const [userCoords, setUserCoords] = useState(null)
  const [seleccionado, setSeleccionado] = useState(null)
  const [expandedId, setExpandedId] = useState(null)

  // Toggle acordeón: si se clickea la misma card, se colapsa; si es otra, se expande.
  const onToggleCompacta = (id) => setExpandedId((prev) => (prev === id ? null : id))

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
    if (!currentUser?.id) {
      setCargando(false)
      return
    }
    setCargando(true)
    try {
      const { data: p } = await supabase
        .from('profiles').select('*')
        .eq('user_id', currentUser.id).maybeSingle()
      if (!p) {
        setProfile(null)
        setComercios([])
        return
      }
      setProfile(p)

      const { data, error } = await supabase
        .from('commerces')
        .select('*')
        .eq('neighborhood_id', p.neighborhood_id)
        .eq('is_active', true)
        .order('is_premium', { ascending: false })
        .order('name', { ascending: true })

      if (error) console.error('[comercios] Error cargando:', error)
      setComercios(data || [])
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

  const esAdmin = profile?.role === 'admin' || profile?.is_admin === true

  const onAbrirComercio = (c) => setSeleccionado(c)

  const onEditarComercio = (c) => {
    setSeleccionado(null)
    if (onEditar) onEditar(c)
    else if (onCrear) onCrear('commerce', c)
  }

  const onAgregar = () => {
    if (onCrear) onCrear('commerce')
    else if (onEditar) onEditar(null)
  }

  return (
    <div style={s.wrap}>
      {/* HEADER */}
      <div style={s.header}>
        <button style={s.backBtn} onClick={() => nav('inicio')} aria-label="Volver">
          <Ico.back />
        </button>
        <div style={s.headerTit}>
          <Ico.store size={20} color={C.verde} />
          <span>
            Comercios de <span style={{ color: C.verde }}>el barrio</span>
          </span>
        </div>
        {esAdmin ? (
          <button style={s.addBtn} onClick={onAgregar} aria-label="Agregar comercio">
            <Ico.plus />
          </button>
        ) : (
          <div style={{ width: 36 }} />
        )}
      </div>

      {/* BUSCADOR */}
      <div style={s.searchRow}>
        <div style={s.searchIcon}><Ico.search /></div>
        <input
          placeholder="Buscar por nombre, rubro o dirección..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={s.searchInput}
        />
      </div>

      {/* FILTROS POR RUBRO */}
      <div style={s.filtrosScroll}>
        {['Todas', ...COMERCIOS_CATS].map((c) => {
          const activo = cat === c
          const ci = c === 'Todas' ? null : (COMERCIOS[c] || COMERCIOS['Otro'])
          return (
            <button
              key={c}
              style={{
                ...s.filtroChip,
                background: activo ? C.verde : C.card,
                color: activo ? '#fff' : C.textoSuave,
                border: activo ? `1px solid ${C.verde}` : `1px solid ${C.borde}`,
              }}
              onClick={() => setCat(c)}
            >
              {ci && <span style={{ fontSize: 12 }}>{ci.emoji}</span>}
              {c}
            </button>
          )
        })}
      </div>

      {/* LISTADO — una sola lista, sin secciones */}
      <div style={s.scroll}>
        {cargando ? (
          <div style={s.cargando}>
            <img src="/isotipo.png" alt="" style={{ width: 58, opacity: 0.4 }} />
          </div>
        ) : filtrados.length === 0 ? (
          <div style={s.vacio}>
            <div style={s.vacioEmoji}>🏪</div>
            <div style={s.vacioTit}>
              {busqueda || cat !== 'Todas'
                ? 'No hay comercios con ese filtro'
                : 'Todavía no hay comercios en el barrio'}
            </div>
            <div style={s.vacioTxt}>
              {busqueda || cat !== 'Todas'
                ? 'Probá con otro rubro o cambiá la búsqueda.'
                : 'Si tenés un local o conocés uno, sumalo al directorio.'}
            </div>
            {esAdmin && !busqueda && cat === 'Todas' && (
              <button style={s.vacioBtn} onClick={onAgregar}>
                <Ico.plus size={16} color="#fff" /> Agregar comercio
              </button>
            )}
          </div>
        ) : (
          <div style={{ marginBottom: 120 }}>
            {filtrados.map((c) => (
              c.is_premium
                ? <CardGrande
                    key={c.id}
                    c={c}
                    userCoords={userCoords}
                    onAbrir={onAbrirComercio}
                  />
                : <CardCompacta
                    key={c.id}
                    c={c}
                    userCoords={userCoords}
                    expanded={expandedId === c.id}
                    onToggle={onToggleCompacta}
                  />
            ))}
          </div>
        )}
      </div>

      {/* MODAL DE DETALLE */}
      {seleccionado && (
        <ComercioDetalle
          c={seleccionado}
          userCoords={userCoords}
          onClose={() => setSeleccionado(null)}
          onEditar={onEditarComercio}
          esAdmin={esAdmin}
        />
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
    position: 'relative',
  },

  /* ── header ── */
  header: {
    background: `linear-gradient(180deg, ${C.card} 0%, ${C.verdeBg} 100%)`,
    padding: '26px 14px 12px',
    display: 'flex', alignItems: 'center', gap: 10,
    borderBottom: `1px solid ${C.borde}`,
    flexShrink: 0,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: '50%',
    background: C.card, border: `1px solid ${C.borde}`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', padding: 0,
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  headerTit: {
    fontSize: 17.5, fontWeight: 800, color: C.texto,
    flex: 1,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
    letterSpacing: '-0.2px',
  },
  addBtn: {
    width: 36, height: 36, borderRadius: '50%',
    background: C.verdeSuave, border: `1px solid ${C.verde}`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', padding: 0,
    boxShadow: '0 1px 3px rgba(22,163,74,0.15)',
  },

  /* ── buscador ── */
  searchRow: {
    position: 'relative',
    margin: '12px 16px 8px',
    flexShrink: 0,
  },
  searchIcon: {
    position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
    display: 'flex', alignItems: 'center',
  },
  searchInput: {
    width: '100%', padding: '12px 16px 12px 40px',
    fontSize: 14, background: C.card,
    border: `1.5px solid ${C.borde}`, borderRadius: 999,
    outline: 'none', fontFamily: 'inherit', color: C.texto,
    boxSizing: 'border-box',
  },

  /* ── filtros ── */
  filtrosScroll: {
    display: 'flex', gap: 7,
    overflowX: 'auto',
    padding: '4px 16px 10px',
    flexShrink: 0,
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
    WebkitOverflowScrolling: 'touch',
  },
  filtroChip: {
    flexShrink: 0,
    padding: '8px 14px',
    borderRadius: 999,
    fontSize: 12.5, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit',
    display: 'flex', alignItems: 'center', gap: 5,
    whiteSpace: 'nowrap',
  },

  /* ── scroll principal ── */
  scroll: {
    flex: 1, overflowY: 'auto',
    padding: '6px 16px 0',
  },
  cargando: {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 60,
  },

  /* ── vacío ── */
  vacio: {
    textAlign: 'center', padding: '46px 20px',
    background: C.card, borderRadius: 18, border: `1px solid ${C.borde}`,
  },
  vacioEmoji: { fontSize: 46, marginBottom: 12 },
  vacioTit: { fontSize: 16.5, fontWeight: 700, color: C.texto, marginBottom: 5 },
  vacioTxt: { fontSize: 14, color: C.textoTenue, lineHeight: 1.5 },
  vacioBtn: {
    marginTop: 16,
    display: 'inline-flex', alignItems: 'center', gap: 6,
    background: C.verde, color: '#fff',
    padding: '11px 18px', borderRadius: 999,
    fontSize: 13.5, fontWeight: 700,
    border: 'none', cursor: 'pointer', fontFamily: 'inherit',
  },

  /* ══════ CARD GRANDE (premium) ══════ */
  cardGrande: {
    position: 'relative',
    background: C.card,
    borderRadius: 18,
    border: `1px solid ${C.borde}`,
    overflow: 'hidden',
    marginBottom: 14,
    cursor: 'pointer',
    boxShadow: '0 6px 20px rgba(217,119,6,0.08), 0 2px 6px rgba(0,0,0,0.04)',
  },

  /* Tira dorada superior — identidad premium inmediata */
  premiumStrip: {
    height: 3,
    width: '100%',
    background: `linear-gradient(90deg, ${C.dorado}, ${C.doradoSuave}, ${C.dorado})`,
    flexShrink: 0,
  },

  coverBox: {
    position: 'relative',
    width: '100%',
    height: 170,
    background: C.fondo,
    overflow: 'hidden',
  },
  coverImg: { width: '100%', height: '100%', objectFit: 'cover' },

  /* ── SLIDER de imágenes en el feed (CardGrande) ── */
  feedSlider: {
    display: 'flex',
    width: '100%',
    height: '100%',
    overflowX: 'auto',
    scrollSnapType: 'x mandatory',
    scrollbarWidth: 'none',
    WebkitOverflowScrolling: 'touch',
    cursor: 'grab',
  },
  feedSliderSlide: {
    flex: '0 0 100%',
    width: '100%',
    height: '100%',
    scrollSnapAlign: 'start',
    overflow: 'hidden',
  },
  feedSliderCount: {
    position: 'absolute',
    top: 8, right: 8,
    background: 'rgba(0,0,0,0.55)',
    color: '#fff',
    fontSize: 11, fontWeight: 700,
    padding: '3px 9px', borderRadius: 999,
    display: 'flex', alignItems: 'center', gap: 3,
    backdropFilter: 'blur(4px)',
  },
  coverEmpty: {
    width: '100%', height: '100%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  /* Gradiente inferior más fuerte → anclaje + legibilidad del logo */
  coverGradient: {
    position: 'absolute', left: 0, right: 0, bottom: 0, height: 60,
    background: 'linear-gradient(to top, rgba(0,0,0,0.45), transparent)',
    pointerEvents: 'none',
  },

  /* RIBBON "Destacado" — feed (más grande, gradiente dorado) */
  ribbonDestacado: {
    position: 'absolute',
    top: 0, left: 0,
    background: `linear-gradient(135deg, ${C.dorado}, ${C.doradoSuave})`,
    color: '#fff',
    padding: '7px 22px 7px 13px',
    fontSize: 11, fontWeight: 800,
    letterSpacing: '0.4px',
    display: 'flex', alignItems: 'center', gap: 4,
    boxShadow: '0 3px 10px rgba(217,119,6,0.4)',
    clipPath: 'polygon(0 0, 100% 0, calc(100% - 10px) 50%, 100% 100%, 0 100%)',
    zIndex: 2,
  },

  /* Badge de distancia flotante (top-right del cover) */
  coverDistBadge: {
    position: 'absolute',
    top: 10, right: 10,
    display: 'inline-flex', alignItems: 'center', gap: 4,
    background: 'rgba(0,0,0,0.55)',
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
    color: '#fff',
    padding: '4px 9px', borderRadius: 999,
    fontSize: 10.5, fontWeight: 700,
    zIndex: 2,
  },

  /* LOGO superpuesto (bottom-right del cover, DENTRO del cover para que no se corte) */
  coverLogoBadge: {
    position: 'absolute',
    bottom: 12, right: 12,
    width: 48, height: 48, borderRadius: 12,
    background: C.card, padding: 2,
    boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
    overflow: 'hidden',
    border: `2px solid ${C.card}`,
    zIndex: 3,
  },
  coverLogoBadgeImg: { width: '100%', height: '100%', borderRadius: 10, objectFit: 'cover' },
  coverLogoBadgeFallback: {
    width: '100%', height: '100%', borderRadius: 10,
    background: `linear-gradient(135deg, ${C.verde}, ${C.verdeOsc})`,
    color: '#fff', fontSize: 16, fontWeight: 800,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },

  cardGrandeBody: { padding: '14px 16px 14px' },
  nombreGrande: {
    fontSize: 17.5, fontWeight: 800, color: C.texto,
    lineHeight: 1.25, marginBottom: 4,
  },

  horarioRowFeed: { marginBottom: 8 },
  horarioRowFeedSm: { marginBottom: 4 },

  descGrande: {
    fontSize: 13, color: C.textoSuave, lineHeight: 1.45,
    marginBottom: 9,
    display: '-webkit-box', WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical', overflow: 'hidden',
  },

  beneficioPill: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    background: `linear-gradient(135deg, ${C.verde}, ${C.verdeOsc})`,
    color: '#fff',
    border: 'none',
    padding: '6px 12px', borderRadius: 9,
    fontSize: 12.5, fontWeight: 800,
    marginBottom: 9,
    boxShadow: '0 2px 8px rgba(22,163,74,0.25)',
  },

  ubicacionRow: {
    display: 'flex', alignItems: 'center', gap: 5,
    marginBottom: 10, flexWrap: 'wrap',
  },
  ubicacionTxt: {
    fontSize: 12, color: C.textoTenue, fontWeight: 500,
    display: 'inline-flex', alignItems: 'center', gap: 3,
  },
  distTxt: { fontSize: 12, color: C.verde, fontWeight: 700 },

  rubrosRowFinal: {
    display: 'flex', flexWrap: 'wrap', gap: 5,
    paddingTop: 8,
    borderTop: `1px solid ${C.borde}`,
  },
  rubroChipFinal: {
    fontSize: 10.5, fontWeight: 700,
    padding: '3px 7px', borderRadius: 6,
    display: 'inline-flex', alignItems: 'center', gap: 3,
  },
  rubroChip: {
    fontSize: 11, fontWeight: 700,
    padding: '3px 8px', borderRadius: 7,
    display: 'inline-flex', alignItems: 'center', gap: 3,
  },

  /* ══════ CARD COMPACTA (no premium) ══════ */
  cardCompacta: {
    display: 'flex', flexDirection: 'column',
    background: C.card, borderRadius: 14, padding: 10,
    border: `1px solid ${C.borde}`,
    marginBottom: 8, cursor: 'pointer',
    transition: 'border-color .15s ease, box-shadow .15s ease',
  },
  cardCompactaExpanded: {
    border: `1.5px solid ${C.verde}`,
    boxShadow: '0 3px 12px rgba(22,163,74,0.12)',
  },
  cardCompactaTopRow: {
    display: 'flex', alignItems: 'center', gap: 12,
  },
  logoCuadrado: {
    width: 54, height: 54, borderRadius: 12, flexShrink: 0,
    overflow: 'hidden', background: C.fondo,
  },
  logoCuadradoImg: { width: '100%', height: '100%', objectFit: 'cover' },
  logoCuadradoFallback: {
    width: '100%', height: '100%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  cardCompactaBody: { flex: 1, minWidth: 0 },
  nombreCompacto: {
    fontSize: 14, fontWeight: 700, color: C.texto,
    marginBottom: 3,
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  beneficioSm: {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    color: C.verde, fontSize: 11, fontWeight: 600,
    marginBottom: 4,
  },
  ubicacionRowSm: { marginBottom: 5 },
  ubicacionTxtSm: {
    fontSize: 11, color: C.textoTenue, fontWeight: 500,
    display: 'inline-flex', alignItems: 'center', gap: 3,
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
    maxWidth: '100%',
  },
  distTxtSm: { color: C.verde, fontWeight: 700 },
  rubrosRowSmFinal: {
    display: 'flex', flexWrap: 'wrap', gap: 4,
  },
  rubroChipSm: {
    fontSize: 10, fontWeight: 700,
    padding: '2px 6px', borderRadius: 5,
  },
  cardCompactaRight: {
    flexShrink: 0, display: 'flex', alignItems: 'center',
  },
  cardCompactaChev: {
    display: 'inline-flex', transition: 'transform .2s ease',
  },

  /* ── Sección expandible inline (acordeón, sin modal) ── */
  cardCompactaExpand: {
    marginTop: 10,
    paddingTop: 10,
    borderTop: `1px dashed ${C.borde}`,
    display: 'flex', flexDirection: 'column', gap: 8,
  },
  expandInfoRow: {
    display: 'flex', alignItems: 'center', gap: 8,
  },
  expandInfoIcon: {
    width: 26, height: 26, borderRadius: 7,
    background: C.verdeSuave,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  expandInfoLink: {
    fontSize: 13, color: C.texto, fontWeight: 600,
    textDecoration: 'none',
  },
  expandInfoText: {
    fontSize: 13, color: C.texto, fontWeight: 500,
    lineHeight: 1.4,
  },
  expandWaBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    background: C.whatsapp, color: '#fff',
    padding: '11px 14px', borderRadius: 11,
    fontSize: 13.5, fontWeight: 700,
    textDecoration: 'none',
    marginTop: 2,
  },

  /* ════════════════════════════════════════════════
     MODAL DE DETALLE — PREMIUM
     ════════════════════════════════════════════════ */
  detalleBackdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(17,24,39,0.6)',
    zIndex: 600,
    display: 'flex', alignItems: 'flex-end',
  },
  /* Sheet 100% → sin gap gris arriba, fullscreen limpio */
  detalleSheet: {
    width: '100%',
    height: '100%',
    background: C.fondo,
    borderTopLeftRadius: 0, borderTopRightRadius: 0,
    display: 'flex', flexDirection: 'column',
    fontFamily: T.font,
    overflow: 'hidden',
    boxShadow: '0 -8px 30px rgba(0,0,0,0.25)',
  },

  /* ── Cover wrap (contiene cover + header flotante) ── */
  detalleCoverWrap: {
    position: 'relative',
    flexShrink: 0,
  },
  detalleCoverBox: {
    position: 'relative',
    width: '100%',
    height: 200,
    background: C.fondo,
    overflow: 'hidden',
    borderTopLeftRadius: 0, borderTopRightRadius: 0,
  },
  detalleCoverImg: { width: '100%', height: '100%', objectFit: 'cover' },
  detalleCoverEmpty: {
    width: '100%', height: '100%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  /* Gradiente inferior del cover → da profundidad + anclaje visual */
  detalleCoverGradient: {
    position: 'absolute', left: 0, right: 0, bottom: 0, height: 70,
    background: 'linear-gradient(to top, rgba(0,0,0,0.42), transparent)',
    pointerEvents: 'none',
  },
  /* Cover sólido (no premium): cabecera minimal — solo color de categoría, sin emoji gigante */
  detalleCoverSolid: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    position: 'relative',
    height: 100,
  },
  detalleCoverSolidGrad: {
    position: 'absolute', left: 0, right: 0, bottom: 0, height: 40,
    background: 'linear-gradient(to top, rgba(0,0,0,0.18), transparent)',
    pointerEvents: 'none',
  },

  /* Ribbon destacado — modal (bottom-left pegado al borde, no choca con botón cerrar top-left) */
  ribbonDestacadoModal: {
    position: 'absolute',
    bottom: 12, left: 0,
    background: `linear-gradient(135deg, ${C.dorado}, ${C.doradoSuave})`,
    color: '#fff',
    padding: '7px 22px 7px 13px',
    fontSize: 11, fontWeight: 800,
    letterSpacing: '0.4px',
    display: 'flex', alignItems: 'center', gap: 5,
    boxShadow: '0 3px 10px rgba(217,119,6,0.45)',
    clipPath: 'polygon(0 0, 100% 0, calc(100% - 11px) 50%, 100% 100%, 0 100%)',
    zIndex: 4,
  },

  /* Header flotante (X + Editar) sobre el cover */
  detalleHeaderFloat: {
    position: 'absolute',
    top: 14, left: 14, right: 14,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    zIndex: 5,
  },
  detalleClose: {
    width: 38, height: 38, borderRadius: '50%',
    background: 'rgba(0,0,0,0.45)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    border: '1px solid rgba(255,255,255,0.18)',
    color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', padding: 0,
  },
  detalleEditFloat: {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    background: 'rgba(0,0,0,0.45)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.18)',
    padding: '8px 14px', borderRadius: 999,
    fontSize: 12.5, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit',
  },

  /* LOGO grande + sello verificado (premium) — contenedor wrapper */
  detalleLogoWrap: {
    position: 'relative',
    zIndex: 6,
    width: 84,
    marginLeft: 'auto',
    marginRight: 'auto',
  },
  detalleLogoBox: {
    width: 84, height: 84, borderRadius: 20,
    background: C.card, padding: 4,
    boxShadow: '0 6px 20px rgba(0,0,0,0.18), 0 2px 6px rgba(0,0,0,0.08)',
    overflow: 'hidden',
    border: `3px solid ${C.card}`,
  },
  detalleLogoImg: { width: '100%', height: '100%', borderRadius: 16, objectFit: 'cover' },
  detalleLogoFallback: {
    width: '100%', height: '100%', borderRadius: 16,
    background: `linear-gradient(135deg, ${C.verde}, ${C.verdeOsc})`,
    color: '#fff',
    fontSize: 26, fontWeight: 800,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  /* Sello verificado (check verde, premium only) — sobresale del logo bottom-right */
  logoVerifiedBadge: {
    position: 'absolute',
    bottom: -4, right: -4,
    zIndex: 7,
    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.25))',
  },

  /* SCROLL content */
  detalleScroll: {
    flex: 1, minHeight: 0, overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
  },

  /* BODY del modal */
  detalleBody: {
    padding: '14px 18px 16px',
  },

  /* Nombre del comercio (centrado, sin status pill) */
  detalleNombre: {
    fontSize: 21, fontWeight: 800, color: C.texto,
    lineHeight: 1.2, margin: 0, padding: 0,
    textAlign: 'center',
    letterSpacing: '-0.3px',
  },
  detalleHorarioRow: {
    display: 'flex', justifyContent: 'center',
    marginBottom: 12,
  },
  detalleDesc: {
    fontSize: 14, color: C.textoSuave, lineHeight: 1.55,
    margin: '0 0 14px',
    textAlign: 'center',
  },

  /* ════════════════════════════════════════════════
     BANNER BENEFICIO — PREMIUM REDESIGN
     ════════════════════════════════════════════════ */
  beneficioCard: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 16,
    background: `linear-gradient(135deg, ${C.verde} 0%, ${C.verdeOsc} 100%)`,
    padding: '14px 16px',
    marginBottom: 14,
    boxShadow: '0 4px 14px rgba(22,163,74,0.28)',
  },
  /* Patrón decorativo sutil (puntos) */
  beneficioPattern: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)',
    backgroundSize: '14px 14px',
    pointerEvents: 'none',
  },
  beneficioInner: {
    position: 'relative',
    display: 'flex', alignItems: 'center', gap: 13,
    zIndex: 2, /* encima del shimmer (zIndex 1) y el pattern */
  },
  /* Badge circular con icono */
  beneficioBadge: {
    width: 44, height: 44, borderRadius: '50%',
    background: 'rgba(255,255,255,0.18)',
    border: '1.5px solid rgba(255,255,255,0.35)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  beneficioContent: {
    flex: 1, minWidth: 0,
  },
  beneficioLine: {
    display: 'flex', alignItems: 'center', gap: 8,
    flexWrap: 'wrap',
  },
  beneficioLabel: {
    fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.92)',
    textTransform: 'uppercase', letterSpacing: '0.4px',
  },
  beneficioSep: {
    fontSize: 13, fontWeight: 400, color: 'rgba(255,255,255,0.45)',
    lineHeight: 1,
  },
  beneficioText: {
    fontSize: 14.5, fontWeight: 800, color: '#fff',
    lineHeight: 1.3,
    letterSpacing: '-0.1px',
  },
  /* Variante con shine animado (text-shadow pulsante tenue) */
  beneficioTextShine: {
    fontSize: 14.5, fontWeight: 800, color: '#fff',
    lineHeight: 1.3,
    letterSpacing: '-0.1px',
    animation: 'benShineText 3.6s ease-in-out infinite',
  },
  /* Overlay shimmer — franja diagonal de luz que atraviesa el banner.
     Tenue: max opacity 0.55, blanco semi-transparente, skew -18deg.
     Duración 3.8s para que se note pero no sea molesto. */
  beneficioShimmer: {
    position: 'absolute',
    top: 0, bottom: 0,
    left: 0,
    width: '45%',
    background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.55) 50%, transparent 100%)',
    pointerEvents: 'none',
    animation: 'benShimmer 3.8s ease-in-out infinite',
    zIndex: 1,
  },
  /* Deco esquina superior derecha */
  beneficioDeco: {
    position: 'absolute',
    top: -20, right: -20,
    width: 70, height: 70, borderRadius: '50%',
    background: 'rgba(255,255,255,0.07)',
    pointerEvents: 'none',
  },

  /* ── Quick info chips (dirección + teléfono) ── */
  detalleQuickInfo: {
    display: 'flex', flexDirection: 'column', gap: 7,
    marginBottom: 14,
  },
  quickInfoChip: {
    display: 'flex', alignItems: 'flex-start', gap: 8,
    background: C.card,
    border: `1px solid ${C.borde}`,
    padding: '10px 12px', borderRadius: 11,
    fontSize: 12.5, color: C.texto, fontWeight: 500,
  },
  quickInfoAddrCol: {
    display: 'flex', flexDirection: 'column', gap: 2,
    flex: 1, minWidth: 0,
  },
  quickInfoAddr: {
    fontSize: 12.5, color: C.texto, fontWeight: 500,
    lineHeight: 1.35,
  },
  quickInfoDist: {
    fontSize: 11, color: C.verde, fontWeight: 700,
    letterSpacing: '0.1px',
  },

  /* DROPDOWN BARS */
  dropdownBar: {
    width: '100%',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 4px',
    background: 'transparent',
    border: 'none',
    borderTop: `1px solid ${C.borde}`,
    fontSize: 14, fontWeight: 700, color: C.texto,
    cursor: 'pointer', fontFamily: 'inherit',
    textAlign: 'left',
  },
  dropdownBarLeft: {
    display: 'flex', alignItems: 'center', gap: 10,
    textTransform: 'capitalize',
  },
  dropdownIconBox: {
    width: 30, height: 30, borderRadius: 9,
    background: C.verdeSuave,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  dropdownChev: {
    display: 'flex', alignItems: 'center',
    transition: 'transform .25s ease',
  },
  dropdownContent: {
    padding: '4px 0 14px',
    background: 'transparent',
  },

  detalleMapaBox: {
    width: '100%', borderRadius: 14, overflow: 'hidden',
    border: `1px solid ${C.borde}`,
    background: C.card,
  },
  detalleSinMapa: {
    fontSize: 13, color: C.textoTenue, fontStyle: 'italic',
    padding: '8px 0',
  },

  /* Horario semanal */
  horarioBox: {
    background: C.card, borderRadius: 14, padding: 8,
    border: `1px solid ${C.borde}`,
    display: 'flex', flexDirection: 'column', gap: 2,
  },
  horarioDiaRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '8px 10px', borderRadius: 8,
  },
  horarioDia: {
    fontSize: 13, color: C.texto,
    display: 'inline-flex', alignItems: 'center', gap: 6,
    textTransform: 'capitalize',
  },
  hoyTag: {
    fontSize: 9, fontWeight: 800, color: '#fff',
    background: C.verde, padding: '1px 6px', borderRadius: 999,
    textTransform: 'uppercase', letterSpacing: '0.3px',
  },
  horarioRango: {
    fontSize: 13, fontWeight: 600, color: C.texto,
    fontVariantNumeric: 'tabular-nums',
  },
  horarioCerrado: {
    fontSize: 13, color: C.textoTenue, fontWeight: 500,
  },

  /* Categorías al final del modal */
  detalleCategoriasFinal: {
    marginTop: 14,
    paddingTop: 14,
    borderTop: `1px solid ${C.borde}`,
  },
  detalleSectionTit: {
    fontSize: 11, fontWeight: 800, color: C.textoTenue,
    textTransform: 'uppercase', letterSpacing: '0.5px',
    marginBottom: 10,
  },
  detalleCatsRow: {
    display: 'flex', flexWrap: 'wrap', gap: 6,
  },
  rubroChipModal: {
    fontSize: 12, fontWeight: 700,
    padding: '5px 10px', borderRadius: 8,
    display: 'inline-flex', alignItems: 'center', gap: 4,
  },

  /* Footer WhatsApp — full-width sticky, sin margen desperdiciado */
  detalleWaBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
    background: C.whatsapp, color: '#fff',
    padding: '16px 20px',
    width: '100%',
    fontSize: 15.5, fontWeight: 800,
    textDecoration: 'none',
    flexShrink: 0,
    boxShadow: '0 -4px 14px rgba(37,211,102,0.25)',
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  detalleWaPlaceholder: {
    height: 12,
    flexShrink: 0,
  },

  /* ══════ BOTONES CIRCULARES INFERIORES (WhatsApp + Llamar + Instagram) ══════
     Botones circulares con solo icono, centrados, con gap.
     Como en la referencia que mandó el usuario. */
  ctaRow: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: '16px 20px 20px',
    flexShrink: 0,
    background: C.card,
    borderTop: `1px solid ${C.borde}`,
  },
  ctaBtn: {
    width: 56,
    height: 56,
    borderRadius: '50%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textDecoration: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#fff',
    transition: 'transform .15s ease, filter .15s ease',
    fontFamily: 'inherit',
    boxShadow: '0 3px 10px rgba(0,0,0,0.15)',
  },
  ctaWhatsapp: {
    background: C.whatsapp,
  },
  ctaCall: {
    background: C.verde,
  },
  ctaInstagram: {
    background: '#E1306C',
  },

  /* Botón "Cómo llegar" debajo del mapa */
  comoLlegarBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    background: C.verde, color: '#fff',
    padding: '12px 16px', borderRadius: 11,
    fontSize: 13.5, fontWeight: 700,
    textDecoration: 'none',
    marginTop: 10,
    boxShadow: '0 2px 8px rgba(22,163,74,0.25)',
    transition: 'filter .15s ease',
  },

  /* ════════════════════════════════════════════════
     GALERÍA — cuadrados con scroll horizontal (premium)
     ════════════════════════════════════════════════ */
  galeriaWrap: {
    marginBottom: 14,
    marginTop: 2,
  },
  galeriaScroll: {
    display: 'flex',
    gap: 8,
    overflowX: 'auto',
    paddingBottom: 4,
    scrollSnapType: 'x mandatory',
    WebkitOverflowScrolling: 'touch',
    /* scrollbar sutil */
    scrollbarWidth: 'thin',
    msOverflowStyle: 'none',
  },
  galeriaItem: {
    flexShrink: 0,
    width: 96,
    height: 96,
    borderRadius: 12,
    overflow: 'hidden',
    padding: 0,
    border: `1px solid ${C.borde}`,
    background: C.fondo,
    cursor: 'pointer',
    scrollSnapAlign: 'start',
    transition: 'transform .15s ease, box-shadow .15s ease',
  },
  galeriaImg: {
    width: '100%', height: '100%',
    objectFit: 'cover',
    display: 'block',
  },

  /* ════════════════════════════════════════════════
     LIGHTBOX — fullscreen al tocar una foto
     ════════════════════════════════════════════════ */
  lightboxBackdrop: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.92)',
    zIndex: 9999,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 20,
  },
  lightboxClose: {
    position: 'absolute',
    top: 20, right: 20,
    width: 42, height: 42, borderRadius: '50%',
    background: 'rgba(255,255,255,0.15)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    border: '1px solid rgba(255,255,255,0.25)',
    color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', padding: 0,
    zIndex: 2,
  },
  lightboxImg: {
    maxWidth: '100%',
    maxHeight: '85vh',
    objectFit: 'contain',
    borderRadius: 8,
  },
}

export default Comercios
