# SQL preparado para el cierre del MVP

## Eliminación de cuentas desde superadministración — pendiente de aplicar

1. Ejecutar completa en Supabase SQL Editor:

   `supabase/migrations/202608050001_superadmin_account_deletion.sql`

2. Confirmar `Success. No rows returned`.
3. Desplegar después las funciones:

   `supabase functions deploy admin-delete-user --no-verify-jwt`

   `supabase functions deploy delete-my-account --no-verify-jwt`

Ambas funciones validan internamente la sesión. `admin-delete-user` exige además una cuenta activa con `role='admin'` e `is_superadmin=true`. No desplegar la función administrativa antes de confirmar la migración.

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

## Migraciones de contenido e invitaciones aplicadas

Ambas migraciones fueron ejecutadas con resultado `Success` el 31 de julio de 2026:

1. `migrations/202607310002_editable_app_content.sql`
2. `migrations/202607310003_neighbor_invites.sql`

La segunda agrega enlaces personales, trazabilidad de invitados, la insignia Conector y las métricas del panel. Las RPC fueron reconocidas posteriormente por PostgREST y rechazaron solicitudes anónimas con HTTP 401, como corresponde. No volver a ejecutar estos archivos salvo que se esté reconstruyendo otro entorno.

Después de aplicar la segunda, valida con esta consulta de solo lectura:

```sql
select
  exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'neighbor_invites'
  ) as invite_table,
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'invite_code'
  ) as invite_code,
  to_regprocedure('public.get_my_neighbor_invites()') as invite_dashboard_rpc,
  to_regprocedure('public.accept_neighbor_invite(text)') as accept_invite_rpc,
  to_regprocedure('public.admin_list_neighbor_invite_metrics()') as admin_invite_rpc;
```

Los cinco resultados deben existir o mostrarse como `true` en las dos primeras columnas.

## Datos de Comercios

Los productos reales se cargan desde **Panel administrativo → Comercios → Productos**. Es preferible ese flujo a un `INSERT` manual porque asigna el `commerce_id`, valida permisos y sube fotografías al bucket correcto.
