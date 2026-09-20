import { configureStore } from '@reduxjs/toolkit';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import HospitalIssuesScreen from '@/screens/hospital-issues/HospitalIssuesScreen';
import { ApiError } from '@/services/axios';
import { authReducer } from '@/store';
import type {
  HospitalIndent,
  HospitalIssue,
  HospitalWardOccupancy,
} from '@/services/hospital';

vi.mock('@/services/hospital', () => ({
  getHospitalIssues: vi.fn(),
  getHospitalIssue: vi.fn(),
  getHospitalWards: vi.fn(),
  getHospitalIndent: vi.fn(),
  createHospitalIssue: vi.fn(),
  downloadHospitalIssuePdf: vi.fn(),
  isApiError: (error: unknown) => error instanceof ApiError,
}));

vi.mock('@/services/products', () => ({
  listProducts: vi.fn(),
}));

vi.mock('@/services/inventory', () => ({
  listStockBatches: vi.fn(),
}));

vi.mock('@/services/salesInvoices', () => ({
  openInvoicePdf: vi.fn(),
}));

import {
  createHospitalIssue,
  downloadHospitalIssuePdf,
  getHospitalIndent,
  getHospitalIssues,
  getHospitalWards,
} from '@/services/hospital';
import { listStockBatches } from '@/services/inventory';
import { listProducts } from '@/services/products';
import { openInvoicePdf } from '@/services/salesInvoices';

const listMock = vi.mocked(getHospitalIssues);
const wardsMock = vi.mocked(getHospitalWards);
const indentMock = vi.mocked(getHospitalIndent);
const createMock = vi.mocked(createHospitalIssue);
const productsMock = vi.mocked(listProducts);
const batchesMock = vi.mocked(listStockBatches);
const pdfMock = vi.mocked(downloadHospitalIssuePdf);
const openPdfMock = vi.mocked(openInvoicePdf);

const issue: HospitalIssue = {
  id: 'iss1',
  invoiceNumber: 'WS/2026-27/BR1/00001',
  wardId: 'w1',
  wardName: 'General A',
  indentId: 'i2',
  indentNumber: 'IND-00002',
  reason: 'FLOOR_STOCK',
  uhid: null,
  patientName: 'Ravi Kumar',
  pharmacyGstin: '29ABCDE1234F1Z5',
  hospitalGstin: '29HOSPI1234F1Z8',
  creditTerms: 'NET_15',
  mrpValuePaise: 12000,
  billedPaise: 10000,
  issuedAt: '2026-09-20T10:00:00Z',
  version: 0,
  lines: [
    {
      id: 'l1',
      productId: 'p1',
      productName: 'Paracetamol 500',
      sku: 'PARA-1',
      batchId: 'batch-1',
      batchNumber: 'LOT-A',
      expiryOn: '2027-01-31',
      hsnCode: '3004',
      gstRate: 12,
      quantity: 10,
      mrpPaise: 1200,
      creditPricePaise: 1000,
      discountBps: 1667,
      amountPaise: 10000,
    },
  ],
};

const approvedIndent: HospitalIndent = {
  id: 'i2',
  indentNumber: 'IND-00002',
  wardId: 'w1',
  wardName: 'General A',
  bedId: 'b1',
  bedLabel: 'GA-1',
  patientName: 'Ravi Kumar',
  note: null,
  requestedBy: 'Sister Meena',
  requestedAt: '2026-09-20T10:00:00Z',
  status: 'APPROVED',
  hospitalInvoiceRef: null,
  issuedAt: null,
  version: 0,
  lines: [
    {
      id: 'l1',
      productId: 'p1',
      productName: 'Paracetamol 500',
      sku: 'PARA-1',
      requestedQty: 10,
      issuedQty: 0,
    },
  ],
};

const wards: HospitalWardOccupancy = {
  wardCount: 1,
  totalBeds: 1,
  occupiedBeds: 0,
  freeBeds: 1,
  occupancyPercent: 0,
  admittedCount: 0,
  wards: [
    {
      id: 'w1',
      name: 'General A',
      code: 'GA',
      floor: '2',
      category: 'GENERAL',
      capacity: 1,
      nurseInCharge: null,
      version: 1,
      beds: [{ id: 'b1', sequenceNo: 1, label: 'GA-1', occupancyStatus: 'FREE', version: 0 }],
    },
  ],
};

function renderPage(
  modules: string[] = ['HOSPITAL'],
  path = '/hospital-issues',
  activeBranchId: string | null = 'b1',
) {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        user: {
          userId: 'u1',
          displayName: 'Varshmaan',
          role: 'pharmacy_owner',
          tenantId: 't1',
          modules,
          pinSet: true,
          activeBranchId,
        },
      },
    },
  });
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[path]}>
        <HospitalIssuesScreen />
      </MemoryRouter>
    </Provider>,
  );
}

async function fillIssueForm(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'New ward issue' }));
  await user.selectOptions(screen.getByLabelText('Ward'), 'w1');
  await user.selectOptions(screen.getByLabelText('Medicine'), 'p1');
  await waitFor(() => expect(batchesMock).toHaveBeenCalledWith('p1'));
  await waitFor(() => expect(screen.getByLabelText('Batch')).toHaveValue('batch-1'));
  await user.type(screen.getByLabelText('Qty'), '10');
}

describe('HospitalIssuesScreen', () => {
  beforeEach(() => {
    listMock.mockReset();
    wardsMock.mockReset();
    indentMock.mockReset();
    createMock.mockReset();
    productsMock.mockReset();
    batchesMock.mockReset();
    pdfMock.mockReset();
    openPdfMock.mockReset();
    productsMock.mockResolvedValue([
      {
        id: 'p1',
        sku: 'PARA-1',
        name: 'Paracetamol 500',
      } as never,
    ]);
    wardsMock.mockResolvedValue(wards);
    batchesMock.mockResolvedValue([
      {
        batchId: 'batch-1',
        productId: 'p1',
        batchNumber: 'LOT-A',
        manufacturedOn: null,
        expiresOn: '2027-01-31',
        purchasePricePaise: 800,
        quantity: 40,
        version: 0,
        balanceId: 'bal-1',
        suggestedFefo: true,
        nearExpiry: false,
        expired: false,
      },
    ]);
    indentMock.mockResolvedValue(approvedIndent);
    pdfMock.mockResolvedValue(new Blob(['pdf']));
  });

  it('loading: waits for ward issues', () => {
    listMock.mockReturnValue(new Promise(() => undefined));
    renderPage();
    expect(screen.getByRole('status')).toHaveTextContent('Loading ward issues');
  });

  it('empty: prompts to record the first ward issue', async () => {
    listMock.mockResolvedValue({ items: [] });
    renderPage();
    expect(await screen.findByRole('status')).toHaveTextContent(
      'No ward issues on this outlet yet. Record an issue to bill the hospital.',
    );
  });

  it('validation: refill without a patient ID stays on the counter', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue({ items: [] });
    renderPage();
    await screen.findByRole('status');
    await user.click(screen.getByRole('button', { name: 'New ward issue' }));
    await user.selectOptions(screen.getByLabelText('Ward'), 'w1');
    await user.selectOptions(screen.getByLabelText('Reason'), 'PATIENT_REFILL');
    await user.selectOptions(screen.getByLabelText('Medicine'), 'p1');
    await waitFor(() => expect(screen.getByLabelText('Batch')).toHaveValue('batch-1'));
    await user.type(screen.getByLabelText('Qty'), '2');
    await user.click(screen.getByRole('button', { name: 'Record this issue' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Patient refill needs an admitted patient ID.',
    );
    expect(createMock).not.toHaveBeenCalled();
  });

  it('denied: staff cannot issue to a ward', async () => {
    listMock.mockRejectedValue(new ApiError('Forbidden', 403, 'FORBIDDEN'));
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'You cannot issue to a ward at this counter.',
    );
  });

  it('conflict: already-issued indent shows reload copy', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue({ items: [] });
    createMock.mockRejectedValue(new ApiError('Conflict', 409, 'STALE_STATE'));
    renderPage();
    await screen.findByRole('status');
    await fillIssueForm(user);
    await user.click(screen.getByRole('button', { name: 'Record this issue' }));
    expect(
      (await screen.findAllByRole('alert')).some((node) =>
        node.textContent?.includes(
          'That indent was already issued. Reload and open the hospital invoice.',
        ),
      ),
    ).toBe(true);
  });

  it('failure: cannot load ward issues', async () => {
    listMock.mockRejectedValue(new Error('network'));
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not load ward issues. Try again.',
    );
  });

  it('success: record a ward issue and restore focus', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValueOnce({ items: [] }).mockResolvedValueOnce({ items: [issue] });
    createMock.mockResolvedValue(issue);
    renderPage();
    await screen.findByRole('status');
    const recordButton = screen.getByRole('button', { name: 'New ward issue' });
    await fillIssueForm(user);
    await user.click(screen.getByRole('button', { name: 'Record this issue' }));
    await waitFor(() => expect(createMock).toHaveBeenCalled());
    expect(await screen.findByRole('alert')).toHaveTextContent('Hospital invoice recorded.');
    await waitFor(() => expect(recordButton).toHaveFocus());
    expect(createMock.mock.calls[0]?.[0]).toMatchObject({
      wardId: 'w1',
      indentId: null,
      reason: 'FLOOR_STOCK',
      lines: [{ productId: 'p1', batchId: 'batch-1', quantity: 10 }],
    });
  });

  it('no_branch: asks to select an outlet first', async () => {
    renderPage(['HOSPITAL'], '/hospital-issues', null);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Select an outlet before issuing to a ward.',
    );
    expect(listMock).not.toHaveBeenCalled();
  });

  it('plan_limit: shows upgrade link without hospital module', async () => {
    renderPage([]);
    expect(await screen.findByRole('alert')).toHaveTextContent('Issue to ward is on the Pro plan.');
    expect(screen.getByRole('link', { name: 'Open the plan' })).toHaveAttribute(
      'href',
      '/subscription',
    );
    expect(listMock).not.toHaveBeenCalled();
  });

  it('CREDIT_LIMIT: copy says stock and indent are unchanged', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue({ items: [] });
    createMock.mockRejectedValue(new ApiError('Limit', 422, 'CREDIT_LIMIT'));
    renderPage();
    await screen.findByRole('status');
    await fillIssueForm(user);
    await user.click(screen.getByRole('button', { name: 'Record this issue' }));
    expect(
      (await screen.findAllByText(/Hospital credit limit would be exceeded. Stock and the indent are unchanged./))
        .length,
    ).toBeGreaterThan(0);
  });

  it('?indent= prefills ward, patient, and FEFO medicine lines', async () => {
    listMock.mockResolvedValue({ items: [] });
    renderPage(['HOSPITAL'], '/hospital-issues?indent=i2');
    await screen.findByRole('dialog');
    await waitFor(() => expect(indentMock).toHaveBeenCalledWith('i2'));
    expect(screen.getByLabelText('Ward')).toHaveValue('w1');
    expect(screen.getByLabelText('Patient name')).toHaveValue('Ravi Kumar');
    expect(screen.getByLabelText('Medicine')).toHaveValue('p1');
    await waitFor(() => expect(screen.getByLabelText('Batch')).toHaveValue('batch-1'));
    expect(screen.getByLabelText('Qty')).toHaveValue('10');
    expect(screen.getByLabelText('Batch')).toHaveTextContent('FEFO suggested');
  });

  it('PDF overlay prints the hospital invoice', async () => {
    listMock.mockResolvedValue({ items: [issue] });
    let resolvePdf: ((blob: Blob) => void) | undefined;
    pdfMock.mockReturnValue(
      new Promise((resolve) => {
        resolvePdf = resolve;
      }),
    );
    const user = userEvent.setup();
    renderPage();
    const detail = await screen.findByLabelText('Hospital invoice');
    expect(within(detail).getByText('WS/2026-27/BR1/00001')).toBeInTheDocument();
    expect(within(detail).getByText(/Billed to hospital/)).toBeInTheDocument();
    expect(within(detail).getByText(/Pharmacy GSTIN/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Print this bill' }));
    expect(screen.getByText('Preparing the A4 hospital invoice…')).toBeInTheDocument();
    resolvePdf?.(new Blob(['pdf']));
    await waitFor(() =>
      expect(openPdfMock).toHaveBeenCalledWith(expect.any(Blob), 'WS/2026-27/BR1/00001.pdf', true),
    );
    expect(pdfMock).toHaveBeenCalledWith('iss1');
  });
});
