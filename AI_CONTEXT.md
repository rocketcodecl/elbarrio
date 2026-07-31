# AI Context — El Barrio

> Contexto operativo breve para trabajar sobre el estado vigente del proyecto.
> Debe actualizarse cuando cambien la arquitectura, la navegación, una decisión de producto importante o el estado de una funcionalidad.

## Estado de continuidad — 30 de julio de 2026

- Cierre posterior implementado en código: los favoritos abren la ficha exacta del comercio y “Hoy en tu barrio” queda oculto por defecto, con selección independiente desde Eventos del panel. App y panel pasan build y ESLint focalizado.
- La migración `202607300005_home_event_spotlight.sql` está preparada pero no debe asumirse aplicada. Hasta su confirmación, Inicio falla cerrado y omite la portada sin afectar el resto del feed; el control administrativo requiere la RPC nueva para funcionar.
- La aplicación principal está desplegada en `https://elbarrio.lat/el-barrio/` y el panel en `https://elbarrio.lat/el-barrio/admin/`. La ruta histórica `https://elbarrio.lat/app.php` redirige a la aplicación React. Los builds reproducibles para Plesk usan `npm run build:plesk` en cada proyecto.
- Superbloque de adquisición y pulido visual implementado: alta con campos separados `Nombre` y `Apellido` sin alterar el schema, mapa territorial explicativo en la verificación, favoritos con mayor jerarquía, controles circulares protegidos en Modo accesible y portada editorial “Hoy en tu barrio” basada solo en eventos reales seleccionados.
- La aplicación principal y el panel administrativo compilan después del superbloque. Los archivos focalizados de Perfil, Verificación, MiniMap y Mi perfil pasan ESLint. La revisión visual automatizada sigue pendiente porque no había ningún navegador conectado al entorno.
- Este bloque no agrega ni ejecuta migraciones. La visualización territorial usa una copia cliente del GeoJSON versionado; la confirmación residencial continúa dependiendo de la RPC existente y su estado remoto no se presume.
- Superbloque de pulido UX/UI completado. Estado: `4/4 — verificado por build y lint focalizado`.
- “Mis publicaciones”, “Mis favoritos” y “Mis compras y ventas” se abren ahora como subpantallas completas desde la parte superior, con retorno y scroll propios; ya no quedan como hojas pegadas al borde inferior cuando tienen poco contenido.
- La aplicación principal y el panel compilan después del pulido. `MyProfile.jsx`, `TabBar.jsx` y `ChatList.jsx` pasan ESLint sin errores ni advertencias. Falta la aprobación visual con sesión real porque no hubo navegador conectado.
- Fase larga anterior completada: cierre de Comercios, moderación de contenido público con IA, reemplazo de Mi perfil y Modo accesible.
- Bloque actual: `4/4 — fase larga completada y verificada`.
- La aplicación principal y el panel administrativo compilan en producción. La Edge Function nueva pasa `deno lint`, está desplegada y responde correctamente en red.
- Las instrucciones y el registro de la migración de auditoría están en `supabase/MVP_CIERRE_INSTRUCCIONES.md`. No se cargaron datos simulados.
- La Edge Function `moderate-community-content` está desplegada y validada en red: el preflight responde HTTP 200 y una solicitud sin sesión responde HTTP 401.
- La migración `202607300004_content_moderation_events.sql` fue aplicada el 30 de julio de 2026 según confirmación manual. PostgREST reconoce la tabla y rechaza el acceso anónimo con HTTP 401, como corresponde a sus permisos.
- `landing-page/` contiene ahora la landing pública independiente y debe versionarse como producto propio. `supabase/.temp/` continúa fuera de los commits.
- La aplicación de vecinos y el panel administrativo comparten el mismo proyecto Supabase.
- El último cierre funcional corrigió identidad de perfiles, estados de carga, contenido simulado y aislamiento territorial en feeds, detalles y perfiles públicos activos.
- La aplicación principal y el panel compilan correctamente después de estos cambios.
- La migración `202607290015_admin_broadcast_notifications.sql` está aplicada y validada en Supabase: se comprobó el envío individual y el envío masivo a todo el barrio.
- Las migraciones `202607300002_post_publishing_policies.sql` y `202607300003_marketplace_deals.sql` están aplicadas y validadas mediante transacciones reversibles. El historial remoto de migraciones figura vacío aunque las estructuras existen: no ejecutar `supabase db push` hasta reconciliarlo, porque intentaría aplicar todos los archivos antiguos.
- No asumir que una migración está aplicada solo porque existe en el repositorio. Confirmar siempre su ejecución con el usuario.
- Antes de continuar, revisar `git status`, este archivo y el código específico de la siguiente tarea. No reconstruir ni sustituir módulos existentes sin autorización.

## Arquitectura actual

- Aplicación web móvil construida con Vite 8, React 19 y JavaScript/JSX.
- Existe una aplicación web administrativa independiente en `admin-panel/`, conectada al mismo Supabase y orientada al uso desde computador.
- Existe una landing pública independiente en `landing-page/`, construida con HTML, CSS y JavaScript estáticos para desplegarse directamente sin afectar la aplicación ni el panel.
- La interfaz se presenta dentro de un marco de teléfono en escritorio y ocupa la pantalla disponible en móvil.
- `src/main.jsx` monta `src/App.jsx`.
- `App.jsx` funciona como orquestador: controla autenticación, navegación, tabs, historial interno, overlays y usuario activo.
- No se usa React Router. La navegación depende de `currentScreen`, `activeTab`, `params` y `historyRef`.
- No existe un store global. Las pantallas mantienen estado local y consultan sus propios datos.
- Supabase se consume directamente desde el cliente para Auth, PostgreSQL, Storage y Realtime.
- Leaflet y React Leaflet se utilizan para mapas y selección de ubicaciones.
- OpenRouter se consume únicamente desde Edge Functions autenticadas: `analyze-listing-image` ayuda a completar publicaciones desde imágenes y `moderate-community-content` revisa texto público antes de publicarlo. El secreto servidor `OPENROUTER_API_KEY` no llega al bundle y el cliente no contiene un fallback directo.
- Los estilos son principalmente objetos inline, apoyados por estilos globales y el sistema visual de `src/lib/design.js`.
- La tipografía activa es Plus Jakarta Sans, cargada localmente con `@fontsource`.

## Flujo de navegación

### Acceso y verificación

1. `Splash`
2. `Onboarding`
3. `Register`
4. `Profile`, si faltan nombre o RUT
5. `Verification`, si la cuenta aún no está verificada
6. `Complete`
7. Aplicación principal

Una sesión verificada entra directamente a la aplicación principal. El cierre de sesión limpia usuario, perfil, historial y tab activo.

### Aplicación principal

- `inicio` → `Home.jsx`
- `mercado` → `Marketplace.jsx`
- `servicios` → `Services.jsx`
- `eventos` → `Events.jsx`
- `chat` → `ChatList.jsx`
- `comercios` → `Comercios.jsx`
- `alertas` → `Alertas.jsx`
- `perfil` → `MyProfile.jsx`

La barra inferior muestra Inicio, Mercado, Servicios, Comercios y Chat. Eventos, Alertas y Perfil se abren desde accesos internos.

### Subpantallas conectadas

- Detalle y edición de producto
- Detalle propio de servicio
- Detalle de evento
- Conversación de chat
- Confirmación de transacción
- Detalle de alerta
- Notificaciones
- Perfil público de vendedor
- Noticias
- Panel administrativo y sus módulos conectados
- Información y ayuda
- Nosotros
- Términos y condiciones
- Productos prohibidos
- Invitar vecinos
- Contáctanos

El botón de creación abre `CreatePost.jsx`, salvo la creación de comercios, que utiliza `CommerceForm.jsx`.

## Componentes principales

- `App.jsx`: sesión, navegación, tabs, overlays y contador de mensajes no leídos.
- `Home.jsx`: feed inicial actual.
- `TabBar.jsx`: navegación inferior y acceso a creación.
- `CreatePost.jsx`: creación y edición de publicaciones, alertas, servicios y eventos.
- `Marketplace.jsx` / `ProductDetail.jsx`: feed y detalle del mercado.
- `Events.jsx` / `EventDetail.jsx`: feed y detalle de eventos; la asistencia está deshabilitada temporalmente.
- `Services.jsx`: directorio de servicios vecinales.
- `ServiceDetail.jsx`: ficha específica de un servicio, prestador, galería compacta y contacto.
- `Noticias.jsx`: feed de noticias reales, filtros editoriales y lectura completa en modal con galería.
- `Comercios.jsx` / `CommerceForm.jsx`: feed, detalle y formulario de comercios.
- `ChatList.jsx` / `ChatConversation.jsx`: mensajería asociada a usuarios y publicaciones.
- `MyProfile.jsx`: perfil propio aprobado, reputación, insignias, accesos personales y hojas de actividad real.
- `CommunityPagesV2.jsx`: páginas informativas, legales y de contacto.
- `MiniMap.jsx`: mapa reutilizable y selección de ubicación.
- `PostCard.jsx` / `PedidoCard.jsx`: tarjetas reutilizables.
- `lib/design.js`: colores, tipografía, tamaños, categorías y helpers visuales.
- `lib/supabase.js`: única instancia del cliente Supabase.
- `lib/horarios.js`: estado y textos de horarios comerciales.
- `lib/ia.js`: integración de IA para publicaciones.
- `lib/moderation.js`: cliente común de moderación preventiva para texto público.
- `supabase/functions/analyze-listing-image/index.ts`: proxy autenticado y validado hacia OpenRouter.
- `supabase/functions/moderate-community-content/index.ts`: moderación autenticada de texto público con salida estructurada y privacidad reforzada del proveedor.
- `supabase/config.toml`: configuración de despliegue de Edge Functions; el gateway deja pasar CORS y cada función valida la sesión dentro de su propio código.

## Reglas del proyecto

- El código actual tiene prioridad sobre este archivo y sobre cualquier otra documentación.
- No inventar archivos, tablas, funciones ni contexto.
- Antes de modificar código, indicar los archivos exactos que se tocarán y por qué.
- Hacer el cambio mínimo necesario.
- Después de cada cambio, indicar exactamente qué archivos se modificaron.
- Si falta información que pueda cambiar el resultado, detenerse y pedirla.
- No reestructurar el proyecto sin autorización explícita.
- No crear versiones paralelas de pantallas existentes.
- No instalar dependencias ni ejecutar migraciones sin explicarlo y obtener autorización cuando corresponda.
- Mantener el diseño comprensible para vecinos de distintas edades: texto legible, jerarquía clara, controles reconocibles y poca saturación.
- Verificar los cambios visuales dentro del marco móvil y comprobar scroll, safe areas y barra inferior.
- Actualizar este archivo después de cambios relevantes de arquitectura, navegación, producto o backend.
- Si existen varias soluciones posibles, explícalas brevemente y recomienda una antes de escribir código.
- No modifiques archivos que no sean necesarios para resolver la tarea solicitada.

## Decisiones tomadas

- `Home.jsx` es el feed principal y controla el tab Inicio.
- Inicio puede mostrar una portada compacta “Hoy en tu barrio” con imagen, categoría, horario, lugar, resumen y acceso al detalle. Usa exclusivamente el evento futuro activo marcado `show_on_home=true`; la selección de portada es independiente de `show_in_activity`, no inventa contenido y retira ese mismo evento de la lista inmediata de Actividad para evitar duplicación.
- `Barrio.jsx` y `Feed.jsx` permanecen en el repositorio, pero no están conectados a la aplicación.
- `Search.jsx` tampoco está conectado actualmente.
- La navegación seguirá siendo por estado; no se incorporará otro router sin autorización.
- Plus Jakarta Sans es la tipografía oficial actual.
- Las alertas oficiales activas ocupan una franja propia bajo clima/farmacia; las alertas vecinales activas se integran en “Actividad de el barrio” junto a pedidos y publicaciones generales.
- Los feeds de Alertas y Eventos fallan de forma cerrada: si no pueden confirmar `profiles.neighborhood_id`, muestran un error y nunca consultan contenido global ni de otro barrio.
- La sección “Alerta oficial” del Inicio solo se muestra cuando existe al menos una alerta oficial activa; si no hay ninguna, no ocupa espacio en el feed.
- Los reportes de alerta nuevos se publican inmediatamente con estado `active` por su carácter urgente y aparecen con foco visual en “Actividad de el barrio”. `rechazado` significa descartado y `resuelto` significa cerrado. La marca `is_official` sigue reservada al administrador y distingue la huincha oficial de Inicio.
- Toda aprobación de pendientes antiguos, rechazo, cambio de oficialidad o cierre se realiza mediante `admin_moderate_incident` y deja trazabilidad en `incident_admin_actions` con el perfil administrador responsable.
- `profiles.role` es el único campo que entrega permisos administrativos (`admin` o `vecino`). `user_type` queda reservado para clasificar públicamente el tipo de perfil y `can_publish_events` autoriza actores institucionales a publicar eventos sin convertirlos en administradores.
- Los administradores conservan `profiles.role='admin'`. El nivel global se representa con `profiles.is_superadmin=true`: un administrador normal solo administra su `neighborhood_id`; un superadministrador puede operar en todos los barrios y es el único que puede asignar o retirar permisos administrativos. La migración `202607300001_admin_scope_and_superadmin.sql` está aplicada y la cuenta principal fue promovida correctamente según confirmación manual; falta validar la separación con una cuenta admin territorial.
- En el panel, el superadministrador debe seleccionar explícitamente un barrio al crear comercios, eventos o noticias. Los servicios administrativos heredan el barrio del prestador seleccionado. Las notificaciones masivas supremas también exigen un barrio y nunca envían globalmente a todos los barrios en una sola acción.
- Las cuentas suspendidas usan `account_status='suspended'` y quedan bloqueadas tanto en la aplicación como en el panel; la aplicación escucha cambios del perfil para aplicar el bloqueo sin esperar un nuevo inicio de sesión. Las acciones administrativas sobre usuarios se ejecutan mediante `admin_manage_profile` y quedan registradas en `user_admin_actions`.
- El mercado prioriza un feed compacto y visual, con mezcla de venta, regalo y trueque.
- Las publicaciones del Mercado sin fotografía muestran un placeholder neutral con el ícono de su categoría; nunca se sustituyen por imágenes externas o simuladas.
- Las publicaciones pueden mostrar el badge `Conversable` cuando corresponda.
- El detalle de una publicación propia permite editarla.
- En el flujo de Mercado, `auth.users.id` se conserva para `post_likes`, mientras `profiles.id` se usa para autoría de publicaciones, comentarios, perfiles públicos y comprobación de propiedad.
- La creación de publicaciones valida `posts.author_id → profiles.id → profiles.user_id = auth.uid()`, exige el mismo barrio, cuenta activa y verificación. Los eventos requieren administrador o `can_publish_events`; las noticias requieren administrador. Esta corrección está aplicada mediante `202607300002_post_publishing_policies.sql`.
- El chat puede abrirse en modo de prueba o vista previa cuando todas las publicaciones pertenecen al mismo usuario.
- La lista de Chat diferencia una bandeja vacía de un error de carga, ofrece reintento y representa cada conversación como un control accesible por teclado.
- Los tratos de venta, regalo y trueque usan `marketplace_deals`. El interesado propone un encuentro, el autor acepta o rechaza, ambos continúan en el mismo chat y solo el autor puede cerrar un match aceptado. Al cerrar, la publicación pasa a `sold` y deja de aparecer en los feeds activos. Las acciones se ejecutan exclusivamente mediante `marketplace_propose_deal` y `marketplace_respond_deal`.
- Servicios destacados es una posición comercial identificada como patrocinada o destacada; no implica que sea el mejor servicio.
- Los servicios nuevos se guardan con `posts.status='pending'` y no aparecen en el feed hasta ser aprobados desde el panel. El panel puede aprobar, rechazar, pausar o reactivar servicios.
- La visibilidad patrocinada de Servicios se guarda en `posts.is_featured`, `featured_starts_at`, `featured_until` y `featured_by`; solo aparece durante su vigencia y siempre se identifica como patrocinada.
- El panel puede crear servicios en nombre de un perfil del barrio. Los destacados se aleatorizan al cargar, avanzan automáticamente con transición suave, se pausan durante la interacción y muestran indicadores.
- Los servicios tienen una ficha propia y no reutilizan el detalle visual del Mercado. Un precio vacío o igual a cero se presenta como `Valor a convenir`.
- El buscador de Servicios permanece visible para reducir pasos. La ficha prioriza al prestador, valoración, cantidad de opiniones y precio reales; el estado “Disponible para conversar” solo comunica que la publicación está activa y que la coordinación ocurre por chat. No se inventan experiencia, distancia, disponibilidad horaria ni porcentaje de recomendación.
- Las calificaciones de servicios usan `service_reviews`, no la tabla de comercios ni estructuras antiguas. Solo un vecino verificado puede dejar una opinión por servicio, puede editarla y no puede calificar su propio servicio. El promedio y la cantidad se consolidan en `posts.rating` y `posts.rating_count`.
- Los eventos tienen feed y página de detalle propios; no deben reutilizar la interfaz de una publicación de venta.
- Los eventos solo se mezclan en “Actividad de el barrio” cuando el panel activa `posts.show_in_activity`; continúan apareciendo normalmente en el feed de Eventos.
- El panel diferencia eventos publicados (`active`), pausados (`closed`) y cancelados (`cancelled`). Pausar permite reactivar; cancelar conserva el registro sin volver a publicarlo; eliminar requiere confirmación y borra el evento definitivamente.
- Los eventos son publicados por actores autorizados o administradores; el detalle no muestra un organizador como usuario común.
- Los eventos contemplan opciones como entrada gratuita o pagada y condiciones como pet friendly.
- Los eventos pueden tener un rango horario opcional (`starts_at` / `ends_at`). Sus categorías son globales y administrables desde el panel, con nombre e ícono; las categorías antiguas se conservan como respaldo visual.
- Los eventos pagados permiten múltiples tarifas etiquetadas mediante `event_ticket_prices`; `event_price` se conserva como respaldo para eventos antiguos.
- La asistencia a eventos está deshabilitada temporalmente en el feed, el detalle y el panel. La tabla existente `event_attendees` referencia la estructura antigua `events`, mientras los eventos actuales se guardan en `posts`; no debe reactivarse hasta definir y autorizar la alineación del esquema.
- El feed de eventos debe mostrar inmediatamente un evento recién publicado sin exigir refrescar manualmente.
- La página del comercio debe priorizar información, contacto, imágenes, promociones, productos y opiniones; su diseño no debe reutilizar estructuras antiguas deficientes.
- En el feed de Comercios, los destacados abren la ficha completa. Los comercios normales despliegan una ficha básica dentro del listado con descripción, horario, ubicación, WhatsApp y cómo llegar; solo uno puede estar abierto a la vez.
- Un comercio puede pertenecer a varios rubros. El panel conserva el primero como `category` principal y guarda el conjunto completo en `categories`; los emojis se asignan de forma consistente por rubro.
- Los productos de un comercio pertenecen a un catálogo propio (`commerce_products`) y no son publicaciones del Mercado. Su lectura es pública cuando están disponibles; su gestión queda reservada a administradores o al perfil vinculado mediante `commerces.owner_id → profiles.id`.
- En comercios destacados, los productos marcados como destacados aparecen en un carrusel visual con badge; los productos normales forman un catálogo compacto independiente.
- La monetización de comercios se basa en visibilidad y herramientas comerciales: los destacados ocupan el carrusel superior y acceden a ficha completa, galería, productos, promociones y descuento. Los comercios gratuitos permanecen en “Cerca de ti” con ficha desplegable, rubros, descripción, horario, ubicación, valoración, favoritos y contacto. La confianza (opiniones y valoración) no se bloquea por pago.
- El carrusel de comercios destacados muestra una tarjeta de ancho completo por vez, avanza automáticamente con transición lateral, se pausa durante la interacción y muestra indicadores. El orden se aleatoriza de forma estable al cargar el feed para repartir la exposición pagada sin repetir comercios antes de completar la ronda.
- El feed de Comercios distingue un directorio realmente vacío de un error de sesión, perfil, barrio o consulta. Ante un fallo muestra el motivo seguro y permite reintentar; nunca consulta sin `neighborhood_id`. La ficha usa `whatsapp` como contacto prioritario y `phone` como respaldo.
- Invitar vecinos debe permanecer pendiente de habilitación aunque exista una pantalla implementada.
- Mi perfil usa una sola implementación basada en la referencia aprobada: identidad centrada, reputación, estadísticas reales, progreso, insignias y menú personal. “Mis publicaciones”, “Mis favoritos” y “Mis compras y ventas” abren hojas con datos reales; no muestran contadores simulados.
- Los comercios favoritos se muestran en tarjetas de mayor tamaño dentro de Mi perfil, con fotografía, nombre y rubro reales. La tarjeta completa abre directamente la ficha del comercio seleccionado.
- Las secciones de actividad de Mi perfil se presentan como subpantallas completas y no como bottom sheets: la información empieza arriba, el contenido breve conserva jerarquía y la barra inferior queda cubierta mientras se revisa una sección.
- El Modo accesible es una preferencia local persistente controlada por `App.jsx`. Aplica texto y controles más grandes, foco visible y movimiento reducido a toda la aplicación; puede alternarse desde Mi perfil y Configuración. Los controles iconográficos con forma circular conservan relación 1:1 y no reciben el alto textual de 48 px. Es una ayuda práctica para adultos mayores, no una declaración formal de cumplimiento WCAG.
- La barra inferior y el menú Crear respetan el safe area del dispositivo. El menú universal usa una cuadrícula desplazable con título y cierre explícito; los tabs identifican semánticamente la sección activa y anuncian mensajes sin leer.
- Inicio distingue una actualización fallida de un feed realmente vacío: conserva la última información disponible cuando existe caché y muestra un aviso con reintento. Las consultas principales de barrio y publicaciones ya no fallan silenciosamente.
- Las páginas comunitarias comparten la identidad visual vigente, el header simple con retorno y scroll independiente.
- Los feeds de Mercado, Servicios, Eventos, Chat y Comercios usan un header interno común: botón volver, título centrado en gris carbón con `el barrio` en verde de marca, un ícono lineal grande y translúcido propio de la sección hacia el lado izquierdo, y una línea verde inferior. Inicio conserva su header propio.
- Comercios ocupa el cuarto acceso de la barra inferior. Eventos se abre desde los accesos rápidos de Inicio.
- Los CTA de publicación de Mercado y Servicios comparten proporciones compactas y muestran su emoji principal sin círculo; el CTA de Servicios usa la acción `Publícate` y comunica que publicar es gratis.
- Las distancias del feed y detalle de Comercios se calculan desde el GPS del navegador; mientras este responde o si el permiso falla, usan como respaldo las coordenadas verificadas del perfil del vecino.
- La verificación residencial exige dos comprobaciones: la dirección geocodificada debe quedar a un máximo de 250 metros del GPS y ese GPS debe estar dentro del polígono oficial del MVP mediante `barrio_en_punto_mvp`. El perfil conserva ambos puntos y la distancia calculada.
- El polígono oficial del MVP está versionado en `supabase/geo/barrio_beta_polygon.geojson`; la migración `202607290004_beta_neighborhood_polygon.sql` lo asigna únicamente cuando existe exactamente un registro `neighborhoods.is_beta=true`.
- El alta solicita `Nombre` y `Apellido` en campos independientes, pero los compone en `profiles.full_name`; no se agregan columnas estructuradas para el MVP. La pantalla tiene scroll interno y explica correctamente que el nombre identifica el perfil mientras el RUT permanece privado.
- La verificación muestra el territorio activo antes del GPS mediante `MiniMap` y una copia cliente de la geometría versionada en `src/data/barrioBetaBoundary.js`. Cuando dirección y comuna son válidas, geocodifica con espera breve y muestra el punto sobre el polígono. Esta ayuda visual no reemplaza la validación backend por `barrio_en_punto_mvp`.
- El formato oficial de `opening_hours` es el del panel: claves numéricas de JavaScript (`0` domingo a `6` sábado). La app mantiene lectura de claves abreviadas antiguas para no invalidar comercios previos.
- En Farmacias, `is_active` controla si una farmacia pertenece al directorio visible y `is_on_duty` indica si se destaca actualmente como de turno. La franja del Home muestra solo turnos; su modal con scroll muestra primero los turnos y luego las demás farmacias visibles.
- Las noticias se guardan en `posts` con `type='news'`. `news_is_official` identifica comunicaciones oficiales, `news_source` guarda la fuente y `show_in_activity` controla si también aparecen en “Actividad de el barrio”. `images` admite hasta ocho imágenes desde un botón independiente del panel: la primera funciona como portada y el modal las recorre automáticamente en un carrusel con control manual. Sus categorías se administran en `news_categories` con nombre, ícono, orden y visibilidad; el feed conserva categorías conocidas como respaldo. No utiliza noticias de demostración ni reutiliza el detalle del Mercado.

## Convenciones de código

- Componentes funcionales de React y hooks estándar.
- Archivos de pantallas en `src/screens/` y componentes reutilizables en `src/components/`.
- Imports del cliente Supabase siempre desde `src/lib/supabase.js`.
- Colores y tipografía compartidos desde `src/lib/design.js` mediante `C` y `T`.
- Plus Jakarta Sans como primera opción de `font-family`.
- Navegación mediante `onNavigate(destino, params)`.
- Pantallas principales controladas por `activeTab`; detalles y páginas secundarias por `currentScreen`.
- Formularios de creación se presentan como overlays de pantalla completa.
- Consultas Supabase dentro de la pantalla responsable, normalmente desde `useEffect`.
- Realtime mediante canales de Supabase y limpieza de la suscripción al desmontar.
- Estilos locales mediante objetos `style`; CSS global solo para frame, safe areas, comportamiento general y animaciones compartidas.
- Iconografía coherente con la interfaz actual, preferentemente SVG inline o símbolos claramente reconocibles.
- Los cambios de schema deben quedar respaldados por una migración SQL; no asumir que una tabla listada está siendo usada por la interfaz.
- La navegación visual se anima desde `App.jsx`: las subpantallas y formularios entran lateralmente a ancho completo, el regreso usa la dirección inversa y los cambios de pestaña usan una transición lateral más breve. Las fichas abiertas mediante portales deben aplicar el mismo patrón dentro de su componente, como ocurre en `Comercios.jsx`.

## Archivos críticos

- `src/App.jsx`
- `src/main.jsx`
- `src/App.css`
- `src/index.css`
- `src/lib/design.js`
- `src/lib/supabase.js`
- `src/screens/Home.jsx`
- `src/components/TabBar.jsx`
- `src/screens/CreatePost.jsx`
- `src/screens/Marketplace.jsx`
- `src/screens/ProductDetail.jsx`
- `src/screens/Services.jsx`
- `src/screens/ServiceDetail.jsx`
- `src/screens/Events.jsx`
- `src/screens/EventDetail.jsx`
- `src/screens/Noticias.jsx`
- `src/screens/Comercios.jsx`
- `src/components/CommerceForm.jsx`
- `src/screens/ChatList.jsx`
- `src/screens/ChatConversation.jsx`
- `src/screens/MyProfile.jsx`
- `src/screens/CommunityPagesV2.jsx`
- `supabase/migrations/`
- `supabase/MVP_CIERRE_INSTRUCCIONES.md`
- `admin-panel/ADMIN_CONTEXT.md`
- `admin-panel/src/App.jsx`
- `admin-panel/src/screens/IncidentManager.jsx`
- `admin-panel/src/screens/UserManager.jsx`
- `admin-panel/src/screens/ServiceManager.jsx`
- `admin-panel/src/screens/PharmacyManager.jsx`
- `admin-panel/src/screens/NewsManager.jsx`
- `admin-panel/src/screens/NewsCategoryManager.jsx`
- `admin-panel/src/screens/NotificationManager.jsx`
- `supabase/migrations/202607290015_admin_broadcast_notifications.sql`

## Funcionalidades terminadas

- Landing pública de El Barrio con navegación responsive, imágenes originales generadas para el proyecto, hero cinematográfico, demo ficticia de la aplicación, scrollytelling de cuatro etapas, propuesta para vecinos y comercios, comunidad y formulario de contacto por correo. No utiliza datos ni pantallas reales de la aplicación.
- Alta y verificación territorial refinadas: Nombre y Apellido separados sin migración, copy de privacidad coherente, scroll interno, mapa del polígono MVP, geocodificación automática de dirección y marcador previo al GPS.
- Inicio incorpora una portada editorial real para el próximo evento elegido desde el panel, sin datos simulados ni duplicación inmediata en Actividad. Mi perfil amplía las tarjetas de favoritos y el Modo accesible conserva cuadrados los controles circulares.
- Pulido UX/UI final de la app vecinal: subpantallas superiores de Perfil, buscador permanente y jerarquía real en Servicios, detalle con métricas reales y CTA dominante, menú Crear adaptable, safe areas, reducción de movimiento, Chat con recuperación y Home con caché más aviso de actualización fallida.
- La fase larga autorizada quedó cerrada en cuatro checkpoints: continuidad, moderación preventiva, Comercios y Productos, y Perfil con Modo accesible. App y panel pasan sus builds de producción; `supabase/.temp/` permanece fuera de los commits.
- `MyProfile.jsx` fue reemplazado, sin pantalla paralela, por la composición visual aprobada. Reputación, ventas, regalos, ayudas, publicaciones, favoritos y tratos se derivan de Supabase o muestran cero/sin calificación; el perfil no inventa valores. El Modo accesible persiste en `localStorage` y se aplica globalmente.
- El cierre funcional de Comercios fue auditado en la aplicación y el panel: feed territorial con error y reintento explícitos, contacto correcto por WhatsApp, ficha con promociones/catálogo/galería/opiniones, y catálogo administrativo con creación, edición, disponibilidad y destacados. Los builds de producción de ambas aplicaciones pasan.
- La moderación preventiva de texto público está integrada en publicaciones, comentarios de Mercado y Alertas, y opiniones de Servicios y Comercios mediante `moderate-community-content`. La función está desplegada; CORS y rechazo sin sesión fueron validados. La auditoría administrativa `content_moderation_events` está aplicada y protegida contra lectura anónima.
- El panel implementa dos alcances administrativos: territorial y supremo. Las listas fallan cerradas para admins sin barrio, el nivel supremo puede revisar todos los barrios, las altas globales exigen barrio explícito y solo el superadministrador ve controles para administrar otros permisos administrativos. La protección backend de `202607300001_admin_scope_and_superadmin.sql` está aplicada según confirmación manual.
- Las pantallas administrativas móviles antiguas de Usuarios, Incidentes y Comercios respetan el mismo alcance. Usuarios e Incidentes ya no realizan cambios sensibles con `update` directo: usan `admin_manage_profile` y `admin_moderate_incident`.
- Los feeds de Mercado, Servicios y Noticias, sus detalles directos de producto/servicio/evento/alerta y los perfiles públicos de vendedor quedan restringidos al barrio verificado del perfil. El Mercado aplica la misma regla a sus altas en tiempo real y publicaciones similares. Si el barrio no puede resolverse, estas vistas fallan de forma cerrada y no muestran contenido global.
- El detalle de alerta no ofrece un reporte de contenido simulado. La acción se mantiene fuera de la interfaz hasta que exista una persistencia o RPC real y autorizada.
- La administración móvil de usuarios no muestra una acción de baneo simulada; la suspensión real permanece en el panel web administrativo.
- Mercado y detalle de producto no generan fotografías de demostración: conservan las imágenes reales y usan un placeholder reconocible cuando la publicación no tiene imagen o la carga falla.
- Alertas y Eventos consultan únicamente contenido asociado al barrio verificado del perfil; se eliminó el fallback que podía cargar filas sin filtro territorial cuando fallaba la resolución del perfil.
- El detalle de producto recibe el ID del perfil activo, reconoce correctamente publicaciones propias y usa `profiles.id` al crear comentarios o consultar el GPS guardado. El perfil público del vendedor carga sus publicaciones mediante `posts.author_id`, finaliza correctamente su estado de carga y no muestra reputación ni reportes simulados.
- Notificaciones internas: `notifications.user_id` y `from_user_id` referencian `profiles.id`. La campana del Home cuenta filas no leídas en tiempo real; la pantalla permite filtrar, marcar una o todas como leídas con rollback y abrir mensajes o publicaciones. La migración `202607290012_in_app_notifications.sql` genera notificaciones por mensajes, comentarios y likes, evitando auto-notificaciones.
- El panel de Usuarios permite enviar una notificación interna manual a un vecino mediante la RPC con validación administrativa `admin_send_notification` (migración `202607290013_admin_send_notification.sql`).
- Cada vecino puede eliminar únicamente sus propias notificaciones mediante `user_delete_notification` (migración `202607290014_user_delete_notification.sql`).
- El panel tiene un módulo independiente de notificaciones masivas validado. Permite enviar a todo el barrio, vecinos verificados, comercios o actores autorizados, siempre dentro del barrio del administrador, con confirmación de alcance e historial en `notification_campaigns` (migración aplicada `202607290015_admin_broadcast_notifications.sql`).
- La integración de imágenes con IA usa exclusivamente la Edge Function autenticada `analyze-listing-image`, que restringe modelos y tamaño de entrada y mantiene `OPENROUTER_API_KEY` fuera del navegador. La función está desplegada, figura `ACTIVE`, exige un usuario válido mediante Supabase Auth y rechazó correctamente una solicitud sin sesión con HTTP 401. Falta validar una sugerencia completa con una sesión real.
- El reconocimiento visual continúa con modelos alternativos cuando una respuesta viene vacía o con JSON inválido. Solo informa que la foto no contiene un objeto reconocible cuando todos los modelos efectivamente consultados devuelven el resultado vacío.
- El reconocimiento visual usa `google/gemini-2.5-flash-lite` pagado como modelo principal para evitar los límites del nivel gratuito. Gemma 31B, Gemma 26B y Nemotron VL permanecen como respaldo; la recarga automática de OpenRouter debe mantenerse desactivada.
- La Edge Function de IA deja el preflight CORS fuera de la validación JWT del gateway (`verify_jwt=false`) y valida cada solicitud POST mediante Supabase Auth dentro de la propia función. El preflight responde HTTP 200 y una solicitud POST sin usuario válido responde HTTP 401.
- La moderación preventiva se aplica a publicaciones, comentarios de Mercado y Alertas, y opiniones de Servicios y Comercios antes de persistir texto público. No inspecciona chats privados.
- `moderate-community-content` usa `google/gemini-2.5-flash-lite`, exige JSON estructurado, solicita proveedores sin recolección de datos y con ZDR, y devuelve mensajes seguros sin exponer detalles internos. Ante una caída del proveedor opera en modo degradado y permite continuar para no dejar inutilizable la comunidad; la protección definitiva sigue dependiendo de RLS y de la moderación administrativa.
- `202607300004_content_moderation_events.sql` crea una bitácora administrativa territorial para las decisiones de IA. Fue aplicada y confirmada manualmente el 30 de julio de 2026; la tabla existe y conserva su acceso restringido.
- La creación de publicaciones de Mercado y pedidos vuelve a estar autorizada mediante una política que usa el ID de perfil correcto. La inserción como usuario autenticado se validó dentro de una transacción con `ROLLBACK`.
- Las alertas vecinales nuevas quedan activas de inmediato, vuelven a Inicio después de publicarse y aparecen primero por fecha en “Actividad de el barrio” con tratamiento visual urgente.
- El chat implementa propuesta de encuentro, aceptación/rechazo, match persistente, cancelación y cierre. El cierre marca la publicación como `sold`; el ciclo completo fue validado en una transacción con `ROLLBACK`.
- El formulario de perfil recupera los datos parciales ya guardados cuando una sesión vuelve al registro. Un RUT duplicado bloquea el avance con un mensaje visible y una cuenta ya verificada vuelve directamente a la aplicación después de completar sus datos.

- Servicios: las publicaciones normales usan tarjeta compacta desplegable en el feed; el rubro reemplaza el estado “Nuevo” en la cabecera. Teléfono, WhatsApp e Instagram son datos opcionales del servicio y se muestran en el desplegable y la ficha completa (requiere migración `202607290011_service_contacts.sql`).

- Flujo de registro, login, perfil, verificación y entrada a la aplicación.
- Feed inicial conectado a `Home.jsx`.
- Rediseño actual del feed de Inicio, incluyendo jerarquía de secciones y clima animado.
- Feed del mercado con mezcla de ventas, regalos y trueques, categorías y CTA de publicación.
- Detalle de producto con comentarios, likes, compartir, contacto, edición y eliminación cuando corresponde.
- Flujo de chat y contador de mensajes no leídos.
- Feed de servicios con categorías y sección comercial de destacados.
- Detalle propio de servicios con imagen horizontal compacta, prestador, descripción, precio opcional y contacto por chat; el autor puede abrir la edición.
- Opiniones de servicios con 1 a 5 estrellas, comentario opcional, edición de la opinión propia y promedio visible en detalle y feed; la migración `202607290007_service_reviews.sql` está aplicada.
- Creación de eventos con ubicación y mapa.
- Feed de eventos, detalle independiente y tarifas múltiples. La asistencia está deshabilitada temporalmente.
- Actualización automática del feed después de publicar un evento.
- Feed y detalle funcional de comercios, con promociones y opiniones consultadas desde Supabase.
- Los vecinos verificados pueden publicar o editar una opinión por comercio, con calificación de 1 a 5 estrellas y comentario; el promedio se actualiza desde Supabase.
- Los vecinos verificados pueden guardar comercios como favoritos. La relación es privada, el contador agregado es público y se muestra junto a la calificación.
- El detalle de comercio está preparado para consultar y mostrar productos destacados reales cuando exista el catálogo del comercio.
- La tabla `commerce_products` y sus políticas están aplicadas en Supabase; el catálogo permanece vacío hasta cargar productos.
- Base independiente del panel web administrativo con login, validación de rol, navegación lateral y resumen general.
- Módulo web administrativo de comercios separado en directorio, editor completo y catálogo de productos, incluida la subida de fotografías.
- Módulo web administrativo de Eventos con listado, creación, edición, pausa/publicación y selección para Actividad; utiliza `posts` con `type='event'` y los permisos ya existentes para administradores.
- El módulo web de Eventos permite definir rango desde/hasta y administrar categorías con ícono. La migración `202607280001_event_schedule_and_categories.sql` fue ejecutada correctamente según confirmación manual; falta validar el flujo funcional.
- El panel de Eventos permite varias tarifas de entrada para eventos pagados y decidir si se muestran los asistentes. Las migraciones `202607280002_event_ticket_prices.sql` y `202607280003_event_attendance_visibility.sql` fueron ejecutadas correctamente según confirmación manual; falta validar el flujo funcional.
- Módulo web administrativo de Incidentes y alertas con listado, búsqueda, filtros, revisión de contenido, evidencia y ubicación, aprobación, rechazo, oficialización, cierre e historial de acciones administrativas.
- Módulo web administrativo de Usuarios con listado, búsqueda, filtros, revisión de verificación, autorización de actores, asignación administrativa, suspensión, reactivación y auditoría.
- Módulo web administrativo de Servicios con listado, búsqueda, moderación de publicaciones y programación de visibilidad patrocinada.
- Módulo web administrativo de Farmacias con listado, búsqueda, creación, edición, mapa sincronizado, visibilidad, turno independiente, prioridad en Inicio y eliminación; utiliza la tabla vigente `farmacias`.
- Módulo web administrativo de Noticias con listado, búsqueda, filtros, portada, contenido, categoría, fuente, marca oficial, publicación/pausa y selección para Actividad.
- Feed móvil de Noticias conectado exclusivamente a publicaciones reales; permite filtrar y desplegar la noticia completa sin abrir una ficha de venta.
- El detalle administrativo de usuario muestra su ubicación GPS, barrio verificado y actividad consolidada: ventas, regalos, trueques, comentarios, alertas, opiniones, servicios y eventos.
- El editor web de comercios incluye búsqueda de dirección y selector cartográfico con marcador móvil; al cambiar el punto sincroniza dirección, latitud y longitud.
- Alertas, detalle de alerta, noticias y notificaciones. El autor puede editar y marcar resuelto su incidente; los comentarios de incidentes usan `comments.incident_id` y el ID del perfil.
- Perfil propio, perfil público y módulos administrativos conectados.
- Plus Jakarta Sans instalada y aplicada globalmente.
- Páginas Nosotros, Términos, Productos prohibidos, Invitar vecinos, Contáctanos e Información y ayuda conectadas.

## Funcionalidades pendientes

- Ejecutar `202607300005_home_event_spotlight.sql` y validar desde el panel poner un evento en Inicio, reemplazarlo por otro y quitarlo.
- Validar visualmente con una sesión real las subpantallas de Mi perfil, Servicios, su detalle, el menú Crear y el Modo accesible dentro del marco móvil; los builds y ESLint focalizado pasan, pero no hubo un navegador conectado para aprobar la captura final.
- Validar una sugerencia de publicación con fotografía mediante `analyze-listing-image` usando una sesión real.
- Validar con una sesión real un texto permitido y un texto bloqueable en publicación o comentario; el endpoint ya fue validado para CORS y rechazo sin sesión.
- Validar visualmente con dos sesiones reales el ciclo proponer encuentro → aceptar → continuar chat → cerrar trato.
- Reconciliar el historial remoto de migraciones antes de usar `supabase db push`; actualmente la CLI no reconoce como registradas migraciones que sí están aplicadas.
- Validar con una cuenta admin territorial que no pueda consultar ni modificar otro barrio.
- Aprobar visualmente la página de detalle del comercio con datos reales en una sesión vecinal.
- Cargar productos reales de prueba en `commerce_products`.
- Validar los módulos web de Comercios, Eventos, Incidentes, Usuarios y Farmacias.
- Ejecutar la migración `202607290008_pharmacy_duty.sql` y validar la separación entre farmacias visibles y farmacias de turno.
- Ejecutar la migración `202607290009_news_management.sql` y validar el ciclo crear → publicar/pausar → mostrar en Noticias y, cuando corresponda, en Actividad.
- Ejecutar la migración `202607290010_news_categories.sql` y validar creación, edición, ocultamiento y filtros de categorías de Noticias.
- Ejecutar la migración `202607290006_service_moderation_and_featured.sql` y validar el ciclo servicio pendiente → aprobado → patrocinado/pausado/rechazado.
- Validar creación, edición, bloqueo de autoevaluación y actualización del promedio de opiniones de servicios.
- Ejecutar la migración `202607290001_incident_moderation.sql` en Supabase y probar el ciclo completo alerta activa → oficial, resuelta o rechazada, incluida la aprobación de pendientes antiguos si existieran.
- Ejecutar la migración `202607290002_user_administration.sql` en Supabase y probar verificación, autorización, roles y suspensión.
- Ejecutar la migración `202607290003_user_verification_activity.sql` para guardar la coincidencia dirección/GPS, completar correos y habilitar el historial administrativo.
- Ejecutar la migración `202607290004_beta_neighborhood_polygon.sql` para activar el polígono oficial del barrio beta y la RPC `barrio_en_punto_mvp`.
- Ejecutar la migración `202607290005_posts_activity_selection.sql` para habilitar la selección editorial de eventos en Actividad.
- Validar visual y funcionalmente la publicación y edición de eventos desde el panel web.
- Probar rango horario y categorías administrables después de la ejecución confirmada de `202607280001_event_schedule_and_categories.sql`.
- Probar tarifas múltiples después de la ejecución confirmada de `202607280002_event_ticket_prices.sql`.
- Probar la visibilidad de asistentes después de la ejecución confirmada de `202607280003_event_attendance_visibility.sql`.
- Definir y autorizar una estrategia para alinear `event_attendees` con los eventos actuales de `posts` antes de reactivar la asistencia. No crear ni aplicar cambios de asistencia mientras siga esta incompatibilidad.
- Habilitar el flujo real de Invitar vecinos; la pantalla existe, pero el acceso está marcado como próximo.
- Conectar el formulario de contacto con un canal real de soporte; actualmente solo confirma localmente.
- Definir y conectar enlaces oficiales de redes sociales y soporte.
- Revisar el panel administrativo cuando el producto principal esté estabilizado.
- Confirmar en Supabase las políticas RLS, permisos, funciones RPC y migraciones necesarias para producción.
- Alinear el schema realmente utilizado con las tablas actuales de Supabase y eliminar dependencias de estructuras antiguas cuando se autorice.
- Resolver la estrategia definitiva para `Barrio.jsx`, `Feed.jsx`, `Search.jsx` y las copias de respaldo de `App.jsx`; hoy no intervienen en la ejecución.
- Completar pruebas funcionales integrales de los flujos de vecino, comercio y actores autorizados.
- Preparar registro de usuarios y monetización cuando el prototipo visual y funcional esté sólido.

## Procedimiento obligatorio

Para cada nueva tarea:

1. Lee este archivo.
2. Inspecciona únicamente los archivos relacionados con la solicitud.
3. Explica tu plan.
4. Espera mi aprobación antes de modificar código.
5. Realiza el cambio mínimo necesario.
6. Resume exactamente qué cambiaste.
7. Si el cambio altera la arquitectura, navegación o reglas del proyecto, actualiza AI_CONTEXT.md al finalizar.
8. Si durante la implementación descubres que el plan inicial debe cambiar, detente, explica el motivo y espera una nueva aprobación antes de continuar.
