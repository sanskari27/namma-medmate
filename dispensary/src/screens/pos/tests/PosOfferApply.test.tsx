import { configureStore } from '@reduxjs/toolkit';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PosScreen from '@/screens/pos/PosScreen';
import { posReducer } from '@/screens/pos/store/pos.slice';
import { ApiError } from '@/services/axios';
import { authReducer } from '@/store';
import type { SalesCatalogueItem } from '@/services/salesCatalogue';
import type { SalesInvoice } from '@/services/salesInvoices';

vi.mock('@/services/customers', async () => {
  const axios = await import('@/services/axios');
  return {
    listCustomers: vi.fn(),
    ApiError: axios.ApiError,
    isApiError: axios.isApiError,
  };
});

vi.mock('@/services/salesCatalogue', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/salesCatalogue')>();
  return {
    ...actual,
    listSalesCatalogue: vi.fn(),
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

vi.mock('@/services/credit', async () => {
  const axios = await import('@/services/axios');
  return {
    getCustomerCredit: vi.fn().mockResolvedValue({
      customerId: 'c1',
      limitPaise: 0,
      balancePaise: 0,
      availablePaise: 0,
      version: 0,
      entries: [],
    }),
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
    attachInvoicePrescription: vi.fn(),
    completeSalesInvoice: vi.fn(),
    getPrescriptionFulfillment: vi.fn().mockResolvedValue({ items: [] }),
    listSalesInvoices: vi.fn().mockResolvedValue({ items: [] }),
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
import { evaluateMedicationSafety } from '@/services/medicationSafety';
import { listProductUnits, convertProductUnit } from '@/services/productUnits';
import { listSalesCatalogue } from '@/services/salesCatalogue';
import {
  applyInvoiceOffers,
  applyInvoicePricing,
  completeSalesInvoice,
  createSalesInvoice,
  listInvoiceOffers,
} from '@/services/salesInvoices';

const listCustomersMock = vi.mocked(listCustomers);
const listCatalogueMock = vi.mocked(listSalesCatalogue);
const evaluateMock = vi.mocked(evaluateMedicationSafety);
const listUnitsMock = vi.mocked(listProductUnits);
const convertMock = vi.mocked(convertProductUnit);
const listBatchesMock = vi.mocked(listStockBatches);
const listDoctorsMock = vi.mocked(listDoctors);
const createInvoiceMock = vi.mocked(createSalesInvoice);
const applyPricingMock = vi.mocked(applyInvoicePricing);
const completeInvoiceMock = vi.mocked(completeSalesInvoice);
const listOffersMock = vi.mocked(listInvoiceOffers);
const applyOffersMock = vi.mocked(applyInvoiceOffers);

const festive = {
  id: 'o1',
  name: 'Festive 10',
  kind: 'SEASONAL' as const,
  priority: 8,
  explanation: 'Festive 10 — scheme on this line (1000 paise).',
  benefitPaise: 1000,
};

const itemA: SalesCatalogueItem = {
  id: 'p1',
  sku: 'SKU-A',
  barcode: null,
  name: 'Penicillin V',
  genericName: 'Penicillin',
  brandName: 'PenV',
  categoryId: 'cat1',
  categoryName: 'Antibiotics',
  categoryIcon: null,
  dosageForm: 'Tablet',
  prescriptionRequired: false,
  scheduleClassification: null,
  controlledSubstance: false,
  baseUnit: 'Tablet',
  packSize: 10,
  packUnit: 'strip',
  packDescription: null,
  rackLocation: null,
  reorderLevel: null,
  minimumStock: null,
  requiresBatchTracking: false,
  active: true,
  onHandQuantity: 20,
  suggestedMrpPaise: 12000,
  suggestedSellingPaise: 10000,
};

function draftInvoice(overrides: Partial<SalesInvoice> = {}): SalesInvoice {
  return {
    id: 'inv-1',
    tenantId: 't1',
    branchId: 'b1',
    invoiceNumber: 'INV/2026-27/BR01/00001',
    status: 'DRAFT',
    staffUserId: 'u1',
    terminalId: 'sess-1',
    customerId: null,
    doctorId: null,
    prescriptionReference: null,
    prescriptionVerified: false,
    version: 1,
    subtotalPaise: 10000,
    discountPaise: 0,
    taxPaise: 1200,
    totalPaise: 11200,
    billDiscountType: 'NONE',
    billDiscountValue: 0,
    customerGstin: null,
    taxJurisdiction: 'INTRA',
    cgstPaise: 600,
    sgstPaise: 600,
    igstPaise: 0,
    roundOffPaise: 0,
    discountApprovalRequestId: null,
    discountApprovalStatus: 'NOT_REQUIRED',
    taxAdjustmentReason: null,
    taxAdjusted: false,
    amountPaidPaise: 0,
    amountDuePaise: 0,
    changePaise: 0,
    completedAt: null,
    payments: [],
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
        unit: 'Tablet',
        baseQuantity: 1,
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
        cgstPaise: 600,
        sgstPaise: 600,
        igstPaise: 0,
        lineTaxablePaise: 10000,
        lineTaxPaise: 1200,
        lineTotalPaise: 11200,
        offerId: null,
        offerName: null,
        offerKind: null,
        offerPriority: null,
        offerBenefitPaise: 0,
        offerExplanation: null,
      },
    ],
    createdAt: '2026-09-05T08:00:00Z',
    updatedAt: '2026-09-05T08:00:00Z',
    revalidation: null,
    ...overrides,
  };
}

function appliedInvoice(version = 2): SalesInvoice {
  const base = draftInvoice({ version, discountPaise: 1000, totalPaise: 10080 });
  return {
    ...base,
    lines: [
      {
        ...base.lines[0],
        offerId: festive.id,
        offerName: festive.name,
        offerKind: festive.kind,
        offerPriority: festive.priority,
        offerBenefitPaise: festive.benefitPaise,
        offerExplanation: festive.explanation,
        discountPaise: 1000,
        lineTaxablePaise: 9000,
        lineTaxPaise: 1080,
        lineTotalPaise: 10080,
      },
    ],
  };
}

function renderPage(modules: string[] = ['SALES', 'CRM', 'INVENTORY']) {
  const store = configureStore({
    reducer: { auth: authReducer, pos: posReducer },
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

async function addWalkInAndProceed(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByText('Penicillin V');
  await user.click(screen.getByRole('button', { name: 'Add Penicillin V pack to bill' }));
  await user.click(screen.getByRole('button', { name: 'Select customer' }));
  await user.click(screen.getByRole('button', { name: 'Continue as walk-in' }));
  await user.click(screen.getByRole('button', { name: 'Proceed to bill' }));
}

describe('POS schemes on this bill M6-OFFER-001', () => {
  beforeEach(() => {
    listCustomersMock.mockReset();
    listCatalogueMock.mockReset();
    evaluateMock.mockReset();
    listUnitsMock.mockReset();
    convertMock.mockReset();
    listBatchesMock.mockReset();
    listDoctorsMock.mockReset();
    createInvoiceMock.mockReset();
    applyPricingMock.mockReset();
    completeInvoiceMock.mockReset();
    listOffersMock.mockReset();
    applyOffersMock.mockReset();
    listCustomersMock.mockResolvedValue([]);
    listCatalogueMock.mockResolvedValue([itemA]);
    listDoctorsMock.mockResolvedValue([]);
    listBatchesMock.mockResolvedValue([]);
    evaluateMock.mockResolvedValue({
      checkStatus: 'CHECKED',
      checkLabel: null,
      productsChecked: 1,
      warnings: [],
    });
    listUnitsMock.mockResolvedValue({
      baseUnit: 'Tablet',
      quantityPrecision: 0,
      units: [{ unit: 'strip', factorToBase: 10, version: 1 }],
    });
    convertMock.mockResolvedValue({
      quantity: 10,
      unit: 'Tablet',
      baseQuantity: 10,
      baseUnit: 'Tablet',
      displayQuantity: 1,
      displayUnit: 'strip',
      conversionVersion: 1,
      factorToBase: 10,
    });
    const invoice = draftInvoice();
    createInvoiceMock.mockResolvedValue(invoice);
    applyPricingMock.mockImplementation(async (_id, input) => ({
      ...invoice,
      version: input.expectedVersion,
    }));
    applyOffersMock.mockResolvedValue(invoice);
    listOffersMock.mockResolvedValue({ items: [] });
    completeInvoiceMock.mockResolvedValue({ ...invoice, status: 'COMPLETED', version: 3 });
  });

  it('loading: waits for schemes after Proceed (M6-OFFER-001)', async () => {
    const user = userEvent.setup();
    listOffersMock.mockReturnValue(new Promise(() => undefined));
    renderPage();
    await addWalkInAndProceed(user);
    expect(await screen.findByText('Loading schemes on this bill…')).toBeInTheDocument();
  });

  it('empty: no live scheme fits this bill (M6-OFFER-001)', async () => {
    const user = userEvent.setup();
    renderPage();
    await addWalkInAndProceed(user);
    expect(await screen.findByText('No live scheme fits this bill.')).toBeInTheDocument();
  });

  it('denied: till without Sales cannot apply a scheme (M6-OFFER-001)', () => {
    renderPage(['CRM']);
    expect(screen.getByRole('alert')).toHaveTextContent('This counter cannot save Sales bills');
    expect(screen.queryByRole('button', { name: 'Apply scheme' })).not.toBeInTheDocument();
  });

  it('validation: Apply scheme needs a saved draft (M6-OFFER-001)', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Penicillin V');
    await user.click(screen.getByRole('button', { name: 'Apply scheme' }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Save this bill first, then apply a scheme.',
    );
    expect(applyOffersMock).not.toHaveBeenCalled();
  });

  it('conflict: another counter already changed this bill (M6-OFFER-001)', async () => {
    const user = userEvent.setup();
    listOffersMock.mockResolvedValue({ items: [festive] });
    applyOffersMock.mockRejectedValue(new ApiError('stale', 409, 'STALE_STATE'));
    renderPage();
    await addWalkInAndProceed(user);
    await user.click(await screen.findByRole('button', { name: 'Apply scheme' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This bill was updated on another counter. Refresh, then apply the scheme again.',
    );
  });

  it('failure: apply scheme network error (M6-OFFER-001)', async () => {
    const user = userEvent.setup();
    listOffersMock.mockResolvedValue({ items: [festive] });
    applyOffersMock.mockRejectedValue(new Error('network'));
    renderPage();
    await addWalkInAndProceed(user);
    await user.click(await screen.findByRole('button', { name: 'Apply scheme' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not apply this scheme. Check the connection and try again.',
    );
  });

  it('success: Proceed posts offers and snapshots the line (M6-OFFER-001)', async () => {
    const user = userEvent.setup();
    applyOffersMock.mockResolvedValue(appliedInvoice());
    listOffersMock.mockResolvedValue({ items: [festive] });
    renderPage();
    await addWalkInAndProceed(user);
    expect(await screen.findByRole('status')).toHaveTextContent('Festive 10 applied on this bill.');
    expect(await screen.findByText('Festive 10')).toBeInTheDocument();
    expect(screen.getByText('Festive 10 — scheme on this line (1000 paise).')).toBeInTheDocument();
    await waitFor(() => {
      expect(applyOffersMock).toHaveBeenCalledWith('inv-1', { expectedVersion: 1 });
    });
  });

  it('validation: two live schemes share a line priority (M6-OFFER-001)', async () => {
    const user = userEvent.setup();
    listOffersMock.mockResolvedValue({ items: [festive] });
    applyOffersMock.mockRejectedValue(new ApiError('tie', 422, 'AMBIGUOUS_PRECEDENCE'));
    renderPage();
    await addWalkInAndProceed(user);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Two live schemes share the same priority on a line. Change priority on Schemes, then apply again.',
    );
    expect(applyOffersMock).toHaveBeenCalled();
    expect(completeInvoiceMock).not.toHaveBeenCalled();
  });

  it('success: Charge posts offers before complete (M6-OFFER-001)', async () => {
    const user = userEvent.setup();
    applyOffersMock.mockImplementation(async (_id, input) =>
      appliedInvoice(input.expectedVersion + 1),
    );
    listOffersMock.mockResolvedValue({ items: [festive] });
    completeInvoiceMock.mockResolvedValue({
      ...appliedInvoice(4),
      status: 'COMPLETED',
    });
    renderPage();
    await addWalkInAndProceed(user);
    await screen.findByText('Festive 10');
    applyOffersMock.mockClear();
    await user.click(screen.getByRole('button', { name: 'Cash' }));
    await user.click(screen.getByRole('button', { name: /Charge ₹/ }));
    await waitFor(() => {
      expect(applyOffersMock).toHaveBeenCalled();
    });
    expect(completeInvoiceMock).toHaveBeenCalled();
    const completeArg = completeInvoiceMock.mock.calls[0]?.[1];
    const applyArg = applyOffersMock.mock.calls[0]?.[1];
    expect(completeArg?.expectedVersion).toBeGreaterThan(applyArg?.expectedVersion ?? 0);
  });
});
