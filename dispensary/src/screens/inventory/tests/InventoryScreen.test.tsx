import { configureStore } from '@reduxjs/toolkit';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import InventoryScreen from '@/screens/inventory/InventoryScreen';
import { ApiError } from '@/services/axios';
import { authReducer } from '@/store';
import type { Product } from '@/services/products';
import type { ProductCategory } from '@/services/productCategories';
import type { Manufacturer } from '@/services/manufacturers';

vi.mock('@/services/products', async () => {
  const axios = await import('@/services/axios');
  return {
    listProducts: vi.fn(),
    getProduct: vi.fn(),
    createProduct: vi.fn(),
    updateProduct: vi.fn(),
    ApiError: axios.ApiError,
    isApiError: axios.isApiError,
  };
});

vi.mock('@/services/productCategories', async () => {
  const axios = await import('@/services/axios');
  return {
    listProductCategories: vi.fn(),
    createProductCategory: vi.fn(),
    ApiError: axios.ApiError,
    isApiError: axios.isApiError,
  };
});

vi.mock('@/services/manufacturers', async () => {
  const axios = await import('@/services/axios');
  return {
    listManufacturers: vi.fn(),
    createManufacturer: vi.fn(),
    ApiError: axios.ApiError,
    isApiError: axios.isApiError,
  };
});

vi.mock('@/services/productUnits', async () => {
  const axios = await import('@/services/axios');
  return {
    listProductUnits: vi.fn(),
    replaceProductUnits: vi.fn(),
    convertProductUnit: vi.fn(),
    ApiError: axios.ApiError,
    isApiError: axios.isApiError,
  };
});

import { createProduct, listProducts, updateProduct } from '@/services/products';
import { createProductCategory, listProductCategories } from '@/services/productCategories';
import { createManufacturer, listManufacturers } from '@/services/manufacturers';
import { listProductUnits, replaceProductUnits } from '@/services/productUnits';

const listMock = vi.mocked(listProducts);
const createMock = vi.mocked(createProduct);
const updateMock = vi.mocked(updateProduct);
const listCategoriesMock = vi.mocked(listProductCategories);
const createCategoryMock = vi.mocked(createProductCategory);
const listManufacturersMock = vi.mocked(listManufacturers);
const createManufacturerMock = vi.mocked(createManufacturer);
const listUnitsMock = vi.mocked(listProductUnits);
const replaceUnitsMock = vi.mocked(replaceProductUnits);

const category: ProductCategory = {
  id: 'cat1',
  tenantId: 't1',
  name: 'Analgesics',
  createdAt: '2026-09-04T00:00:00Z',
  updatedAt: '2026-09-04T00:00:00Z',
};

const manufacturer: Manufacturer = {
  id: 'mfr1',
  tenantId: 't1',
  name: 'Cipla',
  createdAt: '2026-09-04T00:00:00Z',
  updatedAt: '2026-09-04T00:00:00Z',
};

const sample: Product = {
  id: 'p1',
  tenantId: 't1',
  sku: 'SKU-PARA',
  barcode: '8901000000001',
  name: 'Paracetamol 500',
  genericName: 'Paracetamol',
  brandName: 'Crocin',
  manufacturerId: 'mfr1',
  categoryId: 'cat1',
  productType: 'Medicine',
  dosageForm: 'Tablet',
  therapeuticClass: 'Analgesic',
  composition: null,
  strength: '500 mg',
  route: 'Oral',
  prescriptionRequired: false,
  scheduleClassification: 'OTC',
  hsnCode: '30049099',
  gstRate: 12,
  baseUnit: 'Tablet',
  packSize: 10,
  packUnit: 'strip',
  packDescription: '10 tablets/strip',
  storageConditions: null,
  requiresColdStorage: false,
  rackLocation: 'A-12',
  reorderLevel: 20,
  reorderQuantity: 100,
  minimumStock: 10,
  isDiscontinued: false,
  isReturnable: true,
  isTaxable: true,
  taxCategory: null,
  requiresBatchTracking: true,
  requiresExpiryTracking: true,
  requiresSerialTracking: false,
  controlledSubstance: false,
  notes: null,
  isActive: true,
  createdAt: '2026-09-04T00:00:00Z',
  updatedAt: '2026-09-04T00:00:00Z',
};

function renderPage(modules: string[] = ['INVENTORY', 'SALES']) {
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
        <InventoryScreen />
      </MemoryRouter>
    </Provider>,
  );
}

describe('floor inventory catalogue', () => {
  beforeEach(() => {
    listMock.mockReset();
    createMock.mockReset();
    updateMock.mockReset();
    listCategoriesMock.mockReset();
    createCategoryMock.mockReset();
    listManufacturersMock.mockReset();
    createManufacturerMock.mockReset();
    listUnitsMock.mockReset();
    replaceUnitsMock.mockReset();
    listCategoriesMock.mockResolvedValue([category]);
    listManufacturersMock.mockResolvedValue([manufacturer]);
    listUnitsMock.mockResolvedValue({
      baseUnit: 'Tablet',
      quantityPrecision: 0,
      units: [{ unit: 'strip', factorToBase: 10, version: 1 }],
    });
    replaceUnitsMock.mockResolvedValue({
      baseUnit: 'Tablet',
      quantityPrecision: 0,
      units: [{ unit: 'strip', factorToBase: 10, version: 1 }],
    });
  });

  it('loading: waits for products', () => {
    listMock.mockReturnValue(new Promise(() => undefined));
    renderPage();
    expect(screen.getByText('Loading stock catalogue for this floor…')).toBeInTheDocument();
  });

  it('empty: no products yet', async () => {
    listMock.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByRole('heading', { name: 'Inventory' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'No products yet. Add the first SKU for this pharmacy catalogue.',
    );
  });

  it('denied: till without Inventory', () => {
    renderPage(['SALES']);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'This till login cannot open inventory. Ask the owner to grant the Inventory area.',
    );
    expect(listMock).not.toHaveBeenCalled();
  });

  it('denied: API FORBIDDEN', async () => {
    listMock.mockRejectedValue(new ApiError('Forbidden', 403, 'FORBIDDEN'));
    renderPage();
    expect(
      await screen.findByText(
        'This till login cannot open inventory. Ask the owner to grant the Inventory area.',
      ),
    ).toBeInTheDocument();
  });

  it('failure: server unreachable', async () => {
    listMock.mockRejectedValue(new ApiError('down', 500, 'SERVER_ERROR'));
    renderPage();
    expect(
      await screen.findByText('Could not reach the server for inventory. Try again.'),
    ).toBeInTheDocument();
  });

  it('validation: missing required fields on create', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([]);
    renderPage();
    await screen.findByRole('heading', { name: 'Inventory' });
    await user.click(screen.getByRole('button', { name: 'Add product' }));
    await user.click(screen.getByRole('button', { name: 'Create product' }));
    expect(screen.getByRole('status')).toHaveTextContent(
      'Check SKU, pack size, quantity precision',
    );
    expect(createMock).not.toHaveBeenCalled();
  });

  it('validation: zero conversion factor rejected', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([sample]);
    renderPage();
    await user.click(await screen.findByRole('button', { name: /Paracetamol 500/ }));
    await screen.findByRole('heading', { name: 'Edit product' });
    const factor = screen.getAllByLabelText(/Equals how many Tablet/)[0];
    await user.clear(factor);
    await user.type(factor, '0');
    await user.click(screen.getByRole('button', { name: 'Save product' }));
    expect(screen.getByRole('status')).toHaveTextContent('conversion factors');
    expect(updateMock).not.toHaveBeenCalled();
    expect(replaceUnitsMock).not.toHaveBeenCalled();
  });

  it('validation: PRECISION_LOSS from API', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([sample]);
    updateMock.mockResolvedValue(sample);
    replaceUnitsMock.mockRejectedValue(new ApiError('precision', 422, 'PRECISION_LOSS'));
    renderPage();
    await user.click(await screen.findByRole('button', { name: /Paracetamol 500/ }));
    await screen.findByRole('heading', { name: 'Edit product' });
    await user.click(screen.getByRole('button', { name: 'Save product' }));
    expect(await screen.findByRole('status')).toHaveTextContent('conversion factors');
  });

  it('success: save quantity precision 2', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([sample]);
    updateMock.mockResolvedValue(sample);
    replaceUnitsMock.mockResolvedValue({
      baseUnit: 'Tablet',
      quantityPrecision: 2,
      units: [{ unit: 'strip', factorToBase: 10, version: 1 }],
    });
    renderPage();
    await user.click(await screen.findByRole('button', { name: /Paracetamol 500/ }));
    await screen.findByRole('heading', { name: 'Edit product' });
    const precision = screen.getByLabelText('Quantity precision');
    await user.clear(precision);
    await user.type(precision, '2');
    await user.click(screen.getByRole('button', { name: 'Save product' }));
    await waitFor(() => {
      expect(replaceUnitsMock).toHaveBeenCalledWith(
        'p1',
        expect.objectContaining({ quantityPrecision: 2 }),
      );
    });
    expect(await screen.findByText('Product saved on this floor catalogue.')).toBeInTheDocument();
  });

  it('conflict: duplicate SKU', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([]);
    createMock.mockRejectedValue(new ApiError('taken', 409, 'SKU_TAKEN'));
    renderPage();
    await screen.findByRole('heading', { name: 'Inventory' });
    await user.click(screen.getByRole('button', { name: 'Add product' }));

    await user.type(screen.getByLabelText('SKU'), 'SKU-DUP');
    await user.type(screen.getByLabelText('Name'), 'Dup Pack');
    await user.selectOptions(screen.getByLabelText('Category'), 'cat1');
    await user.click(screen.getByRole('button', { name: 'Create product' }));

    expect(
      await screen.findByText(
        'That SKU is already on this pharmacy catalogue. Pick another code or edit the existing product.',
      ),
    ).toBeInTheDocument();
  });

  it('success: create product', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValueOnce([]).mockResolvedValueOnce([sample]);
    createMock.mockResolvedValue(sample);
    renderPage();
    await screen.findByRole('heading', { name: 'Inventory' });
    await user.click(screen.getByRole('button', { name: 'Add product' }));

    await user.type(screen.getByLabelText('SKU'), 'SKU-PARA');
    await user.type(screen.getByLabelText('Name'), 'Paracetamol 500');
    await user.selectOptions(screen.getByLabelText('Category'), 'cat1');
    await user.click(screen.getByRole('button', { name: 'Create product' }));

    await waitFor(() => {
      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({
          sku: 'SKU-PARA',
          name: 'Paracetamol 500',
          categoryId: 'cat1',
          productType: 'Medicine',
        }),
      );
    });
    expect(await screen.findByText('Product saved on this floor catalogue.')).toBeInTheDocument();
    expect(screen.getByText('Paracetamol 500')).toBeInTheDocument();
    expect(replaceUnitsMock).toHaveBeenCalledWith(
      'p1',
      expect.objectContaining({
        quantityPrecision: 0,
        units: expect.arrayContaining([
          expect.objectContaining({ unit: 'strip', factorToBase: 10 }),
        ]),
      }),
    );
  });

  it('success: save alternate box conversion', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([sample]);
    updateMock.mockResolvedValue(sample);
    replaceUnitsMock.mockResolvedValue({
      baseUnit: 'Tablet',
      quantityPrecision: 0,
      units: [
        { unit: 'strip', factorToBase: 10, version: 1 },
        { unit: 'box', factorToBase: 100, version: 1 },
      ],
    });
    renderPage();
    await user.click(await screen.findByRole('button', { name: /Paracetamol 500/ }));
    await screen.findByRole('heading', { name: 'Edit product' });
    await user.click(screen.getByRole('button', { name: 'Add unit' }));
    const unitSelects = screen.getAllByLabelText('Unit');
    await user.selectOptions(unitSelects[unitSelects.length - 1], 'box');
    const factorInputs = screen.getAllByLabelText(/Equals how many Tablet/);
    await user.clear(factorInputs[factorInputs.length - 1]);
    await user.type(factorInputs[factorInputs.length - 1], '100');
    await user.click(screen.getByRole('button', { name: 'Save product' }));
    await waitFor(() => {
      expect(replaceUnitsMock).toHaveBeenCalledWith(
        'p1',
        expect.objectContaining({
          units: expect.arrayContaining([
            expect.objectContaining({ unit: 'box', factorToBase: 100 }),
          ]),
        }),
      );
    });
  });

  it('success: update selected product', async () => {
    const user = userEvent.setup();
    const updated = { ...sample, name: 'Paracetamol 650', rackLocation: 'B-01' };
    listMock.mockResolvedValue([sample]);
    updateMock.mockResolvedValue(updated);
    renderPage();
    expect(await screen.findByText('Paracetamol 500')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Paracetamol 500/ }));
    const nameInput = screen.getByLabelText('Name');
    await user.clear(nameInput);
    await user.type(nameInput, 'Paracetamol 650');
    listMock.mockResolvedValue([updated]);
    await user.click(screen.getByRole('button', { name: 'Save product' }));
    await waitFor(() => {
      expect(updateMock).toHaveBeenCalledWith(
        'p1',
        expect.objectContaining({ name: 'Paracetamol 650' }),
      );
    });
    expect(await screen.findByText('Product saved on this floor catalogue.')).toBeInTheDocument();
  });

  it('search: queries list with q', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([sample]);
    renderPage();
    await screen.findByText('Paracetamol 500');
    const search = screen.getByPlaceholderText('Name, SKU, or barcode');
    await user.clear(search);
    await user.type(search, 'Para');
    await user.click(screen.getByRole('button', { name: 'Search' }));
    await waitFor(() => {
      expect(listMock).toHaveBeenLastCalledWith('Para');
    });
  });

  it('select: opens edit form for row', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([sample]);
    renderPage();
    await user.click(await screen.findByRole('button', { name: /Paracetamol 500/ }));
    expect(screen.getByRole('heading', { name: 'Edit product' })).toBeInTheDocument();
    expect(screen.getByLabelText('SKU')).toHaveValue('SKU-PARA');
    expect(screen.getByLabelText('Barcode')).toHaveValue('8901000000001');
  });

  it('discontinued badge stays on list', async () => {
    listMock.mockResolvedValue([{ ...sample, isDiscontinued: true }]);
    renderPage();
    const row = await screen.findByRole('button', { name: /Paracetamol 500/ });
    expect(within(row).getByText('Discontinued')).toBeInTheDocument();
  });
});
