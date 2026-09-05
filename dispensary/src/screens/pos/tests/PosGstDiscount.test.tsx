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

import { listCustomers } from '@/services/customers';
import { listDoctors } from '@/services/doctors';
import { listStockBatches } from '@/services/inventory';
import { listProducts } from '@/services/products';
import { convertProductUnit, listProductUnits } from '@/services/productUnits';
import {
  adjustInvoiceTax,
  applyInvoicePricing,
  createSalesInvoice,
} from '@/services/salesInvoices';

const listCustomersMock = vi.mocked(listCustomers);
const listProductsMock = vi.mocked(listProducts);
const listUnitsMock = vi.mocked(listProductUnits);
const convertMock = vi.mocked(convertProductUnit);
const listBatchesMock = vi.mocked(listStockBatches);
const listDoctorsMock = vi.mocked(listDoctors);
const createInvoiceMock = vi.mocked(createSalesInvoice);
const applyPricingMock = vi.mocked(applyInvoicePricing);
const adjustTaxMock = vi.mocked(adjustInvoiceTax);

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

const savedInvoice = {
  id: 'inv-1',
  tenantId: 't1',
  branchId: 'b1',
  invoiceNumber: 'INV/2026-27/BR01/00001',
  status: 'DRAFT' as const,
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

async function saveDraft(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByText('Penicillin V');
  await user.click(screen.getByRole('button', { name: /Add Penicillin V/i }));
  await user.type(screen.getByLabelText('MRP ₹'), '120');
  await user.type(screen.getByLabelText('Selling ₹'), '100');
  await user.click(screen.getByRole('button', { name: 'Skip — walk-in' }));
  await user.click(screen.getByRole('button', { name: 'Save bill' }));
  expect(await screen.findByRole('status')).toHaveTextContent('INV/2026-27/BR01/00001');
}

describe('PosScreen GST and discount', () => {
  beforeEach(() => {
    listCustomersMock.mockReset();
    listProductsMock.mockReset();
    listUnitsMock.mockReset();
    convertMock.mockReset();
    listBatchesMock.mockReset();
    listDoctorsMock.mockReset();
    createInvoiceMock.mockReset();
    applyPricingMock.mockReset();
    adjustTaxMock.mockReset();
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
    createInvoiceMock.mockResolvedValue(savedInvoice);
    applyPricingMock.mockResolvedValue(savedInvoice);
  });

  it('loading: waits for catalogue before GST on this bill', () => {
    listProductsMock.mockReturnValue(new Promise(() => undefined));
    renderPage();
    expect(screen.getByText('Loading catalogue for this till…')).toBeInTheDocument();
  });

  it('empty: no medicines to price', async () => {
    listProductsMock.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByRole('status')).toHaveTextContent(
      'No medicines in the catalogue yet',
    );
  });

  it('denied: till without Sales cannot apply GST', () => {
    renderPage(['CRM']);
    expect(screen.getByRole('alert')).toHaveTextContent('This till cannot save Sales bills');
    expect(applyPricingMock).not.toHaveBeenCalled();
  });

  it('validation: tax override needs a reason', async () => {
    const user = userEvent.setup();
    renderPage();
    await saveDraft(user);
    await user.click(screen.getByRole('button', { name: 'Tax override' }));
    await user.click(screen.getByRole('button', { name: 'Save tax override' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Tax override needs a reason');
    expect(adjustTaxMock).not.toHaveBeenCalled();
  });

  it('conflict: stale bill on apply', async () => {
    const user = userEvent.setup();
    renderPage();
    await saveDraft(user);
    applyPricingMock.mockRejectedValue(new ApiError('stale', 409, 'STALE_STATE'));
    await user.type(screen.getByLabelText('Discount ₹'), '5');
    await user.click(screen.getByRole('button', { name: 'Apply on this bill' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Draft warnings');
  });

  it('failure: apply GST network error', async () => {
    const user = userEvent.setup();
    renderPage();
    await saveDraft(user);
    applyPricingMock.mockRejectedValue(new Error('network'));
    await user.click(screen.getByRole('button', { name: 'Apply on this bill' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not save this bill');
  });

  it('success: line percent and bill rupee discount show GST breakup', async () => {
    const user = userEvent.setup();
    applyPricingMock.mockResolvedValue({
      ...savedInvoice,
      version: 2,
      discountPaise: 1500,
      subtotalPaise: 8500,
      taxPaise: 1020,
      totalPaise: 9520,
      cgstPaise: 510,
      sgstPaise: 510,
    });
    renderPage();
    await saveDraft(user);
    expect(screen.getByRole('region', { name: 'GST on this bill' })).toHaveTextContent('CGST');
    await user.click(screen.getByRole('button', { name: 'Use percent discount for Penicillin V' }));
    await user.type(screen.getByLabelText('Discount %'), '10');
    await user.type(screen.getByLabelText('Bill discount ₹'), '5');
    await user.click(screen.getByRole('button', { name: 'Apply on this bill' }));
    expect(await screen.findByRole('status')).toHaveTextContent('INV/2026-27/BR01/00001');
    await waitFor(() => {
      expect(applyPricingMock).toHaveBeenLastCalledWith(
        'inv-1',
        expect.objectContaining({
          expectedVersion: 2,
          billDiscountType: 'FLAT',
          billDiscountValue: 500,
          lines: [expect.objectContaining({ productId: 'p1', type: 'PERCENT', value: 1000 })],
        }),
      );
    });
  });

  it('success: save bill sends percent discount as basis points not rupees', async () => {
    const user = userEvent.setup();
    applyPricingMock.mockResolvedValue({
      ...savedInvoice,
      version: 2,
      discountPaise: 1500,
      subtotalPaise: 8500,
    });
    renderPage();
    await screen.findByText('Penicillin V');
    await user.click(screen.getByRole('button', { name: /Add Penicillin V/i }));
    await user.type(screen.getByLabelText('MRP ₹'), '120');
    await user.type(screen.getByLabelText('Selling ₹'), '100');
    await user.click(screen.getByRole('button', { name: 'Use percent discount for Penicillin V' }));
    await user.type(screen.getByLabelText('Discount %'), '10');
    await user.type(screen.getByLabelText('Bill discount ₹'), '5');
    await user.click(screen.getByRole('button', { name: 'Skip — walk-in' }));
    await user.click(screen.getByRole('button', { name: 'Save bill' }));
    expect(await screen.findByRole('status')).toHaveTextContent('INV/2026-27/BR01/00001');
    await waitFor(() => {
      expect(applyPricingMock).toHaveBeenCalledWith(
        'inv-1',
        expect.objectContaining({
          expectedVersion: 1,
          billDiscountType: 'FLAT',
          billDiscountValue: 500,
          lines: [expect.objectContaining({ productId: 'p1', type: 'PERCENT', value: 1000 })],
        }),
      );
    });
  });

  it('success: waiting for sign-off after over-threshold discount', async () => {
    const user = userEvent.setup();
    applyPricingMock.mockResolvedValue({
      ...savedInvoice,
      version: 2,
      discountApprovalStatus: 'PENDING',
      discountApprovalRequestId: 'req-1',
    });
    renderPage();
    await saveDraft(user);
    await user.click(screen.getByRole('button', { name: 'Apply on this bill' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Waiting for sign-off');
  });

  it('success: tax override with reason restores product search focus', async () => {
    const user = userEvent.setup();
    adjustTaxMock.mockResolvedValue({
      ...savedInvoice,
      version: 2,
      taxAdjusted: true,
      taxAdjustmentReason: 'Wrong HSN on pack',
    });
    renderPage();
    await saveDraft(user);
    await user.click(screen.getByRole('button', { name: 'Tax override' }));
    const rate = screen.getByLabelText('GST rate %');
    await user.clear(rate);
    await user.type(rate, '5');
    await user.type(screen.getByLabelText('Override reason'), 'Wrong HSN on pack');
    await user.click(screen.getByRole('button', { name: 'Save tax override' }));
    await waitFor(() => {
      expect(adjustTaxMock).toHaveBeenCalledWith(
        'inv-1',
        expect.objectContaining({
          expectedVersion: 1,
          reason: 'Wrong HSN on pack',
          lines: [{ productId: 'p1', gstRate: 5 }],
        }),
      );
    });
    expect(screen.getByLabelText('Find medicine')).toHaveFocus();
  });

  it('success: inter-state GSTIN shows IGST on this bill', async () => {
    const user = userEvent.setup();
    applyPricingMock.mockResolvedValue({
      ...savedInvoice,
      version: 2,
      taxJurisdiction: 'INTER',
      cgstPaise: 0,
      sgstPaise: 0,
      igstPaise: 1200,
      taxPaise: 1200,
    });
    renderPage();
    await saveDraft(user);
    await user.type(screen.getByLabelText('Customer GSTIN'), '27AABCU9603R1ZM');
    await user.click(screen.getByRole('button', { name: 'Apply on this bill' }));
    await waitFor(() => {
      expect(applyPricingMock).toHaveBeenCalledWith(
        'inv-1',
        expect.objectContaining({ customerGstin: '27AABCU9603R1ZM' }),
      );
    });
    const gst = screen.getByRole('region', { name: 'GST on this bill' });
    expect(gst).toHaveTextContent('IGST');
    expect(gst).not.toHaveTextContent('CGST');
  });
});
