# MVP

## Qué ya existe

[CONFIRMADO por código]

- **Autenticación completa** con Supabase Auth (signUp, signInWithPassword, signOut, getSession, onAuthStateChange).
- **Flujo de onboarding** en 6 pasos: splash → onboarding → register → profile → verification → complete.
- **Verificación de domicilio** con GPS y selección manual de comuna (32 comunas de Santiago).
- **Feed principal** (`Barrio.jsx`) con 8 secciones: header, clima+farmacia, accesos rápidos, pedidos vecinales, alertas, mercado, actividad del barrio, eventos.
- **Mercado** con 7 tipos de publicación (request, sell, gift, trade, alert, event, general) desde un solo modal `CreatePost.jsx`.
- **Detalle de producto** con likes (`post_likes`), comentarios, contacto al vendedor.
- **Chat 1-a-1** con realtime (`ChatList.jsx` + `ChatConversation.jsx`), contador de no leídos.
- **Alertas**: creación por vecinos, confirmaciones, flags, detalle con comentarios realtime, marca `is_official` desde admin.
- **Comercios** con horarios "abierto ahora" (`horarios.js`), promociones temporales, comercios destacados (`is_premium`).
- **Eventos** con filtros por categoría y suscripción a asistencia (parcial, ver P1).
- **Notificaciones in-app** con realtime.
- **Noticias del barrio**.
- **Mapa Leaflet** embebido (`MiniMap.jsx`) y mapa interactivo en `AdminComercios.jsx`.
- **Panel admin** con 4 sub-paneles: farmacias, comercios, usuarios, incidentes.
- **Autocompletar publicación desde foto** con OpenRouter (`lib/ia.js`), con cooldown anti-abuso.
- **Perfil de vendedor público**, confirmación de transacción (`DealDone.jsx`).
- **ErrorBoundary** global.
- **Compartir** vía `navigator.share` en alertas.
- **Draft auto-save** en `localStorage` para `CreatePost.jsx`.
- **Busquedas recientes** en `localStorage` (en `Search.jsx` — huérfana, ver P1).

## Qué falta

[CONFIRMADO por código]

- **Seguridad**: RLS no versionada ni verificada. `.env` con claves en texto plano (verificar `.gitignore`).
- **Schema Supabase**: solo `supabase_fix_likes_views.sql` está versionado. El resto del schema (14 tablas) no se puede reproducir desde el repo.
- **Inconsistencia admin**: `role` vs `user_type` — dos campos para la misma decisión.
- **Pantallas huérfanas**: `Home.jsx`, `Feed.jsx`, `Search.jsx` mantienen código que no se ejecuta.
- **Banear usuarios**: el botón existe en `AdminUsuarios.jsx` pero solo muestra "Próximamente 🚧". No hay columna `banned` en la BD.
- **Eventos asistencia**: `Events.jsx` tiene TODOs — la persistencia de asistencia en `event_attendees` no está terminada.
- **Reseñas (reviews)**: `SellerProfile.jsx` usa rating mock. La tabla `reviews` se asume pero no se confirma.
- **Noticias**: `Noticias.jsx` muestra un banner "Mostrando ejemplos" — todavía no carga noticias reales desde Supabase, o el flujo de crearlas no está listo.
- **Notificaciones push reales**: no hay serviceWorker, no hay PWA, no hay manifiesto. Solo in-app.
- **Bloquear usuarios**: no hay implementación de "block user" en el chat.
- **Analytics**: no hay tracking (gtag, pixel, etc.).
- **Offline**: no hay manejo de offline ni cache.
- **Móvil nativo**: no hay Capacitor/Cordova/PWA. Es solo web.

---

# Prioridad P0 — Crítico para lanzamiento

### P0-1: Activar y versionar RLS en Supabase

- **Beneficio**: evita que cualquier usuario con la anon key lea o modifique cualquier fila de cualquier tabla. Sin esto, lanzar es un riesgo legal y de seguridad.
- **Complejidad**: media. Requiere pensar políticas por tabla (perfiles propios, posts del barrio, mensajes entre pares, etc.).
- **Dependencias**: ninguna — es trabajo en Supabase Dashboard + versionado en repo.
- **Tiempo estimado**: 1–2 días.

### P0-2: Versionar schema completo de Supabase

- **Beneficio**: si Supabase se cae o se migra, se puede reconstruir la BD desde el repo. Hoy es punto único de fallo.
- **Complejidad**: baja. Exportar schema desde Supabase Dashboard → guardar en `supabase/schema.sql`.
- **Dependencias**: ninguna.
- **Tiempo estimado**: 2 horas.

### P0-3: Verificar `.gitignore` contiene `.env` y rotar claves si ya se commiteó

- **Beneficio**: si las claves Supabase/OpenRouter se expusieron, rotarlas cierra la brecha.
- **Complejidad**: muy baja.
- **Dependencias**: ninguna.
- **Tiempo estimado**: 1 hora (verificar + rotar si hace falta).

### P0-4: Unificar `role` vs `user_type` en un solo campo admin

- **Beneficio**: hoy un admin marcado por una vía puede no ser reconocido por la otra. Crítico para que el panel admin funcione.
- **Complejidad**: baja-media. Migración SQL (`UPDATE profiles SET role = user_type WHERE role IS NULL`) + editar `Barrio.jsx` para usar `role` en vez de `user_type`.
- **Dependencias**: P0-2 (versionar schema).
- **Tiempo estimado**: medio día.

### P0-5: Eliminar pantallas huérfanas o cablearlas

- **Beneficio**: claridad absoluta sobre qué código es la app. Hoy `Home.jsx` tiene lógica `is_official` reciente pero no se ejecuta — genera confusión.
- **Complejidad**: muy baja. Decisión + `git rm` o importar en `App.jsx`.
- **Dependencias**: ninguna.
- **Tiempo estimado**: 1 hora.

### P0-6: Terminar persistencia de asistencia a eventos

- **Beneficio**: los eventos son una feature pública. Hoy el botón "asistir" hace toggle visual pero no persiste (`TODO: cuando exista event_attendees...`).
- **Complejidad**: baja. La tabla ya existe según `Events.jsx`, solo falta descomentar/terminar el INSERT/DELETE.
- **Dependencias**: P0-1 (RLS en `event_attendees`).
- **Tiempo estimado**: medio día.

---

# Prioridad P1 — Importante

### P1-1: Implementar banear usuarios

- **Beneficio**: el admin no puede suspender usuarios problemáticos. Hoy el botón solo muestra toast.
- **Complejidad**: baja. Agregar columna `banned` a `profiles` + UPDATE en `AdminUsuarios.jsx` + check en `App.jsx` para bloquear sesión.
- **Dependencias**: P0-1 (RLS), P0-2 (schema).
- **Tiempo estimado**: medio día.

### P1-2: Cargar noticias reales desde Supabase

- **Beneficio**: `Noticias.jsx` muestra "ejemplos". Los vecinos no pueden leer noticias reales.
- **Complejidad**: baja. Ya tiene la query a `posts` con `type='general'` filtrado. Revisar por qué cae al banner de ejemplos.
- **Dependencias**: P0-1 (RLS en `posts`).
- **Tiempo estimado**: medio día.

### P1-3: Confirmar tabla `reviews` y reemplazar mocks en `SellerProfile.jsx`

- **Beneficio**: el rating del vendedor es mock (4.8 / 12 reseñas hardcoded). Sin reseñas reales, los usuarios no confían.
- **Complejidad**: media. Crear tabla `reviews` si no existe + form de reseña post-transacción + mostrar reseñas reales.
- **Dependencias**: P0-2 (schema), P1-1 (banear para moderar reseñas).
- **Tiempo estimado**: 1 día.

### P1-4: Implementar bloquear usuario en chat

- **Beneficio**: un vecino acosado no puede bloquear al acosador. Riesgo de seguridad post-launch.
- **Complejidad**: media. Tabla `user_blocks` + filtro en `ChatList.jsx` + UI en `ChatConversation.jsx`.
- **Dependencias**: P0-1 (RLS).
- **Tiempo estimado**: 1 día.

### P1-5: Cablear pantalla de búsqueda (`Search.jsx`) o eliminarla

- **Beneficio**: hoy `Search.jsx` está huérfana con `localStorage` de búsquedas recientes. La app no tiene búsqueda visible.
- **Complejidad**: baja. Importar en `App.jsx` + agregar icono en `TopBar` o `Barrio.jsx`.
- **Dependencias**: ninguna.
- **Tiempo estimado**: medio día.

### P1-6: Implementar PWA + manifiesto

- **Beneficio**: hoy la app no es instalable. Para móvil, los usuarios tienen que abrir el navegador cada vez.
- **Complejidad**: media. `manifest.json` + serviceWorker + icons + `vite-plugin-pwa`.
- **Dependencias**: ninguna.
- **Tiempo estimado**: 1 día.

### P1-7: Agregar notificaciones push web

- **Beneficio**: hoy las notificaciones solo se ven si la app está abierta. Para MVP, al menos push web en desktop Chrome/Edge.
- **Complejidad**: media-alta. Requiere serviceWorker + Web Push API + suscripción desde Supabase.
- **Dependencias**: P1-6 (PWA).
- **Tiempo estimado**: 2 días.

---

# Prioridad P2 — Mejoras futuras

### P2-1: Analytics de eventos clave

- **Beneficio**: sin tracking no se sabe qué features se usan, dónde caen los usuarios, etc.
- **Complejidad**: muy baja. Plausible/PostHog self-hosted o GA4.
- **Dependencias**: ninguna.
- **Tiempo estimado**: medio día.

### P2-2: Manejo de offline / cache

- **Beneficio**: vecinos con conexión inestable pierden la app al cortarse internet.
- **Complejidad**: alta. Cache de Supabase en IndexedDB + UI de estado offline.
- **Dependencias**: P1-6 (PWA).
- **Tiempo estimado**: 2–3 días.

### P2-3: Build mobile nativo (Capacitor)

- **Beneficio**: distribución en App Store / Play Store.
- **Complejidad**: media. Capacitor wrapper + ajustes de permissions + push nativas.
- **Dependencias**: P0 completo, P1-6, P1-7.
- **Tiempo estimado**: 2 días.

### P2-4: Migrar a Supabase Storage público con URLs firmadas

- **Beneficio**: hoy las imágenes se suben con la anon key. Con RLS estricta, los uploads públicos dejan de funcionar y hay que usar URLs firmadas.
- **Complejidad**: media. Revisa políticas de storage + ajuste en `CreatePost.jsx`, `CommerceForm.jsx`, `PromoForm.jsx`, `AdminComercios.jsx`.
- **Dependencias**: P0-1 (RLS).
- **Tiempo estimado**: 1 día.

### P2-5: Skeletons de carga en vez de spinners

- **Beneficio**: hoy las pantallas muestran texto "Cargando…" o spinners. Skeletons dan sensación de velocidad.
- **Complejidad**: baja. Componente `<Skeleton/>` + reemplazar en pantallas con listas.
- **Dependencias**: ninguna.
- **Tiempo estimado**: medio día.

### P2-6: Image fallback en cards

- **Beneficio**: si una URL de imagen se rompe (Storage caído, URL vieja), hoy se ve icono roto. Fallback a emoji/placeholder.
- **Complejidad**: muy baja. `onError` en `<img>` de `PostCard`, `PedidoCard`, etc.
- **Dependencias**: ninguna.
- **Tiempo estimado**: 2 horas.

### P2-7: Filtros y orden en Marketplace y Comercios

- **Beneficio**: hoy las listas se cargan todas juntas. Filtros por precio, distancia, categoría mejoran descubrimiento.
- **Complejidad**: baja-media. UI de chips + queries Supabase.
- **Dependencias**: ninguna.
- **Tiempo estimado**: 1 día.

### P2-8: i18n (internacionalización)

- **Beneficio**: hoy todo está hardcodeado en español chileno. Para escalar a otros países latinos.
- **Complejidad**: media. Extracción de strings + `react-i18next`.
- **Dependencias**: ninguna.
- **Tiempo estimado**: 2 días.

### P2-9: Tests end-to-end

- **Beneficio**: hoy no hay tests. Cada cambio puede romper algo silenciosamente.
- **Complejidad**: media. Playwright + setup de BD de test.
- **Dependencias**: P0-2 (schema reproducible).
- **Tiempo estimado**: 2 días.

### P2-10: Optimización de imágenes en upload

- **Beneficio**: hoy las fotos se suben a tamaño original. Mobile sube fotos de 5MB+ que saturan Storage y lentifican el feed.
- **Complejidad**: baja. `canvas` resize antes del upload en `CreatePost.jsx`.
- **Dependencias**: ninguna.
- **Tiempo estimado**: medio día.

---

## Resumen de tiempos estimados

| Prioridad | Tiempo total estimado |
|---|---|
| **P0** (crítico para lanzamiento) | ~4–5 días |
| **P1** (importante post-launch) | ~6–7 días |
| **P2** (mejoras futuras) | ~10–14 días |

## Reglas seguidas

- No se proponen refactors innecesarios.
- No se proponen reescrituras.
- Prioridad: lanzar.
- Cada tarea basada en evidencia real del código (no en suposiciones).

Fin del documento.
