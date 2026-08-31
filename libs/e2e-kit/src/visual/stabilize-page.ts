import type { Page } from '@playwright/test';

export const stabilizeCss = `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        caret-color: transparent !important;
      }
    `;

export async function stabilizePage(page: Page): Promise<void> {
  await page.addStyleTag({ content: stabilizeCss });
  await page.evaluate(waitForDocumentFonts);
}

export async function waitForDocumentFonts(): Promise<void> {
  if ('fonts' in document) {
    await document.fonts.ready;
  }
}
