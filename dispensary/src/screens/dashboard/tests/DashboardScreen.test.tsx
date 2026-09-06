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
import type { DashboardView, DashboardWidget } from '@/services/dashboards';

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
const AS_OF = '2026-09-06T06:00:00Z';

function okWidget<T>(key: string, href: string, data: T): DashboardWidget<T> {
  return { key, status: 'OK', asOf: AS_OF, href, error: null, data };
}

function failedWidget<T>(key: string, href: string): DashboardWidget<T> {
  return { key, status: 'FAILED', asOf: AS_OF, href, error: 'UNAVAILABLE', data: null };
}

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
  generatedAt: AS_OF,
  scope: 'branch',
  branchId: 'b1',
  branchName: 'Main',
  permittedRoles: ['owner', 'cashier', 'inventory', 'accountant'],
  owner: {
    asOf: AS_OF,
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
    sales: okWidget('SALES', '/pos', {
      todaySalesPaise: 11200,
      todayBillCount: 1,
      branches: [
        { id: 'b1', name: 'Main', todaySalesPaise: 11200 },
        { id: 'b2', name: 'Annex', todaySalesPaise: 0 },
      ],
    }),
    lowStock: okWidget('LOW_STOCK', '/inventory', {
      count: 1,
      items: [
        {
          productId: 'p1',
          sku: 'OWN-1',
          productName: 'Glance Pack',
          onHand: 9,
          reorderLevel: 50,
          branchId: 'b1',
          branchName: 'Main',
        },
      ],
    }),
    expiry: okWidget('EXPIRY', '/inventory', {
      count: 1,
      items: [
        {
          productId: 'p1',
          sku: 'OWN-1',
          productName: 'Glance Pack',
          batchNumber: 'LOT-OWN-1',
          expiresOn: '2026-09-13',
          quantity: 9,
          branchId: 'b1',
          branchName: 'Main',
        },
      ],
    }),
    approvals: okWidget('APPROVALS', '/approvals/pending', {
      count: 1,
      items: [{ id: 'a1', label: 'INVENTORY_WRITE_OFF', status: 'PENDING', href: '/approvals/pending' }],
    }),
    receivables: okWidget('RECEIVABLES', '/aging', {
      totalPaise: 12000,
      buckets: [{ key: 'D0_30', label: '0–30', totalPaise: 12000 }],
    }),
    payables: okWidget('PAYABLES', '/aging', {
      totalPaise: 8000,
      buckets: [{ key: 'D0_30', label: '0–30', totalPaise: 8000 }],
    }),
    topProducts: okWidget('TOP_PRODUCTS', '/pos', {
      count: 1,
      items: [
        {
          productId: 'p1',
          sku: 'OWN-1',
          productName: 'Glance Pack',
          quantity: 1,
          salesPaise: 11200,
        },
      ],
    }),
    transfers: okWidget('TRANSFERS', '/inventory', {
      count: 1,
      items: [{ id: 't1', status: 'IN_TRANSIT', direction: 'PUSH', href: '/inventory' }],
    }),
    compliance: okWidget('COMPLIANCE', '/licenses', {
      tenantStatus: 'ACTIVE',
      kycStatus: 'SUBMITTED',
      licenseDueCount: 1,
      licenses: [
        {
          id: 'l1',
          docType: 'DRUG_LICENSE',
          expiresOn: '2026-09-16',
          branchId: 'b1',
          href: '/licenses',
        },
      ],
    }),
    openPurchaseOrders: okWidget('OPEN_POS', '/purchases', {
      count: 1,
      items: [{ id: 'po1', label: 'PO/OWN/1', status: 'ISSUED', href: '/purchases' }],
    }),
  },
};

const ownerEmpty: DashboardView = {
  ...ownerFilled,
  owner: {
    ...ownerFilled.owner!,
    todaySalesPaise: 0,
    todayBillCount: 0,
    branches: [{ id: 'b1', name: 'Main', todaySalesPaise: 0 }],
    receivablesTotalPaise: 0,
    payablesTotalPaise: 0,
    expenseTotalPaise: 0,
    lowStockCount: 0,
    sales: okWidget('SALES', '/pos', {
      todaySalesPaise: 0,
      todayBillCount: 0,
      branches: [{ id: 'b1', name: 'Main', todaySalesPaise: 0 }],
    }),
    lowStock: okWidget('LOW_STOCK', '/inventory', { count: 0, items: [] }),
    expiry: okWidget('EXPIRY', '/inventory', { count: 0, items: [] }),
    approvals: okWidget('APPROVALS', '/approvals/pending', { count: 0, items: [] }),
    receivables: okWidget('RECEIVABLES', '/aging', { totalPaise: 0, buckets: [] }),
    payables: okWidget('PAYABLES', '/aging', { totalPaise: 0, buckets: [] }),
    topProducts: okWidget('TOP_PRODUCTS', '/pos', { count: 0, items: [] }),
    transfers: okWidget('TRANSFERS', '/inventory', { count: 0, items: [] }),
    compliance: okWidget('COMPLIANCE', '/licenses', {
      tenantStatus: 'ACTIVE',
      kycStatus: 'NONE',
      licenseDueCount: 0,
      licenses: [],
    }),
    openPurchaseOrders: okWidget('OPEN_POS', '/purchases', { count: 0, items: [] }),
  },
};

const ownerPartial: DashboardView = {
  ...ownerFilled,
  owner: {
    ...ownerFilled.owner!,
    compliance: failedWidget('COMPLIANCE', '/licenses'),
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
    expect(screen.getAllByText('Main').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Annex').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: 'Open till' })).toHaveAttribute('href', '/pos');
    expect(screen.getByRole('link', { name: 'Stock book' })).toHaveAttribute('href', '/inventory');
    expect(screen.getByRole('link', { name: 'Khata dues' })).toHaveAttribute('href', '/aging');
    expect(screen.getByRole('link', { name: 'Shop spend' })).toHaveAttribute('href', '/expenses');
    expect(screen.getByRole('link', { name: 'Waiting sign-off' })).toHaveAttribute(
      'href',
      '/approvals/pending',
    );
    expect(screen.getByRole('link', { name: 'Licences' })).toHaveAttribute('href', '/licenses');
    expect(screen.getByRole('link', { name: 'Outlet orders' })).toHaveAttribute('href', '/purchases');
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
      await screen.findByText('No sales, stock alerts, licences, or books for this view.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Shop glance' })).toBeInTheDocument();
  });

  it('owner: widgets cover till, stock, expiry, sign-off, books, movers, transfers, licences, and orders', async () => {
    fetchMock.mockResolvedValue(ownerFilled);
    renderPage(userFor('pharmacy_owner', ['SALES', 'INVENTORY', 'FINANCE']));
    expect(await screen.findByRole('heading', { name: 'Collected today' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Short on this outlet' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Near expiry' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Waiting sign-off' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Khata' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Stockist dues' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Top movers today' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Waiting transfers' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Licences and KYC' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Open orders' })).toBeInTheDocument();
    expect(screen.getAllByText('Glance Pack').length).toBeGreaterThan(0);
    expect(screen.getByText('INVENTORY_WRITE_OFF')).toBeInTheDocument();
    expect(screen.getByText('PO/OWN/1')).toBeInTheDocument();
    expect(screen.getByText('SUBMITTED')).toBeInTheDocument();
    expect(screen.getByText('IN_TRANSIT')).toBeInTheDocument();
  });

  it('owner: every strip shares the IST as-of stamp', async () => {
    fetchMock.mockResolvedValue(ownerFilled);
    renderPage(userFor('pharmacy_owner', ['SALES', 'INVENTORY', 'FINANCE']));
    expect(await screen.findByRole('heading', { name: 'Collected today' })).toBeInTheDocument();
    expect(screen.getAllByText(/As of /).length).toBeGreaterThanOrEqual(10);
  });

  it('owner: partial licence failure keeps till figures and labels the dead strip', async () => {
    fetchMock.mockResolvedValue(ownerPartial);
    renderPage(userFor('pharmacy_owner', ['SALES', 'INVENTORY', 'FINANCE']));
    expect(await screen.findByRole('heading', { name: 'Collected today' })).toBeInTheDocument();
    expect(screen.getAllByText('₹112.00').length).toBeGreaterThan(0);
    expect(screen.getByText('Could not load this strip.')).toBeInTheDocument();
    expect(screen.queryByText('SUBMITTED')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Licences and KYC' })).toBeInTheDocument();
  });
});
