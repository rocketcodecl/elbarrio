# Landing y editor de El Barrio

Landing independiente con scrollytelling, videos locales y un editor de contenido liviano. No depende de la aplicación, del panel administrativo principal ni de Supabase.

## Requisitos del servidor

- Apache o Nginx administrado por Plesk.
- PHP 8.1 o superior.
- HTTPS activo.
- Permiso de escritura de PHP sobre `admin/` y `content/` durante la instalación y el uso.

## Dominios definitivos

- `https://elbarrio.lat` sirve la landing.
- `https://cms.elbarrio.lat` sirve el panel desde su propia carpeta independiente.
- El CMS publica mediante HTTPS en el receptor protegido de la landing.

No necesitan compartir carpetas, rutas documentales ni permisos entre dominios. Los dos ZIP se generan emparejados con una clave aleatoria que no se guarda en Git.

## Subir a Plesk

1. En la raíz pública de `elbarrio.lat`, subir y descomprimir `elbarrio-landing.zip`.
2. En la raíz pública independiente de `cms.elbarrio.lat`, subir y descomprimir `elbarrio-cms.zip`.
3. Activar PHP 8.1 o superior y HTTPS en ambos dominios.
4. Confirmar que `https://elbarrio.lat/publish.php` responda `Conexión no autorizada`; eso demuestra que el receptor está protegido y activo.
5. Abrir `https://cms.elbarrio.lat/install.php`.
6. Crear el usuario y una contraseña de al menos 10 caracteres.
7. Entrar posteriormente desde `https://cms.elbarrio.lat/`.

La ruta `https://elbarrio.lat/admin` redirige automáticamente al subdominio del CMS.

El instalador se bloquea automáticamente cuando crea `admin/config.php`. Ese archivo contiene solamente el usuario y el hash cifrado de la contraseña; está excluido de Git.

## Si Plesk informa un error de permisos

Cada dominio necesita escritura solamente dentro de su propia raíz:

- En `elbarrio.lat`: `content/`.
- En `cms.elbarrio.lat`: la raíz del CMS y `content/`.

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
