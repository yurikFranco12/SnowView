# ADR 0016 — Rendimiento de los mapas

- Estado: aceptada
- Fecha: 2026-11-13

## Contexto

Con el cuadro de la montaña 3D abierto la animación bajaba a ~32 fps en una pantalla de 120 Hz.
Medido en el navegador de desarrollo: el JavaScript de cada fotograma cuesta ~1,2 ms; el coste está
en el relleno de píxeles del canvas y en el resto de la página (la nieve de fondo seguía animándose).

## Decisiones

1. **Cintas en vez de rellenos hasta el borde.** Cada cresta se rellenaba hasta el borde inferior
   de la pantalla (unas 120 veces el área). Ahora se rellena solo la «cinta» de superficie entre dos
   líneas contiguas, en el mismo orden de lejos a cerca, y la cresta se traza después de la cinta
   siguiente para que no quede tapada por ella. Un trazo del color del fondo cierra las costuras.
2. **Pistas por lotes y sin `shadowBlur`.** El brillo de neón de cada tramo de pista (un
   `shadowBlur` por segmento) era lo más caro. Ahora se agrupan los tramos por tipo en un solo
   trazo, con un trazo ancho y tenue debajo como brillo.
3. **Cámara sin trigonometría por vértice.** `makeProjector` calcula senos y cosenos una vez por
   fotograma y `projectMesh` se salta los puntos que no se dibujan.
4. **Nada que animar, nada que dibujar.** Con el giro automático parado no hay bucle de dibujo (se
   redibuja solo al interactuar) y el barrido de luz solo corre con el giro automático.
5. **Fondo de nieve en pausa** mientras hay un cuadro de mapa abierto (`data-overlay-open` en
   `<html>`): la imagen queda quieta y todo el rendimiento va al cuadro.
6. **Resolución adaptativa**: si el fotograma tarda más de 20 ms de media (menos de 50 fps), se baja
   la resolución del dibujo en pasos de 12,5 % hasta el 50 %, y con menos de 75 % se quitan las
   aristas tenues. Solo baja, nunca sube, para que no oscile.

## Medidas (navegador de desarrollo, pantalla de 120 Hz)

| Caso                                         | Antes   | Después |
| -------------------------------------------- | ------- | ------- |
| Montaña 3D de Cerler / Alto Campoo           | ~32 fps | 120 fps |
| Montaña 3D de Baqueira (1064×600)            | —       | 113 fps |
| Montaña 3D de Grandvalira (la más pesada)    | —       | 86 fps  |
| Plano 2D de pistas, arrastrando              | 120 fps | 120 fps |
| Mapa de España, animación al elegir estación | ~110    | ~110    |

El zoom con rueda en el mapa de España en una prueba extrema (un evento por fotograma) baja a 60–70
fps; la capa de provincias (trazo discontinuo muy largo) es lo más caro. No se ha tocado: en uso
real no se dan tantos eventos y simplificar las líneas cambiaría el mapa.
