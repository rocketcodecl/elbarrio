# El Barrio — guía de compilación y continuidad

Esta guía permite actualizar, probar y compilar la aplicación sin depender de otra persona. Todos los comandos se ejecutan desde:

```bash
cd "/Users/fenha/Desktop/elbarrio"
```

## Trabajo diario local

Aplicación vecinal:

```bash
npm run dev
```

Panel administrativo, en otra terminal:

```bash
npm --prefix admin-panel run dev
```

Túnel estable para probar la app desde un teléfono, en otra terminal:

```bash
npm run tunnel
```

Direcciones locales:

- App: `http://localhost:5173`
- Panel: `http://localhost:5174`
- Túnel vigente: `https://balsamic-cola-steadfast.ngrok-free.dev`

No ejecutar el túnel con una dirección aleatoria: cambiar el dominio cambia el almacenamiento del navegador y puede pedir iniciar sesión nuevamente.

## Verificación antes de compilar

```bash
npm run build
npm --prefix admin-panel run build
```

Ambos comandos deben terminar con `built` y sin errores. La advertencia sobre archivos JavaScript mayores a 500 kB no bloquea la compilación.

## Android: crear un APK instalable

Android Studio ya incluye el Java necesario. Un solo comando actualiza el proyecto nativo y genera el APK:

```bash
npm run mobile:android:apk
```

El archivo resultante queda en:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

Ese APK sirve para instalar y probar El Barrio directamente en un Android. No requiere pagar Google Play.

Para abrir el proyecto y ejecutarlo desde Android Studio:

```bash
npm run mobile:android
```

Cuando exista la nueva cuenta de Play Console, la publicación se prepara desde Android Studio con `Build > Generate Signed App Bundle or APK > Android App Bundle`. La llave de firma debe guardarse y respaldarse; perderla puede impedir futuras actualizaciones. No incluir la llave ni sus contraseñas en Git.

## iPhone: sincronizar y abrir en Xcode

```bash
npm run mobile:ios
```

En Xcode:

1. Seleccionar el proyecto `App` y el target `App`.
2. En `Signing & Capabilities`, elegir el equipo personal o la cuenta Apple Developer.
3. Seleccionar un iPhone conectado o un simulador.
4. Pulsar el botón Run.

Para probar en un iPhone propio no es necesario publicar en App Store. Para TestFlight y App Store se necesita la membresía activa del Apple Developer Program.

### Estado local de Xcode al 4 de agosto de 2026

Xcode 26.5 está instalado y seleccionado correctamente. El proyecto de El Barrio compiló para iPhone Simulator con `BUILD SUCCEEDED`. Si una reinstalación futura cambia la ruta activa, ejecutar:

```bash
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
sudo xcodebuild -runFirstLaunch
```

Comprobar la instalación con:

```bash
xcodebuild -version
```

## Después de cualquier cambio en la app

El código React es la fuente común para web, Android e iOS. El flujo correcto es:

```bash
npm run build
npm run mobile:sync
```

Después se vuelve a ejecutar la app desde Android Studio o Xcode. No hay que rehacer el proyecto nativo ni comenzar desde cero.

## Git

Antes de guardar cambios:

```bash
git status --short
git diff --check
```

Luego:

```bash
git add <archivos revisados>
git commit -m "Descripción clara del cambio"
git push origin main
```

No agregar contraseñas, llaves de firma, `.env`, certificados ni perfiles privados. No incluir cambios de `landing-page/` en un commit de la app o del panel.

## Publicación web y panel

Build de la aplicación para Plesk:

```bash
npm run build:plesk
```

Build del panel para Plesk:

```bash
npm --prefix admin-panel run build:plesk
```

Los contenidos generados en cada carpeta `dist/` se suben al destino ya configurado:

- App: `https://elbarrio.lat/el-barrio/`
- Panel: `https://admin.elbarrio.lat/`

Compilar no publica automáticamente. Subir un nuevo `dist/` reemplaza la versión web correspondiente, pero no actualiza las aplicaciones instaladas desde las tiendas.

## Lo que sigue pendiente antes de tiendas

- Probar Google OAuth y recuperación de contraseña dentro de Android e iPhone reales.
- Registrar y comprobar `lat.elbarrio.app://auth/callback` en las Redirect URLs de Supabase.
- Probar eliminación de cuenta con un usuario desechable, nunca primero con el superadministrador.
- Implementar notificaciones push nativas; todavía no existen.
- Completar fichas, capturas, política de privacidad y pruebas exigidas por Google Play y Apple.
- Crear/pagar las cuentas de tienda solo cuando se vaya a iniciar el proceso de publicación.

No ejecutar `supabase db push`: el historial remoto de migraciones no está reconciliado.
