# El Barrio

El Barrio es una aplicación móvil territorial para conectar a personas que realmente viven cerca. Reúne comunidad vecinal, mercado, servicios, comercios, alertas, noticias, eventos, mapas, mensajería y administración en un solo producto.

La aplicación se distribuye como app nativa mediante Capacitor:

- Android: APK para pruebas directas y AAB para Google Play.
- iPhone: proyecto Xcode compatible con iOS 15 o superior.
- Panel administrativo web: `https://admin.elbarrio.lat/`.

## Propósito

El Barrio busca recuperar confianza, seguridad y cercanía entre vecinos. El acceso requiere una cuenta y un proceso de verificación territorial. La dirección, GPS y RUT se utilizan para validar pertenencia al barrio; la ubicación exacta y el RUT no se muestran públicamente.

## Funcionalidades de la aplicación

### Registro y acceso

- Registro con correo y contraseña.
- Acceso con Google OAuth.
- Recuperación y cambio de contraseña.
- Perfil personal con nombre, fotografía, teléfono y datos territoriales.
- Verificación mediante RUT, dirección, comuna, GPS y polígono del barrio.
- Lista de espera para personas que viven fuera del territorio activo.
- Invitaciones entre vecinos mediante código o enlace.
- Persistencia de sesión y eliminación de cuenta desde la app.

### Inicio

- Saludo, barrio, clima y farmacia de turno.
- Carrusel editorial administrado desde el panel.
- Accesos directos a Eventos, Noticias y Alertas.
- Acceso al mapa territorial.
- Mercado resumido.
- Actividad de El Barrio con publicaciones, alertas, pedidos, servicios, eventos y artículos de Mercado.
- Mezcla de contenido reciente, visto y editorial para evitar un feed rígido.
- Notificaciones internas y contador de no leídos.

### Mercado

- Ventas, regalos y trueques.
- Solicitudes de ayuda.
- Hasta cuatro fotografías por publicación.
- Cámara y galería independientes.
- Compresión automática de imágenes antes de subirlas.
- Autocompletado mediante IA a partir de una fotografía.
- Favoritos, likes, comentarios y compartir.
- Edición y cierre de publicaciones propias.
- Chat privado, ofertas, propuesta de encuentro, aceptación, cancelación y cierre del trato.
- La publicación se retira del feed cuando la operación se cierra.

### Servicios y comercios

- Directorio territorial de servicios.
- Publicación de servicios por vecinos y aprobación administrativa.
- Contacto mediante chat, teléfono, WhatsApp o Instagram cuando corresponda.
- Servicios patrocinados con vigencia programable.
- Comercios con portada, logotipo, ubicación, horario, galería y contacto.
- Productos, promociones, favoritos y opiniones.
- Mapa abierto en el detalle del comercio y botón Cómo llegar.

### Alertas e incidentes

- Prioridades crítica, moderada e informativa.
- Categorías Seguridad, Incendio, Servicios, Animales, Fugas, Luz, Salud y Otros.
- Foto, descripción, ubicación y mapa.
- Publicación inmediata en Inicio, Alertas y mapa cuando corresponde.
- Accesos a 131, 132, 133 y 1402.
- Confirmaciones, comentarios y cierre de la alerta.
- Moderación, oficialización, rechazo y resolución desde el panel.
- Aviso visible de que los reportes vecinales no sustituyen a los servicios de emergencia.

### Noticias y eventos

- Noticias completas con portada, categoría, fuente y enlace externo opcional.
- Selección para aparecer en Actividad.
- Eventos con fecha, rango horario, ubicación, mapa, tarifas y características de accesibilidad.
- Enlace de inscripción opcional.
- Acción externa configurable: Más información, Comprar entradas, Visitar sitio oficial o Ver programación.
- Botón Cómo llegar mediante Google Maps o navegador externo.

### Mapa del barrio

- Polígono del territorio activo.
- Comercios e incidentes vigentes.
- Filtros por tipo.
- Agrupación de marcadores cuando aumenta la densidad.
- Apertura de fichas desde el mapa.

### Perfil y convivencia

- Reputación, insignias y actividad del vecino.
- Mis publicaciones, favoritos, compras y ventas.
- Invitar vecinos.
- Modo accesible con tipografías y controles ampliados.
- Términos, privacidad, productos prohibidos, Nosotros y contacto.
- Reporte de contenido ofensivo.
- Bloqueo de usuarios abusivos.
- Eliminación de cuenta y anonimización de datos personales.

### Notificaciones

- Notificaciones internas en la campana.
- Push Android mediante Firebase Cloud Messaging.
- Preferencias por categoría.
- Envío segmentado por barrio y audiencia desde el panel.
- Push probado anteriormente con la app abierta, en segundo plano y cerrada.
- Al tocar un push se abre actualmente la pantalla de Notificaciones; la apertura de un contenido específico queda para una mejora posterior.

### IA y moderación

- Reconocimiento de fotografías mediante una Edge Function segura y OpenRouter.
- Moderación preventiva de publicaciones, comentarios y reseñas públicas.
- Chats privados fuera del análisis automático.
- Registro administrativo de decisiones de moderación.
- Operación degradada cuando el proveedor de IA no está disponible, manteniendo RLS y moderación humana como controles definitivos.

## Panel administrativo

El panel publicado en `https://admin.elbarrio.lat/` incluye:

- Resumen general.
- Portada de Inicio.
- Control global de publicaciones.
- Comentarios y reseñas.
- Reportes de vecinos.
- Categorías administrables.
- Comercios, productos y promociones.
- Servicios y patrocinios.
- Eventos y categorías.
- Farmacias y turnos.
- Noticias y categorías.
- Incidentes y alertas.
- Usuarios, verificación y permisos.
- Lista de espera e invitaciones.
- Consultas de contacto.
- Contenido editable de la app.
- Notificaciones internas y push.
- Uso de servicios, Storage y limpieza de archivos.

Existen dos niveles: administrador territorial y superadministrador. El territorial queda limitado a su barrio; el superadministrador puede administrar globalmente usuarios, perfiles, publicaciones y contenido público, siempre con trazabilidad.

## Arquitectura

- Frontend: React 19 + Vite.
- Aplicación móvil: Capacitor 8.
- Backend: Supabase Auth, Postgres, RLS, Storage, Realtime y Edge Functions.
- Mapas: Leaflet y OpenStreetMap; navegación externa mediante Google Maps.
- Push Android: Firebase Cloud Messaging.
- Correo transaccional: Supabase Auth con SMTP de Resend.
- IA: OpenRouter desde Edge Functions; ninguna clave privada se entrega al navegador.
- Panel: React/Vite desplegado en Plesk.

## Estructura principal

- `src/`: aplicación vecinal.
- `admin-panel/`: panel administrativo web.
- `shared/`: utilidades compartidas, incluida compresión de imágenes y validación de URLs.
- `supabase/migrations/`: cambios versionados de base de datos.
- `supabase/functions/`: Edge Functions.
- `android/`: proyecto Android.
- `ios/`: proyecto Xcode.
- `release/android/`: entrega Android, firma y guía de Google Play; está ignorada por Git.
- `AI_CONTEXT.md`: estado técnico y reglas obligatorias para continuar el proyecto.

## Desarrollo local

Aplicación:

```bash
npm install
npm run dev
```

Panel:

```bash
cd admin-panel
npm install
npm run dev
```

Compilación web:

```bash
npm run build
npm --prefix admin-panel run build
```

Sincronización móvil:

```bash
npm run mobile:sync
```

Abrir Android Studio o Xcode:

```bash
npx cap open android
npx cap open ios
```

## Entrega Android

- APK: instalador firmado para pruebas directas.
- AAB: archivo que se entrega a Google Play.
- ID: `lat.elbarrio.app`.
- Versión: `1.0.0`.
- Version code: `1`.
- Android mínimo: API 24.
- Target SDK: API 36.

Nunca se debe publicar la llave de firma ni `android/keystore.properties`. Para cada actualización de Play Store se debe conservar la misma llave y aumentar `versionCode`.

## Estado de publicación al 10 de agosto de 2026

La app y el panel compilan; Android genera APK/AAB firmados y el panel remoto coincide con la compilación local. Antes de enviar a revisión definitiva siguen siendo obligatorios:

1. Publicar una URL accesible de Política de privacidad; actualmente `https://elbarrio.lat/privacidad` responde 404.
2. Corregir la función remota `bump_view`, que usa `posts.views` en lugar de `posts.views_count`.
3. Reconciliar el historial de `202608100001_event_external_actions.sql` sin volver a ejecutar su SQL.
4. Probar Google OAuth y recuperación de contraseña en el APK recién generado.
5. Verificar el correo público de soporte y crear una cuenta vecinal exclusiva para revisión.
6. Completar capturas, imagen destacada, clasificación y Seguridad de datos en Google Play.
7. Confirmar si la tercera cuenta superadministradora `elbarrio.lat@gmail.com` debe conservarse.

iOS compila en simulador y dispositivo de desarrollo, pero no está listo para App Store hasta incorporar una opción de acceso compatible con la regla de login de Apple, APNs, capabilities, pruebas físicas finales y una cuenta Apple Developer activa.

No se debe confundir “compila” con “publicación aprobada”. Los bloqueadores y las pruebas pendientes se mantienen también en `AI_CONTEXT.md`.
