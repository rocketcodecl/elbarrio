# AI Context — El Barrio

> Contexto operativo breve para trabajar sobre el estado vigente del proyecto.
> Debe actualizarse cuando cambien la arquitectura, la navegación, una decisión de producto importante o el estado de una funcionalidad.

## Arquitectura actual

- Aplicación web móvil construida con Vite 8, React 19 y JavaScript/JSX.
- Existe una aplicación web administrativa independiente en `admin-panel/`, conectada al mismo Supabase y orientada al uso desde computador.
- La interfaz se presenta dentro de un marco de teléfono en escritorio y ocupa la pantalla disponible en móvil.
- `src/main.jsx` monta `src/App.jsx`.
- `App.jsx` funciona como orquestador: controla autenticación, navegación, tabs, historial interno, overlays y usuario activo.
- No se usa React Router. La navegación depende de `currentScreen`, `activeTab`, `params` y `historyRef`.
- No existe un store global. Las pantallas mantienen estado local y consultan sus propios datos.
- Supabase se consume directamente desde el cliente para Auth, PostgreSQL, Storage y Realtime.
- Leaflet y React Leaflet se utilizan para mapas y selección de ubicaciones.
- OpenRouter se usa desde el frontend para ayudar a completar publicaciones desde imágenes.
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

La barra inferior muestra Inicio, Mercado, Servicios, Eventos y Chat. Comercios, Alertas y Perfil se abren desde accesos internos.

### Subpantallas conectadas

- Detalle y edición de producto
- Detalle de evento
- Conversación de chat
- Confirmación de transacción
- Detalle de alerta
- Notificaciones
- Perfil público de vendedor
- Noticias
- Panel administrativo y sus cuatro módulos
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
- `Comercios.jsx` / `CommerceForm.jsx`: feed, detalle y formulario de comercios.
- `ChatList.jsx` / `ChatConversation.jsx`: mensajería asociada a usuarios y publicaciones.
- `MyProfile.jsx`: perfil propio y accesos personales o administrativos.
- `CommunityPagesV2.jsx`: páginas informativas, legales y de contacto.
- `MiniMap.jsx`: mapa reutilizable y selección de ubicación.
- `PostCard.jsx` / `PedidoCard.jsx`: tarjetas reutilizables.
- `lib/design.js`: colores, tipografía, tamaños, categorías y helpers visuales.
- `lib/supabase.js`: única instancia del cliente Supabase.
- `lib/horarios.js`: estado y textos de horarios comerciales.
- `lib/ia.js`: integración de IA para publicaciones.

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
- `Barrio.jsx` y `Feed.jsx` permanecen en el repositorio, pero no están conectados a la aplicación.
- `Search.jsx` tampoco está conectado actualmente.
- La navegación seguirá siendo por estado; no se incorporará otro router sin autorización.
- Plus Jakarta Sans es la tipografía oficial actual.
- Las alertas destacadas del inicio deben ser oficiales, no alertas vecinales comunes.
- La sección “Alerta oficial” del Inicio solo se muestra cuando existe al menos una alerta oficial activa; si no hay ninguna, no ocupa espacio en el feed.
- Los reportes de alerta nuevos se guardan como `pendiente` y no son visibles para los vecinos hasta que un administrador los aprueba. `active` significa publicado, `rechazado` significa descartado y `resuelto` significa cerrado. La marca `is_official` distingue las alertas que aparecen en Inicio.
- Toda aprobación, rechazo, cambio de oficialidad o cierre se realiza mediante `admin_moderate_incident` y deja trazabilidad en `incident_admin_actions` con el perfil administrador responsable.
- `profiles.role` es el único campo que entrega permisos administrativos (`admin` o `vecino`). `user_type` queda reservado para clasificar públicamente el tipo de perfil y `can_publish_events` autoriza actores institucionales a publicar eventos sin convertirlos en administradores.
- Las cuentas suspendidas usan `account_status='suspended'` y quedan bloqueadas tanto en la aplicación como en el panel; la aplicación escucha cambios del perfil para aplicar el bloqueo sin esperar un nuevo inicio de sesión. Las acciones administrativas sobre usuarios se ejecutan mediante `admin_manage_profile` y quedan registradas en `user_admin_actions`.
- El mercado prioriza un feed compacto y visual, con mezcla de venta, regalo y trueque.
- Las publicaciones pueden mostrar el badge `Conversable` cuando corresponda.
- El detalle de una publicación propia permite editarla.
- El chat puede abrirse en modo de prueba o vista previa cuando todas las publicaciones pertenecen al mismo usuario.
- Servicios destacados es una posición comercial identificada como patrocinada o destacada; no implica que sea el mejor servicio.
- Los eventos tienen feed y página de detalle propios; no deben reutilizar la interfaz de una publicación de venta.
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
- Invitar vecinos debe permanecer pendiente de habilitación aunque exista una pantalla implementada.
- Las páginas comunitarias comparten la identidad visual vigente, el header simple con retorno y scroll independiente.
- Los feeds de Mercado, Servicios, Eventos, Chat y Comercios usan un header interno común: botón volver, título centrado en gris carbón con `el barrio` en verde de marca, un ícono lineal grande y translúcido propio de la sección hacia el lado izquierdo, y una línea verde inferior. Inicio conserva su header propio.
- Los CTA de publicación de Mercado y Servicios comparten proporciones compactas y muestran su emoji principal sin círculo; el CTA de Servicios usa la acción `Publícate` y comunica que publicar es gratis.
- Las distancias del feed y detalle de Comercios se calculan desde el GPS del navegador; mientras este responde o si el permiso falla, usan como respaldo las coordenadas verificadas del perfil del vecino.
- La verificación residencial exige dos comprobaciones: la dirección geocodificada debe quedar a un máximo de 250 metros del GPS y ese GPS debe estar dentro del polígono oficial del MVP mediante `barrio_en_punto_mvp`. El perfil conserva ambos puntos y la distancia calculada.
- El polígono oficial del MVP está versionado en `supabase/geo/barrio_beta_polygon.geojson`; la migración `202607290004_beta_neighborhood_polygon.sql` lo asigna únicamente cuando existe exactamente un registro `neighborhoods.is_beta=true`.
- El formato oficial de `opening_hours` es el del panel: claves numéricas de JavaScript (`0` domingo a `6` sábado). La app mantiene lectura de claves abreviadas antiguas para no invalidar comercios previos.

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
- `src/screens/Events.jsx`
- `src/screens/EventDetail.jsx`
- `src/screens/Comercios.jsx`
- `src/components/CommerceForm.jsx`
- `src/screens/ChatList.jsx`
- `src/screens/ChatConversation.jsx`
- `src/screens/MyProfile.jsx`
- `src/screens/CommunityPagesV2.jsx`
- `supabase/migrations/`
- `admin-panel/ADMIN_CONTEXT.md`
- `admin-panel/src/App.jsx`
- `admin-panel/src/screens/IncidentManager.jsx`
- `admin-panel/src/screens/UserManager.jsx`

## Funcionalidades terminadas

- Flujo de registro, login, perfil, verificación y entrada a la aplicación.
- Feed inicial conectado a `Home.jsx`.
- Rediseño actual del feed de Inicio, incluyendo jerarquía de secciones y clima animado.
- Feed del mercado con mezcla de ventas, regalos y trueques, categorías y CTA de publicación.
- Detalle de producto con comentarios, likes, compartir, contacto, edición y eliminación cuando corresponde.
- Flujo de chat y contador de mensajes no leídos.
- Feed de servicios con categorías y sección comercial de destacados.
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
- Módulo web administrativo de Eventos con listado, creación, edición y pausa/publicación; utiliza `posts` con `type='event'` y los permisos ya existentes para administradores.
- El módulo web de Eventos permite definir rango desde/hasta y administrar categorías con ícono. La migración correspondiente está versionada y pendiente de ejecutarse en Supabase.
- El panel de Eventos permite varias tarifas de entrada para eventos pagados y decidir si se muestran los asistentes; las migraciones correspondientes están versionadas y pendientes de ejecutarse en Supabase.
- Módulo web administrativo de Incidentes y alertas con listado, búsqueda, filtros, revisión de contenido, evidencia y ubicación, aprobación, rechazo, oficialización, cierre e historial de acciones administrativas.
- Módulo web administrativo de Usuarios con listado, búsqueda, filtros, revisión de verificación, autorización de actores, asignación administrativa, suspensión, reactivación y auditoría.
- El detalle administrativo de usuario muestra su ubicación GPS, barrio verificado y actividad consolidada: ventas, regalos, trueques, comentarios, alertas, opiniones, servicios y eventos.
- El editor web de comercios incluye búsqueda de dirección y selector cartográfico con marcador móvil; al cambiar el punto sincroniza dirección, latitud y longitud.
- Alertas, detalle de alerta, noticias y notificaciones.
- Perfil propio, perfil público y módulos administrativos conectados.
- Plus Jakarta Sans instalada y aplicada globalmente.
- Páginas Nosotros, Términos, Productos prohibidos, Invitar vecinos, Contáctanos e Información y ayuda conectadas.

## Funcionalidades pendientes

- Terminar y aprobar visualmente la página de detalle del comercio.
- Cargar productos reales de prueba en `commerce_products`.
- Validar los módulos web de Comercios, Eventos, Incidentes y Usuarios; Farmacias sigue pendiente.
- Ejecutar la migración `202607290001_incident_moderation.sql` en Supabase y probar el ciclo completo pendiente → aprobado/oficial → resuelto o rechazado.
- Ejecutar la migración `202607290002_user_administration.sql` en Supabase y probar verificación, autorización, roles y suspensión.
- Ejecutar la migración `202607290003_user_verification_activity.sql` para guardar la coincidencia dirección/GPS, completar correos y habilitar el historial administrativo.
- Ejecutar la migración `202607290004_beta_neighborhood_polygon.sql` para activar el polígono oficial del barrio beta y la RPC `barrio_en_punto_mvp`.
- Validar visual y funcionalmente la publicación y edición de eventos desde el panel web.
- Ejecutar la migración `202607280001_event_schedule_and_categories.sql` en Supabase y probar rango horario y categorías administrables.
- Ejecutar la migración `202607280002_event_ticket_prices.sql` en Supabase y probar tarifas múltiples.
- Ejecutar la migración `202607280003_event_attendance_visibility.sql` en Supabase y probar la visibilidad de asistentes.
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
