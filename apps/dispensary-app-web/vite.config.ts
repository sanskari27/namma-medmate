import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
  },
  preview: {
    port: 4173,
  },
  build: {
    sourcemap: true,
    // Login is first paint; do not preload authenticated chrome chunks.
    modulePreload: false,
  },
});
