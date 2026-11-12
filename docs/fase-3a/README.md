# Fase 3a — Ajustes y modo sin conexión

Estado: en curso en la rama `fase-3a` (2026-11-12).

## Qué incluye

- **Ajustes**: frecuencia de consulta de la previsión (15 min, 30 min, 1 h o 3 h) e intensidad de la
  nevada de fondo (sin nieve, suave, normal o intensa). Se guardan con el almacenamiento de la app y
  se aplican al momento. Cada opción es un grupo de radio accesible por teclado.
- **Modo sin conexión**: cada previsión descargada se guarda en disco (una por estación, hasta 3
  días). Si una consulta falla (sin conexión, límite de peticiones, error del proveedor) se usa la
  guardada, y el inicio avisa de la edad de los datos cuando están desfasados. Las reglas de alerta
  siguen evaluándose con esos datos; el registro de avisos evita repetir notificaciones.

## Cómo probar

```bash
pnpm check
```

Para ver el modo sin conexión: abre la app con datos, desconecta la red, espera al siguiente
refresco (o pon 15 min en Ajustes) y mira el aviso del inicio.
