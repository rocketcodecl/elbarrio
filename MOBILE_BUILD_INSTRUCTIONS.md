# El Barrio — compilación móvil

La aplicación React es la fuente única. Android, iPhone y web no se editan por separado: se modifica `src/`, se verifica el build y se sincroniza el resultado con los proyectos nativos.

## Después de cada cambio de la app

```bash
npm run mobile:sync
```

Este comando compila React y actualiza `android/` e `ios/`. No publica nada.

## Android

Abrir el proyecto en Android Studio:

```bash
npm run mobile:android
```

Para generar un APK de prueba desde Terminal:

```bash
cd android
JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" ANDROID_HOME="$HOME/Library/Android/sdk" ./gradlew assembleDebug
```

El APK queda en `android/app/build/outputs/apk/debug/app-debug.apk`.

Para Google Play se generará más adelante un Android App Bundle firmado (`.aab`) y se guardará su clave de firma en un lugar seguro. No crear varias claves distintas para la misma aplicación.

## iPhone

1. Instalar Xcode desde App Store.
2. Ejecutar `npm run mobile:ios`.
3. En Xcode, seleccionar el equipo personal de Apple y un iPhone conectado.

Con una cuenta Apple gratuita se puede instalar y probar en dispositivos propios, pero la firma de prueba expira aproximadamente cada siete días. Para distribuir por TestFlight o App Store se necesita la membresía anual de Apple Developer. El proyecto iOS ya existe; pagar después no obliga a reconstruir la aplicación.

## Configuración externa pendiente una sola vez

En Supabase → Authentication → URL Configuration → Redirect URLs agregar:

```text
lat.elbarrio.app://auth/callback
```

Después hay que probar en un teléfono real:

- alta e ingreso con Google;
- recuperación de contraseña;
- cámara y selección de fotografías;
- GPS y mapa;
- enlaces telefónicos y WhatsApp.

## Próximo bloque móvil

Implementar notificaciones push reales: Firebase Cloud Messaging en Android, APNs en iOS, contador del ícono y navegación a la pantalla exacta al tocar la notificación. Las notificaciones internas actuales no reemplazan este trabajo.
