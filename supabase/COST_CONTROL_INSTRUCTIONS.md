# Activación de control de costos

El código incluye compresión, cola recuperable de limpieza, retención y el módulo administrativo **Uso y servicios**. La activación inicial fue completada el 5 de agosto de 2026 sin ejecutar `supabase db push`; este archivo conserva el procedimiento de recuperación.

## Orden obligatorio

1. Ejecutar completo en Supabase SQL Editor:

   `supabase/migrations/202608050003_storage_retention_metrics.sql`

2. Confirmar que finaliza con `Success`. La migración no borra archivos existentes: solamente crea la cola y comienza a observar referencias que se retiren desde ese momento.

3. En **Edge Functions → Secrets**, guardar la clave de Resend como `RESEND_API_KEY`. No incorporarla a Git ni a archivos `.env` con prefijo `VITE_`.

4. Desplegar o volver a desplegar estas funciones después del SQL:

   - `analyze-listing-image`
   - `moderate-community-content`
   - `send-push-notification`
   - `admin-service-metrics`
   - `cleanup-storage-assets`

5. Publicar el build vigente de `admin-panel/` en `https://admin.elbarrio.lat/`.

6. Entrar como superadministrador a **Uso y servicios**. La primera apertura archiva alertas activas vencidas. El botón **Ejecutar limpieza segura** procesa solamente objetos cuya referencia fue retirada hace al menos siete días.

## Política aplicada

- Fotografías nuevas: máximo 1600 × 1600 px, WebP con calidad 82%; avatares máximo 900 × 900 px.
- Archivos sin referencia: cola de siete días antes de eliminación física.
- Alertas activas vencidas: pasan a `resuelto` y conservan trazabilidad.
- Publicaciones cerradas, noticias, eventos, chats y moderaciones: se conservan; no existe borrado masivo automático.
- OpenRouter: registra operaciones nuevas y consulta créditos cuando la clave tenga permiso para ese endpoint.
- Resend: consulta hasta cien emails recientes y sus estados; el endpoint no representa una factura completa.
- Firebase: muestra tokens activos, campañas internas y resultados registrados por El Barrio. FCM no cobra por el envío de mensajes.

## Verificación segura

- Subir una fotografía grande y confirmar que la URL nueva termina en `.webp`.
- Retirar una referencia de prueba y confirmar que aparece como pendiente, sin borrarse inmediatamente.
- No alterar manualmente `delete_after` para contenido real.
- Si OpenRouter o Resend muestran “Sin lectura”, revisar permisos del secreto; esto no debe bloquear la app.
