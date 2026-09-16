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
  completeSalesInvoice,
  createSalesInvoice,
  pingSalesInvoiceHealth,
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
const completeInvoiceMock = vi.mocked(completeSalesInvoice);
const pingHealthMock = vi.mocked(pingSalesInvoiceHealth);

describe('POS connectivity guard', () => {
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
    pingHealthMock.mockResolvedValue({ status: 'UP' });
  });

  it('shows a full-screen overlay on disconnect and keeps the draft', async () => {
    const user = userEvent.setup();
    renderPos();
    await addNamedPack(user, 'Penicillin V');
    await walkInPos(user);
    await proceedPos(user);
    window.dispatchEvent(new Event('offline'));
    expect(await screen.findByRole('alertdialog', { name: 'Sales is offline' })).toHaveTextContent(
      'Keep this bill. Collect when the counter is back on the line.',
    );
    expect(screen.getAllByText(/INV\/2026-27\/BR01\/00001/).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /Charge ₹/ })).toBeDisabled();
    expect(completeInvoiceMock).not.toHaveBeenCalled();
  });

  it('resumes billing after the till can reach the server', async () => {
    const user = userEvent.setup();
    renderPos();
    await addNamedPack(user, 'Penicillin V');
    await walkInPos(user);
    await proceedPos(user);
    window.dispatchEvent(new Event('offline'));
    expect(await screen.findByRole('alertdialog', { name: 'Sales is offline' })).toBeInTheDocument();
    pingHealthMock.mockResolvedValue({ status: 'UP' });
    window.dispatchEvent(new Event('online'));
    await waitFor(() => {
      expect(screen.queryByRole('alertdialog', { name: 'Sales is offline' })).not.toBeInTheDocument();
    });
    expect(pingHealthMock).toHaveBeenCalled();
    expect(screen.getAllByText(/INV\/2026-27\/BR01\/00001/).length).toBeGreaterThan(0);
  });
});
