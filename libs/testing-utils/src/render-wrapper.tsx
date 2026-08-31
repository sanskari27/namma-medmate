import { render, type RenderOptions } from '@testing-library/react';
import { Provider } from 'react-redux';
import type { ReactElement, ReactNode } from 'react';
import type { Store } from '@reduxjs/toolkit';

export function renderWithStore(
  ui: ReactElement,
  store: Store,
  options?: Omit<RenderOptions, 'wrapper'>,
): ReturnType<typeof render> {
  function Wrapper({ children }: { children: ReactNode }) {
    return <Provider store={store}>{children}</Provider>;
  }
  return render(ui, { wrapper: Wrapper, ...options });
}
