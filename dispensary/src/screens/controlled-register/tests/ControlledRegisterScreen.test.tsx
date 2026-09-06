import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ControlledRegisterScreen from '@/screens/controlled-register/ControlledRegisterScreen';
import { ApiError } from '@/services/axios';
import { authReducer } from '@/store';
import type { ControlledSaleLine } from '@/services/controlledRegister';

vi.mock('@/services/controlledRegister', async () => {
  const axios = await import('@/services/axios');
  return {
    listControlledRegister: vi.fn(),
    downloadControlledRegisterExport: vi.fn(),
    ApiError: axios.ApiError,
    isApiError: axios.isApiError,
  };
});

import {
  downloadControlledRegisterExport,
  listControlledRegister,
} from '@/services/controlledRegister';

const listMock = vi.mocked(listControlledRegister);
const exportMock = vi.mocked(downloadControlledRegisterExport);

const sample: ControlledSaleLine = {
  id: 'reg-1',
  kind: 'SALE',
  productId: 'p1',
  productName: 'Alprazolam',
  sku: 'H1-SALE',
  scheduleClassification: 'H1',
  batchId: 'b1',
  batchNumber: 'LOT-RX',
  quantity: 1,
  prescriptionReference: 'RX-NDPS-1',
  patientId: 'c1',
  patientName: 'Ravi Patient',
  pharmacistUserId: 'u1',
  pharmacistName: 'Anika Owner',
  pharmacistRegistration: null,
  occurredAt: '2026-09-05T12:00:00Z',
  salesInvoiceId: 'inv-1',
  salesInvoiceLineId: 'line-1',
  salesReturnId: null,
  salesReturnLineId: null,
  sourceRegisterId: null,
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
          modules: ['SALES'],
          roles,
          activeBranchId: 'br1',
          branches: [{ id: 'br1', name: 'Main', branchCode: 'BR01', status: 'ACTIVE' }],
        },
      },
    },
  });
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <ControlledRegisterScreen />
      </MemoryRouter>
    </Provider>,
  );
}

describe('NDPS sale book', () => {
  beforeEach(() => {
    listMock.mockReset();
    exportMock.mockReset();
    URL.createObjectURL = vi.fn(() => 'blob:sale-book');
    URL.revokeObjectURL = vi.fn();
  });

  it('loading: waits for the sale book', () => {
    listMock.mockReturnValue(new Promise(() => undefined));
    renderPage();
    expect(screen.getByText('Loading the NDPS sale book for this outlet…')).toBeInTheDocument();
  });

  it('empty: no Schedule sales yet', async () => {
    listMock.mockResolvedValue([]);
    renderPage();
    expect(
      await screen.findByText(
        'No Schedule sales in this outlet yet. Completed H, H1, X, and NDPS bills land here.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'NDPS sale book' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
  });

  it('denied: cashier cannot open the sale book', () => {
    renderPage('pharmacy_staff');
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Only a pharmacist or owner can open the NDPS sale book. Ask the owner to assign Pharmacist.',
    );
    expect(listMock).not.toHaveBeenCalled();
  });

  it('validation: period cannot end before it starts', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([]);
    renderPage();
    await screen.findByRole('heading', { name: 'NDPS sale book' });
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-09-10' } });
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-09-01' } });
    await user.click(screen.getByRole('button', { name: 'Apply filters' }));
    expect(screen.getByRole('status')).toHaveTextContent(
      'Choose a period that starts on or before the end date.',
    );
    expect(exportMock).not.toHaveBeenCalled();
  });

  it('conflict: export is stale on another till', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([sample]);
    exportMock.mockRejectedValue(new ApiError('stale', 409, 'STALE_STATE'));
    renderPage();
    await screen.findByRole('table', { name: 'Schedule sales' });
    expect(screen.getByRole('table', { name: 'Schedule sales' })).toHaveTextContent('Alprazolam');
    await user.click(screen.getByRole('button', { name: 'Take spreadsheet' }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'This sale book changed on another till. Reload, then take the sheet again.',
    );
  });

  it('failure: list network error', async () => {
    listMock.mockRejectedValue(new Error('network'));
    renderPage();
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Could not load the NDPS sale book. Check the connection and try again.',
    );
  });

  it('success: lists a sale and restores focus after NDPS sheet', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([sample]);
    exportMock.mockResolvedValue(new Blob(['date_ist'], { type: 'text/csv' }));
    renderPage();
    await screen.findByRole('table', { name: 'Schedule sales' });
    const book = screen.getByRole('table', { name: 'Schedule sales' });
    expect(book).toHaveTextContent('Alprazolam');
    expect(book).toHaveTextContent('Ravi Patient');
    expect(book).toHaveTextContent('RX-NDPS-1');
    await user.click(screen.getByRole('button', { name: 'NDPS sheet' }));
    await waitFor(() => expect(exportMock).toHaveBeenCalled());
    expect(await screen.findByRole('status')).toHaveTextContent(
      'NDPS sheet saved for this outlet.',
    );
    expect(screen.getByRole('button', { name: 'NDPS sheet' })).toHaveFocus();
  });

  it('pharmacist assigned to the till can open the sale book', async () => {
    listMock.mockResolvedValue([sample]);
    renderPage('pharmacy_staff', [
      { id: 'r1', name: 'Pharmacist', code: 'pharmacist', kind: 'PREDEFINED' },
    ]);
    await screen.findByRole('table', { name: 'Schedule sales' });
    expect(screen.getByRole('table', { name: 'Schedule sales' })).toHaveTextContent('Alprazolam');
  });
});
