# Roadmap operativo — El Barrio

> Estado base: 22 de julio de 2026  
> Documento de trabajo para Notion u Obsidian.  
> El código actual y `AI_CONTEXT.md` tienen prioridad si este documento queda desactualizado.

## Leyenda

- [x] Terminado
- [ ] Pendiente
- 🔴 Crítico antes de lanzamiento
- 🟠 Importante para el MVP
- 🟢 Mejora posterior

---

## Base construida

- [x] Registro, login y verificación de vecinos
- [x] Feed principal en `Home.jsx`
- [x] Mercado: feed, categorías y publicaciones
- [x] Detalle de publicaciones
- [x] Likes y comentarios
- [x] Edición y eliminación de publicaciones propias
- [x] Chat entre vecinos
- [x] Feed de servicios
- [x] Feed y detalle de eventos
- [x] Confirmación de asistencia a eventos
- [x] Feed y detalle de comercios
- [x] Comercios normales y destacados diferenciados
- [x] GPS y distancia a comercios
- [x] Mapas y cómo llegar
- [x] Panel administrativo web independiente
- [x] Login administrativo
- [x] Editor web de comercios
- [x] Catálogo de productos por comercio
- [x] Supabase conectado al panel y a la app
- [x] Transiciones de navegación
- [x] Páginas informativas y legales
- [x] Plus Jakarta Sans aplicada
- [x] `.env` y `.env.local` excluidos mediante `.gitignore`

---

# Fase 1 — Cerrar Comercios

> Estado: en curso  
> Resultado esperado: módulo de Comercios validado completamente en panel, Supabase y aplicación.

## Productos de prueba

- [ ] Crear tres productos reales desde el panel
- [ ] Subir fotografía de cada producto
- [ ] Probar nombre, descripción, precio y unidad
- [ ] Marcar un producto como destacado
- [ ] Marcar un producto como no disponible
- [ ] Confirmar que solo aparecen los productos disponibles
- [ ] Confirmar que los productos destacados aparecen primero
- [ ] Probar edición de productos
- [ ] Probar eliminación de productos

## Validación en la aplicación

- [ ] Confirmar productos en la ficha del comercio
- [ ] Revisar visualización sin productos
- [ ] Revisar visualización con uno y varios productos
- [ ] Probar portada, logo y galería
- [ ] Probar WhatsApp
- [ ] Probar Instagram
- [ ] Probar cómo llegar
- [ ] Probar compartir
- [ ] Probar distancia mediante GPS
- [ ] Probar comercio normal
- [ ] Probar comercio destacado
- [ ] Validar transiciones de entrada y regreso

## Horarios

- [ ] Unificar el formato de horarios entre panel y aplicación
- [ ] Probar comercio abierto
- [ ] Probar comercio cerrado
- [ ] Probar comercio sin horario
- [ ] Probar cambios de horario desde el panel

## Cierre de fase

- [ ] Validar Comercios desde el panel hasta la aplicación
- [ ] Corregir errores encontrados
- [ ] Aprobar visualmente el módulo
- [ ] Marcar Comercios como terminado

---

# Fase 2 — Panel web de Eventos

> Resultado esperado: juntas vecinales y administradores pueden gestionar eventos desde el computador.

- [ ] Crear listado administrativo de eventos
- [ ] Buscar eventos
- [ ] Filtrar eventos
- [ ] Crear eventos desde el computador
- [ ] Editar eventos existentes
- [ ] Subir y cambiar imágenes
- [ ] Elegir dirección utilizando mapa
- [ ] Configurar fecha y horario
- [ ] Configurar evento gratuito o pagado
- [ ] Agregar precio cuando corresponda
- [ ] Configurar `Pet friendly` y otras condiciones
- [ ] Definir categoría
- [ ] Marcar evento destacado
- [ ] Marcar evento oficial
- [ ] Marcar evento obligatorio
- [ ] Cancelar un evento
- [ ] Eliminar un evento
- [ ] Ver cantidad de asistentes
- [ ] Confirmar actualización inmediata en la aplicación
- [ ] Probar permisos para administradores y actores autorizados

---

# Fase 3 — Otros módulos administrativos

## Farmacias

- [ ] Listar farmacias
- [ ] Crear farmacias
- [ ] Editar farmacias
- [ ] Administrar direcciones y mapas
- [ ] Configurar farmacia de turno
- [ ] Configurar horarios
- [ ] Activar y desactivar establecimientos

## Incidentes y alertas

- [ ] Listar alertas reportadas
- [ ] Revisar contenido y ubicación
- [ ] Aprobar alertas
- [ ] Rechazar alertas
- [ ] Marcar alertas oficiales
- [ ] Cerrar alertas resueltas
- [ ] Registrar quién realizó cada acción administrativa

## Usuarios

- [ ] Listar vecinos registrados
- [ ] Buscar usuarios
- [ ] Filtrar usuarios
- [ ] Revisar verificación
- [ ] Aprobar actores autorizados
- [ ] Asignar roles administrativos
- [ ] Suspender usuarios problemáticos
- [ ] Reactivar usuarios
- [ ] Unificar definitivamente los campos de roles

## Servicios

- [ ] Administrar servicios desde el panel
- [ ] Aprobar o rechazar servicios
- [ ] Activar servicios destacados
- [ ] Definir inicio y término de cada destacado
- [ ] Diferenciar claramente contenido normal y patrocinado

---

# Fase 4 — Cerrar el MVP funcional

## Inicio

- [ ] Confirmar que todas las secciones utilizan datos reales
- [ ] Confirmar que la alerta destacada siempre sea oficial
- [ ] Revisar clima, farmacia y accesos rápidos
- [ ] Revisar estados vacíos
- [ ] Revisar actualizaciones sin refrescar manualmente

## Mercado

- [ ] Probar venta entre dos usuarios reales
- [ ] Probar regalo
- [ ] Probar trueque
- [ ] Probar publicación conversable
- [ ] Probar comentarios con cuentas diferentes
- [ ] Probar likes con cuentas diferentes
- [ ] Probar edición y eliminación
- [ ] Probar contacto y chat
- [ ] Probar finalización de una transacción

## Servicios

- [ ] Probar publicación real
- [ ] Probar contacto con el prestador
- [ ] Probar categorías
- [ ] Validar servicios destacados
- [ ] Definir cómo se solicitan y pagan los destacados

## Eventos

- [ ] Probar creación con una cuenta autorizada
- [ ] Probar asistencia con dos cuentas
- [ ] Probar cancelación de asistencia
- [ ] Confirmar contadores reales
- [ ] Revisar eventos gratuitos
- [ ] Revisar eventos pagados
- [ ] Revisar eventos obligatorios

## Chat y convivencia

- [ ] Probar conversaciones entre usuarios diferentes
- [ ] Probar contador de mensajes no leídos
- [ ] Implementar bloqueo de usuarios
- [ ] Implementar reporte desde una conversación
- [ ] Revisar manejo de usuarios suspendidos

## Noticias

- [ ] Confirmar noticias reales desde Supabase
- [ ] Crear noticias desde el panel
- [ ] Diferenciar noticias oficiales
- [ ] Eliminar contenido de demostración

## Perfiles y confianza

- [ ] Reemplazar reputación simulada por datos reales
- [ ] Confirmar tabla y flujo de reseñas
- [ ] Permitir reseñar después de una transacción
- [ ] Mostrar historial de publicaciones
- [ ] Mostrar ventas, regalos y ayudas reales

## Páginas auxiliares

- [ ] Habilitar Invitar vecinos
- [ ] Generar enlace único de invitación
- [ ] Generar QR real
- [ ] Compartir invitación mediante WhatsApp y otras aplicaciones
- [ ] Conectar Contáctanos con soporte real
- [ ] Definir enlaces oficiales de redes sociales

---

# Fase 5 — Supabase y seguridad

> 🔴 Esta fase debe estar cerrada antes de incorporar usuarios reales de manera amplia.

- [ ] 🔴 Exportar y versionar el schema completo
- [ ] 🔴 Confirmar todas las tablas utilizadas realmente
- [ ] 🔴 Versionar las políticas RLS
- [ ] 🔴 Revisar permisos de lectura, creación, edición y eliminación
- [ ] 🔴 Proteger mensajes para que solo los participantes puedan leerlos
- [ ] 🔴 Proteger perfiles y datos personales
- [ ] 🔴 Proteger publicaciones por barrio
- [ ] 🔴 Proteger productos y comercios
- [ ] 🔴 Revisar permisos de Supabase Storage
- [ ] 🔴 Confirmar roles de administrador y actor autorizado
- [ ] 🔴 Eliminar inconsistencias entre `role` y campos antiguos
- [ ] 🔴 Revisar si alguna clave fue enviada anteriormente a Git
- [ ] 🔴 Rotar claves si alguna quedó expuesta
- [ ] 🔴 Definir respaldo periódico de la base de datos
- [ ] 🔴 Separar entorno de pruebas y producción
- [ ] 🔴 Revisar migraciones existentes contra la base real

---

# Fase 6 — Aplicación instalable y lanzamiento piloto

## Aplicación instalable

- [ ] Convertir la web en PWA instalable
- [ ] Crear manifiesto
- [ ] Crear iconos de instalación
- [ ] Crear pantalla de inicio
- [ ] Probar instalación en Android
- [ ] Probar instalación en iPhone
- [ ] Probar permisos de ubicación
- [ ] Implementar recuperación de contraseña
- [ ] Implementar eliminación de cuenta
- [ ] Agregar notificaciones push
- [ ] Mostrar estados sin conexión
- [ ] Optimizar imágenes antes de subirlas
- [ ] Agregar fallback cuando una imagen falla

## Control de calidad

- [ ] Probar toda la aplicación sin marco de teléfono
- [ ] Probar diferentes tamaños de pantalla
- [ ] Probar con personas mayores
- [ ] Revisar scroll de todas las pantallas
- [ ] Revisar áreas seguras superiores e inferiores
- [ ] Revisar textos legales con asesoría profesional
- [ ] Configurar analytics básicos
- [ ] Configurar monitoreo de errores

## Publicación piloto

- [ ] Publicar versión de prueba en `elbarrio.lat`
- [ ] Incorporar un barrio
- [ ] Incorporar entre 20 y 50 vecinos
- [ ] Incorporar entre 5 y 10 comercios
- [ ] Incorporar una junta de vecinos
- [ ] Recoger problemas y comentarios
- [ ] Corregir problemas críticos
- [ ] Medir publicaciones, contactos, chats y asistencia a eventos

---

# Fase 7 — Monetización

## Suscripciones para comercios

- [ ] Definir plan gratuito
- [ ] Definir plan destacado
- [ ] Definir precio mensual
- [ ] Definir beneficios de cada plan
- [ ] Crear estado de suscripción
- [ ] Registrar inicio y vencimiento
- [ ] Administrar suscripciones desde el panel
- [ ] Incorporar pagos
- [ ] Suspender automáticamente beneficios vencidos

## Publicidad

- [ ] Definir lugares para banners
- [ ] Crear formatos de publicidad
- [ ] Definir duración y precio
- [ ] Identificar claramente el contenido patrocinado
- [ ] Administrar campañas desde el panel
- [ ] Medir impresiones
- [ ] Medir clics

## Servicios destacados

- [ ] Definir precio por servicio destacado
- [ ] Definir duración del destacado
- [ ] Permitir promoción por categoría o barrio

## Juntas vecinales y municipalidades

- [ ] Crear cuentas oficiales para juntas de vecinos
- [ ] Crear cuentas oficiales para municipalidades
- [ ] Definir herramientas institucionales
- [ ] Definir precios institucionales
- [ ] Preparar reportes de alcance y participación

---

# Fase 8 — Después del piloto

- [ ] 🟢 Soportar múltiples barrios
- [ ] 🟢 Permitir incorporación o cambio a otro barrio
- [ ] 🟢 Implementar moderación avanzada
- [ ] 🟢 Crear panel de métricas
- [ ] 🟢 Automatizar renovaciones
- [ ] 🟢 Crear aplicación nativa mediante Capacitor
- [ ] 🟢 Publicar en App Store
- [ ] 🟢 Publicar en Google Play
- [ ] 🟢 Mejorar funcionamiento sin conexión
- [ ] 🟢 Preparar internacionalización si se expande fuera de Chile

---

# Orden recomendado

1. Cerrar Comercios
2. Construir administración web de Eventos
3. Construir Farmacias, Incidentes y Usuarios en el panel
4. Probar todas las funciones con dos cuentas reales
5. Cerrar seguridad y estructura de Supabase
6. Preparar PWA y piloto
7. Incorporar monetización
8. Escalar a más barrios

---

## Registro de decisiones

Usar esta sección para anotar decisiones importantes sin modificar el historial anterior.

### 2026-07-22

- El código actual tiene prioridad sobre la documentación histórica.
- `Home.jsx` es el feed principal.
- `Barrio.jsx`, `Feed.jsx` y `Search.jsx` no participan actualmente en la ejecución.
- El panel administrativo web es una aplicación separada conectada al mismo Supabase.
- La fase activa es cerrar Comercios de extremo a extremo.
