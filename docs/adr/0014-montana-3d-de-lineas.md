# ADR 0014 — Montaña 3D de líneas en el mapa de pistas

- Estado: aceptada
- Fecha: 2026-11-13

## Contexto

El mapa de pistas (ADR 0012) con relieve sombreado (ADR 0013) era un plano. El usuario quiere una
imagen animada de montañas semirrealistas con el estilo neofuturista de líneas de la app.

## Decisiones

1. **Vista 3D de crestas apiladas** («joy division» con relieve real): cada fila de la malla de
   altitudes (ADR 0013) es una línea de neón; cada cresta se rellena hacia abajo con el color del
   fondo y tapa a las de detrás (algoritmo del pintor, de norte a sur). Así se obtiene oclusión sin
   WebGL ni dependencias nuevas, coherente con la decisión de usar canvas 2D.
2. **Pistas y remontes sobre la superficie**: cada tramo se asigna a la fila de la malla sobre la
   que está y se dibuja justo después de ella, de modo que las crestas más cercanas lo tapan
   cuando corresponde.
3. **Cámara propia** (`ridgeScene.ts`, TypeScript puro y con tests): giro, inclinación y una
   perspectiva suave; exageración vertical de 2,4 para que el relieve se lea. El encuadre se ajusta
   a la silueta (puntos a menos de 2,2 km de pistas o remontes) con el giro extremo incluido.
4. **Animación**: vaivén lento del giro y la inclinación y un barrido de luz de lejos a cerca por
   las crestas. Arrastrar gira, la rueda acerca; teclado: flechas, + / − y 0.
   Con `prefers-reduced-motion` no hay bucle de animación: se dibuja una vez y al interactuar.
5. **2D sigue disponible**: un botón alterna con el plano (relieve y curvas). Sin malla de terreno
   solo existe el plano.

## Consecuencias

- El dibujo se repinta cada fotograma: unos 9.000 vértices y las pistas; sin problemas medidos en
  el navegador de desarrollo. El bucle se detiene al cerrar el cuadro y el navegador lo pausa con
  la pestaña oculta.
- Sin hover sobre pistas en 3D (el texto de cotas solo existe en el plano).
