# SUPABASE_CONTEXT.md

Documento generado por análisis exclusivo del código fuente del proyecto **El Barrio**
(ruta: `/home/z/my-project/app-source/elbarrio/`).

Cada afirmación está marcada como:

- `[CONFIRMADO]` — existe evidencia directa en el código fuente, migraciones SQL o consultas.
- `[INFERIDO]` — se deduce del comportamiento del código pero no hay evidencia directa versionada.

No se inventaron tablas ni relaciones. Toda tabla listada aparece en al menos una
consulta `.from('<tabla>')` o en el archivo SQL versionado.

---

# Proyecto Supabase

- Cliente: `@supabase/supabase-js` v2.110.7 [CONFIRMADO — `package.json`]
- Cliente singleton en `src/lib/supabase.js` [CONFIRMADO]
- Configuración del cliente [CONFIRMADO — `src/lib/supabase.js`]:
  - `persistSession: true`
  - `autoRefreshToken: true`
  - `detectSessionInUrl: true`
  - URL y key desde `import.meta.env` (Vite)
  - Guard anti-undefined: si faltan las env vars usa `https://placeholder.supabase.co` y `placeholder-anon-key` (no crashea, solo warning en consola)
- Auth: Supabase Auth con email/password. Sesión persistida en localStorage. [CONFIRMADO — `App.jsx` usa `supabase.auth.getSession()`, `onAuthStateChange`, `signOut`]
- Realtime: habilitado vía `supabase.channel(...).on('postgres_changes', ...)` [CONFIRMADO]
- Storage: 3 buckets usados desde el cliente [CONFIRMADO]
- PostGIS: requerido [INFERIDO — `Verification.jsx` llama a `barrio_en_punto(p_lat, p_lng)` que valida si un punto cae dentro de un polígono de unidad vecinal; esto requiere PostGIS]
- Edge Functions: **ninguna** [CONFIRMADO — no existe carpeta `supabase/` ni `supabase/functions/` en el proyecto; el único procesamiento server-side externo es OpenRouter llamado directamente con `fetch` desde `src/lib/ia.js`]

---

# Tablas detectadas

15 tablas. Todas `[CONFIRMADO]` por uso en al menos una consulta `.from('<tabla>')`.

| # | Tabla | Evidencia |
|---|-------|-----------|
| 1 | `profiles` | `.from('profiles')` en App.jsx, Barrio.jsx, Feed.jsx, Admin.jsx, AdminUsuarios.jsx, AdminIncidentes.jsx, AdminFarmacias.jsx, AdminComercios.jsx, Alertas.jsx, Search.jsx, DealDone.jsx, CreatePost.jsx, ChatList.jsx, AlertaDetail.jsx, MyProfile.jsx, Complete.jsx, Services.jsx, Verification.jsx, Events.jsx, Comercios.jsx, ProductDetail.jsx, Profile.jsx, SellerProfile.jsx, Home.jsx, Marketplace.jsx, ChatConversation.jsx, Notifications.jsx |
| 2 | `neighborhoods` | `.from('neighborhoods')` en Feed.jsx, Admin.jsx, CreatePost.jsx, Complete.jsx, Home.jsx |
| 3 | `posts` | `.from('posts')` en Barrio.jsx, Feed.jsx, Admin.jsx, Search.jsx, DealDone.jsx, CreatePost.jsx, ChatList.jsx, AlertaDetail.jsx, MyProfile.jsx, Services.jsx, Noticias.jsx, Events.jsx, ProductDetail.jsx, SellerProfile.jsx, Home.jsx, Marketplace.jsx, ChatConversation.jsx, PromoForm.jsx |
| 4 | `incident_reports` | `.from('incident_reports')` en Barrio.jsx, Alertas.jsx, Admin.jsx, AdminIncidentes.jsx, CreatePost.jsx, AlertaDetail.jsx, Home.jsx |
| 5 | `incident_confirmations` | `.from('incident_confirmations')` en Barrio.jsx |
| 6 | `incident_flags` | `.from('incident_flags')` en Barrio.jsx |
| 7 | `commerces` | `.from('commerces')` en Barrio.jsx, Feed.jsx, Admin.jsx, Search.jsx, Comercios.jsx, AdminComercios.jsx, CommerceForm.jsx |
| 8 | `commerce_promos` | `.from('commerce_promos')` en Barrio.jsx, Admin.jsx, AdminComercios.jsx, PromoForm.jsx, SellerProfile.jsx |
| 9 | `farmacias` | `.from('farmacias')` en Admin.jsx, AdminFarmacias.jsx, Home.jsx |
| 10 | `messages` | `.from('messages')` en App.jsx, ChatList.jsx, ChatConversation.jsx, Home.jsx |
| 11 | `comments` | `.from('comments')` en AlertaDetail.jsx, ProductDetail.jsx |
| 12 | `notifications` | `.from('notifications')` en Notifications.jsx |
| 13 | `event_attendees` | `.from('event_attendees')` en Events.jsx |
| 14 | `post_likes` | `.from('post_likes')` en ProductDetail.jsx + `CREATE TABLE` en `supabase_fix_likes_views.sql` |
| 15 | `reviews` | `.from('reviews')` en SellerProfile.jsx (con manejo de error explícito: "Si la tabla reviews no existe o RLS bloquea, se muestra estado vacío amable — no rompe la pantalla") |

## Campos inferidos por tabla (de las consultas `select`/`insert`/`update`)

### `profiles` [CONFIRMADO por uso en queries]
- `id` [CONFIRMADO]
- `user_id` (FK → `auth.users.id`) [CONFIRMADO — todas las queries usan `.eq('user_id', user.id)`]
- `full_name` [CONFIRMADO]
- `rut` [CONFIRMADO — `Profile.jsx` hace `update({ rut })` y maneja error `23505` de duplicado]
- `phone` [CONFIRMADO]
- `avatar_url` [CONFIRMADO]
- `address` [CONFIRMADO — `Verification.jsx`]
- `comuna` [CONFIRMADO — `Verification.jsx`]
- `lat`, `lng` [CONFIRMADO — `Verification.jsx` update]
- `neighborhood_id` [CONFIRMADO — `Verification.jsx` update y `.eq('neighborhood_id', ...)`]
- `verified` (boolean) [CONFIRMADO — `Verification.jsx` `.eq('verified', true)`]
- `verification_status` (`'pending'` | `'verified'`) [CONFIRMADO — `Verification.jsx`]
- `verification_method` (`'gps_polygon'`) [CONFIRMADO — `Verification.jsx`]
- `verified_at` (timestamptz) [CONFIRMADO — `Verification.jsx`]
- `badge_founder` (boolean) [CONFIRMADO — `Verification.jsx` update]
- `founder_number` (int) [CONFIRMADO — `Verification.jsx` update]
- `role` (`'admin'` | `'vecino'`) [CONFIRMADO — `AdminUsuarios.jsx` `.update({ role: nuevo })`, `MyProfile.jsx` `profile?.role === 'admin'`]
- `user_type` (`'business'` | `'organization'` | `'service_provider'` | `'admin'`) [CONFIRMADO — `PostCard.jsx`, `Barrio.jsx` `currentProfile?.user_type === 'admin'`]
- `is_admin` (boolean) [CONFIRMADO — `Comercios.jsx` `profile?.is_admin`, `Noticias.jsx` mock]
- `is_operator` (boolean) [CONFIRMADO — `Comercios.jsx` `profile?.is_operator`]
- `reputation_score` [CONFIRMADO — `Search.jsx`, `Marketplace.jsx`, `ChatConversation.jsx`, `DealDone.jsx` select]
- `badge_trusted_seller` (boolean) [CONFIRMADO — `Search.jsx`, `Marketplace.jsx`, `Services.jsx`, `ProductDetail.jsx`]
- `member_since` [CONFIRMADO — `Search.jsx` select]
- `total_sales` [CONFIRMADO — `Search.jsx` select]
- `total_gifts` [CONFIRMADO — `Search.jsx` select]
- `rating` [CONFIRMADO — `SellerProfile.jsx` `Number(profile?.rating)`]
- `reviews_count` [CONFIRMADO — `SellerProfile.jsx` `Number(profile?.reviews_count)`]
- `commerce_id` (FK → `commerces.id`) [CONFIRMADO — `SellerProfile.jsx` `profile?.commerce_id`]
- `email` [CONFIRMADO — `DealDone.jsx` select]
- `total_members` [CONFIRMADO — `Verification.jsx` lee `neighborhood.total_members` (campo de `neighborhoods`, no `profiles`)]

> **Inconsistencia de rol [CONFIRMADO]**: el proyecto usa **3 campos distintos** para
> representar rol de usuario: `role` (Admin.jsx, AdminUsuarios.jsx, AdminIncidentes.jsx,
> AdminFarmacias.jsx, AdminComercios.jsx, MyProfile.jsx), `user_type` (Barrio.jsx,
> PostCard.jsx) y `is_admin`/`is_operator` (Comercios.jsx, Noticias.jsx).
> Solo uno de ellos debería ser la fuente de verdad.

### `neighborhoods` [CONFIRMADO]
- `id` [CONFIRMADO]
- `name` [CONFIRMADO — `Verification.jsx` `neighborhood.name`]
- `uv_code` [CONFIRMADO — `Verification.jsx` `neighborhood.uv_code`]
- `is_beta` (boolean) [CONFIRMADO — `Verification.jsx` `neighborhood.is_beta`]
- `total_members` (int) [CONFIRMADO — `Verification.jsx` `neighborhood.total_members`]
- Tiene polígono geográfico (PostGIS) [INFERIDO — la RPC `barrio_en_punto` devuelve el barrio cuyo polígono contiene el punto]

### `posts` [CONFIRMADO]
- `id` [CONFIRMADO]
- `author_id` (FK → `profiles.id`) [CONFIRMADO — insert en `Barrio.jsx`, joins `profiles!author_id`]
- `neighborhood_id` (FK → `neighborhoods.id`) [CONFIRMADO — insert en `Barrio.jsx`]
- `type` (`'alert'` | `'sell'` | `'gift'` | `'trade'` | `'service'` | `'need'` | `'event'` | otros) [CONFIRMADO — `Barrio.jsx` insert `type: 'alert'`, `Marketplace.jsx` filtra `ALL_ALTS` que incluye sell/gift/trade]
- `is_official` (boolean) [CONFIRMADO — `Barrio.jsx` insert `is_official: true`]
- `urgency` (`'high'` | `'medium'` | otros) [CONFIRMADO — `Barrio.jsx` insert]
- `title` [CONFIRMADO]
- `content` [CONFIRMADO]
- `status` (`'active'` | `'sold'` | `'closed'` | otros) [CONFIRMADO — `Marketplace.jsx` `.eq('status', 'active')`, `SellerProfile.jsx` `.in('status', ['sold', 'closed'])`]
- `category` [CONFIRMADO — `Barrio.jsx` insert]
- `views` (int) [CONFIRMADO — `supabase_fix_likes_views.sql` `set views = coalesce(views, 0) + 1`]
- `views_count` (int) [CONFIRMADO — `ProductDetail.jsx` comentario "Contador de vistas: incrementa views_count"]
  - **Posible doble columna** `views` + `views_count` [INFERIDO — el SQL manipula `views`, el comentario en ProductDetail.jsx menciona `views_count`; pueden ser la misma columna renombrada o dos columnas distintas]
- `likes_count` (int) [CONFIRMADO — `ProductDetail.jsx` llama `rpc('sync_likes_count')` para sincronizarlo]
- `created_at` (timestamptz) [CONFIRMADO — `.order('created_at', ...)` en múltiples pantallas]
- `lat`, `lng` [CONFIRMADO — `Marketplace.jsx` select incluye `lat, lng`]
- `image_url` / imágenes [INFERIDO — `CreatePost.jsx` sube a bucket `posts` y guarda URL]

### `incident_reports` [CONFIRMADO]
- `id` [CONFIRMADO]
- `reporter_id` (FK → `profiles.id`) [CONFIRMADO — insert en `Barrio.jsx`]
- `neighborhood_id` (FK → `neighborhoods.id`) [CONFIRMADO — insert en `Barrio.jsx`]
- `title` [CONFIRMADO]
- `category` [CONFIRMADO]
- `description` [CONFIRMADO]
- `is_anonymous` (boolean) [CONFIRMADO — `AdminIncidentes.jsx` select, `Barrio.jsx` insert]
- `is_official` (boolean) [CONFIRMADO — `AdminIncidentes.jsx` update]
- `lat`, `lng` [CONFIRMADO — `Barrio.jsx` insert]
- `location_text` [CONFIRMADO — `Barrio.jsx` insert]
- `status` (`'active'` | `'pendiente'` | otros) [CONFIRMADO — `Barrio.jsx` insert `status: 'active'`, `Admin.jsx` `.eq('status', 'pendiente')`]
- `confirms_count` (int) [CONFIRMADO — `AdminIncidentes.jsx` select]
- `flags_count` (int) [CONFIRMADO — `AdminIncidentes.jsx` select]
- `severity` [CONFIRMADO — `AdminIncidentes.jsx` select]
- `photo_url` [CONFIRMADO — `AdminIncidentes.jsx` select]
- `images` [CONFIRMADO — `AdminIncidentes.jsx` select]
- `created_at` [CONFIRMADO]
- `expires_at` [CONFIRMADO — `AdminIncidentes.jsx` select]
- `resolved_at` [CONFIRMADO — `AdminIncidentes.jsx` select]
- `resolved_by` (FK → `profiles.id`) [CONFIRMADO — `AdminIncidentes.jsx` select]

### `incident_confirmations` [CONFIRMADO]
- `incident_id` (FK → `incident_reports.id`) [CONFIRMADO — insert en `Barrio.jsx`]
- `profile_id` (FK → `profiles.id`) [CONFIRMADO — insert en `Barrio.jsx`]
- PK compuesta `(incident_id, profile_id)` [INFERIDO — `Barrio.jsx` maneja error `23505` (unique violation) al confirmar dos veces]

### `incident_flags` [CONFIRMADO]
- `incident_id` (FK → `incident_reports.id`) [CONFIRMADO — insert en `Barrio.jsx`]
- `profile_id` (FK → `profiles.id`) [CONFIRMADO — insert en `Barrio.jsx`]
- PK compuesta `(incident_id, profile_id)` [INFERIDO — mismo manejo de `23505` que `incident_confirmations`]

### `commerces` [CONFIRMADO]
- `id` [CONFIRMADO]
- Campos no completamente enumerados en selects `*`, pero confirmados por `CommerceForm.jsx` insert y `AdminComercios.jsx`.
- `name`, `description`, `image_url`, `category`, `neighborhood_id`, `address`, `lat`, `lng`, `phone`, `hours`, `is_active` [INFERIDO por el formulario `CommerceForm.jsx`]

### `commerce_promos` [CONFIRMADO]
- `id` [CONFIRMADO]
- `commerce_id` (FK → `commerces.id`) [CONFIRMADO — `SellerProfile.jsx` `.eq('commerce_id', cid)`]
- `title` [CONFIRMADO]
- `description` [CONFIRMADO]
- `image_url` [CONFIRMADO]
- `starts_at` (timestamptz) [CONFIRMADO]
- `expires_at` (timestamptz) [CONFIRMADO]
- `is_active` (boolean) [CONFIRMADO]
- `views_count` (int) [CONFIRMADO]
- `created_at` [CONFIRMADO]
- `post_id` (FK → `posts.id`) [CONFIRMADO — `PromoForm.jsx` sube imagen a bucket `posts` y referencia un post]

### `farmacias` [CONFIRMADO]
- `id` [CONFIRMADO]
- Campos no enumerados en selects `*`. Por `AdminFarmacias.jsx` CRUD y `Home.jsx` lectura: [INFERIDO] `name`, `address`, `comuna`, `lat`, `lng`, `phone`, `horarios`, `turno` (farmacia de turno).

### `messages` [CONFIRMADO]
- `id` [CONFIRMADO]
- `sender_id` (FK → `profiles` o `auth.users`) [CONFIRMADO — `ChatConversation.jsx` insert `sender_id: currentUser.id`]
- `receiver_id` (FK → `profiles` o `auth.users`) [CONFIRMADO — `App.jsx` `.eq('receiver_id', prof.id)`]
- `post_id` (FK → `posts.id`, nullable) [CONFIRMADO — `ChatConversation.jsx` insert `post_id: postId`, `ChatList.jsx` agrupa por `post_id`]
- `content` [CONFIRMADO]
- `read` (boolean) [CONFIRMADO — `App.jsx` `.eq('read', false)`]
- `created_at` [CONFIRMADO]

### `comments` [CONFIRMADO]
- `id` [CONFIRMADO]
- `post_id` (FK → `posts.id`, nullable) [CONFIRMADO — `AlertaDetail.jsx` insert con `build('post_id')`]
- `incident_id` (FK → `incident_reports.id`, nullable) [CONFIRMADO — `AlertaDetail.jsx` insert con `build('incident_id')`; un comentario pertenece a un post **O** a un incidente]
- `author_id` (FK → `profiles.id`) [CONFIRMADO — `ProductDetail.jsx` insert y join `profiles!author_id`]
- `content` [CONFIRMADO]
- `created_at` [CONFIRMADO]

### `notifications` [CONFIRMADO]
- `id` [CONFIRMADO]
- `user_id` (FK → `auth.users.id` o `profiles.id`) [CONFIRMADO — `Notifications.jsx` filter `user_id=eq.${currentUser.id}`]
- `read_at` (timestamptz, nullable) [CONFIRMADO — `Notifications.jsx` `.update({ read_at: stamp })` y `.is('read_at', null)`]
- `created_at` [CONFIRMADO]
- Campos de payload (`type`, `title`, `body`, `data`) [INFERIDO — no aparecen explícitamente en select `*`]

### `event_attendees` [CONFIRMADO]
- `post_id` (FK → `posts.id`) [CONFIRMADO — `Events.jsx` insert `post_id: postId`]
- `user_id` (FK → `auth.users.id`) [CONFIRMADO — `Events.jsx` insert `user_id: currentUser?.id`]
- PK compuesta `(post_id, user_id)` [INFERIDO — `Events.jsx` hace delete antes de insert para toggle]

### `post_likes` [CONFIRMADO — definida en `supabase_fix_likes_views.sql`]
- `post_id` (uuid, FK → `posts.id` ON DELETE CASCADE) [CONFIRMADO — SQL]
- `user_id` (uuid, **sin FK declarada** hacia `profiles`) [CONFIRMADO — SQL solo dice `uuid not null`]
- `created_at` (timestamptz default `now()`) [CONFIRMADO — SQL]
- PK compuesta `(post_id, user_id)` [CONFIRMADO — SQL]

### `reviews` [CONFIRMADO por uso, NO versionada en SQL]
- `id` [INFERIDO]
- `reviewer_id` (FK → `profiles.id`) [CONFIRMADO — `SellerProfile.jsx` join `profiles!reviewer_id(*)`]
- `reviewee_id` (FK → `profiles.id` o `auth.users.id`) [CONFIRMADO — `SellerProfile.jsx` `.eq('reviewee_id', ...)`]
- `created_at` [CONFIRMADO — `.order('created_at', ...)`]
- Otros campos (`rating`, `comment`) [INFERIDO]
- **La tabla no está creada en el SQL versionado** [CONFIRMADO — `SellerProfile.jsx` tiene bloque try/catch explícito: "Tabla reviews no existe o RLS bloquea — dejamos vacío"]

---

# Relaciones detectadas

## Relaciones [CONFIRMADO] por foreign keys explícitas en SQL versionado

| Origen | Destino | Notas |
|--------|---------|-------|
| `post_likes.post_id` | `posts.id` | ON DELETE CASCADE [CONFIRMADO — `supabase_fix_likes_views.sql`] |

## Relaciones [CONFIRMADO] por joins en consultas (`select('*, x:tabla!fk(...)')`)

| Origen | Destino | Evidencia |
|--------|---------|-----------|
| `posts.author_id` | `profiles.id` | `Barrio.jsx`, `Feed.jsx`, `Search.jsx`, `Home.jsx`, `Marketplace.jsx`, `Services.jsx`, `ProductDetail.jsx`, `Noticias.jsx` — `author:profiles!author_id` |
| `incident_reports.reporter_id` | `profiles.id` | `Alertas.jsx`, `AlertaDetail.jsx`, `Home.jsx` — `reporter:profiles!reporter_id` |
| `comments.author_id` | `profiles.id` | `ProductDetail.jsx` — `author:profiles!author_id` |
| `reviews.reviewer_id` | `profiles.id` | `SellerProfile.jsx` — `profiles!reviewer_id(*)` |
| `incident_reports.resolved_by` | `profiles.id` | `AdminIncidentes.jsx` select (campo leído, no join explícito) |
| `commerce_promos.commerce_id` | `commerces.id` | `SellerProfile.jsx` — `.eq('commerce_id', cid)` |
| `commerce_promos.post_id` | `posts.id` | `PromoForm.jsx` — sube imagen a bucket `posts` y referencia post |
| `posts.neighborhood_id` | `neighborhoods.id` | `Barrio.jsx` insert `neighborhood_id: currentProfile.neighborhood_id` |
| `incident_reports.neighborhood_id` | `neighborhoods.id` | `Barrio.jsx` insert |
| `profiles.neighborhood_id` | `neighborhoods.id` | `Verification.jsx` update + `.eq('neighborhood_id', ...)` |
| `profiles.user_id` | `auth.users.id` | `App.jsx` `.eq('user_id', session.user.id)` |
| `profiles.commerce_id` | `commerces.id` | `SellerProfile.jsx` `profile?.commerce_id` |
| `comments.post_id` | `posts.id` | `ProductDetail.jsx`, `AlertaDetail.jsx` |
| `comments.incident_id` | `incident_reports.id` | `AlertaDetail.jsx` insert `build('incident_id')` |
| `messages.sender_id` | `profiles`/`auth.users` | `ChatConversation.jsx` insert |
| `messages.receiver_id` | `profiles`/`auth.users` | `App.jsx` `.eq('receiver_id', prof.id)` |
| `messages.post_id` | `posts.id` | `ChatList.jsx` agrupa por `post_id` |
| `incident_confirmations.incident_id` | `incident_reports.id` | `Barrio.jsx` insert |
| `incident_confirmations.profile_id` | `profiles.id` | `Barrio.jsx` insert |
| `incident_flags.incident_id` | `incident_reports.id` | `Barrio.jsx` insert |
| `incident_flags.profile_id` | `profiles.id` | `Barrio.jsx` insert |
| `event_attendees.post_id` | `posts.id` | `Events.jsx` insert |
| `event_attendees.user_id` | `auth.users.id` | `Events.jsx` insert `user_id: currentUser?.id` |
| `notifications.user_id` | `auth.users.id` | `Notifications.jsx` filter |

## Relaciones [CONFIRMADO] por Realtime filters

| Tabla | Columna filtrada | Evidencia |
|-------|------------------|-----------|
| `messages` | (sin filter, escucha todos los INSERT) | `App.jsx` canal `app-unread` |
| `messages` | (sin filter) | `ChatList.jsx` canal `realtime-chatlist` |
| `messages` | (sin filter) | `ChatConversation.jsx` canal `chat_${postId}` |
| `notifications` | `user_id=eq.${userId}` | `Notifications.jsx` canal `notif-${userId}` |
| `comments` | `post_id=eq.${postId}` | `ProductDetail.jsx` canal `product-detail-${postId}` |
| `comments` | `post_id=eq.${alertId}` | `AlertaDetail.jsx` canal `alerta-detail-${alertId}` |
| `posts` | (sin filter) | `Marketplace.jsx` canal `mercado-todos` |

---

# Buckets Storage

3 buckets usados desde el cliente [CONFIRMADO por `.storage.from('<bucket>')`]:

| Bucket | Uso | Evidencia |
|--------|-----|-----------|
| `posts` | Upload de imágenes de publicaciones (sell/gift/trade/service/event) y promos | `CreatePost.jsx` `.storage.from('posts').getPublicUrl()`, `PromoForm.jsx`, `CommerceForm.jsx` `.storage.from('posts').upload()` |
| `commerces` | Upload de imágenes de comercios | `AdminComercios.jsx` `.storage.from('commerces').upload()` y `.getPublicUrl()` |
| `avatars` | Upload de avatar de perfil con `upsert: true` | `Profile.jsx` `.storage.from('avatars').upload(fileName, file, { upsert: true })` |

**Notas:**
- Ningún bucket está creado en SQL versionado [CONFIRMADO — `supabase_fix_likes_views.sql` no contiene `insert into storage.buckets`].
- `AdminComercios.jsx` línea 4 documenta (en comentario) una policy que debería existir:
  `CREATE POLICY "commerces_upload_admin" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'commerces' AND public.is_admin());` [CONFIRMADO — comentario en código].
  Esta policy **no está versionada** en el repo [CONFIRMADO].
- Las URLs se obtienen con `getPublicUrl()` (público, sin URLs firmadas) [CONFIRMADO] → los buckets son públicos o las policies permiten lectura pública [INFERIDO].

---

# Edge Functions

**Ninguna** [CONFIRMADO].

- No existe carpeta `supabase/` ni `supabase/functions/` en el proyecto.
- No hay `deno` runtime, ni `serve()`, ni `Deno.serve()` en el código.
- El único procesamiento server-side externo es **OpenRouter** (agregador de LLMs con visión), llamado directamente con `fetch` desde el cliente en `src/lib/ia.js` [CONFIRMADO].
- La clave `VITE_OPENROUTER_API_KEY` se expone en el bundle del cliente [CONFIRMADO — `import.meta.env.VITE_OPENROUTER_API_KEY`].

---

# Policies RLS detectadas

## [CONFIRMADO] — Versionadas en `supabase_fix_likes_views.sql`

Solo 3 policies, todas sobre `post_likes`:

| Policy | Tabla | Comando | Rol | Condición |
|--------|-------|---------|-----|-----------|
| `post_likes read` | `post_likes` | SELECT | `authenticated` | `using (true)` |
| `post_likes insert own` | `post_likes` | INSERT | `authenticated` | `with check (user_id = auth.uid())` |
| `post_likes delete own` | `post_likes` | DELETE | `authenticated` | `using (user_id = auth.uid())` |

RLS activada en `post_likes` [CONFIRMADO — `alter table public.post_likes enable row level security`].

## [CONFIRMADO] — Mencionadas en comentarios del código pero NO versionadas

- `commerces_upload_admin` sobre `storage.objects` (INSERT, `bucket_id = 'commerces' AND public.is_admin()`) — mencionada en `AdminComercios.jsx` línea 4 como instrucción para el administrador, pero **no está en el SQL del repo**.

## [INFERIDO] — RLS probablemente activa en otras tablas

- El SQL dice `"RLS ya debe estar activo en posts"` [CONFIRMADO — comentario en `supabase_fix_likes_views.sql`], lo que implica que RLS está activa en `posts` pero las policies no están versionadas.
- `SellerProfile.jsx` maneja explícitamente el caso "RLS bloquea" para `reviews` [CONFIRMADO — comentario en código].
- No hay evidencia directa de policies para: `profiles`, `neighborhoods`, `incident_reports`, `incident_confirmations`, `incident_flags`, `commerces`, `commerce_promos`, `farmacias`, `messages`, `comments`, `notifications`, `event_attendees`. **Su estado real es desconocido sin acceso al dashboard.**

## [CONFIRMADO] — Grants

- `grant execute on function public.bump_view(uuid) to authenticated;` [CONFIRMADO — SQL]

---

# Triggers detectados

**Ninguno versionado** [CONFIRMADO — `supabase_fix_likes_views.sql` no contiene `CREATE TRIGGER` ni `CREATE FUNCTION` con tipo `trigger`].

**Notas:**
- `likes_count` en `posts` se sincroniza manualmente desde el cliente llamando a `rpc('sync_likes_count', { p_post_id })` después de cada toggle de like [CONFIRMADO — `ProductDetail.jsx`]. Esto es frágil: si el cliente falla, el contador queda desincronizado.
- `views` en `posts` se incrementa vía `rpc('bump_view', { p_post_id })` llamado desde el cliente [CONFIRMADO]. La función es `security definer` [CONFIRMADO — SQL], lo que significa que **bypassea RLS** y cualquier autenticado puede sumar vistas a cualquier post.

---

# Vistas detectadas

**Ninguna** [CONFIRMADO — `supabase_fix_likes_views.sql` no contiene `CREATE VIEW`, y no hay referencias a vistas en las consultas del cliente].

---

# Variables de entorno utilizadas

3 variables, todas con prefijo `VITE_` (expuestas al bundle del cliente) [CONFIRMADO]:

| Variable | Uso | Archivo |
|----------|-----|---------|
| `VITE_SUPABASE_URL` | URL del proyecto Supabase para `createClient` | `src/lib/supabase.js` |
| `VITE_SUPABASE_KEY` | Anon key de Supabase para `createClient` | `src/lib/supabase.js` |
| `VITE_OPENROUTER_API_KEY` | API key de OpenRouter para autocompletar posts con IA de visión | `src/lib/ia.js`, mencionada en `CreatePost.jsx` |

**Notas de seguridad:**
- Las 3 variables terminan en el bundle del cliente (públicamente legibles con DevTools) [CONFIRMADO por ser `VITE_*`].
- `VITE_SUPABASE_KEY` es la anon key — esto es el patrón oficial de Supabase y es seguro **solo si RLS está bien configurada en todas las tablas** [INFERIDO].
- `VITE_OPENROUTER_API_KEY` expone una clave de API de terceros en el cliente — cualquier usuario podría extraerla y consumir cuota gratuita del proyecto [CONFIRMADO por diseño del código].
- No hay archivo `.env` o `.env.local` en el repositorio [CONFIRMADO — no aparecen en el listado de archivos].
- Fallback de guard: si faltan `VITE_SUPABASE_URL` o `VITE_SUPABASE_KEY`, el cliente usa placeholders y solo muestra un `console.warn` [CONFIRMADO — `src/lib/supabase.js`].

---

# Consultas más frecuentes

Ranking por cantidad de pantallas que las ejecutan (no por número de llamadas):

1. **Session/perfil check** — `profiles.select('*').eq('user_id', user.id).maybeSingle()` [CONFIRMADO]
   - `App.jsx` (checkSession, recargarPerfil), y derivadas en `Barrio.jsx`, `Alertas.jsx`, `Comercios.jsx`, `Admin.jsx`, `AdminFarmacias.jsx`, `AdminComercios.jsx`, `AdminUsuarios.jsx`, `AdminIncidentes.jsx`, `ChatList.jsx`, `MyProfile.jsx`, `CreatePost.jsx`, `Events.jsx`, `Profile.jsx`, `Verification.jsx`.
   - Es la consulta más repetida del proyecto (gate de autenticación en cada pantalla).

2. **Feed de posts con author** — `posts.select('*, author:profiles!author_id (...)')` con filtros por `type`, `status`, `neighborhood_id` [CONFIRMADO]
   - `Barrio.jsx`, `Feed.jsx`, `Marketplace.jsx`, `Services.jsx`, `Events.jsx`, `Noticias.jsx`, `Home.jsx`, `Search.jsx`, `SellerProfile.jsx`, `MyProfile.jsx`, `ProductDetail.jsx`.

3. **Mensajes no leídos** — `messages.select('id', { count: 'exact', head: true }).eq('receiver_id', prof.id).eq('read', false)` [CONFIRMADO — `App.jsx`]
   - Refrescada por Realtime canal `app-unread` en cada INSERT/UPDATE de `messages`.

4. **Incidentes con reporter** — `incident_reports.select('*, reporter:profiles!reporter_id (...)')` [CONFIRMADO]
   - `Barrio.jsx`, `Alertas.jsx`, `AlertaDetail.jsx`, `AdminIncidentes.jsx`, `Home.jsx`.

5. **Comentarios con author** — `comments.select('..., author:profiles!author_id (...)')` [CONFIRMADO]
   - `ProductDetail.jsx`, `AlertaDetail.jsx`. Refrescados por Realtime.

6. **Toggle like** — `post_likes.select/insert/delete` + `rpc('sync_likes_count', { p_post_id })` + `rpc('bump_view', { p_post_id })` [CONFIRMADO — `ProductDetail.jsx`]
   - Patrón: optimistic UI → INSERT/DELETE → sincronizar contador vía RPC → rollback si falla.

7. **Commerces / promos CRUD** — `commerces.select('*')`, `commerce_promos.select/insert/update/delete` [CONFIRMADO]
   - `Admin.jsx`, `AdminComercios.jsx`, `Comercios.jsx`, `Barrio.jsx`, `CommerceForm.jsx`, `PromoForm.jsx`, `SellerProfile.jsx`.

8. **Farmacias CRUD** — `farmacias.select/insert/update/delete` [CONFIRMADO — `AdminFarmacias.jsx`, `Home.jsx`].

9. **Notifications** — `notifications.select('*').eq('user_id', ...)` + `.update({ read_at }).eq(...)` [CONFIRMADO — `Notifications.jsx`].

10. **Barrio por punto (GPS)** — `rpc('barrio_en_punto', { p_lat, p_lng })` [CONFIRMADO — `Verification.jsx`].

---

# Riesgos

Ordenados por severidad.

## RLS / Seguridad

1. **Schema SQL completo NO versionado** [CONFIRMADO]. Solo existe `supabase_fix_likes_views.sql` que crea `post_likes` y `bump_view`. Las otras 14 tablas no tienen DDL versionado. No hay forma de reproducir la DB desde el repo.

2. **Policies RLS no versionadas para 14 de 15 tablas** [CONFIRMADO]. Solo `post_likes` tiene policies en el repo. El estado real de RLS en `profiles`, `posts`, `messages`, `comments`, `notifications`, `incident_reports`, `commerces`, `commerce_promos`, `farmacias`, `event_attendees`, `reviews`, `neighborhoods`, `incident_confirmations`, `incident_flags` es **desconocido** sin acceso al dashboard. Si RLS no está activa en alguna, la anon key expone todos los datos.

3. **`bump_view` es `security definer`** [CONFIRMADO — SQL]. Bypassea RLS. Cualquier usuario autenticado puede incrementar vistas de cualquier post, incluso de otros barrios. No es un riesgo crítico de privacidad, pero permite manipulación de métricas.

4. **`sync_likes_count` RPC invocada pero NO versionada** [CONFIRMADO — `ProductDetail.jsx` la llama, no aparece en `supabase_fix_likes_views.sql`]. Si la función no existe en la DB, el `.catch(() => {})` la silencia y `likes_count` nunca se sincroniza → contador de likes incorrecto.

5. **`barrio_en_punto` RPC invocada pero NO versionada** [CONFIRMADO — `Verification.jsx` la llama, no aparece en SQL]. Requiere PostGIS. Si no existe, la verificación por GPS falla y el usuario no puede verificarse.

6. **`is_rut_allowed` RPC referenciada (comentada) pero inexistente** [CONFIRMADO — `Profile.jsx` líneas 135-140 tienen el bloque comentado con nota: "MODO DEV: NO llamamos a is_rut_allowed (la RPC no existe en el schema actual)"). La whitelist de RUTs está desactivada — cualquier RUT válido puede registrarse.

7. **Policy de storage `commerces_upload_admin` no versionada** [CONFIRMADO — mencionada en comentario de `AdminComercios.jsx` pero no en SQL]. Si no se aplicó en el dashboard, el upload de imágenes de comercios falla para admins.

8. **Buckets `posts`, `commerces`, `avatars` no creados en SQL versionado** [CONFIRMADO]. Su existencia real depende de configuración manual en el dashboard.

## Integridad de datos

9. **`likes_count` y `views`/`views_count` se sincronizan manualmente desde el cliente** [CONFIRMADO]. No hay triggers. Si el cliente pierde conexión o crashea después del INSERT en `post_likes` y antes del `rpc('sync_likes_count')`, el contador queda desincronizado para siempre (no hay reconciliación).

10. **`post_likes.user_id` no tiene FK hacia `profiles`** [CONFIRMADO — SQL solo declara `uuid not null`]. Permite likes huérfanos si se borra un usuario.

11. **Doble columna `views` vs `views_count` en `posts`** [INFERIDO — el SQL manipula `views`, el comentario de `ProductDetail.jsx` menciona `views_count`]. Posible columna legacy duplicada.

12. **Inconsistencia `role` vs `user_type` vs `is_admin`/`is_operator`** [CONFIRMADO]. Tres mecanismos distintos para representar rol de usuario:
    - `role` (`'admin'` | `'vecino'`): Admin.jsx, AdminUsuarios.jsx, AdminIncidentes.jsx, AdminFarmacias.jsx, AdminComercios.jsx, MyProfile.jsx.
    - `user_type` (`'admin'` | `'business'` | `'organization'` | `'service_provider'`): Barrio.jsx, PostCard.jsx.
    - `is_admin` / `is_operator`: Comercios.jsx, Noticias.jsx.
    Esto permite que un usuario sea `role='vecino'` pero `user_type='admin'` simultáneamente, creando agujeros de permisos.

13. **Profile.jsx ignora RUT duplicado (error 23505) en modo dev** [CONFIRMADO — comentario explícito: "MODO DEV: si el error es de RUT duplicado, NO bloqueamos al usuario. Solo avisamos por consola"]. En producción esto permite RUTs duplicados en la base.

14. **`reviews` tabla se consulta pero no está versionada** [CONFIRMADO — `SellerProfile.jsx` tiene try/catch defensivo]. Si la tabla no existe, las reseñas simplemente no aparecen (silencioso). No es un crash, pero es una feature invisible.

## Cliente / API

15. **`VITE_OPENROUTER_API_KEY` expuesta en el bundle** [CONFIRMADO]. Cualquier usuario puede extraer la clave y consumir cuota gratuita del proyecto. Debería ir en una Edge Function o backend proxy.

16. **Realtime sin filters en `messages` (canales `app-unread`, `realtime-chatlist`, `mercado-todos`)** [CONFIRMADO]. El cliente recibe todos los INSERT de `messages` del proyecto y filtra en JS por `sender_id`/`receiver_id`. Esto expone metadatos (existence of messages) a todos los clientes conectados, aunque el payload se filtre después. RLS en Realtime debería mitigar esto, pero no está versionada.

17. **No hay índices versionados** salvo `post_likes_user_id_idx` [CONFIRMADO]. Queries frecuentes como `messages.receiver_id` + `read`, `posts.neighborhood_id` + `status` + `created_at`, `notifications.user_id` + `read_at` no tienen índices garantizados.

18. **Consultas N+1 potenciales en `SellerProfile.jsx`** [CONFIRMADO — `cargarPosts`, `cargarStats`, `cargarReviews`, `cargarPromos` se disparan en paralelo tras cargar el perfil, cada una con su propia query]. Aceptable pero sin caching.

19. **`is_rut_allowed`, `barrio_en_punto`, `sync_likes_count` son puntos únicos de fallo sin fallback** [CONFIRMADO] — si la RPC falla, la feature correspondiente (whitelist RUT, verificación GPS, sincronización de likes) se rompe sin alternativa.

## Operacionales

20. **No hay migraciones incrementales** [CONFIRMADO]. Solo un archivo `supabase_fix_likes_views.sql` con `create table if not exists` y `drop policy if exists` antes de `create`. No hay tooling de migraciones (no se usa `supabase migration` CLI). Cambios futuros al schema son manuales vía SQL Editor del dashboard.

21. **Sin seeds versionados** [CONFIRMADO]. No hay datos de prueba reproducibles. `Noticias.jsx` tiene mock data hardcoded [CONFIRMADO], pero no es seed de DB.

22. **`neighborhoods` (polígonos PostGIS) no se pueden reproducir desde el repo** [INFERIDO]. La RPC `barrio_en_punto` depende de polígonos geográficos en `neighborhoods`, pero no hay SQL que los cree ni GeoJSON versionado. Si la DB se pierde, los barrios se pierden.

---

**Fin del documento.** Análisis basado exclusivamente en:
- `supabase_fix_likes_views.sql` (única migración SQL versionada)
- `src/lib/supabase.js` (cliente)
- `src/lib/ia.js` (OpenRouter, no Supabase)
- 30 pantallas en `src/screens/`
- 9 componentes en `src/components/`
- `package.json` (stack confirmado)

No se consultó el dashboard de Supabase. Todo lo marcado `[INFERIDO]` requiere verificación en el dashboard para confirmarse.
