import { configureStore } from '@reduxjs/toolkit';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TooltipProvider } from '@atoms';
import DashboardLayout from '@/layouts/DashboardLayout';
import { ROUTES } from '@/libs/constants/routes.const';
import { authReducer, inboxReducer } from '@/store';

const exitImpersonation = vi.fn();

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

vi.mock('@/services/impersonation', () => ({
  exitImpersonation: (...args: unknown[]) => exitImpersonation(...args),
  startImpersonation: vi.fn(),
  fetchSession: vi.fn(),
}));

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

const support = {
  originalUserId: 'm1',
  originalDisplayName: 'Sanskar',
  effectiveUserId: 'o1',
  effectiveDisplayName: 'Varshmaan',
  effectiveRole: 'pharmacy_owner',
  tenantId: 't1',
  tenantName: 'varshmaan-rx',
};

function renderShell(withSupport: boolean) {
  const store = configureStore({
    reducer: { auth: authReducer, inbox: inboxReducer },
    preloadedState: {
      auth: {
        user: {
          userId: withSupport ? 'o1' : 'm1',
          displayName: withSupport ? 'Varshmaan' : 'Sanskar',
          role: withSupport ? 'pharmacy_owner' : 'admin_super',
          tenantId: withSupport ? 't1' : null,
          pinSet: true,
          impersonation: withSupport ? support : null,
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
            </Routes>
          </MemoryRouter>
        </TooltipProvider>
      </Provider>,
    ),
  };
}

describe('HQ support banner', () => {
  beforeEach(() => {
    exitImpersonation.mockReset();
  });

  it('success: banner names tenant, effective user, original MASTER, and exit', () => {
    renderShell(true);
    expect(screen.getByRole('status')).toHaveTextContent('Varshmaan');
    expect(screen.getByRole('status')).toHaveTextContent('varshmaan-rx');
    expect(screen.getByRole('status')).toHaveTextContent('Sanskar');
    expect(screen.getByRole('button', { name: 'Exit support session' })).toBeInTheDocument();
  });

  it('empty: no banner without an active support session', () => {
    renderShell(false);
    expect(screen.queryByRole('button', { name: 'Exit support session' })).not.toBeInTheDocument();
  });

  it('success: exit restores the MASTER session in Redux', async () => {
    const user = userEvent.setup();
    exitImpersonation.mockResolvedValue({
      userId: 'm1',
      displayName: 'Sanskar',
      role: 'admin_super',
      tenantId: null,
      pinSet: true,
      impersonation: null,
    });
    const { store } = renderShell(true);
    await user.click(screen.getByRole('button', { name: 'Exit support session' }));
    await waitFor(() => {
      expect(store.getState().auth.user?.role).toBe('admin_super');
      expect(store.getState().auth.user?.impersonation).toBeNull();
    });
  });
});
