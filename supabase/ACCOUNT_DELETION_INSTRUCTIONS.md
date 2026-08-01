# Activación de eliminación de cuenta

## 1. Ejecutar la migración

Estado: ejecutada con resultado `Success` el 1 de agosto de 2026, según confirmación manual.

En Supabase → SQL Editor, abrir y ejecutar completa:

`supabase/migrations/202608010001_account_deletion_audit.sql`

Resultado esperado: `Success. No rows returned`.

Esta migración solo crea `account_deletion_events`, una bitácora técnica sin correo ni RUT. No modifica cuentas existentes.

## 2. Desplegar la Edge Function

Desde la raíz del proyecto, con Supabase CLI conectado al proyecto correcto:

```bash
supabase functions deploy delete-my-account --no-verify-jwt
```

La función igualmente valida el token del usuario dentro de su código. Utiliza los secretos administrados automáticamente por Supabase: `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY`.

## 3. Verificar recuperación de contraseña

En Supabase → Authentication → URL Configuration, confirmar que estén autorizadas:

- `http://localhost:5173/`
- `https://elbarrio.lat/el-barrio/`

La consulta `?recovery=password` se agrega automáticamente al enlace y no requiere otra ruta.

## 4. Prueba segura

1. Probar primero recuperación de contraseña con una cuenta de ensayo.
2. Crear una cuenta desechable, completar su perfil y asignarle un avatar.
3. Ir a Mi perfil → Privacidad y seguridad → Eliminar mi cuenta.
4. Confirmar que ya no puede iniciar sesión.
5. Confirmar en `profiles` que nombre, RUT, correo, teléfono, dirección, GPS y avatar quedaron anonimizados.
6. Confirmar que `account_deletion_events.status` sea `completed`.

No probar inicialmente con la cuenta superadministradora.
