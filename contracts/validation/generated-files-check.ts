import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { repoRoot } from '../codegen/aggregate-contracts.ts';

const execFileAsync = promisify(execFile);

export async function checkGeneratedFiles(): Promise<void> {
  await execFileAsync('tsx', ['codegen/generate-all.ts'], { cwd: `${repoRoot}/contracts` });
  const { stdout } = await execFileAsync('git', ['status', '--porcelain'], { cwd: repoRoot });
  const dirty = stdout
    .split('\n')
    .map((line) => line.trim())
    .filter((line) =>
      /contracts\/(registry|merged-openapi.yaml)|libs\/(shared-types|api-client)\/src\/generated/.test(
        line,
      ),
    );
  if (dirty.length > 0) {
    throw new Error(`Generated files are out of date:\n${dirty.join('\n')}`);
  }
}

if (process.argv[1]?.endsWith('generated-files-check.ts')) {
  await checkGeneratedFiles();
  process.stdout.write('generated files ok\n');
}
