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

import { listCustomers } from '@/services/customers';
import {
  assertMedicationSafetyCleared,
  evaluateMedicationSafety,
} from '@/services/medicationSafety';
import { listProducts } from '@/services/products';

const listCustomersMock = vi.mocked(listCustomers);
const listProductsMock = vi.mocked(listProducts);
const evaluateMock = vi.mocked(evaluateMedicationSafety);
const assertMock = vi.mocked(assertMedicationSafetyCleared);

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
    listCustomersMock.mockResolvedValue([customer]);
    listProductsMock.mockResolvedValue([productA, productB]);
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
    expect(screen.getByRole('alert')).toHaveTextContent('This till cannot run Sales safety checks');
    expect(listProductsMock).not.toHaveBeenCalled();
  });

  it('failure: bootstrap error', async () => {
    listProductsMock.mockRejectedValue(new Error('network'));
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not reach medication safety checks',
    );
  });

  it('validation: complete without customer or reason', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Penicillin V');
    await user.click(screen.getByRole('button', { name: /Add Penicillin V/i }));
    await user.click(screen.getByRole('button', { name: 'Complete check' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Link a customer');
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

    expect(await screen.findByRole('alert')).toHaveTextContent('Draft warnings changed');
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
});
