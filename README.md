# SnowView

Monitor de nieve para estaciones de esquí. Muestra la nieve prevista y acumulada de tus estaciones
favoritas y avisa cuando se cumple una regla, por ejemplo "más de 15 cm en las próximas 48 h".

App de escritorio para Windows 11 hecha con Tauri 2, React y TypeScript.

## Estado

Fase 0 completada: entorno y monorepo. Ver [docs/fase-0/README.md](docs/fase-0/README.md).

## Estructura

```
packages/core   Lógica pura: modelos, acumulados y reglas (sin UI ni plataforma)
packages/data   Clientes de API, caché y normalización
apps/web        Interfaz (por ahora, solo los tokens de diseño)
docs/           Decisiones técnicas (ADR) y un README por fase
```

## Uso rápido

```bash
pnpm install
```

```bash
pnpm check
```

## Datos meteorológicos y licencia

SnowView usa la API de [Open-Meteo](https://open-meteo.com), que no necesita clave. Su uso gratuito
es **solo para fines no comerciales**, y los datos se publican bajo licencia CC BY 4.0, que obliga a
citar la fuente. Si SnowView llega a distribuirse con fines comerciales, habrá que contratar un plan
de Open-Meteo o cambiar de proveedor. La capa `packages/data` está pensada para poder hacerlo sin
tocar la interfaz.
