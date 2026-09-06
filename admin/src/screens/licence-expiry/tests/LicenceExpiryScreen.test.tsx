import { configureStore } from '@reduxjs/toolkit';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LicenceExpiryScreen from '@/screens/licence-expiry/LicenceExpiryScreen';
import { ApiError } from '@/services/axios';
import { authReducer } from '@/store';
import type { AdminDueLicense } from '@/services/licenses';

vi.mock('@/services/licenses', () => ({
  listPlatformDueLicenses: vi.fn(),
}));

import { listPlatformDueLicenses } from '@/services/licenses';

const listMock = vi.mocked(listPlatformDueLicenses);

const dueRow: AdminDueLicense = {
  id: 'lic-1',
  tenantId: 't1',
  tenantName: 'Varshmaan Pharmacy',
  branchId: null,
  branchName: null,
  staffUserId: null,
  staffDisplayName: null,
  docType: 'DRUG_LICENSE',
  scope: 'TENANT',
  licenseNumber: 'KA-DL-100',
  issuedOn: '2025-09-01',
  expiresOn: '2026-09-20',
  due: true,
};

function renderPage(role: string) {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        user: {
          userId: 'm1',
          displayName: 'Sanskar',
          role,
          tenantId: null,
          pinSet: true,
        },
      },
    },
  });
  return render(
    <Provider store={store}>
      <LicenceExpiryScreen />
    </Provider>,
  );
}

describe('HQ licence expiry', () => {
  beforeEach(() => {
    listMock.mockReset();
  });

  it('loading: waits for tenant due list', () => {
    listMock.mockReturnValue(new Promise(() => undefined));
    renderPage('admin_super');
    expect(screen.getByText('Scanning tenant licence expiries…')).toBeInTheDocument();
  });

  it('empty: no tenant papers due', async () => {
    listMock.mockResolvedValue([]);
    renderPage('admin_super');
    expect(await screen.findByRole('heading', { name: 'Licence expiry' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'No tenant papers due in the next 30 days.',
    );
    expect(
      screen.getByText('No pharmacies need a renewal chase from HQ today.'),
    ).toBeInTheDocument();
  });

  it('denied: verification desks cannot open licence expiry', () => {
    renderPage('admin_verification');
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Only MASTER can monitor licence expiry across tenants.',
    );
    expect(listMock).not.toHaveBeenCalled();
  });

  it('validation: isolate tenant needs a name', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([dueRow]);
    renderPage('admin_super');
    await screen.findByText('Varshmaan Pharmacy');
    await user.click(screen.getByRole('button', { name: 'Isolate tenant' }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Enter a tenant name before isolating the due list.',
    );
  });

  it('conflict: stale due scan', async () => {
    const user = userEvent.setup();
    listMock
      .mockResolvedValueOnce([dueRow])
      .mockRejectedValueOnce(new ApiError('stale', 409, 'CONFLICT'));
    renderPage('admin_super');
    await screen.findByText('KA-DL-100');
    await user.click(screen.getByRole('button', { name: 'Rescan platform' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The due list moved during this scan. Rescan the platform.',
    );
  });

  it('failure: due list network error', async () => {
    listMock.mockRejectedValue(new Error('offline'));
    renderPage('admin_super');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not load tenant licence expiries. Retry from this desk.',
    );
  });

  it('success: rescan refreshes tenant expiries', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([dueRow]);
    renderPage('admin_super');
    await screen.findByText('Varshmaan Pharmacy');
    await user.click(screen.getByRole('button', { name: 'Rescan platform' }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Platform due list refreshed. Tenant expiries are current.',
    );
    expect(screen.getByText('KA-DL-100')).toBeInTheDocument();
    expect(screen.getByText('Drug licence')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rescan platform' })).toHaveFocus();
  });
});
