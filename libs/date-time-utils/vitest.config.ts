import { defineConfig } from 'vitest/config';
import { createNodeVitestConfig } from '@namma-medmate/vitest-config/node';

export default defineConfig(createNodeVitestConfig(import.meta.dirname));
