import { configureStore } from '@reduxjs/toolkit';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import HospitalPatientsScreen from '@/screens/hospital-patients/HospitalPatientsScreen';
import { ApiError } from '@/services/axios';
import { authReducer } from '@/store';
import type {
  HospitalActivePatient,
  HospitalActivePatientDetail,
} from '@/services/hospital';

vi.mock('@/services/hospital', () => ({
  getHospitalActivePatients: vi.fn(),
  getHospitalActivePatient: vi.fn(),
  getHospitalCasualtyPatient: vi.fn(),
  settleHospitalAdmission: vi.fn(),
  settleHospitalCasualty: vi.fn(),
  dischargeHospitalAdmission: vi.fn(),
  isApiError: (error: unknown) => error instanceof ApiError,
}));

import {
  dischargeHospitalAdmission,
  getHospitalActivePatient,
  getHospitalActivePatients,
  getHospitalCasualtyPatient,
  settleHospitalAdmission,
  settleHospitalCasualty,
} from '@/services/hospital';

const listMock = vi.mocked(getHospitalActivePatients);
const detailMock = vi.mocked(getHospitalActivePatient);
const casualtyMock = vi.mocked(getHospitalCasualtyPatient);
const settleMock = vi.mocked(settleHospitalAdmission);
const settleCasualtyMock = vi.mocked(settleHospitalCasualty);
const dischargeMock = vi.mocked(dischargeHospitalAdmission);

const wardPatient: HospitalActivePatient = {
  kind: 'ADMISSION',
  admissionId: 'a1',
  uhid: 'UHID-00001',
  patientName: 'Ravi Kumar',
  wardName: 'General A',
  locationLabel: 'General A',
  unpaidPaise: 25000,
  settledPaise: 0,
  billCount: 2,
  status: 'ACTIVE',
  version: 1,
};

const casualtyPatient: HospitalActivePatient = {
  kind: 'CASUALTY',
  admissionId: null,
  uhid: 'UHID-CAS-1',
  patientName: 'Anita Rao',
  wardName: null,
  locationLabel: 'Casualty',
  unpaidPaise: 8000,
  settledPaise: 0,
  billCount: 1,
  status: null,
  version: 0,
};

const wardDetail: HospitalActivePatientDetail = {
  kind: 'ADMISSION',
  admissionId: 'a1',
  uhid: 'UHID-00001',
  patientName: 'Ravi Kumar',
  wardName: 'General A',
  bedLabel: 'GA-1',
  locationLabel: 'General A',
  status: 'ACTIVE',
  admittedAt: '2026-09-20T10:00:00Z',
  dischargedAt: null,
  version: 1,
  unpaidPaise: 25000,
  settledPaise: 0,
  billCount: 2,
  invoices: [
    {
      id: 'inv1',
      invoiceNumber: 'INV/26-27/00011',
      completedAt: '2026-09-20T11:00:00Z',
      saleSource: 'WARD',
      itemCount: 3,
      paymentLabel: 'Khata',
      status: 'COMPLETED',
      totalPaise: 15000,
      amountDuePaise: 15000,
      amountPaidPaise: 0,
      insurerName: null,
      policyNumber: null,
    },
    {
      id: 'inv2',
      invoiceNumber: 'INV/26-27/00012',
      completedAt: '2026-09-20T12:00:00Z',
      saleSource: 'WARD',
      itemCount: 1,
      paymentLabel: 'Khata',
      status: 'COMPLETED',
      totalPaise: 10000,
      amountDuePaise: 10000,
      amountPaidPaise: 0,
      insurerName: null,
      policyNumber: null,
    },
  ],
};

const casualtyDetail: HospitalActivePatientDetail = {
  kind: 'CASUALTY',
  admissionId: null,
  uhid: 'UHID-CAS-1',
  patientName: 'Anita Rao',
  wardName: null,
  bedLabel: null,
  locationLabel: 'Casualty',
  status: null,
  admittedAt: null,
  dischargedAt: null,
  version: 0,
  unpaidPaise: 8000,
  settledPaise: 0,
  billCount: 1,
  invoices: [
    {
      id: 'inv3',
      invoiceNumber: 'INV/26-27/00020',
      completedAt: '2026-09-20T13:00:00Z',
      saleSource: 'EMERGENCY',
      itemCount: 2,
      paymentLabel: 'Khata',
      status: 'COMPLETED',
      totalPaise: 8000,
      amountDuePaise: 8000,
      amountPaidPaise: 0,
      insurerName: null,
      policyNumber: null,
    },
  ],
};

const paidWardDetail: HospitalActivePatientDetail = {
  ...wardDetail,
  unpaidPaise: 0,
  settledPaise: 25000,
  invoices: wardDetail.invoices.map((invoice) => ({
    ...invoice,
    amountDuePaise: 0,
    amountPaidPaise: invoice.totalPaise,
    paymentLabel: 'Cash',
  })),
};

function renderPage(
  modules: string[] = ['HOSPITAL'],
  path = '/hospital-patients',
  activeBranchId: string | null = 'b1',
  role = 'pharmacy_owner',
  roles: { id: string; name: string; code: string | null; kind: string }[] = [],
) {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        user: {
          userId: 'u1',
          displayName: 'Varshmaan',
          role,
          tenantId: 't1',
          modules,
          pinSet: true,
          activeBranchId,
          roles,
        },
      },
    },
  });
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[path]}>
        <HospitalPatientsScreen />
      </MemoryRouter>
    </Provider>,
  );
}

describe('HospitalPatientsScreen', () => {
  beforeEach(() => {
    listMock.mockReset();
    detailMock.mockReset();
    casualtyMock.mockReset();
    settleMock.mockReset();
    settleCasualtyMock.mockReset();
    dischargeMock.mockReset();
    listMock.mockResolvedValue({ items: [wardPatient, casualtyPatient] });
    detailMock.mockResolvedValue(wardDetail);
    casualtyMock.mockResolvedValue(casualtyDetail);
    settleMock.mockResolvedValue(paidWardDetail);
    settleCasualtyMock.mockResolvedValue({
      ...casualtyDetail,
      unpaidPaise: 0,
      settledPaise: 8000,
    });
    dischargeMock.mockResolvedValue({
      ...paidWardDetail,
      status: 'DISCHARGED',
      dischargedAt: '2026-09-21T04:00:00Z',
    });
  });

  it('loading: reserves status while the board loads', () => {
    listMock.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByRole('status')).toHaveTextContent('Loading active patients');
  });

  it('empty: unsettled list explains the next step', async () => {
    listMock.mockResolvedValue({ items: [] });
    renderPage();
    expect(await screen.findByRole('status')).toHaveTextContent(
      'No unsettled patients on this outlet',
    );
  });

  it('success: lists UHID, ward, casualty, and unpaid totals', async () => {
    renderPage();
    expect(await screen.findByText('Ravi Kumar')).toBeInTheDocument();
    expect(screen.getByText('UHID-00001')).toBeInTheDocument();
    expect(screen.getByText('General A')).toBeInTheDocument();
    expect(screen.getByText('Anita Rao')).toBeInTheDocument();
    expect(screen.getByText('Casualty')).toBeInTheDocument();
    expect(screen.getByText('₹250.00')).toBeInTheDocument();
    expect(screen.queryByText('WARD')).not.toBeInTheDocument();
  });

  it('success: casualty row has no ward and settles without a ward field', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Anita Rao');
    await user.click(screen.getByRole('button', { name: /Anita Rao/ }));
    const drawer = await screen.findByLabelText('Patient bills');
    expect(within(drawer).getAllByText('Casualty').length).toBeGreaterThan(0);
    expect(within(drawer).queryByLabelText('Ward')).not.toBeInTheDocument();
    expect(casualtyMock).toHaveBeenCalledWith('UHID-CAS-1');
    await user.selectOptions(within(drawer).getByLabelText('Payment'), 'CASH');
    await user.click(within(drawer).getByRole('button', { name: 'Post settlement' }));
    await waitFor(() =>
      expect(settleCasualtyMock).toHaveBeenCalledWith(
        expect.objectContaining({ uhid: 'UHID-CAS-1', paymentMode: 'CASH' }),
      ),
    );
    expect(screen.getByRole('status')).toHaveTextContent('Settlement posted');
  });

  it('success: search and all in-patients hit the branch list', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Ravi Kumar');
    await user.click(screen.getByRole('button', { name: 'All in-patients' }));
    await waitFor(() =>
      expect(listMock).toHaveBeenCalledWith(expect.objectContaining({ view: 'all' })),
    );
    await user.clear(screen.getByLabelText('Search patients'));
    await user.type(screen.getByLabelText('Search patients'), 'Ravi');
    await waitFor(() =>
      expect(listMock).toHaveBeenCalledWith(expect.objectContaining({ q: 'Ravi' })),
    );
  });

  it('success: cashier posts cash settlement and focus returns to the row', async () => {
    const user = userEvent.setup();
    renderPage(
      ['HOSPITAL'],
      '/hospital-patients',
      'b1',
      'pharmacy_staff',
      [{ id: 'r1', name: 'Cashier', code: 'cashier', kind: 'PREDEFINED' }],
    );
    const row = await screen.findByRole('button', { name: /Ravi Kumar/ });
    await user.click(row);
    const drawer = await screen.findByLabelText('Patient bills');
    expect(within(drawer).queryByRole('button', { name: 'Discharge this stay' })).not.toBeInTheDocument();
    await user.selectOptions(within(drawer).getByLabelText('Payment'), 'CASH');
    await user.click(within(drawer).getByRole('button', { name: 'Post settlement' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Settlement posted. Hospital account is unchanged.');
    expect(settleMock).toHaveBeenCalledWith(
      'a1',
      expect.objectContaining({ expectedVersion: 1, paymentMode: 'CASH' }),
    );
    expect(row).toHaveFocus();
  });

  it('validation: Insurance / TPA needs insurer and policy', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: /Ravi Kumar/ }));
    const drawer = await screen.findByLabelText('Patient bills');
    await user.selectOptions(within(drawer).getByLabelText('Payment'), 'INSURANCE_TPA');
    await user.click(within(drawer).getByRole('button', { name: 'Post settlement' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Insurance / TPA needs insurer and policy');
    expect(settleMock).not.toHaveBeenCalled();
  });

  it('denied: 403 settle is explained at the counter', async () => {
    const user = userEvent.setup();
    settleMock.mockRejectedValue(new ApiError('Forbidden', 403, 'FORBIDDEN'));
    renderPage();
    await user.click(await screen.findByRole('button', { name: /Ravi Kumar/ }));
    const drawer = await screen.findByLabelText('Patient bills');
    await user.selectOptions(within(drawer).getByLabelText('Payment'), 'UPI');
    await user.click(within(drawer).getByRole('button', { name: 'Post settlement' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'You cannot settle or discharge patients at this counter.',
    );
  });

  it('conflict: stale discharge asks the till to reload', async () => {
    const user = userEvent.setup();
    dischargeMock.mockRejectedValue(new ApiError('Stale', 409, 'STALE_STATE'));
    renderPage();
    await user.click(await screen.findByRole('button', { name: /Ravi Kumar/ }));
    const drawer = await screen.findByLabelText('Patient bills');
    await user.click(within(drawer).getByRole('button', { name: 'Discharge this stay' }));
    const dialog = await screen.findByRole('dialog');
    await user.selectOptions(within(dialog).getByLabelText('Payment'), 'CASH');
    await user.click(within(dialog).getByRole('button', { name: 'Discharge and free the bed' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This stay was updated on another till. Reload and try again.',
    );
  });

  it('failure: load error keeps retry in reserved space', async () => {
    listMock.mockRejectedValue(new ApiError('Down', 500, 'ERROR'));
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load active patients');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('validation: discharge without settlement shows outstanding copy', async () => {
    const user = userEvent.setup();
    dischargeMock.mockRejectedValue(
      new ApiError(
        'Settle unpaid patient bills before discharge, or include settlement in this request.',
        422,
        'OUTSTANDING_BILLS',
      ),
    );
    renderPage();
    await user.click(await screen.findByRole('button', { name: /Ravi Kumar/ }));
    const drawer = await screen.findByLabelText('Patient bills');
    await user.click(within(drawer).getByRole('button', { name: 'Discharge this stay' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Discharge and free the bed' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Settle unpaid patient bills before discharge, or include settlement in this request.',
    );
  });

  it('success: pharmacist discharges with settlement in the same request', async () => {
    const user = userEvent.setup();
    renderPage(
      ['HOSPITAL'],
      '/hospital-patients',
      'b1',
      'pharmacy_staff',
      [{ id: 'r2', name: 'Pharmacist', code: 'pharmacist', kind: 'PREDEFINED' }],
    );
    await user.click(await screen.findByRole('button', { name: /Ravi Kumar/ }));
    const drawer = await screen.findByLabelText('Patient bills');
    await user.click(within(drawer).getByRole('button', { name: 'Discharge this stay' }));
    const dialog = await screen.findByRole('dialog');
    await user.selectOptions(within(dialog).getByLabelText('Payment'), 'CARD');
    await user.click(within(dialog).getByRole('button', { name: 'Discharge and free the bed' }));
    await waitFor(() =>
      expect(dischargeMock).toHaveBeenCalledWith(
        'a1',
        expect.objectContaining({ expectedVersion: 1, paymentMode: 'CARD' }),
      ),
    );
    expect(await screen.findByRole('status')).toHaveTextContent('Patient discharged. The bed is free.');
  });

  it('success: deep-links an occupied bed into the drawer', async () => {
    renderPage(['HOSPITAL'], '/hospital-patients?admissionId=a1');
    await waitFor(() => expect(detailMock).toHaveBeenCalledWith('a1'));
    expect(await screen.findByText('INV/26-27/00011')).toBeInTheDocument();
  });

  it('plan_limit: shows upgrade without hospital module', async () => {
    renderPage([]);
    expect(await screen.findByRole('alert')).toHaveTextContent('Active patients is on the Pro plan');
    expect(screen.getByRole('link', { name: 'Open the plan' })).toHaveAttribute(
      'href',
      '/subscription',
    );
    expect(listMock).not.toHaveBeenCalled();
  });

  it('no_branch: asks for an outlet first', async () => {
    renderPage(['HOSPITAL'], '/hospital-patients', null);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Select an outlet before opening active patients.',
    );
    expect(listMock).not.toHaveBeenCalled();
  });
});
