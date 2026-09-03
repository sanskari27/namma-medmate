import { configureStore } from '@reduxjs/toolkit';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import BranchesScreen from '@/screens/branches/BranchesScreen';
import { ApiError } from '@/services/axios';
import { authReducer } from '@/store';
import type { Branch } from '@/services/branches';

vi.mock('@/services/branches', async () => {
  const axios = await import('@/services/axios');
  return {
    listBranches: vi.fn(),
    createBranch: vi.fn(),
    updateBranch: vi.fn(),
    copyBranchSettings: vi.fn(),
    ApiError: axios.ApiError,
    isApiError: axios.isApiError,
  };
});

import { copyBranchSettings, createBranch, listBranches, updateBranch } from '@/services/branches';

const listMock = vi.mocked(listBranches);
const createMock = vi.mocked(createBranch);
const updateMock = vi.mocked(updateBranch);
const copyMock = vi.mocked(copyBranchSettings);

const sample: Branch = {
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
  operatingHours: {},
  branchType: 'RETAIL',
  status: 'ACTIVE',
  openingDate: '2026-09-01',
  defaultBranch: true,
  linkedWarehouse: false,
  pricingSettings: { defaultMarkupBps: 100 },
  taxSettings: { gstMode: 'CGST_SGST' },
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
};

function renderPage(role = 'pharmacy_owner') {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        user: {
          userId: 'u1',
          displayName: 'Owner',
          role,
          tenantId: 't1',
          pinSet: true,
          tenantStatus: 'ACTIVE',
          emailVerified: true,
        },
      },
    },
  });
  return render(
    <Provider store={store}>
      <BranchesScreen />
    </Provider>,
  );
}

describe('counter outlets', () => {
  beforeEach(() => {
    listMock.mockReset();
    createMock.mockReset();
    updateMock.mockReset();
    copyMock.mockReset();
  });

  it('loading: waits for outlets', () => {
    listMock.mockReturnValue(new Promise(() => undefined));
    renderPage();
    expect(screen.getByText('Loading outlets for this counter…')).toBeInTheDocument();
  });

  it('empty: no outlets yet', async () => {
    listMock.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByRole('heading', { name: 'Outlets' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'No outlets yet. Add the first branch for this pharmacy floor.',
    );
  });

  it('denied: staff cannot manage outlets', () => {
    renderPage('pharmacy_staff');
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Only the pharmacy owner can manage outlets at this counter.',
    );
    expect(listMock).not.toHaveBeenCalled();
  });

  it('validation: required fields before save', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([]);
    renderPage();
    await screen.findByRole('heading', { name: 'Outlets' });
    await user.click(screen.getByRole('button', { name: 'Add outlet' }));
    await user.click(screen.getByRole('button', { name: 'Save outlet' }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Name, address, phone, and drug licence are required before saving this outlet.',
    );
    expect(createMock).not.toHaveBeenCalled();
  });

  it('success: owner creates an outlet', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([]);
    createMock.mockResolvedValue(sample);
    renderPage();
    await screen.findByRole('heading', { name: 'Outlets' });
    await user.click(screen.getByRole('button', { name: 'Add outlet' }));
    await user.type(screen.getByLabelText('Outlet name'), 'Main Counter');
    await user.type(screen.getByLabelText('Drug licence number'), 'DL-1');
    await user.type(screen.getByLabelText('Address'), '12 MG Road');
    await user.type(screen.getByLabelText('City'), 'Bengaluru');
    await user.type(screen.getByLabelText('State'), 'KA');
    await user.type(screen.getByLabelText('Pincode'), '560001');
    await user.type(screen.getByLabelText('Contact phone'), '9876543210');
    await user.click(screen.getByRole('button', { name: 'Save outlet' }));
    await waitFor(() => expect(createMock).toHaveBeenCalled());
    expect(await screen.findByRole('alert')).toHaveTextContent('Outlet saved on this floor.');
    expect(screen.getByText('BR01')).toBeInTheDocument();
  });

  it('failure: network error on load', async () => {
    listMock.mockRejectedValue(new ApiError('down', 500, 'DOWN'));
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not reach the server for outlets. Try again.',
    );
  });

  it('conflict: stale update surfaces conflict copy', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([sample]);
    updateMock.mockRejectedValue(new ApiError('stale', 409, 'STALE_STATE'));
    renderPage();
    expect(await screen.findByText('Main Counter')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Edit outlet' }));
    await user.click(screen.getByRole('button', { name: 'Save outlet' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This outlet was updated elsewhere. Refresh and try again.',
    );
  });
});
