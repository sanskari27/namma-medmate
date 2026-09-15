import { configureStore } from '@reduxjs/toolkit';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PharmaciesScreen from '@/screens/pharmacies/PharmaciesScreen';
import { ApiError } from '@/services/axios';
import { authReducer, type ImpersonationState } from '@/store';
import type { AdminTenant } from '@/services/tenants';

vi.mock('@/services/tenants', () => ({
  listTenants: vi.fn(),
  updateTenantStatus: vi.fn(),
  listTenantBranches: vi.fn(),
}));

import { listTenantBranches, listTenants, updateTenantStatus } from '@/services/tenants';

const listMock = vi.mocked(listTenants);
const updateMock = vi.mocked(updateTenantStatus);
const branchesMock = vi.mocked(listTenantBranches);

const active: AdminTenant = {
  id: 't1',
  name: 'Varshmaan Pharmacy',
  slug: 'varshmaan',
  status: 'ACTIVE',
  updatedAt: '2026-09-03T00:00:00Z',
  allowedTransitions: ['SUSPENDED', 'EXPIRED', 'TERMINATED'],
};

const support: ImpersonationState = {
  originalUserId: 'm1',
  originalDisplayName: 'Sanskar',
  effectiveUserId: 'o1',
  effectiveDisplayName: 'Varshmaan',
  effectiveRole: 'pharmacy_owner',
  tenantId: 't1',
  tenantName: 'varshmaan',
};

function renderPage(role: string, impersonation: ImpersonationState | null = null) {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        user: {
          userId: impersonation ? impersonation.originalUserId : 'm1',
          displayName: impersonation ? impersonation.originalDisplayName : 'Sanskar',
          role,
          tenantId: null,
          pinSet: true,
          impersonation,
        },
      },
    },
  });
  return render(
    <Provider store={store}>
      <PharmaciesScreen />
    </Provider>,
  );
}

describe('pharmacies lifecycle', () => {
  beforeEach(() => {
    listMock.mockReset();
    updateMock.mockReset();
    branchesMock.mockReset();
  });

  it('loading: waits for tenants', () => {
    listMock.mockReturnValue(new Promise(() => undefined));
    renderPage('admin_super');
    expect(screen.getByText('Loading pharmacy tenants…')).toBeInTheDocument();
  });

  it('empty: no tenants yet', async () => {
    listMock.mockResolvedValue([]);
    renderPage('admin_super');
    expect(await screen.findByRole('heading', { name: 'Pharmacies' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('No pharmacy tenants on the platform yet.');
  });

  it('denied: non-MASTER cannot open lifecycle controls', () => {
    renderPage('admin_verification');
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Only MASTER can change pharmacy lifecycle status.',
    );
    expect(listMock).not.toHaveBeenCalled();
  });

  it('success: MASTER chrome still lists pharmacies during support', async () => {
    listMock.mockResolvedValue([active]);
    renderPage('admin_super', support);
    expect(await screen.findByText('Varshmaan Pharmacy')).toBeInTheDocument();
    expect(listMock).toHaveBeenCalled();
    expect(
      screen.queryByText('Only MASTER can change pharmacy lifecycle status.'),
    ).not.toBeInTheDocument();
  });

  it('validation: reason is required before filing', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([active]);
    renderPage('admin_super');
    expect(await screen.findByText('Varshmaan Pharmacy')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Suspend' }));
    await user.click(screen.getByRole('button', { name: 'Confirm change' }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Enter a reason before filing this lifecycle change.',
    );
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('success: MASTER suspends with a reason', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([active]);
    updateMock.mockResolvedValue({
      ...active,
      status: 'SUSPENDED',
      allowedTransitions: ['ACTIVE', 'TERMINATED'],
    });
    renderPage('admin_super');
    expect(await screen.findByText('Varshmaan Pharmacy')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Suspend' }));
    await user.type(screen.getByLabelText('Lifecycle reason'), 'Compliance hold');
    await user.click(screen.getByRole('button', { name: 'Confirm change' }));

    expect(updateMock).toHaveBeenCalledWith('t1', 'SUSPENDED', 'ACTIVE', 'Compliance hold');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Lifecycle change filed. Access cascade applied.',
    );
    expect(screen.getByText('Suspended')).toBeInTheDocument();
  });

  it('conflict: stale status surfaces without clearing the form', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([active]);
    updateMock.mockRejectedValue(new ApiError('stale', 409, 'STALE_STATE'));
    renderPage('admin_super');
    expect(await screen.findByText('Varshmaan Pharmacy')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Suspend' }));
    await user.type(screen.getByLabelText('Lifecycle reason'), 'Race');
    await user.click(screen.getByRole('button', { name: 'Confirm change' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This pharmacy status changed elsewhere. Reload and try again.',
    );
  });

  it('failure: network error on load', async () => {
    listMock.mockRejectedValue(new Error('offline'));
    renderPage('admin_super');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not load pharmacies. Try again.',
    );
  });

  it('success: MASTER opens read-only tenant outlet file', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([active]);
    branchesMock.mockResolvedValue([
      {
        id: 'b1',
        tenantId: 't1',
        name: 'Main Counter',
        branchCode: 'BR01',
        addressLine: '12 MG Road',
        city: 'Bengaluru',
        state: 'KA',
        pincode: '560001',
        contactPhone: '9876543210',
        contactEmail: null,
        drugLicenseNumber: 'DL-1',
        gstin: null,
        branchType: 'RETAIL',
        status: 'ACTIVE',
        openingDate: '2026-09-01',
        defaultBranch: true,
        linkedWarehouse: false,
      },
    ]);
    renderPage('admin_super');
    expect(await screen.findByText('Varshmaan Pharmacy')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Outlet file' }));
    expect(await screen.findByRole('heading', { name: 'Tenant outlet file' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Tenant outlet file loaded for support review.',
    );
    expect(screen.getByText('BR01')).toBeInTheDocument();
    expect(screen.getByText('DL-1')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save outlet' })).not.toBeInTheDocument();
  });

  it('empty: tenant outlet file with no branches', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([active]);
    branchesMock.mockResolvedValue([]);
    renderPage('admin_super');
    expect(await screen.findByText('Varshmaan Pharmacy')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Outlet file' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No outlets on file for this tenant yet.',
    );
  });

  it('failure: outlet file load error', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([active]);
    branchesMock.mockRejectedValue(new Error('offline'));
    renderPage('admin_super');
    expect(await screen.findByText('Varshmaan Pharmacy')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Outlet file' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not load tenant outlets. Try again.',
    );
  });
});
