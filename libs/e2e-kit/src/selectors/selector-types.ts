import type { Page } from '@playwright/test';

export type RoleSelector = {
  role: Parameters<Page['getByRole']>[0];
  name?: string | RegExp;
  exact?: boolean;
};

export type TestIdSelector = {
  testId: string;
};

export type LabelSelector = {
  label: string | RegExp;
  exact?: boolean;
};

export type PlaceholderSelector = {
  placeholder: string | RegExp;
  exact?: boolean;
};

export type TextSelector = {
  text: string | RegExp;
  exact?: boolean;
};

export type AltTextSelector = {
  altText: string | RegExp;
  exact?: boolean;
};

export type TitleSelector = {
  title: string | RegExp;
  exact?: boolean;
};

export type CssSelector = {
  css: string;
};

export type Selector =
  | RoleSelector
  | TestIdSelector
  | LabelSelector
  | PlaceholderSelector
  | TextSelector
  | AltTextSelector
  | TitleSelector
  | CssSelector;

export type SelectorMap = Record<string, Selector>;

export function isRoleSelector(selector: Selector): selector is RoleSelector {
  return 'role' in selector;
}

export function isTestIdSelector(selector: Selector): selector is TestIdSelector {
  return 'testId' in selector;
}

export function isLabelSelector(selector: Selector): selector is LabelSelector {
  return 'label' in selector;
}

export function isPlaceholderSelector(selector: Selector): selector is PlaceholderSelector {
  return 'placeholder' in selector;
}

export function isTextSelector(selector: Selector): selector is TextSelector {
  return 'text' in selector;
}

export function isAltTextSelector(selector: Selector): selector is AltTextSelector {
  return 'altText' in selector;
}

export function isTitleSelector(selector: Selector): selector is TitleSelector {
  return 'title' in selector;
}

export function isCssSelector(selector: Selector): selector is CssSelector {
  return 'css' in selector;
}
