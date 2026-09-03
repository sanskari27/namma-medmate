import { configureStore } from '@reduxjs/toolkit';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PharmaciesScreen from '@/screens/pharmacies/PharmaciesScreen';
import { ApiError } from '@/services/axios';
import { authReducer } from '@/store';
import type { AdminTenant } from '@/services/tenants';

vi.mock('@/services/tenants', () => ({
  listTenants: vi.fn(),
  updateTenantStatus: vi.fn(),
}));

import { listTenants, updateTenantStatus } from '@/services/tenants';

const listMock = vi.mocked(listTenants);
const updateMock = vi.mocked(updateTenantStatus);

const active: AdminTenant = {
  id: 't1',
  name: 'Varshmaan Pharmacy',
  slug: 'varshmaan',
  status: 'ACTIVE',
  updatedAt: '2026-09-03T00:00:00Z',
  allowedTransitions: ['SUSPENDED', 'EXPIRED', 'TERMINATED'],
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
      <PharmaciesScreen />
    </Provider>,
  );
}

describe('pharmacies lifecycle', () => {
  beforeEach(() => {
    listMock.mockReset();
    updateMock.mockReset();
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
});
