/*
  design.js — EL SISTEMA DE DISEÑO DE EL BARRIO

  Regla de oro: esto lo usa la vecina de 65 años que escribe "por el guasap".
  No un diseñador. No un dev.

  · EMOJIS SÍ. Se reconocen al instante. Un SVG lineal gris, no.
  · TEXTO GRANDE. Mínimo 13px. Nada de 10-11px.
  · POCAS COSAS POR TARJETA. Máximo 4-5 elementos.
  · CÁLIDO, NO MINIMALISTA.

  Cualquier pantalla nueva importa de acá. No inventar colores ni tamaños.
*/

// ─────────────────────────────────────────────
// COLORES
// ─────────────────────────────────────────────
export const C = {
  // Verdes de El Barrio
  verde:       '#16a34a',
  verdeOsc:    '#0f5f36',
  verdeSuave:  '#dcfce7',
  verdeBg:     '#f0fdf4',

  // Fondo y superficies
  fondo:       '#f4f7f4',   // nuestro verde muy suave
  card:        '#ffffff',
  borde:       '#e8ede8',
  bordeSuave:  '#f1f5f1',

  // Texto
  texto:       '#16211a',
  textoSuave:  '#5f6b62',
  textoTenue:  '#98a49b',

  // Alertas y estados
  rojo:        '#dc2626',
  rojoSuave:   '#fee2e2',
  rojoBg:      '#fef2f2',

  naranjo:     '#ea580c',
  naranjoSuave:'#ffedd5',

  dorado:      '#d97706',
  doradoSuave: '#fef3c7',

  azul:        '#0369a1',
  azulSuave:   '#e0f2fe',

  morado:      '#7c3aed',
  moradoSuave: '#f3e8ff',

  whatsapp:    '#25D366',

  // Tira del clima / farmacia — verde MUY pálido, casi imperceptible
  tira:        '#f6fbf7',
  tiraBorde:   '#e4f0e8',
}

// ─────────────────────────────────────────────
// TIPOGRAFÍA — nada baja de 13px
// ─────────────────────────────────────────────
export const T = {
  font: 'system-ui, -apple-system, "Segoe UI", sans-serif',

  saludo:   { fontSize: 22, fontWeight: 800, color: C.texto, letterSpacing: '-0.3px' },
  titulo:   { fontSize: 18, fontWeight: 800, color: C.texto, letterSpacing: '-0.2px' },
  seccion:  { fontSize: 17, fontWeight: 800, color: C.texto },
  cardTit:  { fontSize: 16, fontWeight: 700, color: C.texto, lineHeight: 1.35 },
  cuerpo:   { fontSize: 14.5, color: C.textoSuave, lineHeight: 1.55 },
  meta:     { fontSize: 13, color: C.textoTenue, fontWeight: 600 },
  chip:     { fontSize: 13, fontWeight: 700 },
  boton:    { fontSize: 15.5, fontWeight: 700 },
}

// ─────────────────────────────────────────────
// ESPACIOS Y FORMAS
// ─────────────────────────────────────────────
export const S = {
  card: {
    background: C.card,
    borderRadius: 18,
    padding: 16,
    border: `1px solid ${C.borde}`,
    boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
  },
  cardTap: {                       // tarjeta que se puede tocar
    background: C.card,
    borderRadius: 18,
    padding: 16,
    border: `1px solid ${C.borde}`,
    boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
    cursor: 'pointer',
  },
  gap:     14,
  pantalla:{ padding: '0 16px 110px' },
  radio:   18,
  radioSm: 12,
}

// ─────────────────────────────────────────────
// EMOJIS — el lenguaje visual real de la app
// ─────────────────────────────────────────────

/* Tipos de publicación (el menú del botón +) */
export const TIPOS = {
  sell:    { emoji: '🏷️', label: 'Vender algo',  corto: 'En venta',    color: C.naranjo, bg: C.naranjoSuave },
  gift:    { emoji: '🎁', label: 'Regalar',      corto: 'Gratis',      color: C.morado,  bg: C.moradoSuave },
  trade:   { emoji: '🔄', label: 'Trueque',      corto: 'Trueque',     color: C.azul,    bg: C.azulSuave },
  alert:   { emoji: '🚨', label: 'Alerta',       corto: 'Alerta',      color: C.rojo,    bg: C.rojoSuave },
  event:   { emoji: '📅', label: 'Evento',       corto: 'Evento',      color: C.verde,   bg: C.verdeSuave },
  general: { emoji: '📢', label: 'Publicar',     corto: 'Publicación', color: C.verde,   bg: C.verdeSuave },
  request: { emoji: '🙋', label: 'Pedir ayuda',  corto: 'Pedido',      color: C.dorado,  bg: C.doradoSuave },
}

/* Categorías de un reporte de vecino */
export const REPORTES = {
  seguridad: { emoji: '🚨', label: 'Seguridad',      color: C.rojo,    bg: C.rojoSuave },
  salud:     { emoji: '🏥', label: 'Salud',          color: C.verde,   bg: C.verdeSuave },
  infra:     { emoji: '🔧', label: 'Infraestructura',color: C.naranjo, bg: C.naranjoSuave },
  mascotas:  { emoji: '🐕', label: 'Mascotas',       color: '#db2777', bg: '#fce7f3' },
}

/* Avisos oficiales (los carga el operador) */
export const AVISOS = {
  corte_agua: { emoji: '💧', label: 'Corte de agua', color: C.azul,   bg: C.azulSuave },
  corte_luz:  { emoji: '💡', label: 'Corte de luz',  color: C.dorado, bg: C.doradoSuave },
  jjvv:       { emoji: '🏛️', label: 'Aviso JJVV',    color: C.verde,  bg: C.verdeSuave },
  municipal:  { emoji: '🏛️', label: 'Municipal',     color: C.dorado, bg: C.doradoSuave },
  operativo:  { emoji: '🩺', label: 'Operativo',     color: C.morado, bg: C.moradoSuave },
}

/* Accesos rápidos del Inicio */
export const ACCESOS = [
  { id: 'mercado',   emoji: '🏷️', label: 'Mercado',   bg: C.naranjoSuave },
  { id: 'servicios', emoji: '🔧', label: 'Servicios', bg: C.azulSuave },
  { id: 'eventos',   emoji: '📅', label: 'Eventos',   bg: C.moradoSuave },
  { id: 'comercios', emoji: '🏪', label: 'Comercios', bg: C.verdeSuave },
]

/* Categorías del Mercado */
export const CATEGORIAS = [
  { key: 'Electrónica', emoji: '📱' },
  { key: 'Ropa',        emoji: '👕' },
  { key: 'Hogar',       emoji: '🏠' },
  { key: 'Deportes',    emoji: '⚽' },
  { key: 'Libros',      emoji: '📚' },
  { key: 'Juguetes',    emoji: '🧸' },
  { key: 'Muebles',     emoji: '🪑' },
  { key: 'Bicicletas',  emoji: '🚲' },
  { key: 'Mascotas',    emoji: '🐾' },
  { key: 'Herramientas',emoji: '🔨' },
  { key: 'Otros',       emoji: '📦' },
]

/* Rubros de servicios */
export const RUBROS = [
  { key: 'gasfiter',    emoji: '🔧', label: 'Gasfitería' },
  { key: 'electrico',   emoji: '💡', label: 'Electricidad' },
  { key: 'cerrajero',   emoji: '🔑', label: 'Cerrajería' },
  { key: 'pintor',      emoji: '🎨', label: 'Pintura' },
  { key: 'carpintero',  emoji: '🪚', label: 'Carpintería' },
  { key: 'maestro',     emoji: '🧱', label: 'Maestro' },
  { key: 'aseo',        emoji: '🧹', label: 'Limpieza' },
  { key: 'jardinero',   emoji: '🌱', label: 'Jardinería' },
  { key: 'peluqueria',  emoji: '💇', label: 'Peluquería' },
  { key: 'mascotas',    emoji: '🐕', label: 'Mascotas' },
  { key: 'ninera',      emoji: '👶', label: 'Niñera' },
  { key: 'adulto_mayor',emoji: '👵', label: 'Adulto mayor' },
  { key: 'fletes',      emoji: '🚚', label: 'Fletes' },
  { key: 'clases',      emoji: '📖', label: 'Clases' },
  { key: 'internet',    emoji: '📶', label: 'Internet y redes' },
  { key: 'aire',        emoji: '❄️', label: 'Aire acondicionado' },
  { key: 'fumigacion',  emoji: '🐜', label: 'Fumigación' },
  { key: 'otro',        emoji: '🛠️', label: 'Otro' },
]

/* Badges del perfil */
export const BADGES = {
  founder:     { emoji: '⭐', label: 'Fundador',    sub: 'Primeros 70', color: C.dorado,  bg: C.doradoSuave },
  trusted:     { emoji: '✅', label: 'Confiable',   sub: 'Verificado',  color: C.verde,   bg: C.verdeSuave },
  collaborator:{ emoji: '🤝', label: 'Colaborador', sub: 'Activo',      color: C.azul,    bg: C.azulSuave },
}

// ─────────────────────────────────────────────
// FARMACIAS DE TURNO
//
// Por ahora se cargan a mano. La API del MINSAL existe, pero el navegador
// la bloquea (CORS) y obliga a una Edge Function. No vale la pena todavía.
//
// 👉 PARA CAMBIARLAS: edita esta lista y guarda. Nada más.
// Cuando haya varios barrios, esto se muda a la base de datos.
// ─────────────────────────────────────────────
export const FARMACIAS = [
  {
    nombre: 'Farmacias Ahumada',
    direccion: 'Av. Cristóbal Colón 5090',
    comuna: 'Las Condes',
    horario: 'Hasta 22:00',
    telefono: '',
  },
  {
    nombre: 'Farmacia Cruz Verde',
    direccion: 'Manquehue Sur 6071',
    comuna: 'Las Condes',
    horario: 'Hasta 22:00',
    telefono: '',
  },
]

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
export const iniciales = (nombre) =>
  (nombre || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase() || '?'

// lib/design.js  —  reemplaza tu export `hace` por este completo.
// NUNCA dice "hace recien" ni "en Xh". Siempre "hace X seg/min/h/d/...".

export function hace(fecha) {
  if (!fecha) return ''
  const f = fecha instanceof Date ? fecha : new Date(fecha)
  if (isNaN(f.getTime())) return ''

  // Si la fecha es futura (raro en alertas), la clampeamos a "recién".
  const diff = Date.now() - f.getTime()
  const abs = Math.max(0, diff)            // nunca negativo
  const seg = Math.max(1, Math.floor(abs / 1000))
  const min = Math.floor(seg / 60)
  const hor = Math.floor(min / 60)
  const dia = Math.floor(hor / 24)
  const sem = Math.floor(dia / 7)
  const mes = Math.floor(dia / 30)
  const anio = Math.floor(dia / 365)

  if (seg < 60)       return `hace ${seg} seg`
  if (min < 60)       return `hace ${min} min`
  if (hor < 24)       return `hace ${hor} h`
  if (dia < 7)        return `hace ${dia} d`
  if (sem < 5)        return `hace ${sem} sem`
  if (mes < 12)       return `hace ${mes} ${mes === 1 ? 'mes' : 'meses'}`
  return `hace ${anio} ${anio === 1 ? 'año' : 'años'}`
}

export const plata = (n) =>
  n || n === 0 ? `$${Number(n).toLocaleString('es-CL')}` : ''

export const distancia = (m) => {
  if (m === null || m === undefined) return null
  return m < 1000 ? `${m} m` : `${(m / 1000).toFixed(1)} km`
}

export const saludo = () => {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 20) return 'Hola'
  return 'Buenas noches'
}

/*
  ADICIONES A design.js  —  pegá esto al FINAL de tu lib/design.js
  (después de la función `saludo` que ya tenés).

  Agrega 2 exports nuevos:
    · COMERCIOS      → map de rubro → { emoji, color, bg }
    · COMERCIOS_CATS → array de rubros (para filtros)
*/

/* Rubros de comercios (deben coincidir con CATEGORIAS de CommerceForm.jsx) */
export const COMERCIOS = {
  'Panadería':   { emoji: '🥖', color: C.dorado,  bg: C.doradoSuave },
  'Almacén':     { emoji: '🏪', color: C.verde,   bg: C.verdeSuave },
  'Verdulería':  { emoji: '🥬', color: C.verde,   bg: C.verdeSuave },
  'Carnicería':  { emoji: '🥩', color: C.rojo,    bg: C.rojoSuave },
  'Cafetería':   { emoji: '☕', color: C.dorado,  bg: C.doradoSuave },
  'Restaurante': { emoji: '🍽️', color: C.naranjo, bg: C.naranjoSuave },
  'Farmacia':    { emoji: '💊', color: C.verde,   bg: C.verdeSuave },
  'Peluquería':  { emoji: '✂️', color: C.morado,  bg: C.moradoSuave },
  'Ferretería':  { emoji: '🔨', color: C.naranjo, bg: C.naranjoSuave },
  'Botillería':  { emoji: '🍷', color: C.morado,  bg: C.moradoSuave },
  'Librería':    { emoji: '📚', color: C.azul,    bg: C.azulSuave },
  'Lavandería':  { emoji: '🧺', color: C.azul,    bg: C.azulSuave },
  'Veterinaria': { emoji: '🐾', color: C.morado,  bg: C.moradoSuave },
  'Bazar':       { emoji: '🧸', color: C.dorado,  bg: C.doradoSuave },
  'Otro':        { emoji: '🏪', color: C.textoTenue, bg: C.fondo },
}

/* Lista de rubros para los filtros (en el orden del CommerceForm) */
export const COMERCIOS_CATS = [
  'Panadería', 'Almacén', 'Verdulería', 'Carnicería', 'Cafetería',
  'Restaurante', 'Farmacia', 'Peluquería', 'Ferretería', 'Botillería',
  'Librería', 'Lavandería', 'Veterinaria', 'Bazar', 'Otro',
]
