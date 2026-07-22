# ARCHITECTURE.md

Documento de arquitectura de **El Barrio**, generado por análisis exclusivo del
código fuente en `/home/z/my-project/app-source/elbarrio/`.

Objetivo: que cualquier desarrollador o IA entienda el proyecto en menos de
15 minutos. Todo lo escrito aquí proviene del código. Nada es inventado.

---

# Visión general

**El Barrio** es una app móvil hiperlocal chilena que conecta vecinos de una
misma unidad vecinal (barrio). Está pensada para ser usada por la "vecina de 65
años que escribe *por el guasap*" — el diseño prioriza emojis, texto grande
(mínimo 13px) y pocas cosas por pantalla.

**Qué se puede hacer:**
- Comprar, regalar, intercambiar y pedir cosas (Marketplace)
- Reportar y confirmar alertas vecinales (Alertas)
- Ver eventos del barrio y marcar asistencia (Eventos)
- Contratar servicios de vecinos (Servicios)
- Descubrir comercios del barrio con horarios en tiempo real (Comercios)
- Chatear en tiempo real con otros vecinos por una publicación (Chat)
- Recibir notificaciones (Notifications)
- Ver noticias oficiales del barrio (Noticias)
- Gestionar comercios, farmacias, usuarios e incidentes (panel Admin)

**Stack técnico:**
- **Framework**: Vite 8.1.1 + React 19.2.7 (sin Next.js, sin SSR)
- **Backend**: Supabase (Postgres + Auth + Realtime + Storage)
- **Mapas**: Leaflet 1.9.4 + react-leaflet 5.0.0 + tiles de CARTO (OpenStreetMap)
- **IA**: OpenRouter (modelos de visión gratuitos) para autocompletar publicaciones desde una foto
- **Lenguaje**: JavaScript (JSX), sin TypeScript
- **Estilos**: CSS inline por componente (objetos `style`), un sistema de diseño centralizado en `lib/design.js`
- **Sin librerías de UI**: todos los iconos son SVG inline; no hay Material UI, shadcn, ni Tailwind

**Dispositivo objetivo:** móvil. La app se renderiza dentro de un "phone frame"
de 393×852px en desktop para simular un iPhone, y full-screen en pantallas <500px.

---

# Flujo de navegación

La app NO usa React Router. Usa un **router por estado** en `App.jsx` con dos
pieces of state: `currentScreen` (flujo de login) y `activeTab` (app principal).

## Pantalla de inicio → app

1. **`splash`** → pantalla de logo (2s) → `onboarding`
2. **`onboarding`** → carrusel de bienvenida → `register`
3. **`register`** → signup/login con email+password (Google login es mock, muestra `alert`) → `checkSession()`
4. `checkSession()` lee la sesión de Supabase y el perfil, y decide:
   - Si no hay sesión → `splash`
   - Si no hay `full_name` o `rut` → `profile` (pantalla "Cuéntanos sobre ti")
   - Si `verification_status !== 'verified'` → `verification` (GPS + polígono del barrio)
   - Si todo OK → `main` (app principal con tabs)
5. **`profile`** → nombre, RUT (con Módulo 11 chileno), teléfono, avatar → `verification`
6. **`verification`** → dirección + comuna + GPS → RPC `barrio_en_punto` valida el polígono → si cae dentro, marca `verified=true` y asigna `neighborhood_id` → `complete`
7. **`complete`** → pantalla de "bienvenido al barrio" → `main`

## App principal (tabs)

8. **`main`** renderiza uno de 8 tabs según `activeTab`:

| Tab | Pantalla | Qué muestra |
|-----|----------|-------------|
| `inicio` | `Barrio.jsx` | Feed unificado: avisos oficiales + alertas + posts del barrio + accesos rápidos + farmacias de turno |
| `mercado` | `Marketplace.jsx` | Secciones horizontales: "Nuevos en el barrio", "En venta", "Regalos", "Trueques" |
| `servicios` | `Services.jsx` | Lista de posts `type='service'` con filtros por categoría |
| `eventos` | `Events.jsx` | Eventos `type='event'` con toggle "Asistiré" (tabla `event_attendees`) |
| `chat` | `ChatList.jsx` | Lista de conversaciones agrupadas por `(otherUserId, postId)` |
| `comercios` | `Comercios.jsx` | Directorio de comercios con horario "Abierto ahora" |
| `alertas` | `Alertas.jsx` | Lista de `incident_reports` activos con filtros por categoría |
| `perfil` | `MyProfile.jsx` | Perfil propio + acceso al panel admin (si `role==='admin'`) |

## Sub-pantallas (modales)

Estas pantallas se montan sobre el estado `currentScreen` y se acceden vía
`onNavigate('<id>', params)`:

| ID de navegación | Pantalla | Origen |
|------------------|----------|--------|
| `post` / `productdetail` | `ProductDetail.jsx` | Tap en cualquier post del mercado/servicios/eventos |
| `chatconversation` | `ChatConversation.jsx` | Tap en conversación de ChatList o botón "Enviar mensaje" en ProductDetail |
| `dealdone` | `DealDone.jsx` | Tras marcar un post como vendido/comprado |
| `alerta` | `AlertaDetail.jsx` | Tap en alerta |
| `notificaciones` | `Notifications.jsx` | Icono de campana |
| `sellerprofile` | `SellerProfile.jsx` | Tap en avatar del autor de un post |
| `noticias` | `Noticias.jsx` | Sección "Noticias" del inicio |
| `admin` | `Admin.jsx` | Panel admin (solo `role==='admin'`) |
| `adminfarmacias` | `AdminFarmacias.jsx` | CRUD de farmacias |
| `admincomercios` | `AdminComercios.jsx` | CRUD de comercios + promos |
| `adminusuarios` | `AdminUsuarios.jsx` | Lista de usuarios + toggle admin/vecino |
| `adminincidentes` | `AdminIncidentes.jsx` | Revisión de incidentes + marcar oficial |

## Botón "+" (FAB)

El `TabBar` tiene un FAB `+` que abre un menú con 7 opciones de creación. Cada
una abre `CreatePost.jsx` (o `CommerceForm.jsx` si es comercio) como overlay:

| Opción | Tabla destino | Tipo |
|--------|---------------|------|
| 🙋 Pedir ayuda | `posts` | `type='request'` |
| 🏷️ Vender | `posts` | `type='sell'` |
| 🎁 Regalar | `posts` | `type='gift'` |
| 🔄 Trueque | `posts` | `type='trade'` |
| 🚨 Alerta | `incident_reports` | (reporte de vecino, NO oficial) |
| 📅 Evento | `posts` | `type='event'` |
| 📢 Publicar | `posts` | `type='general'` |

## Navegación "back" y "home"

- `onNavigate('back')` → popea `historyRef.current` y vuelve a la pantalla/tab anterior
- `onNavigate('home')` → limpia historial y vuelve a `activeTab='inicio'`
- El tab "perfil" no es sub-pantalla, así que el back desde perfil vuelve al tab previo (trackeado en `prevTabRef`)

---

# Arquitectura

## Estructura de carpetas

```
app-source/elbarrio/
├── index.html              # HTML raíz, monta #root
├── vite.config.js          # Config Vite (React plugin)
├── package.json            # Deps: react 19, supabase-js, leaflet, react-leaflet
├── supabase_fix_likes_views.sql  # ÚNICA migración SQL versionada
├── public/
│   ├── favicon.svg
│   ├── icons.svg
│   └── isotipo.png
└── src/
    ├── main.jsx            # Entry: createRoot + StrictMode
    ├── App.jsx             # Router por estado + ErrorBoundary + auth gate
    ├── index.css           # Phone frame + animaciones globales + fuente Plus Jakarta Sans
    ├── lib/
    │   ├── supabase.js     # Cliente singleton Supabase
    │   ├── design.js       # Sistema de diseño (colores, tipos, helpers)
    │   ├── horarios.js     # Cálculo de "Abierto ahora" para comercios
    │   └── ia.js           # Autocompletar posts con OpenRouter (visión)
    ├── components/
    │   ├── TabBar.jsx       # Barra inferior + FAB "+"
    │   ├── TopBar.jsx       # Header reutilizable
    │   ├── MiniMap.jsx      # Mapa Leaflet (ver o elegir punto)
    │   ├── PostCard.jsx     # Tarjeta de post (mercado/servicios/eventos)
    │   ├── Stepper.jsx      # Indicador de pasos del onboarding
    │   ├── CommerceForm.jsx # Formulario crear/editar comercio
    │   ├── PromoForm.jsx    # Formulario crear promo de comercio
    │   ├── AvisoForm.jsx    # Formulario crear aviso oficial
    │   └── PedidoCard.jsx   # Tarjeta de pedido (tipo request)
    └── screens/
        ├── Splash.jsx, Onboarding.jsx, Register.jsx, Profile.jsx,
        │   Verification.jsx, Complete.jsx          # Flujo de onboarding (6)
        ├── Barrio.jsx, Marketplace.jsx, Services.jsx, Events.jsx,
        │   ChatList.jsx, Comercios.jsx, Alertas.jsx, MyProfile.jsx  # Tabs (8)
        ├── ProductDetail.jsx, ChatConversation.jsx, DealDone.jsx,
        │   AlertaDetail.jsx, Notifications.jsx, SellerProfile.jsx,
        │   Noticias.jsx, CreatePost.jsx             # Sub-pantallas (7)
        ├── Admin.jsx, AdminFarmacias.jsx, AdminComercios.jsx,
        │   AdminUsuarios.jsx, AdminIncidentes.jsx   # Panel admin (5)
        └── Home.jsx, Feed.jsx, Search.jsx           # Huérfanas (no en el router)
```

## Patrones arquitectónicos

1. **Router por estado** (no React Router): `currentScreen` + `activeTab` + `params` + `historyRef`.
2. **Cliente Supabase singleton** importado en cada pantalla: `import { supabase } from '../lib/supabase'`.
3. **Queries directas desde el cliente** (no hay capa de API intermedia ni server actions). Cada pantalla hace sus propios `supabase.from(...).select(...)`.
4. **Realtime por canal** con `supabase.channel(...).on('postgres_changes', ...)`.
5. **Estilos inline** (objetos JS `style={...}`) en cada componente. Un sistema de diseño central en `lib/design.js` exporta colores (`C`), tipografía (`T`), espacios (`S`), tipos (`TIPOS`), helpers (`hace`, `plata`, `distancia`, `iniciales`).
6. **ErrorBoundary** en `App.jsx` atrapa errores de render y los muestra en pantalla (no white screen).
7. **Sin state management library** (no Redux, no Zustand). Estado local por pantalla con `useState` + `useEffect`.

---

# Componentes principales

## `App.jsx` (orquestador)
- Mantiene `currentScreen`, `activeTab`, `user`, `profile`, `params`, `historyRef`.
- `checkSession()` decide la pantalla inicial según el perfil.
- Suscripción global a mensajes no leídos (canal `app-unread`) → actualiza badge del tab Chat.
- Renderiza `TabBar` solo en `main` + `isMainApp`.

## `lib/supabase.js`
- Crea el cliente con `persistSession`, `autoRefreshToken`, `detectSessionInUrl`.
- Guard anti-undefined: si faltan env vars, usa placeholders y solo hace `console.warn`.

## `lib/design.js` (sistema de diseño)
- **`C`** — colores (verde `#16a34a`, fondo `#f4f7f4`, rojo, naranjo, dorado, azul, morado, whatsapp).
- **`T`** — tipografía (mínimo 13px, hasta 22px en saludo). Font: `Plus Jakarta Sans` cargada en `index.css`.
- **`S`** — espacios y formas (card radio 18, padding 16).
- **`TIPOS`** — 7 tipos de publicación con emoji, color y label (`sell`, `gift`, `trade`, `alert`, `event`, `general`, `request`).
- **`REPORTES`** — 4 categorías de alertas (seguridad, salud, infra, mascotas).
- **`AVISOS`** — 5 tipos de avisos oficiales (corte_agua, corte_luz, jjvv, municipal, operativo).
- **`CATEGORIAS`** — 11 categorías del mercado (Electrónica, Ropa, ...).
- **`RUBROS`** — 18 rubros de servicios (gasfiter, electrico, ...).
- **`COMERCIOS`** — 15 rubros de comercios (Panadería, Almacén, ...).
- **`FARMACIAS`** — lista hardcoded de farmacias de turno (comentario: "la API del MINSAL la bloquea CORS, necesita Edge Function").
- **`BADGES`** — 3 badges (founder, trusted, collaborator).
- **Helpers**: `iniciales(nombre)`, `hace(fecha)` (relativo "hace X min"), `plata(n)` (formato `$1.234` es-CL), `distancia(m)`, `saludo()`.

## `lib/horarios.js`
- Calcula "Abierto ahora" para comercios.
- Formato `opening_hours` (jsonb): `{"1": {"o":"09:00","c":"20:00"}, "0": null, ...}` (claves = día JS, 0=domingo).
- `estadoComercio(hours)` → `{open: true, closesAt}` o `{open: false, opensAt, cuando}`.
- Maneja horarios que cruzan medianoche (ej: 18:00 a 02:00).

## `lib/ia.js`
- Llama a OpenRouter (`https://openrouter.ai/api/v1/chat/completions`) con `fetch` directo desde el cliente.
- 3 modelos de visión gratuitos en orden de preferencia: `gemma-4-26b`, `gemma-4-31b`, `nemotron-nano-12b-vl`.
- Recibe una imagen (dataURL) + tipo de post (sell/gift/trade) y devuelve `{title, description, category, suggestedPrice, condition, lookingFor}`.
- Timeouts: 12s por modelo, 25s total. Si todos fallan, lanza error amable.
- Parser robusto: intenta `JSON.parse`, luego quita code fences, luego regex `\{[\s\S]*\}`.

## `components/TabBar.jsx`
- 5 tabs: Inicio, Mercado, Servicios, Eventos, Chat.
- FAB `+` (squircle) que abre menú con 7 opciones de creación.
- Badge de no leídos en tab Chat (`noLeidos > 9` muestra `9+`).

## `components/MiniMap.jsx`
- Mapa Leaflet reutilizable. Tiles de CARTO (`light_all`).
- 2 modos: solo ver (marcador fijo) o editable (click para elegir punto).
- Marcador SVG inline (los iconos por defecto de Leaflet se rompen con Vite).
- `invalidateSize()` tras 120ms para funcionar dentro de modales.

## `components/PostCard.jsx`, `CommerceForm.jsx`, `PromoForm.jsx`, `AvisoForm.jsx`, `PedidoCard.jsx`, `Stepper.jsx`, `TopBar.jsx`
- Componentes de UI reutilizables. Cada uno hace sus propias queries Supabase cuando es necesario (ej: `CommerceForm` sube imagen a Storage y hace insert en `commerces`).

---

# Flujo de datos

## Patrón general (sin capa de API)

```
UI (React state)
  ↓ useState/useEffect
Cliente Supabase (supabase-js)
  ↓ HTTPS + Realtime WebSocket
Supabase (Postgres + Auth + Storage + Realtime)
```

**No hay capa intermedia.** Cada pantalla importa `supabase` y hace sus queries
directamente. No hay server actions, no hay API routes propias, no hay backend
personalizado (salvo OpenRouter, que es externo).

## Ciclo de vida típico de una pantalla de lista

1. `useEffect` al montar → `supabase.from('tabla').select(...).eq(...).order(...)` 
2. Setea estado `loading=true` → muestra skeleton
3. On success → `setDatos(data)` → renderiza lista
4. On error → `setError(msg)` → muestra caja de error
5. Opcional: suscripción Realtime para updates en vivo

## Ejemplo: feed del Mercado (`Marketplace.jsx`)

```
useEffect → supabase.from('posts')
  .select('*, author:profiles!author_id (full_name, avatar_url, ...)')
  .in('type', ['sell','gift','trade'])
  .eq('status','active')
  .order('created_at', {ascending:false})
  .limit(60)
↓
setPosts(data)
↓
separa en cliente por type: nuevos, en venta, regalos, trueques
↓
canal Realtime 'mercado-todos' escucha INSERT en posts
  → si el nuevo post es del tipo correcto y status active, lo prependea
```

## Realtime

La app usa 7 canales Realtime distintos:

| Canal | Tabla | Evento | Filtro | Pantalla |
|-------|-------|--------|--------|----------|
| `app-unread` | `messages` | INSERT, UPDATE | (ninguno) | App.jsx (badge global) |
| `realtime-chatlist` | `messages` | INSERT | (ninguno) | ChatList.jsx |
| `chat_${postId}` | `messages` | INSERT, UPDATE | `post_id=eq.${postId}` | ChatConversation.jsx |
| `notif-${userId}` | `notifications` | INSERT | `user_id=eq.${userId}` | Notifications.jsx |
| `product-detail-${postId}` | `comments` | INSERT | `post_id=eq.${postId}` | ProductDetail.jsx |
| `alerta-detail-${alertId}` | `comments` | INSERT | `post_id=eq.${alertId}` | AlertaDetail.jsx |
| `mercado-todos` | `posts` | INSERT | (ninguno) | Marketplace.jsx |

`ChatConversation.jsx` además usa **broadcast** del canal para el indicador
"escribiendo..." (`channel.send({type:'broadcast', event:'typing'})`).

---

# Estados globales

**No hay contexts ni stores globales.** La app no usa React Context, no usa
Redux, no usa Zustand.

## Estado en `App.jsx` (el "casi-global")

Estos estados viven en `App.jsx` y se pasan por props a las pantallas:

| Estado | Tipo | Propósito |
|--------|------|-----------|
| `currentScreen` | `string` | Pantalla activa del flujo (`splash`, `main`, `productDetail`, ...) |
| `activeTab` | `string` | Tab activo en `main` (`inicio`, `mercado`, ...) |
| `user` | `{id, email}` o `null` | Usuario autenticado (de `supabase.auth.getSession()`) |
| `profile` | objeto `profiles` o `null` | Perfil completo del usuario |
| `params` | objeto | Parámetros para sub-pantallas (`{postId, sellerId, id, ...}`) |
| `noLeidos` | `number` | Contador de mensajes no leídos (para badge del tab Chat) |
| `createOpen` | `boolean` | Si el overlay de CreatePost/CommerceForm está abierto |
| `createType` | `string` o `null` | Tipo de publicación a crear (`sell`, `gift`, `commerce`, ...) |
| `historyRef` | `useRef([])` | Stack de navegación para el botón back |
| `prevTabRef` | `useRef('inicio')` | Tab previo (para back desde perfil) |

## Hooks personalizados

**No hay hooks custom.** Cada pantalla usa `useState`, `useEffect`, `useRef`,
`useCallback` directamente.

## Persistencia local

- `CreatePost.jsx` guarda draft en `localStorage` (comentario: "Draft auto-save en localStorage (no se pierde si se cierra)").
- Supabase Auth persiste la sesión en `localStorage` (config `persistSession: true`).
- No hay otros usos de `localStorage`/`sessionStorage`.

---

# Mapas

## Librería
- `leaflet` 1.9.4 + `react-leaflet` 5.0.0 (aunque `react-leaflet` se importa pero el componente `MiniMap` usa la API imperativa de Leaflet directamente, no los componentes de react-leaflet).
- Tiles: CARTO `light_all` (`https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png`), subdominios `abcd`, maxZoom 20.
- Sin API key (OpenStreetMap/CARTO gratis).

## Componente `MiniMap.jsx`

Dos modos:

1. **Solo ver** (ej: tarjeta de incidente, card de evento):
   ```jsx
   <MiniMap lat={-33.42} lng={-70.57} height={160} />
   ```

2. **Elegir un punto** (ej: reportar incidente, crear evento):
   ```jsx
   <MiniMap
     lat={reportLat} lng={reportLng}
     editable
     centerLat={-33.42} centerLng={-70.57}
     onPick={(lat, lng) => { setReportLat(lat); setReportLng(lng) }}
   />
   ```

## Implementación
- Crea el mapa UNA sola vez en `useEffect` (dependencias vacías) y lo guarda en `mapRef`.
- El callback `onPick` se guarda en `onPickRef` para no recrear el mapa en cada render.
- Marcador: `L.divIcon` con SVG inline (los iconos por defecto de Leaflet se rompen con Vite).
- `scrollWheelZoom: false` (evita que el scroll del desktop secuestre la página).
- `tap: true` (soporte táctil móvil).
- `invalidateSize()` tras 120ms — Leaflet necesita recalcular tamaño si nace dentro de un modal.
- Si `lat`/`lng` cambian desde fuera (ej: botón "usar mi ubicación"), un segundo `useEffect` mueve el marcador.

## Dónde se usa
- `Alertas.jsx` — mostrar ubicación de cada incidente.
- `Events.jsx` — mostrar lugar del evento.
- `CreatePost.jsx` — elegir ubicación del incidente/evento.
- `Comercios.jsx` — mostrar ubicación del comercio en el modal.

## Validación geográfica (NO en MiniMap)
- `Verification.jsx` usa `navigator.geolocation.getCurrentPosition` para obtener el GPS del usuario.
- Llama a la RPC `barrio_en_punto({p_lat, p_lng})` que valida con PostGIS si el punto cae dentro del polígono de alguna unidad vecinal.
- Si cae dentro → asigna `neighborhood_id` y marca `verified=true`.

---

# Autenticación

## Flujo
1. **`Register.jsx`** — signup/login con email + password (mínimo 6 caracteres).
   - `supabase.auth.signUp({email, password})` para crear cuenta.
   - `supabase.auth.signInWithPassword({email, password})` para login.
   - El perfil en `profiles` se crea **automáticamente** por un trigger de Supabase (`on_auth_user_created`) — el código NO hace insert manual (comentario: "duplicaba el perfil y rompía el UNIQUE de user_id").
   - Google login es un **mock** — el botón muestra `alert('Login con Google disponible próximamente')`.

2. **`App.jsx` `checkSession()`** — al montar, lee `supabase.auth.getSession()`:
   - Si no hay sesión → `splash`.
   - Si hay sesión → setea `user` y carga `profile` desde `profiles` con `.eq('user_id', session.user.id).maybeSingle()`.

3. **`onAuthStateChange`** — suscripción global que actualiza `user` en login/logout.

4. **Gate de onboarding** — según el estado del `profile`:
   - Sin `full_name` o `rut` → `profile` (pantalla "Cuéntanos sobre ti").
   - `verification_status !== 'verified'` → `verification` (GPS).
   - Todo OK → `main`.

5. **Logout** — `supabase.auth.signOut()` + resetea estado.

## Validación de RUT (`Profile.jsx`)
- Formatea RUT mientras escribe: `123456789` → `12.345.678-9`.
- Valida con **algoritmo Módulo 11 chileno** (calcula DV y compara).
- **NO** llama a la RPC `is_rut_allowed` (está comentada — la función no existe en el schema). Cualquier RUT válido pasa.
- En modo dev, **ignora RUTs duplicados** (error 23505) — solo avisa por consola y deja seguir.

## Verificación de barrio (`Verification.jsx`)
1. Usuario ingresa dirección + comuna (32 comunas de Santiago en lista).
2. Botón "Confirmar mi ubicación" → `navigator.geolocation.getCurrentPosition`.
3. Llama a `supabase.rpc('barrio_en_punto', {p_lat, p_lng})`.
4. Si la RPC devuelve un barrio → `verified=true`, `neighborhood_id`, `verification_method='gps_polygon'`, `verified_at`.
5. **Vecino Fundador**: si es de los primeros 70 verificados del barrio → `badge_founder=true`, `founder_number=N`.
6. Si el usuario no está en su casa → botón "lo confirmo después" guarda `verification_status='pending'` y cierra sesión.

---

# Storage

## Buckets usados (3)

| Bucket | Uso | Cómo se sube |
|--------|-----|--------------|
| `posts` | Imágenes de publicaciones (sell/gift/trade/service/event) y de promos de comercio | `supabase.storage.from('posts').upload(fileName, file)` + `getPublicUrl(fileName)` |
| `commerces` | Logos/covers de comercios | `supabase.storage.from('commerces').upload(nombre, file)` + `getPublicUrl(nombre)` |
| `avatars` | Avatares de perfil | `supabase.storage.from('avatars').upload(fileName, file, {upsert: true})` + `getPublicUrl(fileName)` |

## Patrón de uso
1. Generar nombre único: `${user.id}-${Date.now()}.${ext}`.
2. `upload()` con el File.
3. `getPublicUrl()` para obtener la URL pública.
4. Guardar la URL en la tabla correspondiente (`posts.image_url`, `commerces.image_url`, `profiles.avatar_url`).

## Notas
- Todas las URLs son **públicas** (no firmadas) — `getPublicUrl()` devuelve la URL pública del bucket.
- Los buckets **no están creados en SQL versionado** — deben existir en el dashboard.
- `AdminComercios.jsx` documenta en comentario una policy que debería existir: `commerces_upload_admin` (INSERT en `storage.objects` con `bucket_id='commerces' AND public.is_admin()`), pero no está versionada.
- Límite de avatar: 5MB (`Profile.jsx` valida `file.size > 5 * 1024 * 1024`).

---

# Chat

## Tabla: `messages`

 Campos: `id`, `sender_id`, `receiver_id`, `post_id` (nullable), `content`, `read` (boolean), `created_at`.

## ChatList.jsx (lista de conversaciones)
- Agrupa mensajes por `(otherUserId, postId)` — cada conversación es un hilo atado a una publicación.
- Query: trae todos los mensajes donde el usuario es sender o receiver, agrupa en JS.
- Ordena por `created_at` descendente (último mensaje primero).
- Realtime: canal `realtime-chatlist` escucha INSERT en `messages` y actualiza **solo la conversación afectada** (no recarga toda la lista) usando el payload del evento.
- Badge de no leídos por conversación.

## ChatConversation.jsx (conversación 1-a-1)
- Recibe `postId`, `sellerId`, `currentUser`.
- Carga en paralelo: mensajes del post, perfil del seller, datos del post.
- Al abrir, marca como leídos todos los mensajes del seller hacia mí (`update({read:true}).eq('post_id',postId).eq('sender_id',sellerId).eq('read',false)`).

### Realtime (canal `chat_${postId}`)
- **INSERT** en `messages` con filter `post_id=eq.${postId}`:
  - Si el mensaje es mío (optimistic), lo reemplaza por el real.
  - Si es del otro, lo agrega y lo marca como leído automáticamente (estoy viendo el chat).
- **UPDATE** en `messages`: cuando el otro marca mi mensaje como leído → cambia el check ✓ a ✓✓ azul.
- **Broadcast** `typing`: el otro escribe → llega este evento → muestra "escribiendo...". Debounce de 1.5s para no saturar. Si no llega otro typing en 3s, oculta el indicador.

### Envío de mensaje (optimistic)
1. Genera `tempId = 'temp_' + Date.now() + '_' + random`.
2. Agrega mensaje optimista a la lista con `_pending: true` (muestra icono de reloj).
3. `supabase.from('messages').insert({sender_id, receiver_id, post_id, content}).select()`.
4. On success → reemplaza el temporal por el real (o espera el INSERT de realtime).
5. On error → marca como `_failed: true` (muestra icono de error) y permite reintentar.

### Indicadores de estado de mensaje
- 🕐 Reloj — enviándose (optimistic, sin confirmar en DB).
- ✓ Check simple — enviado, no leído.
- ✓✓ Check doble azul — leído por el otro.

## Contador global de no leídos (`App.jsx`)
- Canal `app-unread` escucha INSERT y UPDATE en `messages`.
- Recalcula `count` de `messages` donde `receiver_id = miProfileId` y `read = false`.
- Setea `noLeidos` que se pasa al `TabBar` para el badge.

---

# Marketplace

## Tabla: `posts` (con `type` en `['sell', 'gift', 'trade']`)

## Marketplace.jsx (tab "mercado")
- **Layout sectional** (no grid infinito):
  1. "Nuevos en el barrio" → feed horizontal de 6 tarjetas grandes (72% width, scroll-snap).
  2. "En venta" → cuadrados pequeños (3 por vista, scroll lateral).
  3. "Regalos" → igual que venta.
  4. "Trueques" → igual que venta.
- **Fetch único**: trae 60 posts de todos los tipos y los separa en cliente.
- **Pills filtros**: "Todos" muestra las 4 secciones; una pill específica muestra solo esa.
- **Realtime**: canal `mercado-todos` escucha INSERT en `posts` → si el tipo y status son correctos, prependea (hidratando el author con query separada).
- **Pull-to-refresh** visual.
- **Distancia real**: calcula haversine entre coords del post y del usuario (si ambos tienen `lat`/`lng`).

## ProductDetail.jsx (detalle de publicación)
- Carga post + author + comentarios + likes + productos similares en paralelo.
- **Vistas**: al montar, llama `rpc('bump_view', {p_post_id})` (suma 1 a `views`). Una vez por montaje.
- **Likes**: optimistic UI.
  - Toggle: si no likeado → `insert into post_likes`, si likeado → `delete from post_likes`.
  - Luego llama `rpc('sync_likes_count', {p_post_id})` para sincronizar `likes_count` en `posts`.
  - Rollback si falla.
- **Comentarios**: realtime (canal `product-detail-${postId}`). Insert optimistic con tempId, reemplaza cuando llega por realtime.
- **Productos similares**: query posts de la misma categoría, excluye el actual, limit 8.
- **Lightbox** al tocar la imagen principal.
- **Share**: Web Share API con fallback a clipboard + toast.
- **Safe area** en bottom bar (`env(safe-area-inset-bottom)`).

## CreatePost.jsx (crear publicación)
- 7 tipos: sell, gift, trade, request, alert, event, general.
- **IA opcional**: botón "autocompletar con foto" → sube la imagen a OpenRouter → devuelve `{title, description, category, suggestedPrice, condition, lookingFor}`.
- Sube imágenes a bucket `posts` y guarda URLs en `posts.images`.
- Contador de caracteres (título max 60, descripción max 500).
- Preview en vivo de cómo se verá el post.
- **Draft auto-save** en localStorage.
- Si el tipo es `alert` → inserta en `incident_reports` (NO en `posts`).

---

# Comercios

## Tablas: `commerces` + `commerce_promos`

## Comercios.jsx (tab "comercios")
- Lista comercios del barrio. Premium primero (card grande con cover), resto compacta.
- **Horario "Abierto ahora"**: calcula con `horarioFeed(hours)` que lee `opening_hours` (jsonb con claves `dom,lun,mar,mie,jue,vie,sab`).
  - Abierto: `"abierto de 09:00 a 20:00 · cierra en 2h 15min"`.
  - Cerrado pero abre hoy: `"abre hoy a las 09:00 · en 45 min"`.
  - Cerrado hoy: `"cierra hoy · abre mañana a las 09:00"`.
- **Modal** (bottom sheet 97% viewport): cover + logo + horario + banner de beneficio + dropdowns "Ver ubicación" (MiniMap) / "Ver horarios" + footer WhatsApp sticky.
- Distancia haversine si el comercio tiene `lat`/`lng`.

## CommerceForm.jsx (crear/editar comercio)
- Campos: nombre, rubro (15 opciones de `COMERCIOS_CATS`), descripción, dirección, comuna, teléfono, horarios (7 días), imagen de cover.
- Sube imagen a bucket `posts` (no `commerces` — ojo, inconsistencia).
- Insert/update en `commerces`.

## PromoForm.jsx (crear promo de comercio)
- Campos: título, descripción, imagen, fecha inicio/fin, activo.
- Sube imagen a bucket `posts`.
- Insert en `commerce_promos` con `commerce_id` y `post_id` (referencia al post de imagen).

## AdminComercios.jsx (panel admin)
- CRUD de commerces + commerce_promos.
- Sube logos a bucket `commerces`.
- Requiere `profile.role === 'admin'`.

---

# Alertas

## Tablas: `incident_reports` + `incident_confirmations` + `incident_flags`

## Flujo de una alerta

1. **Vecino crea** (botón "+" → "Alerta"):
   - `CreatePost.jsx` con `type='alert'` inserta en `incident_reports` (NO en `posts`).
   - Campos: `reporter_id`, `neighborhood_id`, `title`, `category`, `description`, `is_anonymous`, `lat`, `lng`, `location_text`, `status='active'`.

2. **Vecino confirma** (botón "Confirmar" en la alerta):
   - `insert into incident_confirmations (incident_id, profile_id)`.
   - Si ya confirmó (error 23505 de PK compuesta) → silencioso.

3. **Vecino denuncia** (botón "Denunciar"):
   - `insert into incident_flags (incident_id, profile_id)`.
   - Mismo manejo de 23505.

4. **Admin marca como oficial** (`AdminIncidentes.jsx`):
   - `update incident_reports set is_official = true/false`.
   - Las alertas oficiales aparecen arriba en el feed del Inicio.

## Alertas.jsx (tab "alertas")
- Lista `incident_reports` con `status in ['active', 'pendiente']`.
- Filtra por `neighborhood_id` del usuario (OR `is.null` para los sin barrio).
- Ordena por `confirms_count` desc, luego `created_at` desc.
- Filtros por categoría: Todas, Seguridad, Infra, Mascotas, Otro.
- Color-coded por categoría.
- Distancia haversine a cada alerta (usa GPS del usuario).

## AlertaDetail.jsx (detalle de alerta)
- Carga el incidente + reporter + comentarios.
- Comentarios en realtime (canal `alerta-detail-${alertId}`).
- Botones confirmar/denunciar.

## Avisos oficiales (distinto de alertas vecinales)
- Los avisos oficiales (corte de agua, corte de luz, jjvv, municipal, operativo) se crean desde `Barrio.jsx` con `AvisoForm`.
- Se insertan en `posts` con `type='alert'` y `is_official=true`.
- Aparecen en la sección "Avisos" del Inicio, separados de las alertas vecinales.

---

# Eventos

## Tablas: `posts` (con `type='event'`) + `event_attendees`

## Events.jsx (tab "eventos")
- Lista posts con `type='event'` y `status='active'`.
- Filtros: Todos, Asambleas, Ferias, Talleres, Deporte, Otros.
- Sección "Esta semana" (chips horizontales) + "Próximos eventos" (cards grandes).
- Badges HOY (verde) / MAÑANA (amarillo).
- Cada card tiene bloque de fecha, título, descripción, lugar (MiniMap o texto), avatar del organizador, contador de asistentes, botón "Asistiré".

## Asistencia (`event_attendees`)
- Toggle: si no asisto → `insert into event_attendees (post_id, user_id)`. Si asisto → `delete from event_attendees where post_id and user_id`.
- Optimistic UI con rollback si falla.
- Si la tabla no existe o RLS bloquea → toast "Función disponible pronto" (no rompe).
- Carga `event_attendees` por post para saber si el usuario ya marcó asistencia y cuántos asisten.

## Crear evento
- Botón "+ Crear evento" → `onNavigate('createpost', {type: 'event'})` → `CreatePost.jsx`.

---

# Servicios

## Tabla: `posts` (con `type='service'`)

## Services.jsx (tab "servicios")
- Lista posts con `type='service'` y `status='active'`.
- Filtros por categoría (chips horizontales): Todos, Hogar, Clases, Salud, Tecnología, Transporte, Otros.
- Buscador por texto.
- FAB "+" para publicar servicio.
- Cada card muestra: emoji de categoría, título, descripción, distancia (real o mock determinista por id), rating (real o mock), avatar del autor con badge `badge_trusted_seller` o `badge_founder`.
- Distancia: si el post tiene `distance_meters` usa `distancia()` de design.js; si no, mock determinista por id (`"A X cuadras"`).
- Rating: si el post tiene `rating`, lo usa; si no, mock determinista.

## Crear servicio
- FAB "+" → `CreatePost.jsx` con `type='service'`.
- 18 rubros disponibles (gasfiter, electrico, cerrajero, pintor, carpintero, maestro, aseo, jardinero, peluqueria, mascotas, ninera, adulto_mayor, fletes, clases, internet, aire, fumigacion, otro).

---

# Riesgos conocidos

> Esta sección consolida los riesgos arquitectónicos. Para detalle exhaustivo
> de riesgos de Supabase (RLS, SQL, triggers), ver `docs/SUPABASE_CONTEXT.md`.

## Arquitectura

1. **Router por estado sin librería** — todo el routing vive en `App.jsx` con `useState` + `historyRef`. Funciona, pero no soporta URLs profundas, browser back/forward, ni deep linking. No hay forma de compartir un link a una pantalla específica.

2. **3 pantallas huérfanas** — `Home.jsx`, `Feed.jsx`, `Search.jsx` existen en `src/screens/` pero NO están importadas en `App.jsx` ni en el router. Son código muerto o versiones previas no eliminadas. `Search.jsx` incluso tiene queries Supabase activas, pero nunca se monta.

3. **Sin TypeScript** — todo el proyecto es JSX sin tipos. Errores de tipeo (ej: campo de tabla mal escrito) solo se detectan en runtime.

4. **Sin state management** — cada pantalla carga sus propios datos. No hay cache entre pantallas. Si vas de Marketplace → ProductDetail → vuelta a Marketplace, se recarga todo.

5. **Sin tests** — no hay carpeta de tests, no hay Vitest/Jest configurado, no hay tests E2E.

## Seguridad

6. **`VITE_OPENROUTER_API_KEY` expuesta en el bundle** — la clave de OpenRouter vive en `lib/ia.js` con `import.meta.env.VITE_OPENROUTER_API_KEY`, que Vite embebe en el JS del cliente. Cualquier usuario puede extraerla con DevTools y consumir cuota gratuita del proyecto. Debería ir en una Edge Function.

7. **RLS no versionada para 14 de 15 tablas** — solo `post_likes` tiene policies en SQL. El estado real de RLS en `profiles`, `posts`, `messages`, `comments`, `notifications`, `incident_reports`, `commerces`, `commerce_promos`, `farmacias`, `event_attendees`, `reviews`, `neighborhoods`, `incident_confirmations`, `incident_flags` es desconocido. Si RLS no está activa, la anon key (también en el bundle) expone todos los datos.

8. **3 campos de rol inconsistentes** — `role` (Admin.jsx, AdminUsuarios.jsx, AdminIncidentes.jsx, AdminFarmacias.jsx, AdminComercios.jsx, MyProfile.jsx), `user_type` (Barrio.jsx, PostCard.jsx) e `is_admin`/`is_operator` (Comercios.jsx, Noticias.jsx). Un usuario podría ser `role='vecino'` pero `user_type='admin'` simultáneamente, creando agujeros de permisos.

9. **`bump_view` es `security definer`** — bypassa RLS. Cualquier autenticado puede sumar vistas a cualquier post, incluso de otros barrios.

10. **Profile.jsx ignora RUT duplicado en modo dev** — error 23505 (unique violation) se silencia con `console.warn` y deja seguir. En producción esto permite RUTs duplicados.

## Datos

11. **`likes_count` y `views` sin triggers** — se sincronizan manualmente desde el cliente (`rpc('sync_likes_count')`). Si el cliente pierde conexión o crashea, el contador queda desincronizado para siempre.

12. **`reviews` tabla consultada pero no versionada** — `SellerProfile.jsx` tiene try/catch defensivo explícito: "Tabla reviews no existe o RLS bloquea — dejamos vacío". Es una feature invisible.

13. **RPCs invocadas pero no versionadas** — `sync_likes_count` y `barrio_en_punto` se llaman desde el cliente pero no aparecen en `supabase_fix_likes_views.sql`. Si no existen en la DB, las features fallan silenciosamente.

14. **`is_rut_allowed` referenciada pero inexistente** — bloque comentado en `Profile.jsx`. La whitelist de RUTs está desactivada.

15. **Buckets no creados en SQL** — `posts`, `commerces`, `avatars` deben existir manualmente en el dashboard.

## Operacionales

16. **Sin migraciones incrementales** — solo un archivo `supabase_fix_likes_views.sql` con `create if not exists` y `drop policy if exists`. No hay tooling de migraciones. Cambios futuros al schema son manuales vía SQL Editor del dashboard.

17. **Sin seeds** — no hay datos de prueba reproducibles. `Noticias.jsx` y `Services.jsx` tienen mock data hardcoded, pero no es seed de DB.

18. **Polígonos PostGIS no versionados** — la RPC `barrio_en_punto` depende de polígonos geográficos en `neighborhoods`, pero no hay SQL que los cree ni GeoJSON versionado. Si la DB se pierde, los barrios se pierden.

19. **`CommerceForm.jsx` sube a bucket `posts`** (no `commerces`) — inconsistencia con `AdminComercios.jsx` que sí sube a `commerces`. Posible confusión de buckets.

20. **Realtime sin filters en `messages` y `posts`** — los canales `app-unread`, `realtime-chatlist` y `mercado-todos` reciben TODOS los INSERT de esas tablas y filtran en JS. Expone metadatos (existence of messages/posts) a todos los clientes, aunque el payload se filtre después.

21. **Google login es mock** — `Register.jsx` botón "Continuar con Google" solo muestra `alert('Login con Google disponible próximamente')`. No está implementado.

22. **Farmacias de turno hardcoded** — `lib/design.js` tiene un array `FARMACIAS` con 2 farmacias fijas. Comentario: "la API del MINSAL la bloquea CORS, necesita Edge Function". No hay integración real.

23. **Sin i18n** — todo el texto está en español chileno hardcodeado en los componentes. No hay sistema de traducciones.

---

**Fin del documento.** Análisis basado exclusivamente en:
- `package.json` (stack)
- `src/main.jsx`, `src/App.jsx`, `src/index.css` (entry + router + estilos globales)
- `src/lib/{supabase,design,horarios,ia}.js` (4 módulos lib)
- `src/components/{TabBar,MiniMap,PostCard,Stepper,TopBar,CommerceForm,PromoForm,AvisoForm,PedidoCard}.jsx` (9 componentes)
- 30 pantallas en `src/screens/` (27 activas + 3 huérfanas)
- `supabase_fix_likes_views.sql` (única migración SQL)
