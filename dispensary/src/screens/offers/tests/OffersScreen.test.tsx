import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import OffersScreen from '@/screens/offers/OffersScreen';
import { ApiError } from '@/services/axios';
import { authReducer } from '@/store';

vi.mock('@/services/offers', async () => {
  const axios = await import('@/services/axios');
  return {
    listOffers: vi.fn(),
    createOffer: vi.fn(),
    updateOffer: vi.fn(),
    publishOffer: vi.fn(),
    deactivateOffer: vi.fn(),
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

import {
  createOffer,
  deactivateOffer,
  listOffers,
  publishOffer,
  type SalesOffer,
} from '@/services/offers';
import { listProducts } from '@/services/products';

const listMock = vi.mocked(listOffers);
const createMock = vi.mocked(createOffer);
const publishMock = vi.mocked(publishOffer);
const deactivateMock = vi.mocked(deactivateOffer);
const productsMock = vi.mocked(listProducts);

const product = {
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
  createdAt: '2026-09-05T00:00:00Z',
  updatedAt: '2026-09-05T00:00:00Z',
};

const sample: SalesOffer = {
  id: 'o1',
  tenantId: 't1',
  name: 'Buy 2 get 1',
  kind: 'BOGO',
  status: 'DRAFT',
  priority: 10,
  startsAt: null,
  endsAt: null,
  buyQuantity: 2,
  getQuantity: 1,
  benefitType: 'FREE_QTY',
  benefitValue: 1,
  version: 1,
  products: [
    { productId: 'p1', slot: 'TRIGGER' },
    { productId: 'p1', slot: 'BENEFIT' },
  ],
  createdAt: '2026-09-05T00:00:00Z',
  updatedAt: '2026-09-05T00:00:00Z',
};

function renderPage(modules: string[] = ['SALES']) {
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
        <OffersScreen />
      </MemoryRouter>
    </Provider>,
  );
}

describe('counter schemes', () => {
  beforeEach(() => {
    listMock.mockReset();
    createMock.mockReset();
    publishMock.mockReset();
    deactivateMock.mockReset();
    productsMock.mockReset();
    productsMock.mockResolvedValue([product]);
  });

  it('loading: waits for schemes', () => {
    listMock.mockReturnValue(new Promise(() => undefined));
    renderPage();
    expect(screen.getByText('Loading schemes at this counter…')).toBeInTheDocument();
  });

  it('empty: no schemes yet', async () => {
    listMock.mockResolvedValue({ items: [] });
    renderPage();
    expect(
      await screen.findByText('No schemes yet. Add a BOGO or seasonal scheme for this counter.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Schemes' })).toBeInTheDocument();
  });

  it('denied: till without Sales cannot manage schemes', () => {
    renderPage(['INVENTORY']);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'This till cannot manage schemes. Ask the owner to grant Sales.',
    );
    expect(listMock).not.toHaveBeenCalled();
  });

  it('validation: name and a medicine before save', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue({ items: [] });
    renderPage();
    await screen.findByRole('heading', { name: 'Schemes' });
    await user.click(screen.getByRole('button', { name: 'New scheme' }));
    await user.click(screen.getByRole('button', { name: 'Save scheme' }));
    expect(screen.getByRole('status')).toHaveTextContent(
      'Name and at least one medicine are needed before saving this scheme.',
    );
    expect(createMock).not.toHaveBeenCalled();
  });

  it('conflict: another till already changed this scheme', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue({ items: [sample] });
    publishMock.mockRejectedValue(new ApiError('stale', 409, 'STALE_STATE'));
    renderPage();
    await screen.findByRole('button', { name: /Buy 2 get 1/ });
    await user.click(screen.getByRole('button', { name: /Buy 2 get 1/ }));
    await user.click(screen.getByRole('button', { name: 'Publish scheme' }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'This scheme was updated on another till. Refresh, then publish again.',
    );
  });

  it('failure: list network error', async () => {
    listMock.mockRejectedValue(new Error('network'));
    renderPage();
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Could not load schemes. Check the connection and try again.',
    );
  });

  it('success: save and publish a BOGO scheme', async () => {
    const user = userEvent.setup();
    listMock
      .mockResolvedValueOnce({ items: [] })
      .mockResolvedValue({ items: [{ ...sample, status: 'ACTIVE', version: 2 }] });
    createMock.mockResolvedValue(sample);
    publishMock.mockResolvedValue({ ...sample, status: 'ACTIVE', version: 2 });
    renderPage();
    await screen.findByRole('heading', { name: 'Schemes' });
    await user.click(screen.getByRole('button', { name: 'New scheme' }));
    fireEvent.change(screen.getByLabelText('Scheme name'), { target: { value: 'Buy 2 get 1' } });
    fireEvent.change(screen.getByLabelText('Priority'), { target: { value: '10' } });
    await user.click(screen.getByRole('checkbox', { name: 'Penicillin V' }));
    await user.click(screen.getByRole('button', { name: 'Save scheme' }));
    await waitFor(() => expect(createMock).toHaveBeenCalled());
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Scheme saved as a draft on this counter.',
    );
    await user.click(screen.getByRole('button', { name: 'Publish scheme' }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Buy 2 get 1 is live on this counter.',
    );
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'New scheme' })).toHaveFocus();
    });
  });

  it('validation: invalid seasonal window from the server', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue({ items: [] });
    createMock.mockRejectedValue(new ApiError('dates', 422, 'INVALID_DATES'));
    renderPage();
    await screen.findByRole('heading', { name: 'Schemes' });
    await user.click(screen.getByRole('button', { name: 'New scheme' }));
    fireEvent.change(screen.getByLabelText('Scheme name'), { target: { value: 'Festive 10' } });
    await user.click(screen.getByRole('checkbox', { name: 'Penicillin V' }));
    await user.click(screen.getByRole('button', { name: 'Save scheme' }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Start and end must be a valid window for this seasonal scheme.',
    );
  });

  it('success: turn a live scheme off', async () => {
    const user = userEvent.setup();
    const live = { ...sample, status: 'ACTIVE' as const, version: 2 };
    listMock.mockResolvedValue({ items: [live] });
    deactivateMock.mockResolvedValue({ ...live, status: 'INACTIVE', version: 3 });
    renderPage();
    await user.click(await screen.findByRole('button', { name: /Buy 2 get 1/ }));
    await user.click(screen.getByRole('button', { name: 'Turn this scheme off' }));
    expect(await screen.findByRole('status')).toHaveTextContent('This scheme is off.');
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'New scheme' })).toHaveFocus();
    });
  });
});
