import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const port = Number(env.VITE_DEV_PORT || 5173);

  return {
    plugins: [react(), tailwindcss()],
    server: { host: true, port },
    resolve: {
      alias: { '@': path.resolve(__dirname, './src') },
    },
  };
});
