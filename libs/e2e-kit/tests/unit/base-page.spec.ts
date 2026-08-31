import type { Page } from '@playwright/test';
import { describe, expect, it, vi } from 'vitest';
import { BasePage } from '../../src/page/base-page.ts';

class ExamplePage extends BasePage {
  readonly path = '/example';

  async expectReady(): Promise<void> {
    return undefined;
  }
}

describe('BasePage', () => {
  it('navigates to the page path', async () => {
    const goto = vi.fn(async () => undefined);
    const page = { goto } as unknown as Page;
    const example = new ExamplePage(page);
    await example.goto();
    await example.expectReady();
    expect(goto).toHaveBeenCalledWith('/example');
    expect(example.path).toBe('/example');
  });
});
