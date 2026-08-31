export { e2eTags, taggedTitle } from './tags.ts';
export type { E2eTag } from './tags.ts';

export {
  isAltTextSelector,
  isCssSelector,
  isLabelSelector,
  isPlaceholderSelector,
  isRoleSelector,
  isTestIdSelector,
  isTextSelector,
  isTitleSelector,
} from './selectors/selector-types.ts';
export type {
  AltTextSelector,
  CssSelector,
  LabelSelector,
  PlaceholderSelector,
  RoleSelector,
  Selector,
  SelectorMap,
  TestIdSelector,
  TextSelector,
  TitleSelector,
} from './selectors/selector-types.ts';

export { locatorFrom } from './locators/locator-from.ts';
export { createLocators } from './locators/create-locators.ts';
export type { LocatorsOf } from './locators/create-locators.ts';

export { BasePage } from './page/base-page.ts';

export { defaultA11yTags, expectNoA11yViolations } from './a11y/expect-no-violations.ts';
export type { A11yScanOptions } from './a11y/expect-no-violations.ts';

export { stabilizeCss, stabilizePage, waitForDocumentFonts } from './visual/stabilize-page.ts';
export { expectScreenshot } from './visual/expect-screenshot.ts';

export { createE2eTest, createKitFixtures, instantiatePage } from './fixtures/create-e2e-test.ts';
export type {
  A11yFixture,
  KitFixtures,
  PageCtor,
  VisualFixture,
} from './fixtures/create-e2e-test.ts';

export { expect } from '@playwright/test';
export type { Locator, Page } from '@playwright/test';
export { test } from './test.ts';
