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
    pingSalesInvoiceHealth: vi.fn().mockResolvedValue({ status: 'UP' }),
    downloadInvoicePdf: vi.fn(),
    emailInvoiceCopy: vi.fn(),
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

const customer = {
  id: 'c1',
  tenantId: 't1',
  name: 'Ravi Kumar',
  phone: '9876500001',
  email: null,
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

describe('PosScreen mixed payment and khata', () => {
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
  });

  it('loading: waits for catalogue before Collect bill', () => {
    listProductsMock.mockReturnValue(new Promise(() => undefined));
    renderPage();
    expect(screen.getByText('Loading catalogue for this till…')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Collect bill' })).not.toBeInTheDocument();
  });

  it('empty: saved draft asks for a tender before collect', async () => {
    const user = userEvent.setup();
    renderPage();
    await saveWalkInDraft(user);
    expect(screen.getByRole('region', { name: 'Take payment' })).toHaveTextContent(
      'Add cash, UPI, card, bank, or khata to collect.',
    );
    expect(screen.getByRole('button', { name: 'Collect bill' })).toBeDisabled();
  });

  it('denied: till without Sales cannot collect', () => {
    renderPage(['CRM']);
    expect(screen.getByRole('alert')).toHaveTextContent('This till cannot save Sales bills');
    expect(completeInvoiceMock).not.toHaveBeenCalled();
  });

  it('validation: walk-in cannot put the bill on khata', async () => {
    const user = userEvent.setup();
    renderPage();
    await saveWalkInDraft(user);
    expect(screen.getByLabelText('Khata ₹')).toBeDisabled();
    await user.type(screen.getByLabelText('Cash ₹'), '50');
    await user.click(screen.getByRole('button', { name: 'Collect bill' }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Tender must cover this bill. Add the rest or put it on khata for a linked patient.',
    );
    expect(completeInvoiceMock).not.toHaveBeenCalled();
  });

  it('conflict: stale total on collect', async () => {
    const user = userEvent.setup();
    completeInvoiceMock.mockRejectedValue(new ApiError('stale', 409, 'STALE_STATE'));
    renderPage();
    await saveWalkInDraft(user);
    await user.type(screen.getByLabelText('Cash ₹'), '112');
    await user.click(screen.getByRole('button', { name: 'Collect bill' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This bill total changed. Refresh, then collect again.',
    );
  });

  it('failure: collect network error', async () => {
    const user = userEvent.setup();
    completeInvoiceMock.mockRejectedValue(new Error('network'));
    renderPage();
    await saveWalkInDraft(user);
    await user.type(screen.getByLabelText('Cash ₹'), '112');
    await user.click(screen.getByRole('button', { name: 'Collect bill' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not collect this bill');
  });

  it('success: mixed cash UPI and khata with change back restores Find medicine focus', async () => {
    const user = userEvent.setup();
    completeInvoiceMock.mockResolvedValue({
      ...draftInvoice,
      status: 'COMPLETED',
      version: 2,
      customerId: 'c1',
      amountPaidPaise: 12000,
      amountDuePaise: 3200,
      changePaise: 800,
      payments: [
        { mode: 'CASH', amountPaise: 5800, reference: null },
        { mode: 'UPI', amountPaise: 3000, reference: 'UPI-9' },
        { mode: 'CREDIT', amountPaise: 3200, reference: null },
      ],
    });
    renderPage();
    await screen.findByText('Penicillin V');
    await user.click(screen.getByRole('button', { name: /Add Penicillin V/i }));
    await user.type(screen.getByLabelText('MRP ₹'), '120');
    await user.type(screen.getByLabelText('Selling ₹'), '100');
    await user.click(screen.getByRole('button', { name: /Ravi Kumar/i }));
    await user.click(screen.getByRole('button', { name: 'Save bill' }));
    expect(await screen.findByRole('status')).toHaveTextContent('INV/2026-27/BR01/00001');
    expect(await screen.findByText(/Khata left ₹500/)).toBeInTheDocument();
    await user.type(screen.getByLabelText('Cash ₹'), '58');
    await user.type(screen.getByLabelText('UPI ₹'), '30');
    await user.type(screen.getByLabelText('UPI reference'), 'UPI-9');
    await user.type(screen.getByLabelText('Khata ₹'), '32');
    const tender = screen.getByRole('region', { name: 'Take payment' });
    expect(tender).toHaveTextContent('Change back');
    expect(tender).toHaveTextContent('Still due');
    await user.click(screen.getByRole('button', { name: 'Collect bill' }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Bill INV/2026-27/BR01/00001 collected at this till.',
    );
    await waitFor(() => {
      expect(completeInvoiceMock).toHaveBeenCalledWith(
        'inv-1',
        expect.objectContaining({
          expectedVersion: 1,
          expectedTotalPaise: 11200,
          changePaise: 800,
          payments: [
            { mode: 'CASH', amountPaise: 5800, reference: null },
            { mode: 'UPI', amountPaise: 3000, reference: 'UPI-9' },
            { mode: 'CREDIT', amountPaise: 3200, reference: null },
          ],
        }),
      );
    });
    expect(screen.getByLabelText('Find medicine')).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Collect bill' })).toBeDisabled();
  });
});
