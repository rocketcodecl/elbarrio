# Auditoría de cierre del MVP — El Barrio

Fecha: 1 de agosto de 2026

Estado Supabase: auditoría de solo lectura ejecutada por el propietario el 1 de agosto de 2026. Todas las tablas, columnas, funciones y verificaciones RLS incluidas devolvieron `OK`.

## Veredicto

La aplicación vecinal y el panel administrativo compilan en modo producción. El código vigente contiene los flujos principales del MVP y Google OAuth fue validado manualmente por el propietario con creación de cuenta, cierre de sesión y reingreso.

El producto todavía no está listo para enviarse a App Store o Google Play. Antes de iniciar la envoltura nativa deben resolverse los bloqueos de cuenta, soporte y verificación operativa descritos abajo. La ausencia de Capacitor, proyectos iOS/Android y push es trabajo de la fase nativa, no una falla del build web actual.

## Comprobaciones realizadas

- `npm run build` de la aplicación principal: correcto.
- `npm run build` de `admin-panel/`: correcto.
- Revisión estática de autenticación, publicación, tratos, invitaciones, moderación, contenido editable y alcance administrativo.
- Revisión de referencias a tablas, RPC, secretos y contenido simulado en pantallas conectadas.
- Revisión de `AI_CONTEXT.md`, `admin-panel/ADMIN_CONTEXT.md`, estado Git y últimos cinco commits.
- Google OAuth: validado manualmente por el propietario en una sesión real.

## Bloqueos antes de tiendas

1. **Eliminación de cuenta inexistente.** La app permite crear cuentas, pero no ofrece borrado real ni una política definida para publicaciones, mensajes, fotografías y datos territoriales asociados.
2. **Recuperación de contraseña inactiva.** El control “¿Olvidaste tu contraseña?” no tiene acción conectada.
3. **Canal de soporte simulado.** `ContactUs` muestra éxito sin enviar el mensaje. Los enlaces sociales no tienen destino y el horario de atención no está respaldado por un canal real.
4. **Privacidad legal incompleta.** Existen términos dentro de la app, pero falta una Política de privacidad pública, estable y específica para RUT, dirección, GPS, fotografías, moderación e IA.
5. **Aislamiento administrativo sin prueba real.** Las RPC revisadas limitan por barrio, pero falta probar con una cuenta de administrador territorial que no pueda leer ni modificar otro barrio.
6. **Acceso equivalente para iOS pendiente.** Al ofrecer Google como acceso a la cuenta principal, la revisión de Apple exige además una opción equivalente con sus condiciones de privacidad; para este producto la solución práctica es “Iniciar sesión con Apple”.
7. **Credenciales de infraestructura expuestas durante el desarrollo.** Antes de publicar deben rotarse las claves de servidor/Plesk/SSH y cualquier contraseña compartida, y revocarse accesos que ya no se utilicen.

## Riesgos altos que requieren prueba funcional

- Ciclo completo con dos cuentas: propuesta de trato, aceptación, chat, cierre y retiro de la publicación del feed.
- Publicación real de venta, regalo, trueque, ayuda, servicio, evento y alerta.
- IA con fotografía y moderación con texto permitido/bloqueado bajo una sesión real.
- Dirección, GPS, polígono, lista de espera e invitación hasta verificación territorial.
- Administración real de incidentes, usuarios, servicios, noticias, farmacias, comercios y portada de evento.
- RLS de tablas críticas y alcance de Storage. El build no demuestra permisos efectivos del proyecto remoto.
- El lint completo de fuentes no está limpio. Gran parte corresponde a reglas estrictas de React 19 y pantallas antiguas desconectadas, pero también hay deuda en pantallas activas. El comando raíz además inspecciona por error `admin-panel/dist`.
- Los bundles son grandes: aproximadamente 1,31 MB de JavaScript en la app y 722 KB en el panel antes de gzip. No bloquea el MVP, pero afecta arranque y debe medirse en teléfonos reales.

## Riesgos para expansión, no bloqueantes del barrio inicial

- Una invitación puede contar aunque invitador e invitado terminen en barrios distintos. Con un único barrio activo no altera el MVP; debe exigirse coincidencia territorial antes de abrir nuevas zonas.
- La asistencia a eventos continúa deshabilitada porque `event_attendees` pertenece al modelo antiguo y los eventos vigentes viven en `posts`. Mantenerla fuera del MVP.
- `Barrio.jsx`, `Feed.jsx`, `Search.jsx` y dos respaldos de `App.jsx` no participan en la ejecución, pero aumentan ruido y deuda técnica.

## Funcionalidades confirmadas en código

- Registro por correo y Google, creación/recuperación de sesión y continuación del onboarding.
- Perfil, RUT, dirección, GPS, polígono, lista de espera y Modo accesible.
- Feeds de inicio, mercado, servicios, comercios, eventos, noticias y alertas.
- Publicaciones, IA de fotografía, moderación preventiva, comentarios y opiniones.
- Chat, propuestas de trato, aceptación, cancelación y cierre de compraventa.
- Favoritos, perfil público, insignias e invitaciones trazables.
- Panel independiente para comercios, servicios, farmacias, noticias, eventos, incidentes, usuarios, notificaciones, lista de espera, invitaciones y contenido institucional.
- Alcance de superadministrador y controles territoriales en las RPC administrativas revisadas.

## Orden recomendado

1. Implementar recuperación de contraseña, contacto real y eliminación de cuenta.
2. Añadir “Iniciar sesión con Apple” como parte de la preparación iOS.
3. Completar una prueba manual de humo con dos vecinos y un administrador territorial.
4. Limpiar el lint de código conectado y excluir artefactos generados.
5. Iniciar Capacitor, iOS y Android conservando la web actual.
6. Integrar push real, enlaces profundos y contador del ícono.
7. Cerrar privacidad, materiales de tienda y beta en dispositivos reales.
