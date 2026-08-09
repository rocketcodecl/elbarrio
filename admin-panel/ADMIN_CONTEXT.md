# Contexto del panel administrativo de El Barrio

## Estado actual

- Bloque competitivo del 9 de agosto: el panel agrega “Reportes de vecinos” para derivar cada denuncia al módulo de moderación correspondiente y registrar resolución o descarte; Usuarios permite declarar actores oficiales con tipo y nombre público sin entregar permisos administrativos; Eventos administra recurrencia; Notificaciones exige categoría y el push respeta la preferencia del destinatario. Las migraciones `202608090005_competitive_community_core.sql`, `202608090006_event_follow_reminders.sql` y `202608090007_notification_campaign_categories.sql` están aplicadas, la auditoría de solo lectura devolvió todo `OK` y `send-push-notification` fue redesplegada.

- Cierre Ultra Admin del 9 de agosto: `contacto@elbarrio.lat` fue verificado remotamente como perfil `El Barrio`, activo, `role='admin'` e `is_superadmin=true`; `fernandocvergara@gmail.com` conserva el mismo alcance global. El panel permite editar identidad y email de acceso, contraseña, contacto, RUT, domicilio, tipo, barrio, permisos y estado de cualquier usuario mediante `admin-update-user` + `admin_update_profile_details`, con motivo y auditoría. No se guardan contraseñas en el repositorio.
- El Ultra Admin ahora puede editar globalmente publicaciones de vecinos con trazabilidad, moderar comentarios y reseñas conservando evidencia, y crear/editar alertas con barrio, prioridad, ubicación, vigencia, imágenes, estado y oficialidad. Las migraciones `202608090003_superadmin_user_content_moderation.sql` y `202608090004_superadmin_incident_publishing.sql` fueron aplicadas y sus RPC se validaron con una sesión real de `contacto@elbarrio.lat`.
- Noticias incorpora enlace externo y mantiene el control “Mostrar también en Actividad”. El panel puede crear, editar, pausar y eliminar noticias, y la app abre el enlace relacionado y la noticia exacta seleccionada desde Inicio.
- La matriz vigente de alcance, límites de privacidad y pruebas está en `admin-panel/ULTRA_ADMIN_AUDIT.md`. Chats privados, likes, favoritos e invitaciones no pueden falsificarse desde administración; sí puede retirarse contenido público y suspender o eliminar a su autor.
- El historial remoto de migraciones quedó reconciliado el 9 de agosto mediante la CLI enlazada. Se corrigió el identificador duplicado de `storage_retention_metrics` a `202608050004` y `supabase db push --dry-run` dejó de reportar migraciones históricas desconocidas.

- Cierre del 5 de agosto: el panel real sirve `index-9L1rT6mT.js` y `index-Ch_qGeI6.css`. Se comprobó que el JavaScript publicado contiene “Uso y servicios”. El módulo está al final del menú y solo se muestra cuando `profiles.is_superadmin=true`; la navegación lateral ahora tiene scroll para evitar que quede cortado en pantallas bajas. Commit de cierre publicado: `13d60a6`.

- “Uso y servicios” está publicado y visible solo al superadministrador, con almacenamiento por bucket, cola de limpieza, créditos OpenRouter, muestra de envíos Resend y estado interno de Firebase. `202608050003_storage_retention_metrics.sql` fue aplicada sin `db push`, `RESEND_API_KEY` quedó como secreto remoto y `admin-service-metrics` / `cleanup-storage-assets` están desplegadas y rechazan acceso sin sesión. Todas las cargas de imágenes del panel pasan por el compresor compartido antes de Storage. Estas lecturas son métricas operativas disponibles, no una garantía de facturación exacta en tiempo real de cada proveedor.

- Auditoría remota del 5 de agosto validó con datos QA reversibles: verificar/autorizar/suspender/reactivar y eliminar usuarios, crear/editar/pausar/cancelar eventos, moderar servicios, cerrar incidentes, crear/editar/eliminar noticias y farmacias, administrar categorías, leer espera/invitaciones/consultas, guardar Privacidad/Nosotros y ejecutar ocultar/cerrar/retirar/restaurar con siete registros de trazabilidad. Los datos temporales fueron eliminados o quedaron retirados y anonimizados según el diseño de auditoría.
- `202608050002_profile_privilege_escalation_guard.sql` está aplicada y validada: bloquea que una sesión vecina modifique directamente `role`, `is_superadmin`, `can_publish_events`, `account_status` o campos de suspensión. Las acciones legítimas del panel continúan pasando por RPC administrativas SECURITY DEFINER.
- Usuarios incorpora eliminación segura visible solo al superadministrador. `202608050001_superadmin_account_deletion.sql` está aplicada, `admin-delete-user` y `delete-my-account` están desplegadas y la eliminación administrativa fue validada con una cuenta QA real.

- El módulo de Notificaciones complementa cada campaña interna con push Android mediante la Edge Function segura `send-push-notification`. El panel solo entrega el `campaign_id`; la función valida al administrador y reutiliza los destinatarios persistidos antes de consultar tokens privados. `202608040003_android_push_notifications.sql` fue ejecutada con resultado `Success`, la credencial Firebase quedó como secreto, la función fue desplegada y rechaza solicitudes anónimas con HTTP 401. El build fue publicado en `https://admin.elbarrio.lat/`; `index-CeQrMynX.js` e `index-BgrMY9nC.css` respondieron HTTP 200. Falta probar una entrega real con el Android registrado.
- La primera prueba del módulo como superadministrador reveló una referencia `id` ambigua en `admin_super_list_notification_campaigns`; `202608040004_notification_rpc_ambiguity_fix.sql` reemplazó la RPC calificando `neighborhood.id` y fue ejecutada con resultado `Success` según confirmación manual del usuario.

- Control global implementado y publicado: los módulos exclusivos “Publicaciones” y “Categorías” permiten al superadministrador moderar todo el contenido almacenado en `posts` con motivo e historial, y administrar categorías de Mercado, Servicios y Alertas sin editar colores. La migración `supabase/migrations/202608040002_superadmin_content_control.sql` fue ejecutada con resultado `Success` según confirmación manual del usuario. El build actualizado fue desplegado en `https://admin.elbarrio.lat/`; `index-DXehGt9E.js` e `index-BgrMY9nC.css` fueron verificados con HTTP 200 el 4 de agosto de 2026.

- El panel incorpora “Portada de Inicio” para seleccionar y ordenar hasta cinco publicaciones activas con fotografía por barrio. Usa `posts.home_carousel_order` y `admin_set_home_discovery_carousel`; la migración `202608010002_home_discovery_carousel.sql` fue ejecutada con resultado `Success` el 1 de agosto de 2026 y una consulta remota confirmó la columna y la protección de la RPC.
- El panel incorpora “Invitaciones” con registros iniciados, vecinos territorialmente verificados, conversión e insignias Conector por barrio. Usa `admin_list_neighbor_invite_metrics`; la migración `202607310003_neighbor_invites.sql` fue ejecutada con resultado `Success` el 31 de julio de 2026 y el módulo está publicado.
- El módulo “Contenido de la app” permite al superadministrador editar los textos de Privacidad y seguridad y todos los textos, portada y cuatro imágenes de Nosotros, sin alterar el layout. Usa `app_content_pages` y `admin_update_app_content`; la migración `202607310002_editable_app_content.sql` fue ejecutada con resultado `Success` el 31 de julio de 2026.
- El panel incorpora “Lista de espera” para consultar email, dirección, comuna, estado y fecha de personas ubicadas fuera del polígono activo. Usa `admin_list_neighborhood_waitlist`; la migración `202607310001_neighborhood_waitlist.sql` fue ejecutada con resultado `Success` el 31 de julio de 2026 según confirmación manual.
- Eventos incorpora un control independiente para poner o quitar un evento en la portada “Hoy en tu barrio”. La migración `202607300005_home_event_spotlight.sql` fue ejecutada con resultado `Success` el 31 de julio de 2026; una consulta remota confirmó la columna `posts.show_on_home`.
- El panel está desplegado y actualizado al cierre funcional vigente en `https://admin.elbarrio.lat/`. El 2 de agosto de 2026 se publicó por FTP limitado el build `npm run build:plesk` y se verificaron `index-DEQjfMcq.js` e `index-B-hOWwKM.css` con HTTP 200. Mantiene DNS, HTTPS y certificado Let’s Encrypt propios; la ruta temporal `/el-barrio/admin/` redirige al dominio vigente.
- Fase larga autorizada completada: moderación pública con IA, cierre integral de Comercios y Productos, reemplazo de Perfil y Modo accesible. Bloque actual: `4/4 — verificación final aprobada por build`.

- El superbloque posterior de pulido UX/UI de la aplicación vecinal también está completado. No modificó este panel; ambos proyectos siguen compilando para producción.

- La aplicación principal y este panel compilan para producción. La migración de auditoría de moderación fue aplicada el 30 de julio de 2026; no se cargaron datos simulados.

- La aplicación vecinal modera texto público antes de guardar publicaciones, comentarios y opiniones mediante la Edge Function autenticada `moderate-community-content`. Los chats privados quedan fuera. La auditoría administrativa `content_moderation_events` está aplicada y rechaza acceso anónimo.

- Existe un módulo independiente de Notificaciones para seleccionar audiencia, confirmar el número de destinatarios, enviar mensajes internos y consultar el historial. Usa RPC administrativas y la migración `202607290015_admin_broadcast_notifications.sql` está aplicada y validada según confirmación manual.

- En Usuarios, un administrador puede enviar una notificación interna manual al perfil seleccionado mediante la RPC segura `admin_send_notification`; requiere la migración `202607290013_admin_send_notification.sql`.

- El panel permite crear y editar servicios con el mismo formulario, incluyendo teléfono, WhatsApp e Instagram opcionales (requiere migración `202607290011_service_contacts.sql`). La edición conserva estado, patrocinio e imágenes si no se reemplaza la portada.

- Aplicación web independiente ubicada en `admin-panel/`.
- Construida con Vite, React, Supabase y Plus Jakarta Sans.
- Usa el mismo proyecto Supabase que la aplicación de vecinos.
- Está pensada principalmente para trabajar desde computador.
- La aplicación móvil original no importa ni depende de este panel.

## Acceso

- El acceso utiliza Supabase Auth con correo y contraseña.
- Después de iniciar sesión se consulta `profiles` mediante `user_id`.
- Solo se permite continuar si `profiles.role` es `admin`.
- La interfaz nunca debe considerarse la única barrera de seguridad: cada operación debe estar protegida además mediante RLS o una función segura en Supabase.
- La moderación con IA es una barrera preventiva y no reemplaza RLS, RPC seguras ni revisión administrativa. Si OpenRouter no responde, opera en modo degradado para no bloquear toda la aplicación.

## Navegación actual

- Resumen: implementado.
- Comercios: implementado el directorio real, búsqueda, filtros, creación y edición completa.
- Eventos: implementado con listado, creación, edición y pausa/publicación desde el panel.
- Farmacias: implementado con listado, búsqueda, creación, edición, ubicación cartográfica, visibilidad, turno independiente, prioridad en Inicio y eliminación.
- Noticias: implementado con listado, búsqueda, filtros, creación, edición, publicación/pausa y selección para Actividad.
- Incidentes: implementado con bandeja de moderación, detalle, ubicación, evidencia y trazabilidad.
- Usuarios: implementado con directorio, verificación, permisos, suspensión y trazabilidad.
- Notificaciones: implementado con audiencias por barrio, verificados, comercios y actores autorizados, más historial administrativo.
- Invitaciones: implementado con métricas reales y alcance territorial para administradores normales o global para el superadministrador.
- Portada de Inicio: implementada para seleccionar y retirar hasta quince tarjetas reales por barrio; la app mezcla el conjunto y muestra cinco por carga. `202608010003_home_carousel_pool.sql` fue ejecutada correctamente según confirmación manual.

## Decisiones

- El panel utiliza `admin.elbarrio.lat` como dominio administrativo oficial y no debe volver a publicarse como aplicación principal bajo `/el-barrio/admin/`.
- No se reutilizarán visualmente las pantallas administrativas móviles antiguas.
- Los módulos antiguos sirven solo como referencia de consultas y reglas vigentes.
- El primer módulo funcional será Comercios + Productos.
- El directorio de Comercios separa tres tareas: listado, editor del comercio y catálogo de productos. No deben mezclarse en una sola vista.
- El editor permite administrar identidad, portada, logo, galería, datos públicos, contacto, ubicación, horarios, descuento y estados.
- El editor permite seleccionar múltiples rubros por comercio; el primero se guarda además como rubro principal en `category` y el conjunto completo en `categories`. Cada rubro utiliza un emoji consistente definido por el panel.
- La ubicación del comercio se define con un mapa OpenStreetMap: permite buscar una dirección, tocar el mapa o arrastrar el marcador; cada cambio sincroniza coordenadas y dirección mediante geocodificación inversa.
- El catálogo permite crear, editar, ocultar, destacar o eliminar productos de `commerce_products` desde una subpágina propia.
- Al editar un producto, el catálogo conserva su fotografía si no se reemplaza y confirma correctamente que fue actualizado. Los errores al cargar el catálogo se muestran sin reemplazar el estado real por una lista vacía silenciosa.
- Las imágenes de productos se almacenan en el bucket público `commerces`, bajo la carpeta `products/{commerce_id}/`.
- Los productos pertenecen a `commerce_products`, no a las publicaciones del Mercado.
- Farmacias utiliza la tabla vigente `farmacias`. `is_active` controla si pertenece al directorio visible, `is_on_duty` si se destaca como farmacia de turno y `sort_order` cuál se presenta primero; el formulario reutiliza el selector cartográfico común para mantener dirección y coordenadas sincronizadas.
- Noticias utiliza `posts` con `type='news'`. `news_is_official` identifica una comunicación oficial, `news_source` conserva su fuente y `show_in_activity` decide si también se integra en “Actividad de el barrio”. El editor admite hasta ocho imágenes en `posts.images`, permite escoger la portada y eliminar imágenes de la galería. Las categorías se administran en `news_categories` con nombre, ícono y visibilidad.
- Servicios permite crear una publicación administrativa asociándola a un perfil del barrio, además de moderar y programar su visibilidad patrocinada.
- No se incluirá ninguna llave privada o `service_role` en el navegador.
- Los eventos usan la tabla `posts` con `type='event'`. El panel permite administrar su portada compacta 16:9, rango desde/hasta, tipo, ubicación, condiciones de entrada y visibilidad.
- `posts.show_on_home` conserva compatibilidad con la selección histórica de un evento. La portada vigente usa `posts.home_carousel_order` para mantener un conjunto editorial de hasta quince publicaciones activas con fotografía; la app mezcla y presenta cinco. La RPC `admin_set_home_discovery_carousel` valida cantidad, barrio, estado, imagen y alcance administrativo.
- En Eventos, `active` significa publicado, `closed` pausado y reactivable, y `cancelled` cancelado definitivamente dentro del panel. La eliminación es una acción separada, irreversible y confirmada.
- Las categorías de Eventos son globales para El Barrio. El administrador puede crearlas, editarlas, asignar un ícono u ocultarlas desde el panel; los eventos existentes conservan su categoría aunque esta se oculte para futuras publicaciones.
- Los eventos pagados pueden definir varias tarifas con etiqueta y valor; el primer valor sigue respaldando el campo histórico `event_price`.
- La asistencia y la opción de mostrar confirmados están deshabilitadas temporalmente por incompatibilidad entre la tabla antigua `events` y los eventos actuales almacenados en `posts`.
- Los nuevos reportes de incidentes se publican inmediatamente con estado `active` por su urgencia. El administrador puede rechazar, marcar o desmarcar como oficial y cerrar como resuelto; la aprobación permanece disponible para pendientes antiguos.
- Las acciones de moderación se ejecutan mediante la función segura `admin_moderate_incident` y se registran en `incident_admin_actions` con el perfil administrador responsable.
- `profiles.role` es el único origen de permisos administrativos. `user_type` clasifica el perfil y `can_publish_events` representa la autorización específica para publicar eventos.
- Los administradores conservan `profiles.role='admin'`. `profiles.is_superadmin=true` identifica al nivel global: los administradores normales quedan limitados a su `neighborhood_id`, mientras el superadministrador puede operar en todos los barrios y administrar otros permisos administrativos. `202607300001_admin_scope_and_superadmin.sql` está aplicada y la cuenta principal fue promovida correctamente según confirmación manual; falta validar la separación con una cuenta admin territorial.
- El superadministrador selecciona explícitamente el barrio al crear comercios, eventos o noticias. Los servicios toman el barrio del prestador seleccionado. Las campañas masivas supremas también se limitan obligatoriamente a un único barrio seleccionado.
- Las pantallas administrativas móviles antiguas no constituyen una vía alternativa para saltarse el alcance: Usuarios e Incidentes utilizan las mismas RPC seguras y sus listados respetan barrio o nivel supremo.
- El módulo Usuarios usa `admin_manage_profile` para verificar, autorizar actores, asignar administradores, suspender y reactivar; cada acción queda en `user_admin_actions`.
- El detalle de Usuarios muestra el GPS guardado durante el registro, el barrio asignado y una cronología consolidada de publicaciones, comentarios, alertas y opiniones mediante `admin_get_user_activity`.
- El límite oficial del MVP vive en `supabase/geo/barrio_beta_polygon.geojson` y se aplica al único barrio `is_beta=true` mediante una migración PostGIS segura.

## Reglas de trabajo

- El código actual y el esquema real de Supabase tienen prioridad sobre la documentación.
- No inventar tablas, campos, permisos ni relaciones.
- Antes de modificar, inspeccionar el módulo y las tablas relacionadas.
- Implementar una funcionalidad por fase y verificarla antes de avanzar.
- Mantener este archivo actualizado después de cambios importantes.

## Pendiente inmediato

- Ejecutar la auditoría de solo lectura `supabase/MVP_RELEASE_AUDIT.sql` y revisar cualquier estructura marcada `FALTA`; no volver a aplicar migraciones por inferencia.
- Validar poner, reemplazar y quitar el evento de portada después de la ejecución confirmada de `supabase/migrations/202607300005_home_event_spotlight.sql`.
- Validar con una cuenta admin territorial la separación efectiva respecto del superadministrador.
- Mantener deshabilitada la asistencia. No crear ni aplicar cambios de asistencia hasta definir y autorizar cómo alinear `event_attendees` con los eventos actuales de `posts`.
- Validar funcionalmente Incidentes, Usuarios, mapa e historial, Noticias y categorías una vez certificado el schema remoto.
- Limpiar el lint de fuentes del panel y excluir `dist` del lint raíz; el build de producción sí pasa.
