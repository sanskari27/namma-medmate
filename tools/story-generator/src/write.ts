import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { renderGeneratedStoriesFile, type StoryScenario } from './index.ts';

export function writeGeneratedStories(options: {
  outputDir: string;
  fileName?: string;
  importPath: string;
  componentName: string;
  scenarios: readonly StoryScenario[];
}): string {
  const fileName = options.fileName ?? `${options.componentName}.stories.tsx`;
  const outputPath = join(options.outputDir, fileName);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(
    outputPath,
    renderGeneratedStoriesFile({
      importPath: options.importPath,
      componentName: options.componentName,
      scenarios: options.scenarios,
    }),
    'utf8',
  );
  return outputPath;
}
