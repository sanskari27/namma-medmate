import { configureStore } from '@reduxjs/toolkit';
import { render, screen, waitFor, within } from '@testing-library/react';
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

import { verifyControlledStock } from '@/services/controlledStock';
import { listCustomers } from '@/services/customers';
import { listDoctors } from '@/services/doctors';
import { listStockBatches } from '@/services/inventory';
import {
  assertMedicationSafetyCleared,
  evaluateMedicationSafety,
} from '@/services/medicationSafety';
import { listProducts } from '@/services/products';
import { convertProductUnit, listProductUnits } from '@/services/productUnits';

const listCustomersMock = vi.mocked(listCustomers);
const listProductsMock = vi.mocked(listProducts);
const evaluateMock = vi.mocked(evaluateMedicationSafety);
const assertMock = vi.mocked(assertMedicationSafetyCleared);
const listUnitsMock = vi.mocked(listProductUnits);
const convertMock = vi.mocked(convertProductUnit);
const listBatchesMock = vi.mocked(listStockBatches);
const listDoctorsMock = vi.mocked(listDoctors);
const verifyControlledMock = vi.mocked(verifyControlledStock);

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
  hsnCode: null,
  gstRate: null,
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

const productB = {
  ...productA,
  id: 'p2',
  sku: 'SKU-B',
  name: 'Amox Clone',
  composition: 'Penicillin',
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

const productH1 = {
  ...productA,
  id: 'p-h1',
  sku: 'SKU-H1',
  name: 'Alprazolam',
  scheduleClassification: 'H1' as const,
  controlledSubstance: true,
  prescriptionRequired: true,
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

describe('PosScreen', () => {
  beforeEach(() => {
    listCustomersMock.mockReset();
    listProductsMock.mockReset();
    evaluateMock.mockReset();
    assertMock.mockReset();
    listUnitsMock.mockReset();
    convertMock.mockReset();
    listBatchesMock.mockReset();
    listDoctorsMock.mockReset();
    verifyControlledMock.mockReset();
    listCustomersMock.mockResolvedValue([customer]);
    listProductsMock.mockResolvedValue([productA, productB]);
    listDoctorsMock.mockResolvedValue([doctor]);
    verifyControlledMock.mockResolvedValue({
      allowed: true,
      controlledProductIds: [],
      schedules: {},
    });
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
  });

  it('loading: waits for catalogue', () => {
    listProductsMock.mockReturnValue(new Promise(() => undefined));
    listCustomersMock.mockReturnValue(new Promise(() => undefined));
    renderPage();
    expect(screen.getByText('Loading catalogue for this till…')).toBeInTheDocument();
  });

  it('empty: no products in catalogue', async () => {
    listProductsMock.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByRole('status')).toHaveTextContent(
      'No medicines in the catalogue yet',
    );
  });

  it('denied: till without Sales', () => {
    renderPage(['CRM']);
    expect(screen.getByRole('alert')).toHaveTextContent('This till cannot save Sales bills');
    expect(listProductsMock).not.toHaveBeenCalled();
  });

  it('failure: bootstrap error', async () => {
    listProductsMock.mockRejectedValue(new Error('network'));
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not save this bill');
  });

  it('validation: complete without customer or reason', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Penicillin V');
    await user.click(screen.getByRole('button', { name: /Add Penicillin V/i }));
    await user.click(screen.getByRole('button', { name: 'Complete check' }));
    expect(screen.getByRole('alert')).toHaveTextContent('linked customer');
  });

  it('success: draft line shows converted base quantity', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Penicillin V');
    await user.click(screen.getByRole('button', { name: /Add Penicillin V/i }));
    expect(await screen.findByText('= 10 Tablet')).toBeInTheDocument();
    expect(convertMock).toHaveBeenCalledWith(
      'p1',
      expect.objectContaining({ quantity: 1, fromUnit: 'strip' }),
    );
  });

  it('success: allergy warning requires reason then clears', async () => {
    const user = userEvent.setup();
    evaluateMock.mockResolvedValue({
      checkStatus: 'CHECKED',
      checkLabel: null,
      productsChecked: 1,
      warnings: [
        {
          warningKey: 'ALLERGY:c1:p1:penicillin',
          kind: 'ALLERGY',
          customerId: 'c1',
          productId: 'p1',
          productIds: ['p1'],
          matchedAllergen: 'Penicillin',
          matchedComposition: null,
          matchedField: 'composition',
          severity: 'WARN',
          requiredAction: 'REVIEW',
          requiredReview: true,
        },
      ],
    });
    assertMock.mockResolvedValue({ cleared: true });

    renderPage();
    await screen.findByText('Ravi Kumar');
    await user.click(screen.getByRole('button', { name: /Ravi Kumar/i }));
    await user.click(screen.getByRole('button', { name: /Add Penicillin V/i }));
    await user.click(screen.getByRole('button', { name: 'Check draft' }));

    expect(await screen.findByText('Allergy warning')).toBeInTheDocument();
    expect(
      await screen.findByText(/Allergy match: Penicillin on Penicillin V/),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Review reason')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Complete check' }));
    expect(screen.getByRole('alert')).toHaveTextContent('review reason');

    await user.type(screen.getByLabelText('Review reason'), 'Pharmacist reviewed');
    await user.click(screen.getByRole('button', { name: 'Complete check' }));

    await waitFor(() => {
      expect(assertMock).toHaveBeenCalledWith({
        customerId: 'c1',
        productIds: ['p1'],
        warningKeys: ['ALLERGY:c1:p1:penicillin'],
        reason: 'Pharmacist reviewed',
      });
    });
    expect(await screen.findByRole('status')).toHaveTextContent('Safety review recorded');
  });

  it('conflict: stale warning keys', async () => {
    const user = userEvent.setup();
    evaluateMock.mockResolvedValue({
      checkStatus: 'CHECKED',
      checkLabel: null,
      productsChecked: 1,
      warnings: [],
    });
    assertMock.mockRejectedValue(new ApiError('Draft warnings changed', 409, 'CONFLICT'));

    renderPage();
    await screen.findByText('Ravi Kumar');
    await user.click(screen.getByRole('button', { name: /Ravi Kumar/i }));
    await user.click(screen.getByRole('button', { name: /Add Penicillin V/i }));
    await user.click(screen.getByRole('button', { name: 'Check draft' }));
    await user.click(screen.getByRole('button', { name: 'Complete check' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Draft warnings');
  });

  it('shows duplicate composition warning for same-therapy draft lines', async () => {
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
    await screen.findByText('Ravi Kumar');
    await user.click(screen.getByRole('button', { name: /Ravi Kumar/i }));
    await user.click(screen.getByRole('button', { name: /Add Penicillin V/i }));
    await user.click(screen.getByRole('button', { name: /Add Amox Clone/i }));
    await user.click(screen.getByRole('button', { name: 'Check draft' }));

    expect(await screen.findByText('Duplicate composition')).toBeInTheDocument();
    expect(
      screen.getByText(/Same composition on Penicillin V, Amox Clone \(Penicillin\)/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Review required/)).toBeInTheDocument();
    expect(screen.getByLabelText('Review reason')).toBeInTheDocument();
  });

  it('shows incomplete not-checked label and keeps draft lines', async () => {
    const user = userEvent.setup();
    evaluateMock.mockResolvedValue({
      checkStatus: 'INCOMPLETE',
      checkLabel: 'Not checked',
      productsChecked: 1,
      warnings: [],
    });

    renderPage();
    await screen.findByText('Ravi Kumar');
    await user.click(screen.getByRole('button', { name: /Ravi Kumar/i }));
    await user.click(screen.getByRole('button', { name: /Add Penicillin V/i }));
    await user.click(screen.getByRole('button', { name: 'Check draft' }));

    expect(await screen.findByText(/Not checked/)).toBeInTheDocument();
    expect(screen.getByText(/never treated as safe/)).toBeInTheDocument();
    expect(
      within(screen.getByLabelText('Draft lines')).getByText('Penicillin V'),
    ).toBeInTheDocument();
  });

  it('suggests FEFO batch and allows override with near-expiry warning', async () => {
    const user = userEvent.setup();
    listProductsMock.mockResolvedValue([{ ...productA, requiresBatchTracking: true }]);
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
    await screen.findByText('Ravi Kumar');
    await user.click(screen.getByRole('button', { name: /Add Penicillin V/i }));

    const batchSelect = await screen.findByLabelText(/Batch \(FEFO suggested\)/i);
    expect(batchSelect).toHaveValue('b-early');
    expect(screen.getByText(/Near expiry — still sellable/i)).toBeInTheDocument();

    await user.selectOptions(batchSelect, 'b-late');
    expect(batchSelect).toHaveValue('b-late');
    expect(screen.queryByText(/Near expiry — still sellable/i)).not.toBeInTheDocument();
  });

  it('denied: cashier cannot dispense Schedule H1', async () => {
    const user = userEvent.setup();
    listProductsMock.mockResolvedValue([productH1]);
    renderPage(['SALES', 'CRM'], 'pharmacy_staff', [
      { id: 'r1', name: 'Cashier', code: 'cashier', kind: 'PREDEFINED' },
    ]);
    await screen.findByText('Alprazolam');
    await user.click(screen.getByRole('button', { name: /Add Alprazolam/i }));
    expect(await screen.findByLabelText('Schedule dispense')).toBeInTheDocument();
    expect(screen.getByText(/Cashier-only logins cannot dispense/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Ravi Kumar/i }));
    await user.click(screen.getByRole('button', { name: 'Complete check' }));
    expect(screen.getByRole('alert')).toHaveTextContent('cashier-only');
    expect(verifyControlledMock).not.toHaveBeenCalled();
  });

  it('validation: Schedule pack needs prescriber and Prescription checked', async () => {
    const user = userEvent.setup();
    listProductsMock.mockResolvedValue([productH1]);
    renderPage();
    await screen.findByText('Alprazolam');
    await user.click(screen.getByRole('button', { name: /Ravi Kumar/i }));
    await user.click(screen.getByRole('button', { name: /Add Alprazolam/i }));
    await user.click(screen.getByRole('button', { name: 'Complete check' }));
    expect(screen.getByRole('alert')).toHaveTextContent('prescriber');
    expect(verifyControlledMock).not.toHaveBeenCalled();
  });

  it('success: pharmacist verifies prescription then completes', async () => {
    const user = userEvent.setup();
    listProductsMock.mockResolvedValue([productH1]);
    evaluateMock.mockResolvedValue({
      checkStatus: 'CHECKED',
      checkLabel: null,
      productsChecked: 1,
      warnings: [],
    });
    assertMock.mockResolvedValue({ cleared: true });
    verifyControlledMock.mockResolvedValue({
      allowed: true,
      controlledProductIds: ['p-h1'],
      schedules: { 'p-h1': 'H1' },
    });
    renderPage(['SALES', 'INVENTORY', 'CRM'], 'pharmacy_staff', [
      { id: 'r2', name: 'Pharmacist', code: 'pharmacist', kind: 'PREDEFINED' },
    ]);
    await screen.findByText('Alprazolam');
    await user.click(screen.getByRole('button', { name: /Ravi Kumar/i }));
    await user.click(screen.getByRole('button', { name: /Add Alprazolam/i }));
    await user.selectOptions(screen.getByLabelText('Prescriber'), 'd1');
    await user.click(screen.getByLabelText('Prescription checked'));
    await user.click(screen.getByRole('button', { name: 'Complete check' }));
    await waitFor(() => {
      expect(verifyControlledMock).toHaveBeenCalledWith({
        customerId: 'c1',
        doctorId: 'd1',
        prescriptionVerified: true,
        productIds: ['p-h1'],
      });
    });
    expect(await screen.findByRole('status')).toHaveTextContent('Safety review recorded');
  });
});
