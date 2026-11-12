# ADR 0007 — Valoración de las condiciones para esquiar y hacer snowboard

- Estado: aceptada
- Fecha: 2026-11-12

## Contexto

Se quiere ver, por estación y por día, si las condiciones son buenas para esquiar o hacer
snowboard, y qué estación y día conviene elegir. No existe una medida oficial: es una estimación.

## Decisiones

1. **Nota de 0 a 100 y cinco valoraciones**: excelente (80 o más), buena (65), aceptable (45),
   floja (25) y mala. Siempre se muestra la valoración escrita, no solo el color.
2. **Cinco medidas con peso**, en `core/conditions.ts`, todas con la previsión de la cima:
   cobertura de nieve (grosor medio; de 20 a 100 cm), nieve reciente (72 h antes y hasta las 18:00;
   de 0 a 30 cm), temperatura en horario de pistas (ideal de −12 a −2 °C; el calor penaliza más que
   el frío extremo), viento (el mayor entre el viento y 0,7 × ráfaga; de 20 a 70 km/h) y tiempo
   (lluvia, niebla o nevada cayendo).
3. **Topes** que arruinan el día aunque lo demás sea bueno: menos de 10 cm de nieve (20), viento de
   70 km/h o más (20) o de 55 (45), 3 h o más de lluvia (40).
4. **Snowboard no es esquí**: la nieve reciente pesa más (25 frente a 20), el viento también (25
   frente a 20), la cobertura algo menos y, con menos de 30 cm de nieve, el tope baja a 45.
5. **Horario de pistas de 9:00 a 17:00 locales**: temperatura, viento y tiempo se miden solo ahí.
6. **Los datos que faltan cuentan como neutros** y marcan el día como incompleto; sin ninguna hora
   de pistas con dato no hay nota.
7. **Mejores opciones**: el mejor día de cada estación, ordenado por nota. La estrella de cada día
   solo se pone si la nota llega a "aceptable"; si ninguna llega, la pantalla lo dice.

## Consecuencias

- Los pesos y límites son una heurística y se pueden ajustar; están juntos en un solo archivo.
- No sabe si hay remontes abiertos ni el estado real de las pistas, solo el tiempo previsto.
- Los primeros días de la previsión no ven la nieve caída antes de hoy; el grosor de nieve lo
  compensa en parte.
