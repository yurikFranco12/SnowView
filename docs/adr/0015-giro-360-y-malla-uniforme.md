# ADR 0015 — Giro de 360°, malla uniforme y datos de la estación en la vista 3D

- Estado: aceptada
- Fecha: 2026-11-13

## Contexto

La montaña 3D de líneas (ADR 0014) solo se podía ver desde el sur con un vaivén de ±17°, y las
crestas quedaban separadas y con dientes de sierra. El usuario pide verla desde todos los ángulos,
con las líneas más uniformes y con la altitud y los km esquiables de forma discreta.

## Decisiones

1. **Giro libre de 360°.** El algoritmo del pintor solo servía de cara al norte. Ahora
   `drawOrder(yaw)` elige, según el ángulo, recorrer las filas de la malla (este-oeste) o las
   columnas (norte-sur) —las que quedan más de cara a la cámara— y las ordena de lejos a cerca. Las
   pistas se agrupan por fila y por columna para dibujarlas con su línea.
2. **Cámara con pivote.** La cámara gira alrededor del centro de la montaña (`ox/oy/oz`) y el
   encuadre se mide en 12 giros y 2 inclinaciones y se toma el peor caso, así el zoom no «late» al
   girar. Arrastrar horizontal gira, vertical inclina (0,2 a 1,0 rad); giro automático lento (una
   vuelta cada ~55 s) que se para al tocar y se reactiva con un botón; brújula con el norte.
3. **Malla uniforme.** Se suaviza el terreno (filtro [1 2 1], dos pasadas) y se remuestrea a unas
   120 líneas por el lado mayor (`smoothGrid`, `resampleGrid`, con tests). Las pistas se apoyan en
   esa misma malla suavizada. Se añaden aristas transversales muy tenues cada 6 puntos (malla de
   alambre) y las crestas son más finas. Se probó con 190 líneas: queda un bloque macizo.
4. **Altitud y km esquiables**, en una pastilla discreta arriba a la derecha (2D y 3D): cima,
   desnivel y kilómetros de pista. Los km son la suma de la longitud de las pistas de descenso de
   OpenStreetMap, sin el fuera de pista; es una aproximación y puede contar dos veces tramos que
   comparten trazado.

## Consecuencias

- El dibujo proyecta unos 14.000 vértices por fotograma, sin crear objetos por punto.
- Con `prefers-reduced-motion` no hay giro automático ni animación; se redibuja al interactuar.
