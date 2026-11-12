# Fase 7 — Mapa acotado y buscador de pueblos

Estado: **completada** el 2026-11-12. Etiquetas `fase-7` y `v0.9.0`. Decisiones en el
[ADR 0011](../adr/0011-mapa-acotado-y-buscador-de-lugares.md).

## Qué cambia

- **Sin relieve**: se quita el sombreado y las curvas de nivel. Quedan las líneas de provincias.
- **Mapa acotado**: ya no se ve cortado al alejar ni se puede arrastrar sin límite. Hay un zoom
  mínimo y límites por los cuatro lados (de 17° O a 17° E y de 28° N a 53° N).
- **Buscar mi pueblo**: en «Tu ubicación» se escribe, por ejemplo, «Guriezo» y aparece una lista de
  sugerencias («Guriezo, Cantabria · España»); se elige con el ratón o con las flechas y Enter. La
  ubicación queda como «Fijada a mano: Guriezo, Cantabria». Sustituye a escribir coordenadas.
- La leyenda ya no habla de relieve ni de curvas de nivel.

## Cómo probar

```bash
pnpm check
```

Abre Mapa → «Buscar mi pueblo» → escribe «Guriezo». Prueba a alejar con la rueda y a arrastrar el
mapa a los cuatro lados.

## Instaladores (app 0.9.0)

Generados con `pnpm.cmd build` en el terminal del usuario, en `src-tauri/target/release/bundle/`:

| Archivo                             | Tamaño   |
| ----------------------------------- | -------- |
| `msi/SnowView_0.9.0_x64_en-US.msi`  | 4,47 MiB |
| `nsis/SnowView_0.9.0_x64-setup.exe` | 3,34 MiB |

Sin el relieve, el instalador baja 1,3 MiB respecto a la 0.8.0.
