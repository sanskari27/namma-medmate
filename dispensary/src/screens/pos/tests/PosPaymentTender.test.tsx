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
vi.mock('@/services/credit', async () => {
  const axios = await import('@/services/axios');
  return { getCustomerCredit: vi.fn(), ApiError: axios.ApiError, isApiError: axios.isApiError };
});
vi.mock('@/services/loyalty', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/loyalty')>();
  return { ...actual, getCustomerLoyalty: vi.fn() };
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

import { getCustomerCredit } from '@/services/credit';
import { listCustomers } from '@/services/customers';
import { getCustomerLoyalty } from '@/services/loyalty';
import { listDoctors } from '@/services/doctors';
import { listStockBatches } from '@/services/inventory';
import { evaluateMedicationSafety } from '@/services/medicationSafety';
import { convertProductUnit, listProductUnits } from '@/services/productUnits';
import { listSalesCatalogue } from '@/services/salesCatalogue';
import {
  applyInvoicePricing,
  completeSalesInvoice,
  createSalesInvoice,
  updateSalesInvoice,
} from '@/services/salesInvoices';
import {
  addNamedPack,
  pickPatientPos,
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
const getCreditMock = vi.mocked(getCustomerCredit);
const getLoyaltyMock = vi.mocked(getCustomerLoyalty);
const createInvoiceMock = vi.mocked(createSalesInvoice);
const applyPricingMock = vi.mocked(applyInvoicePricing);
const completeInvoiceMock = vi.mocked(completeSalesInvoice);
const updateInvoiceMock = vi.mocked(updateSalesInvoice);

function stubUnits() {
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
}

describe('PosScreen mixed payment and khata', () => {
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
    getCreditMock.mockResolvedValue({
      customerId: 'c1',
      limitPaise: 50000,
      balancePaise: 0,
      availablePaise: 50000,
      version: 1,
      entries: [],
    });
    getLoyaltyMock.mockResolvedValue({
      customerId: 'c1',
      balancePoints: 0,
      version: 1,
      entries: [],
    });
    stubUnits();
    const invoice = posDraftInvoice();
    createInvoiceMock.mockResolvedValue(invoice);
    applyPricingMock.mockResolvedValue(invoice);
  });

  it('loading: waits for catalogue before Charge', () => {
    listCatalogueMock.mockReturnValue(new Promise(() => undefined));
    renderPos();
    expect(screen.getByText('Loading sales catalogue…')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Charge ₹/ })).not.toBeInTheDocument();
  });

  it('empty: saved draft asks for a tender before collect', async () => {
    const user = userEvent.setup();
    renderPos();
    await addNamedPack(user, 'Penicillin V');
    await walkInPos(user);
    await proceedPos(user);
    expect(screen.getByRole('region', { name: 'Take payment' })).toHaveTextContent(
      'Add cash, UPI, card, bank, khata, or insurance / TPA to collect.',
    );
    expect(screen.getByRole('button', { name: /Charge ₹/ })).toBeDisabled();
  });

  it('denied: till without Sales cannot collect', () => {
    renderPos(['CRM']);
    expect(screen.getByRole('alert')).toHaveTextContent('This counter cannot save Sales bills');
    expect(completeInvoiceMock).not.toHaveBeenCalled();
  });

  it('validation: walk-in cannot put the bill on khata', async () => {
    const user = userEvent.setup();
    renderPos();
    await addNamedPack(user, 'Penicillin V');
    await walkInPos(user);
    await proceedPos(user);
    expect(screen.getByLabelText('Khata ₹')).toBeDisabled();
    await user.type(screen.getByLabelText('Cash ₹'), '50');
    expect(screen.getByRole('button', { name: /Charge ₹/ })).toBeDisabled();
    expect(completeInvoiceMock).not.toHaveBeenCalled();
  });

  it('conflict: stale total on collect', async () => {
    const user = userEvent.setup();
    completeInvoiceMock.mockRejectedValue(new ApiError('stale', 409, 'STALE_STATE'));
    renderPos();
    await addNamedPack(user, 'Penicillin V');
    await walkInPos(user);
    await proceedPos(user);
    await user.type(screen.getByLabelText('Cash ₹'), '112');
    await user.click(screen.getByRole('button', { name: /Charge ₹/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This bill total changed. Refresh, then collect again.',
    );
  });

  it('failure: collect network error', async () => {
    const user = userEvent.setup();
    completeInvoiceMock.mockRejectedValue(new Error('network'));
    renderPos();
    await addNamedPack(user, 'Penicillin V');
    await walkInPos(user);
    await proceedPos(user);
    await user.type(screen.getByLabelText('Cash ₹'), '112');
    await user.click(screen.getByRole('button', { name: /Charge ₹/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not collect this bill');
  });

  it('success: mixed cash UPI and khata with change back', async () => {
    const user = userEvent.setup();
    completeInvoiceMock.mockResolvedValue(
      posDraftInvoice({
        status: 'COMPLETED',
        version: 2,
        customerId: 'c1',
        amountPaidPaise: 12000,
        amountDuePaise: 3200,
        changePaise: 800,
        payments: [
          { mode: 'CASH', amountPaise: 5800, reference: null },
          { mode: 'UPI', amountPaise: 3000, reference: 'UPI-9' },
          { mode: 'CREDIT', amountPaise: 3200, reference: null },
        ],
      }),
    );
    renderPos();
    await addNamedPack(user, 'Penicillin V');
    await pickPatientPos(user);
    await proceedPos(user);
    expect(await screen.findByText(/Khata left ₹500/)).toBeInTheDocument();
    await user.type(screen.getByLabelText('Cash ₹'), '58');
    await user.type(screen.getByLabelText('UPI ₹'), '30');
    await user.type(screen.getByLabelText('UPI reference'), 'UPI-9');
    await user.type(screen.getByLabelText('Khata ₹'), '32');
    const tender = screen.getByRole('region', { name: 'Take payment' });
    expect(tender).toHaveTextContent('Change back');
    expect(tender).toHaveTextContent('Still due');
    await user.click(screen.getByRole('button', { name: /Charge ₹/ }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Bill INV/2026-27/BR01/00001 collected at this counter.',
    );
    await waitFor(() => {
      expect(completeInvoiceMock).toHaveBeenCalledWith(
        'inv-1',
        expect.objectContaining({
          expectedVersion: 1,
          expectedTotalPaise: 11200,
          changePaise: 800,
          payments: [
            { mode: 'CASH', amountPaise: 5800, reference: null },
            { mode: 'UPI', amountPaise: 3000, reference: 'UPI-9' },
            { mode: 'CREDIT', amountPaise: 3200, reference: null },
          ],
        }),
      );
    });
    expect(screen.getByRole('button', { name: /Charge ₹/ })).toBeDisabled();
    expect(updateInvoiceMock).toHaveBeenCalledWith(
      'inv-1',
      expect.objectContaining({ expectedVersion: 1, customerId: 'c1' }),
    );
  });
});
