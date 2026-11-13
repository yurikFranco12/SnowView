# ADR 0017 — Ficha de estación, clasificación y buscador rápido (versión 1.0)

- Estado: aceptada
- Fecha: 2026-11-13

## Contexto

La app tenía muchos datos (hora a hora, base y cima, 14 días, espesor) pero solo enseñaba un total
de nieve y unas barras diarias. No había un sitio donde ver una estación a fondo, la lista de
estaciones era un listado sin datos, y moverse entre pantallas exigía ir a la barra lateral.

## Decisiones

1. **Ficha de estación** (`StationSheet`), un cuadro modal que se abre desde cualquier sitio donde
   aparece una estación (inicio, favoritas, Estaciones, Mapa y buscador). Contiene:
   - Cinco cifras de ahora: temperatura con sensación térmica, viento y rachas, espesor en cima y
     base, nieve prevista a 24, 48 y 72 h, e isoterma de 0 °C con su lectura respecto a las cotas.
   - Gráfica hora a hora de 72 h, hecha a mano en SVG como el resto (ADR 0004): barras de nieve,
     línea de temperatura con la referencia de 0 °C, y viento con rachas. Se lee con el puntero o con
     las flechas; se puede cambiar entre cima y base.
   - Tira de 14 días: cielo, nieve en cima y base, máxima y mínima, racha máxima y nota.
   - Accesos a webcams, mapa de pistas 3D (carga diferida) y favoritas.
2. **Resumen diario en `core`** (`overview.ts`, con tests): `dailyOverview` agrupa por día local;
   `significantWeatherCode` elige el código del día (la precipitación manda si ocupa al menos una
   de cada seis horas, o dos); `windChillC` da la sensación térmica (fórmula de Environment
   Canada/NWS, solo con 10 °C o menos y más de 4,8 km/h).
3. **Isoterma de 0 °C**: se añade `freezing_level_height` a la consulta de Open-Meteo. En el
   modelo es un campo opcional (`freezingLevelM?`) porque las previsiones guardadas por versiones
   anteriores no lo traen; todo el código lo trata como dato que puede faltar.
4. **Estaciones como clasificación**: cada fila muestra cielo, temperatura, nieve prevista (con
   barra relativa), espesor y nota de hoy, y se ordena por nieve, espesor, nota o nombre
   (`sortStations`, con tests; sin dato, al final). Son 10 consultas que comparten caché con el
   resto (`useForecasts`), dentro del tope de 30 por minuto.
5. **Buscador rápido (Ctrl+K)** y **atajos Ctrl+1…9** para las pantallas. El buscador es un
   `combobox` con lista accesible; también se abre desde la barra de título.
6. **`Modal` común** con portal, foco atrapado, Escape y devolución del foco. Los cuadros se
   apilan: solo el de arriba atiende al teclado, y el bloqueo del fondo de nieve pasa a ser un
   contador (`overlayLock`) para que cerrar un cuadro interior no lo reanude.
7. **Versión 1.0.0**: con esto la app cubre lo que se pidió y se da por terminada.

## Consecuencias

- La pantalla Estaciones pide la previsión de las 10 estaciones al abrirse (antes solo las
  favoritas); quedan en caché para el resto de pantallas.
- El desnivel de una pista en el mapa de pistas se calcula con la cota más alta y más baja del
  trazado, no con los extremos (una pista en bucle daba 0).
