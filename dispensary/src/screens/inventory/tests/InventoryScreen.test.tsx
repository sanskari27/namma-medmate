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
    getInventorySettings: vi.fn(),
    updateInventorySettings: vi.fn(),
    getProductStockLevels: vi.fn(),
    updateProductStockLevels: vi.fn(),
    getInventoryAlerts: vi.fn(),
    getInventoryValuation: vi.fn(),
    downloadReorderReport: vi.fn(),
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

vi.mock('@/services/inventoryAdjustments', async () => {
  const axios = await import('@/services/axios');
  return {
    listStockAdjustments: vi.fn(),
    createStockAdjustment: vi.fn(),
    decideStockAdjustment: vi.fn(),
    ApiError: axios.ApiError,
    isApiError: axios.isApiError,
  };
});

vi.mock('@/services/stockTakes', async () => {
  const axios = await import('@/services/axios');
  return {
    listStockTakes: vi.fn(),
    startStockTake: vi.fn(),
    saveStockTakeCounts: vi.fn(),
    postStockTake: vi.fn(),
    cancelStockTake: vi.fn(),
    ApiError: axios.ApiError,
    isApiError: axios.isApiError,
  };
});

vi.mock('@/services/controlledStock', async () => {
  const axios = await import('@/services/axios');
  return {
    listControlledStock: vi.fn(),
    downloadControlledStockExport: vi.fn(),
    verifyControlledStock: vi.fn(),
    ApiError: axios.ApiError,
    isApiError: axios.isApiError,
  };
});

vi.mock('@/services/goodsReceipts', async () => {
  const axios = await import('@/services/axios');
  return {
    listBranchGoodsReceipts: vi.fn(),
    getGoodsReceipt: vi.fn(),
    submitQualityCheck: vi.fn(),
    ApiError: axios.ApiError,
    isApiError: axios.isApiError,
  };
});

vi.mock('@/services/purchaseReturns', async () => {
  const axios = await import('@/services/axios');
  return {
    listPurchaseReturns: vi.fn(),
    getPurchaseReturn: vi.fn(),
    createPurchaseReturn: vi.fn(),
    ApiError: axios.ApiError,
    isApiError: axios.isApiError,
  };
});

import { createProduct, listProducts, updateProduct } from '@/services/products';
import { createProductCategory, listProductCategories } from '@/services/productCategories';
import { createManufacturer, listManufacturers } from '@/services/manufacturers';
import { listProductUnits, replaceProductUnits } from '@/services/productUnits';
import {
  downloadReorderReport,
  getInventoryAlerts,
  getInventorySettings,
  getInventoryValuation,
  getProductStockLevels,
  listStockBalances,
  listStockBatches,
  listStockMovements,
  receiveStock,
  updateInventorySettings,
  updateProductStockLevels,
} from '@/services/inventory';
import {
  confirmStockTransfer,
  createStockTransfer,
  dispatchStockTransfer,
  listStockTransfers,
  rejectStockTransfer,
} from '@/services/stockTransfers';
import type { StockTransfer } from '@/services/stockTransfers';
import {
  createStockAdjustment,
  decideStockAdjustment,
  listStockAdjustments,
} from '@/services/inventoryAdjustments';
import type { StockAdjustment } from '@/services/inventoryAdjustments';
import {
  cancelStockTake,
  listStockTakes,
  postStockTake,
  saveStockTakeCounts,
  startStockTake,
} from '@/services/stockTakes';
import type { StockTake } from '@/services/stockTakes';
import { downloadControlledStockExport, listControlledStock } from '@/services/controlledStock';
import type { ControlledStockLine } from '@/services/controlledStock';
import { listBranchGoodsReceipts } from '@/services/goodsReceipts';
import { listPurchaseReturns } from '@/services/purchaseReturns';

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
const getAlertsMock = vi.mocked(getInventoryAlerts);
const getSettingsMock = vi.mocked(getInventorySettings);
const updateSettingsMock = vi.mocked(updateInventorySettings);
const getValuationMock = vi.mocked(getInventoryValuation);
const getLevelsMock = vi.mocked(getProductStockLevels);
const updateLevelsMock = vi.mocked(updateProductStockLevels);
const downloadCsvMock = vi.mocked(downloadReorderReport);
const listTransfersMock = vi.mocked(listStockTransfers);
const createTransferMock = vi.mocked(createStockTransfer);
const confirmTransferMock = vi.mocked(confirmStockTransfer);
const rejectTransferMock = vi.mocked(rejectStockTransfer);
const dispatchTransferMock = vi.mocked(dispatchStockTransfer);
const listAdjustmentsMock = vi.mocked(listStockAdjustments);
const createAdjustmentMock = vi.mocked(createStockAdjustment);
const decideAdjustmentMock = vi.mocked(decideStockAdjustment);
const listStockTakesMock = vi.mocked(listStockTakes);
const startStockTakeMock = vi.mocked(startStockTake);
const saveStockTakeCountsMock = vi.mocked(saveStockTakeCounts);
const postStockTakeMock = vi.mocked(postStockTake);
const cancelStockTakeMock = vi.mocked(cancelStockTake);
const listControlledStockMock = vi.mocked(listControlledStock);
const downloadControlledExportMock = vi.mocked(downloadControlledStockExport);
const listGoodsReceiptsMock = vi.mocked(listBranchGoodsReceipts);
const listPurchaseReturnsMock = vi.mocked(listPurchaseReturns);

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
    getAlertsMock.mockReset();
    getSettingsMock.mockReset();
    updateSettingsMock.mockReset();
    getValuationMock.mockReset();
    downloadCsvMock.mockReset();
    getLevelsMock.mockReset();
    updateLevelsMock.mockReset();
    listBalancesMock.mockResolvedValue([]);
    listTransfersMock.mockResolvedValue([]);
    listAdjustmentsMock.mockResolvedValue([]);
    getAlertsMock.mockResolvedValue({ lowStock: [], nearExpiry: [] });
    getSettingsMock.mockResolvedValue({ expiryWarnDays: 30 });
    getValuationMock.mockResolvedValue({ totalPurchaseValuePaise: 0 });
    downloadCsvMock.mockResolvedValue(new Blob(['sku,name\n'], { type: 'text/csv' }));
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
    const user = userEvent.setup({ delay: null });
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
    listAdjustmentsMock.mockResolvedValue([]);
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

describe('inventory guidance', () => {
  beforeEach(() => {
    listBalancesMock.mockReset();
    listTransfersMock.mockReset();
    getAlertsMock.mockReset();
    getSettingsMock.mockReset();
    updateSettingsMock.mockReset();
    getValuationMock.mockReset();
    downloadCsvMock.mockReset();
    getLevelsMock.mockReset();
    updateLevelsMock.mockReset();
    createTransferMock.mockReset();
    listMock.mockReset();
    listBalancesMock.mockResolvedValue([]);
    listTransfersMock.mockResolvedValue([]);
    listAdjustmentsMock.mockResolvedValue([]);
    listMock.mockResolvedValue([sample]);
    getAlertsMock.mockResolvedValue({ lowStock: [], nearExpiry: [] });
    getSettingsMock.mockResolvedValue({ expiryWarnDays: 30 });
    updateSettingsMock.mockResolvedValue({ expiryWarnDays: 14 });
    getValuationMock.mockResolvedValue({ totalPurchaseValuePaise: 20000 });
    downloadCsvMock.mockResolvedValue(
      new Blob(['sku,name,suggestedOrderQty\n'], { type: 'text/csv' }),
    );
    getLevelsMock.mockResolvedValue({ reorderLevel: 20, reorderQuantity: 100, minimumStock: 10 });
    updateLevelsMock.mockResolvedValue({ reorderLevel: 8, reorderQuantity: 40, minimumStock: 2 });
  });

  async function openGuidance(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole('tab', { name: 'Guidance' }));
  }

  it('shows loading then empty guidance', async () => {
    const user = userEvent.setup();
    getAlertsMock.mockReturnValue(new Promise(() => undefined));
    renderPage();
    await openGuidance(user);
    expect(
      await screen.findByText(/Loading FEFO, expiry, and low-stock guidance/i),
    ).toBeInTheDocument();
  });

  it('shows empty guidance when no alerts', async () => {
    const user = userEvent.setup();
    renderPage();
    await openGuidance(user);
    expect(
      await screen.findByText(/No low-stock or near-expiry lines on this outlet right now/i),
    ).toBeInTheDocument();
  });

  it('validates expiry warn days', async () => {
    const user = userEvent.setup();
    renderPage();
    await openGuidance(user);
    const input = await screen.findByLabelText(/Expiry warn days/i);
    await user.clear(input);
    await user.type(input, '-1');
    await user.click(screen.getByRole('button', { name: 'Save threshold' }));
    expect(
      await screen.findByText(/Expiry warn days must be zero or a whole number/i),
    ).toBeInTheDocument();
  });

  it('denies guidance without inventory module', async () => {
    renderPage([]);
    expect(await screen.findByText(/cannot open inventory/i)).toBeInTheDocument();
  });

  it('shows failure when alerts request fails', async () => {
    const user = userEvent.setup();
    getAlertsMock.mockRejectedValue(new ApiError('down', 500, 'SERVER'));
    renderPage();
    await openGuidance(user);
    expect(await screen.findByText(/Could not load guidance/i)).toBeInTheDocument();
  });

  it('saves threshold and downloads reorder CSV on success', async () => {
    const user = userEvent.setup();
    getAlertsMock.mockResolvedValue({
      lowStock: [
        {
          productId: 'p1',
          productSku: 'SKU-PARA',
          productName: 'Paracetamol 500',
          onHand: 3,
          reorderLevel: 10,
          minimumStock: 2,
          otherBranches: [{ branchId: 'b2', branchName: 'Warehouse', quantity: 40 }],
        },
      ],
      nearExpiry: [
        {
          productId: 'p1',
          productSku: 'SKU-PARA',
          productName: 'Paracetamol 500',
          batchId: 'batch1',
          batchNumber: 'LOT-NEAR',
          expiresOn: '2026-09-20',
          quantity: 5,
        },
      ],
    });
    renderPage();
    await openGuidance(user);
    expect(await screen.findByText('Available at Warehouse (40)')).toBeInTheDocument();
    expect(screen.getByText(/Near expiry — still sellable/i)).toBeInTheDocument();
    expect(screen.getByText(/₹200\.00/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Save threshold' }));
    await waitFor(() => expect(updateSettingsMock).toHaveBeenCalledWith(30));
    expect(await screen.findByText(/Guidance updated for this outlet/i)).toBeInTheDocument();

    const createObjectURL = vi.fn(() => 'blob:reorder');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL });
    await user.click(screen.getByRole('button', { name: 'Download reorder CSV' }));
    await waitFor(() => expect(downloadCsvMock).toHaveBeenCalled());
  });

  it('starts transfer from low-stock other-branch hint', async () => {
    const user = userEvent.setup();
    getAlertsMock.mockResolvedValue({
      lowStock: [
        {
          productId: 'p1',
          productSku: 'SKU-PARA',
          productName: 'Paracetamol 500',
          onHand: 3,
          reorderLevel: 10,
          minimumStock: 2,
          otherBranches: [{ branchId: 'b2', branchName: 'Warehouse', quantity: 40 }],
        },
      ],
      nearExpiry: [],
    });
    listBalancesMock.mockResolvedValue([balance]);
    renderPage();
    await openGuidance(user);
    await user.click(await screen.findByRole('button', { name: 'Start transfer' }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText(/Start outlet transfer/i)).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Direction')).toHaveValue('PULL');
    expect(within(dialog).getByLabelText('Product to pull')).toHaveValue('p1');
  });

  it('denied: guidance API FORBIDDEN', async () => {
    const user = userEvent.setup();
    getAlertsMock.mockRejectedValue(new ApiError('no', 403, 'FORBIDDEN'));
    renderPage();
    await openGuidance(user);
    expect(await screen.findByText(/cannot open inventory guidance/i)).toBeInTheDocument();
  });

  it('conflict: guidance surfaces STALE_STATE', async () => {
    const user = userEvent.setup();
    updateSettingsMock.mockRejectedValue(new ApiError('stale', 409, 'STALE_STATE'));
    renderPage();
    await openGuidance(user);
    await user.click(await screen.findByRole('button', { name: 'Save threshold' }));
    expect(await screen.findByText(/Guidance data changed elsewhere/i)).toBeInTheDocument();
  });

  it('saves this outlet reorder independently of catalogue defaults', async () => {
    const user = userEvent.setup();
    renderPage();
    await openGuidance(user);
    await user.selectOptions(await screen.findByLabelText('Product'), 'p1');
    await waitFor(() => expect(getLevelsMock).toHaveBeenCalledWith('p1'));
    const reorder = await screen.findByLabelText('Outlet reorder');
    expect(reorder).toHaveValue('20');
    await user.clear(reorder);
    await user.type(reorder, '8');
    await user.click(screen.getByRole('button', { name: 'Save outlet levels' }));
    await waitFor(() =>
      expect(updateLevelsMock).toHaveBeenCalledWith('p1', {
        reorderLevel: 8,
        reorderQuantity: 100,
        minimumStock: 10,
      }),
    );
    expect(await screen.findByText(/Guidance updated for this outlet/i)).toBeInTheDocument();
  });
});

describe('inventory adjustments', () => {
  const pending: StockAdjustment = {
    id: 'adj1',
    productId: 'p1',
    productSku: 'SKU-PARA',
    productName: 'Paracetamol 500',
    batchId: 'batch1',
    batchNumber: 'LOT-AA',
    reason: 'DAMAGE_BREAKAGE',
    quantity: 2,
    direction: 'OUT',
    status: 'PENDING',
    requesterUserId: 'u1',
    approverUserId: null,
    approvalRequestId: 'apr1',
    version: 1,
    createdAt: '2026-09-04T09:00:00Z',
    decidedAt: null,
  };

  beforeEach(() => {
    listBalancesMock.mockReset();
    listAdjustmentsMock.mockReset();
    createAdjustmentMock.mockReset();
    decideAdjustmentMock.mockReset();
    listMock.mockReset();
    listBalancesMock.mockResolvedValue([]);
    listAdjustmentsMock.mockResolvedValue([]);
    listMock.mockResolvedValue([sample]);
  });

  async function openAdjustments(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole('tab', { name: 'Adjustments' }));
  }

  it('loading: waits for write-offs', async () => {
    const user = userEvent.setup();
    listAdjustmentsMock.mockReturnValue(new Promise(() => undefined));
    renderPage();
    await openAdjustments(user);
    expect(screen.getByText('Loading stock write-offs for this outlet…')).toBeInTheDocument();
  });

  it('empty: no write-offs yet', async () => {
    const user = userEvent.setup();
    renderPage();
    await openAdjustments(user);
    expect(
      await screen.findByText(
        'No write-offs yet. Record damage, expiry, theft, count, or sample removal.',
      ),
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

  it('denied: adjustments API FORBIDDEN', async () => {
    const user = userEvent.setup();
    listAdjustmentsMock.mockRejectedValue(new ApiError('Forbidden', 403, 'FORBIDDEN'));
    renderPage();
    await openAdjustments(user);
    expect(
      await screen.findByText(
        'This till login cannot record write-offs. Ask the owner to grant the Inventory area.',
      ),
    ).toBeInTheDocument();
  });

  it('failure: no active outlet', async () => {
    const user = userEvent.setup();
    renderPage(['INVENTORY'], null);
    await openAdjustments(user);
    expect(
      await screen.findByText(
        'Pick an outlet in the sidebar, or retry if the server could not be reached.',
      ),
    ).toBeInTheDocument();
  });

  it('validation: record write-off without quantity', async () => {
    const user = userEvent.setup();
    listBalancesMock.mockResolvedValue([balance]);
    renderPage();
    await openAdjustments(user);
    await user.click(await screen.findByRole('button', { name: 'Record write-off' }));
    const dialog = await screen.findByRole('dialog');
    await user.selectOptions(within(dialog).getByLabelText('Stock line on this till'), 'bal1');
    await user.click(within(dialog).getByRole('button', { name: 'Send for sign-off' }));
    expect(within(dialog).getByRole('status')).toHaveTextContent(
      'Pick a stock line, an approved reason, and a quantity that is on the shelf.',
    );
    expect(createAdjustmentMock).not.toHaveBeenCalled();
  });

  it('conflict: approve surfaces STALE_STATE', async () => {
    const user = userEvent.setup();
    listAdjustmentsMock.mockImplementation(async (scope) => (scope === 'pending' ? [pending] : []));
    decideAdjustmentMock.mockRejectedValue(new ApiError('stale', 409, 'STALE_STATE'));
    renderPage();
    await openAdjustments(user);
    expect(await screen.findByText(/Paracetamol 500/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Approve write-off' }));
    expect(
      await screen.findByText('This write-off was decided elsewhere. Refresh and try again.'),
    ).toBeInTheDocument();
  });

  it('success: approve write-off', async () => {
    const user = userEvent.setup();
    let approved = false;
    listAdjustmentsMock.mockImplementation(async (scope) => {
      if (scope === 'pending') {
        return approved ? [] : [pending];
      }
      return approved ? [{ ...pending, status: 'APPROVED', approverUserId: 'u1' }] : [];
    });
    decideAdjustmentMock.mockImplementation(async () => {
      approved = true;
      return { ...pending, status: 'APPROVED', approverUserId: 'u1', version: 2 };
    });
    renderPage();
    await openAdjustments(user);
    await user.click(await screen.findByRole('button', { name: 'Approve write-off' }));
    await waitFor(() =>
      expect(decideAdjustmentMock).toHaveBeenCalledWith('adj1', {
        outcome: 'APPROVED',
        expectedVersion: 1,
      }),
    );
    expect(await screen.findByText('Write-off updated for this outlet.')).toBeInTheDocument();
  });

  it('success: reject write-off', async () => {
    const user = userEvent.setup();
    let rejected = false;
    listAdjustmentsMock.mockImplementation(async (scope) => {
      if (scope === 'pending') {
        return rejected ? [] : [pending];
      }
      return rejected ? [{ ...pending, status: 'REJECTED' }] : [];
    });
    decideAdjustmentMock.mockImplementation(async () => {
      rejected = true;
      return { ...pending, status: 'REJECTED', version: 2 };
    });
    renderPage();
    await openAdjustments(user);
    await user.click(await screen.findByRole('button', { name: 'Reject' }));
    await waitFor(() =>
      expect(decideAdjustmentMock).toHaveBeenCalledWith('adj1', {
        outcome: 'REJECTED',
        expectedVersion: 1,
      }),
    );
    expect(await screen.findByText('Write-off updated for this outlet.')).toBeInTheDocument();
  });

  it('success: record write-off stays pending until approved', async () => {
    const user = userEvent.setup();
    listBalancesMock.mockResolvedValue([balance]);
    createAdjustmentMock.mockResolvedValue(pending);
    renderPage();
    await openAdjustments(user);
    await user.click(await screen.findByRole('button', { name: 'Record write-off' }));
    const dialog = await screen.findByRole('dialog');
    await user.selectOptions(within(dialog).getByLabelText('Stock line on this till'), 'bal1');
    await user.type(within(dialog).getByLabelText('Quantity'), '2');
    await user.click(within(dialog).getByRole('button', { name: 'Send for sign-off' }));
    await waitFor(() =>
      expect(createAdjustmentMock).toHaveBeenCalledWith(
        expect.objectContaining({
          productId: 'p1',
          batchId: 'batch1',
          reason: 'DAMAGE_BREAKAGE',
          quantity: 2,
          direction: 'OUT',
        }),
      ),
    );
    expect(await screen.findByText('Write-off updated for this outlet.')).toBeInTheDocument();
  });

  it('restores focus to Record write-off after dialog cancel', async () => {
    const user = userEvent.setup();
    listBalancesMock.mockResolvedValue([balance]);
    renderPage();
    await openAdjustments(user);
    const start = await screen.findByRole('button', { name: 'Record write-off' });
    await user.click(start);
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Record write-off' })).toHaveFocus();
    });
  });
});

describe('inventory physical count', () => {
  const openTake: StockTake = {
    id: 'take1',
    branchId: 'br1',
    status: 'OPEN',
    startedByUserId: 'u1',
    postedByUserId: null,
    cancelledByUserId: null,
    version: 1,
    createdAt: '2026-09-05T04:00:00Z',
    updatedAt: '2026-09-05T04:00:00Z',
    postedAt: null,
    lines: [
      {
        id: 'line1',
        productId: 'p1',
        productSku: 'SKU-PARA',
        productName: 'Paracetamol 500',
        batchId: 'batch1',
        batchNumber: 'LOT-AA',
        expiresOn: '2027-06-30',
        expectedQuantity: 10,
        countedQuantity: null,
        countedAt: null,
        countedByUserId: null,
        adjustmentId: null,
        varianceQuantity: null,
        direction: null,
      },
    ],
  };

  beforeEach(() => {
    listStockTakesMock.mockReset();
    startStockTakeMock.mockReset();
    saveStockTakeCountsMock.mockReset();
    postStockTakeMock.mockReset();
    cancelStockTakeMock.mockReset();
    listBalancesMock.mockReset();
    listMock.mockReset();
    listBalancesMock.mockResolvedValue([]);
    listMock.mockResolvedValue([sample]);
    listStockTakesMock.mockResolvedValue([]);
  });

  async function openCount(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole('tab', { name: 'Physical count' }));
  }

  it('loading: waits for physical count', async () => {
    const user = userEvent.setup();
    listStockTakesMock.mockReturnValue(new Promise(() => undefined));
    renderPage();
    await openCount(user);
    expect(screen.getByText('Loading physical count for this outlet…')).toBeInTheDocument();
  });

  it('empty: no physical count yet', async () => {
    const user = userEvent.setup();
    renderPage();
    await openCount(user);
    expect(
      await screen.findByText(
        'No physical count on this outlet. Owner can start a count to freeze book qty.',
      ),
    ).toBeInTheDocument();
  });

  it('denied: count API FORBIDDEN', async () => {
    const user = userEvent.setup();
    listStockTakesMock.mockRejectedValue(new ApiError('Forbidden', 403, 'FORBIDDEN'));
    renderPage();
    await openCount(user);
    expect(
      await screen.findByText(
        'This till login cannot run a physical count. Ask the owner to grant the Inventory area.',
      ),
    ).toBeInTheDocument();
  });

  it('denied: staff cannot start a count', async () => {
    const user = userEvent.setup();
    renderPage(['INVENTORY'], 'br1', 'pharmacy_staff');
    await openCount(user);
    expect(screen.queryByRole('button', { name: 'Start count' })).not.toBeInTheDocument();
    expect(await screen.findByText('No posted or abandoned counts yet.')).toBeInTheDocument();
  });

  it('failure: no active outlet', async () => {
    const user = userEvent.setup();
    renderPage(['INVENTORY'], null);
    await openCount(user);
    expect(
      await screen.findByText(
        'Pick an outlet in the sidebar, or retry if the server could not be reached.',
      ),
    ).toBeInTheDocument();
  });

  it('validation: save counts without a quantity', async () => {
    const user = userEvent.setup();
    listStockTakesMock.mockImplementation(async (scope) => (scope === 'open' ? [openTake] : []));
    renderPage();
    await openCount(user);
    await user.click(await screen.findByRole('button', { name: 'Save counts' }));
    expect(
      await screen.findByText(
        'Count every line with a zero-or-more quantity before posting variances.',
      ),
    ).toBeInTheDocument();
  });

  it('conflict: overlapping open count', async () => {
    const user = userEvent.setup();
    startStockTakeMock.mockRejectedValue(new ApiError('open', 409, 'OVERLAPPING_SESSION'));
    renderPage();
    await openCount(user);
    await user.click(await screen.findByRole('button', { name: 'Start count' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Freeze book qty' }));
    expect(
      await screen.findByText(
        'Book qty changed during this count, or another count is already open. Refresh and try again.',
      ),
    ).toBeInTheDocument();
  });

  it('success: start, count batch, and post variances', async () => {
    const user = userEvent.setup();
    const counted: StockTake = {
      ...openTake,
      lines: [
        {
          ...openTake.lines[0],
          countedQuantity: 8,
          varianceQuantity: -2,
          direction: 'OUT',
        },
      ],
    };
    const posted: StockTake = {
      ...counted,
      status: 'POSTED',
      postedAt: '2026-09-05T05:00:00Z',
      lines: [{ ...counted.lines[0], adjustmentId: 'adj1' }],
    };
    startStockTakeMock.mockImplementation(async () => {
      listStockTakesMock.mockImplementation(async (scope) => (scope === 'open' ? [openTake] : []));
      return openTake;
    });
    saveStockTakeCountsMock.mockImplementation(async () => {
      listStockTakesMock.mockImplementation(async (scope) => (scope === 'open' ? [counted] : []));
      return counted;
    });
    postStockTakeMock.mockImplementation(async () => {
      listStockTakesMock.mockImplementation(async (scope) => (scope === 'history' ? [posted] : []));
      return posted;
    });
    renderPage();
    await openCount(user);
    await user.click(await screen.findByRole('button', { name: 'Start count' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Freeze book qty' }));
    expect(await screen.findByText('Book qty at start')).toBeInTheDocument();
    await user.type(await screen.findByLabelText('Counted quantity for Paracetamol 500'), '8');
    await user.click(screen.getByRole('button', { name: 'Save counts' }));
    await waitFor(() =>
      expect(saveStockTakeCountsMock).toHaveBeenCalledWith('take1', [
        { lineId: 'line1', countedQuantity: 8 },
      ]),
    );
    await user.click(screen.getByRole('button', { name: 'Post variances' }));
    await waitFor(() => expect(postStockTakeMock).toHaveBeenCalledWith('take1'));
    expect(
      await screen.findByText(
        'Physical count updated. Variances wait on Adjustments for sign-off.',
      ),
    ).toBeInTheDocument();
  });

  it('restores focus to Start count after dialog cancel', async () => {
    const user = userEvent.setup();
    renderPage();
    await openCount(user);
    const start = await screen.findByRole('button', { name: 'Start count' });
    await user.click(start);
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Start count' })).toHaveFocus();
    });
  });
});

describe('schedule register', () => {
  const line: ControlledStockLine = {
    id: 'reg1',
    stockMovementId: 'mv1',
    productId: 'p1',
    productName: 'Alprazolam',
    sku: 'SKU-H1',
    scheduleClassification: 'H1',
    batchId: 'b1',
    batchNumber: 'LOT-H1',
    expiresOn: '2027-01-01',
    quantity: 10,
    balanceAfter: 10,
    movementType: 'STOCK_IN',
    createdByUserId: 'u1',
    occurredAt: '2026-09-04T10:00:00Z',
  };

  beforeEach(() => {
    listControlledStockMock.mockReset();
    downloadControlledExportMock.mockReset();
    listBalancesMock.mockResolvedValue([]);
    listMock.mockResolvedValue([sample]);
    listControlledStockMock.mockResolvedValue([]);
  });

  async function openRegister(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole('tab', { name: 'Schedule register' }));
  }

  it('loading: waits for schedule register', async () => {
    const user = userEvent.setup();
    listControlledStockMock.mockReturnValue(new Promise(() => undefined));
    renderPage();
    await openRegister(user);
    expect(screen.getByText('Loading the Schedule register for this outlet…')).toBeInTheDocument();
  });

  it('empty: no controlled movements', async () => {
    const user = userEvent.setup();
    renderPage();
    await openRegister(user);
    expect(
      await screen.findByText('No Schedule H, H1, X, or NDPS movements on this outlet yet.'),
    ).toBeInTheDocument();
  });

  it('denied: register API FORBIDDEN', async () => {
    const user = userEvent.setup();
    listControlledStockMock.mockRejectedValue(new ApiError('Forbidden', 403, 'FORBIDDEN'));
    renderPage();
    await openRegister(user);
    expect(
      await screen.findByText(
        'This till login cannot open the Schedule register. Ask the owner to grant Inventory.',
      ),
    ).toBeInTheDocument();
  });

  it('failure: no active outlet', async () => {
    const user = userEvent.setup();
    renderPage(['INVENTORY'], null);
    await openRegister(user);
    expect(
      await screen.findByText(
        'Pick an outlet in the sidebar, or retry if the server could not be reached.',
      ),
    ).toBeInTheDocument();
  });

  it('conflict: altered export scope', async () => {
    const user = userEvent.setup();
    listControlledStockMock.mockResolvedValue([line]);
    downloadControlledExportMock.mockRejectedValue(new ApiError('Not found', 404, 'NOT_FOUND'));
    renderPage();
    await openRegister(user);
    await screen.findByText('Alprazolam');
    await user.click(screen.getByRole('button', { name: 'Download general CSV' }));
    expect(
      await screen.findByText('Register export scope changed. Stay on this outlet and try again.'),
    ).toBeInTheDocument();
  });

  it('validation: bad schedule filter', async () => {
    const user = userEvent.setup();
    listControlledStockMock.mockRejectedValue(new ApiError('Invalid', 400, 'VALIDATION_ERROR'));
    renderPage();
    await openRegister(user);
    expect(
      await screen.findByText('Check the schedule filter, then try the export again.'),
    ).toBeInTheDocument();
  });

  it('success: lists movement and exports NDPS sheet', async () => {
    const user = userEvent.setup();
    listControlledStockMock.mockResolvedValue([line]);
    downloadControlledExportMock.mockResolvedValue(
      new Blob(['date_ist,particulars\n'], { type: 'text/csv' }),
    );
    const createObjectURL = vi.fn(() => 'blob:ndps');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL });
    renderPage();
    await openRegister(user);
    expect(await screen.findByText('Alprazolam')).toBeInTheDocument();
    expect(screen.getByText('STOCK_IN')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Download NDPS sheet' }));
    await waitFor(() => expect(downloadControlledExportMock).toHaveBeenCalledWith('ndps', {}));
    expect(
      await screen.findByText('Schedule register exported for this outlet.'),
    ).toBeInTheDocument();
    vi.unstubAllGlobals();
  });
});

describe('quality check tab', () => {
  it('offers a Quality check tab on the floor inventory screen', async () => {
    listGoodsReceiptsMock.mockResolvedValue([]);
    listBalancesMock.mockResolvedValue([]);
    listMock.mockResolvedValue([sample]);
    renderPage();
    const user = userEvent.setup({ delay: null });
    await user.click(screen.getByRole('tab', { name: 'Quality check' }));
    expect(
      await screen.findByText('No deliveries waiting for a pharmacist check.'),
    ).toBeInTheDocument();
  });
});

describe('returns tab', () => {
  it('offers a Returns tab and Send back on the floor inventory screen', async () => {
    listPurchaseReturnsMock.mockResolvedValue([]);
    listBalancesMock.mockResolvedValue([]);
    listMock.mockResolvedValue([sample]);
    renderPage();
    const user = userEvent.setup({ delay: null });
    await user.click(screen.getByRole('tab', { name: 'Returns' }));
    expect(
      await screen.findByText(
        'No debit notes yet. Send a pack back, or reject qty at Quality check.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send back' })).toBeInTheDocument();
    expect(screen.getByText('Send back to stockist')).toBeInTheDocument();
  });
});
