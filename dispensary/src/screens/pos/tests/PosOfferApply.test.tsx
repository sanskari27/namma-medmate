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
    listSalesInvoices: vi.fn(),
    holdSalesInvoice: vi.fn(),
    resumeSalesInvoice: vi.fn(),
    listInvoiceOffers: vi.fn(),
    applyInvoiceOffers: vi.fn(),
    pingSalesInvoiceHealth: vi.fn().mockResolvedValue({ status: 'UP' }),
    downloadInvoicePdf: vi.fn(),
    emailInvoiceCopy: vi.fn(),
    openInvoicePdf: vi.fn(),
    ApiError: axios.ApiError,
    isApiError: axios.isApiError,
  };
});

import { listCustomers } from '@/services/customers';
import { listDoctors } from '@/services/doctors';
import { listStockBatches } from '@/services/inventory';
import { listProducts } from '@/services/products';
import { convertProductUnit, listProductUnits } from '@/services/productUnits';
import {
  applyInvoiceOffers,
  applyInvoicePricing,
  createSalesInvoice,
  listInvoiceOffers,
  listSalesInvoices,
} from '@/services/salesInvoices';

const listCustomersMock = vi.mocked(listCustomers);
const listProductsMock = vi.mocked(listProducts);
const listUnitsMock = vi.mocked(listProductUnits);
const convertMock = vi.mocked(convertProductUnit);
const listBatchesMock = vi.mocked(listStockBatches);
const listDoctorsMock = vi.mocked(listDoctors);
const createInvoiceMock = vi.mocked(createSalesInvoice);
const applyPricingMock = vi.mocked(applyInvoicePricing);
const listHeldMock = vi.mocked(listSalesInvoices);
const listOffersMock = vi.mocked(listInvoiceOffers);
const applyOffersMock = vi.mocked(applyInvoiceOffers);

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
  doctorId: null as string | null,
  prescriptionReference: null as string | null,
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
      offerId: null as string | null,
      offerName: null as string | null,
      offerKind: null as 'BOGO' | 'SEASONAL' | 'BUNDLE' | null,
      offerPriority: null as number | null,
      offerBenefitPaise: 0,
      offerExplanation: null as string | null,
    },
  ],
  createdAt: '2026-09-05T08:00:00Z',
  updatedAt: '2026-09-05T08:00:00Z',
  revalidation: null,
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

describe('PosScreen schemes on this bill', () => {
  beforeEach(() => {
    listCustomersMock.mockReset();
    listProductsMock.mockReset();
    listUnitsMock.mockReset();
    convertMock.mockReset();
    listBatchesMock.mockReset();
    listDoctorsMock.mockReset();
    createInvoiceMock.mockReset();
    applyPricingMock.mockReset();
    listHeldMock.mockReset();
    listOffersMock.mockReset();
    applyOffersMock.mockReset();
    listCustomersMock.mockResolvedValue([customer]);
    listProductsMock.mockResolvedValue([productA]);
    listDoctorsMock.mockResolvedValue([]);
    listBatchesMock.mockResolvedValue([]);
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
    listHeldMock.mockResolvedValue({ items: [] });
    listOffersMock.mockResolvedValue({ items: [] });
  });

  it('loading: waits for schemes on a saved bill', async () => {
    const user = userEvent.setup();
    listOffersMock.mockReturnValue(new Promise(() => undefined));
    renderPage();
    await saveWalkInDraft(user);
    expect(await screen.findByText('Loading schemes on this bill…')).toBeInTheDocument();
  });

  it('empty: no live scheme fits this bill', async () => {
    const user = userEvent.setup();
    renderPage();
    await saveWalkInDraft(user);
    expect(await screen.findByText('No live scheme fits this bill.')).toBeInTheDocument();
  });

  it('denied: till without Sales cannot apply a scheme', () => {
    renderPage(['CRM']);
    expect(screen.getByRole('alert')).toHaveTextContent('This till cannot save Sales bills');
    expect(screen.queryByRole('button', { name: 'Apply scheme' })).not.toBeInTheDocument();
  });

  it('validation: Apply scheme needs a saved draft', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Penicillin V');
    await user.click(screen.getByRole('button', { name: 'Apply scheme' }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Save this bill first, then apply a scheme.',
    );
    expect(applyOffersMock).not.toHaveBeenCalled();
  });

  it('conflict: another till already changed this bill', async () => {
    const user = userEvent.setup();
    listOffersMock.mockResolvedValue({
      items: [
        {
          id: 'o1',
          name: 'Festive 10',
          kind: 'SEASONAL',
          priority: 8,
          explanation: 'Festive 10 — scheme on this line.',
          benefitPaise: 1000,
        },
      ],
    });
    applyOffersMock.mockRejectedValue(new ApiError('stale', 409, 'STALE_STATE'));
    renderPage();
    await saveWalkInDraft(user);
    await user.click(await screen.findByRole('button', { name: 'Apply scheme' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This bill was updated on another till. Refresh, then apply the scheme again.',
    );
  });

  it('failure: apply scheme network error', async () => {
    const user = userEvent.setup();
    listOffersMock.mockResolvedValue({
      items: [
        {
          id: 'o1',
          name: 'Festive 10',
          kind: 'SEASONAL',
          priority: 8,
          explanation: 'Festive 10 — scheme on this line.',
          benefitPaise: 1000,
        },
      ],
    });
    applyOffersMock.mockRejectedValue(new Error('network'));
    renderPage();
    await saveWalkInDraft(user);
    await user.click(await screen.findByRole('button', { name: 'Apply scheme' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not apply this scheme. Check the connection and try again.',
    );
  });

  it('success: apply scheme snapshots the saving on the line', async () => {
    const user = userEvent.setup();
    listOffersMock.mockResolvedValue({
      items: [
        {
          id: 'o1',
          name: 'Festive 10',
          kind: 'SEASONAL',
          priority: 8,
          explanation: 'Festive 10 — scheme on this line (1000 paise).',
          benefitPaise: 1000,
        },
      ],
    });
    applyOffersMock.mockResolvedValue({
      ...draftInvoice,
      version: 2,
      discountPaise: 1000,
      subtotalPaise: 9000,
      taxPaise: 1080,
      totalPaise: 10080,
      lines: [
        {
          ...draftInvoice.lines[0],
          offerId: 'o1',
          offerName: 'Festive 10',
          offerKind: 'SEASONAL',
          offerPriority: 8,
          offerBenefitPaise: 1000,
          offerExplanation: 'Festive 10 — scheme on this line (1000 paise).',
          discountPaise: 1000,
          lineTaxablePaise: 9000,
          lineTaxPaise: 1080,
          lineTotalPaise: 10080,
        },
      ],
    });
    renderPage();
    await saveWalkInDraft(user);
    expect(await screen.findByText('Festive 10')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Apply scheme' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Festive 10 applied on this bill.');
    expect(screen.getByText('Festive 10 — scheme on this line (1000 paise).')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByLabelText('Find medicine')).toHaveFocus();
    });
    expect(applyOffersMock).toHaveBeenCalledWith('inv-1', { expectedVersion: 1 });
  });

  it('validation: two live schemes share a line priority', async () => {
    const user = userEvent.setup();
    listOffersMock.mockResolvedValue({
      items: [
        {
          id: 'o1',
          name: 'Festive 10',
          kind: 'SEASONAL',
          priority: 8,
          explanation: 'Festive 10 — scheme on this line.',
          benefitPaise: 1000,
        },
      ],
    });
    applyOffersMock.mockRejectedValue(new ApiError('tie', 422, 'AMBIGUOUS_PRECEDENCE'));
    renderPage();
    await saveWalkInDraft(user);
    await user.click(await screen.findByRole('button', { name: 'Apply scheme' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Two live schemes share the same priority on a line. Change priority on Schemes, then apply again.',
    );
    expect(screen.queryByRole('alert')).not.toHaveTextContent('Save this bill first');
  });
});
