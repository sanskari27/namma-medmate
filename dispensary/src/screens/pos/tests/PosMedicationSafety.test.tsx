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

import { listCustomers } from '@/services/customers';
import { listDoctors } from '@/services/doctors';
import { listStockBatches } from '@/services/inventory';
import { evaluateMedicationSafety } from '@/services/medicationSafety';
import { listProductUnits, convertProductUnit } from '@/services/productUnits';
import { listSalesCatalogue } from '@/services/salesCatalogue';
import {
  applyInvoicePricing,
  completeSalesInvoice,
  createSalesInvoice,
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
  allergies: 'Penicillin',
  chronicConditions: null,
  createdAt: '2026-09-04T00:00:00Z',
  updatedAt: '2026-09-04T00:00:00Z',
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

const itemB: SalesCatalogueItem = {
  ...itemA,
  id: 'p2',
  sku: 'SKU-B',
  name: 'Amox Clone',
};

const allergyWarning = {
  warningKey: 'ALLERGY:c1:p1:penicillin',
  kind: 'ALLERGY' as const,
  customerId: 'c1',
  productId: 'p1',
  productIds: ['p1'],
  matchedAllergen: 'Penicillin',
  matchedComposition: null,
  matchedField: 'composition',
  severity: 'WARN',
  requiredAction: 'REVIEW',
  requiredReview: true,
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
    customerId: 'c1',
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
      },
    ],
    createdAt: '2026-09-05T08:00:00Z',
    updatedAt: '2026-09-05T08:00:00Z',
    ...overrides,
  };
}

function renderPage() {
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
          modules: ['SALES', 'CRM', 'INVENTORY'],
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

async function pickCustomer(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Select customer' }));
  await user.click(await screen.findByRole('option', { name: /Ravi Kumar/i }));
}

async function proceedToPay(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Proceed to bill' }));
}

describe('POS medication safety M3-SAFE-001', () => {
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
    listCustomersMock.mockResolvedValue([customer]);
    listCatalogueMock.mockResolvedValue([itemA, itemB]);
    listDoctorsMock.mockResolvedValue([]);
    listBatchesMock.mockResolvedValue([]);
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
    applyPricingMock.mockResolvedValue(invoice);
    completeInvoiceMock.mockResolvedValue({
      ...invoice,
      status: 'COMPLETED',
      version: 2,
    });
  });

  it('validation: Charge with allergy warning without reason (M3-SAFE-001)', async () => {
    const user = userEvent.setup();
    evaluateMock.mockResolvedValue({
      checkStatus: 'CHECKED',
      checkLabel: null,
      productsChecked: 1,
      warnings: [allergyWarning],
    });
    renderPage();
    await screen.findByText('Penicillin V');
    await user.click(screen.getByRole('button', { name: 'Add Penicillin V pack to bill' }));
    await pickCustomer(user);
    await proceedToPay(user);

    expect(await screen.findByText('Allergy warning')).toBeInTheDocument();
    expect(screen.getByText(/Allergy match: Penicillin on Penicillin V/)).toBeInTheDocument();
    expect(screen.getByLabelText('Review reason')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cash' }));
    await user.click(screen.getByRole('button', { name: /Charge ₹112.00/ }));
    expect(screen.getByRole('alert')).toHaveTextContent('review reason');
    expect(completeInvoiceMock).not.toHaveBeenCalled();
  });

  it('success: allergy ack then Charge records keys and reason (M3-SAFE-001)', async () => {
    const user = userEvent.setup();
    evaluateMock.mockResolvedValue({
      checkStatus: 'CHECKED',
      checkLabel: null,
      productsChecked: 1,
      warnings: [allergyWarning],
    });
    renderPage();
    await screen.findByText('Penicillin V');
    await user.click(screen.getByRole('button', { name: 'Add Penicillin V pack to bill' }));
    await pickCustomer(user);
    await proceedToPay(user);
    await screen.findByText('Allergy warning');
    await user.type(screen.getByLabelText('Review reason'), 'Pharmacist reviewed');
    await user.click(screen.getByRole('button', { name: 'Cash' }));
    await user.click(screen.getByRole('button', { name: /Charge ₹112.00/ }));

    await waitFor(() => {
      expect(completeInvoiceMock).toHaveBeenCalledWith(
        'inv-1',
        expect.objectContaining({
          safetyWarningKeys: ['ALLERGY:c1:p1:penicillin'],
          safetyReason: 'Pharmacist reviewed',
        }),
      );
    });
    expect(await screen.findByRole('status')).toHaveTextContent('collected');
  });

  it('conflict: unmatched warning keys on Charge (M3-SAFE-001)', async () => {
    const user = userEvent.setup();
    evaluateMock.mockResolvedValue({
      checkStatus: 'CHECKED',
      checkLabel: null,
      productsChecked: 1,
      warnings: [allergyWarning],
    });
    completeInvoiceMock.mockRejectedValue(
      new ApiError('Warning keys must match the current draft evaluation.', 422, 'VALIDATION_ERROR'),
    );
    renderPage();
    await screen.findByText('Penicillin V');
    await user.click(screen.getByRole('button', { name: 'Add Penicillin V pack to bill' }));
    await pickCustomer(user);
    await proceedToPay(user);
    await user.type(await screen.findByLabelText('Review reason'), 'Reviewed');
    await user.click(screen.getByRole('button', { name: 'Cash' }));
    await user.click(screen.getByRole('button', { name: /Charge ₹112.00/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Draft warnings');
  });

  it('shows duplicate composition warning before Charge (M3-SAFE-001)', async () => {
    const user = userEvent.setup();
    evaluateMock.mockResolvedValue({
      checkStatus: 'CHECKED',
      checkLabel: null,
      productsChecked: 2,
      warnings: [
        {
          warningKey: 'DUPLICATE_COMPOSITION:penicillin:p1,p2',
          kind: 'DUPLICATE_COMPOSITION',
          customerId: 'c1',
          productId: null,
          productIds: ['p1', 'p2'],
          matchedAllergen: null,
          matchedComposition: 'Penicillin',
          matchedField: 'composition',
          severity: 'WARN',
          requiredAction: 'REVIEW',
          requiredReview: true,
        },
      ],
    });
    renderPage();
    await screen.findByText('Penicillin V');
    await user.click(screen.getByRole('button', { name: 'Add Penicillin V pack to bill' }));
    await user.click(screen.getByRole('button', { name: 'Add Amox Clone pack to bill' }));
    await pickCustomer(user);
    await proceedToPay(user);
    expect(await screen.findByText('Duplicate composition')).toBeInTheDocument();
    expect(
      screen.getByText(/Same composition on Penicillin V, Amox Clone \(Penicillin\)/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Review required/)).toBeInTheDocument();
    expect(screen.getByLabelText('Review reason')).toBeInTheDocument();
  });

  it('walk-in with lines shows not checked and never treated as safe (M3-SAFE-001)', async () => {
    const user = userEvent.setup();
    evaluateMock.mockResolvedValue({
      checkStatus: 'INCOMPLETE',
      checkLabel: 'Not checked',
      productsChecked: 1,
      warnings: [],
    });
    createInvoiceMock.mockResolvedValue(draftInvoice({ customerId: null }));
    applyPricingMock.mockResolvedValue(draftInvoice({ customerId: null }));
    renderPage();
    await screen.findByText('Penicillin V');
    await user.click(screen.getByRole('button', { name: 'Add Penicillin V pack to bill' }));
    await user.click(screen.getByRole('button', { name: 'Select customer' }));
    await user.click(screen.getByRole('button', { name: 'Continue as walk-in' }));
    await proceedToPay(user);
    expect(await screen.findByText('Not checked is never treated as safe.')).toBeInTheDocument();
    expect(screen.getByText('Not checked', { selector: 'strong' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cash' }));
    await user.click(screen.getByRole('button', { name: /Charge ₹112.00/ }));
    await waitFor(() => {
      expect(completeInvoiceMock).toHaveBeenCalledWith(
        'inv-1',
        expect.objectContaining({
          safetyWarningKeys: [],
          safetyReason: null,
        }),
      );
    });
  });
});
