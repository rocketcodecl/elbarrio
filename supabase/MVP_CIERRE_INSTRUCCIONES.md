# SQL preparado para el cierre del MVP

## Estado

`202607300004_content_moderation_events.sql` fue ejecutada con resultado `Success` el 30 de julio de 2026. La tabla fue reconocida posteriormente por PostgREST y rechazó una lectura anónima con HTTP 401, mientras el control sobre una tabla inexistente respondió HTTP 404.

No volver a ejecutarla salvo que se esté reconstruyendo otro entorno.

## Migraciones aplicadas

No hace falta cargar datos de demostración ni productos ficticios.

La migración de moderación ya está aplicada:

- `migrations/202607300004_content_moderation_events.sql`

La migración de portada también fue ejecutada con resultado `Success` el 31 de julio de 2026:

- `migrations/202607300005_home_event_spotlight.sql`

Agrega el control editorial `show_on_home` y la RPC segura `admin_set_home_event_spotlight`. Una consulta remota confirmó que la columna existe. No volver a ejecutarla salvo que se esté reconstruyendo otro entorno.

## Validación de referencia

Si se necesita volver a auditar el entorno, ejecuta esta validación de solo lectura en el proyecto Supabase de El Barrio (`mpecgsiidswcxjrlafkz`):

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

La ejecución ya fue confirmada y registrada en `AI_CONTEXT.md`.

## Advertencia importante

No ejecutar `supabase db push`. El historial remoto de migraciones está desalineado y la CLI intentaría aplicar archivos antiguos que en parte ya existen en producción.

## Datos de Comercios

Los productos reales se cargan desde **Panel administrativo → Comercios → Productos**. Es preferible ese flujo a un `INSERT` manual porque asigna el `commerce_id`, valida permisos y sube fotografías al bucket correcto.
