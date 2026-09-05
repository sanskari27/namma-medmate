import { configureStore } from '@reduxjs/toolkit';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PrescriptionsScreen from '@/screens/prescriptions/PrescriptionsScreen';
import { ApiError } from '@/services/axios';
import { authReducer } from '@/store';
import type { PrescriptionReference } from '@/services/prescriptionReferences';

vi.mock('@/services/prescriptionReferences', async () => {
  const axios = await import('@/services/axios');
  return {
    listPrescriptionReferences: vi.fn(),
    getPrescriptionReference: vi.fn(),
    archivePrescriptionReference: vi.fn(),
    scanPrescriptionReferences: vi.fn(),
    ApiError: axios.ApiError,
    isApiError: axios.isApiError,
  };
});

import {
  archivePrescriptionReference,
  getPrescriptionReference,
  listPrescriptionReferences,
  scanPrescriptionReferences,
} from '@/services/prescriptionReferences';

const listMock = vi.mocked(listPrescriptionReferences);
const getMock = vi.mocked(getPrescriptionReference);
const archiveMock = vi.mocked(archivePrescriptionReference);
const scanMock = vi.mocked(scanPrescriptionReferences);

const active: PrescriptionReference = {
  id: 'rx-1',
  tenantId: 't1',
  branchId: 'b1',
  branchName: 'Main',
  customerId: 'c1',
  customerName: 'Ravi Kumar',
  doctorId: null,
  prescriptionReference: 'RX-90',
  issuedAt: '2026-09-05T07:00:00Z',
  expiresAt: '2027-03-05T07:00:00Z',
  status: 'ACTIVE',
  archiveReason: null,
  archivedAt: null,
  firstInvoiceId: 'inv-1',
  version: 0,
  invoices: [],
};

const detailed: PrescriptionReference = {
  ...active,
  invoices: [
    {
      id: 'inv-1',
      invoiceNumber: 'INV/2026-27/BR01/00009',
      branchId: 'b1',
      completedAt: '2026-09-05T07:05:00Z',
      totalPaise: 336000,
    },
  ],
};

const archived: PrescriptionReference = {
  ...detailed,
  status: 'ARCHIVED',
  archiveReason: 'FULFILLED',
  archivedAt: '2026-09-05T08:00:00Z',
  version: 1,
};

function renderPage(
  role = 'pharmacy_owner',
  roles: { id: string; name: string; code: string | null; kind: string }[] = [],
) {
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
          modules: ['SALES', 'COMPLIANCE'],
          roles,
        },
      },
    },
  });
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <PrescriptionsScreen />
      </MemoryRouter>
    </Provider>,
  );
}

describe('Rx file', () => {
  beforeEach(() => {
    listMock.mockReset();
    getMock.mockReset();
    archiveMock.mockReset();
    scanMock.mockReset();
    getMock.mockResolvedValue(detailed);
  });

  it('loading: waits for the Rx file', () => {
    listMock.mockReturnValue(new Promise(() => undefined));
    renderPage();
    expect(screen.getByText('Loading the Rx file for this pharmacy…')).toBeInTheDocument();
  });

  it('empty: no sale-time references yet', async () => {
    listMock.mockResolvedValue({ items: [] });
    renderPage();
    expect(
      await screen.findByText(
        'No sale-time Rx references on this list yet. Attach an Rx on a collected bill, then it shows here.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Rx file' })).toBeInTheDocument();
  });

  it('denied: cashier cannot open the Rx file', () => {
    renderPage('pharmacy_staff', [{ id: 'r1', name: 'Cashier', code: 'cashier', kind: 'PREDEFINED' }]);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Only a pharmacist or owner can open the Rx file. Ask them at this counter.',
    );
    expect(listMock).not.toHaveBeenCalled();
  });

  it('validation: still-valid Rx cannot be archived', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue({ items: [active] });
    archiveMock.mockRejectedValue(
      new ApiError(
        'This Rx is still valid and still has quantity left.',
        422,
        'PREMATURE_ARCHIVE',
      ),
    );
    renderPage();
    await screen.findByText('RX-90');
    await user.click(screen.getByRole('button', { name: /RX-90/ }));
    await screen.findByText('INV/2026-27/BR01/00009');
    await user.click(screen.getByRole('button', { name: 'Archive this Rx' }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'This Rx is still valid and still has quantity left. Wait until it is filled or six months have passed.',
    );
  });

  it('conflict: stale version on archive', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue({ items: [active] });
    archiveMock.mockRejectedValue(new ApiError('stale', 409, 'STALE_STATE'));
    renderPage();
    await screen.findByText('RX-90');
    await user.click(screen.getByRole('button', { name: /RX-90/ }));
    await screen.findByRole('button', { name: 'Archive this Rx' });
    await user.click(screen.getByRole('button', { name: 'Archive this Rx' }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'This Rx file changed on another till. Reload it, then try again.',
    );
  });

  it('failure: list network error', async () => {
    listMock.mockRejectedValue(new Error('network'));
    renderPage();
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Could not load the Rx file. Check the connection and try again.',
    );
  });

  it('success: archive restores Archive expired focus and keeps source bills', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValueOnce({ items: [active] }).mockResolvedValue({ items: [archived] });
    archiveMock.mockResolvedValue(archived);
    getMock.mockResolvedValue(detailed);
    renderPage();
    await screen.findByText('RX-90');
    await user.click(screen.getByRole('button', { name: /RX-90/ }));
    await screen.findByText('INV/2026-27/BR01/00009');
    await user.click(screen.getByRole('button', { name: 'Archive this Rx' }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Rx archived. History and source bills stay on file.',
    );
    expect(screen.getByRole('button', { name: 'Archive expired' })).toHaveFocus();
    expect(archiveMock).toHaveBeenCalledWith('rx-1', 0);
  });

  it('distinguishes Active from Archived on the Rx file', async () => {
    const user = userEvent.setup();
    const archivedRow: PrescriptionReference = {
      ...archived,
      id: 'rx-arch',
      prescriptionReference: 'RX-ARCH',
    };
    listMock.mockImplementation(async (status) => {
      if (status === 'ARCHIVED') {
        return { items: [archivedRow] };
      }
      return { items: [active] };
    });
    getMock.mockImplementation(async (id) => {
      if (id === 'rx-arch') {
        return archivedRow;
      }
      return detailed;
    });
    renderPage();
    expect(await screen.findByText('RX-90')).toBeInTheDocument();
    expect(screen.queryByText('RX-ARCH')).not.toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Archived' }));
    expect(await screen.findByText('RX-ARCH')).toBeInTheDocument();
    expect(screen.queryByText('RX-90')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /RX-ARCH/ }));
    const detail = await screen.findByRole('region', { name: 'Rx detail' });
    expect(detail).toHaveTextContent('Archived');
    expect(detail).toHaveTextContent('Filled — nothing left on this Rx');
    expect(detail).toHaveTextContent('INV/2026-27/BR01/00009');
    expect(screen.getByText('History only. This Rx cannot go on a new bill.')).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Active' }));
    expect(await screen.findByText('RX-90')).toBeInTheDocument();
    expect(screen.queryByText('RX-ARCH')).not.toBeInTheDocument();
  });

  it('pharmacist can open the Rx file', async () => {
    listMock.mockResolvedValue({ items: [active] });
    renderPage('pharmacy_staff', [
      { id: 'r2', name: 'Pharmacist', code: 'pharmacist', kind: 'PREDEFINED' },
    ]);
    expect(await screen.findByText('RX-90')).toBeInTheDocument();
  });
});
