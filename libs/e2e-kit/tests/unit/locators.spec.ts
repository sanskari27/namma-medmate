import type { Page } from '@playwright/test';
import { describe, expect, it, vi } from 'vitest';
import { createLocators } from '../../src/locators/create-locators.ts';
import { locatorFrom } from '../../src/locators/locator-from.ts';
import type { Selector } from '../../src/selectors/selector-types.ts';

function createMockPage() {
  return {
    getByRole: vi.fn((role: string, opts: unknown) => ({ kind: 'role', role, opts })),
    getByTestId: vi.fn((testId: string) => ({ kind: 'testId', testId })),
    getByLabel: vi.fn((label: unknown, opts: unknown) => ({ kind: 'label', label, opts })),
    getByPlaceholder: vi.fn((placeholder: unknown, opts: unknown) => ({
      kind: 'placeholder',
      placeholder,
      opts,
    })),
    getByText: vi.fn((text: unknown, opts: unknown) => ({ kind: 'text', text, opts })),
    getByAltText: vi.fn((altText: unknown, opts: unknown) => ({ kind: 'altText', altText, opts })),
    getByTitle: vi.fn((title: unknown, opts: unknown) => ({ kind: 'title', title, opts })),
    locator: vi.fn((css: string) => ({ kind: 'css', css })),
  };
}

describe('locatorFrom', () => {
  it('maps each selector kind to the matching Playwright query', () => {
    const page = createMockPage() as unknown as Page;

    expect(locatorFrom(page, { role: 'heading', name: 'Session', exact: true })).toEqual({
      kind: 'role',
      role: 'heading',
      opts: { name: 'Session', exact: true },
    });
    expect(locatorFrom(page, { testId: 'cart' })).toEqual({ kind: 'testId', testId: 'cart' });
    expect(locatorFrom(page, { label: 'Phone', exact: true })).toEqual({
      kind: 'label',
      label: 'Phone',
      opts: { exact: true },
    });
    expect(locatorFrom(page, { placeholder: 'Search' })).toEqual({
      kind: 'placeholder',
      placeholder: 'Search',
      opts: { exact: undefined },
    });
    expect(locatorFrom(page, { text: 'Skip' })).toEqual({
      kind: 'text',
      text: 'Skip',
      opts: { exact: undefined },
    });
    expect(locatorFrom(page, { altText: 'Logo' })).toEqual({
      kind: 'altText',
      altText: 'Logo',
      opts: { exact: undefined },
    });
    expect(locatorFrom(page, { title: 'Help', exact: false })).toEqual({
      kind: 'title',
      title: 'Help',
      opts: { exact: false },
    });
    expect(locatorFrom(page, { css: '#main-content' })).toEqual({
      kind: 'css',
      css: '#main-content',
    });
  });

  it('throws for an unsupported selector shape', () => {
    const page = createMockPage() as unknown as Page;
    expect(() => locatorFrom(page, {} as Selector)).toThrow('Unsupported selector');
  });
});

describe('createLocators', () => {
  it('returns an empty map when given no selectors', () => {
    const page = createMockPage() as unknown as Page;
    expect(createLocators(page, {})).toEqual({});
  });

  it('skips missing selector values', () => {
    const page = createMockPage() as unknown as Page;
    const locators = createLocators(page, {
      heading: undefined as unknown as { role: 'heading'; name: string },
    });
    expect(locators).toEqual({});
  });

  it('builds a locator map from a selector map', () => {
    const page = createMockPage() as unknown as Page;
    const locators = createLocators(page, {
      heading: { role: 'heading', name: 'Session' },
      cart: { testId: 'cart' },
    });
    expect(locators.heading).toEqual({
      kind: 'role',
      role: 'heading',
      opts: { name: 'Session', exact: undefined },
    });
    expect(locators.cart).toEqual({ kind: 'testId', testId: 'cart' });
  });
});
