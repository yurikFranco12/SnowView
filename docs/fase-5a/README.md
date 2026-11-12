# Fase 5a — Webcams

Estado: **completada** el 2026-11-12. Etiqueta `fase-5a`, app 0.6.0. Decisiones en
[ADR 0008](../adr/0008-webcams-incrustadas.md).

## Qué incluye

- **48 webcams de las 10 estaciones** en `stations/webcams.json`, con crédito y página oficial.
  Baqueira-Beret 5, Formigal 4, Cerler 2, Candanchú 4, La Molina 6, Masella 5, Grandvalira 8,
  Sierra Nevada 5, Alto Campoo 4 y Cauterets 5.
- **Pantalla Webcams**: eliges estación y ves sus cámaras en tarjetas. Cada una muestra la imagen
  (se renueva sola cada 2 a 5 minutos), con la hora a la que se cargó, y las que tienen vídeo
  traen un botón **En directo** que incrusta el reproductor.
- **Ampliar**: ventana con la cámara en grande (Escape o clic fuera para cerrar).
- **Inicio**: botón **Webcams** en la estación principal que abre sus cámaras.
- Cámaras solo con reproductor (Candanchú, Cauterets): se pulsa **Ver en directo**.
- Si una imagen no carga, error con botón de reintentar; si falla un refresco se conserva la
  última imagen buena.

## Tipos de cámara por estación

| Estación       | Imagen que se renueva | Vídeo en directo |
| -------------- | --------------------- | ---------------- |
| Baqueira-Beret | Sí                    | —                |
| Formigal       | Sí (feratel)          | Sí (feratel)     |
| Cerler         | Sí (feratel)          | Sí (feratel)     |
| Candanchú      | —                     | Sí (ipcamlive)   |
| La Molina      | Sí                    | —                |
| Masella        | Sí                    | —                |
| Grandvalira    | Sí (feratel)          | Sí (feratel)     |
| Sierra Nevada  | Sí                    | —                |
| Alto Campoo    | Sí (Cantur)           | —                |
| Cauterets      | —                     | Sí (Skaping)     |

## Cómo probar

```bash
pnpm check
```

Y abre la app (`pnpm.cmd dev`) → Webcams. Fuera de temporada algunas cámaras están apagadas o con
imágenes antiguas (por ejemplo, Candanchú muestra «Camera is not available»).

## Instaladores (app 0.6.0)

Generados con `pnpm.cmd build` en el terminal del usuario, en `src-tauri/target/release/bundle/`:

| Archivo                             | Tamaño   |
| ----------------------------------- | -------- |
| `msi/SnowView_0.6.0_x64_en-US.msi`  | 4,26 MiB |
| `nsis/SnowView_0.6.0_x64-setup.exe` | 3,13 MiB |
