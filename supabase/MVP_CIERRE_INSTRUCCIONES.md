# SQL preparado para el cierre del MVP

## Estado

`202607300004_content_moderation_events.sql` fue ejecutada con resultado `Success` el 30 de julio de 2026. La tabla fue reconocida posteriormente por PostgREST y rechazó una lectura anónima con HTTP 401, mientras el control sobre una tabla inexistente respondió HTTP 404.

No volver a ejecutarla salvo que se esté reconstruyendo otro entorno.

## Qué hace falta cargar

No hace falta cargar datos de demostración ni productos ficticios.

La migración de moderación ya está aplicada:

- `migrations/202607300004_content_moderation_events.sql`

La única migración nueva pendiente de este cierre es:

- `migrations/202607300005_home_event_spotlight.sql`

Agrega el control editorial `show_on_home` y la RPC segura `admin_set_home_event_spotlight`. Por defecto ningún evento ocupa “Hoy en tu barrio”; desde el panel se puede poner o quitar uno, con un máximo de un evento destacado por barrio.

## Orden seguro

1. Abre el proyecto Supabase de El Barrio: `mpecgsiidswcxjrlafkz`.
2. Entra a **SQL Editor** y crea una consulta nueva.
3. Copia el contenido completo de `migrations/202607300005_home_event_spotlight.sql`.
4. Ejecuta la consulta una sola vez.
5. Confirma que Supabase muestre `Success`.
6. Ejecuta esta validación de solo lectura:

```sql
select
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'posts'
      and column_name = 'show_on_home'
  ) as home_column,
  to_regprocedure('public.admin_set_home_event_spotlight(uuid,boolean)') as home_rpc;
```

El resultado esperado es:

- `home_column`: `true`
- `home_rpc`: `admin_set_home_event_spotlight(uuid,boolean)`

Después, informa explícitamente que el SQL fue ejecutado para actualizar `AI_CONTEXT.md`. No debe asumirse aplicado antes de esa confirmación.

## Advertencia importante

No ejecutar `supabase db push`. El historial remoto de migraciones está desalineado y la CLI intentaría aplicar archivos antiguos que en parte ya existen en producción.

## Datos de Comercios

Los productos reales se cargan desde **Panel administrativo → Comercios → Productos**. Es preferible ese flujo a un `INSERT` manual porque asigna el `commerce_id`, valida permisos y sube fotografías al bucket correcto.
