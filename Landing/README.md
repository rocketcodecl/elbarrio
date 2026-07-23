# El Barrio — Landing PHP

Proyecto standalone para Apache, PHP 8.1+ y MySQL/MariaDB. No usa Node, React ni Composer.

## Probar localmente en VS Code

1. Abre esta carpeta en VS Code.
2. Crea una base MySQL vacía.
3. Desde la terminal ejecuta:

   php -S localhost:8080

4. Abre `http://localhost:8080/install.php`.
5. Ingresa las credenciales MySQL y crea la cuenta administradora.
6. Panel: `http://localhost:8080/admin/`.

El servidor integrado de PHP no aplica `.htaccess`, pero el sitio y el panel funcionan mediante sus archivos PHP. Para probar URLs amigables usa Apache/XAMPP/MAMP/Laragon.

## Publicar en Plesk

1. Sube el contenido de esta carpeta al document root de `elbarrio.lat`.
2. Usa PHP 8.1 o superior.
3. Activa extensiones PDO MySQL, mbstring, fileinfo y GD.
4. Da permisos de escritura a `config/`, `uploads/` y `storage/` durante la instalación.
5. Abre `/install.php`.
6. Tras instalar, puedes borrar `install.php` o restringirlo; el lock evita reinstalación.

## Módulos incluidos

- Landing pública responsive.
- Páginas dinámicas y SEO.
- Instalador.
- Login, cierre de sesión, roles y rate limiting.
- Dashboard.
- Gestión de páginas.
- CMS de secciones y bloques.
- Biblioteca multimedia.
- Mensajes de contacto.
- Suscriptores y exportación CSV.
- Configuración.
- Sitemap, robots, manifest y protecciones Apache.
