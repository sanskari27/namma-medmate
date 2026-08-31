import type { Locator, Page } from '@playwright/test';
import type { SelectorMap } from '../selectors/selector-types.ts';
import { locatorFrom } from './locator-from.ts';

export type LocatorsOf<T extends SelectorMap> = { [K in keyof T]: Locator };

export function createLocators<T extends SelectorMap>(page: Page, selectors: T): LocatorsOf<T> {
  const locators = {} as LocatorsOf<T>;
  for (const key of Object.keys(selectors) as (keyof T)[]) {
    const selector = selectors[key];
    if (!selector) {
      continue;
    }
    locators[key] = locatorFrom(page, selector);
  }
  return locators;
}
