import { configureStore } from '@reduxjs/toolkit';
import { act, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import DashboardLayout from '@/layouts/DashboardLayout';
import { ROUTES } from '@/libs/constants/routes.const';
import { authReducer } from '@/store';

function renderShell(pinSet: boolean) {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        user: {
          userId: 'm1',
          displayName: 'Sanskar',
          role: 'admin_super',
          tenantId: null,
          pinSet,
        },
      },
    },
  });

  return {
    store,
    ...render(
      <Provider store={store}>
        <TooltipProvider>
          <MemoryRouter initialEntries={[ROUTES.DASHBOARD]}>
            <Routes>
              <Route element={<DashboardLayout />}>
                <Route path={ROUTES.DASHBOARD} element={<div>Tenant pulse</div>} />
              </Route>
              <Route path={ROUTES.LOGIN} element={<div>HQ sign in</div>} />
            </Routes>
          </MemoryRouter>
        </TooltipProvider>
      </Provider>,
    ),
  };
}

describe('admin idle PIN lock', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('empty: operator without a PIN must enroll before HQ work', () => {
    renderShell(false);
    expect(screen.getByRole('dialog', { name: 'Set HQ PIN' })).toBeInTheDocument();
    expect(screen.getByText('Tenant pulse')).toBeInTheDocument();
  });

  it('locks after five minutes of inactivity without ending the HQ session', () => {
    vi.useFakeTimers();
    const { store } = renderShell(true);
    expect(screen.queryByRole('dialog', { name: 'HQ session locked' })).not.toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(5 * 60 * 1000);
    });
    expect(screen.getByRole('dialog', { name: 'HQ session locked' })).toBeInTheDocument();
    expect(store.getState().auth.user?.displayName).toBe('Sanskar');
  });
});
