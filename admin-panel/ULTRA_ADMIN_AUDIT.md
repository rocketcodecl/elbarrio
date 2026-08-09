# Auditoría funcional del Ultra Admin — 9 de agosto de 2026

Panel oficial: `https://admin.elbarrio.lat`

## Cuentas globales verificadas

- `contacto@elbarrio.lat`: nombre `El Barrio`, rol `admin`, `is_superadmin=true`, estado activo y correo confirmado.
- `fernandocvergara@gmail.com`: conserva rol `admin`, `is_superadmin=true` y estado activo.
- La contraseña no se guarda en Git ni en este documento.

## Matriz de control

| Área de la app | Control del Ultra Admin | Auditoría / límite |
|---|---|---|
| Usuarios | Ver todos los barrios; cambiar nombre, email de acceso, teléfono, RUT, dirección, comuna, biografía, tipo, barrio, insignias y contraseña; verificar, autorizar eventos, asignar rol, promover/revocar superadmin, suspender, reactivar y eliminar | Los cambios sensibles pasan por RPC/Edge Function y dejan motivo. La eliminación exige confirmación |
| Publicaciones vecinales | Ver globalmente; editar contenido y metadatos; ocultar, cerrar, retirar y restaurar ventas, regalos, trueques, pedidos, servicios, eventos y noticias | Cada moderación/edición registra administrador, motivo y estado anterior/nuevo |
| Comentarios y reseñas | Ver comentarios, reseñas de comercios y reseñas de servicios; retirar contenido abusivo | Al retirar se conserva una copia completa en `content_admin_actions` |
| Mercado | Controlar publicaciones mediante Publicaciones; controlar comercios, productos y promociones en módulos propios | Los acuerdos y chats privados no se leen ni editan desde administración |
| Comercios | Crear, editar, activar/desactivar, destacar, ubicar en mapa y administrar imágenes, horarios, contacto y rubros | Alcance global para superadmin; territorial para admin normal |
| Productos de comercio | Crear, editar, ocultar, destacar y eliminar; cargar fotografía | Catálogo separado del Mercado vecinal |
| Promociones | Crear, editar, programar, activar, pausar y eliminar promociones por comercio | Fechas e imagen administrables |
| Servicios | Crear, editar, aprobar, rechazar, pausar, reactivar y programar patrocinio | Puede asociarse a un prestador real del barrio |
| Eventos | Crear, editar, publicar, pausar, cancelar y eliminar; administrar categorías, horarios, precios y portada | Asistencia sigue desactivada por incompatibilidad de esquema documentada |
| Noticias | Crear, editar, publicar, pausar y eliminar; imagen, fuente, enlace externo, categoría, oficialidad y aparición en Actividad | El enlace se muestra también en la app vecinal |
| Alertas | Crear y editar texto, tipo, prioridad, barrio, dirección, coordenadas, imágenes, vigencia, estado y carácter oficial; aprobar, rechazar, oficializar y cerrar | Todas las acciones quedan en `incident_admin_actions` |
| Categorías | Crear, editar y ocultar categorías de Mercado, Servicios y Alertas; categorías propias en Noticias y Eventos | No se cambian colores de marca desde el panel |
| Portada de Inicio | Elegir y ordenar el conjunto editorial por barrio | La app mezcla el conjunto al cargar |
| Farmacias | Crear, editar, ubicar, mostrar/ocultar, marcar turno, ordenar y eliminar | Turno y visibilidad son independientes |
| Notificaciones | Enviar internas y push Android por audiencia y barrio; revisar campañas | Las credenciales privadas permanecen en Edge Functions |
| Contenido institucional | Editar Privacidad y Nosotros, incluida portada e imágenes | Se conserva el layout de la app |
| Lista de espera | Consultar personas, email, dirección, comuna y estado | No permite inventar ni alterar solicitudes de vecinos |
| Invitaciones | Consultar métricas de invitación, verificación, conversión y conectores | No permite adjudicar invitaciones o insignias manualmente |
| Consultas | Leer solicitudes y cambiar su estado de atención | Incluye solicitudes comerciales/publicitarias |
| Uso y servicios | Storage, cola de limpieza, OpenRouter, Resend, Firebase y campañas | Métrica operativa; no reemplaza facturación oficial del proveedor |

## Límites intencionales de seguridad y privacidad

- El Ultra Admin no puede leer ni editar conversaciones privadas entre vecinos.
- No puede fabricar likes, favoritos, reputación, invitaciones ni reseñas en nombre de otra persona.
- Sí puede retirar el contenido público ilegal o abusivo y suspender/eliminar al responsable.
- La asistencia a eventos permanece desactivada hasta resolver correctamente la incompatibilidad entre eventos históricos y `posts`.

## Validaciones ejecutadas

- Build de producción del panel: aprobado.
- Login real de `contacto@elbarrio.lat`: aprobado.
- Perfil remoto: `El Barrio`, activo, administrador global: aprobado.
- Edición administrativa de usuario mediante Edge Function: aprobada.
- Edición global de una publicación mediante RPC: aprobada.
- Lectura global de comentarios/reseñas mediante RPC: aprobada.
- Edición de alerta existente mediante RPC y sin alterar su contenido: aprobada.
- Migraciones remotas `202608090003` y `202608090004`: aplicadas.

## Prueba manual de mañana

La revisión visual debe recorrer cada módulo del menú con `contacto@elbarrio.lat`. No usar la cuenta principal para ensayar eliminación. Para esa única acción se requiere una cuenta desechable real.
