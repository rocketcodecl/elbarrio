# Landing y editor de El Barrio

Landing independiente con scrollytelling, videos locales y un editor de contenido liviano. No depende de la aplicación, del panel administrativo principal ni de Supabase.

## Requisitos del servidor

- Apache o Nginx administrado por Plesk.
- PHP 8.1 o superior.
- HTTPS activo.
- Permiso de escritura de PHP sobre `admin/` y `content/` durante la instalación y el uso.

## Dominios y carpetas definitivas

- `https://elbarrio.lat` sirve la landing desde `httpdocs/`.
- `https://cms.elbarrio.lat` sirve el panel desde `httpdocs/admin/`.
- El panel publica los cambios en `httpdocs/content/site.json`.

Ambos dominios deben pertenecer a la misma suscripción de Plesk para compartir la carpeta `content/`.

## Subir a Plesk

1. En Plesk, abrir **Archivos** y entrar en `httpdocs/`.
2. Subir `elbarrio-landing.zip` y descomprimirlo directamente en `httpdocs/`.
3. Crear la carpeta `httpdocs/admin/` si todavía no existe.
4. Subir `elbarrio-cms.zip` dentro de `httpdocs/admin/` y descomprimirlo allí.
5. Confirmar que existan `httpdocs/index.html` y `httpdocs/admin/index.php`.
6. Crear `cms.elbarrio.lat` y establecer su raíz documental en `httpdocs/admin`.
7. Activar PHP 8.1 o superior y HTTPS para el subdominio.
8. Abrir `https://cms.elbarrio.lat/install.php`.
9. Crear el usuario y una contraseña de al menos 10 caracteres.
10. Entrar posteriormente desde `https://cms.elbarrio.lat/`.

La ruta `https://elbarrio.lat/admin` redirige automáticamente al subdominio del CMS.

El instalador se bloquea automáticamente cuando crea `admin/config.php`. Ese archivo contiene solamente el usuario y el hash cifrado de la contraseña; está excluido de Git.

## Si Plesk informa un error de permisos

Desde el administrador de archivos, asignar escritura al usuario de la suscripción sobre:

- `httpdocs/admin/`
- `httpdocs/content/`

No usar permisos `777`. En una instalación normal de Plesk basta con que el propietario de la suscripción tenga lectura y escritura.

## Qué permite editar

- Textos principales del hero.
- CTA principal.
- Los cuatro momentos de la narrativa comercial.
- Mensaje final de inscripción.
- Tamaño máximo del título principal.
- Tamaño máximo de títulos de secciones.
- Tamaño base del texto.

El botón **Publicar cambios** actualiza `content/site.json`. La landing lo carga automáticamente al abrirse. **Restaurar** vuelve al contenido de `content/defaults.json`.

## Vista local con el panel

Desde la raíz del repositorio:

```bash
php -S 127.0.0.1:4175 -t landing-page
```

Después abrir:

- Landing: `http://127.0.0.1:4175/`
- Instalador: `http://127.0.0.1:4175/admin/install.php`
- Panel: `http://127.0.0.1:4175/admin/`

Para una revisión estática sin panel también puede seguir usándose `http://127.0.0.1:4174/`.

## Formulario público

El formulario final abre un correo dirigido a `elbarrio.lat@gmail.com` con los datos ingresados. No almacena información en Supabase.

## Material audiovisual

- `assets/barrio-en-movimiento.mp4`: video **Market shoppers**, publicado por Mixkit para uso comercial y personal bajo la Mixkit Stock Video Free License.
- Fuente: https://mixkit.co/free-stock-video/market-shoppers-992/
- `assets/vecinos-conectando.mp4`: video **Couple receiving welcome gifts from their neighbors**, publicado bajo la misma licencia gratuita.
- Fuente: https://mixkit.co/free-stock-video/couple-receiving-welcome-gifts-from-their-neighbors-4725/

El video está guardado localmente para evitar dependencias externas durante la carga de la landing.
