# Cómo compartir SnowView

SnowView no necesita cuentas ni claves: basta con pasar el instalador.

## Qué archivo pasar

Tras `pnpm.cmd build`, los instaladores están en `src-tauri/target/release/bundle/`:

| Archivo                                 | Cuándo usarlo                                                       |
| --------------------------------------- | ------------------------------------------------------------------- |
| `nsis/SnowView_<versión>_x64-setup.exe` | **El recomendado.** Un solo archivo; instala sin ser administrador. |
| `msi/SnowView_<versión>_x64_en-US.msi`  | Alternativa clásica de Windows (pide permisos de administrador).    |

No pases `target/release/snowview.exe` suelto: funciona en tu equipo, pero el instalador además
comprueba que el otro equipo tiene WebView2 (el motor web de Windows) y crea el acceso del menú
Inicio y el desinstalador.

## Cómo enviarlo

- **GitHub Releases** (lo más cómodo si el repositorio es público): en la página del repositorio,
  «Releases» → «Draft a new release» → elige la etiqueta (por ejemplo `v1.0.1`) → arrastra el
  `-setup.exe` y el `.msi` → «Publish release». Tus amigos lo descargan desde ese enlace.
- **Nube o mensajería**: súbelo a Google Drive, OneDrive o WeTransfer y pasa el enlace. Por correo o
  WhatsApp los `.exe` suelen bloquearse; si lo envías así, comprímelo antes en un `.zip`.

## Qué verá quien lo instale

1. Windows mostrará **«Windows protegió su PC»** (SmartScreen), porque el instalador no está firmado
   con un certificado de pago. Hay que pulsar **«Más información»** y luego **«Ejecutar de todas
   formas»**. Avísales de antemano para que no se asusten.
2. El instalador pregunta dónde instalar y termina en unos segundos.
3. La app aparece en el menú Inicio como **SnowView**.

Requisitos: Windows 10 u 11 de 64 bits y conexión a internet para la previsión (los mapas de pistas
funcionan sin conexión).

## Actualizaciones

No hay actualización automática. Para una versión nueva, se instala el instalador nuevo encima: se
conservan las favoritas, las reglas y los ajustes.

## Licencia de los datos

La previsión viene de Open-Meteo, cuyo uso gratuito es **solo no comercial**. Compartirla con amigos
está bien; venderla o usarla en un negocio exigiría un plan de pago de Open-Meteo.
