import { configureStore } from '@reduxjs/toolkit';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DashboardScreen from '@/screens/dashboard/DashboardScreen';
import { authReducer } from '@/store';
import type { KycPack } from '@/services/kyc';
import type { AdminSubscription } from '@/services/subscriptions';
import type { AdminTenant } from '@/services/tenants';

vi.mock('@/services/tenants', () => ({
  listTenants: vi.fn(),
}));
vi.mock('@/services/kyc', () => ({
  listKycQueue: vi.fn(),
}));
vi.mock('@/services/subscriptions', () => ({
  listSubscriptions: vi.fn(),
}));
vi.mock('@/services/axios', () => ({
  apiClient: { get: vi.fn().mockResolvedValue({ data: { status: 'UP', service: 'namma' } }) },
}));

import { listKycQueue } from '@/services/kyc';
import { listSubscriptions } from '@/services/subscriptions';
import { listTenants } from '@/services/tenants';

const tenantsMock = vi.mocked(listTenants);
const kycMock = vi.mocked(listKycQueue);
const subsMock = vi.mocked(listSubscriptions);

const tenant: AdminTenant = {
  id: 't1',
  name: 'Varshmaan',
  slug: 'varshmaan',
  status: 'ACTIVE',
  updatedAt: '2026-09-03T00:00:00Z',
  allowedTransitions: [],
};

const kyc: KycPack = {
  id: 'pack-1',
  tenantId: 't1',
  tenantName: 'Varshmaan',
  legalName: 'Varshmaan Retail',
  drugLicenseNumber: 'KA-DL-1',
  pan: 'ABCDE1234F',
  gstin: null,
  addressLine1: '12 MG Road',
  city: 'Bengaluru',
  state: 'KA',
  pincode: '560001',
  contactPhone: '9876543210',
  status: 'SUBMITTED',
  rejectionReason: null,
  submittedAt: '2026-09-03T00:00:00Z',
  reviewedBy: null,
  reviewedAt: null,
  version: 0,
  documents: [],
};

const sub: AdminSubscription = {
  tenantId: 't1',
  tenantName: 'Varshmaan',
  planCode: 'STARTER',
  status: 'EXPIRED',
  expiresAt: '2026-09-01T00:00:00Z',
  branchLimitOverride: null,
  effectiveBranchLimit: 2,
  maxUsers: 3,
  usersUsed: 1,
  branchesUsed: 1,
};

function renderPage() {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        user: { userId: 'm1', displayName: 'Sanskar', role: 'admin_super', tenantId: null, pinSet: true },
      },
    },
  });
  return render(
    <Provider store={store}>
      <DashboardScreen />
    </Provider>,
  );
}

describe('HQ tenant pulse', () => {
  beforeEach(() => {
    tenantsMock.mockReset();
    kycMock.mockReset();
    subsMock.mockReset();
  });

  it('loading: waits for pulse lists', () => {
    tenantsMock.mockReturnValue(new Promise(() => undefined));
    kycMock.mockReturnValue(new Promise(() => undefined));
    subsMock.mockReturnValue(new Promise(() => undefined));
    renderPage();
    expect(screen.getByText('Loading tenant pulse…')).toBeInTheDocument();
  });

  it('success: wires pharmacy, KYC, and subscription counts', async () => {
    tenantsMock.mockResolvedValue([tenant]);
    kycMock.mockResolvedValue([kyc]);
    subsMock.mockResolvedValue([sub]);
    renderPage();
    expect((await screen.findAllByText('1')).length).toBe(3);
    expect(screen.getByText('Active pharmacies')).toBeInTheDocument();
    expect(screen.getByText('KYC pending')).toBeInTheDocument();
    expect(screen.getByText('Subscriptions due')).toBeInTheDocument();
  });

  it('failure: lists unavailable', async () => {
    tenantsMock.mockRejectedValue(new Error('down'));
    kycMock.mockRejectedValue(new Error('down'));
    subsMock.mockRejectedValue(new Error('down'));
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load tenant pulse');
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });
});
