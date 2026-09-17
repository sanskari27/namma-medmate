import { configureStore } from '@reduxjs/toolkit';
import { act, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TooltipProvider } from '@atoms';
import { LAST_ACTIVITY_KEY } from '@/hooks/useIdleLock';
import DashboardLayout from '@/layouts/DashboardLayout';
import { ROUTES } from '@/libs/constants/routes.const';
import { authReducer, inboxReducer } from '@/store';

vi.mock('@/services/auth', async () => {
  const axios = await import('@/services/axios');
  return {
    logoutSession: vi.fn().mockResolvedValue(undefined),
    setPin: vi.fn(),
    unlockPin: vi.fn(),
    loginWithPassword: vi.fn(),
    ApiError: axios.ApiError,
    isApiError: axios.isApiError,
  };
});

vi.mock('@/services/inbox', async () => {
  const axios = await import('@/services/axios');
  return {
    listHqInbox: vi.fn().mockResolvedValue({
      items: [],
      unreadCount: 0,
      page: 0,
      size: 6,
      totalPages: 0,
      totalItems: 0,
    }),
    countHqUnread: vi.fn().mockResolvedValue(0),
    fileHqInboxItem: vi.fn(),
    openHqInboxItem: vi.fn(),
    ApiError: axios.ApiError,
    isApiError: axios.isApiError,
  };
});

vi.mock('@/services/impersonation', () => ({
  exitImpersonation: vi.fn(),
  startImpersonation: vi.fn(),
  fetchSession: vi.fn(),
}));

const support = {
  originalUserId: 'm1',
  originalDisplayName: 'Sanskar',
  effectiveUserId: 'o1',
  effectiveDisplayName: 'Varshmaan',
  effectiveRole: 'pharmacy_owner',
  tenantId: 't1',
  tenantName: 'varshmaan-rx',
};

function renderShell(pinSet: boolean, impersonation: typeof support | null = null) {
  const store = configureStore({
    reducer: { auth: authReducer, inbox: inboxReducer },
    preloadedState: {
      auth: {
        user: {
          userId: 'm1',
          displayName: 'Sanskar',
          role: 'admin_super',
          tenantId: null,
          pinSet,
          impersonation,
        },
      },
      inbox: {
        rows: [],
        unread: 0,
        page: 0,
        pageSize: 6,
        pageCount: 0,
        rowCount: 0,
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
    sessionStorage.removeItem(LAST_ACTIVITY_KEY);
  });

  it('empty: operator without a PIN must enroll before HQ work', () => {
    renderShell(false);
    expect(screen.getByRole('dialog', { name: 'Set HQ PIN' })).toBeInTheDocument();
    expect(screen.getByText('Tenant pulse')).toBeInTheDocument();
  });

  it('locks HQ after five minutes of inactivity without signing out', () => {
    vi.useFakeTimers();
    const { store } = renderShell(true);
    expect(screen.queryByRole('dialog', { name: 'HQ session locked' })).not.toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(5 * 60 * 1000);
    });
    expect(screen.getByRole('dialog', { name: 'HQ session locked' })).toBeInTheDocument();
    expect(screen.getByText('Tenant pulse')).toBeInTheDocument();
    expect(store.getState().auth.user).not.toBeNull();
  });

  it('locks HQ after five minutes of inactivity during a support session', () => {
    vi.useFakeTimers();
    const { store } = renderShell(true, support);
    expect(screen.getByRole('status')).toHaveTextContent('Support session');
    expect(screen.queryByRole('dialog', { name: 'HQ session locked' })).not.toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(5 * 60 * 1000);
    });
    expect(screen.getByRole('dialog', { name: 'HQ session locked' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Varshmaan');
    expect(screen.getByText('Tenant pulse')).toBeInTheDocument();
    expect(store.getState().auth.user?.impersonation).toEqual(support);
  });

  it('abandoned: four hours after lock returns to HQ sign-in', () => {
    vi.useFakeTimers();
    const { store } = renderShell(true);
    act(() => {
      vi.advanceTimersByTime(5 * 60 * 1000);
    });
    expect(screen.getByRole('dialog', { name: 'HQ session locked' })).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(4 * 60 * 60 * 1000);
    });
    expect(screen.getByText('HQ sign in')).toBeInTheDocument();
    expect(store.getState().auth.user).toBeNull();
    expect(sessionStorage.getItem('nmm.admin.sessionEndReason')).toBe('abandoned');
  });
});
