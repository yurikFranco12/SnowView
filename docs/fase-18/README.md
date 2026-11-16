# Fase 18 — SnowView para Android y Google Play

El código queda preparado para compilar la app de Android con Tauri 2 y subirla a Google Play. Lo
que **no** se pudo hacer desde la sesión de Claude es generar ni compilar el proyecto de Android:
en el equipo no están instalados Android Studio, el SDK, el NDK ni Java. Los pasos de abajo se
hacen una vez en tu terminal.

## Qué cambió en el código

- **Rust** (`src-tauri/src/lib.rs`, `Cargo.toml`): la bandeja, el arranque con Windows y «cerrar
  oculta la ventana» solo se compilan en escritorio. En Android quedan el almacenamiento y las
  notificaciones.
- **Permisos de Tauri** (`src-tauri/capabilities/`): `default.json` (común) y `desktop.json` (ventana
  y autostart, solo escritorio). En Android la app no puede llamar a nada de escritorio.
- **Configuración de Android** (`src-tauri/tauri.android.conf.json`): identificador
  `com.snowview.app` y Android 7.0 (API 24) como mínimo.
- **Notificaciones** (`apps/web/src/platform/notifications.ts`, `ui/data/rules.ts`, `core/rules.ts`):
  canal propio «Avisos de nieve», permiso pedido al crear una regla (Android 13+) y avisos
  programados. Ver ADR 0018.
- **Interfaz**: por debajo de 768 px la navegación pasa a una barra inferior y las pantallas se
  apilan en una columna. El escritorio no cambia.
- **Seguridad**: CSP más estricta, sin permiso de ubicación en Android, claves de firma fuera del
  repositorio (`.gitignore`).

## 1. Instalar las herramientas (una vez)

1. [Android Studio](https://developer.android.com/studio). En _SDK Manager → SDK Tools_ marca:
   Android SDK Build-Tools, Android SDK Platform-Tools, Android SDK Command-line Tools y NDK (Side
   by side).
2. Variables de entorno de usuario (ajusta la versión del NDK a la carpeta que exista):

   ```
   JAVA_HOME    = C:\Program Files\Android\Android Studio\jbr
   ANDROID_HOME = %LOCALAPPDATA%\Android\Sdk
   NDK_HOME     = %LOCALAPPDATA%\Android\Sdk\ndk\<versión>
   ```

3. Destinos de Rust para Android:

   ```
   rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android
   ```

## 2. Generar el proyecto de Android

```
pnpm.cmd android:init
pnpm.cmd tauri icon src-tauri/icons/source/snowview-icon.svg
```

Crea `src-tauri/gen/android` (se versiona en git) y los iconos de Android. Comprueba en
`src-tauri/gen/android/app/build.gradle.kts`:

- `applicationId = "com.snowview.app"`. **Es para siempre**: Google Play no deja cambiarlo después
  de la primera subida. Si quieres otro (lo normal es un dominio tuyo al revés), cámbialo en
  `tauri.android.conf.json` y repite `android:init` antes de subir nada.
- `targetSdk`: debe cumplir el mínimo que exija Google Play ese año (lo sube cada agosto).

En `src-tauri/gen/android/app/src/main/AndroidManifest.xml`, en `<application>`, pon
`android:allowBackup="false"` (los ajustes no salen del teléfono en copias de seguridad) y confirma
que los únicos permisos son `INTERNET` y los que añade el plugin de notificaciones
(`POST_NOTIFICATIONS`, `RECEIVE_BOOT_COMPLETED`, `WAKE_LOCK`).

Opcional: un icono blanco de notificación en `app/src/main/res/drawable/`. Sin él, Android muestra
un icono genérico de información.

## 3. Probar en un teléfono o emulador

```
pnpm.cmd android:dev
```

Lista de comprobación de las notificaciones (no se pudieron probar sin Android):

1. Crea una regla en Alertas: Android pide el permiso de notificaciones.
2. Ajustes → Notificaciones → «Enviar prueba»: aparece el aviso en el canal «Avisos de nieve».
3. Crea una regla que se cumpla ya (umbral bajo en una estación con nieve prevista): llega un solo
   aviso y no se repite al reabrir la app.
4. Crea una regla que se cumpla dentro de unos días, cierra la app del todo y espera a la hora
   prevista (o adelanta el reloj): el aviso llega con la app cerrada, también tras reiniciar.

## 4. Firmar

La clave de subida se crea una vez y se guarda **fuera del repositorio**, con copia de seguridad:

```
keytool -genkey -v -keystore %USERPROFILE%\snowview-upload.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload
```

Crea `src-tauri/gen/android/keystore.properties` (ignorado por git):

```
password=<la contraseña>
keyAlias=upload
storeFile=C:\\Users\\<tú>\\snowview-upload.jks
```

En `src-tauri/gen/android/app/build.gradle.kts` añade arriba
`import java.io.FileInputStream` y `import java.util.Properties`, y dentro de `android { … }`:

```kotlin
signingConfigs {
    create("release") {
        val props = Properties()
        val file = rootProject.file("keystore.properties")
        if (file.exists()) props.load(FileInputStream(file))
        keyAlias = props["keyAlias"] as String
        keyPassword = props["password"] as String
        storeFile = file(props["storeFile"] as String)
        storePassword = props["password"] as String
    }
}
```

y en `buildTypes { getByName("release") { … } }` la línea
`signingConfig = signingConfigs.getByName("release")`.

## 5. Compilar y subir

```
pnpm.cmd android:build
```

Deja el `.aab` en `src-tauri/gen/android/app/build/outputs/bundle/universalRelease/`. Cada subida
necesita una versión mayor en `src-tauri/tauri.conf.json` (de ella sale el `versionCode`).

En [Google Play Console](https://play.google.com/console):

- Cuenta de desarrollador (pago único). Las cuentas personales nuevas deben hacer una prueba cerrada
  con 12 probadores durante 14 días antes de publicar en producción.
- Activa la firma de aplicaciones de Play y sube el `.aab` a una prueba interna primero.
- **Política de privacidad**: publica `docs/PRIVACIDAD.md` en una URL pública y enlázala.
- **Seguridad de los datos**: la app no recoge ni comparte datos personales; todo se guarda en el
  teléfono (detalle en `docs/PRIVACIDAD.md`).
- Clasificación de contenido, público objetivo, capturas de teléfono, icono de 512 px y gráfico de
  1024 × 500.

## Antes de publicar: asuntos que decides tú

- **Open-Meteo**: el uso gratuito es solo no comercial. Una app gratis y sin anuncios encaja; si
  cobras o pones anuncios hace falta su plan de pago (o cambiar de proveedor en `packages/data`).
- **Webcams**: las imágenes y reproductores son de las estaciones y se muestran con su crédito, pero
  sin permiso expreso. En una tienda pública pueden pedir retirarlas; conviene pedir permiso o
  publicar sin esa pantalla.
- **Identificador**: `com.snowview.app` no corresponde a un dominio tuyo. Funciona, pero decide el
  definitivo antes de la primera subida.
