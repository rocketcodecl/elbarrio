# Árbol de directorios

```
/home/z/my-project/app-source/elbarrio/   ← FUENTE OFICIAL DE VERDAD
├── .env
├── .gitignore
├── README.md
├── QandA IA.rtf
├── eslint.config.js
├── index.html
├── package.json
├── package-lock.json
├── vite.config.js
├── supabase_fix_likes_views.sql
├── public/
│   ├── favicon.svg
│   ├── icons.svg
│   └── isotipo.png
└── src/
    ├── App.css
    ├── App.jsx
    ├── index.css
    ├── main.jsx
    ├── assets/
    │   ├── hero.png
    │   ├── react.svg
    │   └── vite.svg
    ├── components/    (9 archivos)
    │   ├── AvisoForm.jsx
    │   ├── CommerceForm.jsx
    │   ├── MiniMap.jsx
    │   ├── PedidoCard.jsx
    │   ├── PostCard.jsx
    │   ├── PromoForm.jsx
    │   ├── Stepper.jsx
    │   ├── TabBar.jsx
    │   └── TopBar.jsx
    ├── lib/           (4 archivos)
    │   ├── design.js
    │   ├── horarios.js
    │   ├── ia.js
    │   └── supabase.js
    └── screens/       (30 archivos)
        ├── Admin.jsx
        ├── AdminComercios.jsx
        ├── AdminFarmacias.jsx
        ├── AdminIncidentes.jsx
        ├── AdminUsuarios.jsx
        ├── AlertaDetail.jsx
        ├── Alertas.jsx
        ├── Barrio.jsx
        ├── ChatConversation.jsx
        ├── ChatList.jsx
        ├── Comercios.jsx
        ├── Complete.jsx
        ├── CreatePost.jsx
        ├── DealDone.jsx
        ├── Events.jsx
        ├── Feed.jsx              ← HUÉRFANA
        ├── Home.jsx              ← HUÉRFANA
        ├── Marketplace.jsx
        ├── MyProfile.jsx
        ├── Noticias.jsx
        ├── Notifications.jsx
        ├── Onboarding.jsx
        ├── ProductDetail.jsx
        ├── Profile.jsx
        ├── Register.jsx
        ├── Search.jsx            ← HUÉRFANA
        ├── SellerProfile.jsx
        ├── Services.jsx
        ├── Splash.jsx
        └── Verification.jsx
```

# Screens

**Propósito**: contener las 30 pantallas de la app. Cada archivo es una pantalla completa, autocontenida, que recibe `currentUser` y `onNavigate` y carga sus propios datos desde Supabase.

**Dependencia**: importadas por `src/App.jsx`. Las pantallas importan entre sí (`CreatePost.jsx` importado por `Barrio.jsx` y `Feed.jsx`), de `../lib/supabase`, `../lib/design`, `../lib/horarios`, y de `../components/`.

**Importancia**: crítica. Sin estos archivos no hay app.

### Pantallas activas (27 — importadas por `App.jsx`)

**Flujo de login/verificación** (6):
- `Splash.jsx` — pantalla inicial.
- `Onboarding.jsx` — explicación.
- `Register.jsx` — registro/login (Supabase Auth).
- `Profile.jsx` — completar perfil (nombre, RUT).
- `Verification.jsx` — verificar domicilio.
- `Complete.jsx` — bienvenida post-verificación.

**Tabs principales** (8):
- `Barrio.jsx` — tab "inicio" (radar del barrio, feed principal).
- `Marketplace.jsx` — tab "mercado".
- `Services.jsx` — tab "servicios".
- `Events.jsx` — tab "eventos".
- `ChatList.jsx` — tab "chat".
- `Comercios.jsx` — listado de comercios (alcanzable por accesos rápidos).
- `Alertas.jsx` — listado de alertas.
- `MyProfile.jsx` — tab "perfil".

**Sub-pantallas modales** (13):
- `CreatePost.jsx` — modal universal de 7 tipos de publicación.
- `ProductDetail.jsx` — detalle de post del mercado.
- `ChatConversation.jsx` — conversación 1-a-1.
- `DealDone.jsx` — confirmación de transacción.
- `AlertaDetail.jsx` — detalle de alerta con realtime.
- `Notifications.jsx` — notificaciones con realtime.
- `SellerProfile.jsx` — perfil público de vendedor.
- `Noticias.jsx` — noticias del barrio.
- `Admin.jsx` — panel admin.
- `AdminFarmacias.jsx` — CRUD farmacias.
- `AdminComercios.jsx` — gestión comercios con mapa.
- `AdminUsuarios.jsx` — gestión usuarios.
- `AdminIncidentes.jsx` — gestión incidentes (marca `is_official`).

### Pantallas huérfanas (3 — NO importadas por `App.jsx`)

- `Home.jsx` — tiene lógica `is_official` pero no se ejecuta.
- `Feed.jsx` — versión vieja del feed.
- `Search.jsx` — pantalla de búsqueda.

# Components

**Propósito**: componentes reutilizables transversales a las pantallas.

**Dependencia**: importados por pantallas según necesidad.

**Importancia**: alta. Centralizan UI repetitiva.

### Listado (9 archivos)

- `TabBar.jsx` — barra inferior con 5 tabs + botón "+" de 7 acciones. Importa `C`, `T`, `TIPOS` de `../lib/design`.
- `TopBar.jsx` — cabecera superior reutilizable.
- `MiniMap.jsx` — mapa Leaflet embebido (importa `leaflet` directo, no `react-leaflet`).
- `PostCard.jsx` — tarjeta de post del mercado.
- `PedidoCard.jsx` — tarjeta de pedido de ayuda.
- `CommerceForm.jsx` — form modal para crear/editar comercio. Sube imágenes a Storage bucket `posts`.
- `PromoForm.jsx` — form modal para crear promoción. Sube imágenes a Storage bucket `posts`.
- `AvisoForm.jsx` — form modal para crear aviso.
- `Stepper.jsx` — indicador de pasos para flujos multi-step.

# Lib

**Propósito**: módulos utilitarios y de configuración. Punto único de definición para Supabase, diseño, horarios e IA.

**Dependencia**: importados por casi toda pantalla.

**Importancia**: crítica. Es la base compartida.

### Listado (4 archivos)

- `supabase.js` — cliente Supabase singleton. Lee `VITE_SUPABASE_URL` y `VITE_SUPABASE_KEY` de `.env`. Cae a placeholders con `console.warn` si faltan.
- `design.js` — sistema de diseño unificado. Exporta `C` (colores), `T` (tipografía), `S` (estilos), `TIPOS` (7 tipos de post), `REPORTES` (categorías de incidentes), `FARMACIAS`, `COMERCIOS`, `COMERCIOS_CATS`, `ACCESOS`, `BADGES`, y helpers (`iniciales`, `hace`, `plata`, `distancia`, `saludo`).
- `horarios.js` — cálculo de "abierto ahora" para comercios. Parsea JSON `opening_hours`.
- `ia.js` — integración OpenRouter para autocompletar publicación desde foto. Requiere `VITE_OPENROUTER_API_KEY`. Fetch directo a `https://openrouter.ai/api/v1/chat/completions`.

# Assets

**Propósito**: recursos estáticos visuales.

**Dependencia**: referenciados desde pantallas y `index.html`.

**Importancia**: baja (estética).

### Listado (3 archivos en `src/assets/`)

- `hero.png` — imagen hero (onboarding/splash).
- `react.svg` — logo React (default Vite).
- `vite.svg` — logo Vite (default Vite).

### Adicionales en `public/`

- `favicon.svg`, `icons.svg`, `isotipo.png` — branding.

# Services

**Propósito**: integraciones con servicios externos.

**Dependencia**: desde `lib/` y pantallas.

**Importancia**: alta.

### Servicios detectados

1. **Supabase** (PostgreSQL + Auth + Storage + Realtime) — definido en `lib/supabase.js`, consumido en 24 pantallas.
   - Auth: `signUp`, `signInWithPassword`, `signOut`, `getSession`, `onAuthStateChange`.
   - Realtime: `supabase.channel('postgres_changes')` en `App.jsx`, `ChatList.jsx`, `AlertaDetail.jsx`, `Notifications.jsx`.
   - Storage: buckets `posts` y `commerces`.

2. **OpenRouter** — definido en `lib/ia.js`. Fetch directo, sin SDK. Usado para visión (autocompletar post desde foto).

### NO hay

- No hay API routes propias dentro del proyecto Vite.
- No hay backend intermedio.
- No hay Socket.io (la realtime es nativa de Supabase).
- No hay microservicios dentro de `app-source/elbarrio/`.

# Supabase

**Propósito**: backend completo (BD + Auth + Storage + Realtime).

**Dependencia**: desde toda la app vía `lib/supabase.js`.

**Importancia**: crítica. Sin Supabase la app no funciona.

### Tablas detectadas por uso (14)

| Tabla | Uso |
|---|---|
| `profiles` | Perfil usuario (full_name, rut, address, comuna, neighborhood_id, role, user_type, verification_status, verified, verified_at) |
| `neighborhoods` | Barrios geolocalizados |
| `posts` | Publicaciones (vender, regalar, trueque, pedir ayuda, eventos, general) |
| `incident_reports` | Alertas (reporter_id, neighborhood_id, category, description, title, lat, lng, location_text, images, status, confirms_count, flags_count, severity, is_official, expires_at, resolved_at, resolved_by, is_anonymous) |
| `incident_confirmations` | Confirmaciones de incidentes |
| `incident_flags` | Flags de incidentes falsos |
| `commerces` | Comercios (con `opening_hours` jsonb, `is_premium`) |
| `commerce_promos` | Promociones temporales |
| `farmacias` | Farmacias de turno |
| `messages` | Mensajes de chat (sender_id, receiver_id, post_id, content, read) |
| `comments` | Comentarios en posts e incidentes |
| `notifications` | Notificaciones in-app |
| `event_attendees` | Inscripción a eventos |
| `post_likes` | Likes en posts (PK compuesta) |

### Función RPC

- `bump_view(p_post_id)` — suma 1 vista a un post.

### SQL versionado

- `supabase_fix_likes_views.sql` (raíz) — crea `post_likes` + función `bump_view`. Es el único archivo SQL versionado.

### Storage buckets

- `posts` — imágenes de posts, comercios y promos.
- `commerces` — imágenes de comercios.

### Realtime channels

- `app-unread` (App.jsx) — mensajes no leídos.
- `realtime-chatlist` (ChatList.jsx) — lista de chats.
- `alerta-detail-${alertId}` (AlertaDetail.jsx) — comentarios de alerta.
- `notif-${currentUser.id}` (Notifications.jsx) — notificaciones.

# Utilidades

**Propósito**: funciones helper compartidas.

**Dependencia**: desde pantallas y componentes.

**Importancia**: alta. Evitan duplicación.

### Helpers en `lib/design.js`

- `iniciales(nombre)` — extrae iniciales de un nombre.
- `hace(fecha)` — formato relativo "hace X tiempo".
- `plata(monto)` — formato de moneda.
- `distancia(metros)` — formato de distancia.
- `saludo()` — saludo según hora del día.

### Helpers en `lib/horarios.js`

- `textoEstado(opening_hours)` — retorna "Abierto ahora" / "Cerrado".
- `estadoComercio(opening_hours)` — estado lógico del comercio.

### Helpers en `lib/ia.js`

- Funciones de autocompletar desde foto (OpenRouter).

### Helpers en pantallas

- `App.jsx` define `checkSession`, `recargarPerfil`, `handleLogout`, `onNavigate`, `onCrear`, `onChangeTab` — orquestación de navegación y auth.

# Carpetas activas

| Carpeta | Estado |
|---|---|
| `app-source/elbarrio/` | ✅ Activa — raíz del proyecto Vite |
| `app-source/elbarrio/src/screens/` | ✅ Activa — 30 pantallas (27 cableadas + 3 huérfanas) |
| `app-source/elbarrio/src/components/` | ✅ Activa — 9 componentes |
| `app-source/elbarrio/src/lib/` | ✅ Activa — 4 módulos utilitarios |
| `app-source/elbarrio/src/assets/` | ✅ Activa — recursos visuales |
| `app-source/elbarrio/public/` | ✅ Activa — branding estático |

# Carpetas obsoletas

| Carpeta | Razón |
|---|---|
| `upload/` | Versiones viejas divergentes de `Barrio.jsx` y `Feed.jsx`. Sin `package.json`. No ejecutable. |
| `uploaded/` | Solo `elbarrio.zip` — snapshot histórico ya descomprimido en `app-source/`. |
| `tool-results/` | Cache de lecturas de tools previas. Basura. |
| `examples/` | Demo WebSocket genérico ajeno al proyecto. |

# Carpetas sandbox

| Carpeta | Pertenece a |
|---|---|
| `src/` (raíz) | Next.js preview del sandbox |
| `public/` (raíz) | Static Next.js sandbox |
| `prisma/` | SQLite del sandbox |
| `db/` | BD SQLite del sandbox |
| `.zscripts/` | Scripts de arranque del sandbox |
| `mini-services/chat-service/` | Bun + socket.io del sandbox |
| `mini-services/downloads/` | Bun server de descargas del sandbox |

# Carpetas temporales

| Carpeta/archivo | Contenido |
|---|---|
| `tool-results/` | 5 archivos `.txt` cacheados |
| `dev.log` (raíz sandbox) | Log del servidor Next.js |
| `.zscripts/dev.log` | Log del sandbox |
| `.zscripts/dev.pid` | PID del proceso dev |
| `.zscripts/mini-service-chat-service.log` | Log del chat-service |
| `mini-services/downloads/log.txt` | Log del downloads-service |
| `.next/` (cuando existe) | Build cache Next.js |
