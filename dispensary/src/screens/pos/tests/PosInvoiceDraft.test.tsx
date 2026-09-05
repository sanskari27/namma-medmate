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
  createSalesInvoice,
  updateSalesInvoice,
  applyInvoicePricing,
} from '@/services/salesInvoices';

const listCustomersMock = vi.mocked(listCustomers);
const listProductsMock = vi.mocked(listProducts);
const listUnitsMock = vi.mocked(listProductUnits);
const convertMock = vi.mocked(convertProductUnit);
const listBatchesMock = vi.mocked(listStockBatches);
const listDoctorsMock = vi.mocked(listDoctors);
const createInvoiceMock = vi.mocked(createSalesInvoice);
const updateInvoiceMock = vi.mocked(updateSalesInvoice);
const applyPricingMock = vi.mocked(applyInvoicePricing);

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
  taxCategory: null,
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
  lines: [],
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

async function addPricedLine(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByText('Penicillin V');
  await user.click(screen.getByRole('button', { name: /Add Penicillin V/i }));
  await user.type(screen.getByLabelText('MRP ₹'), '120');
  await user.type(screen.getByLabelText('Selling ₹'), '100');
}

describe('PosScreen invoice draft', () => {
  beforeEach(() => {
    listCustomersMock.mockReset();
    listProductsMock.mockReset();
    listUnitsMock.mockReset();
    convertMock.mockReset();
    listBatchesMock.mockReset();
    listDoctorsMock.mockReset();
    createInvoiceMock.mockReset();
    updateInvoiceMock.mockReset();
    applyPricingMock.mockReset();
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

  it('loading: waits for catalogue before a bill', () => {
    listProductsMock.mockReturnValue(new Promise(() => undefined));
    renderPage();
    expect(screen.getByText('Loading catalogue for this till…')).toBeInTheDocument();
  });

  it('empty: no medicines to bill', async () => {
    listProductsMock.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByRole('status')).toHaveTextContent(
      'No medicines in the catalogue yet',
    );
  });

  it('denied: till without Sales cannot save a bill', () => {
    renderPage(['CRM']);
    expect(screen.getByRole('alert')).toHaveTextContent('This till cannot save Sales bills');
    expect(createInvoiceMock).not.toHaveBeenCalled();
  });

  it('failure: save bill network error', async () => {
    const user = userEvent.setup();
    createInvoiceMock.mockRejectedValue(new Error('network'));
    renderPage();
    await addPricedLine(user);
    await user.click(screen.getByRole('button', { name: 'Skip — walk-in' }));
    await user.click(screen.getByRole('button', { name: 'Save bill' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not save this bill');
  });

  it('validation: save without MRP or selling price', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Penicillin V');
    await user.click(screen.getByRole('button', { name: /Add Penicillin V/i }));
    await user.click(screen.getByRole('button', { name: 'Skip — walk-in' }));
    await user.click(screen.getByRole('button', { name: 'Save bill' }));
    expect(screen.getByRole('alert')).toHaveTextContent('MRP and selling price');
    expect(createInvoiceMock).not.toHaveBeenCalled();
  });

  it('conflict: stale stock on save', async () => {
    const user = userEvent.setup();
    createInvoiceMock.mockRejectedValue(new ApiError('Floor qty changed', 409, 'STALE_STOCK'));
    renderPage();
    await addPricedLine(user);
    await user.click(screen.getByRole('button', { name: 'Skip — walk-in' }));
    await user.click(screen.getByRole('button', { name: 'Save bill' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Draft warnings');
  });

  it('success: walk-in skip saves numbered draft and restores product focus', async () => {
    const user = userEvent.setup();
    renderPage();
    await addPricedLine(user);
    await user.click(screen.getByRole('button', { name: 'Skip — walk-in' }));
    expect(screen.getByText('Walk-in')).toBeInTheDocument();
    expect(screen.getByLabelText('Find medicine')).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Save bill' }));
    expect(await screen.findByRole('status')).toHaveTextContent('INV/2026-27/BR01/00001');
    await waitFor(() => {
      expect(createInvoiceMock).toHaveBeenCalledWith(
        expect.objectContaining({
          customerId: null,
          lines: [
            expect.objectContaining({
              productId: 'p1',
              mrpPaise: 12000,
              sellingPricePaise: 10000,
            }),
          ],
        }),
      );
    });
    expect(updateInvoiceMock).not.toHaveBeenCalled();
    expect(
      screen.getByText(/Draft INV\/2026-27\/BR01\/00001 is open on this till/),
    ).toBeInTheDocument();
  });

  it('success: save again after adding a line patches the open draft', async () => {
    const user = userEvent.setup();
    const productB = { ...productA, id: 'p2', sku: 'SKU-B', name: 'Paracetamol 500' };
    listProductsMock.mockResolvedValue([productA, productB]);
    updateInvoiceMock.mockResolvedValue({ ...savedInvoice, version: 2 });
    renderPage();
    await addPricedLine(user);
    await user.click(screen.getByRole('button', { name: 'Skip — walk-in' }));
    await user.click(screen.getByRole('button', { name: 'Save bill' }));
    expect(await screen.findByRole('status')).toHaveTextContent('INV/2026-27/BR01/00001');
    await user.click(screen.getByRole('button', { name: /Add Paracetamol 500/i }));
    const mrpFields = screen.getAllByLabelText('MRP ₹');
    const sellingFields = screen.getAllByLabelText('Selling ₹');
    await user.type(mrpFields[1], '50');
    await user.type(sellingFields[1], '40');
    await user.click(screen.getByRole('button', { name: 'Save bill' }));
    await waitFor(() => {
      expect(updateInvoiceMock).toHaveBeenCalledWith(
        'inv-1',
        expect.objectContaining({
          expectedVersion: 1,
          customerId: null,
          lines: [
            expect.objectContaining({ productId: 'p1', sellingPricePaise: 10000 }),
            expect.objectContaining({ productId: 'p2', mrpPaise: 5000, sellingPricePaise: 4000 }),
          ],
        }),
      );
    });
    expect(createInvoiceMock).toHaveBeenCalledTimes(1);
  });
});
