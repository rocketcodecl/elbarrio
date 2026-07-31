# Landing de El Barrio

Landing independiente y lista para publicar. No depende de la aplicación ni del panel administrativo.

## Vista local

Abrir `http://127.0.0.1:4174/` mientras el servidor local esté activo.

## Publicación en Plesk

1. Abrir el administrador de archivos del dominio o subdominio.
2. Entrar a la carpeta pública, normalmente `httpdocs`.
3. Subir el contenido completo de `landing-page/`: `index.html`, `styles.css`, `script.js` y `assets/`.
4. Confirmar que `index.html` quede directamente dentro de `httpdocs`.

El formulario final abre un correo dirigido a `elbarrio.lat@gmail.com` con los datos ingresados. No almacena información en Supabase.
