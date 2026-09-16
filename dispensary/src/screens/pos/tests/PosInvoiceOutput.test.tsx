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
import { evaluateMedicationSafety } from '@/services/medicationSafety';
import { convertProductUnit, listProductUnits } from '@/services/productUnits';
import { listSalesCatalogue } from '@/services/salesCatalogue';
import {
  applyInvoicePricing,
  completeSalesInvoice,
  createSalesInvoice,
  downloadInvoicePdf,
  emailInvoiceCopy,
  openInvoicePdf,
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
const creditMock = vi.mocked(getCustomerCredit);
const createInvoiceMock = vi.mocked(createSalesInvoice);
const applyPricingMock = vi.mocked(applyInvoicePricing);
const completeInvoiceMock = vi.mocked(completeSalesInvoice);
const downloadPdfMock = vi.mocked(downloadInvoicePdf);
const emailCopyMock = vi.mocked(emailInvoiceCopy);
const openPdfMock = vi.mocked(openInvoicePdf);

describe('POS A4 invoice output', () => {
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
    completeInvoiceMock.mockResolvedValue(posDraftInvoice({ status: 'COMPLETED', version: 2 }));
    downloadPdfMock.mockResolvedValue(new Blob(['pdf'], { type: 'application/pdf' }));
    emailCopyMock.mockResolvedValue({
      id: 'em-1',
      status: 'QUEUED',
      replayed: false,
      invoiceNumber: 'INV/2026-27/BR01/00001',
    });
  });

  it('empty: saved draft asks to collect before print', async () => {
    const user = userEvent.setup();
    renderPos();
    await addNamedPack(user, 'Penicillin V');
    await walkInPos(user);
    await proceedPos(user);
    expect(screen.getByRole('region', { name: 'Bill copy' })).toHaveTextContent(
      'Collect this bill to print the A4 invoice.',
    );
    expect(screen.getByRole('button', { name: 'Print this bill' })).toBeDisabled();
  });

  it('validation: linked patient without email cannot send a copy', async () => {
    const user = userEvent.setup();
    listCustomersMock.mockResolvedValue([{ ...posCustomer, email: null }]);
    completeInvoiceMock.mockResolvedValue(
      posDraftInvoice({ status: 'COMPLETED', version: 2, customerId: 'c1' }),
    );
    renderPos();
    await addNamedPack(user, 'Penicillin V');
    await pickPatientPos(user);
    await proceedPos(user);
    await user.click(screen.getByRole('button', { name: 'Cash' }));
    await user.click(screen.getByRole('button', { name: /Charge ₹/ }));
    await user.click(await screen.findByRole('button', { name: 'Send bill copy' }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'This patient has no email on file. Add one before sending a bill copy.',
    );
    expect(emailCopyMock).not.toHaveBeenCalled();
  });

  it('success: print after Charge opens the A4 copy', async () => {
    const user = userEvent.setup();
    renderPos();
    await addNamedPack(user, 'Penicillin V');
    await walkInPos(user);
    await proceedPos(user);
    await user.click(screen.getByRole('button', { name: 'Cash' }));
    await user.click(screen.getByRole('button', { name: /Charge ₹/ }));
    await user.click(await screen.findByRole('button', { name: 'Print this bill' }));
    await waitFor(() => {
      expect(downloadPdfMock).toHaveBeenCalledWith('inv-1');
      expect(openPdfMock).toHaveBeenCalled();
    });
  });
});
