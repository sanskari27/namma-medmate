import type { Page } from '@playwright/test';
import type * as PlaywrightTest from '@playwright/test';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  stabilizeCss,
  stabilizePage,
  waitForDocumentFonts,
} from '../../src/visual/stabilize-page.ts';

const toHaveScreenshot = vi.fn(async () => undefined);
const playwrightExpect = vi.fn(() => ({ toHaveScreenshot }));

vi.mock('@playwright/test', async (importOriginal) => {
  const actual = await importOriginal<typeof PlaywrightTest>();
  return {
    ...actual,
    expect: playwrightExpect,
  };
});

describe('stabilizePage', () => {
  it('injects animation-disabling CSS and waits for fonts', async () => {
    const addStyleTag = vi.fn(async () => undefined);
    const evaluate = vi.fn(async () => undefined);
    const page = { addStyleTag, evaluate } as unknown as Page;
    await stabilizePage(page);
    expect(addStyleTag).toHaveBeenCalledWith({ content: stabilizeCss });
    expect(evaluate).toHaveBeenCalledWith(waitForDocumentFonts);
  });
});

describe('waitForDocumentFonts', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('awaits document.fonts.ready when fonts exist', async () => {
    const ready = Promise.resolve();
    vi.stubGlobal('document', { fonts: { ready } });
    await waitForDocumentFonts();
  });

  it('does nothing when fonts are absent', async () => {
    vi.stubGlobal('document', {});
    await waitForDocumentFonts();
  });
});

describe('expectScreenshot', () => {
  it('stabilizes then captures a screenshot', async () => {
    const addStyleTag = vi.fn(async () => undefined);
    const evaluate = vi.fn(async () => undefined);
    const page = { addStyleTag, evaluate } as unknown as Page;
    const { expectScreenshot } = await import('../../src/visual/expect-screenshot.ts');
    await expectScreenshot(page, 'home.png');
    expect(addStyleTag).toHaveBeenCalled();
    expect(playwrightExpect).toHaveBeenCalledWith(page);
    expect(toHaveScreenshot).toHaveBeenCalledWith('home.png');
  });
});
