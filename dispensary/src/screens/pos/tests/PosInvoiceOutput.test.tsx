import { configureStore } from '@reduxjs/toolkit';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PosScreen from '@/screens/pos/PosScreen';
import { ApiError } from '@/services/axios';
import { authReducer } from '@/store';

vi.mock('@/services/customers', async () => {
  const axios = await import('@/services/axios');
  return {
    listCustomers: vi.fn(),
    ApiError: axios.ApiError,
    isApiError: axios.isApiError,
  };
});

vi.mock('@/services/products', async () => {
  const axios = await import('@/services/axios');
  return {
    listProducts: vi.fn(),
    ApiError: axios.ApiError,
    isApiError: axios.isApiError,
  };
});

vi.mock('@/services/medicationSafety', async () => {
  const axios = await import('@/services/axios');
  return {
    evaluateMedicationSafety: vi.fn(),
    acknowledgeMedicationSafety: vi.fn(),
    assertMedicationSafetyCleared: vi.fn(),
    ApiError: axios.ApiError,
    isApiError: axios.isApiError,
  };
});

vi.mock('@/services/productUnits', async () => {
  const axios = await import('@/services/axios');
  return {
    listProductUnits: vi.fn(),
    convertProductUnit: vi.fn(),
    replaceProductUnits: vi.fn(),
    ApiError: axios.ApiError,
    isApiError: axios.isApiError,
  };
});

vi.mock('@/services/inventory', async () => {
  const axios = await import('@/services/axios');
  return {
    listStockBatches: vi.fn(),
    ApiError: axios.ApiError,
    isApiError: axios.isApiError,
  };
});

vi.mock('@/services/doctors', async () => {
  const axios = await import('@/services/axios');
  return {
    listDoctors: vi.fn(),
    ApiError: axios.ApiError,
    isApiError: axios.isApiError,
  };
});

vi.mock('@/services/controlledStock', async () => {
  const axios = await import('@/services/axios');
  return {
    verifyControlledStock: vi.fn(),
    listControlledStock: vi.fn(),
    downloadControlledStockExport: vi.fn(),
    ApiError: axios.ApiError,
    isApiError: axios.isApiError,
  };
});

vi.mock('@/services/credit', async () => {
  const axios = await import('@/services/axios');
  return {
    getCustomerCredit: vi.fn(),
    ApiError: axios.ApiError,
    isApiError: axios.isApiError,
  };
});

vi.mock('@/services/salesInvoices', async () => {
  const axios = await import('@/services/axios');
  return {
    createSalesInvoice: vi.fn(),
    updateSalesInvoice: vi.fn(),
    applyInvoicePricing: vi.fn(),
    adjustInvoiceTax: vi.fn(),
    assertInvoicePricingReady: vi.fn(),
    completeSalesInvoice: vi.fn(),
    getPrescriptionFulfillment: vi.fn().mockResolvedValue({ items: [] }),
    listSalesInvoices: vi.fn().mockResolvedValue({ items: [] }),
    holdSalesInvoice: vi.fn(),
    resumeSalesInvoice: vi.fn(),
    listInvoiceOffers: vi.fn().mockResolvedValue({ items: [] }),
    applyInvoiceOffers: vi.fn(),
    downloadInvoicePdf: vi.fn(),
    emailInvoiceCopy: vi.fn(),
    pingSalesInvoiceHealth: vi.fn().mockResolvedValue({ status: 'UP' }),
    openInvoicePdf: vi.fn(),
    ApiError: axios.ApiError,
    isApiError: axios.isApiError,
  };
});

import { getCustomerCredit } from '@/services/credit';
import { listCustomers } from '@/services/customers';
import { listDoctors } from '@/services/doctors';
import { listStockBatches } from '@/services/inventory';
import { listProducts } from '@/services/products';
import { convertProductUnit, listProductUnits } from '@/services/productUnits';
import {
  applyInvoicePricing,
  completeSalesInvoice,
  createSalesInvoice,
  downloadInvoicePdf,
  emailInvoiceCopy,
  openInvoicePdf,
} from '@/services/salesInvoices';

const listCustomersMock = vi.mocked(listCustomers);
const listProductsMock = vi.mocked(listProducts);
const listUnitsMock = vi.mocked(listProductUnits);
const convertMock = vi.mocked(convertProductUnit);
const listBatchesMock = vi.mocked(listStockBatches);
const listDoctorsMock = vi.mocked(listDoctors);
const getCreditMock = vi.mocked(getCustomerCredit);
const createInvoiceMock = vi.mocked(createSalesInvoice);
const applyPricingMock = vi.mocked(applyInvoicePricing);
const completeInvoiceMock = vi.mocked(completeSalesInvoice);
const downloadPdfMock = vi.mocked(downloadInvoicePdf);
const emailCopyMock = vi.mocked(emailInvoiceCopy);
const openPdfMock = vi.mocked(openInvoicePdf);

const customer = {
  id: 'c1',
  tenantId: 't1',
  name: 'Ravi Kumar',
  phone: '9876500001',
  email: 'ravi@patient.local' as string | null,
  dateOfBirth: null,
  gender: null,
  address: null,
  bloodGroup: null,
  allergies: null,
  chronicConditions: null,
  createdAt: '2026-09-04T00:00:00Z',
  updatedAt: '2026-09-04T00:00:00Z',
};

const productA = {
  id: 'p1',
  tenantId: 't1',
  sku: 'SKU-A',
  barcode: null,
  name: 'Penicillin V',
  genericName: 'Penicillin',
  brandName: 'PenV',
  manufacturerId: null,
  categoryId: 'cat1',
  productType: 'Medicine' as const,
  dosageForm: 'Tablet' as const,
  therapeuticClass: null,
  composition: 'Penicillin',
  strength: null,
  route: null,
  prescriptionRequired: false,
  scheduleClassification: null,
  hsnCode: '30049099',
  gstRate: 12,
  baseUnit: 'Tablet' as const,
  packSize: 10,
  packUnit: 'strip' as const,
  packDescription: null,
  storageConditions: null,
  requiresColdStorage: false,
  rackLocation: null,
  reorderLevel: null,
  reorderQuantity: null,
  minimumStock: null,
  isDiscontinued: false,
  isReturnable: true,
  isTaxable: true,
  taxCategory: 'GST-12',
  requiresBatchTracking: false,
  requiresExpiryTracking: false,
  requiresSerialTracking: false,
  controlledSubstance: false,
  notes: null,
  isActive: true,
  createdAt: '2026-09-04T00:00:00Z',
  updatedAt: '2026-09-04T00:00:00Z',
};

const draftInvoice = {
  id: 'inv-1',
  tenantId: 't1',
  branchId: 'b1',
  invoiceNumber: 'INV/2026-27/BR01/00001',
  status: 'DRAFT' as const,
  staffUserId: 'u1',
  terminalId: 'sess-1',
  customerId: null as string | null,
  doctorId: null,
  prescriptionReference: null,
  prescriptionVerified: false,
  version: 1,
  subtotalPaise: 10000,
  discountPaise: 0,
  taxPaise: 1200,
  totalPaise: 11200,
  billDiscountType: 'NONE' as const,
  billDiscountValue: 0,
  customerGstin: null,
  taxJurisdiction: 'INTRA' as const,
  cgstPaise: 600,
  sgstPaise: 600,
  igstPaise: 0,
  roundOffPaise: 0,
  discountApprovalRequestId: null,
  discountApprovalStatus: 'NOT_REQUIRED' as const,
  taxAdjustmentReason: null,
  taxAdjusted: false,
  amountPaidPaise: 0,
  amountDuePaise: 0,
  changePaise: 0,
  completedAt: null,
  payments: [] as {
    mode: 'CASH' | 'CARD' | 'UPI' | 'CREDIT' | 'BANK_TRANSFER';
    amountPaise: number;
    reference: string | null;
  }[],
  lines: [
    {
      id: 'l1',
      productId: 'p1',
      productName: 'Penicillin V',
      sku: 'SKU-A',
      batchId: null,
      batchNumber: null,
      expiresOn: null,
      quantity: 1,
      unit: 'Tablet' as const,
      baseQuantity: 1,
      mrpPaise: 12000,
      sellingPricePaise: 10000,
      discountPaise: 0,
      discountType: 'FLAT' as const,
      discountValue: 0,
      billDiscountPaise: 0,
      hsnCode: '30049099',
      taxCategory: 'GST-12',
      gstRate: 12,
      gstRateSource: 'PRODUCT' as const,
      originalGstRate: 12,
      cgstPaise: 600,
      sgstPaise: 600,
      igstPaise: 0,
      lineTaxablePaise: 10000,
      lineTaxPaise: 1200,
      lineTotalPaise: 11200,
    },
  ],
  createdAt: '2026-09-05T08:00:00Z',
  updatedAt: '2026-09-05T08:00:00Z',
};

function renderPage(modules: string[] = ['SALES', 'CRM', 'INVENTORY']) {
  const store = configureStore({
    reducer: { auth: authReducer },
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
          roles: [],
        },
      },
    },
  });
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <PosScreen />
      </MemoryRouter>
    </Provider>,
  );
}

async function saveWalkInDraft(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByText('Penicillin V');
  await user.click(screen.getByRole('button', { name: /Add Penicillin V/i }));
  await user.type(screen.getByLabelText('MRP ₹'), '120');
  await user.type(screen.getByLabelText('Selling ₹'), '100');
  await user.click(screen.getByRole('button', { name: 'Skip — walk-in' }));
  await user.click(screen.getByRole('button', { name: 'Save bill' }));
  expect(await screen.findByRole('status')).toHaveTextContent('INV/2026-27/BR01/00001');
}

async function collectWalkIn(user: ReturnType<typeof userEvent.setup>) {
  completeInvoiceMock.mockResolvedValue({
    ...draftInvoice,
    status: 'COMPLETED',
    version: 2,
    amountPaidPaise: 11200,
    payments: [{ mode: 'CASH', amountPaise: 11200, reference: null }],
  });
  await saveWalkInDraft(user);
  await user.type(screen.getByLabelText('Cash ₹'), '112');
  await user.click(screen.getByRole('button', { name: 'Collect bill' }));
  expect(await screen.findByRole('status')).toHaveTextContent(
    'Bill INV/2026-27/BR01/00001 collected at this till.',
  );
}

describe('POS A4 invoice output', () => {
  beforeEach(() => {
    listCustomersMock.mockReset();
    listProductsMock.mockReset();
    listUnitsMock.mockReset();
    convertMock.mockReset();
    listBatchesMock.mockReset();
    listDoctorsMock.mockReset();
    getCreditMock.mockReset();
    createInvoiceMock.mockReset();
    applyPricingMock.mockReset();
    completeInvoiceMock.mockReset();
    downloadPdfMock.mockReset();
    emailCopyMock.mockReset();
    openPdfMock.mockReset();
    listCustomersMock.mockResolvedValue([customer]);
    listProductsMock.mockResolvedValue([productA]);
    listDoctorsMock.mockResolvedValue([]);
    listBatchesMock.mockResolvedValue([]);
    getCreditMock.mockResolvedValue({
      customerId: 'c1',
      limitPaise: 50000,
      balancePaise: 0,
      availablePaise: 50000,
      version: 1,
      entries: [],
    });
    listUnitsMock.mockResolvedValue({
      baseUnit: 'Tablet',
      quantityPrecision: 0,
      units: [],
    });
    convertMock.mockResolvedValue({
      quantity: 1,
      unit: 'Tablet',
      baseQuantity: 1,
      baseUnit: 'Tablet',
      displayQuantity: 1,
      displayUnit: 'Tablet',
      conversionVersion: 1,
      factorToBase: 1,
    });
    createInvoiceMock.mockResolvedValue(draftInvoice);
    applyPricingMock.mockResolvedValue(draftInvoice);
    downloadPdfMock.mockResolvedValue(new Blob(['pdf'], { type: 'application/pdf' }));
    emailCopyMock.mockResolvedValue({
      id: 'em-1',
      status: 'QUEUED',
      replayed: false,
      invoiceNumber: 'INV/2026-27/BR01/00001',
    });
  });

  it('loading: print waits on the A4 bill', async () => {
    const user = userEvent.setup();
    downloadPdfMock.mockReturnValue(new Promise(() => undefined));
    renderPage();
    await collectWalkIn(user);
    await user.click(screen.getByRole('button', { name: 'Print this bill' }));
    expect(await screen.findByText('Preparing the A4 bill…')).toBeInTheDocument();
  });

  it('empty: saved draft asks to collect before print', async () => {
    const user = userEvent.setup();
    renderPage();
    await saveWalkInDraft(user);
    expect(screen.getByRole('region', { name: 'Bill copy' })).toHaveTextContent(
      'Collect this bill to print the A4 invoice.',
    );
    expect(screen.getByRole('button', { name: 'Print this bill' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Send bill copy' })).not.toBeInTheDocument();
  });

  it('denied: till without Sales cannot print', () => {
    renderPage(['CRM']);
    expect(screen.getByRole('alert')).toHaveTextContent('This till cannot save Sales bills');
    expect(screen.queryByRole('region', { name: 'Bill copy' })).not.toBeInTheDocument();
  });

  it('validation: walk-in has no send-bill-copy control', async () => {
    const user = userEvent.setup();
    renderPage();
    await collectWalkIn(user);
    expect(screen.queryByRole('button', { name: 'Send bill copy' })).not.toBeInTheDocument();
  });

  it('validation: linked patient without email cannot send a copy', async () => {
    const user = userEvent.setup();
    listCustomersMock.mockResolvedValue([{ ...customer, email: null }]);
    completeInvoiceMock.mockResolvedValue({
      ...draftInvoice,
      status: 'COMPLETED',
      version: 2,
      customerId: 'c1',
      amountPaidPaise: 11200,
      payments: [{ mode: 'CASH', amountPaise: 11200, reference: null }],
    });
    renderPage();
    await screen.findByText('Penicillin V');
    await user.click(screen.getByRole('button', { name: /Add Penicillin V/i }));
    await user.type(screen.getByLabelText('MRP ₹'), '120');
    await user.type(screen.getByLabelText('Selling ₹'), '100');
    await user.click(screen.getByRole('button', { name: /Ravi Kumar/i }));
    await user.click(screen.getByRole('button', { name: 'Save bill' }));
    await user.type(screen.getByLabelText('Cash ₹'), '112');
    await user.click(screen.getByRole('button', { name: 'Collect bill' }));
    await user.click(await screen.findByRole('button', { name: 'Send bill copy' }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'This patient has no email on file. Add one before sending a bill copy.',
    );
    expect(emailCopyMock).not.toHaveBeenCalled();
  });

  it('conflict: stale bill on print', async () => {
    const user = userEvent.setup();
    downloadPdfMock.mockRejectedValue(new ApiError('stale', 409, 'STALE_STATE'));
    renderPage();
    await collectWalkIn(user);
    await user.click(screen.getByRole('button', { name: 'Print this bill' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This bill changed. Refresh, then print again.',
    );
  });

  it('failure: download network error', async () => {
    const user = userEvent.setup();
    downloadPdfMock.mockRejectedValue(new Error('network'));
    renderPage();
    await collectWalkIn(user);
    await user.click(screen.getByRole('button', { name: 'Download A4' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not prepare this A4 bill');
  });

  it('success: print and email restore focus', async () => {
    const user = userEvent.setup();
    completeInvoiceMock.mockResolvedValue({
      ...draftInvoice,
      status: 'COMPLETED',
      version: 2,
      customerId: 'c1',
      amountPaidPaise: 11200,
      payments: [{ mode: 'CASH', amountPaise: 11200, reference: null }],
    });
    renderPage();
    await screen.findByText('Penicillin V');
    await user.click(screen.getByRole('button', { name: /Add Penicillin V/i }));
    await user.type(screen.getByLabelText('MRP ₹'), '120');
    await user.type(screen.getByLabelText('Selling ₹'), '100');
    await user.click(screen.getByRole('button', { name: /Ravi Kumar/i }));
    await user.click(screen.getByRole('button', { name: 'Save bill' }));
    await user.type(screen.getByLabelText('Cash ₹'), '112');
    await user.click(screen.getByRole('button', { name: 'Collect bill' }));
    await user.click(await screen.findByRole('button', { name: 'Print this bill' }));
    await waitFor(() => {
      expect(downloadPdfMock).toHaveBeenCalledWith('inv-1');
      expect(openPdfMock).toHaveBeenCalled();
    });
    expect(await screen.findByText('A4 bill ready.')).toBeInTheDocument();
    expect(screen.getByLabelText('Find medicine')).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Send bill copy' }));
    await waitFor(() => expect(emailCopyMock).toHaveBeenCalledWith('inv-1'));
    expect(await screen.findByText('Bill copy queued for this patient.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send bill copy' })).toHaveFocus();
  });
});
