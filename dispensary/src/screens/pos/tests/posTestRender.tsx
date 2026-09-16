import { configureStore } from '@reduxjs/toolkit';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import PosScreen from '@/screens/pos/PosScreen';
import { posReducer } from '@/screens/pos/store/pos.slice';
import { authReducer } from '@/store';
import type { SalesCatalogueItem } from '@/services/salesCatalogue';
import type { SalesInvoice } from '@/services/salesInvoices';

export const posCustomer = {
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

export const posDoctor = {
  id: 'd1',
  tenantId: 't1',
  name: 'Dr. Mehta',
  registrationNumber: 'KA-1001',
  phone: null,
  notes: null,
  createdAt: '2026-09-04T00:00:00Z',
  updatedAt: '2026-09-04T00:00:00Z',
};

export const posPricedItem: SalesCatalogueItem = {
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

export const posRxItem: SalesCatalogueItem = {
  ...posPricedItem,
  id: 'p-rx',
  sku: 'SKU-RX',
  name: 'Amoxil',
  genericName: 'Amoxicillin',
  brandName: 'Amoxil',
  prescriptionRequired: true,
};

export const posH1Item: SalesCatalogueItem = {
  ...posRxItem,
  id: 'p-h1',
  sku: 'SKU-H1',
  name: 'Alprazolam',
  scheduleClassification: 'H1',
  controlledSubstance: true,
};

export function posDraftInvoice(overrides: Partial<SalesInvoice> = {}): SalesInvoice {
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
        productId: overrides.customerId === 'c1' && overrides.prescriptionReference ? 'p-rx' : 'p1',
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

export function renderPos(
  modules: string[] = ['SALES', 'CRM', 'INVENTORY', 'LOYALTY'],
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
  return {
    store,
    ...render(
      <Provider store={store}>
        <MemoryRouter>
          <PosScreen />
        </MemoryRouter>
      </Provider>,
    ),
  };
}

export async function addNamedPack(user: ReturnType<typeof userEvent.setup>, name: string) {
  await screen.findByText(name);
  await user.click(screen.getByRole('button', { name: `Add ${name} pack to bill` }));
}

export async function walkInPos(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Select customer' }));
  await user.click(screen.getByRole('button', { name: 'Continue as walk-in' }));
}

export async function pickPatientPos(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Select customer' }));
  await user.click(await screen.findByRole('option', { name: /Ravi Kumar/i }));
}

export async function proceedPos(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Proceed to bill' }));
}
