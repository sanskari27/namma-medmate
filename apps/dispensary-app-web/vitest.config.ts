import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { createWebVitestConfig } from '@namma-medmate/vitest-config/web';

const web = createWebVitestConfig(import.meta.dirname);

export default defineConfig({
  ...web,
  plugins: [react()],
  test: {
    ...web.test,
    coverage: {
      ...web.test.coverage,
      exclude: [...(web.test.coverage?.exclude ?? []), 'src/main.tsx', 'src/app/app.tsx'],
    },
  },
});
