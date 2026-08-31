import type { Locator, Page } from '@playwright/test';
import {
  isAltTextSelector,
  isCssSelector,
  isLabelSelector,
  isPlaceholderSelector,
  isRoleSelector,
  isTestIdSelector,
  isTextSelector,
  isTitleSelector,
  type Selector,
} from '../selectors/selector-types.ts';

export function locatorFrom(page: Page, selector: Selector): Locator {
  if (isRoleSelector(selector)) {
    return page.getByRole(selector.role, { name: selector.name, exact: selector.exact });
  }
  if (isTestIdSelector(selector)) {
    return page.getByTestId(selector.testId);
  }
  if (isLabelSelector(selector)) {
    return page.getByLabel(selector.label, { exact: selector.exact });
  }
  if (isPlaceholderSelector(selector)) {
    return page.getByPlaceholder(selector.placeholder, { exact: selector.exact });
  }
  if (isTextSelector(selector)) {
    return page.getByText(selector.text, { exact: selector.exact });
  }
  if (isAltTextSelector(selector)) {
    return page.getByAltText(selector.altText, { exact: selector.exact });
  }
  if (isTitleSelector(selector)) {
    return page.getByTitle(selector.title, { exact: selector.exact });
  }
  if (isCssSelector(selector)) {
    return page.locator(selector.css);
  }
  throw new Error(`Unsupported selector: ${JSON.stringify(selector)}`);
}
