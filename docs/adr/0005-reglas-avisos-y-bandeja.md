# ADR 0005 — Reglas, avisos sin repetir y bandeja

- Estado: aceptada
- Fecha: 2026-11-12

## Decisiones

1. **Regla = estación + "más de X cm" + ventana de N horas + cota (cima o base)**, con viento y
   temperatura opcionales. "Más de" es estricto: igualar el umbral no dispara. La ventana empieza en
   la hora en curso y mira hacia delante (lo ya pasado no cuenta). El viento máximo y la temperatura
   más alta de la ventana no deben superar los límites; sin dato, la condición no se da por
   cumplida (mejor no avisar que avisar sin saber).
2. **El evento de nieve es un "episodio".** La especificación pide clave = estación + regla + inicio
   de la ventana, pero la ventana se desliza cada hora y la misma nevada avisaría 48 veces. Se usa el
   inicio del episodio: la primera hora con nieve de la ventana, retrocediendo mientras no haya un
   hueco de 12 h sin nieve. Misma nevada, misma clave. Otra nevada con 12 h o más de separación,
   clave nueva y aviso nuevo.
3. **Registro de avisos guardado en disco** (clave → momento) para no repetir tras reiniciar la app.
   Se limpian los de más de 14 días. Solo se anota un aviso si la notificación se pudo mostrar: si el
   permiso falla, no se pierde.
4. **Notificaciones con el plugin de Tauri** detrás de `platform/notifications.ts` (la UI no
   conoce Tauri). En el navegador de desarrollo se usa la API Notification.
5. **Bandeja y cierre.** Cerrar la ventana la oculta en la bandeja, para que las reglas se sigan
   evaluando; «Salir» en el menú de la bandeja cierra la app. Con el arranque con Windows la app se
   inicia con `--minimized` y no muestra la ventana.
6. **Evaluación en la UI mientras la app está abierta**, con la previsión en caché de TanStack
   Query (refresco cada hora). Cuando haya servidor (Fase 2) la evaluación se moverá allí con el
   mismo código de `core/`.

## Consecuencias

- Si la previsión mueve una nevada de forma que el inicio del episodio cambia de verdad (por
  ejemplo, aparece nieve nueva 8 h antes), la clave cambia y puede haber un segundo aviso.
- Cerrar con la X ya no cierra la app: se explica en Ajustes.
