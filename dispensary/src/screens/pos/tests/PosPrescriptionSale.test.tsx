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
    getPrescriptionFulfillment: vi.fn(),
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
  getPrescriptionFulfillment,
} from '@/services/salesInvoices';

const listCustomersMock = vi.mocked(listCustomers);
const getCreditMock = vi.mocked(getCustomerCredit);
const listProductsMock = vi.mocked(listProducts);
const listUnitsMock = vi.mocked(listProductUnits);
const convertMock = vi.mocked(convertProductUnit);
const listBatchesMock = vi.mocked(listStockBatches);
const listDoctorsMock = vi.mocked(listDoctors);
const createInvoiceMock = vi.mocked(createSalesInvoice);
const applyPricingMock = vi.mocked(applyInvoicePricing);
const completeInvoiceMock = vi.mocked(completeSalesInvoice);
const getFulfillmentMock = vi.mocked(getPrescriptionFulfillment);

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

const doctor = {
  id: 'd1',
  tenantId: 't1',
  name: 'Dr. Mehta',
  registrationNumber: 'KA-1001',
  phone: null,
  notes: null,
  createdAt: '2026-09-04T00:00:00Z',
  updatedAt: '2026-09-04T00:00:00Z',
};

const rxProduct = {
  id: 'p-rx',
  tenantId: 't1',
  sku: 'SKU-RX',
  barcode: null,
  name: 'Amoxil',
  genericName: 'Amoxicillin',
  brandName: 'Amoxil',
  manufacturerId: null,
  categoryId: 'cat1',
  productType: 'Medicine' as const,
  dosageForm: 'Tablet' as const,
  therapeuticClass: null,
  composition: 'Amoxicillin',
  strength: null,
  route: null,
  prescriptionRequired: true,
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

const productH1 = {
  ...rxProduct,
  id: 'p-h1',
  sku: 'SKU-H1',
  name: 'Alprazolam',
  scheduleClassification: 'H1' as const,
  controlledSubstance: true,
};

const draftInvoice = {
  id: 'inv-rx',
  tenantId: 't1',
  branchId: 'b1',
  invoiceNumber: 'INV/2026-27/BR01/00009',
  status: 'DRAFT' as const,
  staffUserId: 'u1',
  terminalId: 'sess-1',
  customerId: 'c1' as string | null,
  doctorId: null as string | null,
  prescriptionReference: 'RX-1',
  prescriptionVerified: true,
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
      productId: 'p-rx',
      productName: 'Amoxil',
      sku: 'SKU-RX',
      batchId: null,
      batchNumber: null,
      expiresOn: null,
      quantity: 1,
      unit: 'Tablet' as const,
      baseQuantity: 1,
      prescribedQuantity: 90,
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

function renderPage(
  modules: string[] = ['SALES', 'CRM', 'INVENTORY'],
  role = 'pharmacy_owner',
  roles: { id: string; name: string; code: string | null; kind: string }[] = [],
) {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        user: {
          userId: 'u1',
          displayName: 'Owner',
          role,
          tenantId: 't1',
          pinSet: true,
          tenantStatus: 'ACTIVE',
          emailVerified: true,
          modules,
          roles,
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

describe('PosScreen prescription-linked sale', () => {
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
    getFulfillmentMock.mockReset();
    listCustomersMock.mockResolvedValue([customer]);
    listProductsMock.mockResolvedValue([rxProduct]);
    listDoctorsMock.mockResolvedValue([doctor]);
    getCreditMock.mockResolvedValue({
      customerId: 'c1',
      limitPaise: 50000,
      balancePaise: 0,
      availablePaise: 50000,
      version: 1,
      entries: [],
    });
    listBatchesMock.mockResolvedValue([]);
    getFulfillmentMock.mockResolvedValue({ items: [] });
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

  it('loading: checks remaining on this Rx', async () => {
    const user = userEvent.setup();
    getFulfillmentMock.mockReturnValue(new Promise(() => undefined));
    renderPage();
    await screen.findByText('Amoxil');
    await user.click(screen.getByRole('button', { name: /Add Amoxil/i }));
    await user.click(screen.getByRole('button', { name: /Ravi Kumar/i }));
    await user.type(screen.getByLabelText('Rx reference'), 'RX-1');
    expect(await screen.findByText('Checking this Rx…')).toBeInTheDocument();
  });

  it('empty: first visit has no fills yet', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Amoxil');
    await user.click(screen.getByRole('button', { name: /Add Amoxil/i }));
    await user.click(screen.getByRole('button', { name: /Ravi Kumar/i }));
    await user.type(screen.getByLabelText('Rx reference'), 'RX-1');
    expect(await screen.findByText('No fills on this Rx yet.')).toBeInTheDocument();
  });

  it('validation: Rx pack needs reference, checked, and prescribed qty', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Amoxil');
    await user.click(screen.getByRole('button', { name: /Add Amoxil/i }));
    await user.type(screen.getByLabelText('MRP ₹'), '120');
    await user.type(screen.getByLabelText('Selling ₹'), '100');
    await user.click(screen.getByRole('button', { name: /Ravi Kumar/i }));
    await user.click(screen.getByRole('button', { name: 'Save bill' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Rx reference');
    expect(createInvoiceMock).not.toHaveBeenCalled();
  });

  it('denied: cashier cannot dispense Schedule H1', async () => {
    const user = userEvent.setup();
    listProductsMock.mockResolvedValue([productH1]);
    renderPage(['SALES', 'CRM'], 'pharmacy_staff', [
      { id: 'r1', name: 'Cashier', code: 'cashier', kind: 'PREDEFINED' },
    ]);
    await screen.findByText('Alprazolam');
    await user.click(screen.getByRole('button', { name: /Add Alprazolam/i }));
    expect(screen.getByText(/Call a pharmacist to this till/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Ravi Kumar/i }));
    await user.type(screen.getByLabelText('Rx reference'), 'RX-H1');
    await user.click(screen.getByLabelText('Prescription checked'));
    await user.type(screen.getByLabelText('Prescribed qty for Alprazolam'), '30');
    await user.type(screen.getByLabelText('MRP ₹'), '120');
    await user.type(screen.getByLabelText('Selling ₹'), '100');
    await user.click(screen.getByRole('button', { name: 'Save bill' }));
    expect(screen.getByRole('alert')).toHaveTextContent('cashier-only');
    expect(createInvoiceMock).not.toHaveBeenCalled();
  });

  it('conflict: Rx reference already on another patient', async () => {
    const user = userEvent.setup();
    getFulfillmentMock.mockRejectedValue(
      new ApiError('That Rx reference is already on another patient.', 422, 'FOREIGN_REFERENCE'),
    );
    renderPage();
    await screen.findByText('Amoxil');
    await user.click(screen.getByRole('button', { name: /Add Amoxil/i }));
    await user.click(screen.getByRole('button', { name: /Ravi Kumar/i }));
    await user.type(screen.getByLabelText('Rx reference'), 'RX-BIND');
    expect(await screen.findByRole('alert')).toHaveTextContent('another patient');
  });

  it('denied: archived Rx cannot go on a new bill', async () => {
    const user = userEvent.setup();
    getFulfillmentMock.mockRejectedValue(
      new ApiError('This Rx is archived. Open history, not a new sale.', 422, 'ARCHIVED_REFERENCE'),
    );
    renderPage();
    await screen.findByText('Amoxil');
    await user.click(screen.getByRole('button', { name: /Add Amoxil/i }));
    await user.click(screen.getByRole('button', { name: /Ravi Kumar/i }));
    await user.type(screen.getByLabelText('Rx reference'), 'RX-OLD');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This Rx is archived — history only, not a new sale.',
    );
  });

  it('failure: remaining lookup network error', async () => {
    const user = userEvent.setup();
    getFulfillmentMock.mockRejectedValue(new Error('network'));
    renderPage();
    await screen.findByText('Amoxil');
    await user.click(screen.getByRole('button', { name: /Add Amoxil/i }));
    await user.click(screen.getByRole('button', { name: /Ravi Kumar/i }));
    await user.type(screen.getByLabelText('Rx reference'), 'RX-1');
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not check this Rx');
  });

  it('success: saves Rx reference and prescribed qty then collect restores Find medicine focus', async () => {
    const user = userEvent.setup();
    getFulfillmentMock.mockResolvedValue({
      items: [
        {
          productId: 'p-rx',
          prescribedQuantity: 90,
          fulfilledQuantity: 30,
          remainingQuantity: 60,
        },
      ],
    });
    completeInvoiceMock.mockResolvedValue({
      ...draftInvoice,
      status: 'COMPLETED',
      version: 2,
      amountPaidPaise: 11200,
      payments: [{ mode: 'CASH', amountPaise: 11200, reference: null }],
    });
    renderPage();
    await screen.findByText('Amoxil');
    await user.click(screen.getByRole('button', { name: /Add Amoxil/i }));
    await user.type(screen.getByLabelText('MRP ₹'), '120');
    await user.type(screen.getByLabelText('Selling ₹'), '100');
    await user.click(screen.getByRole('button', { name: /Ravi Kumar/i }));
    await user.type(screen.getByLabelText('Rx reference'), 'RX-1');
    await user.click(screen.getByLabelText('Prescription checked'));
    await user.type(screen.getByLabelText('Prescribed qty for Amoxil'), '90');
    expect(await screen.findByText(/Still on this Rx/)).toHaveTextContent('60');
    await user.click(screen.getByRole('button', { name: 'Save bill' }));
    await waitFor(() => {
      expect(createInvoiceMock).toHaveBeenCalledWith(
        expect.objectContaining({
          customerId: 'c1',
          prescriptionReference: 'RX-1',
          prescriptionVerified: true,
          lines: [
            expect.objectContaining({
              productId: 'p-rx',
              prescribedQuantity: 90,
            }),
          ],
        }),
      );
    });
    await user.type(screen.getByLabelText('Cash ₹'), '112');
    await user.click(screen.getByRole('button', { name: 'Collect bill' }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Bill INV/2026-27/BR01/00009 collected at this till.',
    );
    expect(screen.getByLabelText('Find medicine')).toHaveFocus();
  });
});
