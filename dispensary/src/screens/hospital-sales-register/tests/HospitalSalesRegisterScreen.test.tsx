import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import HospitalSalesRegisterScreen from '@/screens/hospital-sales-register/HospitalSalesRegisterScreen';
import { ApiError } from '@/services/axios';
import { authReducer } from '@/store';
import type { HospitalSalesRegister } from '@/services/hospital';

vi.mock('@/services/hospital', () => ({
  getHospitalSalesRegister: vi.fn(),
  downloadHospitalSalesRegister: vi.fn(),
  isApiError: (error: unknown) => error instanceof ApiError,
}));

import {
  downloadHospitalSalesRegister,
  getHospitalSalesRegister,
} from '@/services/hospital';

const listMock = vi.mocked(getHospitalSalesRegister);
const exportMock = vi.mocked(downloadHospitalSalesRegister);

const emptyRegister: HospitalSalesRegister = {
  tiles: [
    { source: 'OPD_RX', count: 0, revenuePaise: 0 },
    { source: 'COUNTER', count: 0, revenuePaise: 0 },
    { source: 'WARD', count: 0, revenuePaise: 0 },
    { source: 'EMERGENCY', count: 0, revenuePaise: 0 },
  ],
  totals: { count: 0, revenuePaise: 0, paidPaise: 0, unpaidPaise: 0, insurancePaise: 0 },
  items: [],
};

const filledRegister: HospitalSalesRegister = {
  tiles: [
    { source: 'OPD_RX', count: 1, revenuePaise: 11200 },
    { source: 'COUNTER', count: 1, revenuePaise: 11200 },
    { source: 'WARD', count: 1, revenuePaise: 11200 },
    { source: 'EMERGENCY', count: 1, revenuePaise: 11200 },
    { source: 'ONLINE', count: 9, revenuePaise: 99900 },
  ],
  totals: {
    count: 4,
    revenuePaise: 44800,
    paidPaise: 33600,
    unpaidPaise: 11200,
    insurancePaise: 11200,
  },
  items: [
    {
      id: 'inv-opd',
      invoiceNumber: 'INV/2026-27/BR01/00001',
      completedAt: '2026-09-21T04:30:00Z',
      saleSource: 'OPD_RX',
      uhid: null,
      wardId: null,
      wardName: null,
      patientName: 'Ravi Kumar',
      phone: '9876543210',
      paymentModes: ['CASH'],
      insurerName: null,
      totalPaise: 11200,
      amountPaidPaise: 11200,
      amountDuePaise: 0,
      insurancePaise: 0,
    },
    {
      id: 'inv-ward',
      invoiceNumber: 'INV/2026-27/BR01/00003',
      completedAt: '2026-09-21T06:00:00Z',
      saleSource: 'WARD',
      uhid: 'UHID-00001',
      wardId: 'ward-1',
      wardName: 'General A',
      patientName: 'Meera Shah',
      phone: '9000000001',
      paymentModes: ['INSURANCE_TPA'],
      insurerName: 'Star Health',
      totalPaise: 11200,
      amountPaidPaise: 0,
      amountDuePaise: 11200,
      insurancePaise: 11200,
    },
  ],
};

function renderPage(
  modules: string[] = ['HOSPITAL'],
  options?: { role?: string; activeBranchId?: string | null; desks?: string[] },
) {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        user: {
          userId: 'u1',
          displayName: 'Varshmaan',
          role: options?.role ?? 'pharmacy_owner',
          tenantId: 't1',
          modules,
          pinSet: true,
          activeBranchId: options?.activeBranchId === undefined ? 'b1' : options.activeBranchId,
          roles: (options?.desks ?? []).map((code) => ({
            id: code,
            name: code,
            code,
            kind: 'PREDEFINED',
          })),
        },
      },
    },
  });
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/hospital-sales']}>
        <HospitalSalesRegisterScreen />
      </MemoryRouter>
    </Provider>,
  );
}

describe('HospitalSalesRegisterScreen', () => {
  beforeEach(() => {
    listMock.mockReset();
    exportMock.mockReset();
    URL.createObjectURL = vi.fn(() => 'blob:patient-sales');
    URL.revokeObjectURL = vi.fn();
  });

  it('loading: waits for patient sales', () => {
    listMock.mockReturnValue(new Promise(() => undefined));
    renderPage();
    expect(screen.getByRole('status')).toHaveTextContent('Loading patient sales');
  });

  it('empty: no completed patient bills in this period', async () => {
    listMock.mockResolvedValue(emptyRegister);
    renderPage();
    expect(await screen.findByRole('status')).toHaveTextContent(
      'No completed patient bills in this period',
    );
    expect(screen.queryByText(/online/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/WS\//)).not.toBeInTheDocument();
  });

  it('validation: inverted dates stay on the till', async () => {
    listMock.mockResolvedValue(emptyRegister);
    renderPage();
    await screen.findByRole('status');
    const calls = listMock.mock.calls.length;
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-12-31' } });
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-01-01' } });
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Choose a from date on or before the to date',
    );
    expect(listMock.mock.calls.length).toBe(calls);
  });

  it('denied: staff without HOSPITAL cannot open patient sales', async () => {
    listMock.mockRejectedValue(new ApiError('Forbidden', 403, 'FORBIDDEN'));
    renderPage(['HOSPITAL']);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'You cannot open patient sales at this counter',
    );
  });

  it('conflict: export collision restores focus', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue(filledRegister);
    exportMock.mockRejectedValue(new ApiError('stale', 409, 'STALE_STATE'));
    renderPage();
    await screen.findByText('INV/2026-27/BR01/00001');
    const download = screen.getByRole('button', { name: 'Download spreadsheet' });
    await user.click(download);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This register changed on another till',
    );
    await waitFor(() => expect(download).toHaveFocus());
  });

  it('failure: cannot load patient sales', async () => {
    listMock.mockRejectedValue(new ApiError('down', 500, 'INTERNAL_ERROR'));
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not load patient sales. Try again.',
    );
  });

  it('success: tiles, rows, and export use the current filters', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue(filledRegister);
    exportMock.mockResolvedValue(new Blob(['csv']));
    renderPage();
    expect(await screen.findByText('INV/2026-27/BR01/00001')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /OPD Rx/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Counter/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ward/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Casualty/ })).toBeInTheDocument();
    expect(screen.queryByText(/online/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/WS\//)).not.toBeInTheDocument();
    expect(screen.getByText('Star Health')).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Payment'), 'INSURANCE_TPA');
    await waitFor(() =>
      expect(listMock).toHaveBeenCalledWith(
        expect.objectContaining({ paymentMode: 'INSURANCE_TPA' }),
      ),
    );
    await user.selectOptions(screen.getByLabelText('Ward'), 'ward-1');
    await waitFor(() =>
      expect(listMock).toHaveBeenCalledWith(expect.objectContaining({ wardId: 'ward-1' })),
    );
    const download = screen.getByRole('button', { name: 'Download spreadsheet' });
    await user.click(download);
    await waitFor(() =>
      expect(exportMock).toHaveBeenCalledWith(
        'csv',
        expect.objectContaining({ paymentMode: 'INSURANCE_TPA', wardId: 'ward-1' }),
      ),
    );
    expect(await screen.findByRole('status')).toHaveTextContent('Register file downloaded');
    await waitFor(() => expect(download).toHaveFocus());
  });

  it('plan_limit: Growth/Free cannot open patient sales', async () => {
    renderPage([]);
    expect(await screen.findByRole('alert')).toHaveTextContent('Patient sales is on the Pro plan');
    expect(screen.getByRole('link', { name: 'Open the plan' })).toHaveAttribute(
      'href',
      '/subscription',
    );
    expect(listMock).not.toHaveBeenCalled();
  });

  it('no_branch: asks for an outlet first', async () => {
    renderPage(['HOSPITAL'], { activeBranchId: null });
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Select an outlet before opening patient sales',
    );
    expect(listMock).not.toHaveBeenCalled();
  });

  it('denied: cashier without HOSPITAL or REPORTING stays off the register', async () => {
    renderPage(['SALES'], { role: 'pharmacy_cashier', desks: ['cashier'] });
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'You cannot open patient sales at this counter',
    );
    expect(listMock).not.toHaveBeenCalled();
  });

  it('success: pharmacist and accountant with HOSPITAL can load the mix', async () => {
    listMock.mockResolvedValue(filledRegister);
    renderPage(['HOSPITAL'], { role: 'pharmacy_pharmacist' });
    expect(await screen.findByText('INV/2026-27/BR01/00001')).toBeInTheDocument();
  });

  it('success: REPORTING without HOSPITAL still loads patient sales', async () => {
    listMock.mockResolvedValue(filledRegister);
    renderPage(['REPORTING'], { role: 'pharmacy_accountant' });
    expect(await screen.findByText('Meera Shah')).toBeInTheDocument();
    expect(screen.queryByText(/WS\//)).not.toBeInTheDocument();
  });
});
