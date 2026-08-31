import type { Page } from '@playwright/test';
import type * as PlaywrightTest from '@playwright/test';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { withTags, include, exclude, analyze, toEqual, playwrightExpect } = vi.hoisted(() => {
  const withTagsFn = vi.fn();
  const includeFn = vi.fn();
  const excludeFn = vi.fn();
  const analyzeFn = vi.fn();
  const toEqualFn = vi.fn();
  return {
    withTags: withTagsFn,
    include: includeFn,
    exclude: excludeFn,
    analyze: analyzeFn,
    toEqual: toEqualFn,
    playwrightExpect: vi.fn(() => ({ toEqual: toEqualFn })),
  };
});

vi.mock('@axe-core/playwright', () => ({
  default: class {
    withTags = withTags;
    include = include;
    exclude = exclude;
    analyze = analyze;
  },
}));

vi.mock('@playwright/test', async (importOriginal) => {
  const actual = await importOriginal<typeof PlaywrightTest>();
  return {
    ...actual,
    expect: playwrightExpect,
  };
});

describe('expectNoA11yViolations', () => {
  beforeEach(() => {
    withTags.mockReset().mockReturnThis();
    include.mockReset().mockReturnThis();
    exclude.mockReset().mockReturnThis();
    analyze.mockReset().mockResolvedValue({ violations: [] });
    toEqual.mockReset();
    playwrightExpect.mockClear();
  });

  it('scans with default WCAG tags', async () => {
    const { defaultA11yTags, expectNoA11yViolations } =
      await import('../../src/a11y/expect-no-violations.ts');
    const page = {} as Page;
    await expectNoA11yViolations(page);
    expect(withTags).toHaveBeenCalledWith([...defaultA11yTags]);
    expect(include).not.toHaveBeenCalled();
    expect(exclude).not.toHaveBeenCalled();
    expect(analyze).toHaveBeenCalledTimes(1);
    expect(playwrightExpect).toHaveBeenCalledWith([]);
    expect(toEqual).toHaveBeenCalledWith([]);
  });

  it('applies include, exclude, and custom tags', async () => {
    const { expectNoA11yViolations } = await import('../../src/a11y/expect-no-violations.ts');
    await expectNoA11yViolations({} as Page, {
      tags: ['wcag2aa'],
      include: ['main'],
      exclude: ['.toast'],
    });
    expect(withTags).toHaveBeenCalledWith(['wcag2aa']);
    expect(include).toHaveBeenCalledWith('main');
    expect(exclude).toHaveBeenCalledWith('.toast');
  });
});
