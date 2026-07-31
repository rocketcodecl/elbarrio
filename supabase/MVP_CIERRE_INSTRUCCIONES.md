# SQL preparado para el cierre del MVP

## Estado

`202607300004_content_moderation_events.sql` fue ejecutada con resultado `Success` el 30 de julio de 2026. La tabla fue reconocida posteriormente por PostgREST y rechazó una lectura anónima con HTTP 401, mientras el control sobre una tabla inexistente respondió HTTP 404.

No volver a ejecutarla salvo que se esté reconstruyendo otro entorno.

## Qué hace falta cargar

No hace falta cargar datos de demostración ni productos ficticios.

Existe una sola migración nueva y opcional:

- `migrations/202607300004_content_moderation_events.sql`

La moderación con IA ya funciona sin esta migración. El SQL agrega únicamente la bitácora administrativa `content_moderation_events` para conservar decisiones de moderación y permitir su consulta según el alcance territorial del administrador.

## Orden seguro

1. Abre el proyecto Supabase de El Barrio: `mpecgsiidswcxjrlafkz`.
2. Entra a **SQL Editor** y crea una consulta nueva.
3. Copia el contenido completo de `migrations/202607300004_content_moderation_events.sql`.
4. Ejecuta la consulta una sola vez.
5. Confirma que Supabase muestre `Success`.
6. Ejecuta esta validación de solo lectura:

```sql
select
  to_regclass('public.content_moderation_events') as moderation_table,
  (
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and tablename = 'content_moderation_events'
  ) as rls_policies;
```

El resultado esperado es:

- `moderation_table`: `content_moderation_events`
- `rls_policies`: `1`

Después, informa explícitamente que el SQL fue ejecutado para actualizar `AI_CONTEXT.md`. No debe asumirse aplicado antes de esa confirmación.

## Advertencia importante

No ejecutar `supabase db push`. El historial remoto de migraciones está desalineado y la CLI intentaría aplicar archivos antiguos que en parte ya existen en producción.

## Datos de Comercios

Los productos reales se cargan desde **Panel administrativo → Comercios → Productos**. Es preferible ese flujo a un `INSERT` manual porque asigna el `commerce_id`, valida permisos y sube fotografías al bucket correcto.
