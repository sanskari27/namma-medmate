import { configureStore } from '@reduxjs/toolkit';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PosScreen from '@/screens/pos/PosScreen';
import { posReducer } from '@/screens/pos/store/pos.slice';
import { authReducer } from '@/store';
import type { SalesCatalogueItem } from '@/services/salesCatalogue';

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
import { convertProductUnit, listProductUnits } from '@/services/productUnits';
import { listSalesCatalogue } from '@/services/salesCatalogue';
import { applyInvoicePricing, createSalesInvoice } from '@/services/salesInvoices';

const listCustomersMock = vi.mocked(listCustomers);
const listCatalogueMock = vi.mocked(listSalesCatalogue);
const evaluateMock = vi.mocked(evaluateMedicationSafety);
const listUnitsMock = vi.mocked(listProductUnits);
const convertMock = vi.mocked(convertProductUnit);
const listBatchesMock = vi.mocked(listStockBatches);
const listDoctorsMock = vi.mocked(listDoctors);
const createInvoiceMock = vi.mocked(createSalesInvoice);
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

const itemH1: SalesCatalogueItem = {
  ...itemA,
  id: 'p-h1',
  sku: 'SKU-H1',
  name: 'Alprazolam',
  prescriptionRequired: true,
  scheduleClassification: 'H1',
  controlledSubstance: true,
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

function renderPage(
  modules: string[] = ['SALES', 'CRM', 'INVENTORY'],
  role = 'pharmacy_owner',
  roles: { id: string; name: string; code: string | null; kind: string }[] = [],
) {
  const store = configureStore({
    reducer: { auth: authReducer, pos: posReducer },
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

describe('PosScreen', () => {
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
    listCustomersMock.mockResolvedValue([customer]);
    listCatalogueMock.mockResolvedValue([itemA]);
    listDoctorsMock.mockResolvedValue([doctor]);
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
  });

  it('loading: waits for catalogue', () => {
    listCatalogueMock.mockReturnValue(new Promise(() => undefined));
    renderPage();
    expect(screen.getByText('Loading sales catalogue…')).toBeInTheDocument();
  });

  it('empty: no products in catalogue', async () => {
    listCatalogueMock.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText(/No medicines in the catalogue yet/)).toBeInTheDocument();
  });

  it('denied: till without Sales', () => {
    renderPage(['CRM']);
    expect(screen.getByRole('alert')).toHaveTextContent('This counter cannot save Sales bills');
    expect(listCatalogueMock).not.toHaveBeenCalled();
  });

  it('failure: bootstrap error', async () => {
    listCatalogueMock.mockRejectedValue(new Error('network'));
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not save this bill');
  });

  it('validation: Proceed without a customer stays on cart', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Penicillin V');
    await user.click(screen.getByRole('button', { name: 'Add Penicillin V pack to bill' }));
    expect(screen.getByRole('button', { name: 'Proceed to bill' })).toBeDisabled();
  });

  it('success: draft line shows converted base quantity', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Penicillin V');
    await user.click(screen.getByRole('button', { name: 'Add Penicillin V pack to bill' }));
    expect(await screen.findByText(/10 Tablet each/)).toBeInTheDocument();
    expect(convertMock).toHaveBeenCalledWith(
      'p1',
      expect.objectContaining({ quantity: 1, fromUnit: 'strip' }),
    );
  });

  it('suggests FEFO batch and allows override with near-expiry hint', async () => {
    const user = userEvent.setup();
    listCatalogueMock.mockResolvedValue([{ ...itemA, requiresBatchTracking: true }]);
    listBatchesMock.mockResolvedValue([
      {
        batchId: 'b-early',
        productId: 'p1',
        batchNumber: 'LOT-EARLY',
        manufacturedOn: '2026-01-01',
        expiresOn: '2026-09-20',
        purchasePricePaise: 1000,
        quantity: 10,
        version: 1,
        balanceId: 'bal1',
        suggestedFefo: true,
        nearExpiry: true,
        expired: false,
      },
      {
        batchId: 'b-late',
        productId: 'p1',
        batchNumber: 'LOT-LATE',
        manufacturedOn: '2026-02-01',
        expiresOn: '2027-06-30',
        purchasePricePaise: 2000,
        quantity: 10,
        version: 1,
        balanceId: 'bal2',
        suggestedFefo: false,
        nearExpiry: false,
        expired: false,
      },
    ]);

    renderPage();
    await screen.findByText('Penicillin V');
    await user.click(screen.getByRole('button', { name: 'Add Penicillin V pack to bill' }));

    const batchSelect = await screen.findByLabelText(/Batch for Penicillin V/i);
    expect(batchSelect).toHaveValue('b-early');
    expect(screen.getByText('Near expiry — still sellable.')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /FEFO suggested/i })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Select batch' })).not.toBeInTheDocument();

    await user.selectOptions(batchSelect, 'b-late');
    expect(batchSelect).toHaveValue('b-late');
  });

  it('denied: cashier cannot dispense Schedule H1', async () => {
    const user = userEvent.setup();
    listCatalogueMock.mockResolvedValue([itemH1]);
    renderPage(['SALES', 'CRM'], 'pharmacy_staff', [
      { id: 'r1', name: 'Cashier', code: 'cashier', kind: 'PREDEFINED' },
    ]);
    await screen.findByText('Alprazolam');
    await user.click(screen.getByRole('button', { name: 'Add Alprazolam pack to bill' }));
    expect(await screen.findByLabelText('Prescription details')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Select customer' }));
    await user.click(await screen.findByRole('option', { name: /Ravi Kumar/i }));
    await user.click(screen.getByRole('button', { name: 'Proceed to bill' }));
    expect(screen.getByRole('alert')).toHaveTextContent('cashier-only');
  });

  it('validation: Schedule pack needs prescriber and Prescription checked', async () => {
    const user = userEvent.setup();
    listCatalogueMock.mockResolvedValue([itemH1]);
    renderPage();
    await screen.findByText('Alprazolam');
    await user.click(screen.getByRole('button', { name: 'Select customer' }));
    await user.click(await screen.findByRole('option', { name: /Ravi Kumar/i }));
    await user.click(screen.getByRole('button', { name: 'Add Alprazolam pack to bill' }));
    await user.click(screen.getByRole('button', { name: 'Proceed to bill' }));
    expect(screen.getByRole('alert')).toHaveTextContent('prescriber');
  });
});
