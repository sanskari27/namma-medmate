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
    getCustomerCredit: vi.fn(),
    ApiError: axios.ApiError,
    isApiError: axios.isApiError,
  };
});

vi.mock('@/services/loyalty', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/loyalty')>();
  return {
    ...actual,
    getCustomerLoyalty: vi.fn(),
  };
});

vi.mock('@/services/salesInvoices', async () => {
  const axios = await import('@/services/axios');
  return {
    createSalesInvoice: vi.fn(),
    updateSalesInvoice: vi.fn(),
    applyInvoicePricing: vi.fn(),
    adjustInvoiceTax: vi.fn(),
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

import { getCustomerCredit } from '@/services/credit';
import { listCustomers } from '@/services/customers';
import { listDoctors } from '@/services/doctors';
import { listStockBatches } from '@/services/inventory';
import { getCustomerLoyalty } from '@/services/loyalty';
import { evaluateMedicationSafety } from '@/services/medicationSafety';
import { listProductUnits, convertProductUnit } from '@/services/productUnits';
import { listSalesCatalogue } from '@/services/salesCatalogue';
import {
  adjustInvoiceTax,
  applyInvoicePricing,
  completeSalesInvoice,
  createSalesInvoice,
  downloadInvoicePdf,
  emailInvoiceCopy,
  openInvoicePdf,
  updateSalesInvoice,
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
const adjustTaxMock = vi.mocked(adjustInvoiceTax);
const completeInvoiceMock = vi.mocked(completeSalesInvoice);
const downloadPdfMock = vi.mocked(downloadInvoicePdf);
const emailCopyMock = vi.mocked(emailInvoiceCopy);
const openPdfMock = vi.mocked(openInvoicePdf);
const updateInvoiceMock = vi.mocked(updateSalesInvoice);
const creditMock = vi.mocked(getCustomerCredit);
const loyaltyMock = vi.mocked(getCustomerLoyalty);

const customer = {
  id: 'c1',
  tenantId: 't1',
  name: 'Ravi Kumar',
  phone: '9876500001',
  email: 'ravi@example.com',
  dateOfBirth: null,
  gender: null,
  address: null,
  bloodGroup: null,
  allergies: null,
  chronicConditions: null,
  createdAt: '2026-09-04T00:00:00Z',
  updatedAt: '2026-09-04T00:00:00Z',
};

const pricedItem: SalesCatalogueItem = {
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

const unpricedItem: SalesCatalogueItem = {
  ...pricedItem,
  suggestedMrpPaise: null,
  suggestedSellingPaise: null,
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
        unit: 'strip',
        baseQuantity: 10,
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

function renderPage(modules: string[] = ['SALES', 'CRM', 'INVENTORY', 'LOYALTY']) {
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

async function addPack(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByText('Penicillin V');
  await user.click(screen.getByRole('button', { name: 'Add Penicillin V pack to bill' }));
}

async function walkIn(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Select customer' }));
  await user.click(screen.getByRole('button', { name: 'Continue as walk-in' }));
}

async function pickPatient(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Select customer' }));
  await user.click(await screen.findByRole('option', { name: /Ravi Kumar/i }));
}

async function proceed(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Proceed to bill' }));
}

describe('POS till chrome M6-POS-001', () => {
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
    adjustTaxMock.mockReset();
    completeInvoiceMock.mockReset();
    downloadPdfMock.mockReset();
    emailCopyMock.mockReset();
    openPdfMock.mockReset();
    creditMock.mockReset();
    loyaltyMock.mockReset();
    listCustomersMock.mockResolvedValue([customer]);
    listCatalogueMock.mockResolvedValue([pricedItem]);
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
    applyPricingMock.mockResolvedValue(invoice);
    creditMock.mockResolvedValue({
      customerId: 'c1',
      limitPaise: 500000,
      balancePaise: 100000,
      availablePaise: 400000,
      version: 1,
      entries: [],
    });
    loyaltyMock.mockResolvedValue({
      customerId: 'c1',
      balancePoints: 21,
      version: 1,
      entries: [],
    });
    downloadPdfMock.mockResolvedValue(new Blob(['pdf'], { type: 'application/pdf' }));
    emailCopyMock.mockResolvedValue({
      id: 'em-1',
      status: 'QUEUED',
      replayed: false,
      invoiceNumber: 'INV/2026-27/BR01/00001',
    });
  });

  it('empty: unpriced pack shows blank MRP and selling fields', async () => {
    const user = userEvent.setup();
    listCatalogueMock.mockResolvedValue([unpricedItem]);
    renderPage();
    await addPack(user);
    expect(screen.getByLabelText('MRP ₹')).toHaveValue('');
    expect(screen.getByLabelText('Selling ₹')).toHaveValue('');
  });

  it('validation: Proceed without MRP or selling stays on cart', async () => {
    const user = userEvent.setup();
    listCatalogueMock.mockResolvedValue([unpricedItem]);
    renderPage();
    await addPack(user);
    await walkIn(user);
    await proceed(user);
    expect(screen.getByRole('alert')).toHaveTextContent('MRP and selling price');
    expect(createInvoiceMock).not.toHaveBeenCalled();
  });

  it('denied: till without Sales has no line prices', () => {
    renderPage(['CRM']);
    expect(screen.getByRole('alert')).toHaveTextContent('This counter cannot save Sales bills');
    expect(screen.queryByLabelText('MRP ₹')).not.toBeInTheDocument();
  });

  it('success: cashier sets MRP and selling then Proceed sends paise', async () => {
    const user = userEvent.setup();
    listCatalogueMock.mockResolvedValue([unpricedItem]);
    renderPage();
    await addPack(user);
    await user.type(screen.getByLabelText('MRP ₹'), '120');
    await user.type(screen.getByLabelText('Selling ₹'), '100');
    await walkIn(user);
    await proceed(user);
    await waitFor(() => {
      expect(createInvoiceMock).toHaveBeenCalledWith(
        expect.objectContaining({
          lines: [expect.objectContaining({ mrpPaise: 12000, sellingPricePaise: 10000 })],
        }),
      );
    });
    expect(screen.getByRole('button', { name: /Charge ₹/ })).toBeInTheDocument();
  });

  it('success: cashier can correct a suggested selling price', async () => {
    const user = userEvent.setup();
    renderPage();
    await addPack(user);
    const selling = screen.getByLabelText('Selling ₹');
    expect(selling).toHaveValue('100');
    await user.clear(selling);
    await user.type(selling, '90');
    await walkIn(user);
    await proceed(user);
    await waitFor(() => {
      expect(createInvoiceMock).toHaveBeenCalledWith(
        expect.objectContaining({
          lines: [expect.objectContaining({ sellingPricePaise: 9000 })],
        }),
      );
    });
  });

  it('validation: tax override needs a reason', async () => {
    const user = userEvent.setup();
    renderPage();
    await addPack(user);
    await walkIn(user);
    await proceed(user);
    await user.click(await screen.findByRole('button', { name: 'Tax override' }));
    await user.click(screen.getByRole('button', { name: 'Save tax override' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Tax override needs a reason');
    expect(adjustTaxMock).not.toHaveBeenCalled();
  });

  it('conflict: stale tax override', async () => {
    const user = userEvent.setup();
    adjustTaxMock.mockRejectedValue(new ApiError('stale', 409, 'STALE_STATE'));
    renderPage();
    await addPack(user);
    await walkIn(user);
    await proceed(user);
    await user.click(await screen.findByRole('button', { name: 'Tax override' }));
    await user.type(screen.getByLabelText('Override reason'), 'Wrong HSN');
    await user.click(screen.getByRole('button', { name: 'Save tax override' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('This bill total changed');
  });

  it('failure: tax override network error', async () => {
    const user = userEvent.setup();
    adjustTaxMock.mockRejectedValue(new Error('network'));
    renderPage();
    await addPack(user);
    await walkIn(user);
    await proceed(user);
    await user.click(await screen.findByRole('button', { name: 'Tax override' }));
    await user.type(screen.getByLabelText('Override reason'), 'Wrong HSN');
    await user.click(screen.getByRole('button', { name: 'Save tax override' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not save this bill');
  });

  it('success: Customer GSTIN on payment is sent with pricing', async () => {
    const user = userEvent.setup();
    applyPricingMock.mockResolvedValue(
      draftInvoice({
        version: 2,
        customerGstin: '27AABCU9603R1ZM',
        taxJurisdiction: 'INTER',
        cgstPaise: 0,
        sgstPaise: 0,
        igstPaise: 1200,
      }),
    );
    renderPage();
    await addPack(user);
    await walkIn(user);
    await proceed(user);
    await user.type(await screen.findByLabelText('Customer GSTIN'), '27AABCU9603R1ZM');
    await user.click(screen.getByRole('button', { name: 'Apply GST on this bill' }));
    await waitFor(() => {
      expect(applyPricingMock).toHaveBeenCalledWith(
        'inv-1',
        expect.objectContaining({ customerGstin: '27AABCU9603R1ZM' }),
      );
    });
    expect(screen.getByRole('region', { name: 'GST on this bill' })).toHaveTextContent('IGST');
  });

  it('loading: points panel waits while the ledger loads', async () => {
    const user = userEvent.setup();
    loyaltyMock.mockReturnValue(new Promise(() => undefined));
    renderPage();
    await addPack(user);
    await pickPatient(user);
    await proceed(user);
    expect(await screen.findByText('Loading points…')).toBeInTheDocument();
    expect(screen.queryByLabelText('Use points')).not.toBeInTheDocument();
  });

  it('empty: linked patient with zero points has nothing to use', async () => {
    const user = userEvent.setup();
    loyaltyMock.mockResolvedValue({
      customerId: 'c1',
      balancePoints: 0,
      version: 0,
      entries: [],
    });
    renderPage();
    await addPack(user);
    await pickPatient(user);
    await proceed(user);
    expect(await screen.findByRole('region', { name: 'Points' })).toHaveTextContent(
      'No points on this patient yet.',
    );
    expect(screen.queryByLabelText('Use points')).not.toBeInTheDocument();
  });

  it('denied: till without Loyalty hides Use points', async () => {
    const user = userEvent.setup();
    renderPage(['SALES', 'CRM', 'INVENTORY']);
    await addPack(user);
    await pickPatient(user);
    await proceed(user);
    expect(screen.queryByRole('region', { name: 'Points' })).not.toBeInTheDocument();
    expect(loyaltyMock).not.toHaveBeenCalled();
  });

  it('validation: redeem over 20% of the bill is blocked at the till', async () => {
    const user = userEvent.setup();
    renderPage();
    await addPack(user);
    await pickPatient(user);
    await proceed(user);
    await user.type(await screen.findByLabelText('Use points'), '23');
    await user.click(screen.getByRole('button', { name: 'Cash' }));
    await user.click(screen.getByRole('button', { name: /Charge ₹/ }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Points can cover at most 20% of this bill.',
    );
    expect(completeInvoiceMock).not.toHaveBeenCalled();
  });

  it('success: Use points is posted on Charge', async () => {
    const user = userEvent.setup();
    completeInvoiceMock.mockResolvedValue(
      draftInvoice({
        status: 'COMPLETED',
        version: 2,
        customerId: 'c1',
        amountPaidPaise: 10200,
        loyaltyRedeemPoints: 10,
      }),
    );
    renderPage();
    await addPack(user);
    await pickPatient(user);
    await proceed(user);
    await user.type(await screen.findByLabelText('Use points'), '10');
    await user.click(screen.getByRole('button', { name: 'Cash' }));
    await user.click(screen.getByRole('button', { name: /Charge ₹/ }));
    await waitFor(() => {
      expect(completeInvoiceMock).toHaveBeenCalledWith(
        'inv-1',
        expect.objectContaining({ redeemPoints: 10 }),
      );
    });
  });

  it('success: Credit (Khata) shows remaining after the patient is picked', async () => {
    const user = userEvent.setup();
    renderPage();
    await addPack(user);
    await pickPatient(user);
    await proceed(user);
    await user.click(screen.getByRole('button', { name: 'Credit (Khata)' }));
    expect(await screen.findByText(/Khata left/)).toHaveTextContent('₹4,000.00');
    expect(creditMock).toHaveBeenCalledWith('c1');
  });

  it('empty: Print this bill waits until Charge', async () => {
    const user = userEvent.setup();
    renderPage();
    await addPack(user);
    await walkIn(user);
    await proceed(user);
    expect(screen.getByRole('region', { name: 'Bill copy' })).toHaveTextContent(
      'Collect this bill to print the A4 invoice.',
    );
    expect(screen.getByRole('button', { name: 'Print this bill' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Send bill copy' })).not.toBeInTheDocument();
  });

  it('loading: print waits on the A4 bill', async () => {
    const user = userEvent.setup();
    downloadPdfMock.mockReturnValue(new Promise(() => undefined));
    completeInvoiceMock.mockResolvedValue(draftInvoice({ status: 'COMPLETED', version: 2 }));
    renderPage();
    await addPack(user);
    await walkIn(user);
    await proceed(user);
    await user.click(screen.getByRole('button', { name: 'Cash' }));
    await user.click(screen.getByRole('button', { name: /Charge ₹/ }));
    await user.click(await screen.findByRole('button', { name: 'Print this bill' }));
    expect(await screen.findByText('Preparing the A4 bill…')).toBeInTheDocument();
  });

  it('failure: print network error', async () => {
    const user = userEvent.setup();
    downloadPdfMock.mockRejectedValue(new Error('network'));
    completeInvoiceMock.mockResolvedValue(draftInvoice({ status: 'COMPLETED', version: 2 }));
    renderPage();
    await addPack(user);
    await walkIn(user);
    await proceed(user);
    await user.click(screen.getByRole('button', { name: 'Cash' }));
    await user.click(screen.getByRole('button', { name: /Charge ₹/ }));
    await user.click(await screen.findByRole('button', { name: 'Print this bill' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not prepare this A4 bill');
  });

  it('success: Print this bill after Charge opens the A4 copy, then New sale clears the till', async () => {
    const user = userEvent.setup();
    completeInvoiceMock.mockResolvedValue(draftInvoice({ status: 'COMPLETED', version: 2 }));
    renderPage();
    await addPack(user);
    await walkIn(user);
    await proceed(user);
    await user.click(screen.getByRole('button', { name: 'Cash' }));
    await user.click(screen.getByRole('button', { name: /Charge ₹/ }));
    await user.click(await screen.findByRole('button', { name: 'Print this bill' }));
    await waitFor(() => {
      expect(downloadPdfMock).toHaveBeenCalledWith('inv-1');
      expect(openPdfMock).toHaveBeenCalled();
    });
    await user.click(screen.getByRole('button', { name: 'New sale' }));
    expect(screen.getByRole('button', { name: 'Proceed to bill' })).toBeInTheDocument();
    expect(screen.queryByText('Penicillin V')).toBeInTheDocument();
  });

  it('success: Send bill copy queues email for a linked patient', async () => {
    const user = userEvent.setup();
    completeInvoiceMock.mockResolvedValue(
      draftInvoice({ status: 'COMPLETED', version: 2, customerId: 'c1' }),
    );
    renderPage();
    await addPack(user);
    await pickPatient(user);
    await proceed(user);
    await user.click(screen.getByRole('button', { name: 'Cash' }));
    await user.click(screen.getByRole('button', { name: /Charge ₹/ }));
    await user.click(await screen.findByRole('button', { name: 'Send bill copy' }));
    await waitFor(() => {
      expect(emailCopyMock).toHaveBeenCalledWith('inv-1');
    });
    expect(screen.getByText('Bill copy queued for this patient.')).toBeInTheDocument();
  });

  it('success: Back after Charge starts a new sale and does not PATCH', async () => {
    const user = userEvent.setup();
    completeInvoiceMock.mockResolvedValue(draftInvoice({ status: 'COMPLETED', version: 2 }));
    renderPage();
    await addPack(user);
    await walkIn(user);
    await proceed(user);
    await user.click(screen.getByRole('button', { name: 'Cash' }));
    await user.click(screen.getByRole('button', { name: /Charge ₹/ }));
    await user.click(screen.getByRole('button', { name: '← Back to add items' }));
    expect(updateInvoiceMock).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Proceed to bill' })).toBeInTheDocument();
    expect(screen.queryByText('Penicillin V')).toBeInTheDocument();
  });
});
