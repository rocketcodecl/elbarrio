# Proyecto

**El Barrio** es una aplicación móvil hiperlocal chilena. [CONFIRMADO]

Es una app web construida con Vite + React 19 que se renderiza dentro de un "phone frame" (marco de teléfono) en pantallas desktop, simulando una app nativa. [CONFIRMADO]

El `package.json` declara `"name": "elbarrio"` y `"private": true`. [CONFIRMADO]

El sistema de diseño (`src/lib/design.js`) establece como regla de oro: "esto lo usa la vecina de 65 años que escribe 'por el guasap'". Cálido, no minimalista, con emojis, texto grande (mínimo 13px) y pocas cosas por tarjeta. [CONFIRMADO]

Conecta a un backend Supabase (PostgreSQL + Auth + Storage + Realtime). [CONFIRMADO]

# Objetivo

Conectar vecinos de un mismo barrio para: [CONFIRMADO]

- Pedir ayuda y ofrecer ayuda entre vecinos (motor del negocio, según `TabBar.jsx`) [CONFIRMADO]
- Vender, regalar e intercambiar cosas (mercado vecinal) [CONFIRMADO]
- Publicar y consultar alertas del barrio (oficiales y de vecinos) [CONFIRMADO]
- Consultar comercios y promociones del barrio, con estado "abierto ahora" [CONFIRMADO]
- Ver y participar en eventos vecinales [CONFIRMADO]
- Chatear en tiempo real con otros vecinos (comprador↔vendedor) [CONFIRMADO]
- Recibir notificaciones y leer noticias del barrio [CONFIRMADO]
- Permitir a un administrador gestionar farmacias de turno, comercios, usuarios e incidentes [CONFIRMADO]

# Usuarios

**Vecinos verificados** — usuarios comunes que viven en un barrio. [CONFIRMADO]
- Se registran con email + password (Supabase Auth `signUp`) [CONFIRMADO]
- Completan perfil con `full_name`, `rut`, dirección y comuna [CONFIRMADO]
- Pasan por verificación (`verification_status`): `pending` → `verified` [CONFIRMADO]
- Pertenecen a un `neighborhood_id` [CONFIRMADO]

**Administradores** — usuarios con permisos especiales. [CONFIRMADO]
- Gestionan farmacias, comercios, usuarios e incidentes [CONFIRMADO]
- Marcan alertas como oficiales (`is_official = true`) [CONFIRMADO]
- **Inconsistencia detectada**: en `Admin.jsx` y `AdminUsuarios.jsx` se usa el campo `role === 'admin'`, pero en `Barrio.jsx` se usa `user_type === 'admin'`. No hay unificación. [CONFIRMADO]

**No autenticados** — ven Splash → Onboarding → Register. [CONFIRMADO]

# Stack

**Frameworks y librerías realmente usados** (según `package.json`): [CONFIRMADO]

- `react` ^19.2.7 [CONFIRMADO]
- `react-dom` ^19.2.7 [CONFIRMADO]
- `@supabase/supabase-js` ^2.110.7 [CONFIRMADO]
- `leaflet` ^1.9.4 [CONFIRMADO]
- `react-leaflet` ^5.0.0 [CONFIRMADO]
- `vite` ^8.1.1 (dev) [CONFIRMADO]
- `@vitejs/plugin-react` ^6.0.3 (dev) [CONFIRMADO]
- `eslint` ^10.6.0 (dev) [CONFIRMADO]

**Servicios externos**: [CONFIRMADO]

- **Supabase** (PostgreSQL + Auth + Storage + Realtime) — URL y key en `.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_KEY`) [CONFIRMADO]
- **OpenRouter** — agregador de modelos LLM con visión, usado en `src/lib/ia.js` para autocompletar publicaciones desde una foto. Requiere `VITE_OPENROUTER_API_KEY`. [CONFIRMADO]

**NO se usan** (no aparecen en `package.json` ni en imports): [CONFIRMADO]

- Socket.io (la realtime usa `supabase.channel()` nativo, no socket.io) [CONFIRMADO]
- React Router (la navegación es por estado interno en `App.jsx`) [CONFIRMADO]
- Tailwind CSS, shadcn/ui, Next.js, Prisma, Zustand, TanStack Query (no están en `package.json`) [CONFIRMADO]

# Arquitectura

**Patrón**: SPA (Single Page App) sin router. Toda la navegación vive en el estado de `App.jsx` (`currentScreen`, `activeTab`, `params`). [CONFIRMADO]

**Entry**: `src/main.jsx` → `src/App.jsx`. [CONFIRMADO]

**Flujo de pantallas** (en `App.jsx`): [CONFIRMADO]

1. `flowScreens`: splash → onboarding → register → profile → verification → complete [CONFIRMADO]
2. `main` (tab bar visible): 8 valores posibles de `activeTab` (inicio, mercado, servicios, eventos, chat, comercios, alertas, perfil) [CONFIRMADO]
3. `modalScreens` (sub-pantallas sobre el main): productDetail, chatConversation, dealDone, alertaDetail, notificaciones, sellerProfile, noticiasScreen, admin, adminFarmacias, adminComercios, adminUsuarios, adminIncidentes [CONFIRMADO]

**TabBar visible** (en `src/components/TabBar.jsx`): solo 5 tabs visibles — `inicio`, `mercado`, `servicios`, `eventos`, `chat`. Los demás `activeTab` (comercios, alertas, perfil) se alcanzan por otros UI elements (avatar, accesos rápidos), no por la barra. [CONFIRMADO]

**Botón "+" flotante** con menú de 7 formas de crear: `request`, `sell`, `gift`, `trade`, `alert`, `event`, `general`. [CONFIRMADO]

**Estado global**: no hay. Cada pantalla carga sus propios datos desde Supabase con `useEffect`. El único estado "global" vive en `App.jsx`: `user`, `profile`, `currentScreen`, `activeTab`, `noLeidos`. [CONFIRMADO]

**Realtime**: usa `supabase.channel('postgres_changes')` nativo en: `App.jsx` (contador mensajes no leídos), `ChatList.jsx`, `AlertaDetail.jsx`, `Notifications.jsx`. [CONFIRMADO]

**ErrorBoundary**: `App.jsx` define un `ErrorBoundary` que atrapa errores de render y muestra un mensaje rojo en pantalla en vez de dejar la app en blanco. [CONFIRMADO]

**Phone frame**: la app se renderiza dentro de un `.phone-frame` con `.phone-notch` y `.phone-home-indicator` (CSS en `App.css` / `index.css`). [CONFIRMADO]

# Pantallas

Lista de archivos en `src/screens/` (30 archivos): [CONFIRMADO]

**Pantallas activas (importadas por `App.jsx`)** — 27: [CONFIRMADO]

- `Splash.jsx` — pantalla inicial [CONFIRMADO]
- `Onboarding.jsx` — explicación de la app [CONFIRMADO]
- `Register.jsx` — registro/login con Supabase Auth (`signUp`, `signInWithPassword`) [CONFIRMADO]
- `Profile.jsx` — completar perfil (nombre, RUT) [CONFIRMADO]
- `Verification.jsx` — verificar domicilio (address, comuna → `verification_status: 'pending'` o `'verified'`) [CONFIRMADO]
- `Complete.jsx` — pantalla de bienvenida post-verificación [CONFIRMADO]
- `Barrio.jsx` — **tab "inicio"** (radar del barrio: pedidos, alertas, mercado, actividad, eventos). Es la pantalla principal. [CONFIRMADO]
- `Marketplace.jsx` — tab "mercado" [CONFIRMADO]
- `Services.jsx` — tab "servicios" [CONFIRMADO]
- `Events.jsx` — tab "eventos" [CONFIRMADO]
- `ChatList.jsx` — tab "chat" [CONFIRMADO]
- `ChatConversation.jsx` — conversación 1-a-1 [CONFIRMADO]
- `Comercios.jsx` — listado de comercios del barrio [CONFIRMADO]
- `Alertas.jsx` — listado de alertas [CONFIRMADO]
- `MyProfile.jsx` — tab "perfil" [CONFIRMADO]
- `CreatePost.jsx` — modal universal para crear 7 tipos de publicación (request, sell, gift, trade, alert, event, general) [CONFIRMADO]
- `ProductDetail.jsx` — detalle de post del mercado [CONFIRMADO]
- `DealDone.jsx` — confirmación de transacción [CONFIRMADO]
- `AlertaDetail.jsx` — detalle de alerta con comentarios realtime [CONFIRMADO]
- `Notifications.jsx` — notificaciones del usuario con realtime [CONFIRMADO]
- `SellerProfile.jsx` — perfil público de un vendedor [CONFIRMADO]
- `Noticias.jsx` — noticias del barrio [CONFIRMADO]
- `Admin.jsx` — panel admin (gate: `role === 'admin'`) [CONFIRMADO]
- `AdminFarmacias.jsx` — CRUD farmacias de turno [CONFIRMADO]
- `AdminComercios.jsx` — gestión comercios (con mapa Leaflet) [CONFIRMADO]
- `AdminUsuarios.jsx` — gestión usuarios (cambiar role vecino↔admin) [CONFIRMADO]
- `AdminIncidentes.jsx` — gestión incidentes (marcar `is_official`, cambiar status) [CONFIRMADO]

**Pantallas huérfanas (NO importadas por `App.jsx`)** — 3: [CONFIRMADO]

- `Home.jsx` — tiene su propia lógica `is_official` pero **no se usa en la app**. Existe como archivo pero ningún import lo referencia. [CONFIRMADO]
- `Feed.jsx` — versión vieja del feed, **no se usa**. [CONFIRMADO]
- `Search.jsx` — pantalla de búsqueda, **no se usa**. [CONFIRMADO]

# Componentes

Lista de archivos en `src/components/` (9 archivos): [CONFIRMADO]

- `TabBar.jsx` — barra inferior de navegación con 5 tabs + botón "+" flotante [CONFIRMADO]
- `TopBar.jsx` — cabecera superior reutilizable [CONFIRMADO]
- `MiniMap.jsx` — mapa Leaflet embebido (importa `leaflet` directo) [CONFIRMADO]
- `PostCard.jsx` — tarjeta de post del mercado [CONFIRMADO]
- `PedidoCard.jsx` — tarjeta de pedido de ayuda [CONFIRMADO]
- `CommerceForm.jsx` — form para crear/editar comercio (usa Storage bucket `posts`) [CONFIRMADO]
- `PromoForm.jsx` — form para crear promoción (usa Storage bucket `posts`) [CONFIRMADO]
- `AvisoForm.jsx` — form para crear aviso [CONFIRMADO]
- `Stepper.jsx` — componente de pasos (probablemente para el flujo de registro/verificación) [CONFIRMADO]

# Servicios

**Backend como servicio**: Supabase. [CONFIRMADO]

Configuración en `src/lib/supabase.js`: [CONFIRMADO]

- `createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })` [CONFIRMADO]
- Si faltan las env vars, cae a placeholders y muestra warning en consola (no crashea) [CONFIRMADO]

**APIs externas**: [CONFIRMADO]

- **OpenRouter** (`https://openrouter.ai/api/v1/chat/completions`) — llamado vía `fetch()` en `src/lib/ia.js` para autocompletar publicaciones desde foto. Sin SDK, fetch directo. [CONFIRMADO]

**Módulos internos en `src/lib/`** (4 archivos): [CONFIRMADO]

- `supabase.js` — cliente Supabase singleton [CONFIRMADO]
- `design.js` — sistema de diseño unificado: colores (`C`), tipografía (`T`), estilos (`S`), tipos de post (`TIPOS`), categorías de reportes (`REPORTES`), farmacias (`FARMACIAS`), rubros comerciales (`COMERCIOS`, `COMERCIOS_CATS`), accesos, badges y helpers (`iniciales`, `hace`, `plata`, `distancia`, `saludo`). [CONFIRMADO]
- `horarios.js` — cálculo de "abierto ahora" para comercios (parsea JSON `opening_hours`) [CONFIRMADO]
- `ia.js` — integración con OpenRouter para visión (autocompletar post desde foto) [CONFIRMADO]

**NO hay API routes propias**: la app consume Supabase directamente desde el cliente. No hay servidor intermedio. [CONFIRMADO]

# Base de Datos

Tablas de Supabase detectadas por uso en el código (supabase.from('tabla')):

| Tabla | Uso | Confirmación |
|---|---|---|
| `profiles` | Perfil de usuario (full_name, rut, address, comuna, neighborhood_id, role, user_type, verification_status, verified, verified_at) | [CONFIRMADO] |
| `neighborhoods` | Barrios geolocalizados | [CONFIRMADO] |
| `posts` | Publicaciones del mercado (vender, regalar, trueque, pedir ayuda, eventos, general) | [CONFIRMADO] |
| `incident_reports` | Alertas / incidentes (reporter_id, neighborhood_id, category, description, title, lat, lng, location_text, images, status, confirms_count, flags_count, severity, is_official, expires_at, resolved_at, resolved_by, is_anonymous) | [CONFIRMADO] |
| `incident_confirmations` | Confirmaciones de incidentes por otros vecinos | [CONFIRMADO] |
| `incident_flags` | Reportes de incidentes falsos/inapropiados | [CONFIRMADO] |
| `commerces` | Comercios del barrio (con `opening_hours` jsonb, `is_premium`) | [CONFIRMADO] |
| `commerce_promos` | Promociones temporales de comercios | [CONFIRMADO] |
| `farmacias` | Farmacias de turno (CRUD admin) | [CONFIRMADO] |
| `messages` | Mensajes de chat (sender_id, receiver_id, post_id, content, read, created_at) | [CONFIRMADO] |
| `comments` | Comentarios en posts e incidentes (con `post_id` o `incident_id`) | [CONFIRMADO] |
| `notifications` | Notificaciones push in-app (user_id, from_user_id, created_at, read) | [CONFIRMADO] |
| `event_attendees` | Inscripción a eventos | [CONFIRMADO] |
| `post_likes` | Likes en posts (PK compuesta post_id + user_id) — creada por `supabase_fix_likes_views.sql` | [CONFIRMADO] |

**Funciones RPC**: [CONFIRMADO]

- `bump_view(p_post_id)` — suma 1 vista a un post (definida en `supabase_fix_likes_views.sql`) [CONFIRMADO]

**Storage buckets**: [CONFIRMADO]

- `posts` — imágenes de posts y comercios (subido desde `CreatePost.jsx`, `CommerceForm.jsx`, `PromoForm.jsx`) [CONFIRMADO]
- `commerces` — imágenes de comercios (subido desde `AdminComercios.jsx`) [CONFIRMADO]

**SQL de migración presente**: `supabase_fix_likes_views.sql` en raíz del proyecto. Crea `post_likes` y la función `bump_view`. [CONFIRMADO]

**Realtime channels** (suscripciones `postgres_changes`): [CONFIRMADO]

- `app-unread` — mensajes no leídos (en `App.jsx`) [CONFIRMADO]
- `realtime-chatlist` — lista de chats (en `ChatList.jsx`) [CONFIRMADO]
- `alerta-detail-${alertId}` — comentarios de una alerta (en `AlertaDetail.jsx`) [CONFIRMADO]
- `notif-${currentUser.id}` — notificaciones del usuario (en `Notifications.jsx`) [CONFIRMADO]

# Funcionalidades Implementadas

Solo verificadas en el código:

- [CONFIRMADO] Autenticación con Supabase Auth (email + password), persistencia de sesión y manejo de `onAuthStateChange`
- [CONFIRMADO] Flujo de onboarding → registro → completar perfil → verificación de domicilio → completo
- [CONFIRMADO] Feed principal en tab "inicio" (`Barrio.jsx`) con secciones: pedidos vecinales, alertas, mercado, actividad del barrio, eventos
- [CONFIRMADO] Creación de 7 tipos de publicación desde el botón "+" (request, sell, gift, trade, alert, event, general) vía `CreatePost.jsx`
- [CONFIRMADO] Subida de imágenes a Storage bucket `posts` con `getPublicUrl`
- [CONFIRMADO] Mercado con detalle de producto (`ProductDetail.jsx`), likes (`post_likes`), comentarios, contacto al vendedor via chat
- [CONFIRMADO] Chat 1-a-1 con realtime (`ChatList.jsx` + `ChatConversation.jsx`) y contador de no leídos
- [CONFIRMADO] Alertas: creación por vecinos (`incident_reports`), confirmaciones (`incident_confirmations`), flags (`incident_flags`), detalle con comentarios realtime (`AlertaDetail.jsx`)
- [CONFIRMADO] Distinción `is_official` en incidentes: el admin puede marcar/desmarcar desde `AdminIncidentes.jsx`. En `Barrio.jsx` se filtran las oficiales para mostrarlas arriba. En `Noticias.jsx` se filtran las oficiales para la sección oficial.
- [CONFIRMADO] Comercios con horarios y estado "abierto ahora" (`horarios.js`), promociones temporales, comercios destacados (`is_premium`)
- [CONFIRMADO] Eventos con inscripción (`event_attendees`)
- [CONFIRMADO] Notificaciones in-app con realtime (`Notifications.jsx`)
- [CONFIRMADO] Noticias del barrio (`Noticias.jsx`)
- [CONFIRMADO] Mapa Leaflet embebido (`MiniMap.jsx`) y mapa interactivo en `AdminComercios.jsx` (`react-leaflet`)
- [CONFIRMADO] Geolocalización del navegador (`navigator.geolocation`) para reportes con lat/lng
- [CONFIRMADO] Panel admin gateado por `role === 'admin'` con 4 subpaneles: farmacias, comercios, usuarios, incidentes
- [CONFIRMADO] Cambio de role vecino↔admin desde `AdminUsuarios.jsx`
- [CONFIRMADO] Autocompletar publicación desde foto con OpenRouter (`lib/ia.js`)
- [CONFIRMADO] Perfil de vendedor público (`SellerProfile.jsx`)
- [CONFIRMADO] Pantalla de confirmación de transacción (`DealDone.jsx`)
- [CONFIRMADO] ErrorBoundary global que atrapa errores de render

# Funcionalidades Pendientes

Solo verificadas como faltantes o rotas en el código actual:

- [CONFIRMADO] **`Home.jsx`, `Feed.jsx` y `Search.jsx` están huérfanas**: ningún import las referencia. Representan código muerto. Si la intención es que sean la pantalla de inicio o la de búsqueda, no están cableadas.
- [CONFIRMADO] **Inconsistencia en el campo de role**: `Admin.jsx` y `AdminUsuarios.jsx` usan `role === 'admin'` (y actualizan `role`), pero `Barrio.jsx` usa `user_type === 'admin'`. Un usuario marcado como admin por una vía puede no ser reconocido como admin por la otra.
- [CONFIRMADO] **No hay pantalla de búsqueda integrada** (`Search.jsx` existe pero no se usa).
- [CONFIRMADO] **No hay migrations SQL completas en el repo**: solo existe `supabase_fix_likes_views.sql` para `post_likes` y `bump_view`. El resto del schema (profiles, posts, incident_reports, etc.) se asume ya creado en Supabase, pero no hay archivo que lo documente o reproduzca.
- [CONFIRMADO] **No hay RLS (Row Level Security) visible** en el código SQL del repo. Toda la lectura/escritura se hace con la anon key del cliente; no se evidencian políticas de seguridad.
- [CONFIRMADO] **No hay tests**: ningún archivo de test existe en el proyecto.
- [INFERIDO] **No hay internacionalización**: el texto es hardcodeado en español chileno. No hay i18n.
- [CONFIRMADO] **No hay manejo de offline / cache**: la app requiere conexión constante a Supabase.
- [CONFIRMADO] **No hay build mobile nativo**: es una web app. No se encontró configuración de Capacitor, Cordova, React Native o PWA en `package.json`.

# Riesgos Técnicos

Problemas observados en el código:

1. [CONFIRMADO] **Duplicación de versiones de archivos**: `Barrio.jsx` y `Feed.jsx` existen en 3 ubicaciones (`app-source/`, `upload/`, `uploaded/elbarrio.zip`) con contenido divergente. Riesgo de trabajar sobre la versión equivocada.

2. [CONFIRMADO] **3 pantallas huérfanas** (`Home.jsx`, `Feed.jsx`, `Search.jsx`): código mantenido (con lógica `is_official` en `Home.jsx`) que no se ejecuta nunca. Riesgo de confusión sobre qué archivo es el "real".

3. [CONFIRMADO] **Inconsistencia `role` vs `user_type`**: dos campos distintos se usan para decidir si un usuario es admin. Puede provocar que un admin no vea su panel o que un no-admin lo vea.

4. [CONFIRMADO] **Cliente Supabase con anon key en el frontend**: todas las operaciones CRUD se hacen desde el navegador con la anon key. Sin RLS documentada, cualquier usuario podría leer/escribir cualquier fila.

5. [CONFIRMADO] **`.env` en el repo de código** (aunque está en `.gitignore` según el zip, el archivo existe físicamente en `app-source/elbarrio/.env`). Las claves Supabase y OpenRouter están en texto plano.

6. [CONFIRMADO] **OpenRouter con límite diario gratis**: `lib/ia.js` documenta que el límite diario gratis se agota y pide agregar USD $5 de crédito. Es un cuello de botella para la funcionalidad de autocompletar por foto.

7. [CONFIRMADO] **Sin router**: toda la navegación depende de un solo `useState` en `App.jsx`. Si el estado crece, se vuelve difícil de mantener. No hay URLs profundas ni back button del navegador.

8. [CONFIRMADO] **`supabase.js` cae a placeholders si faltan env vars**: si `.env` no carga, la app no crashea pero tampoco funciona — silenty falla. Solo hay un `console.warn`.

9. [CONFIRMADO] **No hay documentación del schema completo de Supabase**: solo `supabase_fix_likes_views.sql` está versionado. El resto del schema es implícito.

10. [CONFIRMADO] **Diseño "phone-frame" no es responsive real**: la app asume un viewport tipo teléfono. En desktop se ve un teléfono centrado, no una layout adaptativo.

# Fuente Oficial de Verdad

La carpeta que representa el proyecto real es:

```
/home/z/my-project/app-source/elbarrio/
```

[CONFIRMADO] Justificación:

- Único directorio con `package.json`, `vite.config.js`, `index.html`, `package-lock.json` y `.env` válidos.
- `"name": "elbarrio"` en `package.json`.
- Stack declarado coincide con los imports reales del código (React 19, Supabase, Leaflet).
- Fecha de modificación más reciente que `upload/` y `uploaded/elbarrio.zip`.
- Estructura interna coherente: 30 screens + 9 components + 4 lib + assets + public + config.

Carpetas que **NO** son el proyecto real: [CONFIRMADO]

- `upload/` — versiones viejas divergentes de `Barrio.jsx` y `Feed.jsx`.
- `uploaded/elbarrio.zip` — snapshot comprimido histórico (ya descomprimido en `app-source/`).
- `tool-results/`, `examples/`, `src/` (raíz), `public/` (raíz), `prisma/`, `db/`, `.zscripts/`, `mini-services/` — infraestructura del sandbox de preview, no del proyecto El Barrio.
