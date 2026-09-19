import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ReturnsScreen from '@/screens/returns/ReturnsScreen';
import { ApiError } from '@/services/axios';
import type { SalesInvoice } from '@/services/salesInvoices';
import type { SalesReturn } from '@/services/salesReturns';
import { returnsReducer } from '@/screens/returns/store';
import { authReducer } from '@/store';

vi.mock('@/services/salesReturns', async () => {
  const axios = await import('@/services/axios');
  return {
    listSalesReturns: vi.fn(),
    getSalesReturn: vi.fn(),
    previewSalesReturn: vi.fn(),
    createSalesReturn: vi.fn(),
    ApiError: axios.ApiError,
    isApiError: axios.isApiError,
  };
});

vi.mock('@/services/salesInvoices', async () => {
  const axios = await import('@/services/axios');
  return {
    listSalesInvoices: vi.fn(),
    getSalesInvoice: vi.fn(),
    ApiError: axios.ApiError,
    isApiError: axios.isApiError,
  };
});

import { getSalesInvoice, listSalesInvoices } from '@/services/salesInvoices';
import { createSalesReturn, listSalesReturns, previewSalesReturn } from '@/services/salesReturns';

const listReturnsMock = vi.mocked(listSalesReturns);
const createMock = vi.mocked(createSalesReturn);
const previewMock = vi.mocked(previewSalesReturn);
const listInvoicesMock = vi.mocked(listSalesInvoices);
const getInvoiceMock = vi.mocked(getSalesInvoice);

const invoice: SalesInvoice = {
  id: 'inv-1',
  tenantId: 't1',
  branchId: 'b1',
  invoiceNumber: 'INV/2026-27/BR01/00012',
  status: 'COMPLETED',
  staffUserId: 'u1',
  terminalId: 'term-1',
  customerId: 'c1',
  doctorId: null,
  prescriptionReference: null,
  prescriptionVerified: false,
  version: 2,
  subtotalPaise: 40000,
  discountPaise: 0,
  taxPaise: 4800,
  totalPaise: 44800,
  billDiscountType: 'NONE',
  billDiscountValue: 0,
  customerGstin: null,
  taxJurisdiction: 'INTRA',
  cgstPaise: 2400,
  sgstPaise: 2400,
  igstPaise: 0,
  roundOffPaise: 0,
  discountApprovalRequestId: null,
  discountApprovalStatus: 'NOT_REQUIRED',
  taxAdjustmentReason: null,
  taxAdjusted: false,
  amountPaidPaise: 44800,
  amountDuePaise: 0,
  changePaise: 0,
  completedAt: '2026-09-05T08:00:00Z',
  payments: [{ mode: 'CASH', amountPaise: 44800, reference: null }],
  lines: [
    {
      id: 'line-1',
      productId: 'p1',
      productName: 'Return Pack',
      sku: 'RET-1',
      batchId: 'batch-1',
      batchNumber: 'LOT-RET-1',
      expiresOn: '2027-06-30',
      quantity: 4,
      unit: 'Tablet',
      baseQuantity: 4,
      mrpPaise: 12000,
      sellingPricePaise: 10000,
      discountPaise: 0,
      discountType: 'FLAT',
      discountValue: 0,
      billDiscountPaise: 0,
      hsnCode: '30049099',
      taxCategory: 'GST-12',
      gstRate: 12,
      gstRateSource: 'PRODUCT',
      originalGstRate: 12,
      cgstPaise: 2400,
      sgstPaise: 2400,
      igstPaise: 0,
      lineTaxablePaise: 40000,
      lineTaxPaise: 4800,
      lineTotalPaise: 44800,
    },
  ],
  createdAt: '2026-09-05T08:00:00Z',
  updatedAt: '2026-09-05T08:00:00Z',
};

const preview: SalesReturn = {
  id: null,
  salesInvoiceId: invoice.id,
  invoiceNumber: invoice.invoiceNumber,
  customerId: invoice.customerId,
  reason: 'Wrong strength',
  decision: 'APPROVED',
  refundMode: 'CASH',
  refundTotalPaise: 11200,
  cashRefundPaise: 11200,
  creditNotePaise: 0,
  createdAt: null,
  lines: [
    {
      id: null,
      salesInvoiceLineId: 'line-1',
      productId: 'p1',
      productName: 'Return Pack',
      sku: 'RET-1',
      batchId: 'batch-1',
      batchNumber: 'LOT-RET-1',
      quantity: 1,
      lineTotalPaise: 44800,
      refundAmountPaise: 11200,
      stockMovementId: null,
    },
  ],
};

function renderPage(modules: string[] = ['SALES']) {
  const store = configureStore({
    reducer: { auth: authReducer, returns: returnsReducer },
    preloadedState: {
      auth: {
        user: {
          userId: 'u1',
          displayName: 'Owner',
          role: 'pharmacy_owner',
          tenantId: 't1',
          pinSet: true,
          tenantStatus: 'ACTIVE',
          emailVerified: true,
          modules,
          activeBranchId: 'b1',
        },
      },
    },
  });
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <ReturnsScreen />
      </MemoryRouter>
    </Provider>,
  );
}

async function openBill() {
  const user = userEvent.setup();
  await user.click(await screen.findByRole('button', { name: 'New return' }));
  fireEvent.change(screen.getByLabelText('Collected bill number'), {
    target: { value: invoice.invoiceNumber },
  });
  await user.click(screen.getByRole('button', { name: 'Find bill' }));
  expect(await screen.findByText(invoice.invoiceNumber)).toBeVisible();
  return user;
}

describe('counter returns', () => {
  beforeEach(() => {
    listReturnsMock.mockReset();
    createMock.mockReset();
    previewMock.mockReset();
    listInvoicesMock.mockReset();
    getInvoiceMock.mockReset();
    listReturnsMock.mockResolvedValue({ items: [] });
    listInvoicesMock.mockResolvedValue({ items: [invoice] });
  });

  it('loading: waits for collected bills', () => {
    listInvoicesMock.mockReturnValue(new Promise(() => undefined));
    renderPage();
    expect(
      screen.getByText('Loading returns at this outlet…'),
    ).toBeInTheDocument();
  });

  it('empty: no collected bills yet', async () => {
    listInvoicesMock.mockResolvedValue({ items: [] });
    renderPage();
    expect(await screen.findByText('No returns yet')).toBeInTheDocument();
  });

  it('denied: till without Sales cannot take a sale back', () => {
    renderPage(['INVENTORY']);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Sales module is required to take returns.',
    );
    expect(listInvoicesMock).not.toHaveBeenCalled();
  });

  it('validation: bill number is required before find', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'New return' }));
    await user.click(screen.getByRole('button', { name: 'Find bill' }));
    expect(
      screen.getAllByText('Type a collected bill number first.').length,
    ).toBeGreaterThan(0);
    expect(createMock).not.toHaveBeenCalled();
  });

  it('conflict: replayed request used a different qty', async () => {
    createMock.mockRejectedValue(new ApiError('used', 409, 'IDEMPOTENCY_CONFLICT'));
    renderPage();
    await screen.findByRole('button', { name: 'New return' });
    const user = await openBill();
    fireEvent.change(screen.getByLabelText('Return quantity for Return Pack'), {
      target: { value: '1' },
    });
    fireEvent.change(screen.getByLabelText('Why is this coming back'), {
      target: { value: 'Wrong strength' },
    });
    await user.click(screen.getByRole('button', { name: 'Record return' }));
    expect(
      (await screen.findAllByText(/this return request was already used with a different qty/i))
        .length,
    ).toBeGreaterThan(0);
  });

  it('failure: list network error', async () => {
    listInvoicesMock.mockRejectedValue(new Error('network'));
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not load returns. Try again.',
    );
  });

  it('success: cash refund restocks the originating batch', async () => {
    previewMock.mockResolvedValue(preview);
    createMock.mockResolvedValue({
      ...preview,
      id: 'ret-1',
      createdAt: '2026-09-05T09:00:00Z',
    });
    listReturnsMock.mockResolvedValueOnce({ items: [] }).mockResolvedValue({
      items: [
        {
          id: 'ret-1',
          salesInvoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          customerId: invoice.customerId,
          reason: 'Wrong strength',
          decision: 'APPROVED',
          refundMode: 'CASH',
          refundTotalPaise: 11200,
          createdAt: '2026-09-05T09:00:00Z',
        },
      ],
    });
    renderPage();
    await screen.findByRole('button', { name: 'New return' });
    const user = await openBill();
    fireEvent.change(screen.getByLabelText('Return quantity for Return Pack'), {
      target: { value: '1' },
    });
    fireEvent.change(screen.getByLabelText('Why is this coming back'), {
      target: { value: 'Wrong strength' },
    });
    await user.click(screen.getByRole('button', { name: 'Preview refund' }));
    expect(await screen.findByText('Refund & restock')).toBeVisible();
    expect(screen.getByText('Restock 1 Return Pack to batch LOT-RET-1')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Record return' }));
    expect(
      (
        await screen.findAllByText(
          'Return recorded. Stock is back on the originating batch and the refund is ready.',
        )
      ).length,
    ).toBeGreaterThan(0);
    await waitFor(() => expect(createMock).toHaveBeenCalled());
    expect(createMock.mock.calls[0][0]).toMatchObject({
      salesInvoiceId: 'inv-1',
      refundMode: 'CASH',
      reason: 'Wrong strength',
      lines: [{ salesInvoiceLineId: 'line-1', quantity: 1 }],
    });
    expect(screen.getByLabelText('Collected bill number')).toBeInTheDocument();
  });

  it('validation: over-return from the server', async () => {
    createMock.mockRejectedValue(new ApiError('too many', 422, 'OVER_RETURN'));
    renderPage();
    await screen.findByRole('button', { name: 'New return' });
    const user = await openBill();
    fireEvent.change(screen.getByLabelText('Return quantity for Return Pack'), {
      target: { value: '9' },
    });
    fireEvent.change(screen.getByLabelText('Why is this coming back'), {
      target: { value: 'Damaged' },
    });
    await user.click(screen.getByRole('button', { name: 'Record return' }));
    expect(
      (
        await screen.findAllByText(
          'Cannot take back more than what is still sold on this bill.',
        )
      ).length,
    ).toBeGreaterThan(0);
  });
});
