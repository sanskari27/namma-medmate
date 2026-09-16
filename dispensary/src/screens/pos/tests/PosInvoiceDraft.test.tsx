import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/services/axios';

vi.mock('@/services/customers', async () => {
  const axios = await import('@/services/axios');
  return { listCustomers: vi.fn(), ApiError: axios.ApiError, isApiError: axios.isApiError };
});
vi.mock('@/services/salesCatalogue', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/salesCatalogue')>();
  return { ...actual, listSalesCatalogue: vi.fn() };
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
  return { listStockBatches: vi.fn(), ApiError: axios.ApiError, isApiError: axios.isApiError };
});
vi.mock('@/services/doctors', async () => {
  const axios = await import('@/services/axios');
  return { listDoctors: vi.fn(), ApiError: axios.ApiError, isApiError: axios.isApiError };
});
vi.mock('@/services/salesInvoices', async () => {
  const axios = await import('@/services/axios');
  return {
    createSalesInvoice: vi.fn(),
    updateSalesInvoice: vi.fn(),
    applyInvoicePricing: vi.fn(),
    adjustInvoiceTax: vi.fn(),
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
import {
  applyInvoicePricing,
  createSalesInvoice,
  updateSalesInvoice,
} from '@/services/salesInvoices';
import {
  addNamedPack,
  posCustomer,
  posDraftInvoice,
  posPricedItem,
  proceedPos,
  renderPos,
  walkInPos,
} from './posTestRender';

const listCustomersMock = vi.mocked(listCustomers);
const listCatalogueMock = vi.mocked(listSalesCatalogue);
const evaluateMock = vi.mocked(evaluateMedicationSafety);
const listUnitsMock = vi.mocked(listProductUnits);
const convertMock = vi.mocked(convertProductUnit);
const listBatchesMock = vi.mocked(listStockBatches);
const listDoctorsMock = vi.mocked(listDoctors);
const createInvoiceMock = vi.mocked(createSalesInvoice);
const updateInvoiceMock = vi.mocked(updateSalesInvoice);
const applyPricingMock = vi.mocked(applyInvoicePricing);

describe('PosScreen invoice draft', () => {
  beforeEach(() => {
    listCustomersMock.mockReset();
    listCatalogueMock.mockReset();
    evaluateMock.mockReset();
    listUnitsMock.mockReset();
    convertMock.mockReset();
    listBatchesMock.mockReset();
    listDoctorsMock.mockReset();
    createInvoiceMock.mockReset();
    updateInvoiceMock.mockReset();
    applyPricingMock.mockReset();
    listCustomersMock.mockResolvedValue([posCustomer]);
    listCatalogueMock.mockResolvedValue([posPricedItem]);
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
    const invoice = posDraftInvoice();
    createInvoiceMock.mockResolvedValue(invoice);
    applyPricingMock.mockResolvedValue(invoice);
  });

  it('loading: waits for catalogue before a bill', () => {
    listCatalogueMock.mockReturnValue(new Promise(() => undefined));
    renderPos();
    expect(screen.getByText('Loading sales catalogue…')).toBeInTheDocument();
  });

  it('empty: no medicines to bill', async () => {
    listCatalogueMock.mockResolvedValue([]);
    renderPos();
    expect(await screen.findByText(/No medicines in the catalogue yet/)).toBeInTheDocument();
  });

  it('denied: till without Sales cannot save a bill', () => {
    renderPos(['CRM']);
    expect(screen.getByRole('alert')).toHaveTextContent('This counter cannot save Sales bills');
    expect(createInvoiceMock).not.toHaveBeenCalled();
  });

  it('failure: save bill network error', async () => {
    const user = userEvent.setup();
    createInvoiceMock.mockRejectedValue(new Error('network'));
    renderPos();
    await addNamedPack(user, 'Penicillin V');
    await walkInPos(user);
    await proceedPos(user);
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not save this bill');
  });

  it('validation: save without MRP or selling price', async () => {
    const user = userEvent.setup();
    const unpriced = {
      ...posPricedItem,
      suggestedMrpPaise: null,
      suggestedSellingPaise: null,
    };
    listCatalogueMock.mockResolvedValue([unpriced]);
    renderPos();
    await addNamedPack(user, 'Penicillin V');
    expect(screen.getByLabelText('MRP ₹')).toHaveValue('');
    expect(screen.getByLabelText('Selling ₹')).toHaveValue('');
    await walkInPos(user);
    await proceedPos(user);
    expect(screen.getByRole('alert')).toHaveTextContent('MRP and selling price');
    expect(createInvoiceMock).not.toHaveBeenCalled();
  });

  it('conflict: stale stock on save', async () => {
    const user = userEvent.setup();
    createInvoiceMock.mockRejectedValue(new ApiError('Floor qty changed', 409, 'STALE_STOCK'));
    renderPos();
    await addNamedPack(user, 'Penicillin V');
    await walkInPos(user);
    await proceedPos(user);
    expect(await screen.findByRole('alert')).toHaveTextContent('Draft warnings');
  });

  it('success: walk-in skip saves numbered draft', async () => {
    const user = userEvent.setup();
    renderPos();
    await addNamedPack(user, 'Penicillin V');
    await walkInPos(user);
    expect(screen.getByText('Walk-in')).toBeInTheDocument();
    await proceedPos(user);
    expect(await screen.findByRole('status')).toHaveTextContent('INV/2026-27/BR01/00001');
    await waitFor(() => {
      expect(createInvoiceMock).toHaveBeenCalledWith(
        expect.objectContaining({
          customerId: null,
          lines: [expect.objectContaining({ productId: 'p1', mrpPaise: 12000, sellingPricePaise: 10000 })],
        }),
      );
    });
    expect(updateInvoiceMock).not.toHaveBeenCalled();
  });

  it('success: save again after adding a line patches the open draft', async () => {
    const user = userEvent.setup();
    const productB = { ...posPricedItem, id: 'p2', sku: 'SKU-B', name: 'Paracetamol 500' };
    listCatalogueMock.mockResolvedValue([posPricedItem, productB]);
    updateInvoiceMock.mockResolvedValue(posDraftInvoice({ version: 2 }));
    applyPricingMock.mockResolvedValue(posDraftInvoice({ version: 2 }));
    renderPos();
    await addNamedPack(user, 'Penicillin V');
    await walkInPos(user);
    await proceedPos(user);
    expect(await screen.findByRole('status')).toHaveTextContent('INV/2026-27/BR01/00001');
    await user.click(screen.getByRole('button', { name: '← Back to add items' }));
    await addNamedPack(user, 'Paracetamol 500');
    await proceedPos(user);
    await waitFor(() => {
      expect(updateInvoiceMock).toHaveBeenCalledWith(
        'inv-1',
        expect.objectContaining({
          expectedVersion: 2,
          customerId: null,
          lines: [
            expect.objectContaining({ productId: 'p1', sellingPricePaise: 10000 }),
            expect.objectContaining({ productId: 'p2', mrpPaise: 12000, sellingPricePaise: 10000 }),
          ],
        }),
      );
    });
    expect(createInvoiceMock).toHaveBeenCalledTimes(1);
  });
});
