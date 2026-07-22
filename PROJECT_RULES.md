# Filosofía

- MVP primero.
- Resolver problemas reales.
- Evitar complejidad innecesaria.
- Toda decisión debe poder explicarse con un archivo real del proyecto como evidencia.
- No asumir funcionalidades por memoria de sesiones anteriores: verificar en código.
- Cuando existan versiones duplicadas de un archivo, la fuente oficial de verdad es la única válida (`/home/z/my-project/app-source/elbarrio/`).
- Si una pantalla, componente o librería no se importa ni se usa en `App.jsx` o en el código activo, se considera código muerto y no debe mantenerse.
- Priorizar terminar una feature existente antes de abrir una nueva.

# Diseño

- Mantener look & feel actual.
- Mantener diseño cálido.
- Mantener consistencia visual.
- Evitar minimalismo frío.
- El sistema de diseño vive en `src/lib/design.js`. Toda pantalla nueva importa colores (`C`), tipografía (`T`), estilos (`S`), tipos (`TIPOS`), categorías (`REPORTES`, `COMERCIOS`), badges y helpers desde ahí. No inventar colores ni tamaños nuevos.
- Regla de oro de `design.js`: emojis sí, texto mínimo 13px, máximo 4-5 elementos por tarjeta, cálido no minimalista.
- Mantener el frame de teléfono (`.phone-frame`, `.phone-notch`, `.phone-home-indicator`): la app se ve como móvil aun en desktop.
- Reutilizar `TopBar`, `TabBar`, `PostCard`, `PedidoCard`, `MiniMap`, `Stepper` antes de crear componentes nuevos.
- Cualquier nuevo formulario de creación sigue el patrón de `CommerceForm`, `PromoForm`, `AvisoForm`: modal a pantalla completa con overlay, no página nueva.
- Mantener los iconos SVG inline del `Ico` en `TabBar.jsx` como referencia visual. No mezclar con iconos de otra librería.

# Código

- Reutilizar componentes.
- Evitar duplicación.
- No crear variantes innecesarias.
- La navegación es por estado en `App.jsx` (`currentScreen`, `activeTab`, `params`). No introducir React Router ni otra librería de routing sin justificación fuerte.
- Toda pantalla nueva se agrega a `flowScreens`, `modalScreens` o al `if (activeTab === ...)` en `App.jsx`. Si no se agrega, no se ejecuta.
- Toda pantalla nueva debe tener un `ErrorBoundary` implícito heredado del wrapper en `App.jsx`. No agregar ErrorBoundary propio.
- El cliente Supabase es un singleton en `src/lib/supabase.js`. Importarlo desde ahí, no crear instancias nuevas.
- Las operaciones CRUD se hacen directo desde el cliente con la anon key. No crear un backend intermedio ni API routes propias dentro del proyecto Vite.
- El campo de admin es **inconsistente** hoy: `Admin.jsx` y `AdminUsuarios.jsx` usan `role === 'admin'`, pero `Barrio.jsx` usa `user_type === 'admin'`. Antes de tocar lógica de admin, verificar cuál campo se está usando en cada pantalla y no mezclarlos.
- Los 3 archivos huérfanos `Home.jsx`, `Feed.jsx`, `Search.jsx` no deben modificarse salvo que se decida cablearlos al `App.jsx`. Si se mantienen huérfanos, no tienen efecto.
- No crear versiones paralelas de un mismo archivo (e.g. `Barrio_v2.jsx`, `Home_new.jsx`). Editar el existente.
- Toda función de IA nueva va en `src/lib/ia.js`. Toda función de horarios va en `src/lib/horarios.js`. No dispersar utilidades.

# Supabase

- Mantener compatibilidad.
- Tablas existentes confirmadas: `profiles`, `neighborhoods`, `posts`, `incident_reports`, `incident_confirmations`, `incident_flags`, `commerces`, `commerce_promos`, `farmacias`, `messages`, `comments`, `notifications`, `event_attendees`, `post_likes`. No renombrar ni eliminar.
- El único SQL de migración versionado es `supabase_fix_likes_views.sql` (crea `post_likes` + función `bump_view`). Cualquier cambio de schema nuevo debe acompañarse de un archivo `.sql` en la raíz del proyecto con su nombre descriptivo.
- Storage buckets en uso: `posts` (imágenes de posts, comercios y promos) y `commerces` (imágenes de comercios). No crear buckets nuevos sin justificación.
- Realtime se hace con `supabase.channel('postgres_changes')` nativo. No introducir Socket.io ni otra librería de sockets.
- Campos críticos ya en uso: `is_official` en `incident_reports` (admin marca desde `AdminIncidentes.jsx`), `verification_status` en `profiles` (`pending`/`verified`), `is_premium` en `commerces`, `opening_hours` jsonb en `commerces`.
- Cualquier nuevo campo debe añadirse con `ALTER TABLE` en un archivo `.sql` y documentarse acá.
- La anon key se usa desde el frontend. Si se introduce información sensible, debe protegerse con RLS en Supabase (no hay RLS documentada hoy).

# Mapas

- Mantener compatibilidad con Leaflet.
- `MiniMap.jsx` usa `leaflet` directo. `AdminComercios.jsx` usa `react-leaflet` (`MapContainer`, `TileLayer`, `Marker`, `useMapEvents`, `useMap`). No mezclar estilos entre ambos.
- Geolocalización del navegador (`navigator.geolocation`) se usa para reportes con lat/lng. Mantener ese patrón.
- No introducir Google Maps, Mapbox ni otro proveedor de mapas. Leaflet es el estándar del proyecto.

# Nuevas Pantallas

- Deben respetar patrones existentes.
- Toda pantalla nueva va en `src/screens/` y se importa en `App.jsx`. Si no se importa, no existe.
- Toda pantalla nueva recibe `currentUser` y `onNavigate` como props mínimas, igual que el resto.
- Toda pantalla nueva carga sus datos con `useEffect` desde Supabase; no hay estado global compartido salvo `user`, `profile`, `noLeidos` (en `App.jsx`).
- El header sigue el patrón de `TopBar` o el header inline con botón back circular (40x40, radio 50%, fondo `C.fondo`, border `C.borde`).
- Toda pantalla nueva debe respetar el padding superior de safe-area (`paddingTop: 30` para pantallas tab, `0` para modales con header propio).
- Si la pantalla es modal (sub-pantalla sobre main), agregarla al array `modalScreens` en `App.jsx`. Si es tab nuevo, agregarlo al `tabMap` y al `TABS` en `TabBar.jsx`.
- No crear pantallas duplicadas: antes de crear `XDetail.jsx` o `XList.jsx`, verificar si ya existe una pantalla equivalente.

# Bugs

- Priorizar reproducir antes de corregir.
- Antes de tocar código, identificar el archivo exacto donde ocurre el bug (con número de línea).
- Si el bug está en una pantalla huérfana (`Home.jsx`, `Feed.jsx`, `Search.jsx`), el bug no existe para el usuario final. Documentar y dejar.
- Si el bug es de inconsistencia `role` vs `user_type`, no parchear uno solo: decidir cuál campo es el canónico y migrar todas las pantallas.
- Si el bug es de Supabase (404 tabla, permiso denegado), primero verificar que la tabla/función exista en el SQL de migración. Si no está, crear el SQL antes de tocar el cliente.
- Todo fix debe probarse en el navegador dentro del phone-frame, no solo inspeccionando el código.

# Archivos

- Trabajar únicamente sobre la fuente oficial de verdad: `/home/z/my-project/app-source/elbarrio/`.
- No trabajar sobre `upload/`, `uploaded/`, `tool-results/`, `examples/`, `src/` (raíz sandbox), `public/` (raíz sandbox), `prisma/`, `db/`, `.zscripts/`, `mini-services/`. Esas son infraestructura de sandbox o snapshots históricos.
- Antes de editar un archivo, confirmar su ruta completa dentro de `app-source/elbarrio/`.
- Si se detecta un duplicado (mismo nombre en otra carpeta), ignorar la copia y editar solo la versión oficial.
- El `.env` está en `app-source/elbarrio/.env` con `VITE_SUPABASE_URL`, `VITE_SUPABASE_KEY`, `VITE_OPENROUTER_API_KEY`. No moverlo, no commitearlo.
- Los docs del proyecto viven en `/home/z/my-project/docs/`. No crear docs sueltos en la raíz.
