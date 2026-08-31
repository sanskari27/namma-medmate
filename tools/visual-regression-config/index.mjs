export const visualRegressionConfig = {
  maxDiffPixelRatio: 0.001,
  threshold: 0.2,
  animations: 'disabled',
};

/**
 * @param {import('@playwright/test').Page} page
 */
export async function stabilizePage(page) {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        caret-color: transparent !important;
      }
    `,
  });
  await page.evaluate(async () => {
    if ('fonts' in document) {
      await document.fonts.ready;
    }
  });
}
