import { configureStore } from '@reduxjs/toolkit';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DashboardScreen from '@/screens/dashboard/DashboardScreen';
import { ApiError } from '@/services/axios';
import { authReducer } from '@/store';
import type { AuthUser } from '@/store';
import type { DashboardView } from '@/services/dashboards';

vi.mock('@/services/dashboards', async () => {
  const axios = await import('@/services/axios');
  return {
    fetchDashboard: vi.fn(),
    ApiError: axios.ApiError,
    isApiError: axios.isApiError,
  };
});

import { fetchDashboard } from '@/services/dashboards';

const fetchMock = vi.mocked(fetchDashboard);

const cashierFilled: DashboardView = {
  role: 'cashier',
  asOf: '2026-09-06',
  generatedAt: '2026-09-06T06:00:00Z',
  scope: 'branch',
  branchId: 'b1',
  branchName: 'Main',
  permittedRoles: ['cashier'],
  cashier: {
    todaySalesPaise: 11200,
    todayBillCount: 1,
    holds: [
      {
        id: 'h1',
        invoiceNumber: 'INV/26-27/BR01/00002',
        totalPaise: 5600,
        heldAt: '2026-09-06T05:00:00Z',
      },
    ],
    sources: { sales: '/pos', holds: '/pos' },
  },
};

const cashierEmpty: DashboardView = {
  ...cashierFilled,
  cashier: {
    todaySalesPaise: 0,
    todayBillCount: 0,
    holds: [],
    sources: { sales: '/pos', holds: '/pos' },
  },
};

const inventoryFilled: DashboardView = {
  role: 'inventory',
  asOf: '2026-09-06',
  generatedAt: '2026-09-06T06:00:00Z',
  scope: 'branch',
  branchId: 'b1',
  branchName: 'Main',
  permittedRoles: ['inventory'],
  inventory: {
    lowStock: [
      {
        productId: 'p1',
        sku: 'PARA-500',
        productName: 'Paracetamol 500',
        onHand: 2,
        reorderLevel: 10,
      },
    ],
    pendingTransfers: [
      { id: 't1', status: 'REQUESTED', direction: 'IN', href: '/inventory' },
    ],
    pendingGrn: [
      {
        id: 'g1',
        receiptNumber: 'GRN-1',
        status: 'PENDING_QC',
        href: '/purchases',
      },
    ],
    sources: { stock: '/inventory', transfers: '/inventory', grn: '/purchases' },
  },
};

const accountantFilled: DashboardView = {
  role: 'accountant',
  asOf: '2026-09-06',
  generatedAt: '2026-09-06T06:00:00Z',
  scope: 'branch',
  branchId: 'b1',
  branchName: 'Main',
  permittedRoles: ['accountant'],
  accountant: {
    receivablesTotalPaise: 12000,
    payablesTotalPaise: 8000,
    expenseTotalPaise: 150000,
    receivableBuckets: [{ key: 'D0_30', label: '0–30', totalPaise: 12000 }],
    sources: { aging: '/aging', expenses: '/expenses' },
  },
};

const ownerFilled: DashboardView = {
  role: 'owner',
  asOf: '2026-09-06',
  generatedAt: '2026-09-06T06:00:00Z',
  scope: 'branch',
  branchId: 'b1',
  branchName: 'Main',
  permittedRoles: ['owner', 'cashier', 'inventory', 'accountant'],
  owner: {
    todaySalesPaise: 11200,
    todayBillCount: 1,
    branches: [
      { id: 'b1', name: 'Main', todaySalesPaise: 11200 },
      { id: 'b2', name: 'Annex', todaySalesPaise: 0 },
    ],
    receivablesTotalPaise: 12000,
    payablesTotalPaise: 8000,
    expenseTotalPaise: 150000,
    lowStockCount: 1,
    sources: {
      sales: '/pos',
      stock: '/inventory',
      aging: '/aging',
      expenses: '/expenses',
    },
  },
};

const ownerEmpty: DashboardView = {
  ...ownerFilled,
  owner: {
    todaySalesPaise: 0,
    todayBillCount: 0,
    branches: [{ id: 'b1', name: 'Main', todaySalesPaise: 0 }],
    receivablesTotalPaise: 0,
    payablesTotalPaise: 0,
    expenseTotalPaise: 0,
    lowStockCount: 0,
    sources: ownerFilled.owner!.sources,
  },
};

const multiStaff: DashboardView = {
  ...cashierFilled,
  permittedRoles: ['cashier', 'inventory'],
};

function userFor(
  role: string,
  modules: string[],
  extras: Partial<AuthUser> = {},
): AuthUser {
  return {
    userId: 'u1',
    displayName: 'Floor',
    role,
    tenantId: 't1',
    pinSet: true,
    tenantStatus: 'ACTIVE',
    emailVerified: true,
    modules,
    branches: [{ id: 'b1', name: 'Main', branchCode: 'BR01', status: 'ACTIVE' }],
    activeBranchId: 'b1',
    ...extras,
  };
}

function renderPage(user: AuthUser) {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: { auth: { user } },
  });
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <DashboardScreen />
      </MemoryRouter>
    </Provider>,
  );
}

describe('DashboardScreen', () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it('loading: waits for this outlet desk', () => {
    fetchMock.mockReturnValue(new Promise(() => undefined));
    renderPage(userFor('pharmacy_staff', ['SALES']));
    expect(screen.getByRole('status')).toHaveTextContent("Loading this outlet's desk…");
    expect(screen.getByRole('heading', { name: 'Till today' })).toBeInTheDocument();
  });

  it('empty: no completed bills today', async () => {
    fetchMock.mockResolvedValue(cashierEmpty);
    renderPage(userFor('pharmacy_staff', ['SALES']));
    expect(
      await screen.findByText(
        'No completed bills today. Held bills stay on this till until collected.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText('Patients owe us')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Khata and spend' })).not.toBeInTheDocument();
  });

  it('validation: no active outlet', async () => {
    fetchMock.mockRejectedValue(
      new ApiError('Select an outlet first.', 422, 'NO_ACTIVE_BRANCH'),
    );
    renderPage(userFor('pharmacy_staff', ['SALES'], { activeBranchId: null }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Select an outlet before opening this desk.',
    );
  });

  it('denied: floor role without a desk', () => {
    renderPage(userFor('pharmacy_staff', ['COMPLIANCE']));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'This desk is not on your floor roles. Ask the owner.',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('conflict: figures changed on another till', async () => {
    const user = userEvent.setup();
    fetchMock
      .mockResolvedValueOnce(cashierFilled)
      .mockRejectedValueOnce(new ApiError('stale', 409, 'STALE_STATE'));
    renderPage(userFor('pharmacy_staff', ['SALES']));
    expect(await screen.findByRole('status')).toHaveTextContent("Today's till at this outlet.");
    await user.click(screen.getByRole('button', { name: 'Refresh this desk' }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'These figures changed on another till. Refresh, then look again.',
    );
    expect(screen.getByRole('button', { name: 'Refresh this desk' })).toHaveFocus();
  });

  it('failure: desk network error', async () => {
    fetchMock.mockRejectedValue(new Error('network'));
    renderPage(userFor('pharmacy_staff', ['SALES']));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Could not load this desk. Check the connection and try again.',
    );
  });

  it('success: cashier till and holds, never khata or spend', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(cashierFilled);
    renderPage(userFor('pharmacy_staff', ['SALES']));
    expect(await screen.findByRole('status')).toHaveTextContent("Today's till at this outlet.");
    expect(screen.getByRole('heading', { name: 'Till today' })).toBeInTheDocument();
    expect(screen.getByText('₹112.00')).toBeInTheDocument();
    expect(screen.getByText('INV/26-27/BR01/00002')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open till' })).toHaveAttribute('href', '/pos');
    expect(screen.queryByText('Patients owe us')).not.toBeInTheDocument();
    expect(screen.queryByText('Paracetamol 500')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Outlet')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Stock desk' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Refresh this desk' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(screen.getByRole('button', { name: 'Refresh this desk' })).toHaveFocus();
  });

  it('inventory: low stock, transfers, deliveries, and source links', async () => {
    fetchMock.mockResolvedValue(inventoryFilled);
    renderPage(userFor('pharmacy_staff', ['INVENTORY']));
    expect(await screen.findByRole('heading', { name: 'Stock desk' })).toBeInTheDocument();
    expect(screen.getByText('Paracetamol 500')).toBeInTheDocument();
    expect(screen.getByText('REQUESTED')).toBeInTheDocument();
    expect(screen.getByText('GRN-1')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Stock book' })).toHaveAttribute('href', '/inventory');
    expect(screen.getByRole('link', { name: 'Deliveries' })).toHaveAttribute('href', '/purchases');
    expect(screen.queryByText('Patients owe us')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Open till' })).not.toBeInTheDocument();
  });

  it('accountant: khata, stockist dues, and spend — no till or licences', async () => {
    fetchMock.mockResolvedValue(accountantFilled);
    renderPage(
      userFor('pharmacy_staff', ['FINANCE'], {
        roles: [{ id: 'r1', name: 'Accountant', code: 'accountant', kind: 'PREDEFINED' }],
      }),
    );
    expect(await screen.findByRole('heading', { name: 'Khata and spend' })).toBeInTheDocument();
    expect(screen.getByText('Patients owe us')).toBeInTheDocument();
    expect(screen.getByText('We owe stockists')).toBeInTheDocument();
    expect(screen.getByText('Shop spend')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Khata dues' })).toHaveAttribute('href', '/aging');
    expect(screen.getByRole('link', { name: 'Shop spend' })).toHaveAttribute('href', '/expenses');
    expect(screen.queryByRole('link', { name: 'Open till' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /licen/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Outlet')).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('accountant', {});
  });

  it('owner: shop glance, outlet filter, and drill-down', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(ownerFilled).mockResolvedValue({
      ...ownerFilled,
      scope: 'tenant',
      branchId: null,
      branchName: null,
      owner: {
        ...ownerFilled.owner!,
        todaySalesPaise: 25000,
        branches: [
          { id: 'b1', name: 'Main', todaySalesPaise: 11200 },
          { id: 'b2', name: 'Annex', todaySalesPaise: 13800 },
        ],
      },
    });
    renderPage(userFor('pharmacy_owner', ['SALES', 'INVENTORY', 'FINANCE']));
    expect(await screen.findByRole('heading', { name: 'Shop glance' })).toBeInTheDocument();
    expect(screen.getByText('Main')).toBeInTheDocument();
    expect(screen.getByText('Annex')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open till' })).toHaveAttribute('href', '/pos');
    expect(screen.getByRole('link', { name: 'Stock book' })).toHaveAttribute('href', '/inventory');
    expect(screen.getByRole('link', { name: 'Khata dues' })).toHaveAttribute('href', '/aging');
    expect(screen.getByRole('link', { name: 'Shop spend' })).toHaveAttribute('href', '/expenses');
    await user.selectOptions(screen.getByLabelText('Outlet'), 'tenant');
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith('owner', { scope: 'tenant' }),
    );
  });

  it('multi-desk switch does not duplicate widgets', async () => {
    const user = userEvent.setup();
    fetchMock.mockImplementation(async (role) => {
      if (role === 'owner') {
        return ownerFilled;
      }
      if (role === 'cashier') {
        return { ...cashierFilled, permittedRoles: ownerFilled.permittedRoles };
      }
      if (role === 'inventory') {
        return { ...inventoryFilled, permittedRoles: ownerFilled.permittedRoles };
      }
      return { ...accountantFilled, permittedRoles: ownerFilled.permittedRoles };
    });
    renderPage(userFor('pharmacy_owner', ['SALES', 'INVENTORY', 'FINANCE']));
    expect(await screen.findByRole('heading', { name: 'Shop glance' })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { name: 'Shop glance' })).toHaveLength(1);
    expect(screen.queryByRole('heading', { name: 'Till today' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Till today' }));
    expect(await screen.findByRole('heading', { name: 'Till today' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Shop glance' })).not.toBeInTheDocument();
    expect(screen.queryByText('Patients owe us')).not.toBeInTheDocument();
    expect(screen.getAllByRole('heading', { name: 'Till today' })).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Stock desk' }));
    expect(await screen.findByText('Paracetamol 500')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Till today' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Khata and spend' }));
    expect(await screen.findByText('Patients owe us')).toBeInTheDocument();
    expect(screen.queryByText('Paracetamol 500')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Open till' })).not.toBeInTheDocument();
  });

  it('staff with two desks can switch till and stock', async () => {
    const user = userEvent.setup();
    fetchMock.mockImplementation(async (role) => {
      if (role === 'inventory') {
        return { ...inventoryFilled, permittedRoles: ['cashier', 'inventory'] };
      }
      return multiStaff;
    });
    renderPage(userFor('pharmacy_staff', ['SALES', 'INVENTORY']));
    expect(await screen.findByRole('heading', { name: 'Till today' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('cashier', {});
    await user.click(screen.getByRole('button', { name: 'Stock desk' }));
    expect(await screen.findByRole('heading', { name: 'Stock desk' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Till today' })).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('inventory', {});
  });

  it('owner empty glance keeps reserved copy', async () => {
    fetchMock.mockResolvedValue(ownerEmpty);
    renderPage(userFor('pharmacy_owner', ['SALES', 'INVENTORY', 'FINANCE']));
    expect(
      await screen.findByText('No sales, stock alerts, or books to glance at for this view.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Shop glance' })).toBeInTheDocument();
  });
});
