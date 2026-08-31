import type { Page } from '@playwright/test';

export const visualRegressionConfig: {
  maxDiffPixelRatio: number;
  threshold: number;
  animations: 'disabled';
};

export function stabilizePage(page: Page): Promise<void>;
