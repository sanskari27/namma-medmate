import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

export const defaultA11yTags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] as const;

export type A11yScanOptions = {
  include?: string[];
  exclude?: string[];
  tags?: string[];
};

export async function expectNoA11yViolations(
  page: Page,
  options: A11yScanOptions = {},
): Promise<void> {
  let builder = new AxeBuilder({ page }).withTags(options.tags ?? [...defaultA11yTags]);
  for (const selector of options.include ?? []) {
    builder = builder.include(selector);
  }
  for (const selector of options.exclude ?? []) {
    builder = builder.exclude(selector);
  }
  const results = await builder.analyze();
  expect(results.violations).toEqual([]);
}
