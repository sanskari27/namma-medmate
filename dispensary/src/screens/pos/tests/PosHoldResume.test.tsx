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
    getSalesInvoice: vi.fn(),
    getPrescriptionFulfillment: vi.fn().mockResolvedValue({ items: [] }),
    listSalesInvoices: vi.fn(),
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
  getSalesInvoice,
  holdSalesInvoice,
  listSalesInvoices,
  resumeSalesInvoice,
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
const applyPricingMock = vi.mocked(applyInvoicePricing);
const listHeldMock = vi.mocked(listSalesInvoices);
const holdInvoiceMock = vi.mocked(holdSalesInvoice);
const resumeInvoiceMock = vi.mocked(resumeSalesInvoice);
const getInvoiceMock = vi.mocked(getSalesInvoice);

describe('PosScreen hold and resume', () => {
  beforeEach(() => {
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
    listHeldMock.mockResolvedValue({ items: [] });
  });

  it('loading: waits for held bills list', async () => {
    listHeldMock.mockReturnValue(new Promise(() => undefined));
    renderPos();
    expect(await screen.findByText('Loading held bills…')).toBeInTheDocument();
  });

  it('empty: till with no parked bills', async () => {
    renderPos();
    expect(await screen.findByText('No held bills on this till.')).toBeInTheDocument();
  });

  it('denied: till without Sales cannot hold', () => {
    renderPos(['CRM']);
    expect(screen.getByRole('alert')).toHaveTextContent('This counter cannot save Sales bills');
    expect(screen.queryByRole('button', { name: 'Send to reception · pay later' })).not.toBeInTheDocument();
    expect(holdInvoiceMock).not.toHaveBeenCalled();
  });

  it('validation: hold needs a saved draft', async () => {
    const user = userEvent.setup();
    renderPos();
    await addNamedPack(user, 'Penicillin V');
    await walkInPos(user);
    expect(screen.queryByRole('button', { name: 'Send to reception · pay later' })).not.toBeInTheDocument();
    expect(holdInvoiceMock).not.toHaveBeenCalled();
  });

  it('conflict: another till already changed this bill', async () => {
    const user = userEvent.setup();
    holdInvoiceMock.mockRejectedValue(new ApiError('stale', 409, 'STALE_STATE'));
    renderPos();
    await addNamedPack(user, 'Penicillin V');
    await walkInPos(user);
    await proceedPos(user);
    await user.click(screen.getByRole('button', { name: 'Send to reception · pay later' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This bill was updated on another counter. Refresh, then hold again.',
    );
  });

  it('failure: hold network error', async () => {
    const user = userEvent.setup();
    holdInvoiceMock.mockRejectedValue(new Error('network'));
    renderPos();
    await addNamedPack(user, 'Penicillin V');
    await walkInPos(user);
    await proceedPos(user);
    await user.click(screen.getByRole('button', { name: 'Send to reception · pay later' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not hold this bill. Check the connection and try again.',
    );
  });

  it('success: hold parks the bill and resume restores it with revalidation', async () => {
    const user = userEvent.setup();
    const held = posDraftInvoice({ status: 'HELD', version: 2 });
    holdInvoiceMock.mockResolvedValue(held);
    getInvoiceMock.mockResolvedValue(held);
    resumeInvoiceMock.mockResolvedValue(
      posDraftInvoice({
        status: 'DRAFT',
        version: 3,
        taxPaise: 1800,
        totalPaise: 11800,
        revalidation: {
          stock: true,
          expiry: false,
          price: true,
          tax: true,
          approval: false,
        },
      }),
    );
    renderPos();
    await addNamedPack(user, 'Penicillin V');
    await walkInPos(user);
    await proceedPos(user);
    await user.click(screen.getByRole('button', { name: 'Send to reception · pay later' }));
    expect(
      await screen.findByText('Bill INV/2026-27/BR01/00001 sent to reception — pay later.'),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('button', { name: 'Resume bill INV/2026-27/BR01/00001' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Resume bill INV/2026-27/BR01/00001' }));
    expect(
      await screen.findByText(/Held bill INV\/2026-27\/BR01\/00001 is back on this counter/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Floor qty, price, or GST changed/)).toBeInTheDocument();
    await waitFor(() => {
      expect(resumeInvoiceMock).toHaveBeenCalledWith('inv-1', { expectedVersion: 2 });
    });
  });
});
