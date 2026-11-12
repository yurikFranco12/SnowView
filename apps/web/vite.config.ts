import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Configuración pensada para Tauri: puerto fijo (Tauri lo espera en tauri.conf.json) y sin limpiar
// la consola, para no ocultar los mensajes de Rust.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
  },
  envPrefix: ['VITE_', 'TAURI_ENV_'],
  build: {
    // WebView2 de Windows 11 es Chromium reciente: no hace falta transpilar a navegadores antiguos.
    target: 'es2022',
  },
});
