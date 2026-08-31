/**
 * @param {{
 *   testDir: string;
 *   baseURL?: string;
 *   webServer?: import('@playwright/test').PlaywrightTestConfig['webServer'];
 * }} options
 */
export function createPlaywrightConfig(options) {
  return {
    testDir: options.testDir,
    fullyParallel: true,
    forbidOnly: Boolean(process.env.CI),
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 2 : undefined,
    reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
    use: {
      baseURL: options.baseURL,
      trace: 'on-first-retry',
      screenshot: 'only-on-failure',
    },
    webServer: options.webServer,
    projects: [
      {
        name: 'happy-path',
        testDir: `${options.testDir}/happy-path`,
        use: { browserName: 'chromium' },
      },
      {
        name: 'failure-cases',
        testDir: `${options.testDir}/failure-cases`,
        use: { browserName: 'chromium' },
      },
    ],
  };
}
