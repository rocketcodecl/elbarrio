# Contexto del panel administrativo de El Barrio

## Estado actual

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

## Navegación actual

- Resumen: implementado.
- Comercios: implementado el directorio real, búsqueda, filtros, creación y edición completa.
- Eventos: implementado con listado, creación, edición y pausa/publicación desde el panel.
- Farmacias: pendiente.
- Incidentes: pendiente.
- Usuarios: pendiente.

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
- Las imágenes de productos se almacenan en el bucket público `commerces`, bajo la carpeta `products/{commerce_id}/`.
- Los productos pertenecen a `commerce_products`, no a las publicaciones del Mercado.
- No se incluirá ninguna llave privada o `service_role` en el navegador.
- Los eventos usan la tabla `posts` con `type='event'`. El panel permite administrar su portada compacta 16:9, rango desde/hasta, tipo, ubicación, condiciones de entrada y visibilidad.
- Las categorías de Eventos son globales para El Barrio. El administrador puede crearlas, editarlas, asignar un ícono u ocultarlas desde el panel; los eventos existentes conservan su categoría aunque esta se oculte para futuras publicaciones.
- Los eventos pagados pueden definir varias tarifas con etiqueta y valor; el primer valor sigue respaldando el campo histórico `event_price`.
- La asistencia y la opción de mostrar confirmados están deshabilitadas temporalmente por incompatibilidad entre la tabla antigua `events` y los eventos actuales almacenados en `posts`.

## Reglas de trabajo

- El código actual y el esquema real de Supabase tienen prioridad sobre la documentación.
- No inventar tablas, campos, permisos ni relaciones.
- Antes de modificar, inspeccionar el módulo y las tablas relacionadas.
- Implementar una funcionalidad por fase y verificarla antes de avanzar.
- Mantener este archivo actualizado después de cambios importantes.

## Pendiente inmediato

- Mantener deshabilitada la asistencia. No crear ni aplicar cambios de asistencia hasta definir y autorizar cómo alinear `event_attendees` con los eventos actuales de `posts`.
