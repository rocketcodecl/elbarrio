import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
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

  Ficha completa (solo comercios destacados):
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
  search: ({ size = 18, color = C.textoSuave }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
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
  share: ({ size = 18, color = C.texto }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
      <path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4"/>
    </svg>
  ),
  heart: ({ size = 18, color = C.texto, filled = false }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : 'none'} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l7.78-7.78a5.5 5.5 0 0 0 0-7.78Z" />
    </svg>
  ),
  message: ({ size = 18, color = C.verde }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" />
    </svg>
  ),
  copy: ({ size = 18, color = C.verde }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
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

  return (
    <div style={s.cardGrande} onClick={() => onAbrir(c)}>
      <div style={s.coverBox}>
        {c.cover_url
          ? <img src={c.cover_url} alt="" style={s.coverImg} />
          : <div style={{ ...s.coverEmpty, background: catInfo.bg }}>
              <span style={{ fontSize: 44 }}>{catInfo.emoji}</span>
            </div>}
        <div style={s.ribbonDestacado}>
          <span>Destacado</span>
        </div>
      </div>

      <div style={s.cardGrandeBody}>
        <div style={s.featuredIdentity}>
          <div style={{ ...s.featuredCategoryIcon, background: catInfo.bg }}>
            {c.logo_url
              ? <img src={c.logo_url} alt="" style={s.featuredCategoryImg} />
              : <span>{catInfo.emoji}</span>}
          </div>
          <div style={s.nombreGrande}>{c.name}</div>
        </div>
        <div style={s.featuredMeta}>
          <span style={s.feedSocialMeta}>
            <span style={s.feedRatingMeta}><Ico.star size={10} color="#687069" /> {Number(c.rating) > 0 ? Number(c.rating).toFixed(1) : 'Nuevo'}</span>
            <span style={s.feedFavoriteMeta}>♥ {Number(c.favorites_count) || 0}</span>
            {dist && <span>· {dist}</span>}
          </span>
          <span style={{ color: horario?.abierto ? C.verdeOsc : C.textoTenue }}>{horario?.abierto ? 'Abierto' : 'Cerrado'}</span>
        </div>
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
  const resumen = cats.length ? `${catInfo.emoji} ${cats.join(' · ')}` : 'Comercio del barrio'
  const whatsapp = waLink(c.whatsapp || c.phone)
  const mapsUrl = c.lat != null && c.lng != null
    ? `https://www.google.com/maps/search/?api=1&query=${c.lat},${c.lng}`
    : (c.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.address)}` : null)

  return (
    <div style={{ ...s.cardCompacta, ...(expanded ? s.cardCompactaExpanded : {}) }} onClick={() => onToggle(c.id)}>
      <div style={s.cardCompactaTopRow}>
        <div style={s.logoCuadrado}>
          {c.cover_url || c.logo_url
            ? <img src={c.cover_url || c.logo_url} alt="" style={s.logoCuadradoImg} />
            : <div style={{ ...s.logoCuadradoFallback, background: catInfo.bg }}>
                <span style={{ fontSize: 22 }}>{catInfo.emoji}</span>
              </div>}
        </div>

        <div style={s.cardCompactaBody}>
          <div style={s.compactTitleRow}>
            <div style={s.nombreCompacto}>{c.name}</div>
            <span style={{
              ...s.estadoBadge,
              background: horario?.abierto ? '#86efac' : '#dbe3ef',
              color: horario?.abierto ? '#075b2c' : '#46515e',
            }}>{horario?.abierto ? 'ABIERTO' : 'CERRADO'}</span>
          </div>
          <div style={s.compactDescription}>{resumen}</div>
          <div style={s.compactMeta}>
            <Ico.star size={10} color={C.verdeOsc} />
            <strong>{Number(c.rating) > 0 ? Number(c.rating).toFixed(1) : 'Nuevo'}</strong>
            <span style={s.feedFavoriteMeta}>♥ {Number(c.favorites_count) || 0}</span>
            {dist && <><span>·</span><span>{dist}</span></>}
          </div>
        </div>

        <span style={{ ...s.cardCompactaChev, transform: expanded ? 'rotate(90deg)' : 'none' }}>
          <Ico.chevron size={22} color={C.verdeOsc} />
        </span>
      </div>

      <div
        className="commerce-basic-motion"
        aria-hidden={!expanded}
        style={{
          ...s.expandMotion,
          maxHeight: expanded ? 420 : 0,
          opacity: expanded ? 1 : 0,
          transform: expanded ? 'translateY(0)' : 'translateY(-6px)',
          pointerEvents: expanded ? 'auto' : 'none',
        }}
      >
        <div style={s.expandMotionInner}>
          <div
            style={{
              ...s.cardCompactaExpand,
              transform: expanded ? 'translateY(0)' : 'translateY(-8px)',
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div style={s.expandCategories}>
              {cats.map(category => {
                const info = COMERCIOS[category] || COMERCIOS['Otro']
                return <span key={category} style={{ ...s.expandCategoryChip, background: info.bg, color: info.color }}>{info.emoji} {category}</span>
              })}
            </div>
            {c.description && <p style={s.expandDescription}>{c.description}</p>}
            {horario && (
              <div style={s.expandInfoRow}>
                <span style={s.expandInfoIcon}><Ico.clock size={14} color={C.verdeOsc} /></span>
                <HorarioBloque horario={horario} size="sm" />
              </div>
            )}
            {c.address && (
              <div style={s.expandInfoRow}>
                <span style={s.expandInfoIcon}><Ico.pin size={14} color={C.verdeOsc} /></span>
                <span style={s.expandInfoText}>{c.address}{dist ? ` · ${dist}` : ''}</span>
              </div>
            )}
            <div style={s.basicActions}>
              {whatsapp && <a href={whatsapp} target="_blank" rel="noreferrer" tabIndex={expanded ? 0 : -1} style={s.basicWhatsapp}><Ico.whatsapp size={16} color="#fff" /> WhatsApp</a>}
              {mapsUrl && <a href={mapsUrl} target="_blank" rel="noreferrer" tabIndex={expanded ? 0 : -1} style={s.basicMaps}><Ico.pin size={16} color={C.verdeOsc} /> Cómo llegar</a>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════
   MODAL DE DETALLE — COMERCIOS DESTACADOS
   · Carrusel (cover + gallery) + CTAs + sello destacado
   · Dropdown VER UBICACIÓN (mapa)
   · Horario al lado del nombre (resumen, sin dropdown semanal)
   ════════════════════════════════════════════════════════════ */
function ComercioDetalle({ c, userCoords, profile, onClose, onEditar, esAdmin, closing = false }) {
  const [mapaOpen, setMapaOpen] = useState(false)
  const [fotoIdx, setFotoIdx] = useState(0)
  const [lightbox, setLightbox] = useState(null)
  const [favorito, setFavorito] = useState(false)
  const [favoriteCount, setFavoriteCount] = useState(Number(c.favorites_count) || 0)
  const [favoriteSaving, setFavoriteSaving] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const [promos, setPromos] = useState([])
  const [products, setProducts] = useState([])
  const [reviews, setReviews] = useState([])
  const [reviewOpen, setReviewOpen] = useState(false)
  const [reviewDraft, setReviewDraft] = useState({ rating: 0, comment: '' })
  const [reviewSaving, setReviewSaving] = useState(false)
  const [reviewError, setReviewError] = useState('')
  const [showAllProducts, setShowAllProducts] = useState(false)
  const mapaRef = useRef(null)
  const galeriaRef = useRef(null)
  const galeriaPausaRef = useRef(false)

  useEffect(() => {
    let active = true
    Promise.all([
      supabase.from('commerce_promos').select('*').eq('commerce_id', c.id).eq('is_active', true).order('created_at', { ascending: false }).limit(8),
      supabase.from('commerce_reviews').select('*').eq('commerce_id', c.id).order('created_at', { ascending: false }).limit(20),
      supabase.from('commerce_products').select('*').eq('commerce_id', c.id).eq('is_available', true).order('is_featured', { ascending: false }).order('sort_order', { ascending: true }).order('created_at', { ascending: false }).limit(12),
    ]).then(([promoResult, reviewResult, productResult]) => {
      if (!active) return
      setPromos(promoResult.data || [])
      setReviews(reviewResult.data || [])
      setProducts(productResult.data || [])
    })
    return () => { active = false }
  }, [c.id])

  useEffect(() => {
    setFavoriteCount(Number(c.favorites_count) || 0)
    if (!profile?.id) {
      setFavorito(false)
      return
    }

    let active = true
    supabase
      .from('commerce_favorites')
      .select('id')
      .eq('commerce_id', c.id)
      .eq('profile_id', profile.id)
      .maybeSingle()
      .then(({ data }) => {
        if (active) setFavorito(!!data)
      })
    return () => { active = false }
  }, [c.id, c.favorites_count, profile?.id])

  const toggleFavorite = async () => {
    if (!profile?.id || favoriteSaving) return
    const nextFavorite = !favorito
    setFavoriteSaving(true)
    setFavorito(nextFavorite)
    setFavoriteCount(current => Math.max(0, current + (nextFavorite ? 1 : -1)))

    const request = nextFavorite
      ? supabase.from('commerce_favorites').insert({ commerce_id: c.id, profile_id: profile.id })
      : supabase.from('commerce_favorites').delete().eq('commerce_id', c.id).eq('profile_id', profile.id)
    const { error } = await request
    setFavoriteSaving(false)

    if (error) {
      setFavorito(!nextFavorite)
      setFavoriteCount(current => Math.max(0, current + (nextFavorite ? -1 : 1)))
      console.error('[commerce_favorites] No se pudo actualizar el favorito:', error)
    }
  }

  const ownReview = profile?.id
    ? reviews.find(review => review.reviewer_id === profile.id)
    : null

  const openReview = () => {
    setReviewDraft({
      rating: Number(ownReview?.rating) || 0,
      comment: ownReview?.comment || '',
    })
    setReviewError('')
    setReviewOpen(true)
  }

  const saveReview = async event => {
    event.preventDefault()
    const comment = reviewDraft.comment.trim()
    if (!profile?.id) {
      setReviewError('Necesitas un perfil verificado para opinar.')
      return
    }
    if (reviewDraft.rating < 1 || reviewDraft.rating > 5) {
      setReviewError('Selecciona entre 1 y 5 estrellas.')
      return
    }
    if (comment.length < 4) {
      setReviewError('Cuéntanos un poco más sobre tu experiencia.')
      return
    }

    setReviewSaving(true)
    setReviewError('')
    const payload = {
      commerce_id: c.id,
      author_id: profile.id,
      reviewer_id: profile.id,
      reviewer_name: profile.full_name || 'Vecino del barrio',
      reviewer_avatar_url: profile.avatar_url || null,
      rating: reviewDraft.rating,
      comment,
      updated_at: new Date().toISOString(),
    }
    const { data, error } = await supabase
      .from('commerce_reviews')
      .upsert(payload, { onConflict: 'commerce_id,reviewer_id' })
      .select()
      .single()
    setReviewSaving(false)

    if (error) {
      console.error('[commerce_reviews] No se pudo guardar la opinión:', error)
      setReviewError(`No pudimos guardar tu opinión: ${error.message || 'error desconocido'}`)
      return
    }

    setReviews(current => [data, ...current.filter(review => review.id !== data.id && review.reviewer_id !== profile.id)])
    setReviewOpen(false)
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

  const shareText = [
    `${c.name} en El Barrio`,
    c.description,
    c.address ? `📍 ${c.address}` : null,
    c.phone ? `📞 ${c.phone}` : null,
  ].filter(Boolean).join('\n')
  const compartir = () => setShareOpen(true)
  const copiarInformacion = async () => {
    await navigator.clipboard.writeText(shareText)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 1800)
  }

  /* Galería real del comercio. La portada pertenece solo al hero y no debe
     crear una tarjeta de galería cuando no hay imágenes adicionales. */
  const galleryRaw = Array.isArray(c.gallery) ? c.gallery.filter(Boolean) : []
  const gallery = galleryRaw
    .map((item) => typeof item === 'string'
      ? { url: item, label: null }
      : { url: item?.url || item?.image_url, label: item?.label || item?.title || null })
    .filter(item => item?.url)
    .filter((item, index, all) => all.findIndex(candidate => candidate.url === item.url) === index)
  /* Foto principal del hero: cover_url, o primera de gallery si no hay cover. */
  const fotoPrincipal = c.cover_url || gallery[0]?.url || null

  /* CTAs premium: WhatsApp, Llamar, Instagram */
  const igUrl = c.instagram
    ? (c.instagram.startsWith('http') ? c.instagram : `https://instagram.com/${c.instagram.replace(/^@/, '')}`)
    : null
  const formatProductPrice = (product) => {
    if (product.price == null) return 'Consultar'
    const price = Number(product.price)
    if (!Number.isFinite(price)) return 'Consultar'
    const formatted = `$${Math.round(price).toLocaleString('es-CL')}`
    return product.unit_label ? `${formatted} / ${product.unit_label}` : formatted
  }
  const featuredProducts = products.filter(product => product.is_featured)
  const regularProducts = products.filter(product => !product.is_featured)
  const visibleRegularProducts = showAllProducts ? regularProducts : regularProducts.slice(0, 4)

  return (
    <div
      style={{
        ...s.detalleBackdrop,
        animation: `${closing ? 'commerceDetailBackdropOut' : 'commerceDetailBackdropIn'} ${closing ? 260 : 320}ms ease both`,
      }}
      onClick={onClose}
    >
      <div
        style={{
          ...s.detalleSheet,
          animation: `${closing ? 'commerceDetailSlideOut' : 'commerceDetailSlideIn'} ${closing ? 260 : 320}ms cubic-bezier(0.22, 1, 0.36, 1) both`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={s.detalleScroll}>

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
            0%, 100% { text-shadow: 0 1px 3px rgba(0,0,0,0.38), 0 0 0 rgba(255,255,255,0); }
            50%      { text-shadow: 0 1px 3px rgba(0,0,0,0.38), 0 0 14px rgba(255,255,255,0.45); }
          }
        `}</style>

        {/* ── COVER / HEADER ── */}
        <div style={s.detalleCoverWrap}>
          {fotoPrincipal ? (
            <div style={s.detalleCoverBox}>
              <img src={fotoPrincipal} alt="" style={s.detalleCoverImg} />
              <div style={s.detalleCoverGradient} />
            </div>
          ) : (
            <div style={{ ...s.detalleCoverBox, ...s.detalleCoverSolid, background: catInfo.bg }}>
              <span style={{ fontSize: 54 }}>{catInfo.emoji}</span>
              <div style={s.detalleCoverSolidGrad} />
            </div>
          )}

          {/* HEADER flotante (botones) encima del cover */}
          <div style={s.detalleHeaderFloat}>
            <button style={s.detalleClose} onClick={onClose} aria-label="Cerrar">
              <Ico.back size={19} color="#26312c" />
            </button>
            <div style={s.detalleHeaderActions}>
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

          <div style={s.detalleHeroIdentity}>
            <div style={s.detalleHeroLogo}>
              {c.logo_url
                ? <img src={c.logo_url} alt="" style={s.detalleHeroLogoImg} />
                : <span>{iniciales(c.name)}</span>}
            </div>
            {isPremium && <span style={s.detalleHeroFeatured}>Destacado</span>}
          </div>

          <div style={s.detalleHeroActions}>
            <button style={s.detalleShareFloat} onClick={compartir} aria-label="Compartir comercio">
              <Ico.share size={17} color="#fff" />
            </button>
            <button
              style={{ ...s.detalleShareFloat, ...(favorito ? s.detalleFavoriteActive : {}) }}
              onClick={toggleFavorite}
              disabled={favoriteSaving}
              aria-label={favorito ? 'Quitar de favoritos' : 'Guardar como favorito'}
            >
              <Ico.heart size={18} color={favorito ? '#fff' : '#fff'} filled={favorito} />
            </button>
          </div>
        </div>

        {/* ── CONTENIDO ── */}
          <div style={s.detalleBody}>
            <section style={s.commerceInfoCard}>
              <div style={s.commerceTitleRow}>
                <h2 style={s.commerceTitle}>{c.name}</h2>
                <div style={s.commerceSocialStats}>
                  {Number(c.rating) > 0 && <span style={s.commerceRating}>★ {Number(c.rating).toFixed(1)}</span>}
                  <span style={{ ...s.commerceFavoriteCount, ...(favorito ? s.commerceFavoriteCountActive : {}) }}>♥ {favoriteCount}</span>
                </div>
              </div>
              <div style={s.commerceStatus}><HorarioBloque horario={horario} /></div>
              {c.address && (
                <div style={s.commerceAddressRow}>
                  <Ico.pin size={17} color={C.textoSuave} />
                  <span>{c.address}{dist ? ` · ${dist}` : ''}</span>
                  {c.lat != null && c.lng != null && (
                  <a href={`https://www.google.com/maps/search/?api=1&query=${c.lat},${c.lng}`} target="_blank" rel="noreferrer" style={s.commerceMapLink}>Ver en mapa</a>
                  )}
                </div>
              )}
            </section>

            {/* ── BANNER BENEFICIO RE-DISEÑADO (premium quality) ── */}
            {c.discount_text && (
              <div style={s.beneficioCard}>
                <div style={s.beneficioPattern} />
                {/* Overlay shimmer — franja de luz que pasa de izq a der, tenue */}
                <div style={s.beneficioShimmer} />
                <div style={s.beneficioInner}>
                  <div style={s.beneficioBadge}>
                    <Ico.gift size={20} color="#fff" />
                  </div>
                  <div style={s.beneficioContent}>
                    <div style={s.beneficioLine}>
                      <span style={s.beneficioLabel}>Descuento el barrio</span>
                      <span style={s.beneficioSep}>|</span>
                      <span style={s.beneficioTextShine}>{c.discount_text}</span>
                    </div>
                  </div>
                </div>
                <div style={s.beneficioDeco} />
              </div>
            )}

            {c.description && (
              <section style={s.commerceAbout}>
                <h3 style={s.commerceAboutTitle}>Acerca del comercio</h3>
                <p style={s.commerceAboutText}>{c.description}</p>
              </section>
            )}

            {promos.length > 0 && (
              <section style={s.promosSection}>
                <div style={s.commerceSectionHeader}>
                  <div style={s.commerceSectionTitles}><strong>Promociones destacadas</strong><small>Beneficios del comercio</small></div>
                </div>
                <div style={s.promosScroll}>
                  {promos.map(promo => (
                    <article key={promo.id} style={s.promoCard}>
                      {promo.image_url ? <img src={promo.image_url} alt="" style={s.promoImage} /> : <div style={s.promoFallback}><Ico.gift size={24} color={C.verde} /></div>}
                      <div style={s.promoBody}>
                        <strong>{promo.title || 'Promoción del comercio'}</strong>
                        {promo.description && <span>{promo.description}</span>}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {featuredProducts.length > 0 && (
              <section style={s.commerceProductsSection}>
                <div style={s.commerceSectionHeader}>
                  <div style={s.commerceSectionTitles}><strong>Productos destacados</strong><small>Selección del comercio</small></div>
                </div>
                <div style={s.commerceProductsScroll}>
                  {featuredProducts.map(product => (
                    <article key={product.id} style={s.commerceProductCard}>
                      <div style={s.commerceProductImageWrap}>
                        {product.image_url
                          ? <img src={product.image_url} alt={product.name} style={s.commerceProductImage} />
                          : <div style={s.commerceProductFallback}><Ico.gift size={24} color={C.verde} /></div>}
                        <span style={s.commerceProductFeaturedBadge}>★ Recomendado</span>
                      </div>
                      <div style={s.commerceProductBody}>
                        <strong style={s.commerceProductName}>{product.name}</strong>
                        {product.description && <span style={s.commerceProductDescription}>{product.description}</span>}
                        <span style={s.commerceProductPrice}>{formatProductPrice(product)}</span>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {regularProducts.length > 0 && (
              <section style={s.commerceProductListSection}>
                <div style={s.commerceSectionHeader}>
                  <div style={s.commerceSectionTitles}>
                    <strong>{featuredProducts.length ? 'Más productos' : 'Productos del comercio'}</strong>
                    <small>{regularProducts.length} {regularProducts.length === 1 ? 'producto disponible' : 'productos disponibles'}</small>
                  </div>
                </div>
                <div style={s.commerceProductList}>
                  {visibleRegularProducts.map(product => (
                    <article key={product.id} style={s.commerceProductRow}>
                      {product.image_url
                        ? <img src={product.image_url} alt={product.name} style={s.commerceProductRowImage} />
                        : <div style={s.commerceProductRowFallback}><Ico.gift size={18} color={C.verde} /></div>}
                      <div style={s.commerceProductRowBody}>
                        <strong>{product.name}</strong>
                        {product.description && <span>{product.description}</span>}
                      </div>
                      <strong style={s.commerceProductRowPrice}>{formatProductPrice(product)}</strong>
                    </article>
                  ))}
                </div>
                {regularProducts.length > 4 && (
                  <button type="button" style={s.commerceProductShowAll} onClick={() => setShowAllProducts(value => !value)}>
                    {showAllProducts ? 'Ver menos' : `Ver todo el catálogo (${regularProducts.length})`}
                  </button>
                )}
              </section>
            )}

            {gallery.length > 0 && (
              <section style={s.commerceGallerySection}>
                <div style={s.commerceSectionHeader}>
                  <div style={s.commerceSectionTitles}><strong>Imágenes del comercio</strong><small>Conoce el lugar</small></div>
                </div>
                <div ref={galeriaRef} style={s.commerceGalleryScroll}>
                  {gallery.map((item, index) => (
                    <button key={item.url} type="button" style={s.commerceGalleryCard} onClick={() => setLightbox(item.url)} aria-label={`Ver imagen ${index + 1}`}>
                      <img src={item.url} alt="" style={s.commerceGalleryImage} />
                      {item.label && <span style={s.commerceGalleryCaption}>{item.label}</span>}
                    </button>
                  ))}
                </div>
              </section>
            )}

            <section style={s.commerceReviewsSection}>
              <div style={s.commerceSectionHeader}>
                <div style={s.commerceSectionTitles}><strong>Opiniones de vecinos</strong><small>{reviews.length ? `${reviews.length} opiniones` : 'La confianza se construye entre vecinos'}</small></div>
              </div>
              <button type="button" style={s.commerceReviewAction} onClick={openReview}>
                <span style={s.commerceReviewActionIcon}>★</span>
                <span style={s.commerceReviewActionCopy}>
                  <strong>{ownReview ? 'Editar mi opinión' : 'Deja tu opinión'}</strong>
                  <small>{ownReview ? 'Actualiza tu experiencia' : 'Ayuda a otros vecinos a elegir'}</small>
                </span>
                <span style={s.commerceReviewActionArrow}>›</span>
              </button>
              {reviews.length > 0 ? reviews.map((review) => {
                const score = Math.max(0, Math.min(5, Number(review.rating) || 0))
                return (
                  <article key={review.id} style={s.commerceReviewCard}>
                    <div style={s.commerceReviewTop}>
                      <strong>{review.reviewer_name || review.author_name || 'Vecino del barrio'}</strong>
                      <span style={s.commerceReviewStars}>{'★'.repeat(score)}{'☆'.repeat(5 - score)}</span>
                    </div>
                    {(review.comment || review.content || review.review) && <p style={s.commerceReviewText}>{review.comment || review.content || review.review}</p>}
                  </article>
                )
              }) : (
                <div style={s.commerceReviewsEmpty}>Este comercio aún no tiene opiniones.</div>
              )}
            </section>

            {/* DROPDOWN: VER UBICACIÓN */}
            <button
              style={s.dropdownBar}
              onClick={() => setMapaOpen(!mapaOpen)}
            >
              <span style={s.dropdownBarLeft}>
                <span style={s.dropdownIconBox}>
                  <Ico.pin size={14} color={C.verde} />
                </span>
                Ubicación
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

        {/* ── FOOTER: CTAs ── */}
        {isPremium ? (
          /* PREMIUM: fila de CTAs (WhatsApp + Ir + Instagram) */
          <div style={s.ctaRow}>
            {wa && (
              <a href={wa} target="_blank" rel="noreferrer" style={{ ...s.ctaBtn, ...s.ctaWhatsapp }} aria-label="WhatsApp">
                <Ico.whatsapp size={20} color="#fff" />
                <span>WhatsApp</span>
              </a>
            )}
            {c.lat != null && c.lng != null && (
              <a href={`https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}`} target="_blank" rel="noreferrer" style={{ ...s.ctaBtn, ...s.ctaMaps }} aria-label="Cómo llegar">
                <Ico.pin size={19} color="#fff" />
                <span>Ir</span>
              </a>
            )}
            {igUrl && (
              <a href={igUrl} target="_blank" rel="noreferrer" style={{ ...s.ctaBtn, ...s.ctaInstagram }} aria-label="Instagram">
                <Ico.instagram size={19} color="#fff" />
                <span>Instagram</span>
              </a>
            )}
          </div>
        ) : (
          /* NORMAL: solo botón WhatsApp grande full-width */
          wa ? (
            <a
              href={wa}
              target="_blank"
              rel="noreferrer"
              style={s.detalleWaBtn}
            >
              <Ico.whatsapp size={20} color="#fff" />
              <span>Contactar por WhatsApp</span>
            </a>
          ) : (
            <div style={s.detalleWaPlaceholder} />
          )
        )}
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

      {shareOpen && (
        <div style={s.shareSheetBackdrop} onClick={() => setShareOpen(false)}>
          <div style={s.shareSheet} onClick={(e) => e.stopPropagation()}>
            <div style={s.shareSheetHandle} />
            <strong style={s.shareSheetTitle}>Compartir comercio</strong>
            <span style={s.shareSheetSubtitle}>Envía la información por tu canal preferido</span>
            <div style={s.shareOptions}>
              <a href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noreferrer" style={s.shareOption}>
                <span style={s.shareOptionIcon}><Ico.whatsapp size={20} color={C.verde} /></span>
                WhatsApp
              </a>
              <a href={`sms:?body=${encodeURIComponent(shareText)}`} style={s.shareOption}>
                <span style={s.shareOptionIcon}><Ico.message size={20} /></span>
                Mensaje
              </a>
              <button type="button" style={s.shareOption} onClick={copiarInformacion}>
                <span style={s.shareOptionIcon}><Ico.copy size={20} /></span>
                {copiado ? 'Copiado' : 'Copiar info'}
              </button>
            </div>
            <button type="button" style={s.shareCancel} onClick={() => setShareOpen(false)}>Cancelar</button>
          </div>
        </div>
      )}

      {reviewOpen && (
        <div style={s.reviewFormBackdrop} onClick={() => !reviewSaving && setReviewOpen(false)}>
          <form style={s.reviewFormSheet} onSubmit={saveReview} onClick={event => event.stopPropagation()}>
            <div style={s.reviewFormHandle} />
            <div style={s.reviewFormHeader}>
              <div style={s.reviewFormTitles}>
                <strong style={s.reviewFormTitle}>{ownReview ? 'Edita tu opinión' : 'Deja tu opinión'}</strong>
                <span style={s.reviewFormSubtitle}>{c.name}</span>
              </div>
              <button type="button" style={s.reviewFormClose} onClick={() => setReviewOpen(false)} disabled={reviewSaving}>×</button>
            </div>
            <div style={s.reviewStarsPicker} aria-label="Calificación">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  type="button"
                  key={star}
                  style={s.reviewStarButton}
                  onClick={() => setReviewDraft(current => ({ ...current, rating: star }))}
                  aria-label={`${star} ${star === 1 ? 'estrella' : 'estrellas'}`}
                  aria-pressed={reviewDraft.rating === star}
                >
                  {star <= reviewDraft.rating ? '★' : '☆'}
                </button>
              ))}
            </div>
            <textarea
              style={s.reviewFormTextarea}
              value={reviewDraft.comment}
              onChange={event => setReviewDraft(current => ({ ...current, comment: event.target.value }))}
              placeholder="Cuéntales a tus vecinos cómo fue tu experiencia…"
              maxLength={800}
              rows={4}
            />
            <div style={s.reviewFormMeta}>
              <span>{reviewDraft.comment.length}/800</span>
              {reviewError && <strong>{reviewError}</strong>}
            </div>
            <button type="submit" style={s.reviewFormSubmit} disabled={reviewSaving}>
              {reviewSaving ? 'Guardando…' : ownReview ? 'Guardar cambios' : 'Publicar opinión'}
            </button>
          </form>
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
  const [cat, setCat] = useState('Todas')
  const [userCoords, setUserCoords] = useState(null)
  const [seleccionado, setSeleccionado] = useState(null)
  const [cerrandoDetalle, setCerrandoDetalle] = useState(false)
  const [expandidoId, setExpandidoId] = useState(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [featuredIndex, setFeaturedIndex] = useState(0)
  const [featuredOrder, setFeaturedOrder] = useState([])
  const featuredScrollRef = useRef(null)
  const featuredPausedRef = useRef(false)
  const featuredResumeTimerRef = useRef(null)

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
      const loadedCommerces = data || []
      const premiumIds = loadedCommerces.filter(commerce => commerce.is_premium).map(commerce => commerce.id)
      for (let index = premiumIds.length - 1; index > 0; index -= 1) {
        const randomIndex = Math.floor(Math.random() * (index + 1))
        ;[premiumIds[index], premiumIds[randomIndex]] = [premiumIds[randomIndex], premiumIds[index]]
      }
      setFeaturedOrder(premiumIds)
      setComercios(loadedCommerces)
    } catch (err) {
      console.error('Error cargando comercios:', err)
    } finally {
      setCargando(false)
    }
  }

  const filtrados = comercios.filter((c) => {
    const cats = c.categories?.length ? c.categories : (c.category ? [c.category] : [])
    if (cat !== 'Todas' && !cats.includes(cat)) return false
    const termino = busqueda.trim().toLowerCase()
    if (termino) {
      const texto = [c.name, c.description, c.address, ...cats].filter(Boolean).join(' ').toLowerCase()
      if (!texto.includes(termino)) return false
    }
    return true
  })

  const esAdmin = profile?.is_admin || profile?.role === 'admin' || profile?.is_operator
  const destacados = filtrados
    .filter(c => c.is_premium)
    .sort((first, second) => {
      const firstPosition = featuredOrder.indexOf(first.id)
      const secondPosition = featuredOrder.indexOf(second.id)
      if (firstPosition === -1 || secondPosition === -1) return 0
      return firstPosition - secondPosition
    })
  const cercanos = filtrados.filter(c => !c.is_premium)

  const scrollFeaturedTo = (index) => {
    const container = featuredScrollRef.current
    const card = container?.children?.[index]
    if (!container || !card) return
    container.scrollTo({ left: Math.max(0, card.offsetLeft - 16), behavior: 'smooth' })
    setFeaturedIndex(index)
  }

  const pauseFeatured = () => {
    featuredPausedRef.current = true
    if (featuredResumeTimerRef.current) clearTimeout(featuredResumeTimerRef.current)
  }

  const resumeFeatured = () => {
    if (featuredResumeTimerRef.current) clearTimeout(featuredResumeTimerRef.current)
    featuredResumeTimerRef.current = setTimeout(() => {
      featuredPausedRef.current = false
    }, 2600)
  }

  const syncFeaturedIndex = () => {
    const container = featuredScrollRef.current
    if (!container?.children?.length) return
    const target = container.scrollLeft + 16
    let nearest = 0
    let nearestDistance = Infinity
    Array.from(container.children).forEach((card, index) => {
      const distanceToCard = Math.abs(card.offsetLeft - target)
      if (distanceToCard < nearestDistance) {
        nearest = index
        nearestDistance = distanceToCard
      }
    })
    setFeaturedIndex(nearest)
  }

  useEffect(() => {
    if (destacados.length <= 1) {
      setFeaturedIndex(0)
      return undefined
    }
    const interval = setInterval(() => {
      if (featuredPausedRef.current) return
      setFeaturedIndex(current => {
        const next = (current + 1) % destacados.length
        const container = featuredScrollRef.current
        const card = container?.children?.[next]
        if (container && card) {
          container.scrollTo({ left: Math.max(0, card.offsetLeft - 16), behavior: 'smooth' })
        }
        return next
      })
    }, 4200)
    return () => {
      clearInterval(interval)
      if (featuredResumeTimerRef.current) clearTimeout(featuredResumeTimerRef.current)
    }
  }, [destacados.length])

  const onAbrirComercio = (c) => {
    setCerrandoDetalle(false)
    setSeleccionado(c)
  }
  const onToggleComercio = (id) => setExpandidoId(current => current === id ? null : id)

  const onCerrarDetalle = () => {
    if (cerrandoDetalle) return
    setCerrandoDetalle(true)
    setTimeout(() => {
      setSeleccionado(null)
      setCerrandoDetalle(false)
    }, 260)
  }

  const onEditarComercio = (c) => {
    setSeleccionado(null)
    if (onEditar) onEditar(c)
    else if (onCrear) onCrear('commerce', c)
  }

  const onAgregar = () => {
    if (onCrear) onCrear('commerce')
    else if (onEditar) onEditar(null)
  }
  const phonePortal = typeof document !== 'undefined'
    ? document.querySelector('.phone-content')
    : null

  return (
    <div style={s.wrap}>
      <style>{`
        @keyframes commerceBagDrift {
          from { background-position: 0 0; }
          to { background-position: 112px -68px; }
        }
        @keyframes commerceDetailSlideIn {
          from { transform: translate3d(100%, 0, 0); }
          to { transform: translate3d(0, 0, 0); }
        }
        @keyframes commerceDetailSlideOut {
          from { transform: translate3d(0, 0, 0); }
          to { transform: translate3d(100%, 0, 0); }
        }
        @keyframes commerceDetailBackdropIn {
          from { background-color: rgba(17,24,39,0); }
          to { background-color: rgba(17,24,39,0.6); }
        }
        @keyframes commerceDetailBackdropOut {
          from { background-color: rgba(17,24,39,0.6); }
          to { background-color: rgba(17,24,39,0); }
        }
        @keyframes commerceReviewSheetIn {
          from { opacity: 0.7; transform: translate3d(0, 100%, 0); }
          to { opacity: 1; transform: translate3d(0, 0, 0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .commerce-feed-header { animation: none !important; }
          .commerce-basic-motion,
          .commerce-basic-motion * { transition: none !important; }
        }
      `}</style>
      <header className="commerce-feed-header" style={s.feedHeader}>
        <button
          type="button"
          style={s.feedBackButton}
          onClick={() => onNavigate?.('back')}
          aria-label="Volver"
        >
          <Ico.back size={22} color={C.verdeOsc} />
        </button>
        <strong style={s.feedHeaderTitle}>
          Comercios de <span style={s.feedHeaderBrand}>el barrio</span>
        </strong>
        <button
          type="button"
          style={{ ...s.feedSearchButton, ...(searchOpen ? s.feedSearchButtonActive : {}) }}
          onClick={() => {
            setSearchOpen(v => !v)
            if (searchOpen) setBusqueda('')
          }}
          aria-label={searchOpen ? 'Cerrar búsqueda' : 'Buscar comercios'}
        >
          {searchOpen ? <span style={s.feedSearchClose}>×</span> : <Ico.search size={19} color={C.verdeOsc} />}
        </button>
      </header>

      {searchOpen && (
        <div style={s.feedSearchWrap}>
          <Ico.search size={17} color={C.textoTenue} />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar comercios…"
            style={s.feedSearchInput}
            autoFocus
          />
        </div>
      )}

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
              <span style={s.filterIcon}>{c === 'Todas' ? '🏪' : ci.emoji}</span>
              {c === 'Todas' ? 'Todos' : ({
                Almacén: 'Almacenes',
                Panadería: 'Panaderías',
                Farmacia: 'Farmacias',
                Restaurante: 'Restaurantes',
                Cafetería: 'Cafeterías',
              }[c] || c)}
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
              {cat !== 'Todas'
                ? 'No hay comercios con ese filtro'
                : 'Todavía no hay comercios en el barrio'}
            </div>
            <div style={s.vacioTxt}>
              {cat !== 'Todas'
                ? 'Probá con otro rubro.'
                : 'Si tenés un local o conocés uno, sumalo al directorio.'}
            </div>
            {esAdmin && cat === 'Todas' && (
              <button style={s.vacioBtn} onClick={onAgregar}>
                <Ico.plus size={16} color="#fff" /> Agregar comercio
              </button>
            )}
          </div>
        ) : (
          <div style={{ marginBottom: 120 }}>
            {destacados.length > 0 && (
              <section style={s.feedSection}>
                <div style={s.feedHeading}>
                  <span style={s.feedHeadingTitle}><span style={s.featuredSectionIcon}><Ico.star size={10} color="#fff" /></span>Comercios Destacados</span>
                  <button style={s.seeAllBtn} onClick={() => setCat('Todas')}>Ver todos</button>
                </div>
                <div
                  ref={featuredScrollRef}
                  style={s.featuredScroll}
                  onScroll={syncFeaturedIndex}
                  onPointerEnter={pauseFeatured}
                  onPointerLeave={resumeFeatured}
                  onTouchStart={pauseFeatured}
                  onTouchEnd={resumeFeatured}
                >
                  {destacados.map(c => <CardGrande key={c.id} c={c} userCoords={userCoords} onAbrir={onAbrirComercio} />)}
                </div>
                {destacados.length > 1 && (
                  <div style={s.featuredDots} aria-label="Comercios destacados">
                    {destacados.map((commerce, index) => (
                      <button
                        type="button"
                        key={commerce.id}
                        style={{ ...s.featuredDot, ...(featuredIndex === index ? s.featuredDotActive : {}) }}
                        onClick={() => scrollFeaturedTo(index)}
                        aria-label={`Ver destacado ${index + 1}`}
                      />
                    ))}
                  </div>
                )}
              </section>
            )}
            {cercanos.length > 0 && (
              <section style={s.feedSection}>
                <div style={s.nearbyHeading}>Cerca de ti</div>
                {cercanos.map(c => (
                  <CardCompacta key={c.id} c={c} userCoords={userCoords} expanded={expandidoId === c.id} onToggle={onToggleComercio} />
                ))}
              </section>
            )}
          </div>
        )}
      </div>

      {/* FICHA COMPLETA — solo se abre desde comercios destacados */}
      {seleccionado && (phonePortal ? createPortal(
        <ComercioDetalle
          c={seleccionado}
          userCoords={userCoords}
          profile={profile}
          onClose={onCerrarDetalle}
          onEditar={onEditarComercio}
          esAdmin={esAdmin}
          closing={cerrandoDetalle}
        />,
        phonePortal,
      ) : (
        <ComercioDetalle
          c={seleccionado}
          userCoords={userCoords}
          profile={profile}
          onClose={onCerrarDetalle}
          onEditar={onEditarComercio}
          esAdmin={esAdmin}
          closing={cerrandoDetalle}
        />
      ))}
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

  feedHeader: {
    minHeight: 72,
    padding: 'calc(env(safe-area-inset-top, 0px) + 22px) 58px 16px',
    flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.card,
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='72' height='64' viewBox='0 0 72 64'%3E%3Cg fill='none' stroke='%2316a34a' stroke-opacity='.22' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M19 20h34l-3 35H22l-3-35Z'/%3E%3Cpath d='M27 20v-5a9 9 0 0 1 18 0v5'/%3E%3C/g%3E%3C/svg%3E")`,
    backgroundSize: '72px 64px',
    backgroundPosition: 'calc(50% - 86px) center',
    backgroundRepeat: 'no-repeat',
    borderBottom: `2px solid ${C.verde}`,
    boxSizing: 'border-box', position: 'relative',
  },
  feedBackButton: {
    position: 'absolute', left: 16, bottom: 10,
    width: 38, height: 38, padding: 0, border: `1px solid ${C.borde}`, borderRadius: '50%',
    background: 'rgba(255,255,255,0.88)', cursor: 'pointer',
    display: 'grid', placeItems: 'center',
  },
  feedSearchButton: {
    position: 'absolute', right: 16, bottom: 11,
    width: 36, height: 36, padding: 0, border: `1px solid ${C.borde}`, borderRadius: '50%',
    background: 'rgba(255,255,255,0.88)', cursor: 'pointer',
    display: 'grid', placeItems: 'center',
  },
  feedSearchButtonActive: { borderColor: C.verde, background: C.verdeSuave },
  feedSearchClose: { color: C.verde, fontSize: 22, fontWeight: 400, lineHeight: 1 },
  feedHeaderTitle: {
    minWidth: 0, textAlign: 'center', fontSize: 16, lineHeight: 1.2,
    color: '#26302b', fontWeight: 600, whiteSpace: 'nowrap',
    overflow: 'hidden', textOverflow: 'ellipsis',
    padding: '5px 10px',
    background: 'transparent', border: 'none', boxShadow: 'none',
  },
  feedHeaderBrand: { color: C.verde, fontWeight: 700 },
  feedSearchWrap: {
    minHeight: 42, margin: '12px 16px 0', padding: '0 12px', flexShrink: 0,
    display: 'flex', alignItems: 'center', gap: 8,
    background: C.card, border: `1px solid ${C.borde}`, borderRadius: 12,
  },
  feedSearchInput: {
    flex: 1, minWidth: 0, border: 0, outline: 'none', background: 'transparent',
    color: C.texto, fontSize: 13, fontFamily: 'inherit',
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
    fontSize: 17.5, fontWeight: 600, color: C.texto,
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

  /* ── filtros ── */
  filtrosScroll: {
    display: 'flex', gap: 10,
    overflowX: 'auto',
    padding: '24px 16px 22px',
    flexShrink: 0,
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
    WebkitOverflowScrolling: 'touch',
  },
  filtroChip: {
    flexShrink: 0,
    minHeight: 29, padding: '0 14px',
    borderRadius: 999,
    fontSize: 10.5, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit',
    display: 'flex', alignItems: 'center', gap: 5,
    whiteSpace: 'nowrap',
  },
  filterIcon: { fontSize: 14, lineHeight: 1 },

  /* ── scroll principal ── */
  scroll: {
    flex: 1, overflowY: 'auto',
    padding: '4px 16px 0',
    WebkitOverflowScrolling: 'touch',
  },
  feedSection: { marginBottom: 36 },
  feedHeading: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
    marginBottom: 12, color: C.texto,
  },
  feedHeadingTitle: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700 },
  featuredSectionIcon: { width: 17, height: 17, borderRadius: '50%', background: C.verdeOsc, display: 'grid', placeItems: 'center' },
  seeAllBtn: { padding: 0, border: 0, background: 'transparent', color: C.verdeOsc, fontSize: 10, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' },
  nearbyHeading: { marginBottom: 12, fontSize: 14.5, fontWeight: 700, color: C.texto },
  featuredScroll: {
    display: 'flex', gap: 10, overflowX: 'auto',
    margin: '0 -16px', padding: '0 16px 4px',
    WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', scrollSnapType: 'x mandatory', scrollBehavior: 'smooth',
  },
  featuredDots: { minHeight: 14, marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 },
  featuredDot: { width: 6, height: 6, padding: 0, borderRadius: 999, background: '#cbd5ce', transition: 'width .22s ease, background .22s ease' },
  featuredDotActive: { width: 18, background: C.verde },
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
    borderRadius: 11,
    border: '1px solid #c8d3c8',
    overflow: 'hidden',
    marginBottom: 0,
    cursor: 'pointer',
    boxShadow: '0 1px 3px rgba(15,23,42,.06)',
    width: '100%', minWidth: '100%', flexShrink: 0, scrollSnapAlign: 'start',
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
    height: 109,
    background: C.fondo,
    overflow: 'hidden',
  },
  coverImg: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
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
    top: 7, right: 7,
    background: C.verde,
    color: C.verdeOsc,
    padding: '4px 8px', borderRadius: 999,
    fontSize: 8.5, fontWeight: 700,
    display: 'flex', alignItems: 'center', gap: 4,
    boxShadow: 'none',
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

  cardGrandeBody: { padding: '10px 12px 11px' },
  featuredIdentity: { display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 },
  featuredCategoryIcon: { width: 27, height: 27, borderRadius: '50%', display: 'grid', placeItems: 'center', flexShrink: 0, overflow: 'hidden', fontSize: 12 },
  featuredCategoryImg: { width: '100%', height: '100%', objectFit: 'cover' },
  featuredMeta: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 10, fontSize: 10.5, color: '#657068', fontWeight: 600 },
  feedSocialMeta: { minWidth: 0, display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' },
  feedRatingMeta: { display: 'inline-flex', alignItems: 'center', gap: 3 },
  feedFavoriteMeta: { color: '#d93667', fontWeight: 700, whiteSpace: 'nowrap' },
  nombreGrande: {
    minWidth: 0, fontSize: 11.5, fontWeight: 700, color: C.texto,
    lineHeight: 1.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
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
    background: C.verdeSuave, color: C.verde,
    border: `1px solid ${C.verde}30`,
    padding: '5px 10px', borderRadius: 9,
    fontSize: 12, fontWeight: 700,
    marginBottom: 9,
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
    minHeight: 100, display: 'block',
    background: C.card, borderRadius: 10, padding: 9,
    border: '1px solid #c7d4c7',
    marginBottom: 10, cursor: 'pointer',
    transition: 'border-color .22s ease, box-shadow .22s ease, transform .22s ease',
  },
  cardCompactaExpanded: {
    border: `1.5px solid ${C.verde}`,
    boxShadow: '0 3px 12px rgba(22,163,74,0.12)',
  },
  cardCompactaTopRow: {
    minHeight: 80, display: 'grid', gridTemplateColumns: '80px minmax(0, 1fr) 22px', alignItems: 'center', gap: 11,
  },
  logoCuadrado: {
    width: 80, height: 80, borderRadius: 8, flexShrink: 0,
    overflow: 'hidden', background: C.fondo,
  },
  logoCuadradoImg: { width: '100%', height: '100%', objectFit: 'cover' },
  logoCuadradoFallback: {
    width: '100%', height: '100%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  cardCompactaBody: { flex: 1, minWidth: 0 },
  compactTitleRow: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 5 },
  nombreCompacto: {
    minWidth: 0, fontSize: 13.5, fontWeight: 700, color: C.texto,
    lineHeight: 1.25, marginBottom: 3,
  },
  estadoBadge: { flexShrink: 0, padding: '2px 5px', borderRadius: 5, fontSize: 7.5, lineHeight: 1.1, fontWeight: 800 },
  compactDescription: { fontSize: 9.5, lineHeight: 1.35, color: C.textoSuave, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 10 },
  compactMeta: { display: 'flex', alignItems: 'center', gap: 5, color: C.textoSuave, fontSize: 10.5 },
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
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    transition: 'transform .24s cubic-bezier(.2,.8,.2,1)',
  },

  /* ── Sección expandible inline (acordeón, sin modal) ── */
  expandMotion: {
    display: 'block', overflow: 'hidden',
    transition: 'max-height .38s cubic-bezier(.22,1,.36,1), opacity .28s ease, transform .38s cubic-bezier(.22,1,.36,1)',
    willChange: 'max-height, opacity, transform',
  },
  expandMotionInner: { minHeight: 0, overflow: 'hidden' },
  cardCompactaExpand: {
    marginTop: 10,
    padding: '11px 3px 2px',
    borderTop: `1px dashed ${C.borde}`,
    display: 'flex', flexDirection: 'column', gap: 8,
    transition: 'transform .26s cubic-bezier(.2,.8,.2,1)',
  },
  expandCategories: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  expandCategoryChip: { padding: '4px 8px', borderRadius: 8, fontSize: 9.5, fontWeight: 700 },
  expandDescription: {
    margin: 0, color: C.textoSuave, fontSize: 12, lineHeight: 1.45,
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
    fontSize: 11.5, color: C.texto, fontWeight: 500,
    lineHeight: 1.4,
  },
  basicActions: {
    display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8,
    marginTop: 3,
  },
  basicWhatsapp: {
    minHeight: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderRadius: 9, background: C.whatsapp, color: '#fff',
    textDecoration: 'none', fontSize: 11.5, fontWeight: 700,
  },
  basicMaps: {
    minHeight: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderRadius: 9, background: C.verdeSuave, color: C.verdeOsc,
    border: `1px solid ${C.verde}30`, textDecoration: 'none', fontSize: 11.5, fontWeight: 700,
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
    zIndex: 400,
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
    height: 220,
    background: C.fondo,
    overflow: 'hidden',
    borderTopLeftRadius: 0, borderTopRightRadius: 0,
  },
  detalleCoverImg: { width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' },
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
    top: 'calc(env(safe-area-inset-top, 0px) + 44px)', left: 14, right: 14,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    zIndex: 5,
  },
  detalleHeaderActions: { display: 'flex', alignItems: 'center', gap: 7 },
  detalleHeroIdentity: {
    position: 'absolute', left: 16, bottom: 10, zIndex: 5,
    display: 'flex', alignItems: 'center', gap: 8,
  },
  detalleHeroLogo: {
    width: 58, height: 58, borderRadius: 12, overflow: 'hidden',
    background: '#fff', border: '2px solid rgba(255,255,255,0.9)',
    boxShadow: '0 3px 10px rgba(15,23,42,0.2)', color: C.verdeOsc,
    display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 800,
  },
  detalleHeroLogoImg: { width: '100%', height: '100%', objectFit: 'contain', background: '#fff' },
  detalleHeroFeatured: {
    padding: '6px 11px', borderRadius: 999, background: C.verde,
    color: '#fff', fontSize: 10.5, lineHeight: 1, fontWeight: 800,
    boxShadow: '0 2px 7px rgba(0,0,0,0.18)',
  },
  detalleHeroActions: {
    position: 'absolute', right: 12, bottom: 10, zIndex: 5,
    display: 'flex', alignItems: 'center', gap: 7,
  },
  detalleShareFloat: {
    width: 38, height: 38, borderRadius: '50%',
    background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
    border: '1px solid rgba(255,255,255,0.18)', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0,
  },
  detalleFavoriteActive: { background: C.verde },
  promosSection: { marginTop: 0, marginBottom: 22 },
  promosHeading: { fontSize: 15, fontWeight: 600, color: C.texto, marginBottom: 9 },
  promosScroll: { display: 'flex', gap: 9, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' },
  promoCard: { width: 165, minWidth: 165, borderRadius: 12, overflow: 'hidden', background: '#fff', border: `1px solid ${C.borde}`, boxShadow: '0 2px 7px rgba(15,23,42,0.05)' },
  promoImage: { width: '100%', height: 105, objectFit: 'cover', display: 'block' },
  promoFallback: { width: '100%', height: 105, background: C.verdeSuave, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  promoBody: { padding: 10, display: 'flex', flexDirection: 'column', gap: 3, fontSize: 11.5, lineHeight: 1.35, color: C.textoSuave },
  commerceProductsSection: {
    marginTop: 14, marginBottom: 22, padding: 14,
    background: 'rgba(255,255,255,0.78)', border: `1px solid ${C.borde}`, borderRadius: 13,
    boxShadow: '0 2px 8px rgba(15,23,42,0.04)',
  },
  commerceProductsScroll: { display: 'flex', gap: 9, overflowX: 'auto', paddingBottom: 3, scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' },
  commerceProductCard: {
    width: 165, minWidth: 165, overflow: 'hidden', borderRadius: 11,
    background: '#fff', border: `1px solid ${C.borde}`, boxShadow: '0 2px 7px rgba(15,23,42,0.05)',
  },
  commerceProductImageWrap: { position: 'relative', width: '100%', height: 105, overflow: 'hidden' },
  commerceProductImage: { width: '100%', height: 105, objectFit: 'cover', display: 'block' },
  commerceProductFallback: { width: '100%', height: 105, background: C.verdeSuave, display: 'grid', placeItems: 'center' },
  commerceProductFeaturedBadge: { position: 'absolute', left: 7, top: 7, padding: '4px 7px', borderRadius: 999, background: C.verde, color: '#fff', fontSize: 8.5, fontWeight: 800, boxShadow: '0 2px 7px rgba(0,0,0,.18)' },
  commerceProductBody: { minHeight: 79, padding: 10, display: 'flex', flexDirection: 'column', gap: 4 },
  commerceProductName: { color: C.texto, fontSize: 11.5, lineHeight: 1.3 },
  commerceProductDescription: {
    color: C.textoSuave, fontSize: 10.5, lineHeight: 1.35,
    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
  },
  commerceProductPrice: { marginTop: 'auto', color: C.verde, fontSize: 13.5, lineHeight: 1.25, fontWeight: 700 },
  commerceProductListSection: { marginTop: 14, marginBottom: 22, padding: 14, borderRadius: 13, background: 'rgba(255,255,255,0.78)', border: `1px solid ${C.borde}`, boxShadow: '0 2px 8px rgba(15,23,42,0.04)' },
  commerceProductList: { display: 'flex', flexDirection: 'column', gap: 8 },
  commerceProductRow: { minHeight: 62, display: 'grid', gridTemplateColumns: '56px minmax(0,1fr) auto', alignItems: 'center', gap: 10, padding: 7, borderRadius: 10, background: '#fff', border: `1px solid ${C.borde}` },
  commerceProductRowImage: { width: 56, height: 56, borderRadius: 8, objectFit: 'cover', display: 'block' },
  commerceProductRowFallback: { width: 56, height: 56, borderRadius: 8, display: 'grid', placeItems: 'center', background: C.verdeSuave },
  commerceProductRowBody: { minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3, color: C.texto, fontSize: 11.5, lineHeight: 1.3 },
  commerceProductRowPrice: { color: C.verde, fontSize: 11.5, whiteSpace: 'nowrap' },
  commerceProductShowAll: { width: '100%', marginTop: 10, padding: '9px 12px', borderRadius: 9, background: C.verdeSuave, color: C.verdeOsc, fontSize: 11, fontWeight: 800, fontFamily: 'inherit' },
  detalleClose: {
    width: 38, height: 38, borderRadius: '50%',
    background: 'rgba(255,255,255,0.92)',
    backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
    border: '1px solid rgba(255,255,255,0.65)', color: C.texto,
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
    padding: '0 16px 22px',
    position: 'relative',
    marginTop: -2,
  },
  commerceInfoCard: {
    position: 'relative', zIndex: 3, background: 'rgba(255,255,255,0.92)', borderRadius: 13,
    padding: '14px 14px 13px', border: `1px solid ${C.borde}`,
    boxShadow: '0 4px 12px rgba(15,23,42,0.07)',
  },
  commerceIdentityRow: { position: 'absolute', top: 0, left: 14, height: 0 },
  commerceMiniLogo: {
    width: 46, height: 46, marginTop: -39, borderRadius: 10,
    background: `linear-gradient(135deg, ${C.verde}, ${C.verdeOsc})`,
    border: '3px solid #fff', overflow: 'hidden', boxShadow: '0 3px 10px rgba(15,23,42,0.15)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 16, fontWeight: 800,
  },
  commerceMiniLogoImg: { width: '100%', height: '100%', objectFit: 'cover' },
  commerceFeaturedPill: { padding: '4px 9px', borderRadius: 999, background: C.verdeSuave, color: C.verdeOsc, fontSize: 10.5, fontWeight: 700 },
  commerceTitleRow: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  commerceTitle: { margin: 0, color: C.texto, fontSize: 18.5, lineHeight: 1.2, fontWeight: 700, letterSpacing: '-0.3px' },
  commerceSocialStats: { display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 },
  commerceRating: { flexShrink: 0, padding: '5px 8px', borderRadius: 9, background: '#f7f4ee', color: '#554b3d', fontSize: 12, fontWeight: 700 },
  commerceFavoriteCount: { flexShrink: 0, padding: '5px 8px', borderRadius: 9, background: '#fff0f3', color: '#a3455b', fontSize: 12, fontWeight: 700 },
  commerceFavoriteCountActive: { background: '#e91e63', color: '#fff' },
  commerceStatus: { marginTop: 4, minHeight: 18 },
  commerceAddressRow: {
    display: 'grid', gridTemplateColumns: '18px 1fr auto', alignItems: 'center', gap: 7,
    marginTop: 9, paddingTop: 9, borderTop: `1px solid ${C.borde}`, color: C.textoSuave, fontSize: 11.5, lineHeight: 1.3,
  },
  commerceMapLink: { color: C.verde, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' },
  commerceSectionHeader: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 10 },
  commerceSectionTitles: { display: 'flex', flexDirection: 'column', gap: 2, fontSize: 14, color: C.texto },
  commerceGallerySection: {
    marginTop: 14, marginBottom: 22, padding: 14,
    background: 'rgba(255,255,255,0.78)', border: `1px solid ${C.borde}`, borderRadius: 13,
    boxShadow: '0 2px 8px rgba(15,23,42,0.04)',
  },
  commerceGalleryScroll: { display: 'flex', gap: 9, overflowX: 'auto', paddingBottom: 3, scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' },
  commerceGalleryCard: {
    width: 174, minWidth: 174, padding: 0, border: `1px solid ${C.borde}`,
    borderRadius: 11, overflow: 'hidden', background: C.card, cursor: 'pointer',
    textAlign: 'left', fontFamily: 'inherit',
  },
  commerceGalleryImage: { width: '100%', height: 104, objectFit: 'cover', display: 'block' },
  commerceGalleryCaption: {
    display: 'block', padding: '8px 9px', color: C.texto,
    fontSize: 11.5, fontWeight: 600, lineHeight: 1.3,
  },
  commerceAbout: {
    marginTop: 20, padding: 14, borderRadius: 13,
    background: 'rgba(255,255,255,0.78)', border: `1px solid ${C.borde}`,
    boxShadow: '0 2px 8px rgba(15,23,42,0.04)',
  },
  commerceAboutTitle: { margin: '0 0 8px', fontSize: 14, fontWeight: 700, color: C.texto },
  commerceAboutText: { margin: 0, fontSize: 13.5, lineHeight: 1.55, color: C.textoSuave },
  commerceReviewsSection: {
    marginTop: 14, marginBottom: 22, padding: 14, borderRadius: 13,
    background: 'rgba(255,255,255,0.78)', border: `1px solid ${C.borde}`,
    boxShadow: '0 2px 8px rgba(15,23,42,0.04)',
  },
  commerceReviewCard: { background: '#f1f4ff', border: '1px solid #e2e8f7', borderRadius: 13, padding: 13, marginBottom: 9 },
  commerceReviewTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, fontSize: 12.5, color: C.texto },
  commerceReviewStars: { color: '#8a7658', fontSize: 12, letterSpacing: 1, whiteSpace: 'nowrap' },
  commerceReviewText: { margin: '9px 0 0', color: C.textoSuave, fontSize: 12.5, lineHeight: 1.5, fontStyle: 'italic' },
  commerceReviewsEmpty: { padding: '18px 14px', borderRadius: 13, background: '#f5f7fb', color: C.textoSuave, textAlign: 'center', fontSize: 12.5 },
  commerceReviewAction: {
    width: '100%', minHeight: 52, marginBottom: 12, padding: '9px 12px', borderRadius: 12,
    display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
    background: C.verde, color: '#fff', border: 0,
    boxShadow: '0 5px 14px rgba(22,163,74,0.22)',
    fontFamily: 'inherit', cursor: 'pointer',
  },
  commerceReviewActionIcon: { width: 32, height: 32, flexShrink: 0, borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'rgba(255,255,255,0.18)', color: '#fff', fontSize: 17 },
  commerceReviewActionCopy: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 },
  commerceReviewActionArrow: { fontSize: 24, fontWeight: 400, lineHeight: 1 },
  reviewFormBackdrop: {
    position: 'absolute', inset: 0, zIndex: 950,
    background: 'rgba(15,23,42,0.48)', display: 'flex', alignItems: 'flex-end',
  },
  reviewFormSheet: {
    width: '100%', padding: '10px 18px calc(env(safe-area-inset-bottom, 0px) + 18px)',
    maxHeight: 'calc(100% - 24px)', overflowY: 'auto', overscrollBehavior: 'contain',
    boxSizing: 'border-box', WebkitOverflowScrolling: 'touch',
    borderRadius: '22px 22px 0 0', background: '#fff',
    boxShadow: '0 -12px 34px rgba(15,23,42,0.2)', fontFamily: T.font,
    animation: 'commerceReviewSheetIn 280ms cubic-bezier(.22,1,.36,1) both',
  },
  reviewFormHandle: { width: 38, height: 4, borderRadius: 999, background: '#d7ddd9', margin: '0 auto 15px' },
  reviewFormHeader: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  reviewFormTitles: { display: 'flex', flexDirection: 'column', gap: 3 },
  reviewFormTitle: { color: C.texto, fontSize: 17 },
  reviewFormSubtitle: { color: C.textoSuave, fontSize: 11.5 },
  reviewFormClose: { width: 34, height: 34, borderRadius: '50%', background: '#f1f5f2', color: C.texto, fontSize: 22, lineHeight: 1 },
  reviewStarsPicker: { display: 'flex', justifyContent: 'center', gap: 8, margin: '20px 0 16px' },
  reviewStarButton: { padding: 0, color: '#d69b22', fontSize: 35, lineHeight: 1, fontFamily: 'inherit' },
  reviewFormTextarea: { width: '100%', padding: 13, border: `1px solid ${C.borde}`, borderRadius: 12, background: '#f8faf9', color: C.texto, fontSize: 13, lineHeight: 1.5, resize: 'none', boxSizing: 'border-box' },
  reviewFormMeta: { minHeight: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, color: C.textoTenue, fontSize: 9.5 },
  reviewFormSubmit: { width: '100%', minHeight: 46, borderRadius: 12, background: C.verde, color: '#fff', fontSize: 13.5, fontWeight: 800, fontFamily: 'inherit' },

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
    background: 'linear-gradient(135deg, rgba(22,163,74,0.82) 0%, rgba(8,116,59,0.78) 100%)',
    padding: '10px 13px',
    marginTop: 16,
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
    width: 34, height: 34, borderRadius: '50%',
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
    textShadow: '0 1px 3px rgba(0,0,0,0.38)',
  },
  beneficioSep: {
    fontSize: 13, fontWeight: 400, color: 'rgba(255,255,255,0.45)',
    lineHeight: 1,
  },
  beneficioText: {
    fontSize: 14.5, fontWeight: 800, color: '#fff',
    lineHeight: 1.3,
    letterSpacing: '-0.1px',
    textShadow: '0 1px 3px rgba(0,0,0,0.38)',
  },
  /* Variante con shine animado (text-shadow pulsante tenue) */
  beneficioTextShine: {
    fontSize: 14.5, fontWeight: 800, color: '#fff',
    lineHeight: 1.3,
    letterSpacing: '-0.1px',
    textShadow: '0 1px 3px rgba(0,0,0,0.38)',
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

  /* ══════ CTAs premium (fila de 4 botones) ══════ */
  ctaRow: {
    display: 'flex',
    width: '100%',
    flexShrink: 0,
    gap: 1,
    background: C.borde,
    boxShadow: '0 -4px 14px rgba(0,0,0,0.08)',
  },
  ctaBtn: {
    flex: 1,
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
    padding: '9px 6px calc(env(safe-area-inset-bottom, 0px) + 8px)',
    textDecoration: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#fff',
    fontSize: 10, fontWeight: 700, fontFamily: 'inherit',
    transition: 'filter .15s ease',
  },
  ctaWhatsapp: {
    background: C.whatsapp,
  },
  ctaMaps: {
    background: '#4285F4',
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
  shareSheetBackdrop: {
    position: 'absolute', inset: 0, zIndex: 820,
    background: 'rgba(15,23,42,0.42)',
    display: 'flex', alignItems: 'flex-end',
  },
  shareSheet: {
    width: '100%', padding: '10px 16px calc(env(safe-area-inset-bottom, 0px) + 16px)',
    borderRadius: '20px 20px 0 0', background: '#fff',
    boxShadow: '0 -10px 30px rgba(15,23,42,0.18)', boxSizing: 'border-box',
  },
  shareSheetHandle: {
    width: 38, height: 4, borderRadius: 999, background: '#d7ddd9', margin: '0 auto 15px',
  },
  shareSheetTitle: { display: 'block', textAlign: 'center', fontSize: 16, color: C.texto },
  shareSheetSubtitle: { display: 'block', textAlign: 'center', marginTop: 4, fontSize: 11.5, color: C.textoSuave },
  shareOptions: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 18 },
  shareOption: {
    minWidth: 0, padding: '12px 5px', borderRadius: 13, border: `1px solid ${C.borde}`,
    background: '#f8faf9', color: C.texto, textDecoration: 'none', fontFamily: 'inherit',
    fontSize: 10.5, fontWeight: 700, cursor: 'pointer',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  shareOptionIcon: {
    width: 38, height: 38, borderRadius: '50%', background: C.verdeSuave,
    display: 'grid', placeItems: 'center',
  },
  shareCancel: {
    width: '100%', marginTop: 12, padding: '11px 14px', borderRadius: 12,
    border: 0, background: '#edf1ee', color: C.texto, fontFamily: 'inherit',
    fontSize: 13, fontWeight: 700, cursor: 'pointer',
  },

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
