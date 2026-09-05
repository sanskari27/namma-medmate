import { configureStore } from '@reduxjs/toolkit';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TooltipProvider } from '@atoms';
import DashboardLayout from '@/layouts/DashboardLayout';
import { MODULE_NAV_ITEMS, NAV_SECTIONS, ROUTES, STUB_PAGES } from '@/libs/constants/routes.const';
import { authReducer, notificationsReducer } from '@/store';

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

vi.mock('@/services/sessionBranch', () => ({
  switchSessionBranch: vi.fn().mockResolvedValue({
    activeBranchId: 'b2',
    branches: [
      { id: 'b1', name: 'Main outlet', branchCode: 'BR01', status: 'ACTIVE' },
      { id: 'b2', name: 'Annex outlet', branchCode: 'BR02', status: 'ACTIVE' },
    ],
  }),
}));

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

import { switchSessionBranch } from '@/services/sessionBranch';

const switchMock = vi.mocked(switchSessionBranch);

function renderDashboard(
  path = ROUTES.DASHBOARD,
  displayName = 'Chemist',
  tenantStatus: string | null = 'ACTIVE',
) {
  const store = configureStore({
    reducer: { auth: authReducer, notifications: notificationsReducer },
    preloadedState: {
      auth: {
        user: {
          userId: 'user-1',
          displayName,
          role: 'pharmacy_owner',
          tenantId: 'tenant-1',
          pinSet: true,
          tenantStatus,
          emailVerified: true,
          branches: [
            { id: 'b1', name: 'Main outlet', branchCode: 'BR01', status: 'ACTIVE' },
            { id: 'b2', name: 'Annex outlet', branchCode: 'BR02', status: 'ACTIVE' },
          ],
          activeBranchId: null,
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
          <MemoryRouter initialEntries={[path]}>
            <Routes>
              <Route element={<DashboardLayout />}>
                <Route path={ROUTES.DASHBOARD} element={<div>Counter overview</div>} />
                <Route path={ROUTES.SALES} element={<div>Sales page</div>} />
                <Route path={ROUTES.DISTRIBUTORS} element={<div>Distributors page</div>} />
                {STUB_PAGES.map((page) => (
                  <Route key={page.path} path={page.path} element={<div>{page.title} page</div>} />
                ))}
                <Route path={ROUTES.LOGIN} element={<div>Pharmacy sign in</div>} />
              </Route>
            </Routes>
          </MemoryRouter>
        </TooltipProvider>
      </Provider>,
    ),
  };
}

describe('dispensary counter rail', () => {
  beforeEach(() => {
    switchMock.mockClear();
  });

  it('shows a KYC lock banner when the pharmacy is still VERIFICATION_REQUIRED', () => {
    renderDashboard(ROUTES.DASHBOARD, 'Chemist', 'VERIFICATION_REQUIRED');
    expect(screen.getByRole('status')).toHaveTextContent(
      'This pharmacy is locked until KYC finishes',
    );
    expect(screen.getByRole('link', { name: /open pharmacy account \/ kyc/i })).toHaveAttribute(
      'href',
      ROUTES.ACCOUNT,
    );
  });

  it('hides the KYC lock banner for an ACTIVE pharmacy', () => {
    renderDashboard(ROUTES.DASHBOARD, 'Chemist', 'ACTIVE');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows a suspended lock explanation without deleting records', () => {
    renderDashboard(ROUTES.DASHBOARD, 'Chemist', 'SUSPENDED');
    expect(screen.getByRole('status')).toHaveTextContent('This pharmacy counter is suspended');
    expect(screen.getByRole('status')).toHaveTextContent('records are kept');
  });

  it('shows an expired lock explanation', () => {
    renderDashboard(ROUTES.DASHBOARD, 'Chemist', 'EXPIRED');
    expect(screen.getByRole('status')).toHaveTextContent('This pharmacy plan has expired');
  });

  it('shows a terminated lock explanation', () => {
    renderDashboard(ROUTES.DASHBOARD, 'Chemist', 'TERMINATED');
    expect(screen.getByRole('status')).toHaveTextContent('This pharmacy account is closed');
    expect(screen.getByRole('status')).toHaveTextContent('not deleted');
  });

  it('shows the pharmacy name in the rail header', () => {
    renderDashboard();
    const rail = screen.getByRole('complementary', { name: 'Counter rail' });
    expect(within(rail).getByText('MedMate')).toBeInTheDocument();
    expect(within(rail).getByText('This pharmacy')).toBeInTheDocument();
  });

  it('lets the chemist switch outlet from the branch switcher', async () => {
    const user = userEvent.setup();
    const { store } = renderDashboard();

    await user.click(screen.getByRole('button', { name: /this outlet/i }));
    await user.click(screen.getByRole('menuitemradio', { name: /annex outlet/i }));

    expect(switchMock).toHaveBeenCalledWith('b2');
    expect(store.getState().auth.user?.activeBranchId).toBe('b2');
    expect(screen.getByRole('button', { name: /annex outlet/i })).toBeInTheDocument();
  });

  it('lets the owner return to all outlets consolidated view', async () => {
    const user = userEvent.setup();
    switchMock.mockResolvedValueOnce({
      activeBranchId: null,
      branches: [
        { id: 'b1', name: 'Main outlet', branchCode: 'BR01', status: 'ACTIVE' },
        { id: 'b2', name: 'Annex outlet', branchCode: 'BR02', status: 'ACTIVE' },
      ],
    });
    const { store } = renderDashboard();
    store.dispatch({
      type: 'auth/branchSwitched',
      payload: {
        activeBranchId: 'b1',
        branches: store.getState().auth.user?.branches,
      },
    });

    await user.click(screen.getByRole('button', { name: /this outlet/i }));
    await user.click(screen.getByRole('menuitemradio', { name: /all outlets/i }));

    expect(switchMock).toHaveBeenCalledWith(null);
    expect(store.getState().auth.user?.activeBranchId).toBeNull();
  });

  it('shows a failure when the outlet switch is denied', async () => {
    const user = userEvent.setup();
    switchMock.mockRejectedValueOnce(new Error('denied'));
    renderDashboard();

    await user.click(screen.getByRole('button', { name: /this outlet/i }));
    await user.click(screen.getByRole('menuitemradio', { name: /annex outlet/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not switch outlet');
  });

  it('groups floor modules and marks the open one as current', async () => {
    const user = userEvent.setup();
    renderDashboard();
    const nav = screen.getByRole('navigation', { name: 'On this floor' });

    for (const section of NAV_SECTIONS) {
      expect(within(nav).getByRole('button', { name: section.label })).toHaveAttribute(
        'aria-expanded',
        'true',
      );
    }

    for (const item of MODULE_NAV_ITEMS) {
      const name = item.badge ? `${item.label}, ${item.badge.label}` : item.label;
      expect(within(nav).getByRole('link', { name })).toBeInTheDocument();
    }

    expect(within(nav).getByRole('link', { name: 'Dashboard' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(nav).getByRole('link', { name: 'Orders, 1 held bill' })).toBeInTheDocument();
    expect(
      within(nav).getByRole('link', { name: 'Prescriptions, 3 prescriptions waiting' }),
    ).toBeInTheDocument();

    await user.click(within(nav).getByRole('link', { name: 'Sales' }));
    expect(within(nav).getByRole('link', { name: 'Sales' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByText('Sales page')).toBeInTheDocument();
  }, 15_000);

  it('can fold a section closed then open it again', async () => {
    const user = userEvent.setup();
    renderDashboard();
    const nav = screen.getByRole('navigation', { name: 'On this floor' });
    const catalogue = within(nav).getByRole('button', { name: 'Catalogue' });

    await user.click(catalogue);
    expect(catalogue).toHaveAttribute('aria-expanded', 'false');
    expect(within(nav).queryByRole('link', { name: /self-order kiosk/i })).not.toBeInTheDocument();

    await user.click(catalogue);
    expect(catalogue).toHaveAttribute('aria-expanded', 'true');
    expect(within(nav).getByRole('link', { name: /self-order kiosk/i })).toBeInTheDocument();
  });

  it('opens profile management and account settings from the footer dock', async () => {
    const user = userEvent.setup();
    renderDashboard();

    await user.click(screen.getByRole('button', { name: /account for chemist/i }));
    await user.click(screen.getByRole('menuitem', { name: 'Profile' }));
    expect(screen.getByRole('dialog', { name: 'Profile' })).toHaveTextContent('Chemist');

    await user.click(screen.getByRole('button', { name: 'Close' }));
    await user.click(screen.getByRole('button', { name: /account for chemist/i }));
    await user.click(screen.getByRole('menuitem', { name: 'Account settings' }));
    expect(screen.getByText('Settings page')).toBeInTheDocument();
  });

  it('signs the chemist out from the account footer', async () => {
    const user = userEvent.setup();
    const { store } = renderDashboard();

    await user.click(screen.getByRole('button', { name: /account for chemist/i }));
    await user.click(screen.getByRole('menuitem', { name: 'Sign out' }));

    expect(store.getState().auth.user).toBeNull();
  });
});
