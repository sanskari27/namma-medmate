import type { PlaywrightTestConfig } from '@playwright/test';

export type PlaywrightSuite = 'smoke' | 'happy-path' | 'failure-cases' | 'a11y' | 'visual';

const knownSuites: readonly PlaywrightSuite[] = [
  'smoke',
  'happy-path',
  'failure-cases',
  'a11y',
  'visual',
];

export function createPlaywrightConfig(options: {
  testDir: string;
  baseURL?: string;
  webServer?: PlaywrightTestConfig['webServer'];
  suites?: PlaywrightSuite[];
  setup?: { testMatch: string | RegExp; storageState: string };
}): PlaywrightTestConfig {
  const suites = options.suites ?? ['happy-path', 'failure-cases'];
  for (const suite of suites) {
    if (!knownSuites.includes(suite)) {
      throw new Error(`Unknown Playwright suite: ${suite}`);
    }
  }

  const projects: NonNullable<PlaywrightTestConfig['projects']> = [];

  if (options.setup) {
    projects.push({
      name: 'setup',
      testMatch: options.setup.testMatch,
      use: { browserName: 'chromium' },
    });
  }

  for (const suite of suites) {
    projects.push({
      name: suite,
      testDir: `${options.testDir}/${suite}`,
      use: {
        browserName: 'chromium',
        ...(options.setup?.storageState ? { storageState: options.setup.storageState } : {}),
      },
      ...(options.setup ? { dependencies: ['setup'] } : {}),
    });
  }

  return {
    testDir: options.testDir,
    fullyParallel: true,
    forbidOnly: Boolean(process.env.CI),
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 2 : undefined,
    reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
    expect: {
      toHaveScreenshot: {
        maxDiffPixelRatio: 0.001,
        threshold: 0.2,
        animations: 'disabled' as const,
      },
    },
    use: {
      baseURL: options.baseURL,
      trace: 'on-first-retry',
      screenshot: 'only-on-failure',
    },
    webServer: options.webServer,
    projects,
  };
}
