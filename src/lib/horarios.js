/*
  horarios.js — cálculo de "Abierto Ahora"

  Formato de opening_hours (jsonb en la tabla commerces):

    {
      "0": null,                          // domingo cerrado
      "1": { "o": "09:00", "c": "20:00" }, // lunes
      "2": { "o": "09:00", "c": "20:00" },
      ...
      "6": { "o": "09:00", "c": "14:00" }  // sábado
    }

  Las claves son el día de la semana de JavaScript:
  0=domingo · 1=lunes · 2=martes · 3=miércoles · 4=jueves · 5=viernes · 6=sábado
  null = cerrado ese día.
*/

export const DIAS_SEMANA = [
  { key: '1', label: 'Lunes',     corto: 'Lun' },
  { key: '2', label: 'Martes',    corto: 'Mar' },
  { key: '3', label: 'Miércoles', corto: 'Mié' },
  { key: '4', label: 'Jueves',    corto: 'Jue' },
  { key: '5', label: 'Viernes',   corto: 'Vie' },
  { key: '6', label: 'Sábado',    corto: 'Sáb' },
  { key: '0', label: 'Domingo',   corto: 'Dom' },
]

const aMinutos = (hhmm) => {
  if (!hhmm || !hhmm.includes(':')) return null
  const [h, m] = hhmm.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return null
  return h * 60 + m
}

/*
  Devuelve el estado de un comercio ahora mismo.

  { open: true,  closesAt: '20:30' }        → abierto
  { open: false, opensAt: '09:00', dia: 'mañana' }  → cerrado, pero abre
  { open: false }                            → cerrado, sin horario cargado
*/
export function estadoComercio(openingHours, ahora = new Date()) {
  if (!openingHours || typeof openingHours !== 'object') {
    return { open: false, sinHorario: true }
  }

  const diaHoy = String(ahora.getDay())
  const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes()
  const hoy = openingHours[diaHoy]

  // ¿Está abierto ahora?
  if (hoy && hoy.o && hoy.c) {
    const abre = aMinutos(hoy.o)
    const cierra = aMinutos(hoy.c)

    if (abre !== null && cierra !== null) {
      // Horario normal (ej: 09:00 a 20:00)
      if (cierra > abre) {
        if (minutosAhora >= abre && minutosAhora < cierra) {
          return { open: true, closesAt: hoy.c }
        }
      } else {
        // Cierra pasada la medianoche (ej: 18:00 a 02:00)
        if (minutosAhora >= abre || minutosAhora < cierra) {
          return { open: true, closesAt: hoy.c }
        }
      }

      // Cerrado, pero abre más tarde hoy
      if (minutosAhora < abre) {
        return { open: false, opensAt: hoy.o, cuando: 'hoy' }
      }
    }
  }

  // Cerrado. Buscar el próximo día que abra.
  for (let i = 1; i <= 7; i++) {
    const dia = String((ahora.getDay() + i) % 7)
    const h = openingHours[dia]
    if (h && h.o) {
      const nombre = DIAS_SEMANA.find((d) => d.key === dia)?.corto || ''
      return {
        open: false,
        opensAt: h.o,
        cuando: i === 1 ? 'mañana' : nombre,
      }
    }
  }

  return { open: false, sinHorario: true }
}

/* Texto corto para el chip. Ej: "Abierto · cierra 20:30" */
export function textoEstado(openingHours, ahora = new Date()) {
  const e = estadoComercio(openingHours, ahora)
  if (e.sinHorario) return 'Sin horario'
  if (e.open) return `Abierto · cierra ${e.closesAt}`
  if (e.opensAt && e.cuando === 'hoy') return `Cerrado · abre ${e.opensAt}`
  if (e.opensAt) return `Cerrado · abre ${e.cuando} ${e.opensAt}`
  return 'Cerrado'
}

/* Horario en blanco, para el formulario */
export function horarioVacio() {
  return {
    '1': { o: '09:00', c: '19:00' },
    '2': { o: '09:00', c: '19:00' },
    '3': { o: '09:00', c: '19:00' },
    '4': { o: '09:00', c: '19:00' },
    '5': { o: '09:00', c: '19:00' },
    '6': { o: '10:00', c: '14:00' },
    '0': null,
  }
}