# CLEANUP_PLAN.md

> Plan de saneamiento del proyecto El Barrio.
>
> **No elimina nada.** Solo clasifica y propone.
>
> Prioridades: 1. Seguridad · 2. Fuente única de verdad · 3. Mantenibilidad.

---

## Criterios de clasificación

- **[MANTENER]** — archivo/carpeta en uso correcto, no requiere acción.
- **[MOVER]** — contenido válido pero en ubicación equivocada.
- **[RENOMBRAR]** — contenido válido pero el nombre confunde.
- **[ELIMINAR]** — basura confirmada, sin valor.
- **[REVISAR]** — requiere decisión humana antes de tocar.

---

## [MANTENER]

### `app-source/elbarrio/` (raíz del proyecto)

- **Ruta**: `/home/z/my-project/app-source/elbarrio/`
- **Motivo**: única fuente oficial de verdad. Proyecto Vite ejecutable.
- **Riesgo**: ninguno.
- **Beneficio**: cualquier trabajo futuro parte de aquí sin ambigüedad.

### `app-source/elbarrio/src/screens/` (27 pantallas activas)

- **Ruta**: `app-source/elbarrio/src/screens/` (excepto `Home.jsx`, `Feed.jsx`, `Search.jsx`)
- **Motivo**: cableadas en `App.jsx`, en uso activo.
- **Riesgo**: ninguno.
- **Beneficio**: estabilidad del flujo de navegación.

### `app-source/elbarrio/src/components/` (9 componentes)

- **Ruta**: `app-source/elbarrio/src/components/`
- **Motivo**: todos importados por pantallas activas.
- **Riesgo**: ninguno.
- **Beneficio**: reutilización transversal.

### `app-source/elbarrio/src/lib/` (4 módulos)

- **Ruta**: `app-source/elbarrio/src/lib/`
- **Motivo**: base compartida (Supabase, design, horarios, ia).
- **Riesgo**: ninguno.
- **Beneficio**: punto único de configuración.

### `app-source/elbarrio/public/`

- **Ruta**: `app-source/elbarrio/public/`
- **Motivo**: branding estático referenciado por `index.html`.
- **Riesgo**: ninguno.
- **Beneficio**: favicon e isotipo cargan correctamente.

### `app-source/elbarrio/src/assets/`

- **Ruta**: `app-source/elbarrio/src/assets/`
- **Motivo**: imágenes usadas en pantallas.
- **Riesgo**: ninguno.
- **Beneficio**: recursos visuales disponibles.

### `app-source/elbarrio/.env`

- **Ruta**: `app-source/elbarrio/.env`
- **Motivo**: claves reales que la app necesita para correr.
- **Riesgo**: ver [REVISAR] — claves en texto plano.
- **Beneficio**: app funcional en local.

### `app-source/elbarrio/supabase_fix_likes_views.sql`

- **Ruta**: `app-source/elbarrio/supabase_fix_likes_views.sql`
- **Motivo**: única migración SQL versionada.
- **Riesgo**: ninguno.
- **Beneficio**: reproducibilidad del schema de `post_likes` + `bump_view`.

### Infraestructura sandbox (Next.js preview)

- **Rutas**: `src/` (raíz), `prisma/`, `db/`, `.zscripts/`, `mini-services/`, `Caddyfile`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`, `components.json`, `eslint.config.mjs`, `tsconfig.json`, `package.json`, `bun.lock`
- **Motivo**: necesario para que el preview Next.js funcione.
- **Riesgo**: confundir sandbox con proyecto real.
- **Beneficio**: capacidad de previsualizar cambios en el chat.

### `docs/`

- **Ruta**: `/home/z/my-project/docs/`
- **Motivo**: documentación del proyecto (PROJECT_CONTEXT, PROJECT_RULES, etc.).
- **Riesgo**: ninguno.
- **Beneficio**: contexto preservado entre sesiones.

---

## [MOVER]

### `app-source/elbarrio/QandA IA.rtf`

- **Ruta**: `app-source/elbarrio/QandA IA.rtf`
- **Destino propuesto**: `docs/QandA IA.rtf`
- **Motivo**: es documentación, no código del proyecto. Moverla a `docs/` unifica el material de referencia.
- **Riesgo**: bajo — no es referenciada por código.
- **Beneficio**: raíz del proyecto más limpia.

### `app-source/elbarrio/supabase_fix_likes_views.sql`

- **Ruta**: `app-source/elbarrio/supabase_fix_likes_views.sql`
- **Destino propuesto**: `app-source/elbarrio/supabase/migrations/0001_post_likes.sql`
- **Motivo**: convención estándar de Supabase. Habilita acumular migraciones futuras con orden.
- **Riesgo**: bajo — referencia manual, no automática.
- **Beneficio**: schema reproducible y versionado correctamente.

---

## [RENOMBRAR]

### `Home.jsx` (huérfana)

- **Ruta**: `app-source/elbarrio/src/screens/Home.jsx`
- **Destino propuesto**: `app-source/elbarrio/src/screens/_deprecated_Home.jsx` (si se decide descartar) o integrar en `App.jsx` (si se decide revivir).
- **Motivo**: el nombre `Home.jsx` sugiere que es la pantalla de inicio, pero la pantalla de inicio real es `Barrio.jsx`. Genera confusión.
- **Riesgo**: medio — si alguien la importa pensando que es la activa, rompe el flujo.
- **Beneficio**: eliminar ambigüedad.

### `Feed.jsx` (huérfana)

- **Ruta**: `app-source/elbarrio/src/screens/Feed.jsx`
- **Destino propuesto**: `app-source/elbarrio/src/screens/_deprecated_Feed.jsx` o eliminar.
- **Motivo**: `Barrio.jsx` ya cumple la función de feed. `Feed.jsx` es una versión vieja no cableada.
- **Riesgo**: bajo — no se importa.
- **Beneficio**: menos archivos que mantener.

### `Search.jsx` (huérfana)

- **Ruta**: `app-source/elbarrio/src/screens/Search.jsx`
- **Destino propuesto**: `app-source/elbarrio/src/screens/_deprecated_Search.jsx` o integrar.
- **Motivo**: no está cableada en `App.jsx`. La búsqueda no existe en la app actual.
- **Riesgo**: bajo — no se importa.
- **Beneficio**: claridad sobre qué pantallas están realmente activas.

### Inconsistencia `role` vs `user_type`

- **Rutas afectadas**:
  - `app-source/elbarrio/src/screens/Admin.jsx` (usa `role === 'admin'`)
  - `app-source/elbarrio/src/screens/AdminUsuarios.jsx` (usa `role === 'admin'`, actualiza `role`)
  - `app-source/elbarrio/src/screens/Barrio.jsx` (usa `user_type === 'admin'`)
- **Destino propuesto**: unificar a un solo campo. Recomendado `role` (porque `AdminUsuarios.jsx` ya lo actualiza y el panel admin lo valida).
- **Motivo**: dos campos para la misma decisión. Un admin marcado por una vía puede no ser reconocido por la otra.
- **Riesgo**: alto — requiere migración de datos en Supabase (`UPDATE profiles SET role = user_type WHERE role IS NULL`) y editar `Barrio.jsx`.
- **Beneficio**: consistencia. Un único campo de admin confiable.

---

## [ELIMINAR]

### `upload/`

- **Ruta**: `/home/z/my-project/upload/`
- **Motivo**: contiene `Barrio.jsx` y `Feed.jsx` divergentes y más viejos que `app-source/`. Sin `package.json`, no es proyecto ejecutable.
- **Riesgo**: ninguno — no se referencia desde código activo.
- **Beneficio**: eliminación de duplicados que confunden.

### `uploaded/elbarrio.zip`

- **Ruta**: `/home/z/my-project/uploaded/elbarrio.zip`
- **Motivo**: snapshot histórico ya descomprimido en `app-source/elbarrio/`. 1.5 MB sin función actual.
- **Riesgo**: ninguno — backup histórico, ya está representado.
- **Beneficio**: menos 1.5 MB de ruido.

### `tool-results/`

- **Ruta**: `/home/z/my-project/tool-results/`
- **Motivo**: 5 archivos `.txt` cache de lecturas de tools previas. Basura operativa.
- **Riesgo**: ninguno.
- **Beneficio**: limpieza de archivos temporales.

### `examples/`

- **Ruta**: `/home/z/my-project/examples/`
- **Motivo**: demo WebSocket genérico (`frontend.tsx`, `server.ts`). No pertenece a El Barrio.
- **Riesgo**: ninguno — no se referencia.
- **Beneficio**: separación clara de qué es del proyecto y qué no.

### `public/descargas.json` (raíz sandbox)

- **Ruta**: `/home/z/my-project/public/descargas.json`
- **Motivo**: bundle generado estáticamente (312 KB) para un panel de descargas que no funcionó. Obsoleto.
- **Riesgo**: ninguno — se puede regenerar.
- **Beneficio**: menos peso en el sandbox.

### `public/badges-preview.html` (raíz sandbox)

- **Ruta**: `/home/z/my-project/public/badges-preview.html`
- **Motivo**: HTML suelto de preview de badges. No integrado al proyecto.
- **Riesgo**: ninguno.
- **Beneficio**: raíz pública del sandbox más limpia.

### `mini-services/downloads/`

- **Ruta**: `/home/z/my-project/mini-services/downloads/`
- **Motivo**: servicio Bun creado para servir descargas que no se terminó usando. Obsoleto.
- **Riesgo**: ninguno.
- **Beneficio**: menos servicios que mantener.

### `.zscripts/dev.pid`

- **Ruta**: `/home/z/my-project/.zscripts/dev.pid`
- **Motivo**: PID de un proceso dev que ya no corre. Stale.
- **Riesgo**: ninguno.
- **Beneficio**: limpieza.

### Logs stale

- **Rutas**: `dev.log` (raíz), `.zscripts/dev.log`, `.zscripts/mini-service-chat-service.log`, `mini-services/downloads/log.txt`
- **Motivo**: logs de sesiones previas. Solo ocupan espacio.
- **Riesgo**: ninguno.
- **Beneficio**: menos ruido.

---

## [REVISAR]

### Pantallas huérfanas — decisión de producto

- **Rutas**: `Home.jsx`, `Feed.jsx`, `Search.jsx`
- **Motivo**: código mantenido que no se ejecuta. `Home.jsx` incluso tiene lógica `is_official` reciente. Hay que decidir:
  - (a) cablearlas al `App.jsx` (revivirlas)
  - (b) eliminarlas (confirmar que no se quieren)
  - (c) mantenerlas como referencia con prefijo `_deprecated_`
- **Riesgo**: alto — decisión de producto. Si se eliminan y se querían, se pierde trabajo. Si se mantienen, siguen confundiendo.
- **Beneficio**: claridad absoluta sobre qué pantallas son la app.

### `.env` con claves Supabase y OpenRouter en texto plano

- **Ruta**: `app-source/elbarrio/.env`
- **Motivo**: las 3 claves (`VITE_SUPABASE_URL`, `VITE_SUPABASE_KEY`, `VITE_OPENROUTER_API_KEY`) están en texto plano. Aunque `.env` suele estar en `.gitignore`, hay que confirmar que no se commitea.
- **Riesgo**: alto — si las claves se exponen, hay que rotarlas.
- **Beneficio**: seguridad.
- **Acción**: verificar `.gitignore` contiene `.env`. Si ya se commiteó, rotar claves.

### Falta de RLS (Row Level Security) documentada

- **Ruta**: Supabase (no en el repo)
- **Motivo**: no hay archivo SQL con políticas RLS. Toda lectura/escritura se hace con anon key desde el frontend. Cualquier usuario podría leer/escribir cualquier fila si RLS no está activada en Supabase.
- **Riesgo**: crítico — fuga de datos o modificación no autorizada.
- **Beneficio**: seguridad.
- **Acción**: revisar el dashboard de Supabase, confirmar que RLS está activa en las 14 tablas, y versionar las políticas en `supabase/migrations/`.

### Schema de Supabase no versionado

- **Ruta**: no existe archivo completo de schema
- **Motivo**: solo `supabase_fix_likes_views.sql` está versionado. El resto del schema (14 tablas, campos, índices) es implícito. Si Supabase se cae o se migra, no hay forma de reconstruirlo.
- **Riesgo**: alto — punto único de fallo.
- **Beneficio**: reproducibilidad.
- **Acción**: exportar el schema completo desde Supabase y guardarlo en `supabase/schema.sql`.

### Diferencias entre `upload/` y `app-source/` para `Barrio.jsx`

- **Rutas**: `app-source/elbarrio/src/screens/Barrio.jsx` (2238 líneas) vs `upload/Barrio.jsx` (2232 líneas)
- **Motivo**: `upload/Barrio.jsx` usa `item.description?.slice(0, 60)` como fallback de título, mientras `app-source/` ya separa `titulo` y `descripcion` con renderizado condicional. Hay que confirmar que `app-source/` es la versión correcta y que no se perdió nada importante en `upload/`.
- **Riesgo**: bajo — `app-source/` parece más reciente.
- **Beneficio**: certeza antes de eliminar `upload/`.

### Diferencias entre `upload/` y `app-source/` para `Feed.jsx`

- **Rutas**: `app-source/elbarrio/src/screens/Feed.jsx` (1318 líneas) vs `upload/Feed.jsx` (1338 líneas)
- **Motivo**: `upload/Feed.jsx` tiene 20 líneas más (estilos `borderLeft`, `alertFlecha`, manejo de `alert.content`). Podría tener mejoras visuales no integradas. Revisar antes de eliminar.
- **Riesgo**: medio — se podrían perder mejoras.
- **Beneficio**: seguridad de no perder trabajo.

### `App.css` y `index.css`

- **Rutas**: `app-source/elbarrio/src/App.css`, `app-source/elbarrio/src/index.css`
- **Motivo**: hay estilos inline en cada pantalla (usando `C`, `T`, `S` de `design.js`) Y archivos CSS globales. Revisar si los CSS globales tienen reglas realmente usadas o son herencia de Vite default.
- **Riesgo**: bajo — probablemente solo reset básico.
- **Beneficio**: claridad sobre qué estilos aplican.

### `react.svg` y `vite.svg` en `assets/`

- **Rutas**: `app-source/elbarrio/src/assets/react.svg`, `app-source/elbarrio/src/assets/vite.svg`
- **Motivo**: logos default de Vite. Probablemente no usados en producción.
- **Riesgo**: ninguno.
- **Beneficio**: limpieza de assets innecesarios.

### `README.md` y `QandA IA.rtf`

- **Rutas**: `app-source/elbarrio/README.md`, `app-source/elbarrio/QandA IA.rtf`
- **Motivo**: revisar si el README está actualizado con el stack real o es el default de Vite. El RTF es documentación legacy.
- **Riesgo**: ninguno.
- **Beneficio**: docs coherentes con el código.

### `mini-services/chat-service/`

- **Ruta**: `/home/z/my-project/mini-services/chat-service/`
- **Motivo**: Bun + socket.io en puerto 3003. Revisar si la app El Barrio realmente lo usa o si el chat va 100% por Supabase Realtime. Si no se usa, eliminar.
- **Riesgo**: medio — si la app lo usa, rompe el chat.
- **Beneficio**: menos servicios que mantener.
- **Acción**: grep en `app-source/elbarrio/src` por `socket.io` o `3003`. (Spoiler del audit: no se encuentra, sugiere que no se usa.)

### `mini-services/downloads/index.ts`

- **Ruta**: `/home/z/my-project/mini-services/downloads/index.ts`
- **Motivo**: creado para servir descargas de `.jsx` que no funcionó bien. Revisar si se quiere mantener como utilidad o eliminar.
- **Riesgo**: ninguno.
- **Beneficio**: menos código que mantener.

---

## Orden de ejecución propuesto (prioridades)

1. **Seguridad primero** (RLS, `.env`, rotación de claves) — sin ejecutar, solo documentar.
2. **Fuente única de verdad** — eliminar `upload/`, `uploaded/elbarrio.zip`, `tool-results/`, `examples/`, `public/descargas.json`, `public/badges-preview.html`.
3. **Mantenibilidad** — decidir sobre pantallas huérfanas (`Home.jsx`, `Feed.jsx`, `Search.jsx`), unificar `role` vs `user_type`, versionar schema de Supabase.
4. **Limpieza menor** — mover SQL a `supabase/migrations/`, mover `QandA IA.rtf` a `docs/`, eliminar logs stale, eliminar `mini-services/downloads/`.

---

## Acciones que **NO** se ejecutan

- No se elimina nada.
- No se mueve nada.
- No se renombra nada.
- No se toca código.
- Este plan es solo una propuesta esperando aprobación humana.

Fin del documento.
