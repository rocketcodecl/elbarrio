# Contexto del panel administrativo de El Barrio

## Estado actual

- Fase larga autorizada en curso: moderación pública con IA, cierre integral de Comercios y Productos, reemplazo de Perfil y Modo accesible, con continuidad documentada por bloque. Bloque actual: `2/4 — Comercios y Productos cerrados funcionalmente`.

- La aplicación vecinal modera texto público antes de guardar publicaciones, comentarios y opiniones mediante la Edge Function autenticada `moderate-community-content`. Los chats privados quedan fuera. La migración opcional de auditoría administrativa `202607300004_content_moderation_events.sql` está preparada, pero no aplicada ni debe asumirse aplicada.

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

## Decisiones

- El panel se desplegará posteriormente en `admin.elbarrio.lat`.
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

- Aplicar manualmente `supabase/migrations/202607300004_content_moderation_events.sql` solo si se desea conservar la auditoría administrativa de moderación y confirmar después su ejecución. No usar `supabase db push` mientras el historial remoto siga desalineado.
- Validar con una cuenta admin territorial la separación efectiva respecto del superadministrador.
- Mantener deshabilitada la asistencia. No crear ni aplicar cambios de asistencia hasta definir y autorizar cómo alinear `event_attendees` con los eventos actuales de `posts`.
- Ejecutar `supabase/migrations/202607290001_incident_moderation.sql` y validar el flujo completo del módulo Incidentes.
- Ejecutar `supabase/migrations/202607290002_user_administration.sql` y validar el flujo completo del módulo Usuarios.
- Ejecutar `supabase/migrations/202607290003_user_verification_activity.sql` y validar mapa, correo e historial de actividad.
- Ejecutar `supabase/migrations/202607290004_beta_neighborhood_polygon.sql` y validar puntos dentro y fuera del barrio beta.
- Ejecutar `supabase/migrations/202607290009_news_management.sql` y validar publicación, pausa, marca oficial y aparición opcional en Actividad.
- Ejecutar `supabase/migrations/202607290010_news_categories.sql` y validar la administración y filtros de categorías de Noticias.
