import { configureStore } from '@reduxjs/toolkit';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import HospitalBillingScreen from '@/screens/hospital-billing/HospitalBillingScreen';
import { ApiError } from '@/services/axios';
import { authReducer } from '@/store';
import type {
  HospitalAccount,
  HospitalIssue,
  HospitalPriceList,
  HospitalStatement,
  HospitalWardStockItem,
} from '@/services/hospital';

vi.mock('@/services/hospital', () => ({
  getHospitalAccount: vi.fn(),
  getHospitalPrices: vi.fn(),
  saveHospitalAccount: vi.fn(),
  saveHospitalPrices: vi.fn(),
  getHospitalWardStock: vi.fn(),
  createHospitalReturn: vi.fn(),
  getHospitalStatement: vi.fn(),
  downloadHospitalStatement: vi.fn(),
  recordHospitalPayment: vi.fn(),
  sendHospitalReminder: vi.fn(),
  getHospitalIssues: vi.fn(),
  getHospitalIssue: vi.fn(),
  isApiError: (error: unknown) => error instanceof ApiError,
}));

import {
  createHospitalReturn,
  downloadHospitalStatement,
  getHospitalAccount,
  getHospitalIssue,
  getHospitalIssues,
  getHospitalPrices,
  getHospitalStatement,
  getHospitalWardStock,
  recordHospitalPayment,
  saveHospitalAccount,
  saveHospitalPrices,
  sendHospitalReminder,
} from '@/services/hospital';

const accountMock = vi.mocked(getHospitalAccount);
const pricesMock = vi.mocked(getHospitalPrices);
const saveAccountMock = vi.mocked(saveHospitalAccount);
const savePricesMock = vi.mocked(saveHospitalPrices);
const stockMock = vi.mocked(getHospitalWardStock);
const returnMock = vi.mocked(createHospitalReturn);
const statementMock = vi.mocked(getHospitalStatement);
const exportMock = vi.mocked(downloadHospitalStatement);
const paymentMock = vi.mocked(recordHospitalPayment);
const reminderMock = vi.mocked(sendHospitalReminder);
const issuesMock = vi.mocked(getHospitalIssues);
const issueMock = vi.mocked(getHospitalIssue);

const emptyAccount: HospitalAccount = {
  configured: false,
  id: null,
  institutionName: null,
  gstin: null,
  storesContact: null,
  billingPhone: null,
  billingEmail: null,
  creditTerms: null,
  creditLimitPaise: 0,
  balancePaise: 0,
  availableCreditPaise: 0,
  uniformDiscountBps: 0,
  pendingPriceListApprovalRequestId: null,
  version: 0,
};

const readyAccount: HospitalAccount = {
  ...emptyAccount,
  configured: true,
  id: 'a1',
  institutionName: 'City Care',
  creditTerms: 'NET_30',
  creditLimitPaise: 1000000,
  availableCreditPaise: 1000000,
  version: 1,
};

const priceList: HospitalPriceList = {
  uniformDiscountBps: 500,
  pendingApprovalRequestId: null,
  items: [
    {
      productId: 'p1',
      productName: 'Dolo',
      sku: 'SKU-1',
      mrpPaise: 10000,
      creditPricePaise: 9500,
      effectiveDiscountBps: 500,
      ruleType: null,
      ruleValue: null,
    },
  ],
};

const stockItem: HospitalWardStockItem = {
  wardId: 'w1',
  wardName: 'ICU',
  productId: 'p1',
  productName: 'Dolo',
  sku: 'SKU-1',
  quantity: 4,
  creditPricePaise: 9500,
  valuePaise: 38000,
};

const issue: HospitalIssue = {
  id: 'iss1',
  invoiceNumber: 'WS-1',
  wardId: 'w1',
  wardName: 'ICU',
  reason: 'FLOOR_STOCK',
  creditTerms: 'NET_30',
  mrpValuePaise: 38000,
  billedPaise: 38000,
  issuedAt: '2026-09-01T04:00:00Z',
  version: 1,
  lines: [
    {
      id: 'l1',
      productId: 'p1',
      productName: 'Dolo',
      sku: 'SKU-1',
      batchId: 'b1',
      batchNumber: 'LOT-1',
      expiryOn: '2027-01-31',
      hsnCode: '3004',
      gstRate: 12,
      quantity: 4,
      mrpPaise: 10000,
      creditPricePaise: 9500,
      discountBps: 500,
      amountPaise: 38000,
    },
  ],
};

const statement: HospitalStatement = {
  openingPaise: 0,
  suppliedPaise: 38000,
  creditsPaise: 0,
  closingPaise: 38000,
  balancePaise: 38000,
  accountVersion: 2,
  institutionName: 'City Care',
  ageing: {
    d0_30: 38000,
    d31_60: 0,
    d61_90: 0,
    d90Plus: 0,
    overduePaise: 0,
    oldestDaysPastDue: 0,
  },
  lines: [
    {
      occurredAt: '2026-09-01T04:00:00Z',
      kind: 'ISSUE',
      particulars: 'WS-1 issued',
      debitPaise: 38000,
      creditPaise: 0,
      balancePaise: 38000,
    },
  ],
};

function renderPage(
  modules: string[] = ['HOSPITAL'],
  options?: { view?: string; role?: string; desks?: string[] },
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
  const path = options?.view ? `/hospital-billing?view=${options.view}` : '/hospital-billing';
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[path]}>
        <HospitalBillingScreen />
      </MemoryRouter>
    </Provider>,
  );
}

async function fillReturn(user: ReturnType<typeof userEvent.setup>) {
  await user.selectOptions(await screen.findByLabelText('Hospital invoice'), 'iss1');
  await user.selectOptions(await screen.findByLabelText('Medicine'), 'p1');
  await user.type(screen.getByLabelText('Return quantity'), '2');
  await user.click(screen.getByRole('button', { name: 'Record this return' }));
}

describe('HospitalBillingScreen', () => {
  beforeEach(() => {
    accountMock.mockReset();
    pricesMock.mockReset();
    saveAccountMock.mockReset();
    savePricesMock.mockReset();
    stockMock.mockReset();
    returnMock.mockReset();
    statementMock.mockReset();
    exportMock.mockReset();
    paymentMock.mockReset();
    reminderMock.mockReset();
    issuesMock.mockReset();
    issueMock.mockReset();
    issuesMock.mockResolvedValue({ items: [issue] });
    issueMock.mockResolvedValue(issue);
    URL.createObjectURL = vi.fn(() => 'blob:hospital-statement');
    URL.revokeObjectURL = vi.fn();
  });

  it('loading: waits for hospital billing', () => {
    accountMock.mockReturnValue(new Promise(() => undefined));
    renderPage();
    expect(screen.getByRole('status')).toHaveTextContent('Loading hospital billing');
  });

  it('empty: prompts to set up bill-to institution', async () => {
    accountMock.mockResolvedValue(emptyAccount);
    renderPage();
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Set up the bill-to institution first',
    );
    expect(pricesMock).not.toHaveBeenCalled();
  });

  it('validation: institution name is required', async () => {
    const user = userEvent.setup();
    accountMock.mockResolvedValue(emptyAccount);
    renderPage();
    await screen.findByRole('status');
    await user.click(screen.getByRole('button', { name: 'Save account' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Institution name and credit terms are required',
    );
    expect(saveAccountMock).not.toHaveBeenCalled();
  });

  it('denied: staff cannot open hospital billing', async () => {
    accountMock.mockRejectedValue(new ApiError('Forbidden', 403, 'FORBIDDEN'));
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'You cannot change hospital billing at this counter',
    );
  });

  it('conflict: stale account save', async () => {
    const user = userEvent.setup();
    accountMock.mockResolvedValue(readyAccount);
    pricesMock.mockResolvedValue(priceList);
    saveAccountMock.mockRejectedValue(new ApiError('stale', 409, 'STALE_STATE'));
    renderPage();
    expect(await screen.findByDisplayValue('City Care')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save account' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Someone else updated hospital billing',
    );
  });

  it('failure: cannot load hospital billing', async () => {
    accountMock.mockRejectedValue(new ApiError('down', 500, 'INTERNAL_ERROR'));
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not load hospital billing. Try again.',
    );
  });

  it('success: saves bill-to institution and restores focus', async () => {
    const user = userEvent.setup();
    accountMock.mockResolvedValueOnce(emptyAccount).mockResolvedValue(readyAccount);
    pricesMock.mockResolvedValue(priceList);
    saveAccountMock.mockResolvedValue(readyAccount);
    renderPage();
    await screen.findByRole('status');
    const institution = screen.getByRole('textbox', { name: 'Bill-to institution' });
    await user.type(institution, 'City Care');
    const saveButton = screen.getByRole('button', { name: 'Save account' });
    await user.click(saveButton);
    expect(await screen.findByRole('status')).toHaveTextContent('Bill-to institution saved.');
    await waitFor(() => expect(saveButton).toHaveFocus());
  });

  it('plan_limit: shows upgrade link without hospital module', async () => {
    renderPage([]);
    expect(await screen.findByRole('alert')).toHaveTextContent('Hospital billing is on the Pro plan');
    expect(screen.getByRole('link', { name: 'Open the plan' })).toHaveAttribute(
      'href',
      '/subscription',
    );
    expect(accountMock).not.toHaveBeenCalled();
  });

  it('success: accountant price list waits on owner sign-off', async () => {
    const user = userEvent.setup();
    accountMock.mockResolvedValue(readyAccount);
    pricesMock.mockResolvedValue(priceList);
    savePricesMock.mockResolvedValue({
      status: 'PENDING_APPROVAL',
      approvalRequestId: 'req-1',
      priceList,
    });
    renderPage();
    const discount = await screen.findByRole('textbox', { name: 'Uniform discount (%)' });
    await user.clear(discount);
    await user.type(discount, '12');
    await user.click(screen.getByRole('button', { name: 'Save price list' }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Price list sent for owner sign-off.',
    );
  });

  it('success: saves credit price list when account exists', async () => {
    const user = userEvent.setup();
    accountMock.mockResolvedValue(readyAccount);
    pricesMock.mockResolvedValue(priceList);
    savePricesMock.mockResolvedValue({
      status: 'APPLIED',
      approvalRequestId: null,
      priceList: { ...priceList, uniformDiscountBps: 1000 },
    });
    renderPage();
    const discount = await screen.findByRole('textbox', { name: 'Uniform discount (%)' });
    await user.clear(discount);
    await user.type(discount, '10');
    await user.click(screen.getByRole('button', { name: 'Save price list' }));
    expect(savePricesMock).toHaveBeenCalledWith({ uniformDiscountBps: 1000 });
    expect(await screen.findByRole('status')).toHaveTextContent('Credit price list saved.');
    expect(within(screen.getByRole('table')).getByText('Dolo')).toBeInTheDocument();
  });

  it('loading: waits for ward stock', () => {
    stockMock.mockReturnValue(new Promise(() => undefined));
    renderPage(['HOSPITAL'], { view: 'stock' });
    expect(screen.getByRole('status')).toHaveTextContent('Loading ward stock');
  });

  it('empty: no ward-held stock on this outlet', async () => {
    stockMock.mockResolvedValue({ items: [] });
    renderPage(['HOSPITAL'], { view: 'stock' });
    expect(await screen.findByText('No ward-held stock on this outlet.')).toBeInTheDocument();
  });

  it('validation: return needs an invoice and quantity', async () => {
    const user = userEvent.setup();
    stockMock.mockResolvedValue({ items: [stockItem] });
    renderPage(['HOSPITAL'], { view: 'stock' });
    await screen.findByText('ICU');
    await user.click(screen.getByRole('button', { name: 'Record return' }));
    await screen.findByRole('dialog');
    await user.click(screen.getByRole('button', { name: 'Record this return' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Pick a hospital invoice and a quantity still held on the ward.',
    );
    expect(returnMock).not.toHaveBeenCalled();
  });

  it('denied: staff cannot open ward stock', async () => {
    stockMock.mockRejectedValue(new ApiError('Forbidden', 403, 'FORBIDDEN'));
    renderPage(['HOSPITAL'], { view: 'stock' });
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'You cannot change hospital billing at this counter',
    );
  });

  it('conflict: duplicate return key', async () => {
    const user = userEvent.setup();
    stockMock.mockResolvedValue({ items: [stockItem] });
    returnMock.mockRejectedValue(new ApiError('conflict', 409, 'IDEMPOTENCY_CONFLICT'));
    renderPage(['HOSPITAL'], { view: 'stock' });
    await screen.findByText('ICU');
    await user.click(screen.getByRole('button', { name: 'Record return' }));
    await fillReturn(user);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Someone else updated hospital billing',
    );
  });

  it('failure: cannot load ward stock', async () => {
    stockMock.mockRejectedValue(new ApiError('down', 500, 'INTERNAL_ERROR'));
    renderPage(['HOSPITAL'], { view: 'stock' });
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not load hospital billing. Try again.',
    );
  });

  it('success: records a ward return and restores focus', async () => {
    const user = userEvent.setup();
    stockMock
      .mockResolvedValueOnce({ items: [stockItem] })
      .mockResolvedValue({ items: [{ ...stockItem, quantity: 2, valuePaise: 19000 }] });
    returnMock.mockResolvedValue({
      id: 'r1',
      issueId: 'iss1',
      invoiceNumber: 'WS-1',
      wardId: 'w1',
      wardName: 'ICU',
      creditPaise: 19000,
      occurredAt: '2026-09-20T10:00:00Z',
      lines: [{ id: 'rl1', productId: 'p1', productName: 'Dolo', quantity: 2, amountPaise: 19000 }],
    });
    renderPage(['HOSPITAL'], { view: 'stock' });
    await screen.findByText('ICU');
    const trigger = screen.getByRole('button', { name: 'Record return' });
    await user.click(trigger);
    await fillReturn(user);
    expect(returnMock).toHaveBeenCalledWith(
      expect.objectContaining({
        issueId: 'iss1',
        lines: [{ productId: 'p1', quantity: 2 }],
      }),
    );
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Unused ward stock returned to this outlet.',
    );
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('validation: over-return stays on the ward', async () => {
    const user = userEvent.setup();
    stockMock.mockResolvedValue({ items: [stockItem] });
    returnMock.mockRejectedValue(new ApiError('over', 422, 'OVER_RETURN'));
    renderPage(['HOSPITAL'], { view: 'stock' });
    await screen.findByText('ICU');
    await user.click(screen.getByRole('button', { name: 'Record return' }));
    await fillReturn(user);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Cannot return more than the ward still holds from this invoice.',
    );
  });

  it('loading: waits for hospital statement', () => {
    statementMock.mockReturnValue(new Promise(() => undefined));
    renderPage(['HOSPITAL'], { view: 'statement' });
    expect(screen.getByRole('status')).toHaveTextContent('Loading hospital statement');
  });

  it('empty: no hospital invoices in this period', async () => {
    statementMock.mockResolvedValue({ ...statement, lines: [], suppliedPaise: 0, closingPaise: 0, balancePaise: 0 });
    renderPage(['HOSPITAL'], { view: 'statement' });
    expect(
      await screen.findByText('No hospital invoices, returns, or payments in this period.'),
    ).toBeInTheDocument();
  });

  it('validation: payment amount is required', async () => {
    const user = userEvent.setup();
    statementMock.mockResolvedValue(statement);
    renderPage(['HOSPITAL'], { view: 'statement' });
    await screen.findByText('WS-1 issued');
    await user.click(screen.getByRole('button', { name: 'Record payment' }));
    await screen.findByRole('dialog');
    await user.click(screen.getByRole('button', { name: 'Post payment' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Enter an amount the hospital still owes.',
    );
    expect(paymentMock).not.toHaveBeenCalled();
  });

  it('denied: inventory cannot open hospital statement', async () => {
    statementMock.mockRejectedValue(new ApiError('Forbidden', 403, 'FORBIDDEN'));
    renderPage(['HOSPITAL'], {
      view: 'statement',
      role: 'pharmacy_staff',
      desks: ['inventory'],
    });
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'You cannot change hospital billing at this counter',
    );
  });

  it('conflict: stale hospital payment', async () => {
    const user = userEvent.setup();
    statementMock.mockResolvedValue(statement);
    paymentMock.mockRejectedValue(new ApiError('stale', 409, 'STALE_STATE'));
    renderPage(['HOSPITAL'], { view: 'statement' });
    await screen.findByText('WS-1 issued');
    await user.click(screen.getByRole('button', { name: 'Record payment' }));
    await user.type(await screen.findByLabelText('Amount (₹)'), '100');
    await user.click(screen.getByRole('button', { name: 'Post payment' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Someone else updated hospital billing',
    );
  });

  it('failure: cannot load hospital statement', async () => {
    statementMock.mockRejectedValue(new ApiError('down', 500, 'INTERNAL_ERROR'));
    renderPage(['HOSPITAL'], { view: 'statement' });
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not load hospital billing. Try again.',
    );
  });

  it('success: posts a hospital payment and restores focus', async () => {
    const user = userEvent.setup();
    statementMock
      .mockResolvedValueOnce(statement)
      .mockResolvedValue({ ...statement, creditsPaise: 10000, closingPaise: 28000, balancePaise: 28000 });
    paymentMock.mockResolvedValue({
      id: 'pay1',
      amountPaise: 10000,
      mode: 'UPI',
      reference: 'UTR-1',
      balancePaise: 28000,
      accountVersion: 3,
      occurredAt: '2026-09-20T10:00:00Z',
    });
    renderPage(['HOSPITAL'], { view: 'statement' });
    await screen.findByText('WS-1 issued');
    const trigger = screen.getByRole('button', { name: 'Record payment' });
    await user.click(trigger);
    await user.type(await screen.findByLabelText('Amount (₹)'), '100');
    await user.type(screen.getByLabelText('Reference'), 'UTR-1');
    await user.click(screen.getByRole('button', { name: 'Post payment' }));
    expect(paymentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        amountPaise: 10000,
        mode: 'UPI',
        reference: 'UTR-1',
        expectedAccountVersion: 2,
      }),
    );
    expect(await screen.findByRole('status')).toHaveTextContent('Hospital payment posted.');
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('validation: overpayment is more than the hospital owes', async () => {
    const user = userEvent.setup();
    statementMock.mockResolvedValue(statement);
    paymentMock.mockRejectedValue(new ApiError('over', 422, 'OVERPAYMENT'));
    renderPage(['HOSPITAL'], { view: 'statement' });
    await screen.findByText('WS-1 issued');
    await user.click(screen.getByRole('button', { name: 'Record payment' }));
    await user.type(await screen.findByLabelText('Amount (₹)'), '500');
    await user.click(screen.getByRole('button', { name: 'Post payment' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Payment is more than the hospital still owes.',
    );
  });

  it('success: sends a hospital overdue reminder', async () => {
    const user = userEvent.setup();
    statementMock.mockResolvedValue({
      ...statement,
      ageing: { ...statement.ageing, overduePaise: 38000, oldestDaysPastDue: 40 },
    });
    reminderMock.mockResolvedValue({ sent: true, replayed: false });
    renderPage(['HOSPITAL'], { view: 'statement' });
    await screen.findByText('WS-1 issued');
    const trigger = screen.getByRole('button', { name: 'Send reminder' });
    await user.click(trigger);
    expect(reminderMock).toHaveBeenCalled();
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Reminder sent to the hospital account desk.',
    );
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('success: downloads hospital statement Excel', async () => {
    const user = userEvent.setup();
    statementMock.mockResolvedValue(statement);
    exportMock.mockResolvedValue(new Blob(['date,particulars'], { type: 'text/csv' }));
    renderPage(['HOSPITAL'], { view: 'statement' });
    await screen.findByText('WS-1 issued');
    await user.click(screen.getByRole('button', { name: 'Excel' }));
    await waitFor(() => expect(exportMock).toHaveBeenCalledWith('csv'));
    expect(await screen.findByRole('status')).toHaveTextContent('Hospital statement downloaded.');
  });

  it('success: downloads hospital statement PDF', async () => {
    const user = userEvent.setup();
    statementMock.mockResolvedValue(statement);
    exportMock.mockResolvedValue(new Blob(['%PDF'], { type: 'application/pdf' }));
    renderPage(['HOSPITAL'], { view: 'statement' });
    await screen.findByText('WS-1 issued');
    await user.click(screen.getByRole('button', { name: 'PDF' }));
    await waitFor(() => expect(exportMock).toHaveBeenCalledWith('pdf'));
    expect(await screen.findByRole('status')).toHaveTextContent('Hospital statement downloaded.');
  });

  it('validation: reminder is not sent when nothing is overdue', async () => {
    const user = userEvent.setup();
    statementMock.mockResolvedValue(statement);
    reminderMock.mockRejectedValue(new ApiError('nothing', 422, 'NOTHING_DUE'));
    renderPage(['HOSPITAL'], { view: 'statement' });
    await screen.findByText('WS-1 issued');
    await user.click(screen.getByRole('button', { name: 'Send reminder' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Nothing is due on the hospital account.',
    );
  });

  it('success: accountant can open the statement', async () => {
    statementMock.mockResolvedValue(statement);
    renderPage(['HOSPITAL'], {
      view: 'statement',
      role: 'pharmacy_staff',
      desks: ['accountant'],
    });
    expect(await screen.findByText('WS-1 issued')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Record payment' })).toBeInTheDocument();
  });

  it('denied: inventory can open stock but not payment', async () => {
    stockMock.mockResolvedValue({ items: [stockItem] });
    renderPage(['HOSPITAL'], {
      view: 'stock',
      role: 'pharmacy_staff',
      desks: ['inventory'],
    });
    expect(await screen.findByText('ICU')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Record return' })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Account & statement' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Record payment' })).not.toBeInTheDocument();
  });
});
