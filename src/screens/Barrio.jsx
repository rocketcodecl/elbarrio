import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { hace } from '../lib/design'
import MiniMap from '../components/MiniMap'
import CommerceForm from '../components/CommerceForm'
import PromoForm from '../components/PromoForm'
import AvisoForm from '../components/AvisoForm'
import { textoEstado, estadoComercio } from '../lib/horarios'

// ===== ICONOS UI =====
const Icon = {
  Pin: ({ size = 18, color = '#16a34a' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
    </svg>
  ),
  Bell: ({ size = 14, color = '#666' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  ),
  BellBig: ({ size = 20, color = '#333' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  ),
  Calendar: ({ size = 14, color = '#666' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  Wrench: ({ size = 14, color = '#666' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
    </svg>
  ),
  Store: ({ size = 14, color = '#666' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  Shield: ({ size = 20, color = '#fff' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  ShieldAlert: ({ size = 22, color = '#dc2626' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  ),
  HeartPulse: ({ size = 22, color = '#059669' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z"/>
      <path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27"/>
    </svg>
  ),
  Hammer: ({ size = 22, color = '#d97706' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 12l-8.5 8.5a2.12 2.12 0 1 1-3-3L12 9"/>
      <path d="M17.64 15 22 10.64"/>
      <path d="M20.91 11.7 12.3 3.1a2.12 2.12 0 0 0-3 0L7.6 4.8a2.12 2.12 0 0 0 0 3l8.6 8.6a2.12 2.12 0 0 0 3 0l1.7-1.7a2.12 2.12 0 0 0 0-3z"/>
    </svg>
  ),
  PawPrint: ({ size = 22, color = '#ec4899' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="4" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="4" cy="8" r="2"/><circle cx="7" cy="15" r="2"/>
      <path d="M12 10c-3 0-5 2-5 5 0 3 2 5 5 5s5-2 5-5c0-3-2-5-5-5z"/>
    </svg>
  ),
  Camera: ({ size = 16, color = '#666' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
      <circle cx="12" cy="13" r="4"/>
    </svg>
  ),
  MapPinSm: ({ size = 13, color = '#666' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
    </svg>
  ),
  Flag: ({ size = 14, color = '#dc2626' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>
    </svg>
  ),
  Clock: ({ size = 11, color = '#888' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  PinSm: ({ size = 11, color = '#888' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
    </svg>
  ),
  Users: ({ size = 11, color = '#666' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  Star: ({ size = 12, color = '#f59e0b' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke={color} strokeWidth="1">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  ),
  VerifiedGreen: ({ size = 13 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#16a34a" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="8 12 11 15 16 9" stroke="#fff" fill="none"/>
    </svg>
  ),
  VerifiedGold: ({ size = 13 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#d97706" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="8 12 11 15 16 9" stroke="#fff" fill="none"/>
    </svg>
  ),
  ChevronRight: ({ size = 14, color = '#999' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  ),
  Phone: ({ size = 13, color = '#fff' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
    </svg>
  ),
  X: ({ size = 22, color = '#333' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  Check: ({ size = 12, color = '#16a34a' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  Grid: ({ size = 14, color = '#666' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
    </svg>
  ),
  Send: ({ size = 16, color = '#fff' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  )
}

// ===== ICONOS POR RUBRO =====
const CatIcon = {
  gasfiter: ({ size = 18, color = '#2563eb' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
    </svg>
  ),
  electrico: ({ size = 18, color = '#d97706' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  ),
  cerrajero: ({ size = 18, color = '#6b7280' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="15" r="4"/><path d="M10.85 12.15 19 4"/><path d="M18 5l2 2"/><path d="M15 8l2 2"/>
    </svg>
  ),
  pintor: ({ size = 18, color = '#ea580c' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="3" width="16" height="6" rx="1"/><path d="M8 9v3a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V9"/><path d="M12 13v4"/><rect x="9" y="17" width="6" height="5" rx="1"/>
    </svg>
  ),
  carpintero: ({ size = 18, color = '#a16207' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
    </svg>
  ),
  maestro: ({ size = 18, color = '#78716c' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="4"/><rect x="3" y="10" width="18" height="4"/><rect x="3" y="16" width="18" height="4"/>
    </svg>
  ),
  techos: ({ size = 18, color = '#7c2d12' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12L12 4l10 8"/><path d="M4 11v9h16v-9"/>
    </svg>
  ),
  aseo: ({ size = 18, color = '#7c3aed' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 8h14l-1.5 12h-11z"/><path d="M9 8V5a3 3 0 0 1 6 0v3"/>
    </svg>
  ),
  jardinero: ({ size = 18, color = '#16a34a' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22V12"/><path d="M12 12c0-4 3-7 7-7-1 4-3 7-7 7z"/><path d="M12 12c0-4-3-7-7-7 1 4 3 7 7 7z"/>
    </svg>
  ),
  piscinas: ({ size = 18, color = '#0891b2' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s2-2 5-2 5 2 5 2 2-2 5-2 5 2 5 2"/><path d="M2 18s2-2 5-2 5 2 5 2 2-2 5-2 5 2 5 2"/><path d="M2 6s2-2 5-2 5 2 5 2 2-2 5-2 5 2 5 2"/>
    </svg>
  ),
  fumigacion: ({ size = 18, color = '#059669' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2h4l1 3v3l-2 2v10h-2V10L7 8V5z"/><path d="M15 6h4"/><path d="M15 10h4"/><path d="M15 14h4"/>
    </svg>
  ),
  aire: ({ size = 18, color = '#0284c7' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="8" rx="1"/><path d="M6 13v3"/><path d="M12 13v5"/><path d="M18 13v3"/>
    </svg>
  ),
  electrodomesticos: ({ size = 18, color = '#4b5563' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="3" width="16" height="18" rx="2"/><circle cx="12" cy="13" r="4"/>
    </svg>
  ),
  internet: ({ size = 18, color = '#0ea5e9' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12a10 10 0 0 1 14 0"/><path d="M8.5 15.5a5 5 0 0 1 7 0"/><circle cx="12" cy="19" r="1" fill={color}/>
    </svg>
  ),
  mascotas: ({ size = 18, color = '#ec4899' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="4" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="4" cy="8" r="2"/><circle cx="7" cy="15" r="2"/>
      <path d="M12 10c-3 0-5 2-5 5 0 3 2 5 5 5s5-2 5-5c0-3-2-5-5-5z"/>
    </svg>
  ),
  adultomayor: ({ size = 18, color = '#a855f7' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="5" r="2"/><path d="M12 7v6"/><path d="M9 13h6"/><path d="M11 13l-2 9"/><path d="M13 13l2 9"/>
    </svg>
  ),
  ninera: ({ size = 18, color = '#f472b6' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="3"/><path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>
    </svg>
  ),
  fletes: ({ size = 18, color = '#0f766e' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="6" width="14" height="10"/><path d="M15 9h4l3 3v4h-7"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>
    </svg>
  )
}

// ===== BADGES DE TIPOS DE AVISO =====
const AVISO_STYLES = {
  corte_agua:          { label: 'CORTE DE AGUA', color: '#2563eb', bg: '#dbeafe' },
  corte_luz:           { label: 'CORTE DE LUZ',  color: '#d97706', bg: '#fef3c7' },
  jjvv:                { label: 'AVISO JJVV',    color: '#16a34a', bg: '#dcfce7' },
  municipal:           { label: 'MUNICIPAL',     color: '#0891b2', bg: '#cffafe' },
  operativo:           { label: 'OPERATIVO',     color: '#7c3aed', bg: '#ede9fe' },
  seguridad:           { label: 'SEGURIDAD',     color: '#dc2626', bg: '#fee2e2' },
  incidente_reportado: { label: 'INCIDENTE',     color: '#e11d48', bg: '#ffe4e6' }
}

// ===== RUBROS DE SERVICIO =====
const RUBROS = [
  { key: 'gasfiter',          label: 'Gasfíter',                color: '#2563eb', bg: '#dbeafe', Icon: CatIcon.gasfiter },
  { key: 'electrico',         label: 'Eléctrico',               color: '#d97706', bg: '#fef3c7', Icon: CatIcon.electrico },
  { key: 'cerrajero',         label: 'Cerrajero',               color: '#6b7280', bg: '#f3f4f6', Icon: CatIcon.cerrajero },
  { key: 'pintor',            label: 'Pintor',                  color: '#ea580c', bg: '#fed7aa', Icon: CatIcon.pintor },
  { key: 'carpintero',        label: 'Carpintero',              color: '#a16207', bg: '#fef3c7', Icon: CatIcon.carpintero },
  { key: 'maestro',           label: 'Maestro',                 color: '#78716c', bg: '#f5f5f4', Icon: CatIcon.maestro },
  { key: 'techos',            label: 'Techos',                  color: '#7c2d12', bg: '#fee2e2', Icon: CatIcon.techos },
  { key: 'aseo',              label: 'Aseo',                    color: '#7c3aed', bg: '#ede9fe', Icon: CatIcon.aseo },
  { key: 'jardinero',         label: 'Jardinero',               color: '#16a34a', bg: '#dcfce7', Icon: CatIcon.jardinero },
  { key: 'piscinas',          label: 'Piscinas',                color: '#0891b2', bg: '#cffafe', Icon: CatIcon.piscinas },
  { key: 'fumigacion',        label: 'Fumigación',              color: '#059669', bg: '#d1fae5', Icon: CatIcon.fumigacion },
  { key: 'aire',              label: 'Aire acondicionado',      color: '#0284c7', bg: '#e0f2fe', Icon: CatIcon.aire },
  { key: 'electrodomesticos', label: 'Técnico electrodomésticos', color: '#4b5563', bg: '#f3f4f6', Icon: CatIcon.electrodomesticos },
  { key: 'internet',          label: 'Internet y redes',        color: '#0ea5e9', bg: '#e0f2fe', Icon: CatIcon.internet },
  { key: 'mascotas',          label: 'Paseo de mascotas',       color: '#ec4899', bg: '#fce7f3', Icon: CatIcon.mascotas },
  { key: 'adultomayor',       label: 'Cuidado adulto mayor',    color: '#a855f7', bg: '#f3e8ff', Icon: CatIcon.adultomayor },
  { key: 'ninera',            label: 'Niñera',                  color: '#f472b6', bg: '#fce7f3', Icon: CatIcon.ninera },
  { key: 'fletes',            label: 'Fletes',                  color: '#0f766e', bg: '#ccfbf1', Icon: CatIcon.fletes }
]

const TOP_KEYS = ['gasfiter', 'electrico', 'aseo', 'jardinero', 'mascotas', 'pintor', 'cerrajero', 'fletes']
const getRubro = (key) => RUBROS.find(r => r.key === key)

// ===== CATEGORÍAS DE REPORTE =====
Icon.StoreBig = ({ size = 26, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l1.5-5h15L21 9"/><path d="M4 9v11a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9"/>
    <path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/>
    <path d="M9 21v-6h6v6"/>
  </svg>
)
Icon.Spark = ({ size = 13, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4z"/>
  </svg>
)
Icon.Plus = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
)
Icon.Edit = ({ size = 15, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/>
  </svg>
)
Icon.Trash = ({ size = 15, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
  </svg>
)

const REPORT_CATS = [
  { key: 'seguridad', label: 'Seguridad',       color: '#dc2626', bg: '#fee2e2', Icon: Icon.ShieldAlert, desc: 'Robos, peleas, sospechosos' },
  { key: 'salud',     label: 'Salud',           color: '#059669', bg: '#d1fae5', Icon: Icon.HeartPulse,  desc: 'Emergencia, riesgo sanitario' },
  { key: 'infra',     label: 'Infraestructura', color: '#d97706', bg: '#fef3c7', Icon: Icon.Hammer,      desc: 'Baches, luminarias, basura' },
  { key: 'mascotas',  label: 'Mascotas',        color: '#ec4899', bg: '#fce7f3', Icon: Icon.PawPrint,    desc: 'Animal perdido o maltrato' }
]

// ===== DEMO DATA =====
const DEMO_AVISOS = [
  { id: 1, type: 'corte_agua', title: 'Corte de agua programado', content: 'Se suspenderá el suministro en Av. Italia entre Condell y Santa Isabel por mantención de la red.', author: 'Aguas Andinas', authorRole: 'municipal', timeAgo: 'Hace 2h', affected: 340, duration: '14:00 - 18:00 hrs' },
  { id: 2, type: 'jjvv', title: 'Reunión ordinaria JJVV UV23', content: 'Se convoca a reunión mensual en sede vecinal. Temas: seguridad, áreas verdes y presupuesto.', author: 'JJVV Unidad 23', authorRole: 'jjvv', timeAgo: 'Hace 5h', affected: null, duration: 'Sábado 10:00 hrs' },
  { id: 3, type: 'corte_luz', title: 'Apagón en Sector Norte', content: 'Interrupción de servicio eléctrico afectando aproximadamente 3 cuadras alrededor de la plaza principal.', author: 'Enel Chile', authorRole: 'municipal', timeAgo: 'Hace 16 min', affected: 89, duration: 'Estimado: 2 hrs' },
  { id: 4, type: 'operativo', title: 'Operativo de poda de árboles', content: 'Poda en calle Caupolicán y alrededores. Se recomienda no estacionar en la cuadra.', author: 'Municipalidad', authorRole: 'municipal', timeAgo: 'Hace 1d', affected: null, duration: 'Lunes a miércoles' }
]

const now = new Date()
const inDays = (n) => { const d = new Date(now); d.setDate(d.getDate() + n); return d.toISOString() }
const daysAgo = (n) => { const d = new Date(now); d.setDate(d.getDate() - n); return d.toISOString() }

const DEMO_EVENTOS = [
  { id: 1, title: 'Feria de las Pulgas', location: 'Plaza Ñuñoa', date: inDays(3), time: '10:00 - 18:00', attendees: 48, image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=400&fit=crop', free: true },
  { id: 2, title: 'Bingo Solidario Vecinal', location: 'Sede JJVV UV23', date: inDays(4), time: '16:00 - 19:00', attendees: 32, image: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&h=400&fit=crop', free: false },
  { id: 3, title: 'Taller de Huertos Urbanos', location: 'Parque Comunitario', date: inDays(7), time: '11:00 - 13:00', attendees: 15, image: 'https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?w=800&h=400&fit=crop', free: true },
  { id: 4, title: 'Actividad vencida (test)', location: 'Plaza test', date: daysAgo(2), time: '10:00', attendees: 5, image: null, free: true }
]

const DEMO_SERVICIOS = [
  { id: 1, name: 'Carlos Muñoz', rubroKey: 'gasfiter', rating: 4.8, reviews: 23, phone: '+56912345678', photo: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=300&h=300&fit=crop', cover: 'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=800&h=300&fit=crop', sponsored: true, available: true, certifications: ['Certificado SEC', 'Boleta electrónica', 'Garantía 30 días'], description: 'Gasfíter con 12 años de experiencia. Trabajo emergencias 24/7 y proyectos residenciales. Especialista en calefones y termos.', jobsDone: 187, yearsInHood: 6 },
  { id: 2, name: 'Elena Rivas', rubroKey: 'electrico', rating: 4.9, reviews: 41, phone: '+56987654321', photo: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=300&h=300&fit=crop', cover: null, sponsored: false, available: true, certifications: ['Instaladora clase A', 'Boleta electrónica'], description: 'Electricista certificada clase A. Instalaciones residenciales, tableros, iluminación LED y automatización.', jobsDone: 96, yearsInHood: 3 },
  { id: 3, name: 'Mario López', rubroKey: 'piscinas', rating: 4.6, reviews: 12, phone: '+56911223344', photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&h=300&fit=crop', cover: 'https://images.unsplash.com/photo-1519452575417-564c1401ecc0?w=800&h=300&fit=crop', sponsored: true, available: true, certifications: ['Certificado en mantención de piscinas', 'Garantía 15 días'], description: 'Mantención de piscinas residenciales y de comunidad. Análisis químico, limpieza de fondos, reparación de motobombas.', jobsDone: 74, yearsInHood: 4 },
  { id: 4, name: 'Rodrigo Salas', rubroKey: 'jardinero', rating: 4.7, reviews: 18, phone: '+56922334455', photo: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=300&h=300&fit=crop', cover: null, sponsored: false, available: true, certifications: ['Boleta electrónica'], description: 'Diseño y mantención de jardines. Corte de pasto, poda, riego automatizado, huertos urbanos.', jobsDone: 58, yearsInHood: 2 },
  { id: 5, name: 'Sofía Herrera', rubroKey: 'mascotas', rating: 5.0, reviews: 8, phone: '+56955667788', photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&h=300&fit=crop', cover: null, sponsored: false, available: false, certifications: ['Curso de primeros auxilios caninos'], description: 'Paseadora y cuidadora de mascotas. Paseos individuales o grupales, cuidados en casa mientras viajas.', jobsDone: 34, yearsInHood: 5 }
]

const DEMO_COMERCIOS = [
  { id: 1, name: 'Panadería Masa Madre', category: 'Panadería Artesanal', address: 'Av. Italia 1245', open: true, closesAt: '20:00', benefit: '15% dcto antes de las 11 AM', rating: 4.9, reviews: 67, image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&h=400&fit=crop' },
  { id: 2, name: 'Café de Especialidad Ritual', category: 'Cafetería', address: 'Condell 1080', open: true, closesAt: '21:00', benefit: '2x1 en latte después de las 17:00', rating: 4.7, reviews: 34, image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&h=400&fit=crop' },
  { id: 3, name: 'Ferretería Don Luis', category: 'Ferretería', address: 'Irarrázaval 2100', open: false, closesAt: null, benefit: null, rating: 4.5, reviews: 19, image: 'https://images.unsplash.com/photo-1530124566582-a618bc2615dc?w=800&h=400&fit=crop' }
]

const getInitials = (name) => {
  if (!name) return '??'
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}

const MESES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC']
const DIAS = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SAB']

function Barrio({ currentUser, onNavigate }) {
  const [activeTab, setActiveTab] = useState('avisos')
  const [servicioCat, setServicioCat] = useState('todos')
  const [currentProfile, setCurrentProfile] = useState(null)
  const [selectedService, setSelectedService] = useState(null)
  const [showAllRubros, setShowAllRubros] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportCat, setReportCat] = useState(null)
  const [reportText, setReportText] = useState('')
  const [reportAnon, setReportAnon] = useState(false)
  const [reportError, setReportError] = useState('')
  const [reportSending, setReportSending] = useState(false)
  const [reportSent, setReportSent] = useState(false)

  // Ubicación DEL HECHO (nunca la casa del vecino)
  const [reportLat, setReportLat] = useState(null)
  const [reportLng, setReportLng] = useState(null)
  const [reportLocText, setReportLocText] = useState('')
  const [locState, setLocState] = useState('idle')  // idle | locating | ok | denied | error
  const [showMapPicker, setShowMapPicker] = useState(false)
  const [openMapId, setOpenMapId] = useState(null)   // qué incidente muestra su mapa
  const [myFlags, setMyFlags] = useState([])         // reportes que ya denuncié
  const [actingOn, setActingOn] = useState(null)     // id en el que estoy operando
  const [editingId, setEditingId] = useState(null)   // reporte que estoy editando
  const [editText, setEditText] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)

  // Comercios REALES
  const [comercios, setComercios] = useState([])
  const [loadingComercios, setLoadingComercios] = useState(true)
  const [editCommerce, setEditCommerce] = useState(null)   // objeto o 'nuevo'
  const [avisos, setAvisos] = useState([])
  const [showAvisoForm, setShowAvisoForm] = useState(false)
  const [editAviso, setEditAviso] = useState(null)
  const [selectedCommerce, setSelectedCommerce] = useState(null)
  const [promos, setPromos] = useState([])                 // promos activas del barrio
  const [editPromo, setEditPromo] = useState(null)         // {commerce} o promo

  // Reportes reales de vecinos (tabla incident_reports)
  const [incidents, setIncidents] = useState([])
  const [myConfirms, setMyConfirms] = useState([])   // ids que YO ya confirmé
  const [confirming, setConfirming] = useState(null)

  const notifCount = 3

  useEffect(() => { loadProfile() }, [currentUser?.id])
  useEffect(() => { if (currentProfile?.id) fetchIncidents() }, [currentProfile?.id])
  useEffect(() => {
    if (currentProfile?.neighborhood_id) {
      fetchComercios()
      fetchPromos()
      fetchAvisos()
    }
  }, [currentProfile?.neighborhood_id])

  const loadProfile = async () => {
    if (!currentUser?.id) return
    try {
      const { data } = await supabase
        .from('profiles').select('*')
        .or(`id.eq.${currentUser.id},user_id.eq.${currentUser.id}`)
        .maybeSingle()
      setCurrentProfile(data || null)
    } catch (err) { console.error(err) }
  }

  /* ============================================================
     REPORTES DE VECINOS (reales, desde Supabase)
     Solo del barrio del usuario, activos, de las últimas 24h.
     ============================================================ */
  const fetchIncidents = async () => {
    if (!currentProfile?.neighborhood_id) return
    try {
      const { data, error } = await supabase
        .from('incident_reports')
        .select('*, reporter:profiles!reporter_id (full_name, avatar_url)')
        .eq('neighborhood_id', currentProfile.neighborhood_id)
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString())
        .order('confirms_count', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) throw error
      setIncidents(data || [])

      // ¿Cuáles ya confirmé yo?
      const { data: confirms } = await supabase
        .from('incident_confirmations')
        .select('incident_id')
        .eq('profile_id', currentProfile.id)

      setMyConfirms((confirms || []).map(c => c.incident_id))

      const { data: flags } = await supabase
        .from('incident_flags')
        .select('incident_id')
        .eq('profile_id', currentProfile.id)

      setMyFlags((flags || []).map(f => f.incident_id))
    } catch (err) {
      console.error('Error cargando reportes:', err)
    }
  }

  /* Marcar como resuelto. Solo el que reportó (o el operador).
     Un bache arreglado deja de ser una alerta. */
  const resolveIncident = async (incidentId) => {
    if (!currentProfile?.id) return
    setActingOn(incidentId)
    try {
      const { error } = await supabase
        .from('incident_reports')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          resolved_by: currentProfile.id,
        })
        .eq('id', incidentId)

      if (error) throw error
      await fetchIncidents()
    } catch (err) {
      console.error('Error al resolver:', err)
    } finally {
      setActingOn(null)
    }
  }

  /* Denunciar contenido abusivo. Con 3 denuncias el reporte se oculta solo,
     a la espera de revisión. No es censura: es un freno para lo obvio. */
  const flagIncident = async (incidentId) => {
    if (!currentProfile?.id || myFlags.includes(incidentId)) return
    setActingOn(incidentId)
    try {
      const { error } = await supabase
        .from('incident_flags')
        .insert([{ incident_id: incidentId, profile_id: currentProfile.id }])

      if (error && error.code !== '23505') throw error

      setMyFlags(prev => [...prev, incidentId])
      await fetchIncidents()
    } catch (err) {
      console.error('Error al denunciar:', err)
    } finally {
      setActingOn(null)
    }
  }

  /* Borrar. Siempre se puede: es TU reporte. */
  const deleteIncident = async (incidentId) => {
    setActingOn(incidentId)
    try {
      const { error } = await supabase
        .from('incident_reports')
        .delete()
        .eq('id', incidentId)

      if (error) throw error
      setConfirmDelete(null)
      await fetchIncidents()
    } catch (err) {
      console.error('Error al borrar:', err)
    } finally {
      setActingOn(null)
    }
  }

  /* Editar el texto. SOLO si nadie lo ha confirmado todavía.
     Si un vecino ya puso la cara por tu reporte, el texto se congela:
     si no, se podría publicar "perro perdido", juntar 15 confirmaciones,
     y después cambiar el texto por spam o una acusación con respaldo falso. */
  const saveEdit = async (incidentId) => {
    if (!editText.trim()) return
    setActingOn(incidentId)
    try {
      const { error } = await supabase
        .from('incident_reports')
        .update({ description: editText.trim() })
        .eq('id', incidentId)

      if (error) throw error
      setEditingId(null)
      setEditText('')
      await fetchIncidents()
    } catch (err) {
      console.error('Error al editar:', err)
    } finally {
      setActingOn(null)
    }
  }

  const startEdit = (item) => {
    setEditingId(item.id)
    setEditText(item.description)
  }

  const expiraEn = (fecha) => {
    if (!fecha) return null
    const hrs = Math.floor((new Date(fecha) - Date.now()) / 3600000)
    if (hrs <= 0) return null
    if (hrs < 24) return `Expira en ${hrs}h`
    return `Expira en ${Math.floor(hrs / 24)}d`
  }

  /* "Yo también lo veo" — la corroboración vecinal.
     Es lo que hace creíble un reporte sin necesidad de ninguna autoridad. */
  const confirmIncident = async (incidentId) => {
    if (!currentProfile?.id || myConfirms.includes(incidentId)) return
    setConfirming(incidentId)
    try {
      const { error } = await supabase
        .from('incident_confirmations')
        .insert([{ incident_id: incidentId, profile_id: currentProfile.id }])

      if (error && error.code !== '23505') throw error   // 23505 = ya lo confirmó

      setMyConfirms(prev => [...prev, incidentId])
      await fetchIncidents()
    } catch (err) {
      console.error('Error al confirmar:', err)
    } finally {
      setConfirming(null)
    }
  }

  /* Avisos oficiales — los publica el operador (admin) desde la app.
     Los vecinos NO pueden crear avisos oficiales, solo reportes de incidentes.
     Esa distinción es lo que le da credibilidad al canal oficial. */
  const fetchAvisos = async () => {
    if (!currentProfile?.neighborhood_id) return
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*, author:profiles!author_id (full_name, user_type)')
        .eq('neighborhood_id', currentProfile.neighborhood_id)
        .eq('type', 'alert')
        .eq('is_official', true)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(10)
      if (error) throw error
      setAvisos(data || [])
    } catch (err) {
      console.error('Error cargando avisos:', err)
    }
  }

  const publicarAviso = async ({ tipo, titulo, contenido, duracion }) => {
    if (!currentProfile?.id) return
    try {
      const { error } = await supabase.from('posts').insert([{
        author_id: currentProfile.id,
        neighborhood_id: currentProfile.neighborhood_id,
        type: 'alert',
        is_official: true,
        urgency: tipo === 'corte_agua' || tipo === 'corte_luz' ? 'high' : 'medium',
        title: titulo,
        content: contenido,
        status: 'active',
        category: tipo,
      }])
      if (error) throw error
      await fetchAvisos()
      setShowAvisoForm(false)
    } catch (err) {
      console.error('Error publicando aviso:', err)
    }
  }

  const borrarAviso = async (id) => {
    try {
      const { error } = await supabase.from('posts').delete().eq('id', id)
      if (error) throw error
      await fetchAvisos()
    } catch (err) {
      console.error('Error borrando aviso:', err)
    }
  }

  /* Comercios del barrio. Los destacados (is_premium) primero, después
     los abiertos ahora. El que paga sube, pero NUNCA excluye al que no paga. */
  const fetchComercios = async () => {
    if (!currentProfile?.neighborhood_id) return
    setLoadingComercios(true)
    try {
      const { data, error } = await supabase
        .from('commerces')
        .select('*')
        .eq('neighborhood_id', currentProfile.neighborhood_id)
        .eq('is_active', true)
        .order('is_premium', { ascending: false })
        .order('name', { ascending: true })

      if (error) throw error

      const lista = (data || []).sort((a, b) => {
        if (a.is_premium !== b.is_premium) return a.is_premium ? -1 : 1
        const oa = estadoComercio(a.opening_hours).open
        const ob = estadoComercio(b.opening_hours).open
        if (oa !== ob) return oa ? -1 : 1
        return a.name.localeCompare(b.name)
      })

      setComercios(lista)
    } catch (err) {
      console.error('Error cargando comercios:', err)
    } finally {
      setLoadingComercios(false)
    }
  }

  /* Promociones activas del barrio. Son TEMPORALES y siempre expiran.
     No confundir con el Beneficio Vecinal (permanente). */
  const fetchPromos = async () => {
    if (!currentProfile?.neighborhood_id) return
    try {
      const { data, error } = await supabase
        .from('commerce_promos')
        .select('*, commerce:commerces (name, cover_url, category)')
        .eq('neighborhood_id', currentProfile.neighborhood_id)
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .order('expires_at', { ascending: true })

      if (error) throw error
      setPromos(data || [])
    } catch (err) {
      console.error('Error cargando promos:', err)
    }
  }

  const promosDe = (commerceId) => promos.filter(p => p.commerce_id === commerceId)

  const quedanHoras = (fecha) => {
    const h = Math.floor((new Date(fecha) - Date.now()) / 3600000)
    if (h <= 0) return null
    if (h < 24) return `Termina en ${h}h`
    return `Quedan ${Math.floor(h / 24)} días`
  }

  const tiempoRelativo = (fecha) => {
    const min = Math.floor((Date.now() - new Date(fecha)) / 60000)
    if (min < 1) return 'Recién'
    if (min < 60) return `Hace ${min} min`
    const hrs = Math.floor(min / 60)
    if (hrs < 24) return `Hace ${hrs}h`
    return `Hace ${Math.floor(hrs / 24)}d`
  }

  const eventosVigentes = DEMO_EVENTOS
    .filter(e => new Date(e.date) >= new Date(now.toDateString()))
    .sort((a, b) => new Date(a.date) - new Date(b.date))

  // Alertas activas = reportes REALES de vecinos + avisos oficiales urgentes
  const alertasActivas =
    incidents.length +
    DEMO_AVISOS.filter(a =>
      ['corte_agua', 'corte_luz', 'seguridad'].includes(a.type)
    ).length

  const serviciosFiltrados = servicioCat === 'todos'
    ? DEMO_SERVICIOS
    : DEMO_SERVICIOS.filter(s => s.rubroKey === servicioCat)

  const serviciosOrdenados = [...serviciosFiltrados].sort((a, b) => Number(b.sponsored) - Number(a.sponsored))

  const tabs = [
    { id: 'avisos',    label: 'Avisos',    Icon: Icon.Bell },
    { id: 'eventos',   label: 'Eventos',   Icon: Icon.Calendar },
    { id: 'servicios', label: 'Servicios', Icon: Icon.Wrench },
    { id: 'comercios', label: 'Comercios', Icon: Icon.Store }
  ]

  /* GPS del INCIDENTE. Ojo: es la ubicación del hecho, no la del vecino.
     Guardar la casa del reportante filtraría su dirección en cada reporte. */
  const useCurrentLocation = () => {
    if (!navigator.geolocation) { setLocState('error'); return }
    setLocState('locating')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setReportLat(pos.coords.latitude)
        setReportLng(pos.coords.longitude)
        setLocState('ok')
      },
      (err) => setLocState(err.code === 1 ? 'denied' : 'error'),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    )
  }

  const clearLocation = () => {
    setReportLat(null)
    setReportLng(null)
    setLocState('idle')
  }

  const openReportModal = () => {
    setReportCat(null)
    setReportText('')
    setReportAnon(false)
    setReportError('')
    setReportSent(false)
    setReportLat(null)
    setReportLng(null)
    setReportLocText('')
    setLocState('idle')
    setShowMapPicker(false)
    setShowReportModal(true)
  }

  const submitReport = async () => {
    if (!reportCat) { setReportError('Elige una categoría'); return }
    if (!reportText.trim()) { setReportError('Describe qué está pasando'); return }
    if (!reportLocText.trim() && !reportLat) {
      setReportError('Indica dónde está pasando: usa tu ubicación o escribe la referencia')
      return
    }
    if (!currentProfile?.id) { setReportError('No se encontró tu perfil'); return }

    setReportError('')
    setReportSending(true)

    try {
      const { error } = await supabase.from('incident_reports').insert([{
        reporter_id: currentProfile.id,
        neighborhood_id: currentProfile.neighborhood_id,
        category: reportCat,
        description: reportText.trim(),
        is_anonymous: reportAnon,
        lat: reportLat,                       // ubicación DEL HECHO
        lng: reportLng,
        location_text: reportLocText.trim() || null,
        status: 'active',
      }])

      if (error) throw error

      setReportSent(true)
      await fetchIncidents()
      setTimeout(() => {
        setShowReportModal(false)
        setReportSent(false)
      }, 1700)
    } catch (err) {
      setReportError(err.message || 'No se pudo enviar el reporte')
    } finally {
      setReportSending(false)
    }
  }

  const renderAlertBanner = () => {
    if (alertasActivas === 0) return null
    return (
      <div style={s.alertBanner}>
        <div style={s.alertBannerLeft}>
          <div style={s.alertShield}><Icon.Shield size={18} color="#fff" /></div>
          <div>
            <div style={s.alertBannerTitle}>{alertasActivas} alerta{alertasActivas > 1 ? 's' : ''} activa{alertasActivas > 1 ? 's' : ''}</div>
            <div style={s.alertBannerSub}>Revisa los avisos importantes de tu barrio</div>
          </div>
        </div>
        <button style={s.reportBtn} onClick={openReportModal}>
          <Icon.Flag />
          <span style={s.reportBtnText}>Reportar</span>
        </button>
      </div>
    )
  }

  /* Tarjeta de reporte de VECINO. Se ve distinta a un aviso oficial:
     sin check verde, etiqueta "Reportado por vecinos", y contador de
     confirmaciones. La credibilidad la dan los vecinos, no la autoridad. */
  const renderIncidente = (item) => {
    const cat = REPORT_CATS.find(c => c.key === item.category) || REPORT_CATS[0]
    const yaConfirme = myConfirms.includes(item.id)
    const yaDenuncie = myFlags.includes(item.id)
    const esMio = item.reporter_id === currentProfile?.id
    const esAdmin = currentProfile?.user_type === 'admin'
    const confirmado = item.confirms_count >= 3
    const CIcon = cat.Icon

    return (
      <div key={item.id} style={{ ...s.card, borderLeft: `3px solid ${cat.color}` }}>
        <div style={s.cardTop}>
          <span style={{ ...s.typeBadge, backgroundColor: cat.bg, color: cat.color }}>
            {cat.label.toUpperCase()}
          </span>
          <div style={s.cardTopRight}>
            {expiraEn(item.expires_at) && (
              <span style={s.expiraText}>{expiraEn(item.expires_at)}</span>
            )}
            <span style={s.timeText}>{tiempoRelativo(item.created_at)}</span>
          </div>
        </div>

        {editingId === item.id ? (
          <div style={s.editBox}>
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              style={s.editArea}
              maxLength={500}
              autoFocus
            />
            <div style={s.editActions}>
              <button
                style={s.editCancel}
                onClick={() => { setEditingId(null); setEditText('') }}
              >
                Cancelar
              </button>
              <button
                style={s.editSave}
                onClick={() => saveEdit(item.id)}
                disabled={actingOn === item.id || !editText.trim()}
              >
                {actingOn === item.id ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        ) : (
          <div style={s.cardDesc}>{item.description}</div>
        )}

        {(item.location_text || item.lat) && (
          <div style={s.incidentLocRow}>
            <Icon.MapPinSm color="#9ca3af" />
            <span style={s.incidentLocText}>
              {item.location_text || 'Ubicación marcada en el mapa'}
            </span>
            {item.lat && (
              <button
                style={s.mapToggleBtn}
                onClick={() => setOpenMapId(openMapId === item.id ? null : item.id)}
              >
                {openMapId === item.id ? 'Ocultar mapa' : 'Ver en el mapa'}
              </button>
            )}
          </div>
        )}

        {openMapId === item.id && item.lat && (
          <div style={{ marginTop: 10 }}>
            <MiniMap lat={item.lat} lng={item.lng} height={155} color={cat.color} />
          </div>
        )}

        {confirmDelete === item.id && (
          <div style={s.deleteBox}>
            <div style={s.deleteText}>¿Borrar este reporte? No se puede deshacer.</div>
            <div style={s.editActions}>
              <button style={s.editCancel} onClick={() => setConfirmDelete(null)}>
                Cancelar
              </button>
              <button
                style={s.deleteConfirm}
                onClick={() => deleteIncident(item.id)}
                disabled={actingOn === item.id}
              >
                {actingOn === item.id ? 'Borrando...' : 'Sí, borrar'}
              </button>
            </div>
          </div>
        )}

        {confirmado && (
          <div style={s.confirmedTag}>
            <Icon.VerifiedGreen size={12} />
            <span style={s.confirmedTagText}>
              Confirmado por {item.confirms_count} vecinos
            </span>
          </div>
        )}

        <div style={s.cardDivider} />

        <div style={s.cardBottom}>
          <div style={s.authorRow}>
            <div style={{ ...s.authorAvatar, backgroundColor: cat.color, opacity: 0.9 }}>
              {item.is_anonymous ? '?' : getInitials(item.reporter?.full_name)}
            </div>
            <div>
              <span style={s.authorName}>
                {item.is_anonymous ? 'Vecino anónimo' : (item.reporter?.full_name || 'Vecino')}
              </span>
              <div style={s.vecinoTag}>Reportado por vecinos</div>
            </div>
          </div>

          {esMio || esAdmin ? (
            <div style={s.accionesRow}>
              {/* Editar: solo mientras NADIE lo haya confirmado.
                  Después el texto se congela. */}
              {esMio && item.confirms_count === 0 && editingId !== item.id && (
                <button
                  onClick={() => startEdit(item)}
                  title="Editar"
                  style={s.iconAccion}
                >
                  <Icon.Edit />
                </button>
              )}

              {esMio && item.confirms_count > 0 && (
                <span style={s.lockedTag} title="Ya hay vecinos que lo confirmaron">
                  Texto bloqueado
                </span>
              )}

              <button
                onClick={() => setConfirmDelete(item.id)}
                title="Borrar"
                style={{ ...s.iconAccion, color: '#dc2626' }}
              >
                <Icon.Trash />
              </button>

              <button
                onClick={() => resolveIncident(item.id)}
                disabled={actingOn === item.id}
                style={s.resolveBtn}
              >
                {actingOn === item.id ? '...' : 'Marcar resuelto'}
              </button>
            </div>
          ) : (
            <div style={s.accionesRow}>
              <button
                onClick={() => flagIncident(item.id)}
                disabled={yaDenuncie || actingOn === item.id}
                title="Denunciar contenido"
                style={{
                  ...s.flagBtn,
                  color: yaDenuncie ? '#dc2626' : '#c7cdc7',
                  cursor: yaDenuncie ? 'default' : 'pointer',
                }}
              >
                <Icon.Flag />
              </button>

              <button
                onClick={() => confirmIncident(item.id)}
                disabled={yaConfirme || confirming === item.id}
                style={{
                  ...s.confirmBtn,
                  backgroundColor: yaConfirme ? '#dcfce7' : '#fff',
                  borderColor: yaConfirme ? '#16a34a' : '#e5e7eb',
                  color: yaConfirme ? '#16a34a' : '#374151',
                  cursor: yaConfirme ? 'default' : 'pointer',
                }}
              >
                {yaConfirme
                  ? <><Icon.VerifiedGreen size={12} /> <span>Confirmado</span></>
                  : <span>Yo también lo veo</span>}
                {item.confirms_count > 0 && (
                  <span style={s.confirmCount}>{item.confirms_count}</span>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderAviso = (item) => {
    const badge = AVISO_STYLES[item.type] || AVISO_STYLES.jjvv
    const isJJVV = item.authorRole === 'jjvv'
    const isMunicipal = item.authorRole === 'municipal'
    return (
      <div key={item.id} style={s.card}>
        <div style={s.cardTop}>
          <span style={{ ...s.typeBadge, backgroundColor: badge.bg, color: badge.color }}>{badge.label}</span>
          <span style={s.timeText}>{item.timeAgo}</span>
        </div>
        <div style={s.cardTitle}>{item.title}</div>
        <div style={s.cardDesc}>{item.content}</div>
        {item.duration && (
          <div style={s.durationRow}>
            <Icon.Clock />
            <span style={s.durationText}>{item.duration}</span>
          </div>
        )}
        <div style={s.cardDivider} />
        <div style={s.cardBottom}>
          <div style={s.authorRow}>
            <div style={{ ...s.authorAvatar, backgroundColor: isMunicipal ? '#d97706' : '#16a34a' }}>
              {getInitials(item.author)}
            </div>
            <span style={s.authorName}>{item.author}</span>
            {isJJVV && <Icon.VerifiedGreen size={13} />}
            {isMunicipal && <Icon.VerifiedGold size={13} />}
          </div>
          <div style={s.rightMeta}>
            {item.affected && (
              <div style={s.affectedPill}>
                <Icon.Users />
                <span style={s.affectedText}>{item.affected}</span>
              </div>
            )}
            <Icon.ChevronRight />
          </div>
        </div>
      </div>
    )
  }

  const renderEvento = (item) => {
    const d = new Date(item.date)
    const diaSem = DIAS[d.getDay()]
    const mes = MESES[d.getMonth()]
    const dia = d.getDate()
    return (
      <div key={item.id} style={s.card}>
        {item.image && (
          <div style={s.eventoImgWrap}>
            <img src={item.image} alt="" style={s.eventoImg} />
            <div style={s.eventoDateFloat}>
              <div style={s.dateWeek}>{diaSem}</div>
              <div style={s.dateDay}>{dia}</div>
              <div style={s.dateMonth}>{mes}</div>
            </div>
            {item.free && <div style={s.freeFloat}>Gratis</div>}
          </div>
        )}
        <div style={{ padding: item.image ? '14px 4px 4px' : 0 }}>
          <div style={s.cardTitle}>{item.title}</div>
          <div style={s.eventoMeta}>
            <Icon.PinSm />
            <span style={s.metaText}>{item.location}</span>
            <span style={s.dotSep}>·</span>
            <Icon.Clock />
            <span style={s.metaText}>{item.time}</span>
          </div>
          <div style={s.eventoBottom}>
            <div style={s.attendeePill}>
              <Icon.Users color="#16a34a" />
              <span style={s.attendeeText}>{item.attendees} asistirán</span>
            </div>
            <button style={s.joinBtnInline}>Unirse</button>
          </div>
        </div>
      </div>
    )
  }

  const renderServicio = (item) => {
    const rubro = getRubro(item.rubroKey)
    if (!rubro) return null
    const RubroIcon = rubro.Icon
    return (
      <div key={item.id} style={s.card} onClick={() => setSelectedService(item)}>
        {item.sponsored && item.cover && (
          <div style={s.servCover}>
            <img src={item.cover} alt="" style={s.servCoverImg} />
            <span style={s.sponsoredFloat}>PATROCINADO</span>
          </div>
        )}
        <div style={{
          display: 'flex', gap: 14, alignItems: 'center',
          marginTop: item.sponsored && item.cover ? 12 : 0
        }}>
          {item.photo ? (
            <img src={item.photo} alt="" style={s.servPhoto} />
          ) : (
            <div style={s.servPhotoFallback}>{getInitials(item.name)}</div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={s.servTopRow}>
              <div style={s.servCatWrap}>
                <div style={{ ...s.servCatIconBox, backgroundColor: rubro.bg }}>
                  <RubroIcon size={14} color={rubro.color} />
                </div>
                <span style={{ ...s.servCatBig, color: rubro.color }}>
                  {rubro.label.toUpperCase()}
                </span>
              </div>
              <div style={s.servRating}>
                <Icon.Star />
                <span style={s.ratingText}>{item.rating}</span>
                <span style={s.reviewsText}>({item.reviews})</span>
              </div>
            </div>
            <div style={s.servNameRow}>
              <span style={s.servName}>{item.name}</span>
              {item.sponsored && !item.cover && (
                <span style={s.sponsoredBadgeInline}>PATROCINADO</span>
              )}
            </div>
            <div style={s.servStatusRow}>
              <div style={{
                width: 7, height: 7, borderRadius: '50%',
                backgroundColor: item.available ? '#16a34a' : '#bbb'
              }} />
              <span style={{
                fontSize: 11, fontWeight: 600,
                color: item.available ? '#16a34a' : '#999'
              }}>
                {item.available ? 'Disponible ahora' : 'No disponible'}
              </span>
            </div>
          </div>
          <Icon.ChevronRight />
        </div>
      </div>
    )
  }

  /* Tarjeta COMPACTA. El detalle completo va en el modal.
     Mismo patrón que Servicios: lista navegable, no un muro. */
  const renderComercio = (item) => {
    const estado = estadoComercio(item.opening_hours)
    const esAdmin = currentProfile?.user_type === 'admin'
    const misPromos = promosDe(item.id)
    const cats = (item.categories?.length ? item.categories : [item.category]).filter(Boolean)

    return (
      <div key={item.id} style={s.comCard} onClick={() => setSelectedCommerce(item)}>
        <div style={s.comThumbWrap}>
          {item.logo_url || item.cover_url ? (
            <img src={item.logo_url || item.cover_url} alt="" style={s.comThumb} />
          ) : (
            <div style={s.comThumbEmpty}>
              <Icon.StoreBig size={24} color="#c7cdc7" />
            </div>
          )}
          {item.is_premium && <span style={s.comPremiumDot} />}
        </div>

        <div style={s.comInfo}>
          <div style={s.comNameRow}>
            <span style={s.comName}>{item.name}</span>
            {item.is_premium && <Icon.VerifiedGold size={13} />}
          </div>

          <div style={s.comCats}>{cats.join(' · ')}</div>

          <div style={s.comStatusRow}>
            <span style={{
              ...s.comDot,
              backgroundColor: estado.open ? '#22c55e' : '#c7cdc7',
            }} />
            <span style={{
              ...s.comStatusText,
              color: estado.open ? '#16a34a' : '#9ca3af',
            }}>
              {estado.open
                ? `Abierto · cierra ${estado.closesAt}`
                : textoEstado(item.opening_hours)}
            </span>
          </div>

          {misPromos.length > 0 && (
            <div style={s.comPromoRow}>
              <Icon.Spark size={11} />
              <span style={s.comPromoText}>
                {misPromos.length === 1 ? misPromos[0].title : `${misPromos.length} promociones hoy`}
              </span>
            </div>
          )}

          {item.discount_text && (
            <div style={s.comBenefitRow}>
              <span style={s.comBenefitLabel}>VECINOS</span>
              <span style={s.comBenefitText}>{item.discount_text}</span>
            </div>
          )}
        </div>

        {esAdmin && (
          <button
            style={s.comEditBtn}
            onClick={(e) => { e.stopPropagation(); setEditCommerce(item) }}
          >
            <Icon.Edit size={14} />
          </button>
        )}
      </div>
    )
  }

  /* MODAL: la ficha completa del comercio */
  const renderCommerceModal = () => {
    if (!selectedCommerce) return null
    const item = selectedCommerce
    const estado = estadoComercio(item.opening_hours)
    const esAdmin = currentProfile?.user_type === 'admin'
    const misPromos = promosDe(item.id)
    const cats = (item.categories?.length ? item.categories : [item.category]).filter(Boolean)

    const openWhatsApp = () => {
      if (!item.phone) return
      window.open(`https://wa.me/${item.phone.replace(/[^0-9]/g, '')}`, '_blank')
    }

    return (
      <div style={s.modalBackdrop} onClick={() => setSelectedCommerce(null)}>
        <div style={s.modalSheet} onClick={(e) => e.stopPropagation()}>

          <div style={s.modalHeaderImg}>
            {item.cover_url ? (
              <img src={item.cover_url} alt="" style={s.modalCoverImg} />
            ) : (
              <div style={{
                ...s.modalCoverImg,
                backgroundColor: '#eef0ee',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon.StoreBig size={34} color="#c7cdc7" />
              </div>
            )}
            <button style={s.modalClose} onClick={() => setSelectedCommerce(null)}>
              <Icon.X />
            </button>
            {item.is_premium && <span style={s.premiumChip}>DESTACADO</span>}

            <div style={s.comLogoFloat}>
              {item.logo_url ? (
                <img src={item.logo_url} alt="" style={s.comLogoImg} />
              ) : (
                <div style={s.comLogoFallback}>
                  {getInitials(item.name)}
                </div>
              )}
            </div>
          </div>

          <div style={s.modalBody}>
            <div style={{ height: 42 }} />

            <div style={s.modalName}>{item.name}</div>
            <div style={s.comercioCat}>{cats.join(' · ')}</div>

            <div style={s.modalStatusRow}>
              <span style={{
                ...s.comDot,
                backgroundColor: estado.open ? '#22c55e' : '#c7cdc7',
              }} />
              <span style={{
                ...s.comStatusText,
                color: estado.open ? '#16a34a' : '#9ca3af',
                fontSize: 13,
              }}>
                {textoEstado(item.opening_hours)}
              </span>
            </div>

            {/* BENEFICIO VECINAL — permanente, la razón para ser vecino */}
            {item.discount_text && (
              <div style={s.benefitBig}>
                <div style={s.benefitBigIcon}>
                  <Icon.Spark size={17} color="#fff" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={s.benefitBigLabel}>Beneficio Vecinal</div>
                  <div style={s.benefitBigText}>{item.discount_text}</div>
                  <div style={s.benefitBigSub}>
                    Solo para vecinos verificados de El Barrio. Siempre.
                  </div>
                </div>
              </div>
            )}

            {/* PROMOS ACTIVAS — temporales */}
            {misPromos.length > 0 && (
              <div style={s.modalSection}>
                <div style={s.modalSectionTitle}>Promociones de hoy</div>
                {misPromos.map((p) => (
                  <div key={p.id} style={s.promoCard}>
                    {p.image_url && (
                      <img src={p.image_url} alt="" style={s.promoImg} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={s.promoTitle}>{p.title}</div>
                      {p.description && (
                        <div style={s.promoDesc}>{p.description}</div>
                      )}
                      <div style={s.promoTime}>{quedanHoras(p.expires_at)}</div>
                    </div>
                    {esAdmin && (
                      <button
                        style={s.promoEdit}
                        onClick={() => setEditPromo({ promo: p, commerce: item })}
                      >
                        <Icon.Edit size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {esAdmin && (
              <button
                style={s.addPromoBtn}
                onClick={() => setEditPromo({ promo: null, commerce: item })}
              >
                <Icon.Plus />
                <span>Agregar una promoción</span>
              </button>
            )}

            {item.description && (
              <div style={s.modalSection}>
                <div style={s.modalSectionTitle}>Sobre el local</div>
                <div style={s.modalDescription}>{item.description}</div>
              </div>
            )}

            {/* HORARIO */}
            {item.opening_hours && (
              <div style={s.modalSection}>
                <div style={s.modalSectionTitle}>Horario</div>
                <div style={s.horarioList}>
                  {[['1','Lunes'],['2','Martes'],['3','Miércoles'],['4','Jueves'],
                    ['5','Viernes'],['6','Sábado'],['0','Domingo']].map(([k, label]) => {
                    const h = item.opening_hours[k]
                    const esHoy = String(new Date().getDay()) === k
                    return (
                      <div key={k} style={{
                        ...s.horarioRow,
                        fontWeight: esHoy ? 800 : 500,
                        color: esHoy ? '#111827' : '#6b7280',
                      }}>
                        <span>{label}</span>
                        <span>{h ? `${h.o} - ${h.c}` : 'Cerrado'}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* UBICACIÓN */}
            {item.address && (
              <div style={s.modalSection}>
                <div style={s.modalSectionTitle}>Dónde está</div>
                <div style={s.modalDescription}>{item.address}</div>
                {item.lat && (
                  <div style={{ marginTop: 10 }}>
                    <MiniMap lat={item.lat} lng={item.lng} height={160} color="#16a34a" />
                  </div>
                )}
              </div>
            )}

            <div style={s.modalActions}>
              {esAdmin && (
                <button
                  style={s.modalReviewsBtn}
                  onClick={() => { setSelectedCommerce(null); setEditCommerce(item) }}
                >
                  Editar ficha
                </button>
              )}
              <button
                style={{ ...s.modalPrimaryBtn, opacity: item.phone ? 1 : 0.4 }}
                onClick={openWhatsApp}
                disabled={!item.phone}
              >
                <Icon.Phone />
                <span>Contactar por WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderServiceModal = () => {
    if (!selectedService) return null
    const item = selectedService
    const rubro = getRubro(item.rubroKey) || { color: '#666', bg: '#f3f4f6', label: item.rubroKey, Icon: () => null }
    const RubroIcon = rubro.Icon
    const openWhatsApp = () => {
      const clean = item.phone.replace(/[^0-9]/g, '')
      window.open(`https://wa.me/${clean}`, '_blank')
    }
    return (
      <div style={s.modalBackdrop} onClick={() => setSelectedService(null)}>
        <div style={s.modalSheet} onClick={(e) => e.stopPropagation()}>
          <div style={s.modalHeaderImg}>
            {item.cover ? (
              <img src={item.cover} alt="" style={s.modalCoverImg} />
            ) : (
              <div style={{ ...s.modalCoverImg, backgroundColor: rubro.bg }} />
            )}
            <button style={s.modalClose} onClick={() => setSelectedService(null)}>
              <Icon.X />
            </button>
            <div style={s.modalAvatarFloating}>
              {item.photo ? (
                <img src={item.photo} alt="" style={s.modalAvatar} />
              ) : (
                <div style={s.modalAvatarFallback}>{getInitials(item.name)}</div>
              )}
            </div>
          </div>
          <div style={s.modalBody}>
            <div style={{ height: 54 }} />
            <div style={s.servCatWrap}>
              <div style={{ ...s.servCatIconBox, backgroundColor: rubro.bg }}>
                <RubroIcon size={14} color={rubro.color} />
              </div>
              <span style={{ ...s.servCatBig, color: rubro.color }}>
                {rubro.label.toUpperCase()}
              </span>
            </div>
            <div style={s.modalName}>
              {item.name}
              {item.certifications?.length > 0 && (
                <span style={{ marginLeft: 6, display: 'inline-flex' }}>
                  <Icon.VerifiedGold size={16} />
                </span>
              )}
            </div>
            <div style={s.modalRatingRow}>
              <Icon.Star size={14} />
              <span style={s.modalRatingText}>{item.rating}</span>
              <span style={s.reviewsText}>({item.reviews} reseñas)</span>
              <span style={s.dotSep}>·</span>
              <div style={{
                width: 7, height: 7, borderRadius: '50%',
                backgroundColor: item.available ? '#16a34a' : '#bbb'
              }} />
              <span style={{
                fontSize: 12, fontWeight: 600,
                color: item.available ? '#16a34a' : '#999'
              }}>
                {item.available ? 'Disponible' : 'No disponible'}
              </span>
            </div>
            <div style={s.modalStatsRow}>
              <div style={s.modalStat}>
                <div style={s.modalStatNum}>{item.jobsDone}</div>
                <div style={s.modalStatLabel}>trabajos</div>
              </div>
              <div style={s.modalStatDiv} />
              <div style={s.modalStat}>
                <div style={s.modalStatNum}>{item.yearsInHood}</div>
                <div style={s.modalStatLabel}>años en el barrio</div>
              </div>
              <div style={s.modalStatDiv} />
              <div style={s.modalStat}>
                <div style={s.modalStatNum}>{item.reviews}</div>
                <div style={s.modalStatLabel}>reseñas</div>
              </div>
            </div>
            <div style={s.modalSection}>
              <div style={s.modalSectionTitle}>Sobre el servicio</div>
              <div style={s.modalDescription}>{item.description}</div>
            </div>
            {item.certifications?.length > 0 && (
              <div style={s.modalSection}>
                <div style={s.modalSectionTitle}>Certificaciones y garantías</div>
                <div style={s.certList}>
                  {item.certifications.map((c, i) => (
                    <div key={i} style={s.certChip}>
                      <Icon.Check />
                      <span>{c}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div style={s.modalActions}>
              <button style={s.modalReviewsBtn}>Ver reseñas</button>
              <button
                style={{ ...s.modalPrimaryBtn, opacity: item.available ? 1 : 0.5 }}
                onClick={item.available ? openWhatsApp : undefined}
              >
                <Icon.Phone />
                <span>Contactar por WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderAllRubrosModal = () => {
    if (!showAllRubros) return null
    return (
      <div style={s.modalBackdrop} onClick={() => setShowAllRubros(false)}>
        <div style={s.modalSheet} onClick={(e) => e.stopPropagation()}>
          <div style={s.allRubrosHeader}>
            <div style={s.allRubrosTitle}>Todos los servicios</div>
            <button style={s.modalCloseInline} onClick={() => setShowAllRubros(false)}>
              <Icon.X size={20} />
            </button>
          </div>
          <div style={s.allRubrosBody}>
            <div style={s.rubrosGrid}>
              <button
                style={{
                  ...s.rubroGridItem,
                  border: servicioCat === 'todos' ? '2px solid #16a34a' : '1px solid #eee'
                }}
                onClick={() => { setServicioCat('todos'); setShowAllRubros(false) }}
              >
                <div style={{ ...s.rubroGridIcon, backgroundColor: '#f3f4f6' }}>
                  <Icon.Grid size={20} color="#16a34a" />
                </div>
                <span style={s.rubroGridLabel}>Todos</span>
              </button>
              {RUBROS.map(r => {
                const RIcon = r.Icon
                const active = servicioCat === r.key
                return (
                  <button
                    key={r.key}
                    style={{
                      ...s.rubroGridItem,
                      border: active ? `2px solid ${r.color}` : '1px solid #eee'
                    }}
                    onClick={() => { setServicioCat(r.key); setShowAllRubros(false) }}
                  >
                    <div style={{ ...s.rubroGridIcon, backgroundColor: r.bg }}>
                      <RIcon size={22} color={r.color} />
                    </div>
                    <span style={s.rubroGridLabel}>{r.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderReportModal = () => {
    if (!showReportModal) return null
    const canSubmit = reportCat && reportText.trim().length > 0 && !reportSending

    // Pantalla de éxito
    if (reportSent) {
      return (
        <div style={s.modalBackdrop}>
          <div style={s.modalSheet} onClick={(e) => e.stopPropagation()}>
            <div style={s.reportSuccess}>
              <div style={s.reportSuccessIcon}>
                <Icon.VerifiedGreen size={38} />
              </div>
              <div style={s.reportSuccessTitle}>Reporte enviado</div>
              <div style={s.reportSuccessText}>
                Ya está visible para tus vecinos. Cuando otros lo confirmen,
                subirá como alerta del barrio.
              </div>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div style={s.modalBackdrop} onClick={() => setShowReportModal(false)}>
        <div style={s.modalSheet} onClick={(e) => e.stopPropagation()}>
          <div style={s.reportHeader}>
            <div>
              <div style={s.reportTitle}>Reportar incidente</div>
              <div style={s.reportSub}>Ayuda a tu barrio reportando lo que ves</div>
            </div>
            <button style={s.modalCloseInline} onClick={() => setShowReportModal(false)}>
              <Icon.X size={20} />
            </button>
          </div>
          <div style={s.reportBody}>
            <div style={s.reportSectionTitle}>¿Qué tipo de incidente?</div>
            <div style={s.reportCatsGrid}>
              {REPORT_CATS.map(c => {
                const active = reportCat === c.key
                const CIcon = c.Icon
                return (
                  <button
                    key={c.key}
                    onClick={() => setReportCat(c.key)}
                    style={{
                      ...s.reportCatCard,
                      borderColor: active ? c.color : '#eee',
                      backgroundColor: active ? c.bg : '#fff'
                    }}
                  >
                    <div style={{ ...s.reportCatIcon, backgroundColor: active ? '#fff' : c.bg }}>
                      <CIcon size={22} color={c.color} />
                    </div>
                    <div style={{ ...s.reportCatLabel, color: active ? c.color : '#111' }}>
                      {c.label}
                    </div>
                    <div style={s.reportCatDesc}>{c.desc}</div>
                  </button>
                )
              })}
            </div>

            <div style={s.reportSectionTitle}>¿Qué está pasando?</div>
            <textarea
              value={reportText}
              onChange={(e) => setReportText(e.target.value)}
              placeholder="Describe brevemente lo que ves. Mientras más detalle, mejor podremos ayudar."
              style={s.reportTextarea}
              maxLength={500}
            />
            <div style={s.reportCounter}>{reportText.length}/500</div>

            <div style={s.reportSectionTitle}>¿Dónde está pasando?</div>

            {locState === 'ok' ? (
              <div style={s.locOkBox}>
                <Icon.MapPinSm color="#16a34a" />
                <span style={s.locOkText}>Ubicación del incidente capturada</span>
                <button style={s.locClearBtn} onClick={clearLocation}>Quitar</button>
              </div>
            ) : (
              <button
                style={s.locGpsBtn}
                onClick={useCurrentLocation}
                disabled={locState === 'locating'}
              >
                <Icon.MapPinSm color="#16a34a" />
                <span style={s.locGpsText}>
                  {locState === 'locating'
                    ? 'Leyendo tu ubicación...'
                    : 'Estoy aquí, usar mi ubicación actual'}
                </span>
              </button>
            )}

            {(locState === 'denied' || locState === 'error') && (
              <div style={s.locHintErr}>
                No pudimos leer tu ubicación. Escribe la referencia abajo.
              </div>
            )}

            <button
              style={s.locMapToggle}
              onClick={() => setShowMapPicker(!showMapPicker)}
            >
              <Icon.MapPinSm color="#6b7280" />
              <span style={s.locMapToggleText}>
                {showMapPicker ? 'Ocultar el mapa' : 'O marca el punto en el mapa'}
              </span>
            </button>

            {showMapPicker && (
              <div style={{ marginBottom: 10 }}>
                <MiniMap
                  lat={reportLat}
                  lng={reportLng}
                  centerLat={currentProfile?.lat}
                  centerLng={currentProfile?.lng}
                  editable
                  height={190}
                  color="#dc2626"
                  onPick={(la, ln) => {
                    setReportLat(la)
                    setReportLng(ln)
                    setLocState('ok')
                  }}
                />
                <div style={s.mapPickHint}>
                  Toca el mapa donde está pasando. Puedes mover el punto las veces que quieras.
                </div>
              </div>
            )}

            <input
              type="text"
              value={reportLocText}
              onChange={(e) => setReportLocText(e.target.value)}
              placeholder="Ej: Av. Italia con Condell, frente al almacén"
              style={s.locInput}
              maxLength={120}
            />
            <div style={s.locHint}>
              Si no estás en el lugar, marca el punto en el mapa o escribe la referencia.
              Nunca guardamos tu dirección de casa en un reporte.
            </div>

            <div style={s.reportSectionTitle}>Foto (opcional)</div>
            <button style={{ ...s.reportPhotoBtn, opacity: 0.5, cursor: 'not-allowed' }} disabled>
              <Icon.Camera />
              <span style={s.reportPhotoText}>Agregar foto (próximamente)</span>
            </button>

            <div style={s.reportAnonRow}>
              <div>
                <div style={s.reportAnonTitle}>Reportar anónimo</div>
                <div style={s.reportAnonSub}>Tu nombre no será visible para los vecinos</div>
              </div>
              <button
                onClick={() => setReportAnon(!reportAnon)}
                style={{
                  ...s.toggle,
                  backgroundColor: reportAnon ? '#16a34a' : '#ccc'
                }}
              >
                <div style={{
                  ...s.toggleDot,
                  transform: reportAnon ? 'translateX(20px)' : 'translateX(2px)'
                }} />
              </button>
            </div>

            {reportError && (
              <div style={s.reportErrorBox}>
                <Icon.ShieldAlert size={15} color="#991b1b" />
                <span>{reportError}</span>
              </div>
            )}

            <button
              onClick={submitReport}
              disabled={!canSubmit}
              style={{
                ...s.reportSubmitBtn,
                opacity: canSubmit ? 1 : 0.5,
                cursor: canSubmit ? 'pointer' : 'not-allowed'
              }}
            >
              {reportSending ? (
                <span>Enviando...</span>
              ) : (
                <>
                  <Icon.Send />
                  <span>Enviar reporte</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  const renderServiciosEmpty = () => {
    const rubro = servicioCat !== 'todos' ? getRubro(servicioCat) : null
    return (
      <div style={s.emptyServ}>
        <img src="/isotipo.png" alt="" style={s.emptyIso} />
        <div style={s.emptyTitle}>
          Aún no hay {rubro ? rubro.label.toLowerCase() : 'servicios'} en tu barrio
        </div>
        <div style={s.emptySub}>Cuando alguien se sume, aparecerá aquí</div>
      </div>
    )
  }

  const renderContent = () => {
    if (activeTab === 'avisos') {
      const esAdmin = currentProfile?.user_type === 'admin'
      return (
        <>
          {esAdmin && (
            <button style={s.addBtn} onClick={() => setShowAvisoForm(true)}>
              <Icon.Plus />
              <span>Publicar aviso oficial</span>
            </button>
          )}
          {avisos.map(renderAviso)}
          {incidents.map(renderIncidente)}
          {avisos.length === 0 && incidents.length === 0 && (
            <div style={s.emptyBox}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
              <div style={s.emptyTitle}>Sin avisos por ahora</div>
              <div style={s.emptyText}>Cuando haya novedades en el barrio, aparecen acá.</div>
            </div>
          )}
        </>
      )
    }

    if (activeTab === 'eventos') {
      if (eventosVigentes.length === 0) {
        return (
          <div style={s.empty}>
            <div style={{ fontWeight: 700, color: '#111' }}>No hay eventos próximos</div>
            <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>Cuando alguien publique uno, aparecerá aquí</div>
          </div>
        )
      }
      return eventosVigentes.map(renderEvento)
    }

    if (activeTab === 'servicios') {
      const topRubros = TOP_KEYS.map(k => getRubro(k)).filter(Boolean)
      return (
        <>
          <div style={s.subTabRow}>
            <button
              onClick={() => setServicioCat('todos')}
              style={{
                ...s.subTab,
                backgroundColor: servicioCat === 'todos' ? '#16a34a' : '#fff',
                color: servicioCat === 'todos' ? '#fff' : '#555',
                border: servicioCat === 'todos' ? 'none' : '1px solid #e5e5e5'
              }}
            >
              Todos
            </button>
            {topRubros.map(r => {
              const active = servicioCat === r.key
              const RIcon = r.Icon
              return (
                <button
                  key={r.key}
                  onClick={() => setServicioCat(r.key)}
                  style={{
                    ...s.subTab,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    backgroundColor: active ? '#16a34a' : '#fff',
                    color: active ? '#fff' : '#555',
                    border: active ? 'none' : '1px solid #e5e5e5'
                  }}
                >
                  <RIcon size={13} color={active ? '#fff' : r.color} />
                  {r.label}
                </button>
              )
            })}
            <button
              onClick={() => setShowAllRubros(true)}
              style={{
                ...s.subTab,
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                backgroundColor: '#fff',
                color: '#16a34a',
                border: '1px dashed #16a34a'
              }}
            >
              <Icon.Grid size={12} color="#16a34a" />
              Ver todos
            </button>
          </div>
          {serviciosOrdenados.length === 0
            ? renderServiciosEmpty()
            : serviciosOrdenados.map(renderServicio)}
        </>
      )
    }

    if (activeTab === 'comercios') {
      const esAdmin = currentProfile?.user_type === 'admin'

      if (loadingComercios) {
        return <div style={s.loadingBox}>Cargando comercios...</div>
      }

      return (
        <>
          {esAdmin && (
            <button style={s.addBtn} onClick={() => setEditCommerce('nuevo')}>
              <Icon.Plus />
              <span>Agregar un comercio del barrio</span>
            </button>
          )}

          {comercios.length === 0 ? (
            <div style={s.emptyBox}>
              <img src="/isotipo.png" alt="" style={s.emptyLogo} />
              <div style={s.emptyTitle}>Todavía no hay comercios</div>
              <div style={s.emptyText}>
                Los locales del barrio van a aparecer acá.
              </div>
            </div>
          ) : (
            comercios.map(renderComercio)
          )}
        </>
      )
    }

    return null
  }

  return (
    <div style={s.wrap}>
      <div style={s.stickyTop}>
        <div style={s.header}>
          <div style={s.headerLeft}>
            <Icon.Pin />
            <div>
              <div style={s.headerTitle}>Barrio Italia</div>
              <div style={s.headerSub}>Providencia, Santiago</div>
            </div>
          </div>
          <div style={s.headerRight}>
            <button style={s.bellBtn}>
              <Icon.BellBig />
              {notifCount > 0 && <span style={s.notifBadge}>{notifCount}</span>}
            </button>
            <div style={s.headerAvatar}>
              {currentProfile?.avatar_url ? (
                <img src={currentProfile.avatar_url} alt="" style={s.headerAvatarImg} />
              ) : currentProfile?.full_name ? (
                <div style={s.headerAvatarFallback}>{getInitials(currentProfile.full_name)}</div>
              ) : (
                <img src="/isotipo.png" alt="" style={{ width: 22, opacity: 0.6 }} />
              )}
            </div>
          </div>
        </div>
        {renderAlertBanner()}
        <div style={s.tabRow}>
          {tabs.map(t => {
            const active = activeTab === t.id
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                style={{
                  ...s.tab,
                  borderBottomColor: active ? '#16a34a' : 'transparent',
                  color: active ? '#16a34a' : '#666'
                }}
              >
                <t.Icon color={active ? '#16a34a' : '#666'} />
                <span>{t.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div style={s.scrollArea}>
        {renderContent()}
        <div style={{ height: 140 }} />
      </div>

      {renderServiceModal()}
      {renderAllRubrosModal()}
      {renderReportModal()}

      {renderCommerceModal()}

      {editCommerce && (
        <CommerceForm
          commerce={editCommerce === 'nuevo' ? null : editCommerce}
          neighborhoodId={currentProfile?.neighborhood_id}
          onClose={() => setEditCommerce(null)}
          onSaved={fetchComercios}
        />
      )}

      {showAvisoForm && (
        <AvisoForm
          onClose={() => setShowAvisoForm(false)}
          onPublicar={publicarAviso}
        />
      )}

      {editPromo && (
        <PromoForm
          promo={editPromo.promo}
          commerce={editPromo.commerce}
          neighborhoodId={currentProfile?.neighborhood_id}
          onClose={() => setEditPromo(null)}
          onSaved={fetchPromos}
        />
      )}
    </div>
  )
}

const s = {
  wrap: { width: '100%', height: '100%', backgroundColor: '#f4f7f4', fontFamily: 'system-ui, -apple-system, sans-serif', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' },
  stickyTop: { flexShrink: 0, backgroundColor: '#fff', zIndex: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '52px 18px 14px' },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  headerTitle: { fontSize: 17, fontWeight: 800, color: '#111' },
  headerSub: { fontSize: 11.5, color: '#888', fontWeight: 500, marginTop: 1 },
  headerRight: { display: 'flex', alignItems: 'center', gap: 10 },
  bellBtn: { width: 40, height: 40, borderRadius: '50%', backgroundColor: '#f3f4f6', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  notifBadge: { position: 'absolute', top: 4, right: 4, minWidth: 16, height: 16, borderRadius: '50%', backgroundColor: '#dc2626', color: '#fff', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff' },
  headerAvatar: { width: 40, height: 40, borderRadius: '50%', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  headerAvatarImg: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  headerAvatarFallback: { width: '100%', height: '100%', borderRadius: '50%', backgroundColor: '#16a34a', color: '#fff', fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' },

  alertBanner: { margin: '0 18px 12px', padding: '12px 14px', borderRadius: 14, backgroundColor: '#fef2f2', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  alertBannerLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  alertShield: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  alertBannerTitle: { fontSize: 13, fontWeight: 800, color: '#dc2626' },
  alertBannerSub: { fontSize: 11, color: '#7a7a7a', marginTop: 2 },
  reportBtn: { display: 'flex', alignItems: 'center', gap: 5, padding: '8px 12px', backgroundColor: '#fff', border: '1.5px solid #fecaca', borderRadius: 10, cursor: 'pointer', flexShrink: 0 },
  reportBtnText: { fontSize: 11.5, fontWeight: 700, color: '#dc2626' },

  tabRow: { display: 'flex', borderBottom: '1px solid #eee', padding: '0 12px' },
  tab: { flex: 1, padding: '12px 4px', fontSize: 12.5, fontWeight: 600, background: 'none', border: 'none', borderBottom: '2.5px solid transparent', cursor: 'pointer', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 },

  subTabRow: { display: 'flex', gap: 8, overflowX: 'auto', padding: '14px 2px 4px', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' },
  subTab: { padding: '7px 14px', borderRadius: 22, fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', cursor: 'pointer', flexShrink: 0 },

  scrollArea: { flex: 1, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', padding: '0 18px' },

  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginTop: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', cursor: 'pointer' },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  typeBadge: { fontSize: 9.5, fontWeight: 800, padding: '3px 8px', borderRadius: 6, letterSpacing: 0.4 },
  timeText: { fontSize: 11, color: '#999', fontWeight: 500 },
  cardTitle: { fontSize: 15, fontWeight: 700, color: '#111', lineHeight: 1.35, marginBottom: 4 },
  cardDesc: { fontSize: 12.5, color: '#555', lineHeight: 1.5, marginBottom: 8 },
  durationRow: { display: 'flex', alignItems: 'center', gap: 5, marginBottom: 10 },
  durationText: { fontSize: 11.5, fontWeight: 600, color: '#555' },
  cardDivider: { height: 1, backgroundColor: 'rgba(0,0,0,0.06)', marginBottom: 10 },
  cardBottom: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  authorRow: { display: 'flex', alignItems: 'center', gap: 7 },
  authorAvatar: { width: 24, height: 24, borderRadius: '50%', color: '#fff', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  authorName: { fontSize: 12, fontWeight: 700, color: '#111' },
  rightMeta: { display: 'flex', alignItems: 'center', gap: 8 },
  affectedPill: { display: 'flex', alignItems: 'center', gap: 4, backgroundColor: '#f3f4f6', padding: '3px 8px', borderRadius: 8 },
  affectedText: { fontSize: 11, fontWeight: 600, color: '#666' },

  eventoImgWrap: { position: 'relative', width: '100%', aspectRatio: '16/9', borderRadius: 12, overflow: 'hidden', backgroundColor: '#f0f0f0' },
  eventoImg: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  eventoDateFloat: { position: 'absolute', top: 12, left: 12, backgroundColor: '#fff', borderRadius: 10, padding: '6px 10px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.18)', minWidth: 44 },
  dateWeek: { fontSize: 8.5, fontWeight: 800, color: '#dc2626', letterSpacing: 0.4 },
  dateDay: { fontSize: 18, fontWeight: 800, color: '#111', lineHeight: 1 },
  dateMonth: { fontSize: 8.5, fontWeight: 800, color: '#999', letterSpacing: 0.4, marginTop: 2 },
  freeFloat: { position: 'absolute', top: 12, right: 12, fontSize: 10, fontWeight: 800, color: '#fff', backgroundColor: '#8b5cf6', padding: '5px 9px', borderRadius: 6, letterSpacing: 0.4 },
  eventoMeta: { display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8, flexWrap: 'wrap' },
  metaText: { fontSize: 11.5, color: '#888' },
  dotSep: { color: '#ccc', fontSize: 11 },
  eventoBottom: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  attendeePill: { display: 'flex', alignItems: 'center', gap: 4, backgroundColor: '#dcfce7', padding: '4px 9px', borderRadius: 8 },
  attendeeText: { fontSize: 11, fontWeight: 700, color: '#16a34a' },
  joinBtnInline: { padding: '8px 18px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: 10, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' },

  servCover: { position: 'relative', width: '100%', aspectRatio: '3/1', borderRadius: 12, overflow: 'hidden', backgroundColor: '#f0f0f0' },
  servCoverImg: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  sponsoredFloat: { position: 'absolute', top: 10, left: 10, fontSize: 9.5, fontWeight: 800, color: '#d97706', backgroundColor: 'rgba(255,255,255,0.95)', padding: '3px 8px', borderRadius: 6, letterSpacing: 0.5 },
  sponsoredBadgeInline: { fontSize: 8.5, fontWeight: 800, color: '#d97706', backgroundColor: '#fef3c7', padding: '2px 6px', borderRadius: 4, letterSpacing: 0.4 },
  servPhoto: { width: 60, height: 60, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 },
  servPhotoFallback: { width: 60, height: 60, borderRadius: '50%', backgroundColor: '#16a34a', color: '#fff', fontSize: 16, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  servTopRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3, gap: 8 },
  servCatWrap: { display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1 },
  servCatIconBox: { width: 22, height: 22, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  servCatBig: { fontSize: 11.5, fontWeight: 800, letterSpacing: 0.6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  servRating: { display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 },
  servNameRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 },
  servName: { fontSize: 15.5, fontWeight: 700, color: '#111' },
  servStatusRow: { display: 'flex', alignItems: 'center', gap: 6 },
  ratingText: { fontSize: 12, fontWeight: 700, color: '#111' },
  reviewsText: { fontSize: 11, color: '#999' },

  comercioImgWrap: { position: 'relative', width: '100%', aspectRatio: '16/9', borderRadius: 12, overflow: 'hidden', backgroundColor: '#f0f0f0' },
  comercioImg: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  openChip: { position: 'absolute', bottom: 12, left: 12, color: '#fff', fontSize: 10.5, fontWeight: 700, padding: '6px 11px', borderRadius: 999, backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', zIndex: 2 },
  comercioTitleRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 },
  comercioCat: { fontSize: 11.5, color: '#888', fontWeight: 500, marginTop: 2 },
  comercioMetaRow: { display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap', marginBottom: 6 },
  benefitCard: { marginTop: 10, padding: '10px 14px', backgroundColor: '#dcfce7', borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 2 },
  benefitLabel: { fontSize: 10, fontWeight: 800, color: '#16a34a', letterSpacing: 0.4 },
  benefitText: { fontSize: 12.5, fontWeight: 600, color: '#111' },

  empty: { marginTop: 40, padding: 30, backgroundColor: '#fff', borderRadius: 16, textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
  emptyServ: { marginTop: 30, padding: '40px 30px', backgroundColor: '#fff', borderRadius: 16, textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 },
  emptyIso: { width: 64, height: 64, opacity: 0.4 },
  emptyTitle: { fontSize: 14, fontWeight: 700, color: '#111' },
  emptySub: { fontSize: 12, color: '#888' },

  // ===== MODALES =====
  modalBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'flex-end' },
  modalSheet: { width: '100%', maxHeight: '92%', backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  modalHeaderImg: { position: 'relative', width: '100%', height: 140, backgroundColor: '#f0f0f0', flexShrink: 0, borderTopLeftRadius: 22, borderTopRightRadius: 22, overflow: 'visible' },
  modalCoverImg: { width: '100%', height: '100%', objectFit: 'cover', display: 'block', borderTopLeftRadius: 22, borderTopRightRadius: 22 },
  modalClose: { position: 'absolute', top: 14, right: 14, width: 34, height: 34, borderRadius: '50%', backgroundColor: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.2)', zIndex: 3 },
  modalAvatarFloating: { position: 'absolute', left: 22, bottom: -44, zIndex: 2 },
  modalAvatar: { width: 88, height: 88, borderRadius: '50%', objectFit: 'cover', border: '4px solid #fff', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', display: 'block' },
  modalAvatarFallback: { width: 88, height: 88, borderRadius: '50%', backgroundColor: '#16a34a', color: '#fff', fontSize: 26, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '4px solid #fff', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' },
  modalBody: { padding: '0 22px 28px', overflowY: 'auto', flex: 1, minHeight: 0 },
  modalName: { fontSize: 22, fontWeight: 800, color: '#111', marginTop: 6, marginBottom: 8, display: 'flex', alignItems: 'center' },
  modalRatingRow: { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 16 },
  modalRatingText: { fontSize: 13, fontWeight: 700, color: '#111' },
  modalStatsRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '14px 8px', backgroundColor: '#f9fafb', borderRadius: 14, marginBottom: 18 },
  modalStat: { flex: 1, textAlign: 'center' },
  modalStatNum: { fontSize: 18, fontWeight: 800, color: '#111' },
  modalStatLabel: { fontSize: 10.5, color: '#888', marginTop: 2, fontWeight: 600 },
  modalStatDiv: { width: 1, height: 30, backgroundColor: '#e5e5e5' },
  modalSection: { marginBottom: 18 },
  modalSectionTitle: { fontSize: 12, fontWeight: 800, color: '#666', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 8 },
  modalDescription: { fontSize: 13.5, color: '#333', lineHeight: 1.55 },
  certList: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  certChip: { display: 'flex', alignItems: 'center', gap: 5, backgroundColor: '#dcfce7', padding: '6px 10px', borderRadius: 8, fontSize: 11.5, fontWeight: 600, color: '#166534' },
  modalActions: { display: 'flex', gap: 10, marginTop: 10 },
  modalReviewsBtn: { flex: 1, padding: 14, backgroundColor: '#f3f4f6', color: '#111', border: 'none', borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  modalPrimaryBtn: { flex: 2, padding: 14, backgroundColor: '#25D366', color: '#fff', border: 'none', borderRadius: 12, fontSize: 13.5, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 },

  allRubrosHeader: { padding: '20px 22px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #eee', flexShrink: 0 },
  allRubrosTitle: { fontSize: 17, fontWeight: 800, color: '#111' },
  modalCloseInline: { width: 34, height: 34, borderRadius: '50%', backgroundColor: '#f3f4f6', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  allRubrosBody: { padding: '18px 18px 28px', overflowY: 'auto', flex: 1, minHeight: 0 },
  rubrosGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  rubroGridItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '16px 10px', backgroundColor: '#fff', borderRadius: 14, cursor: 'pointer', textAlign: 'center' },
  rubroGridIcon: { width: 48, height: 48, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  rubroGridLabel: { fontSize: 12, fontWeight: 700, color: '#333', lineHeight: 1.3 },

  // ===== MODAL REPORTAR =====
  reportHeader: { padding: '20px 22px 14px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, borderBottom: '1px solid #eee', flexShrink: 0 },
  reportTitle: { fontSize: 17, fontWeight: 800, color: '#111' },
  reportSub: { fontSize: 12, color: '#888', marginTop: 3, fontWeight: 500 },
  reportBody: { padding: '18px 22px 28px', overflowY: 'auto', flex: 1, minHeight: 0 },
  reportSectionTitle: { fontSize: 12, fontWeight: 800, color: '#666', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 10, marginTop: 4 },
  reportCatsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 22 },
  reportCatCard: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, padding: 14, borderRadius: 14, border: '2px solid #eee', backgroundColor: '#fff', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' },
  reportCatIcon: { width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  reportCatLabel: { fontSize: 14, fontWeight: 800 },
  reportCatDesc: { fontSize: 10.5, color: '#888', lineHeight: 1.3 },
  reportTextarea: { width: '100%', minHeight: 100, padding: 12, borderRadius: 12, border: '1.5px solid #e5e5e5', fontSize: 13.5, fontFamily: 'inherit', resize: 'vertical', outline: 'none', boxSizing: 'border-box' },
  reportCounter: { fontSize: 10.5, color: '#aaa', textAlign: 'right', marginTop: 4, marginBottom: 22, fontWeight: 600 },
  reportLocationBox: { display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', backgroundColor: '#f9fafb', borderRadius: 12, marginBottom: 22 },
  reportLocationText: { fontSize: 13, fontWeight: 700, color: '#111', flex: 1 },
  reportLocationHint: { fontSize: 10.5, color: '#888', fontWeight: 600 },
  reportPhotoBtn: { width: '100%', padding: '14px', backgroundColor: '#fff', border: '1.5px dashed #ccc', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', marginBottom: 22 },
  reportPhotoText: { fontSize: 13, fontWeight: 600, color: '#666' },
  locGpsBtn: { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px 14px', backgroundColor: '#fff', border: '2px dashed #16a34a', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 10 },
  locGpsText: { fontSize: 13, fontWeight: 700, color: '#16a34a' },
  locOkBox: { display: 'flex', alignItems: 'center', gap: 8, padding: '13px 14px', backgroundColor: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 12, marginBottom: 10 },
  locOkText: { flex: 1, fontSize: 13, fontWeight: 700, color: '#0f5f36' },
  locClearBtn: { fontSize: 11.5, fontWeight: 700, color: '#6b7280', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 999, padding: '5px 11px', cursor: 'pointer', fontFamily: 'inherit' },
  locHintErr: { fontSize: 11.5, color: '#dc2626', fontWeight: 600, marginBottom: 10, lineHeight: 1.4 },
  locInput: { width: '100%', padding: '13px 14px', fontSize: 14, backgroundColor: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 12, color: '#111', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' },
  locHint: { fontSize: 11, color: '#9ca3af', lineHeight: 1.45, marginTop: 7, marginBottom: 18 },
  locMapToggle: { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '11px', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 10 },
  locMapToggleText: { fontSize: 12.5, fontWeight: 700, color: '#6b7280' },
  mapPickHint: { fontSize: 11, color: '#9ca3af', lineHeight: 1.45, marginTop: 7 },
  mapToggleBtn: { marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: '#16a34a', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0, flexShrink: 0 },
  incidentLocRow: { display: 'flex', alignItems: 'center', gap: 5, marginTop: 9 },
  incidentLocText: { fontSize: 11.5, color: '#6b7280', fontWeight: 500 },

  confirmedTag: { display: 'flex', alignItems: 'center', gap: 5, marginTop: 10, padding: '5px 10px', backgroundColor: '#dcfce7', borderRadius: 999, alignSelf: 'flex-start', width: 'fit-content' },
  confirmedTagText: { fontSize: 11, fontWeight: 700, color: '#16a34a' },
  vecinoTag: { fontSize: 10.5, color: '#9ca3af', fontWeight: 600, marginTop: 1 },
  comCard: { display: 'flex', alignItems: 'center', gap: 12, padding: 12, backgroundColor: '#fff', borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', marginBottom: 10, cursor: 'pointer', position: 'relative' },
  comThumbWrap: { position: 'relative', width: 62, height: 62, borderRadius: 12, overflow: 'hidden', flexShrink: 0, backgroundColor: '#eef0ee' },
  comThumb: { width: '100%', height: '100%', objectFit: 'cover' },
  comThumbEmpty: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  comPremiumDot: { position: 'absolute', top: 4, right: 4, width: 8, height: 8, borderRadius: '50%', backgroundColor: '#d97706', border: '1.5px solid #fff' },
  comInfo: { flex: 1, minWidth: 0 },
  comNameRow: { display: 'flex', alignItems: 'center', gap: 5 },
  comName: { fontSize: 14.5, fontWeight: 800, color: '#111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  comCats: { fontSize: 11.5, color: '#9ca3af', fontWeight: 600, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  comStatusRow: { display: 'flex', alignItems: 'center', gap: 5, marginTop: 5 },
  comDot: { width: 6, height: 6, borderRadius: '50%', flexShrink: 0 },
  comStatusText: { fontSize: 11.5, fontWeight: 700 },
  comPromoRow: { display: 'flex', alignItems: 'center', gap: 5, marginTop: 7, color: '#ea580c' },
  comPromoText: { fontSize: 11.5, fontWeight: 800, color: '#c2410c', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  comBenefitRow: { display: 'flex', alignItems: 'center', gap: 7, marginTop: 7, padding: '7px 9px', backgroundColor: '#f0fdf4', borderRadius: 9, border: '1px solid #dcfce7' },
  comBenefitLabel: { fontSize: 8.5, fontWeight: 900, letterSpacing: 0.5, color: '#fff', backgroundColor: '#16a34a', padding: '3px 6px', borderRadius: 5, flexShrink: 0 },
  comBenefitText: { fontSize: 11.5, fontWeight: 700, color: '#0f5f36', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },

  comLogoFloat: { position: 'absolute', bottom: -32, left: 20, width: 68, height: 68, borderRadius: 18, overflow: 'hidden', border: '4px solid #fff', backgroundColor: '#dcfce7', boxShadow: '0 4px 14px rgba(0,0,0,0.12)', zIndex: 3 },
  comLogoImg: { width: '100%', height: '100%', objectFit: 'cover' },
  comLogoFallback: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, color: '#16a34a' },

  benefitBig: { display: 'flex', alignItems: 'flex-start', gap: 13, padding: '16px 15px', marginTop: 20, background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', border: '1.5px solid #86efac', borderRadius: 16 },
  benefitBigIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  benefitBigLabel: { fontSize: 10, fontWeight: 900, letterSpacing: 0.6, color: '#16a34a', textTransform: 'uppercase' },
  benefitBigText: { fontSize: 17, fontWeight: 800, color: '#0f5f36', marginTop: 3, lineHeight: 1.3 },
  benefitBigSub: { fontSize: 11.5, color: '#16a34a', marginTop: 5, lineHeight: 1.45, fontWeight: 500 },
  comEditBtn: { width: 30, height: 30, borderRadius: '50%', backgroundColor: '#f4f7f4', color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', flexShrink: 0 },

  modalStatusRow: { display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 },
  horarioList: { display: 'flex', flexDirection: 'column', gap: 7 },
  horarioRow: { display: 'flex', justifyContent: 'space-between', fontSize: 13 },

  promoCard: { display: 'flex', alignItems: 'center', gap: 11, padding: 11, backgroundColor: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 13, marginBottom: 8 },
  promoImg: { width: 52, height: 52, borderRadius: 10, objectFit: 'cover', flexShrink: 0 },
  promoTitle: { fontSize: 13.5, fontWeight: 800, color: '#9a3412' },
  promoDesc: { fontSize: 11.5, color: '#c2410c', marginTop: 2, lineHeight: 1.4 },
  promoTime: { fontSize: 10.5, fontWeight: 700, color: '#ea580c', marginTop: 4 },
  promoEdit: { width: 28, height: 28, borderRadius: '50%', backgroundColor: '#fff', color: '#c2410c', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #fed7aa', cursor: 'pointer', flexShrink: 0 },
  addPromoBtn: { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '12px', marginTop: 12, background: '#fff', border: '2px dashed #ea580c', borderRadius: 12, color: '#ea580c', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },

  avisoBorrar: {
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: 14, padding: '2px 6px', borderRadius: 6,
    color: '#dc2626',
  },
  addBtn: { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px', marginBottom: 14, background: '#fff', border: '2px dashed #16a34a', borderRadius: 14, color: '#16a34a', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },
  premiumChip: { position: 'absolute', top: 10, left: 10, backgroundColor: 'rgba(217,119,6,0.95)', color: '#fff', fontSize: 9.5, fontWeight: 800, letterSpacing: 0.4, padding: '5px 9px', borderRadius: 999, zIndex: 2 },
  comercioNoImg: { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: '#eef0ee' },
  comercioNoImgText: { fontSize: 11, fontWeight: 600, color: '#c7cdc7' },
  comercioRating: { display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0, marginLeft: 8 },
  editFloat: { position: 'absolute', top: 10, right: 10, width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.95)', color: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.15)' },
  comercioDesc: { fontSize: 13, color: '#6b7280', lineHeight: 1.5, marginTop: 6, marginBottom: 2 },
  waBtn: { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px', marginTop: 12, background: '#25D366', color: '#fff', border: 'none', borderRadius: 12, fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },
  loadingBox: { padding: '40px 20px', textAlign: 'center', color: '#9ca3af', fontSize: 13.5, fontWeight: 600 },
  emptyBox: { padding: '50px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  emptyLogo: { width: 80, height: 80, opacity: 0.45, marginBottom: 14 },
  emptyTitle: { fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 5 },
  emptyText: { fontSize: 13, color: '#9ca3af', lineHeight: 1.5 },

  iconAccion: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', color: '#9ca3af', flexShrink: 0 },
  lockedTag: { fontSize: 10, fontWeight: 700, color: '#9ca3af', backgroundColor: '#f3f4f6', padding: '4px 8px', borderRadius: 999, whiteSpace: 'nowrap' },
  editBox: { marginTop: 4 },
  editArea: { width: '100%', minHeight: 70, padding: '11px 13px', fontSize: 13.5, border: '1.5px solid #16a34a', borderRadius: 12, fontFamily: 'inherit', outline: 'none', resize: 'vertical', boxSizing: 'border-box', color: '#111' },
  editActions: { display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 },
  editCancel: { padding: '8px 14px', borderRadius: 999, border: '1px solid #e5e7eb', backgroundColor: '#fff', color: '#6b7280', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },
  editSave: { padding: '8px 16px', borderRadius: 999, border: 'none', backgroundColor: '#16a34a', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },
  deleteBox: { marginTop: 12, padding: 13, backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12 },
  deleteText: { fontSize: 12.5, fontWeight: 600, color: '#991b1b', lineHeight: 1.45 },
  deleteConfirm: { padding: '8px 16px', borderRadius: 999, border: 'none', backgroundColor: '#dc2626', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },

  cardTopRight: { display: 'flex', alignItems: 'center', gap: 8 },
  expiraText: { fontSize: 10.5, fontWeight: 700, color: '#9ca3af', backgroundColor: '#f3f4f6', padding: '3px 8px', borderRadius: 999 },
  accionesRow: { display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 },
  flagBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, background: 'transparent', border: 'none', padding: 0, flexShrink: 0 },
  resolveBtn: { padding: '8px 13px', borderRadius: 999, border: '1.5px solid #16a34a', backgroundColor: '#fff', color: '#16a34a', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 },
  miReporteTag: { fontSize: 11, fontWeight: 700, color: '#9ca3af', padding: '7px 12px', backgroundColor: '#f3f4f6', borderRadius: 999 },
  confirmBtn: { display: 'flex', alignItems: 'center', gap: 5, padding: '8px 12px', borderRadius: 999, border: '1.5px solid #e5e7eb', fontSize: 11.5, fontWeight: 700, fontFamily: 'inherit', flexShrink: 0 },
  confirmCount: { fontSize: 10.5, fontWeight: 800, backgroundColor: 'rgba(0,0,0,0.06)', padding: '2px 6px', borderRadius: 999, marginLeft: 2 },
  reportErrorBox: { display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: 12, fontSize: 13, fontWeight: 600, marginBottom: 12 },
  reportSuccess: { padding: '48px 32px 44px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 10 },
  reportSuccessIcon: { width: 82, height: 82, borderRadius: '50%', backgroundColor: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  reportSuccessTitle: { fontSize: 20, fontWeight: 800, color: '#111' },
  reportSuccessText: { fontSize: 13, color: '#6b7280', lineHeight: 1.55 },

  reportAnonRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px', backgroundColor: '#f9fafb', borderRadius: 12, marginBottom: 22 },
  reportAnonTitle: { fontSize: 13, fontWeight: 700, color: '#111' },
  reportAnonSub: { fontSize: 11, color: '#888', marginTop: 2 },
  toggle: { width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', position: 'relative', transition: 'background-color 0.2s', flexShrink: 0, padding: 0 },
  toggleDot: { position: 'absolute', top: 2, width: 20, height: 20, borderRadius: '50%', backgroundColor: '#fff', transition: 'transform 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' },
  reportSubmitBtn: { width: '100%', padding: 15, backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }
}

export default Barrio