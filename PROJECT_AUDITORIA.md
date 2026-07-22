# PROJECT_CONTEXT.md

> Auditoría basada exclusivamente en archivos reales.
>
> **Fuentes permitidas**: código actual, estructura del proyecto, archivos existentes.
> **Fuentes prohibidas**: worklogs, handovers, memoria de sesiones anteriores.
>
> Fecha de auditoría: 2026-07-21

---

## 1. Ruta raíz real

```
/home/z/my-project/app-source/elbarrio/
```

**Confirmación basada en archivos:**

- Estructura Vite válida: `vite.config.js`, `index.html`, `package.json`, `package-lock.json`
- `package.json` declara `"name": "elbarrio"` y `"private": true`
- `.env` presente con las claves que el código importa:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_KEY`
  - `VITE_OPENROUTER_API_KEY`
- Stack declarado en `package.json`:
  - `@supabase/supabase-js` ^2.110.7
  - `leaflet` ^1.9.4
  - `react` ^19.2.7
  - `react-dom` ^19.2.7
  - `react-leaflet` ^5.0.0
- Coincide con la estructura interna de `uploaded/elbarrio.zip`

---

## 2. Árbol principal

```
/home/z/my-project/app-source/elbarrio/
├── .env                          # claves Supabase + OpenRouter
├── .gitignore
├── README.md
├── QandA IA.rtf
├── eslint.config.js
├── index.html                    # entry Vite
├── package.json                  # "elbarrio" — Vite + React 19 + Supabase
├── package-lock.json
├── vite.config.js
├── supabase_fix_likes_views.sql  # SQL de migración Supabase
├── public/
│   ├── favicon.svg
│   ├── icons.svg
│   └── isotipo.png
└── src/
    ├── App.css
    ├── App.jsx                   # router principal
    ├── index.css
    ├── main.jsx                  # entry React
    ├── assets/
    │   ├── hero.png
    │   ├── react.svg
    │   └── vite.svg
    ├── components/   (9 archivos)
    │   ├── AvisoForm.jsx
    │   ├── CommerceForm.jsx
    │   ├── MiniMap.jsx
    │   ├── PedidoCard.jsx
    │   ├── PostCard.jsx
    │   ├── PromoForm.jsx
    │   ├── Stepper.jsx
    │   ├── TabBar.jsx
    │   └── TopBar.jsx
    ├── lib/          (4 archivos)
    │   ├── design.js
    │   ├── horarios.js
    │   ├── ia.js
    │   └── supabase.js
    └── screens/      (30 archivos)
        ├── Admin.jsx
        ├── AdminComercios.jsx
        ├── AdminFarmacias.jsx
        ├── AdminIncidentes.jsx
        ├── AdminUsuarios.jsx
        ├── AlertaDetail.jsx
        ├── Alertas.jsx
        ├── Barrio.jsx
        ├── ChatConversation.jsx
        ├── ChatList.jsx
        ├── Comercios.jsx
        ├── Complete.jsx
        ├── CreatePost.jsx
        ├── DealDone.jsx
        ├── Events.jsx
        ├── Feed.jsx
        ├── Home.jsx
        ├── Marketplace.jsx
        ├── MyProfile.jsx
        ├── Noticias.jsx
        ├── Notifications.jsx
        ├── Onboarding.jsx
        ├── ProductDetail.jsx
        ├── Profile.jsx
        ├── Register.jsx
        ├── Search.jsx
        ├── SellerProfile.jsx
        ├── Services.jsx
        ├── Splash.jsx
        └── Verification.jsx
```

**Total**: 59 archivos en raíz del proyecto.

---

## 3. Carpetas activas (del proyecto real)

| Carpeta | Estado | Contenido |
|---|---|---|
| `app-source/elbarrio/` | ✅ Activa | Raíz del proyecto Vite |
| `app-source/elbarrio/src/screens/` | ✅ Activa | 30 pantallas |
| `app-source/elbarrio/src/components/` | ✅ Activa | 9 componentes |
| `app-source/elbarrio/src/lib/` | ✅ Activa | 4 módulos (supabase, design, horarios, ia) |
| `app-source/elbarrio/src/assets/` | ✅ Activa | imágenes estáticas |
| `app-source/elbarrio/public/` | ✅ Activa | favicon, iconos, isotipo |

---

## 4. Carpetas obsoletas

| Carpeta | Razón (basada en archivos) |
|---|---|
| `upload/` | Contiene versiones viejas de `Barrio.jsx` y `Feed.jsx` divergentes de `app-source/`. Sin `package.json`, sin `vite.config.js`. No es proyecto ejecutable. |
| `uploaded/` | Solo contiene `elbarrio.zip` (1.5 MB) — snapshot histórico comprimido. Ya fue descomprimido en `app-source/elbarrio/`. |
| `tool-results/` | 5 archivos `.txt` (lecturas cacheadas de tools previas). Basura operativa. |
| `examples/` | Demo WebSocket genérico (`frontend.tsx`, `server.ts`). No pertenece al proyecto El Barrio. |

---

## 5. Carpetas sandbox

Carpetas que pertenecen al entorno de preview Next.js, **NO al proyecto El Barrio**:

| Carpeta | Contenido | Pertenece a |
|---|---|---|
| `src/` | App Next.js 16 + 41 componentes shadcn/ui + API routes | Sandbox preview |
| `public/` (raíz) | `descargas.json` (bundle generado), `logo.svg`, `badges-preview.html`, `robots.txt` | Sandbox Next.js |
| `prisma/` | `schema.prisma`, `seed.js`, `seed-reports.js` | Sandbox SQLite |
| `db/` | `custom.db` (SQLite) | Sandbox BD |
| `.zscripts/` | Scripts de arranque del sandbox (`dev.sh`, `build.sh`, `start.sh`, `dev.pid`, logs) | Infraestructura sandbox |
| `mini-services/chat-service/` | Bun + socket.io, puerto 3003 | Sandbox realtime |
| `mini-services/downloads/` | Bun, puerto 3001 — sirve manifiesto base64 de .jsx | Sandbox utilidad |

---

## 6. Carpetas delivery

Existen **tres** mecanismos de entrega, todos en el sandbox:

| Ruta | Tipo | Estado |
|---|---|---|
| `src/app/api/delivery/[file]/route.ts` | API Next.js — sirve `.jsx` individuales como attachment | Activo en sandbox |
| `src/app/api/download/home/route.ts` | API Next.js — sirve `Home.jsx` específicamente | Activo en sandbox |
| `src/app/api/download/[otros]/route.ts` | APIs Next.js por categoría (verification, myprofile, events, services, noticias, comercios, app, notifications, alertadetail, sellerprofile) | Activos en sandbox |
| `public/descargas.json` | Manifiesto JSON con 4 .jsx en base64 (Home, AdminIncidentes, Barrio, Noticias) | Generado estáticamente |
| `mini-services/downloads/index.ts` | Bun server puerto 3001 — sirve el mismo manifiesto + endpoint `/file/:name` | Activo en sandbox |

**Observación**: hay 3 mecanismos paralelos de delivery. Solo sirven al sandbox; el proyecto real no los usa.

---

## 7. Carpetas temporales

| Carpeta/archivo | Contenido |
|---|---|
| `tool-results/` | 5 archivos `.txt` (cache de lecturas, 416 KB) |
| `dev.log` (raíz) | Log del servidor Next.js del sandbox |
| `.zscripts/dev.log` | Log del sandbox |
| `.zscripts/dev.pid` | PID del proceso dev |
| `.zscripts/mini-service-chat-service.log` | Log del chat-service (17 KB) |
| `mini-services/downloads/log.txt` | Log del downloads-service |
| `.next/` (cuando existe) | Build cache Next.js — se regenera |

---

## 8. Duplicados

Comparación md5 entre archivos con el mismo nombre:

| Archivo | Ubicaciones | ¿Idénticos? |
|---|---|---|
| `Barrio.jsx` | `app-source/elbarrio/src/screens/` + `upload/` + dentro de `uploaded/elbarrio.zip` | ❌ **3 versiones divergentes** |
| `Feed.jsx` | `app-source/elbarrio/src/screens/` + `upload/` + dentro de `uploaded/elbarrio.zip` | ❌ **3 versiones divergentes** |
| `Home.jsx` | `app-source/elbarrio/src/screens/` + dentro de `uploaded/elbarrio.zip` | ❌ **2 versiones divergentes** |
| `AdminIncidentes.jsx` | `app-source/elbarrio/src/screens/` + dentro de `uploaded/elbarrio.zip` | ❌ **2 versiones divergentes** |
| `Noticias.jsx` | `app-source/elbarrio/src/screens/` + dentro de `uploaded/elbarrio.zip` | ✅ Idénticos (mismo md5) |

### MD5 de versiones divergentes confirmados

```
Home.jsx:
  app-source/   53e27aaa62d958719b8080abef1af33b   (1561 líneas)
  zip (upload)  a942020b070b694c36f466374091bb44

Barrio.jsx:
  app-source/   e1a67717ab1521d2fb8904f99ebfc087   (2238 líneas)
  upload/       4a717a20f98279f9705f7acfaf7f776f   (2232 líneas)
  zip (upload)  c08c2665703f2fa89aaf307bb2bbb8ac

AdminIncidentes.jsx:
  app-source/   4d5a225cbabdcb2d8b2476124608477c
  zip (upload)  19229ff96532a98d45960318d42917a4

Noticias.jsx:
  app-source/   b5b488a4da660afbad6c327cb80b8cd7
  zip (upload)  b5b488a4da660afbad6c327cb80b8cd7   ← único idéntico
```

### Diff real `Barrio.jsx` (app-source vs upload/)

- `upload/Barrio.jsx` es **más viejo**: usa `item.description?.slice(0, 60)` como fallback de título, mientras `app-source/` ya separa `titulo` y `descripcion` con renderizado condicional.
- `app-source/` tiene 2238 líneas vs `upload/` con 2232 líneas.

### Diff real `Feed.jsx` (app-source vs upload/)

- `upload/Feed.jsx` (1338 líneas) tiene estilos extra (`borderLeft`, `alertFlecha`) y manejo de `alert.content` condicional.
- `app-source/Feed.jsx` (1318 líneas) es distinto — hay que decidir cuál es el correcto.

---

## 9. Versiones múltiples

| Archivo | Versiones encontradas | Ubicaciones |
|---|---|---|
| `Barrio.jsx` | 3 | `app-source/`, `upload/`, `uploaded/elbarrio.zip` |
| `Feed.jsx` | 3 | `app-source/`, `upload/`, `uploaded/elbarrio.zip` |
| `Home.jsx` | 2 | `app-source/`, `uploaded/elbarrio.zip` |
| `AdminIncidentes.jsx` | 2 | `app-source/`, `uploaded/elbarrio.zip` |
| `Noticias.jsx` | 2 (idénticas) | `app-source/`, `uploaded/elbarrio.zip` |
| Todos los demás `.jsx` | 2 (idénticas entre zip y app-source) | `app-source/`, `uploaded/elbarrio.zip` |

### Otros .jsx con md5 idéntico entre `app-source/` y el zip (sin divergencia)

`Admin.jsx`, `AdminComercios.jsx`, `AdminFarmacias.jsx`, `AdminUsuarios.jsx`, `AlertaDetail.jsx`, `Alertas.jsx`, `ChatConversation.jsx`, `ChatList.jsx`, `Comercios.jsx`, `Complete.jsx`, `CreatePost.jsx`, `DealDone.jsx`, `Events.jsx`, `Marketplace.jsx`, `MyProfile.jsx`, `Notifications.jsx`, `Onboarding.jsx`, `ProductDetail.jsx`, `Profile.jsx`, `Register.jsx`, `Search.jsx`, `SellerProfile.jsx`, `Services.jsx`, `Splash.jsx`, `Verification.jsx`, y todos los `components/` y `lib/`.

---

## 10. Fuente oficial de verdad propuesta

```
/home/z/my-project/app-source/elbarrio/
```

### Justificación (basada solo en archivos)

1. **Es el único directorio ejecutable** — tiene `package.json`, `vite.config.js`, `index.html`, `.env`, `package-lock.json`. Ninguna otra carpeta con código El Barrio tiene esto.

2. **Es la versión más reciente** — `app-source/` tiene fechas de modificación hasta `2026-07-21 19:44` (AdminIncidentes.jsx), mientras `upload/` se detiene en `2026-07-21 17:23` y `uploaded/elbarrio.zip` en `2026-07-21 14:56`.

3. **Los archivos divergentes en `app-source/` muestran evolución posterior** (más líneas, renderizado más refinado en `Barrio.jsx`).

4. **Es coherente internamente** — 30 screens + 9 components + 4 lib + assets + public + config Vite. Proyecto completo.

5. **El `.env` está presente** con las 3 claves que el código necesita (`VITE_SUPABASE_URL`, `VITE_SUPABASE_KEY`, `VITE_OPENROUTER_API_KEY`).

### Carpetas a ignorar o eliminar del flujo de trabajo

- `upload/` → versiones viejas divergentes
- `uploaded/` → snapshot comprimido histórico
- `tool-results/` → basura de tools
- `examples/` → demo ajeno
- `src/`, `public/`, `prisma/`, `db/`, `.zscripts/`, `mini-services/` → infraestructura sandbox, no del proyecto

---

## Tamaños por carpeta (referencia)

```
20K     examples
56K     prisma
64K     .zscripts
252K    db
328K    public
416K    tool-results
1.2M    src
1.5M    app-source
1.5M    uploaded
1.8M    upload
5.9M    mini-services
```

---

Fin del documento.
