# AI Context — El Barrio

> Contexto operativo breve para trabajar sobre el estado vigente del proyecto.
> Debe actualizarse cuando cambien la arquitectura, la navegación, una decisión de producto importante o el estado de una funcionalidad.

## Estado de continuidad — 5 de agosto de 2026

- Cierre operativo de la jornada: commit `13d60a6` está publicado en `origin/main` sobre `b572f71`. Incluye los últimos ajustes móviles/iOS y corrige el menú del panel para que tenga desplazamiento vertical. No se incluyeron las eliminaciones locales de `landing-page/` ni `ios/build-device/`; deben tratarse como cambios ajenos/no confirmados y no incorporarse por accidente.
- Panel real verificado el 5 de agosto en `https://admin.elbarrio.lat/`: sirve `assets/index-9L1rT6mT.js`, el bundle contiene literalmente “Uso y servicios” y el módulo está al final del menú, visible solo con `profiles.is_superadmin=true`. El menú ahora permite scroll en pantallas de poca altura. Si no aparece, primero hacer recarga forzada y confirmar el rol; no volver a afirmar que falta el despliegue sin verificar el bundle.
- Release Android final regenerado después del último `cap sync`: Gradle terminó con `BUILD SUCCESSFUL`. Entregables locales ignorados por Git: `release/android/el-barrio-1.0.0/el-barrio-1.0.0-release.apk` (SHA-256 `54c4b7ac73f59ec47a0e560efadc21a364b73baf57f5d92f25b9a674739fda18`) y `el-barrio-1.0.0-release.aab` (SHA-256 `84c863846aa50052fe8555ed3139b26e4cca629ba370278b1da44080a34eb302`). El APK es para pruebas/instalación directa; el AAB es el archivo para Google Play.
- “Uso y servicios” muestra métricas disponibles de Supabase Storage y estado/muestras de integraciones. No debe describirse como facturación exacta en tiempo real: OpenRouter, Resend y Firebase dependen de lo que sus APIs/secretos permitan consultar. La retención y limpieza son deliberadamente seguras y diferidas; nunca borrar archivos de Storage por inferencia.

- Control de costos aplicado el 5 de agosto: app y panel comprimen todas las fotografías nuevas con un helper compartido (WebP, máximo 1600 px; avatares 900 px). `202608050003_storage_retention_metrics.sql` fue ejecutada directamente como un único archivo mediante `db query --linked`, sin usar `db push`; una consulta remota confirmó cola, tabla de uso y RPC. Las referencias retiradas esperan siete días antes del borrado físico y las alertas activas vencidas pasan a resueltas al ejecutar retención. `RESEND_API_KEY` quedó como secreto remoto. `analyze-listing-image`, `moderate-community-content`, `send-push-notification`, `admin-service-metrics` y `cleanup-storage-assets` fueron desplegadas; las dos nuevas responden 401 sin sesión. El panel “Uso y servicios” para Storage, OpenRouter, Resend y Firebase fue publicado en `https://admin.elbarrio.lat/`, sus recursos respondieron 200 y se preservaron los logos de correo. App, panel, lint y Deno lint pasan localmente.

- Auditoría funcional remota ejecutada el 5 de agosto con cuentas QA temporales y limpieza posterior. Pasaron: ventas, regalos, trueques, pedidos, servicios pendientes, fotografía de archivo, ocho categorías y tres prioridades de alerta, moderación permitida/bloqueada, chat, oferta, propuesta y aceptación de encuentro, conversación posterior, cancelación, cierre, retiro del feed, favoritos, permisos de eventos, acciones administrativas, noticia, farmacia, categorías, lista de espera, invitaciones, consultas, contenido institucional y eliminación administrativa. La IA reconoció una bicicleta, pero su precio sugerido fue poco confiable. No se efectuaron llamadas reales ni pruebas de cámara/GPS físico.
- La auditoría descubrió que un vecino podía autoasignarse `role='admin'` e `is_superadmin=true` mediante UPDATE directo. `202608050002_profile_privilege_escalation_guard.sql` fue ejecutada con `Success`; la repetición remota confirmó rechazo SQLSTATE 42501 y conservación del rol vecino. Nunca retirar este trigger sin una protección equivalente.
- Correcciones locales derivadas de QA: bloqueo sincrónico contra doble publicación, actualización realtime de alertas en Inicio/Alertas/mapa, actualización realtime de comercios del mapa y “Mis favoritos” unificando productos guardados y comercios. App y panel compilan.
- Release Android 1.0.0 preparado el 5 de agosto de 2026: `versionCode 1`, llave definitiva RSA de 2048 bits, APK release firmado y AAB firmado verificados. El paquete local está en `release/android/el-barrio-1.0.0/` con guía para Google Play y respaldo de firma; toda esa carpeta, `android/signing/` y `android/keystore.properties` están excluidos de Git. La llave y sus contraseñas nunca deben documentarse en archivos versionados.

- Eliminación administrativa de cuentas operativa: `202608050001_superadmin_account_deletion.sql` fue ejecutada con `Success`, `admin-delete-user` y `delete-my-account` están desplegadas y una cuenta QA fue eliminada correctamente desde la función del superadministrador. El módulo exige `ELIMINAR`, protege cuentas administrativas y conserva contenido anonimizado bajo “Vecino eliminado”.

- El arranque nativo dejó de repetir visualmente la marca antes del Splash animado: Android e iOS muestran únicamente el fondo verde oficial `#1B9E75` mientras inicializan el motor; el isotipo, el wordmark y los pilares aparecen una sola vez dentro del Splash React de tres segundos. Android 12+ también anula el ícono automático de la pantalla de lanzamiento. App web, Android debug e iOS Simulator compilan después del ajuste.

- Push Android integrado y validado manualmente desde el panel con la app abierta, en segundo plano y cerrada; tocar el aviso abre Notificaciones y la sesión persiste al cerrar y reabrir. Capacitor registra el token FCM por perfil y crea el canal “El Barrio”. El panel conserva primero la notificación interna y luego invoca `send-push-notification` con el ID de la campaña; la función resuelve los mismos destinatarios autorizados, envía desde un entorno seguro y desactiva tokens inválidos. `202608040003_android_push_notifications.sql` fue ejecutada con resultado `Success`, `android/app/google-services.json` fue validado para `lat.elbarrio.app`, `FIREBASE_SERVICE_ACCOUNT_JSON` quedó cargado como secreto y `send-push-notification` fue desplegada. El ícono pequeño de Android ya usa un recurso monocromático propio de El Barrio en lugar del ícono predeterminado; requiere instalar el APK recompilado y aprobarlo visualmente. El panel actualizado está publicado en `https://admin.elbarrio.lat/`.
- La prueba del panel detectó `column reference "id" is ambiguous` en `admin_super_list_notification_campaigns`, porque el nombre de salida `id` chocaba con `neighborhoods.id` sin calificar. `202608040004_notification_rpc_ambiguity_fix.sql` fue ejecutada con resultado `Success` según confirmación manual del usuario.

- Inicio incorpora acceso directo al “Mapa del barrio” en el header, separado de la identidad territorial por una línea vertical y seguido por notificaciones y perfil; la etiqueta BETA fue retirada. El mapa es una subpantalla completa con filtros para comercios e incidentes activos, respeta el barrio verificado, dibuja el polígono territorial y abre las fichas existentes. Los puntos próximos se agrupan automáticamente mostrando su cantidad y el grupo se expande al tocarlo. No incluye servicios ni exige una migración nueva.

- La apertura de la app conserva un Splash de marca obligatorio de 3 segundos incluso cuando existe una sesión válida; la sesión se resuelve en segundo plano y al terminar pasa directamente a Inicio o al Onboarding según corresponda. El Splash conserva arriba el isotipo original con la entrada animada de sus dos círculos, muestra debajo el wordmark oficial pequeño “el barrio” y presenta secuencialmente los pilares “CONFIANZA”, “SEGURIDAD” y “CERCANÍA”, uno por segundo.

- Control editorial del superadministrador implementado y publicado el 4 de agosto de 2026: el panel incorpora “Publicaciones” para revisar ventas, regalos, trueques, pedidos, servicios, eventos, noticias y publicaciones generales, con acciones trazables de ocultar, cerrar, retirar y restaurar; incorpora además “Categorías” para crear, editar, ordenar, activar u ocultar categorías de Mercado, Servicios y Alertas. La app consume las categorías activas con fallback local. La migración `supabase/migrations/202608040002_superadmin_content_control.sql` fue ejecutada con resultado `Success` según confirmación manual del usuario. El build del panel fue desplegado en `https://admin.elbarrio.lat/` y su HTML, JavaScript y CSS nuevos respondieron HTTP 200.

- Cierre de continuidad móvil verificado el 4 de agosto de 2026: app y panel compilan, Capacitor sincroniza Android/iOS y el APK Android debug vigente fue generado correctamente en `android/app/build/outputs/apk/debug/app-debug.apk`. `npm run mobile:android:apk` reproduce el APK utilizando el Java incluido en Android Studio. Xcode 26.5 quedó instalado y activo en `/Applications/Xcode.app/Contents/Developer`; el proyecto iOS compiló con `BUILD SUCCEEDED`, se instaló y abrió correctamente en el simulador iPhone 17 Pro Max como `lat.elbarrio.app`. El procedimiento autónomo completo quedó en `MOBILE_RELEASE_GUIDE.md`.
- La prueba nativa en iPhone 17 Pro Max detectó y corrigió un desplazamiento horizontal persistente de 16 px causado por el desborde del feed y sus carruseles en WKWebView. Los contenedores raíz ya usan recorte horizontal no desplazable y el feed de Inicio conserva desplazamiento únicamente vertical; una captura posterior confirmó saludo, tarjetas, secciones y TabBar dentro de ambos bordes.

- Landing pública reconstruida desde cero el 4 de agosto de 2026 sobre una única arquitectura responsive, sin una versión móvil paralela ni CSS acumulado. Mantiene el contenido de `dg.jpg`: el hero desarrolla tres escenas dentro de un escenario fijo y las seis áreas cambian texto, imagen y funciones dentro de un segundo escenario fijo. Después presenta acciones, verificación interactiva, pasos, confianza, comercios, FAQ desplegable y formulario de espera. El CMS vive en `landing-page/admin/`, comparte `landing-page/content/site.json` con la web y permite editar textos, tamaños, video e imágenes sin usar Supabase.

- Auditoría local de cierre iniciada el 1 de agosto: la aplicación y el panel compilan en producción. Google OAuth fue validado manualmente con alta, cierre de sesión y reingreso. El informe vigente está en `MVP_RELEASE_AUDIT.md` y la comprobación remota de Supabase, que no modifica datos, está en `supabase/MVP_RELEASE_AUDIT.sql`.
- La consulta `supabase/MVP_RELEASE_AUDIT.sql` fue ejecutada el 1 de agosto de 2026 y todas las tablas, columnas, funciones y verificaciones RLS incluidas devolvieron `OK`. Esto certifica las estructuras operativas consultadas, pero no reconcilia el historial remoto de migraciones; `supabase db push` continúa prohibido.
- Bloqueos reales previos a tiendas: eliminación de cuenta, recuperación de contraseña, canal real de soporte, Política de privacidad pública, acceso equivalente para iOS al ofrecer Google, rotación de credenciales compartidas, validación remota de schema/RLS y prueba con administrador territorial. No ejecutar `supabase db push`; el historial remoto continúa sin reconciliar.
- La aplicación ya tiene contenedores nativos Android e iOS mediante Capacitor 8, con identificador `lat.elbarrio.app`, permisos de cámara/ubicación, orientación vertical, íconos, splash y callback OAuth propio. El APK Android debug fue compilado, instalado y revisado en emulador el 2 de agosto de 2026; abre a pantalla completa sin marco web. La web vigente se conserva como otra salida del mismo código, no como sustituto de la app.
- Falta registrar `lat.elbarrio.app://auth/callback` en las Redirect URLs de Supabase y probar Google/recuperación en un teléfono. iOS está generado pero no puede compilarse en este Mac hasta instalar Xcode. Las notificaciones push nativas todavía no están implementadas.
- Cierre de cuenta y soporte implementados: recuperación de contraseña por correo, actualización segura al volver, Política de privacidad y eliminación autenticada con anonimización. `Contáctanos` ahora registra solicitudes para la bandeja `Consultas` del panel mediante `contact_requests`; requiere ejecutar `202608040001_contact_requests.sql`. El WhatsApp central de soporte, publicidad y destacados es `+56 9 3530 4705` y su única constante de aplicación vive en `src/lib/contact.js`. La migración `202608010001_account_deletion_audit.sql` fue ejecutada con resultado `Success` según confirmación manual y `delete-my-account` fue desplegada mediante el empaquetado remoto de Supabase. Falta probar la eliminación con una cuenta desechable; nunca probar primero con la cuenta superadministradora.
- Inicio aprobado conceptualmente: bajo el bloque intacto de clima y farmacia aparece “Para ti, cerca de casa”, un carrusel suave de hasta cinco contenidos reales con fotografía. Avanza automáticamente cada cinco segundos, se pausa ante interacción y permite deslizamiento manual. No utiliza alertas ni contenido simulado. La selección y el orden quedan en el nuevo módulo “Portada de Inicio” del panel mediante `home_carousel_order`; la migración `202608010002_home_discovery_carousel.sql` fue ejecutada con resultado `Success` el 1 de agosto de 2026 y una consulta remota confirmó la columna y la protección de la RPC.
- Sistema visual de cabeceras normalizado en la app vecinal: las secciones principales usan 72 px mínimos, título de 16 px, controles circulares de 38 px, safe area común y centrado consistente. Alertas, Noticias y Notificaciones dejaron sus variantes sobredimensionadas; las páginas comunitarias, hojas de Perfil, detalle de alerta, perfil público, detalle de servicio y conversación adoptaron las mismas medidas conservando su contenido propio.
- Pulido visual del 3 de agosto: Inicio elimina temporalmente la búsqueda del header, aumenta notificaciones, avatar y los accesos a Eventos/Noticias/Alertas. Las tarjetas editoriales y los servicios destacados incorporan un brillo periódico sutil que respeta `prefers-reduced-motion`. Servicios termina con una invitación para destacar/publicar, y todos los formularios de publicación usan un header compacto verde con retorno textual visible.
- La fuente de marca para el isotipo dentro de la interfaz es `public/isotipo.png`; se usa en Splash, Onboarding y Registro. El ícono instalable es un recurso distinto: `assets/app-icon.png`, copia exacta del archivo oficial `Imagenes APP/icono.png` entregado por el usuario. Los íconos de Android, iOS y PWA deben regenerarse exclusivamente desde `assets/app-icon.png`; nunca desde `public/isotipo.png`.
- El verde oficial es `#1B9E75`; `C.verde` usa ese valor. El isotipo de interfaz fue normalizado a opacidad completa sin alterar su geometría ni RGB. El ícono instalable conserva literalmente su diseño cuadrado verde redondeado con isotipo blanco. Android intercepta `backButton`: cierra Crear, retrocede en detalles y tabs, y solo sale desde Inicio.
- Las cuatro aperturas visuales son Splash más tres slides de Onboarding. Splash usa fondo exacto `#1B9E75`: el arco del isotipo oficial queda estable y sus dos círculos reales suben desde abajo, sin ondas ni círculos decorativos; esta breve animación de marca siempre se ejecuta. Los slides usan fotografías originales de comunidad chilena en `public/onboarding/`, sin isotipo sobre el contenido, con degradado inferior negro neutro y únicamente `#1B9E75` como color de interfaz. Los textos usan balance visual para evitar palabras huérfanas y las animaciones de transición respetan `prefers-reduced-motion`.
- Las fotografías del Onboarding se sirven en WebP (107–127 KB en vez de PNG de casi 2 MB) y se precargan durante el Splash. No volver a referenciar los PNG pesados desde la interfaz.
- La navegación web/ngrok integra `history.pushState` y `popstate`, por lo que el botón/gesto Atrás del teléfono también recorre la app cuando no es una compilación nativa. El túnel debe levantarse siempre con `npm run tunnel`, que reutiliza `balsamic-cola-steadfast.ngrok-free.dev`; cambiar de dominio crea otro almacenamiento del navegador y obliga a iniciar sesión nuevamente.

- Invitaciones vecinales reales implementadas y publicadas: enlace personal por perfil, captura persistente durante el alta, asociación única invitador/invitado, conteo exclusivo tras verificación territorial, notificación automática, insignia persistente “Conector” a los cinco verificados y métricas por barrio en el panel. La migración `202607310003_neighbor_invites.sql` fue ejecutada con resultado `Success` el 31 de julio de 2026; las tres RPC responden HTTP 401 sin sesión, confirmando que existen y permanecen protegidas.
- Contenido institucional editable implementado y publicado: Perfil muestra “Nosotros” inmediatamente bajo “Privacidad y seguridad”; la página Nosotros conserva su layout y consume textos, portada y cuatro imágenes desde `app_content_pages` con fallback local. Privacidad y seguridad consume sus etiquetas desde la misma fuente. El panel agrega “Contenido de la app”, visible solo al superadministrador. La migración `202607310002_editable_app_content.sql` fue ejecutada con resultado `Success` el 31 de julio de 2026 según confirmación manual.
- La migración `202607310001_neighborhood_waitlist.sql` fue ejecutada con resultado `Success` el 31 de julio de 2026 según confirmación manual. Cuando una dirección geocodificada queda fuera del polígono activo, Verificación ofrece una lista de espera con email prellenado; el panel incorpora el módulo “Lista de espera”. App y panel pasan build y ESLint focalizado.
- El flujo de alta permite volver desde Verificación a Datos personales y luego a la cuenta ya creada sin cerrar sesión ni duplicar el registro. Dirección y comuna se conservan en memoria durante esos retornos.
- Cierre posterior implementado en código: los favoritos abren la ficha exacta del comercio y “Hoy en tu barrio” queda oculto por defecto, con selección independiente desde Eventos del panel. App y panel pasan build y ESLint focalizado.
- La migración `202607300005_home_event_spotlight.sql` fue ejecutada con resultado `Success` el 31 de julio de 2026 según confirmación manual. La consulta remota de solo lectura confirmó que `posts.show_on_home` existe; la RPC queda restringida al rol autenticado como define la migración.
- La aplicación principal está desplegada en `https://elbarrio.lat/el-barrio/` y el panel en `https://admin.elbarrio.lat/`, con subdominio, DNS y certificado Let’s Encrypt propios. El panel fue actualizado al build local vigente y verificado por HTTP el 2 de agosto de 2026; la aplicación principal todavía no recibió este último bloque local. Las rutas históricas `https://elbarrio.lat/app.php` y `/el-barrio/admin/` redirigen a sus destinos vigentes. Los builds reproducibles para Plesk usan `npm run build:plesk` en cada proyecto.
- Superbloque de adquisición y pulido visual implementado: alta con campos separados `Nombre` y `Apellido` sin alterar el schema, mapa territorial explicativo en la verificación, favoritos con mayor jerarquía, controles circulares protegidos en Modo accesible y portada editorial “Hoy en tu barrio” basada solo en eventos reales seleccionados.
- La aplicación principal y el panel administrativo compilan después del superbloque. Los archivos focalizados de Perfil, Verificación, MiniMap y Mi perfil pasan ESLint. La revisión visual automatizada sigue pendiente porque no había ningún navegador conectado al entorno.
- La visualización territorial usa una copia cliente del GeoJSON versionado; la confirmación residencial continúa dependiendo de la RPC existente y su estado remoto no se presume.
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
- `android/` e `ios/` son los proyectos nativos generados por Capacitor. Ambos consumen el mismo build de React desde `dist/`; después de cada cambio de la app debe ejecutarse `npm run mobile:sync` antes de compilar en Android Studio o Xcode.
- `capacitor.config.json` define la aplicación nativa `lat.elbarrio.app`. `src/lib/mobileAuth.js` adapta Google OAuth y recuperación de contraseña al callback nativo, manteniendo el flujo web existente.
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

- El CMS de la landing controla navegación, portada, relato inicial, historia de Marta, narrativa de comercios y servicios, cierre/formulario, footer, tamaños, imágenes y videos. Los textos narrativos públicos usan `data-content` y se cargan desde `landing-page/content/site.json`.

- La landing usa `#1b9e75` como único verde de marca visible. Su narrativa principal, comercios y servicios funcionan mediante escenas de scroll con interfaces móviles rectas y proporciones contenidas.
- Los cuatro videos narrativos de la landing son archivos MP4 independientes (`scene-distancia`, `scene-pregunta`, `scene-encuentro`, `scene-comunidad`) reemplazables desde el CMS; actualmente contienen material demostrativo.
- Las pantallas del teléfono de la historia y los paneles visuales de Comercios y Servicios dejaron de construirse como interfaces HTML: ahora son imágenes reemplazables desde el CMS (`screen-inicio`, `screen-servicios`, `screen-mercado`, `screen-eventos` y cuatro imágenes independientes por cada relato comercial y de servicios). Estas últimas cambian con un fade según el paso activo.
- La landing carga `landing-page/mobile.css` después de los estilos generales. Esa hoja contiene la composición móvil aislada; comparte todos los textos y medios del mismo CMS, mientras escritorio conserva su composición propia.
- El formulario de acceso anticipado y su almacenamiento son independientes de Supabase.

- `Home.jsx` es el feed principal y controla el tab Inicio.
- Inicio conserva intacta la franja de clima y farmacia. Inmediatamente debajo muestra “Para ti, cerca de casa”: un carrusel de hasta cinco tarjetas reales con fotografía, ordenadas desde el panel mediante `posts.home_carousel_order`. No incorpora alertas, no inventa contenido y omite material sin imagen; mientras la migración no esté aplicada o no exista selección, conserva el armado automático aprobado como respaldo. El evento elegido se retira de la lista inmediata de Actividad para evitar duplicación.
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
- Invitar vecinos está habilitado y conectado de extremo a extremo: genera enlace personal, conserva el código durante el alta, acepta la invitación después del registro y actualiza progreso e insignia Conector. La migración correspondiente ya fue confirmada como ejecutada.
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

- Landing pública de El Barrio con navegación responsive, hero audiovisual, apertura de scrollytelling cinematográfico en cuatro actos (distancia, necesidad, respuesta y comunidad) y un segundo scrollytelling dedicado a comercios (invisibilidad, descubrimiento, confianza y crecimiento local). Utiliza dos videos web de Mixkit descargados localmente y acreditados en `landing-page/README.md`. Después continúa con la historia funcional de Marta. La demo de la aplicación es ficticia y no utiliza datos ni pantallas reales. Incluye propuesta para vecinos y comercios y formulario de contacto por correo.
- La propuesta comercial de la landing muestra interfaces premium distintas para descubrimiento, ficha comercial, reputación y visibilidad destacada. Existe además una sección propia para servicios con perfil profesional, reputación vecinal, solicitudes cercanas, contacto y visibilidad destacada; comercios y servicios se presentan como vías centrales de monetización y no como contenido secundario.
- El hero y el manifiesto inicial forman una sola experiencia de scrollytelling: el teléfono y la promesa aparecen sobre un escenario audiovisual fijo; al avanzar, el teléfono cede espacio a cuatro escenas narrativas y cada scroll cambia a un video o imagen local diferente con transición suave. No deben volver a separarse en bloques audiovisuales redundantes.
- La propuesta para prestadores de servicios replica el sistema de scrollytelling de comercios, invertido: escenas de texto a la izquierda y escenario visual sticky con perfil profesional a la derecha. El cierre incluye una lista de acceso anticipado con perfiles de vecino, comercio y servicio, y un footer de producto digital con origen en Santiago.
- La landing gestiona su propia lista de acceso anticipado sin Supabase: `landing-page/leads.php` guarda nombre, correo, WhatsApp, comuna y tipo de perfil en un archivo protegido del servidor. El CMS emparejado consulta esos registros con su token privado y los muestra en la sección Inscritos.
- `landing-page/admin/` es un editor PHP independiente para modificar textos y tamaños básicos de la landing. Se instala una sola vez desde `admin/install.php`, guarda credenciales cifradas en `admin/config.php` (ignorado por Git), usa sesión y CSRF, y publica una configuración validada en `landing-page/content/site.json`. No usa Supabase ni comparte autenticación con los otros paneles.
- Despliegue definido para la landing: `elbarrio.lat` y `cms.elbarrio.lat` son instalaciones físicamente independientes. El CMS publica por HTTPS hacia `https://elbarrio.lat/publish.php` usando una clave aleatoria incluida solamente en los dos ZIP emparejados. Ya no depende de carpetas compartidas ni de permisos cruzados en Plesk.
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
- El engranaje de Mi perfil abre la edición de foto, nombre, apellido y teléfono. El RUT verificado se muestra deshabilitado y nunca se incluye en la actualización del perfil. Privacidad y seguridad permanece como una entrada independiente del menú.
- Plus Jakarta Sans instalada y aplicada globalmente.
- Páginas Nosotros, Términos, Productos prohibidos, Invitar vecinos, Contáctanos e Información y ayuda conectadas.
- Inicio incorpora un carrusel editorial administrable. El panel puede preparar hasta quince contenidos con fotografía y la aplicación mezcla el conjunto para mostrar hasta diez por carga, sin alterar clima ni farmacia. La ampliación del límite remoto requiere ejecutar manualmente `202608050003_home_carousel_limit_15.sql`.
- Actividad de el barrio mezcla publicaciones comunitarias, alertas, pedidos, eventos seleccionados y artículos de Mercado. Prioriza un conjunto de publicaciones recientes o vistas y altera su orden por carga para evitar un ranking rígido.
- El detalle de comercio abre su mapa por defecto. El detalle de evento ofrece “Cómo llegar” bajo el mapa mediante un enlace externo compatible con Google Maps o navegador.
- El detalle de Noticias ya no muestra el rótulo “Noticia completa” y presenta la imagen a ancho completo.
- El feed de Actividad identifica cada tipo de contenido mediante un ícono discreto en la esquina superior derecha.
- Alertas fue reorganizada con resumen territorial, CTA principal, tarjetas compactas por nivel y detalle jerarquizado. La composición separa Seguridad, Incendio, Servicios, Animales, Fugas, Luz, Salud y Otros, conservando compatibilidad visual con categorías antiguas. La prioridad obligatoria guarda `alta`, `media` o `baja` en `incident_reports.severity`. Crear alerta ofrece accesos confirmados a 131, 132, 133 y 1402, sin reemplazar a los servicios de emergencia.

## Funcionalidades pendientes

- Agregar `lat.elbarrio.app://auth/callback` a Authentication → URL Configuration → Redirect URLs en Supabase y validar Google OAuth y recuperación de contraseña desde Android real.
- Instalar Xcode, abrir `ios/App/App.xcworkspace` y validar la compilación gratuita en un iPhone propio. Para TestFlight/App Store se necesita la membresía anual de Apple Developer; el proyecto no debe esperar ese pago para seguir avanzando Android y pruebas locales iOS.
- Implementar push reales con registro de dispositivo, Firebase Cloud Messaging para Android, APNs para iOS, contador de ícono y apertura directa de la pantalla correspondiente.
- Incorporar “Iniciar sesión con Apple” antes de enviar a revisión en iOS, porque la aplicación ofrece Google para autenticar la cuenta principal.

- La migración `supabase/migrations/202608010003_home_carousel_pool.sql` fue ejecutada correctamente según confirmación manual. Falta ejecutar `supabase/migrations/202608050003_home_carousel_limit_15.sql` para que Supabase acepte las quince posiciones que ya ofrece el panel; la app mostrará hasta diez mezcladas por carga.
- Validar visualmente en móvil real el nuevo listado, detalle y composición de Alertas, incluidas las llamadas telefónicas.

- Validar el correo de recuperación de contraseña tanto en local como en producción.
- Probar `delete-my-account` únicamente con una cuenta desechable. La migración de auditoría ya fue aplicada y la función ya está desplegada.
- Confirmar que `soporte@elbarrio.lat` esté creado y reciba mensajes antes del lanzamiento.
- Confirmar la URL pública definitiva de la Política de privacidad que se entregará a las tiendas.
- Rotar credenciales de servidor, Plesk, SSH y cualquier contraseña compartida antes de producción.
- Validar desde el panel poner un evento en Inicio, reemplazarlo por otro y quitarlo después de la ejecución confirmada de `202607300005_home_event_spotlight.sql`.
- Validar visualmente con una sesión real las subpantallas de Mi perfil, Servicios, su detalle, el menú Crear y el Modo accesible dentro del marco móvil; los builds y ESLint focalizado pasan, pero no hubo un navegador conectado para aprobar la captura final.
- Validar una sugerencia de publicación con fotografía mediante `analyze-listing-image` usando una sesión real.
- Validar con una sesión real un texto permitido y un texto bloqueable en publicación o comentario; el endpoint ya fue validado para CORS y rechazo sin sesión.
- Validar visualmente con dos sesiones reales el ciclo proponer encuentro → aceptar → continuar chat → cerrar trato.
- Reconciliar el historial remoto de migraciones antes de usar `supabase db push`; actualmente la CLI no reconoce como registradas migraciones que sí están aplicadas.
- Validar con una cuenta admin territorial que no pueda consultar ni modificar otro barrio.
- Aprobar visualmente la página de detalle del comercio con datos reales en una sesión vecinal.
- Validar los módulos web de Comercios, Eventos, Incidentes, Usuarios y Farmacias.
- Validar la separación entre farmacias visibles y farmacias de turno, el ciclo de Noticias y sus categorías, y el ciclo servicio pendiente → aprobado → patrocinado/pausado/rechazado. Su estructura remota debe comprobarse primero con la auditoría SQL, sin presumir migraciones.
- Validar creación, edición, bloqueo de autoevaluación y actualización del promedio de opiniones de servicios.
- Probar el ciclo completo de incidentes, usuarios, verificación territorial y selección editorial de eventos después de certificar sus estructuras con la auditoría SQL.
- Validar visual y funcionalmente la publicación y edición de eventos desde el panel web.
- Probar rango horario y categorías administrables después de la ejecución confirmada de `202607280001_event_schedule_and_categories.sql`.
- Probar tarifas múltiples después de la ejecución confirmada de `202607280002_event_ticket_prices.sql`.
- Probar la visibilidad de asistentes después de la ejecución confirmada de `202607280003_event_attendance_visibility.sql`.
- Definir y autorizar una estrategia para alinear `event_attendees` con los eventos actuales de `posts` antes de reactivar la asistencia. No crear ni aplicar cambios de asistencia mientras siga esta incompatibilidad.
- Confirmar en Supabase las políticas RLS, permisos, funciones RPC y migraciones necesarias para producción.
- Alinear el schema realmente utilizado con las tablas actuales de Supabase y eliminar dependencias de estructuras antiguas cuando se autorice.
- Resolver la estrategia definitiva para `Barrio.jsx`, `Feed.jsx`, `Search.jsx` y las copias de respaldo de `App.jsx`; hoy no intervienen en la ejecución.
- Completar pruebas funcionales integrales de los flujos de vecino, comercio y actores autorizados.
- Limpiar el lint de las fuentes conectadas y excluir los directorios `dist`; los builds pasan, pero el lint completo todavía contiene deuda de React 19 y pantallas antiguas desconectadas.
- Antes de abrir nuevos barrios, exigir que invitador e invitado pertenezcan al mismo barrio para que una invitación verificada sume a la insignia.

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
