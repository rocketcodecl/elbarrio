# EL BARRIO — CHECKLIST DE CIERRE Y PUBLICACIÓN
Actualizado: 1 de agosto de 2026

## OBJETIVO
Publicar El Barrio como aplicación real para iPhone y Android, manteniendo funcionando la versión web, el panel administrativo y la landing.

## ORDEN GENERAL
Auditoría → App nativa → Push → Cumplimiento → Beta → Tiendas → Lanzamiento


## 1. AUDITORÍA FUNCIONAL FINAL

- [x] Actualizar AI_CONTEXT.md según el código vigente.
- [x] Eliminar de la documentación pendientes que ya fueron terminados.
- [x] Confirmar mediante auditoría de solo lectura las estructuras remotas requeridas.
- [ ] No ejecutar supabase db push hasta reconciliar el historial remoto.
- [ ] Validar registro nuevo mediante correo y contraseña.
- [x] Validar registro nuevo mediante Google.
- [ ] Validar ingreso posterior mediante correo.
- [x] Validar ingreso posterior mediante Google.
- [ ] Validar recuperación de sesión después de cerrar y abrir la app.
- [ ] Validar nombre, apellido y RUT sin duplicar perfiles.
- [ ] Validar dirección, GPS, distancia y polígono territorial.
- [ ] Validar flujo fuera de zona y lista de espera.
- [ ] Validar invitación → registro → verificación → progreso del invitador.
- [ ] Validar publicación de venta, regalo, trueque y solicitud de ayuda.
- [ ] Validar reconocimiento de fotografía y autocompletado con IA.
- [ ] Validar moderación de publicaciones, comentarios y opiniones.
- [ ] Validar alertas urgentes en Inicio y sección Alertas.
- [ ] Validar creación, edición y cierre de tratos del Mercado.
- [ ] Confirmar que una publicación cerrada deja de aparecer en feeds activos.
- [ ] Validar chat entre dos usuarios reales.
- [ ] Validar comercios, favoritos, productos y opiniones.
- [ ] Validar servicios, aprobación administrativa y opiniones.
- [ ] Validar eventos, noticias y portada editorial.
- [ ] Validar Mi perfil, estadísticas, insignias y Modo accesible.
- [ ] Validar panel con superadministrador.
- [ ] Validar aislamiento con una cuenta de administrador territorial.
- [ ] Registrar errores encontrados y resolver todos los bloqueantes.
- [x] Confirmar build de producción de la app principal.
- [x] Confirmar build de producción del panel administrativo.
- [x] Ejecutar supabase/MVP_RELEASE_AUDIT.sql y confirmar que todo devuelve OK.
- [x] Implementar recuperación real de contraseña en código.
- [ ] Validar el correo de recuperación en local y producción.
- [x] Reemplazar el formulario de contacto simulado por soporte real.


## 2. BASE NATIVA PARA IPHONE Y ANDROID

- [ ] Definir identificador oficial de la aplicación (recomendado: lat.elbarrio.app).
- [ ] Definir nombre oficial visible: El Barrio.
- [ ] Incorporar Capacitor al proyecto vigente.
- [ ] Crear proyecto nativo iOS.
- [ ] Crear proyecto nativo Android.
- [ ] Mantener funcionando la versión web actual.
- [ ] Eliminar el marco visual de teléfono dentro de las versiones nativas.
- [ ] Configurar safe areas de iPhone y Android.
- [ ] Configurar ícono oficial de la aplicación.
- [ ] Configurar splash screen oficial.
- [ ] Configurar permisos nativos de ubicación.
- [ ] Configurar permisos nativos de cámara y fotografías.
- [ ] Validar selector de fotografías en iPhone.
- [ ] Validar selector de fotografías en Android.
- [ ] Validar GPS residencial en dispositivos reales.
- [ ] Configurar enlaces externos, WhatsApp, teléfono y mapas.
- [ ] Configurar teclado, scroll y botón volver de Android.
- [ ] Configurar apertura de enlaces de invitación dentro de la app.
- [ ] Crear credencial OAuth de Google para iOS.
- [ ] Crear credencial OAuth de Google para Android.
- [ ] Incorporar Iniciar sesión con Apple como opción equivalente en iOS.
- [ ] Validar Google login en iPhone y Android.
- [ ] Documentar comandos de compilación y sincronización nativa.


## 3. NOTIFICACIONES PUSH REALES

- [ ] Crear o configurar proyecto Firebase para El Barrio.
- [ ] Configurar Firebase Cloud Messaging para Android.
- [ ] Configurar Apple Push Notification Service para iPhone.
- [ ] Crear tabla segura de dispositivos y tokens push.
- [ ] Definir renovación y eliminación de tokens inválidos.
- [ ] Solicitar permiso de notificaciones en un momento comprensible.
- [ ] Enviar push por mensaje nuevo.
- [ ] Enviar push por propuesta o respuesta de trato.
- [ ] Enviar push por alerta urgente del barrio.
- [ ] Enviar push por invitación vecinal verificada.
- [ ] Enviar comunicaciones administrativas importantes.
- [ ] Mostrar contador de notificaciones en el ícono de la app.
- [ ] Abrir la conversación correcta al tocar una notificación de chat.
- [ ] Abrir la alerta correcta al tocar una notificación urgente.
- [ ] Abrir la publicación o trato correspondiente desde una notificación.
- [ ] Respetar barrio, permisos y estado de cuenta en todos los envíos.
- [ ] Validar push con app abierta, en segundo plano y cerrada.


## 4. CUMPLIMIENTO, PRIVACIDAD Y SEGURIDAD

- [x] Implementar eliminación real de cuenta desde Mi perfil.
- [x] Definir qué ocurre con publicaciones, comentarios, mensajes e imágenes al eliminar una cuenta.
- [x] Incorporar Política de privacidad dentro de la app.
- [ ] Confirmar la URL pública definitiva de la Política de privacidad para las tiendas.
- [x] Ejecutar 202608010001_account_deletion_audit.sql.
- [ ] Desplegar y probar la Edge Function delete-my-account.
- [ ] Publicar Términos y condiciones en una URL pública estable.
- [ ] Agregar correo oficial de soporte.
- [ ] Explicar por qué se solicita ubicación.
- [ ] Explicar por qué se solicita cámara y acceso a fotografías.
- [ ] Revisar almacenamiento y visibilidad del RUT.
- [ ] Confirmar que dirección y GPS nunca se muestran públicamente.
- [ ] Validar suspensión, bloqueo, reportes y moderación.
- [ ] Revisar permisos RLS de las tablas críticas.
- [ ] Revisar secretos de Supabase, Google, OpenRouter, Firebase y Apple.
- [ ] Rotar la contraseña SSH compartida durante el desarrollo.
- [ ] Completar ficha de privacidad de Apple.
- [ ] Completar sección Data Safety de Google Play.
- [ ] Revisar requisitos vigentes de App Store y Google Play antes del envío.


## 5. BETA CERRADA

- [ ] Crear acceso a Apple Developer Program.
- [ ] Crear acceso a Google Play Console.
- [ ] Crear ficha de la aplicación en App Store Connect.
- [ ] Crear ficha de la aplicación en Google Play Console.
- [ ] Subir primera compilación a TestFlight.
- [ ] Subir primera compilación a Internal Testing de Google Play.
- [ ] Probar en al menos un iPhone real.
- [ ] Probar en al menos un Android real.
- [ ] Probar registro por correo en ambos sistemas.
- [ ] Probar registro con Google en ambos sistemas.
- [ ] Probar GPS, cámara, fotografías y mapas.
- [ ] Probar push con la app completamente cerrada.
- [ ] Probar invitaciones y apertura directa de enlaces.
- [ ] Probar compra/venta y chat entre dos dispositivos.
- [ ] Probar Modo accesible y tamaños de texto.
- [ ] Probar pérdida de internet y recuperación de conexión.
- [ ] Resolver cierres inesperados y errores bloqueantes.
- [ ] Obtener aprobación de un grupo pequeño de vecinos reales.


## 6. MATERIAL PARA LAS TIENDAS

- [ ] Redactar nombre, subtítulo y descripción corta.
- [ ] Redactar descripción completa de la aplicación.
- [ ] Definir palabras clave.
- [ ] Preparar ícono en las medidas exigidas.
- [ ] Preparar capturas reales de iPhone.
- [ ] Preparar capturas reales de Android.
- [ ] Preparar imagen promocional de Google Play.
- [ ] Definir categoría de la aplicación.
- [ ] Definir clasificación de edad y contenido.
- [ ] Agregar URL de soporte.
- [ ] Agregar URL de privacidad.
- [ ] Preparar instrucciones para el equipo de revisión.
- [ ] Crear una cuenta de prueba para revisión si fuese necesaria.


## 7. INFRAESTRUCTURA Y PUBLICACIÓN WEB

- [ ] Publicar la app web acumulada en el servidor.
- [ ] Publicar el panel administrativo acumulado.
- [ ] Publicar la landing nueva.
- [ ] Configurar cms.elbarrio.lat.
- [ ] Instalar y proteger el CMS de la landing.
- [ ] Activar HTTPS en todos los dominios y subdominios.
- [ ] Verificar redirecciones antiguas.
- [ ] Confirmar respaldos antes de cada publicación.
- [ ] Cambiar la contraseña SSH del servidor.
- [ ] Validar Google login en producción.
- [ ] Validar enlaces de invitación en producción.


## 8. LANZAMIENTO DEL BARRIO MVP

- [ ] Cargar o revisar comercios reales del barrio inicial.
- [ ] Revisar farmacias y datos de contacto.
- [ ] Preparar el primer evento o noticia oficial.
- [ ] Preparar protocolo para alertas urgentes.
- [ ] Definir quién responderá soporte y moderación.
- [ ] Confirmar administradores territoriales autorizados.
- [ ] Preparar invitación inicial para vecinos fundadores.
- [ ] Publicar la versión aprobada en App Store.
- [ ] Publicar la versión aprobada en Google Play.
- [ ] Monitorear registros, errores, alertas y reportes durante la primera semana.
- [ ] Registrar aprendizajes y preparar la actualización 1.1.


## FUERA DEL MVP / VERSIÓN POSTERIOR

- [ ] Reactivar asistencia a eventos después de alinear event_attendees con posts.
- [ ] Ampliar polígonos y barrios activos.
- [ ] Automatizar activación de personas en lista de espera.
- [ ] Incorporar nuevas alternativas de inicio de sesión si se justifican.
- [ ] Mejorar analítica de producto y crecimiento.
- [ ] Ampliar monetización de comercios y servicios.


## REGLA DE CIERRE

Una etapa se marca como terminada solamente cuando:

- [ ] El código está implementado.
- [ ] La funcionalidad fue probada en el entorno correspondiente.
- [ ] Lint y build pasan correctamente.
- [ ] El cambio quedó en un commit identificado.
- [ ] La documentación fue actualizada.
- [ ] Si requiere backend o migración, su aplicación fue confirmada explícitamente.
