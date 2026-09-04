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
import type { StockBalance } from '@/services/inventory';

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

vi.mock('@/services/inventory', async () => {
  const axios = await import('@/services/axios');
  return {
    listStockBalances: vi.fn(),
    listStockBatches: vi.fn(),
    listStockMovements: vi.fn(),
    receiveStock: vi.fn(),
    ApiError: axios.ApiError,
    isApiError: axios.isApiError,
  };
});

vi.mock('@/services/stockTransfers', async () => {
  const axios = await import('@/services/axios');
  return {
    listStockTransfers: vi.fn(),
    getStockTransfer: vi.fn(),
    createStockTransfer: vi.fn(),
    dispatchStockTransfer: vi.fn(),
    confirmStockTransfer: vi.fn(),
    rejectStockTransfer: vi.fn(),
    cancelStockTransfer: vi.fn(),
    ApiError: axios.ApiError,
    isApiError: axios.isApiError,
  };
});

import { createProduct, listProducts, updateProduct } from '@/services/products';
import { createProductCategory, listProductCategories } from '@/services/productCategories';
import { createManufacturer, listManufacturers } from '@/services/manufacturers';
import { listProductUnits, replaceProductUnits } from '@/services/productUnits';
import {
  listStockBalances,
  listStockBatches,
  listStockMovements,
  receiveStock,
} from '@/services/inventory';
import {
  confirmStockTransfer,
  createStockTransfer,
  dispatchStockTransfer,
  listStockTransfers,
  rejectStockTransfer,
} from '@/services/stockTransfers';
import type { StockTransfer } from '@/services/stockTransfers';
const listMock = vi.mocked(listProducts);
const createMock = vi.mocked(createProduct);
const updateMock = vi.mocked(updateProduct);
const listCategoriesMock = vi.mocked(listProductCategories);
const createCategoryMock = vi.mocked(createProductCategory);
const listManufacturersMock = vi.mocked(listManufacturers);
const createManufacturerMock = vi.mocked(createManufacturer);
const listUnitsMock = vi.mocked(listProductUnits);
const replaceUnitsMock = vi.mocked(replaceProductUnits);
const listBalancesMock = vi.mocked(listStockBalances);
const listBatchesMock = vi.mocked(listStockBatches);
const listMovementsMock = vi.mocked(listStockMovements);
const receiveMock = vi.mocked(receiveStock);
const listTransfersMock = vi.mocked(listStockTransfers);
const createTransferMock = vi.mocked(createStockTransfer);
const confirmTransferMock = vi.mocked(confirmStockTransfer);
const rejectTransferMock = vi.mocked(rejectStockTransfer);
const dispatchTransferMock = vi.mocked(dispatchStockTransfer);

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
  packDescription: null,
  storageConditions: null,
  requiresColdStorage: false,
  rackLocation: 'A-01',
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

const balance: StockBalance = {
  balanceId: 'bal1',
  productId: 'p1',
  productSku: 'SKU-PARA',
  productName: 'Paracetamol 500',
  batchId: 'batch1',
  batchNumber: 'LOT-AA',
  manufacturedOn: '2026-01-15',
  expiresOn: '2027-06-30',
  purchasePricePaise: 12500,
  quantity: 10,
  version: 1,
};

function renderPage(
  modules: string[] = ['INVENTORY', 'SALES'],
  activeBranchId: string | null = 'br1',
) {
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
          activeBranchId,
          branches: [
            { id: 'br1', name: 'Main', branchCode: 'BR01', status: 'ACTIVE' },
            { id: 'br2', name: 'Annexe', branchCode: 'BR02', status: 'ACTIVE' },
          ],
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

async function openCatalogue(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('tab', { name: 'Catalogue' }));
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
    listBalancesMock.mockReset();
    listBatchesMock.mockReset();
    listMovementsMock.mockReset();
    receiveMock.mockReset();
    listTransfersMock.mockReset();
    createTransferMock.mockReset();
    confirmTransferMock.mockReset();
    rejectTransferMock.mockReset();
    listBalancesMock.mockResolvedValue([]);
    listTransfersMock.mockResolvedValue([]);
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

  it('loading: waits for products', async () => {
    const user = userEvent.setup();
    listMock.mockReturnValue(new Promise(() => undefined));
    renderPage();
    await openCatalogue(user);
    expect(screen.getByText('Loading stock catalogue for this floor…')).toBeInTheDocument();
  });

  it('empty: no products yet', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([]);
    renderPage();
    await openCatalogue(user);
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
    expect(listBalancesMock).not.toHaveBeenCalled();
    expect(listMock).not.toHaveBeenCalled();
  });

  it('denied: API FORBIDDEN', async () => {
    const user = userEvent.setup();
    listMock.mockRejectedValue(new ApiError('Forbidden', 403, 'FORBIDDEN'));
    renderPage();
    await openCatalogue(user);
    expect(
      await screen.findByText(
        'This till login cannot open inventory. Ask the owner to grant the Inventory area.',
      ),
    ).toBeInTheDocument();
  });

  it('failure: server unreachable', async () => {
    const user = userEvent.setup();
    listMock.mockRejectedValue(new ApiError('down', 500, 'SERVER_ERROR'));
    renderPage();
    await openCatalogue(user);
    expect(
      await screen.findByText('Could not reach the server for inventory. Try again.'),
    ).toBeInTheDocument();
  });

  it('validation: missing required fields on create', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([]);
    renderPage();
    await openCatalogue(user);
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
    await openCatalogue(user);
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
    await openCatalogue(user);
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
    await openCatalogue(user);
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
    await openCatalogue(user);
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
    await openCatalogue(user);
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
    await openCatalogue(user);
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
    await openCatalogue(user);
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
    await openCatalogue(user);
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
    await openCatalogue(user);
    await user.click(await screen.findByRole('button', { name: /Paracetamol 500/ }));
    expect(screen.getByRole('heading', { name: 'Edit product' })).toBeInTheDocument();
    expect(screen.getByLabelText('SKU')).toHaveValue('SKU-PARA');
    expect(screen.getByLabelText('Barcode')).toHaveValue('8901000000001');
  });

  it('discontinued badge stays on list', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([{ ...sample, isDiscontinued: true }]);
    renderPage();
    await openCatalogue(user);
    const row = await screen.findByRole('button', { name: /Paracetamol 500/ });
    expect(within(row).getByText('Discontinued')).toBeInTheDocument();
  });
});

describe('floor stock', () => {
  beforeEach(() => {
    listBalancesMock.mockReset();
    listBatchesMock.mockReset();
    listMovementsMock.mockReset();
    receiveMock.mockReset();
    listMock.mockReset();
    listBalancesMock.mockResolvedValue([]);
    listBatchesMock.mockResolvedValue([]);
    listMovementsMock.mockResolvedValue([]);
  });

  it('loading: waits for balances', () => {
    listBalancesMock.mockReturnValue(new Promise(() => undefined));
    renderPage();
    expect(screen.getByText('Loading floor stock for this outlet…')).toBeInTheDocument();
  });

  it('empty: no stock yet', async () => {
    listBalancesMock.mockResolvedValue([]);
    renderPage();
    expect(
      await screen.findByText(
        'No stock on this outlet yet. Receive the first batch to open a line.',
      ),
    ).toBeInTheDocument();
  });

  it('success: lists stock and shows batch detail with movements', async () => {
    const user = userEvent.setup();
    listBalancesMock.mockResolvedValue([balance]);
    listBatchesMock.mockResolvedValue([
      {
        batchId: 'batch1',
        productId: 'p1',
        batchNumber: 'LOT-AA',
        manufacturedOn: '2026-01-15',
        expiresOn: '2027-06-30',
        purchasePricePaise: 12500,
        quantity: 10,
        version: 1,
        balanceId: 'bal1',
      },
    ]);
    listMovementsMock.mockResolvedValue([
      {
        id: 'm1',
        productId: 'p1',
        batchId: 'batch1',
        type: 'STOCK_IN',
        quantity: 10,
        balanceAfter: 10,
        purchasePricePaise: 12500,
        occurredAt: '2026-09-04T06:00:00Z',
      },
    ]);
    renderPage();
    expect(await screen.findByRole('button', { name: /LOT-AA/ })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Paracetamol 500/ }));
    expect(await screen.findByText('Purchase ₹125.00')).toBeInTheDocument();
    expect(screen.getByLabelText('Stock movements')).toHaveTextContent('In 10');
  });

  it('failure: balances API error', async () => {
    listBalancesMock.mockRejectedValue(new ApiError('down', 500, 'SERVER_ERROR'));
    renderPage();
    expect(
      await screen.findByText(
        'Pick an outlet in the sidebar, or retry if the server could not be reached.',
      ),
    ).toBeInTheDocument();
  });

  it('conflict: receive dialog surfaces BATCH_IDENTITY_CONFLICT', async () => {
    const user = userEvent.setup();
    listBalancesMock.mockResolvedValue([]);
    listMock.mockResolvedValue([sample]);
    receiveMock.mockRejectedValue(new ApiError('conflict', 409, 'BATCH_IDENTITY_CONFLICT'));
    renderPage();
    await screen.findByText('No stock on this outlet yet. Receive the first batch to open a line.');
    await user.click(screen.getByRole('button', { name: 'Receive stock' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Product'), 'p1');
    await user.type(screen.getByLabelText('Batch number'), 'LOT-X');
    await user.type(screen.getByLabelText('Expiry date'), '2027-01-01');
    await user.type(screen.getByLabelText('Purchase price (₹)'), '12.5');
    await user.type(screen.getByLabelText('Quantity'), '5');
    await user.click(screen.getByRole('button', { name: 'Receive' }));
    expect(
      await screen.findByText('Batch identity or version conflict. Check the lot and try again.'),
    ).toBeInTheDocument();
  });

  it('validation: receive without quantity', async () => {
    const user = userEvent.setup();
    listBalancesMock.mockResolvedValue([]);
    listMock.mockResolvedValue([sample]);
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Receive stock' }));
    const dialog = await screen.findByRole('dialog');
    await user.selectOptions(within(dialog).getByLabelText('Product'), 'p1');
    await user.click(within(dialog).getByRole('button', { name: 'Receive' }));
    expect(within(dialog).getByRole('status')).toHaveTextContent('Enter a valid quantity');
    expect(receiveMock).not.toHaveBeenCalled();
  });

  it('success: receive stock closes dialog and reloads', async () => {
    const user = userEvent.setup();
    listBalancesMock.mockResolvedValueOnce([]).mockResolvedValueOnce([balance]);
    listMock.mockResolvedValue([sample]);
    receiveMock.mockResolvedValue(balance);
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Receive stock' }));
    const dialog = await screen.findByRole('dialog');
    await user.selectOptions(within(dialog).getByLabelText('Product'), 'p1');
    await user.type(within(dialog).getByLabelText('Batch number'), 'LOT-AA');
    await user.type(within(dialog).getByLabelText('Manufacture date'), '2026-01-15');
    await user.type(within(dialog).getByLabelText('Expiry date'), '2027-06-30');
    await user.type(within(dialog).getByLabelText('Purchase price (₹)'), '125');
    await user.type(within(dialog).getByLabelText('Quantity'), '10');
    await user.click(within(dialog).getByRole('button', { name: 'Receive' }));
    await waitFor(() => {
      expect(receiveMock).toHaveBeenCalledWith(
        expect.objectContaining({
          productId: 'p1',
          batchNumber: 'LOT-AA',
          quantity: 10,
          purchasePricePaise: 12500,
        }),
      );
    });
    expect(await screen.findByText('Stock received on this outlet.')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /LOT-AA/ })).toBeInTheDocument();
  });
});

describe('outlet transfers', () => {
  const incoming: StockTransfer = {
    id: 'xfer1',
    fromBranchId: 'br1',
    toBranchId: 'br2',
    direction: 'PUSH',
    status: 'IN_TRANSIT',
    lines: [
      {
        id: 'line1',
        productId: 'p1',
        productSku: 'SKU-PARA',
        productName: 'Paracetamol 500',
        batchId: 'batch1',
        quantity: 4,
      },
    ],
    version: 0,
    createdAt: '2026-09-04T08:00:00Z',
    updatedAt: '2026-09-04T08:00:00Z',
  };

  beforeEach(() => {
    listBalancesMock.mockReset();
    listTransfersMock.mockReset();
    createTransferMock.mockReset();
    confirmTransferMock.mockReset();
    rejectTransferMock.mockReset();
    dispatchTransferMock.mockReset();
    listMock.mockReset();
    listBalancesMock.mockResolvedValue([]);
    listTransfersMock.mockResolvedValue([]);
    listMock.mockResolvedValue([sample]);
  });

  async function openTransfers(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole('tab', { name: 'Transfers' }));
  }

  it('loading: waits for transfers', async () => {
    const user = userEvent.setup();
    listTransfersMock.mockReturnValue(new Promise(() => undefined));
    renderPage();
    await openTransfers(user);
    expect(screen.getByText('Loading outlet transfers…')).toBeInTheDocument();
  });

  it('empty: no transfers yet', async () => {
    const user = userEvent.setup();
    renderPage();
    await openTransfers(user);
    expect(
      await screen.findByText('No transfers yet. Start a push or pull between outlets.'),
    ).toBeInTheDocument();
  });

  it('denied: inventory module missing', async () => {
    renderPage([]);
    expect(
      await screen.findByText(
        'This till login cannot open inventory. Ask the owner to grant the Inventory area.',
      ),
    ).toBeInTheDocument();
  });

  it('failure: no active outlet', async () => {
    const user = userEvent.setup();
    renderPage(['INVENTORY'], null);
    await openTransfers(user);
    expect(
      await screen.findByText(
        'Pick an outlet in the sidebar, or retry if the server could not be reached.',
      ),
    ).toBeInTheDocument();
  });

  it('validation: start transfer without quantity', async () => {
    const user = userEvent.setup();
    listBalancesMock.mockResolvedValue([balance]);
    renderPage();
    await openTransfers(user);
    await user.click(await screen.findByRole('button', { name: 'Start transfer' }));
    const dialog = await screen.findByRole('dialog');
    await user.selectOptions(within(dialog).getByLabelText('Stock line on this till'), 'bal1');
    await user.click(within(dialog).getByRole('button', { name: 'Start transfer' }));
    expect(within(dialog).getByRole('status')).toHaveTextContent('Pick another outlet');
    expect(createTransferMock).not.toHaveBeenCalled();
  });

  it('conflict: confirm surfaces STALE_STATE', async () => {
    const user = userEvent.setup();
    const waiting = { ...incoming, toBranchId: 'br1', fromBranchId: 'br2' };
    listTransfersMock.mockImplementation(async (scope) => {
      if (scope === 'incoming') {
        return [waiting];
      }
      return [];
    });
    confirmTransferMock.mockRejectedValue(new ApiError('stale', 409, 'STALE_STATE'));
    renderPage();
    await openTransfers(user);
    expect(await screen.findByText(/Paracetamol 500/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Confirm receipt' }));
    expect(
      await screen.findByText('Transfer state changed elsewhere. Refresh and try again.'),
    ).toBeInTheDocument();
  });

  it('success: confirm receipt', async () => {
    const user = userEvent.setup();
    const waiting = { ...incoming, toBranchId: 'br1', fromBranchId: 'br2' };
    let confirmed = false;
    listTransfersMock.mockImplementation(async (scope) => {
      if (scope === 'incoming') {
        return confirmed ? [] : [waiting];
      }
      if (scope === 'history' && confirmed) {
        return [{ ...waiting, status: 'COMPLETED' }];
      }
      return [];
    });
    confirmTransferMock.mockImplementation(async () => {
      confirmed = true;
      return { ...waiting, status: 'COMPLETED' };
    });
    renderPage();
    await openTransfers(user);
    expect(await screen.findByText(/Paracetamol 500/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Confirm receipt' }));
    await waitFor(() => expect(confirmTransferMock).toHaveBeenCalledWith('xfer1'));
    expect(await screen.findByText('Transfer updated.')).toBeInTheDocument();
  });

  it('success: start push transfer', async () => {
    const user = userEvent.setup();
    listBalancesMock.mockResolvedValue([balance]);
    createTransferMock.mockResolvedValue({
      ...incoming,
      status: 'IN_TRANSIT',
      fromBranchId: 'br1',
      toBranchId: 'br2',
    });
    listTransfersMock.mockResolvedValue([]);
    renderPage();
    await openTransfers(user);
    await user.click(await screen.findByRole('button', { name: 'Start transfer' }));
    const dialog = await screen.findByRole('dialog');
    await user.selectOptions(within(dialog).getByLabelText('Stock line on this till'), 'bal1');
    await user.type(within(dialog).getByLabelText('Quantity'), '2');
    await user.click(within(dialog).getByRole('button', { name: 'Start transfer' }));
    await waitFor(() =>
      expect(createTransferMock).toHaveBeenCalledWith(
        expect.objectContaining({
          direction: 'PUSH',
          counterpartyBranchId: 'br2',
          lines: [expect.objectContaining({ productId: 'p1', batchId: 'batch1', quantity: 2 })],
        }),
      ),
    );
    expect(await screen.findByText('Transfer updated.')).toBeInTheDocument();
  });

  it('success: reject incoming transfer', async () => {
    const user = userEvent.setup();
    const waiting = { ...incoming, toBranchId: 'br1', fromBranchId: 'br2' };
    let rejected = false;
    listTransfersMock.mockImplementation(async (scope) => {
      if (scope === 'incoming') {
        return rejected ? [] : [waiting];
      }
      if (scope === 'history' && rejected) {
        return [{ ...waiting, status: 'REJECTED' }];
      }
      return [];
    });
    rejectTransferMock.mockImplementation(async () => {
      rejected = true;
      return { ...waiting, status: 'REJECTED' };
    });
    renderPage();
    await openTransfers(user);
    await user.click(await screen.findByRole('button', { name: 'Reject' }));
    await waitFor(() => expect(rejectTransferMock).toHaveBeenCalledWith('xfer1'));
    expect(await screen.findByText('Transfer updated.')).toBeInTheDocument();
  });

  it('success: dispatch pull request', async () => {
    const user = userEvent.setup();
    const pull: StockTransfer = {
      ...incoming,
      direction: 'PULL',
      status: 'REQUESTED',
      fromBranchId: 'br1',
      toBranchId: 'br2',
    };
    let dispatched = false;
    listTransfersMock.mockImplementation(async (scope) => {
      if (scope === 'outgoing') {
        return dispatched ? [] : [pull];
      }
      return [];
    });
    dispatchTransferMock.mockImplementation(async () => {
      dispatched = true;
      return { ...pull, status: 'IN_TRANSIT' };
    });
    renderPage();
    await openTransfers(user);
    await user.click(await screen.findByRole('button', { name: 'Dispatch' }));
    await waitFor(() => expect(dispatchTransferMock).toHaveBeenCalledWith('xfer1'));
    expect(await screen.findByText('Transfer updated.')).toBeInTheDocument();
  });

  it('restores focus to Start transfer after dialog cancel', async () => {
    const user = userEvent.setup();
    listBalancesMock.mockResolvedValue([balance]);
    renderPage();
    await openTransfers(user);
    const start = await screen.findByRole('button', { name: 'Start transfer' });
    await user.click(start);
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Start transfer' })).toHaveFocus();
    });
  });
});
