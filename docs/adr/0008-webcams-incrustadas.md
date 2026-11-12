# ADR 0008 — Webcams dentro de la app

- Estado: aceptada
- Fecha: 2026-11-12

## Contexto

Se quiere ver cada webcam de cada estación dentro de la app, en directo o con imágenes que se
actualicen, sin abrir el navegador.

## Qué se comprobó el 2026-11-12

Las URL salen de las páginas oficiales de cada estación y se comprobaron con la app en el navegador
y con `curl` (respuesta 200, tipo de contenido, fecha de modificación y cabeceras de incrustación).

- **Imágenes** que el propietario renueva cada pocos minutos, sin clave ni cabeceras que impidan
  usarlas: Baqueira-Beret (S3 de la estación), La Molina (FGC), Masella, Sierra Nevada, Alto
  Campoo (Cantur) y los «hotspot» de feratel.
- **Reproductores en directo** que se pueden incrustar en un `iframe` (sin `X-Frame-Options`):
  feratel (`webtv.feratel.com`), ipcamlive (Candanchú) y Skaping (Cauterets).
- Baqueira-Beret y La Molina cargan sus cámaras por JavaScript; las URL se leyeron de la página
  ya cargada.

## Decisiones

1. **Dos formas de mostrar una cámara**: imagen que se vuelve a pedir cada N segundos (60 como
   mínimo) y/o reproductor en directo en un `iframe`. Si hay las dos, la imagen es la vista por
   defecto y un botón pasa al directo.
2. **Los datos están en `stations/webcams.json`** (48 cámaras de las 10 estaciones), con la
   página oficial y el crédito de cada una. Un test valida que todas son `https`, que su estación
   existe y que sus orígenes están permitidos en la CSP.
3. **CSP de Tauri con lista explícita**: `img-src` con los 8 orígenes de imágenes y `frame-src` con
   los 3 de reproductores. No se abre a `https:` entero.
4. **No se guarda ni se copia nada**: las imágenes se muestran tal cual con su crédito y se
   descargan solo mientras la app está abierta y la tarjeta se ve.
5. **Poco tráfico**: las tarjetas fuera de pantalla no piden imágenes, el refresco se para con la
   ventana oculta y los reproductores en directo se cargan al pulsar (no todos a la vez).
6. **La imagen nueva se carga aparte** y solo sustituye a la anterior cuando está lista, así no hay
   parpadeos y, si falla un refresco, se conserva la última buena.

## Consecuencias

- Si una estación cambia sus URL, la cámara deja de verse: hay que actualizar el JSON.
- Fuera de temporada muchas cámaras están apagadas o con imágenes antiguas; la app no puede
  saberlo (las imágenes entre dominios no dejan leer su fecha) y lo dice en el pie.
- Los iframes de terceros cargan sus propios recursos y pueden mostrar sus anuncios o logotipos.
