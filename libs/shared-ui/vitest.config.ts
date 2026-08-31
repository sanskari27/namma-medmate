import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { createWebVitestConfig } from '@namma-medmate/vitest-config/web';

const web = createWebVitestConfig(import.meta.dirname);
const src = fileURLToPath(new URL('./src', import.meta.url));

export default defineConfig({
  ...web,
  plugins: [react()],
  resolve: {
    alias: {
      '#lib': `${src}/lib`,
      '#components': `${src}/components`,
      '#hooks': `${src}/hooks`,
    },
  },
});
