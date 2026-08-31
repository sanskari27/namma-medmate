#!/usr/bin/env node
import { build } from 'esbuild';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const entry = process.argv[2];
const outfile = process.argv[3];

if (!entry || !outfile) {
  throw new Error('Usage: node bundle-lambda.mjs <entry> <outfile>');
}

mkdirSync(dirname(outfile), { recursive: true });

await build({
  entryPoints: [entry],
  bundle: true,
  platform: 'node',
  target: 'node24',
  format: 'cjs',
  outfile,
  sourcemap: true,
  minify: true,
  legalComments: 'none',
  external: [],
});
