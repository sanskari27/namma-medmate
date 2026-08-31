import { describe, expect, it } from 'vitest';
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
} from '../../src/selectors/selector-types.ts';

describe('selector type guards', () => {
  it('discriminates each selector kind', () => {
    const role: Selector = { role: 'button', name: 'Save', exact: true };
    const testId: Selector = { testId: 'login-phone' };
    const label: Selector = { label: 'Phone', exact: true };
    const placeholder: Selector = { placeholder: 'Search', exact: false };
    const text: Selector = { text: 'Session', exact: true };
    const altText: Selector = { altText: 'Logo', exact: true };
    const title: Selector = { title: 'Help', exact: false };
    const css: Selector = { css: '[data-qa=cart]' };

    expect(isRoleSelector(role)).toBe(true);
    expect(isTestIdSelector(role)).toBe(false);

    expect(isTestIdSelector(testId)).toBe(true);
    expect(isLabelSelector(testId)).toBe(false);

    expect(isLabelSelector(label)).toBe(true);
    expect(isPlaceholderSelector(label)).toBe(false);

    expect(isPlaceholderSelector(placeholder)).toBe(true);
    expect(isTextSelector(placeholder)).toBe(false);

    expect(isTextSelector(text)).toBe(true);
    expect(isAltTextSelector(text)).toBe(false);

    expect(isAltTextSelector(altText)).toBe(true);
    expect(isTitleSelector(altText)).toBe(false);

    expect(isTitleSelector(title)).toBe(true);
    expect(isCssSelector(title)).toBe(false);

    expect(isCssSelector(css)).toBe(true);
    expect(isRoleSelector(css)).toBe(false);
  });
});
