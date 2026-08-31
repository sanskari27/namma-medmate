import { test as base, type Page } from '@playwright/test';
import { expectNoA11yViolations, type A11yScanOptions } from '../a11y/expect-no-violations.ts';
import { expectScreenshot } from '../visual/expect-screenshot.ts';

export type PageCtor<TInstance> = new (page: Page) => TInstance;

export type A11yFixture = {
  scan: (options?: A11yScanOptions) => Promise<void>;
};

export type VisualFixture = {
  screenshot: (name: string) => Promise<void>;
};

export type KitFixtures = {
  a11y: A11yFixture;
  visual: VisualFixture;
};

export function createKitFixtures(page: Page): KitFixtures {
  return {
    a11y: {
      scan: (options) => expectNoA11yViolations(page, options),
    },
    visual: {
      screenshot: (name) => expectScreenshot(page, name),
    },
  };
}

export function instantiatePage<T>(Ctor: PageCtor<T>, page: Page): T {
  return new Ctor(page);
}

export function createE2eTest<TScreens extends Record<string, PageCtor<unknown>>>(
  screens: TScreens,
) {
  type ScreenFixtures = {
    [K in keyof TScreens]: InstanceType<TScreens[K]>;
  };

  const fixtures: Record<string, unknown> = {
    a11y: async ({ page }: { page: Page }, use: (value: A11yFixture) => Promise<void>) => {
      await use(createKitFixtures(page).a11y);
    },
    visual: async ({ page }: { page: Page }, use: (value: VisualFixture) => Promise<void>) => {
      await use(createKitFixtures(page).visual);
    },
  };

  for (const [name, Ctor] of Object.entries(screens)) {
    fixtures[name] = async ({ page }: { page: Page }, use: (value: unknown) => Promise<void>) => {
      await use(instantiatePage(Ctor, page));
    };
  }

  return base.extend<ScreenFixtures & KitFixtures>(fixtures as never);
}
