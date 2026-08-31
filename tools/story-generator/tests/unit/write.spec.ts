import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { writeGeneratedStories } from '../../src/write.ts';

describe('writeGeneratedStories', () => {
  it('writes a generated stories file', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'stories-'));
    const path = writeGeneratedStories({
      outputDir: dir,
      importPath: '../../src/index.ts',
      componentName: 'AuthWidget',
      scenarios: [{ id: 'loading', title: 'Loading', description: '', props: {} }],
    });
    expect(path.endsWith('AuthWidget.stories.tsx')).toBe(true);
    const custom = writeGeneratedStories({
      outputDir: dir,
      fileName: 'custom.stories.tsx',
      importPath: '../../src/index.ts',
      componentName: 'AuthWidget',
      scenarios: [{ id: 'loading', title: 'Loading', description: '', props: {} }],
    });
    expect(custom.endsWith('custom.stories.tsx')).toBe(true);
  });
});
