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
  adjustInvoiceTax,
  applyInvoicePricing,
  createSalesInvoice,
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
const adjustTaxMock = vi.mocked(adjustInvoiceTax);

describe('PosScreen GST and discount', () => {
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
  });

  it('conflict: stale bill on apply', async () => {
    const user = userEvent.setup();
    renderPos();
    await addNamedPack(user, 'Penicillin V');
    await walkInPos(user);
    await proceedPos(user);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Apply GST on this bill' })).toBeEnabled();
    });
    applyPricingMock.mockRejectedValue(new ApiError('stale', 409, 'STALE_STATE'));
    await user.click(screen.getByRole('button', { name: 'Apply GST on this bill' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('This bill total changed');
  });

  it('failure: apply GST network error', async () => {
    const user = userEvent.setup();
    renderPos();
    await addNamedPack(user, 'Penicillin V');
    await walkInPos(user);
    await proceedPos(user);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Apply GST on this bill' })).toBeEnabled();
    });
    applyPricingMock.mockRejectedValue(new Error('network'));
    await user.click(screen.getByRole('button', { name: 'Apply GST on this bill' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not save this bill');
  });

  it('success: line percent and bill rupee discount show GST breakup', async () => {
    const user = userEvent.setup();
    applyPricingMock.mockResolvedValue(
      posDraftInvoice({
        version: 2,
        discountPaise: 1500,
        subtotalPaise: 8500,
        taxPaise: 1020,
        totalPaise: 9520,
        cgstPaise: 510,
        sgstPaise: 510,
      }),
    );
    renderPos();
    await addNamedPack(user, 'Penicillin V');
    await user.click(screen.getByRole('button', { name: 'Use percent discount for Penicillin V' }));
    await user.type(screen.getByLabelText('Discount %'), '10');
    await walkInPos(user);
    await proceedPos(user);
    expect(screen.getByRole('region', { name: 'GST on this bill' })).toHaveTextContent('CGST');
    await user.type(screen.getByLabelText('Bill discount'), '5');
    await user.click(screen.getByRole('button', { name: 'Apply GST on this bill' }));
    await waitFor(() => {
      expect(applyPricingMock).toHaveBeenLastCalledWith(
        'inv-1',
        expect.objectContaining({
          billDiscountType: 'FLAT',
          billDiscountValue: 500,
          lines: [expect.objectContaining({ productId: 'p1', type: 'PERCENT', value: 1000 })],
        }),
      );
    });
  });

  it('success: waiting for sign-off after over-threshold discount', async () => {
    const user = userEvent.setup();
    applyPricingMock.mockResolvedValue(
      posDraftInvoice({
        version: 2,
        discountApprovalStatus: 'PENDING',
        discountApprovalRequestId: 'req-1',
      }),
    );
    renderPos();
    await addNamedPack(user, 'Penicillin V');
    await walkInPos(user);
    await proceedPos(user);
    await user.click(screen.getByRole('button', { name: 'Apply GST on this bill' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Waiting for sign-off');
  });

  it('success: tax override with reason', async () => {
    const user = userEvent.setup();
    adjustTaxMock.mockResolvedValue(
      posDraftInvoice({
        version: 2,
        taxAdjusted: true,
        taxAdjustmentReason: 'Wrong HSN on pack',
      }),
    );
    renderPos();
    await addNamedPack(user, 'Penicillin V');
    await walkInPos(user);
    await proceedPos(user);
    await user.click(screen.getByRole('button', { name: 'Tax override' }));
    await user.type(screen.getByLabelText('Override reason'), 'Wrong HSN on pack');
    await user.click(screen.getByRole('button', { name: 'Save tax override' }));
    await waitFor(() => {
      expect(adjustTaxMock).toHaveBeenCalled();
    });
  });
});
