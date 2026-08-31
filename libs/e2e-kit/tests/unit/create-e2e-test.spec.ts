import type { Page } from '@playwright/test';
import type * as PlaywrightTest from '@playwright/test';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BasePage } from '../../src/page/base-page.ts';

const extend = vi.fn((fixtures: Record<string, unknown>) => ({ fixtures }));

vi.mock('@playwright/test', async (importOriginal) => {
  const actual = await importOriginal<typeof PlaywrightTest>();
  return {
    ...actual,
    test: { extend },
    expect: vi.fn(() => ({
      toEqual: vi.fn(),
      toHaveScreenshot: vi.fn(async () => undefined),
    })),
  };
});

vi.mock('@axe-core/playwright', () => ({
  default: class {
    withTags() {
      return this;
    }
    include() {
      return this;
    }
    exclude() {
      return this;
    }
    analyze() {
      return Promise.resolve({ violations: [] });
    }
  },
}));

class HomeScreen extends BasePage {
  readonly path = '/';
  async expectReady(): Promise<void> {
    return undefined;
  }
}

describe('createE2eTest', () => {
  beforeEach(() => {
    extend.mockClear();
  });

  it('registers kit fixtures and constructed page objects', async () => {
    const { createE2eTest, createKitFixtures, instantiatePage } =
      await import('../../src/fixtures/create-e2e-test.ts');
    const page = {
      addStyleTag: vi.fn(async () => undefined),
      evaluate: vi.fn(async () => undefined),
    } as unknown as Page;

    const home = instantiatePage(HomeScreen, page);
    expect(home).toBeInstanceOf(HomeScreen);

    const kit = createKitFixtures(page);
    await kit.a11y.scan();
    await kit.visual.screenshot('home.png');

    createE2eTest({ homePage: HomeScreen });
    expect(extend).toHaveBeenCalledTimes(1);
    const fixtures = extend.mock.calls[0]?.[0] as
      | Record<
          string,
          (args: { page: Page }, use: (value: unknown) => Promise<void>) => Promise<void>
        >
      | undefined;

    const a11yFixture = fixtures?.a11y;
    const visualFixture = fixtures?.visual;
    const homeFixture = fixtures?.homePage;
    if (!a11yFixture || !visualFixture || !homeFixture) {
      throw new Error('expected a11y, visual, and homePage fixtures');
    }

    let a11yValue: unknown;
    await a11yFixture({ page }, async (value) => {
      a11yValue = value;
    });
    expect(a11yValue).toMatchObject({ scan: expect.any(Function) });

    let visualValue: unknown;
    await visualFixture({ page }, async (value) => {
      visualValue = value;
    });
    expect(visualValue).toMatchObject({ screenshot: expect.any(Function) });

    let homePage: unknown;
    await homeFixture({ page }, async (value) => {
      homePage = value;
    });
    expect(homePage).toBeInstanceOf(HomeScreen);

    await (a11yValue as { scan: () => Promise<void> }).scan();
    await (visualValue as { screenshot: (name: string) => Promise<void> }).screenshot('kit.png');

    await import('../../src/test.ts');
    expect(extend.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});
