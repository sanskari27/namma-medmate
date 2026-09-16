import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
import { listDoctors } from '@/services/doctors';
import { listStockBatches } from '@/services/inventory';
import { getCustomerLoyalty } from '@/services/loyalty';
import { evaluateMedicationSafety } from '@/services/medicationSafety';
import { convertProductUnit, listProductUnits } from '@/services/productUnits';
import { listSalesCatalogue } from '@/services/salesCatalogue';
import { applyInvoicePricing, completeSalesInvoice, createSalesInvoice } from '@/services/salesInvoices';
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
const creditMock = vi.mocked(getCustomerCredit);
const loyaltyMock = vi.mocked(getCustomerLoyalty);
const createInvoiceMock = vi.mocked(createSalesInvoice);
const applyPricingMock = vi.mocked(applyInvoicePricing);
const completeInvoiceMock = vi.mocked(completeSalesInvoice);

describe('POS loyalty redeem', () => {
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
    creditMock.mockResolvedValue({
      customerId: 'c1',
      limitPaise: 50000,
      balancePaise: 0,
      availablePaise: 50000,
      version: 1,
      entries: [],
    });
    loyaltyMock.mockResolvedValue({
      customerId: 'c1',
      balancePoints: 20,
      version: 1,
      entries: [],
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
    const invoice = posDraftInvoice({ customerId: 'c1' });
    createInvoiceMock.mockResolvedValue(invoice);
    applyPricingMock.mockResolvedValue(invoice);
  });

  it('denied: walk-in bill cannot use points', async () => {
    const user = userEvent.setup();
    renderPos();
    await addNamedPack(user, 'Penicillin V');
    await walkInPos(user);
    await proceedPos(user);
    expect(screen.queryByRole('region', { name: 'Points' })).not.toBeInTheDocument();
  });

  it('validation: redeem above the running balance is blocked', async () => {
    const user = userEvent.setup();
    renderPos();
    await addNamedPack(user, 'Penicillin V');
    await pickPatientPos(user);
    await proceedPos(user);
    await user.type(await screen.findByLabelText('Use points'), '22');
    await user.type(screen.getByLabelText('Cash ₹'), '90');
    await user.click(screen.getByRole('button', { name: /Charge ₹/ }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'This patient does not have enough points for that redeem.',
    );
    expect(completeInvoiceMock).not.toHaveBeenCalled();
  });

  it('failure: points ledger cannot load for this patient', async () => {
    const user = userEvent.setup();
    loyaltyMock.mockRejectedValue(new Error('network'));
    renderPos();
    await addNamedPack(user, 'Penicillin V');
    await pickPatientPos(user);
    await proceedPos(user);
    expect(await screen.findByText(/Could not load points for this patient/)).toBeInTheDocument();
  });

  it('success: Use points is posted on Charge', async () => {
    const user = userEvent.setup();
    completeInvoiceMock.mockResolvedValue(
      posDraftInvoice({ status: 'COMPLETED', version: 2, customerId: 'c1' }),
    );
    renderPos();
    await addNamedPack(user, 'Penicillin V');
    await pickPatientPos(user);
    await proceedPos(user);
    await user.type(await screen.findByLabelText('Use points'), '10');
    await user.click(screen.getByRole('button', { name: 'Cash' }));
    await user.click(screen.getByRole('button', { name: /Charge ₹/ }));
    await waitFor(() => {
      expect(completeInvoiceMock).toHaveBeenCalledWith(
        'inv-1',
        expect.objectContaining({ redeemPoints: 10 }),
      );
    });
  });
});
