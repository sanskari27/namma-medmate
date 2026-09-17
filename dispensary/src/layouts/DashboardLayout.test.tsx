import { configureStore } from '@reduxjs/toolkit';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TooltipProvider } from '@atoms';
import DashboardLayout from '@/layouts/DashboardLayout';
import { MODULE_NAV_ITEMS, NAV_SECTIONS, ROUTES } from '@/libs/constants/routes.const';
import { authReducer, kioskReducer, notificationsReducer } from '@/store';
import { initialKioskScreenState } from '@/screens/kiosk/store';
import { initialPosState, posReducer } from '@/screens/pos/store/pos.slice';

const SESSION_BRANCHES = [
  { id: 'b1', name: 'Main outlet', branchCode: 'BR01', status: 'ACTIVE' },
  { id: 'b2', name: 'Annex outlet', branchCode: 'BR02', status: 'ACTIVE' },
];

function sessionUser(tenantStatus: string | null = 'ACTIVE') {
  return {
    userId: 'user-1',
    displayName: 'Chemist',
    role: 'pharmacy_owner' as const,
    tenantId: 'tenant-1',
    pinSet: true,
    tenantStatus,
    emailVerified: true,
    branches: SESSION_BRANCHES,
    activeBranchId: null as string | null,
  };
}

vi.mock('@/services/auth', async () => {
  const axios = await import('@/services/axios');
  return {
    logoutSession: vi.fn().mockResolvedValue(undefined),
    fetchSession: vi.fn().mockResolvedValue({
      userId: 'user-1',
      displayName: 'Chemist',
      role: 'pharmacy_owner',
      tenantId: 'tenant-1',
      pinSet: true,
      tenantStatus: 'ACTIVE',
      emailVerified: true,
      branches: [
        { id: 'b1', name: 'Main outlet', branchCode: 'BR01', status: 'ACTIVE' },
        { id: 'b2', name: 'Annex outlet', branchCode: 'BR02', status: 'ACTIVE' },
      ],
      activeBranchId: null,
    }),
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

import { fetchSession } from '@/services/auth';
import { switchSessionBranch } from '@/services/sessionBranch';

const switchMock = vi.mocked(switchSessionBranch);
const fetchMock = vi.mocked(fetchSession);

function renderDashboard(
  path = ROUTES.DASHBOARD,
  displayName = 'Chemist',
  tenantStatus: string | null = 'ACTIVE',
) {
  fetchMock.mockResolvedValue(sessionUser(tenantStatus));
  const store = configureStore({
    reducer: {
      auth: authReducer,
      notifications: notificationsReducer,
      kiosk: kioskReducer,
      pos: posReducer,
    },
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
          branches: SESSION_BRANCHES,
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
      kiosk: initialKioskScreenState,
      pos: {
        ...initialPosState,
        prescriptionReference: 'RX-OPEN',
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
                <Route path={ROUTES.ACCOUNT} element={<div>Account page</div>} />
                <Route path={ROUTES.SUBSCRIPTION} element={<div>Subscription page</div>} />
                <Route path={ROUTES.DISTRIBUTORS} element={<div>Distributors page</div>} />
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
    switchMock.mockReset();
    switchMock.mockResolvedValue({
      activeBranchId: 'b2',
      branches: SESSION_BRANCHES,
    });
    fetchMock.mockResolvedValue(sessionUser('ACTIVE'));
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

  it('lets the chemist switch outlet from the collapsed MapPin', async () => {
    const user = userEvent.setup();
    const { store } = renderDashboard();

    await user.click(screen.getByRole('button', { name: 'Collapse module rail' }));
    await user.click(screen.getByRole('button', { name: /this outlet/i }));
    await user.click(screen.getByRole('menuitemradio', { name: /annex outlet/i }));

    expect(switchMock).toHaveBeenCalledWith('b2');
    expect(store.getState().auth.user?.activeBranchId).toBe('b2');
  });

  it('remounts the open screen after an outlet switch', async () => {
    const user = userEvent.setup();
    renderDashboard();
    expect(screen.getByText('Counter overview')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /this outlet/i }));
    await user.click(screen.getByRole('menuitemradio', { name: /annex outlet/i }));

    expect(await screen.findByText('Counter overview')).toBeInTheDocument();
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
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    store.dispatch({
      type: 'auth/branchSwitched',
      payload: {
        activeBranchId: 'b1',
        branches: SESSION_BRANCHES,
      },
    });
    expect(store.getState().auth.user?.activeBranchId).toBe('b1');

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
    expect(within(nav).getByRole('link', { name: 'Prescriptions' })).toBeInTheDocument();

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
    expect(screen.getByText('Account page')).toBeInTheDocument();
  });

  it('signs the chemist out from the account footer', async () => {
    const user = userEvent.setup();
    const { store } = renderDashboard();

    await user.click(screen.getByRole('button', { name: /account for chemist/i }));
    await user.click(screen.getByRole('menuitem', { name: 'Sign out' }));

    expect(store.getState().auth.user).toBeNull();
  });

  it('refreshes tenant lock from the session when the counter is focused', async () => {
    renderDashboard(ROUTES.DASHBOARD, 'Chemist', 'ACTIVE');
    fetchMock.mockResolvedValue(sessionUser('SUSPENDED'));
    window.dispatchEvent(new Event('focus'));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('This pharmacy counter is suspended'),
    );
  });

  it('header + New sale clears the till draft and opens Sales', async () => {
    const user = userEvent.setup();
    const { store } = renderDashboard(ROUTES.DASHBOARD);
    expect(store.getState().pos.prescriptionReference).toBe('RX-OPEN');
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '+ New sale' }));
    expect(store.getState().pos.prescriptionReference).toBe('');
    expect(screen.getByText('Sales page')).toBeInTheDocument();
  });

  it('KYC lock hides floor modules and opens Account', () => {
    renderDashboard(ROUTES.DASHBOARD, 'Chemist', 'VERIFICATION_REQUIRED');
    const nav = screen.getByRole('navigation', { name: 'On this floor' });
    expect(within(nav).getByRole('link', { name: 'Account' })).toBeInTheDocument();
    expect(within(nav).queryByRole('link', { name: 'Sales' })).not.toBeInTheDocument();
    expect(within(nav).queryByRole('link', { name: 'Dashboard' })).not.toBeInTheDocument();
    expect(screen.getByText('Account page')).toBeInTheDocument();
  });

  it('expired lock keeps Account and Subscription only', () => {
    renderDashboard(ROUTES.DASHBOARD, 'Chemist', 'EXPIRED');
    const nav = screen.getByRole('navigation', { name: 'On this floor' });
    expect(within(nav).getByRole('link', { name: 'Account' })).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: 'Subscription' })).toBeInTheDocument();
    expect(within(nav).queryByRole('link', { name: 'Sales' })).not.toBeInTheDocument();
  });
});
