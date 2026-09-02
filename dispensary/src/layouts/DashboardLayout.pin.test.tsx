import { configureStore } from '@reduxjs/toolkit';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import { LAST_ACTIVITY_KEY } from '@/hooks/useIdleLock';
import DashboardLayout from '@/layouts/DashboardLayout';
import { COUNTER_STORAGE_KEY } from '@/libs/constants/counters.const';
import { ROUTES } from '@/libs/constants/routes.const';
import { authReducer, notificationsReducer } from '@/store';

    vi.mock('@/services/auth', async () => {
  const axios = await import('@/services/axios');
  return {
    setPin: vi.fn(),
    unlockPin: vi.fn(),
    loginWithPassword: vi.fn(),
    changePassword: vi.fn(),
    ApiError: axios.ApiError,
    isApiError: axios.isApiError,
  };
});

vi.mock('@/services/notifications', async () => {
  const axios = await import('@/services/axios');
  return {
    fetchInbox: vi.fn().mockResolvedValue({
      items: [],
      unreadCount: 0,
      page: 0,
      size: 8,
      totalPages: 0,
      totalItems: 0,
    }),
    fetchUnreadCount: vi.fn().mockResolvedValue(0),
    markNotificationRead: vi.fn(),
    openNotification: vi.fn(),
    ApiError: axios.ApiError,
    isApiError: axios.isApiError,
  };
});

import { unlockPin } from '@/services/auth';

const unlockMock = vi.mocked(unlockPin);

function renderShell(pinSet: boolean) {
  const store = configureStore({
    reducer: { auth: authReducer, notifications: notificationsReducer },
    preloadedState: {
      auth: {
        user: {
          userId: 'user-1',
          displayName: 'Chemist',
          role: 'pharmacy_owner',
          tenantId: 'tenant-1',
          pinSet,
        },
      },
      notifications: {
        items: [],
        unreadCount: 0,
        page: 0,
        size: 8,
        totalPages: 0,
        totalItems: 0,
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
                <Route path={ROUTES.DASHBOARD} element={<div>Counter overview</div>} />
              </Route>
              <Route path={ROUTES.LOGIN} element={<div>Pharmacy sign in</div>} />
            </Routes>
          </MemoryRouter>
        </TooltipProvider>
      </Provider>,
    ),
  };
}

describe('dispensary idle PIN lock', () => {
  afterEach(() => {
    vi.useRealTimers();
    sessionStorage.removeItem(LAST_ACTIVITY_KEY);
  });

  it('empty: chemist without a PIN must enroll before using the till', () => {
    renderShell(false);
    expect(screen.getByRole('dialog', { name: 'Set a counter PIN' })).toBeInTheDocument();
    expect(screen.getByText('Counter overview')).toBeInTheDocument();
  });

  it('locks after five minutes of inactivity without signing out', () => {
    vi.useFakeTimers();
    const { store } = renderShell(true);
    expect(screen.queryByRole('dialog', { name: 'Counter locked' })).not.toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(5 * 60 * 1000);
    });
    expect(screen.getByRole('dialog', { name: 'Counter locked' })).toBeInTheDocument();
    expect(store.getState().auth.user?.displayName).toBe('Chemist');
  });

  it('signs the chemist out after fifty-five minutes of inactivity', () => {
    vi.useFakeTimers();
    const { store } = renderShell(true);
    act(() => {
      vi.advanceTimersByTime(55 * 60 * 1000);
    });
    expect(screen.queryByRole('dialog', { name: 'Counter locked' })).not.toBeInTheDocument();
    expect(screen.getByText('Pharmacy sign in')).toBeInTheDocument();
    expect(store.getState().auth.user).toBeNull();
  });

  it('restores the same counter after a successful PIN', async () => {
    const user = userEvent.setup();
    localStorage.setItem(COUNTER_STORAGE_KEY, 'annex');
    sessionStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now() - 6 * 60 * 1000));
    unlockMock.mockResolvedValue({
      userId: 'user-1',
      displayName: 'Chemist',
      role: 'pharmacy_owner',
      tenantId: 'tenant-1',
      pinSet: true,
    });
    const { store } = renderShell(true);
    expect(screen.getByRole('dialog', { name: 'Counter locked' })).toBeInTheDocument();
    await user.type(screen.getByLabelText('Counter PIN'), '123456');
    await user.click(screen.getByRole('button', { name: 'Unlock this counter' }));
    expect(screen.queryByRole('dialog', { name: 'Counter locked' })).not.toBeInTheDocument();
    expect(store.getState().auth.user).not.toBeNull();
    expect(localStorage.getItem(COUNTER_STORAGE_KEY)).toBe('annex');
  });
});
