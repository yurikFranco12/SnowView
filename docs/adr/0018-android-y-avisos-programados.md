# ADR 0018 — Android (Google Play) y avisos programados

- Estado: aceptada
- Fecha: 2026-11-14

## Contexto

Se quiere publicar SnowView en Google Play. La app era solo de escritorio: bandeja del sistema,
arranque con Windows, ventana sin marco y una interfaz pensada para 1100 px o más. Los avisos
dependían de que la app siguiera abierta en la bandeja evaluando las reglas, y en Android una app no
se queda viva en segundo plano.

## Decisiones

1. **Mismo código para Windows y Android** con Tauri 2. Lo que solo existe en escritorio se aísla:
   en Rust con `#[cfg(desktop)]` y dependencias por plataforma; en Tauri con un archivo de permisos
   solo de escritorio; en la interfaz con `platform/device.ts`, el único sitio que mira la
   plataforma.
2. **Avisos programados en Android.** Con la previsión ya descargada, `planUpcomingAlert` (`core`,
   con tests) calcula la primera hora de los próximos 5 días en que cada regla pasará a cumplirse, y
   la app deja ese aviso programado en el sistema. Android lo entrega con la app cerrada y lo
   restaura tras un reinicio. Cada vez que se abre la app y cambia la previsión o las reglas, se
   cancela lo programado y se rehace.
   - Por qué no un servidor con push: es la Fase 2 (servidor, coste y cuenta), y esta solución no
     necesita nada fuera del teléfono.
   - Por qué no un trabajo nativo en segundo plano (WorkManager): obligaría a repetir en Kotlin la
     consulta y la evaluación de reglas que ya están en TypeScript, y no se podía probar aquí.
   - Límite conocido: el aviso se basa en la última previsión descargada. Por eso el horizonte es de
     5 días y el texto dice de cuándo es la previsión. Si la previsión empeora o mejora sin abrir la
     app, el aviso no se entera.
3. **Sin repetir avisos.** Los programados se guardan (`scheduled`) y, cuando llega su hora, pasan
   al registro de avisados antes de evaluar las reglas. El aviso inmediato y el programado del mismo
   evento usan el mismo identificador (`notificationId`), así que el sistema nunca muestra dos.
4. **Sin alarmas exactas.** No se pide `SCHEDULE_EXACT_ALARM` (Google Play lo restringe): Android
   puede retrasar el aviso unos minutos, que aquí no importa.
5. **Canal propio** «Avisos de nieve» con importancia alta, y permiso de notificaciones pedido al
   crear la primera regla, que es cuando se entiende para qué sirve.
6. **Sin permiso de ubicación en Android.** La distancia a las estaciones usa la ubicación fijada a
   mano (buscando el pueblo o tocando el mapa). Menos datos personales, menos declaraciones en
   Google Play y una política de privacidad más simple. Se puede añadir más adelante.
7. **Interfaz adaptable** con los puntos de corte de Tailwind (`md`, 768 px): barra de navegación
   inferior y una columna en el móvil; el escritorio queda igual.
8. **CSP más estricta**: `object-src 'none'`, `base-uri 'self'`, `form-action 'none'`,
   `frame-ancestors 'none'` y `worker-src 'none'`.

## Consecuencias

- El proyecto de Android (`src-tauri/gen/android`) se genera en el equipo del usuario; la firma se
  configura allí y la clave nunca entra en el repositorio.
- El identificador de Android (`com.snowview.app`) es distinto del de escritorio
  (`com.snowview.desktop`) para no mover los datos ya guardados en Windows.
- Los avisos en Android no se han probado en un dispositivo: la lista de comprobación está en
  `docs/fase-18/README.md`.
