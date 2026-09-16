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
    getPrescriptionFulfillment: vi.fn(),
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
  getPrescriptionFulfillment,
} from '@/services/salesInvoices';
import {
  addNamedPack,
  pickPatientPos,
  posCustomer,
  posDoctor,
  posDraftInvoice,
  posH1Item,
  posRxItem,
  proceedPos,
  renderPos,
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
const getFulfillmentMock = vi.mocked(getPrescriptionFulfillment);

const rxInvoice = posDraftInvoice({
  id: 'inv-rx',
  invoiceNumber: 'INV/2026-27/BR01/00009',
  customerId: 'c1',
  prescriptionReference: 'RX-1',
  prescriptionVerified: true,
});

describe('PosScreen prescription-linked sale', () => {
  beforeEach(() => {
    listCustomersMock.mockResolvedValue([posCustomer]);
    listCatalogueMock.mockResolvedValue([posRxItem]);
    listDoctorsMock.mockResolvedValue([posDoctor]);
    listBatchesMock.mockResolvedValue([]);
    getFulfillmentMock.mockResolvedValue({ items: [] });
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
    createInvoiceMock.mockResolvedValue(rxInvoice);
    applyPricingMock.mockResolvedValue(rxInvoice);
  });

  it('loading: checks remaining on this Rx', async () => {
    const user = userEvent.setup();
    getFulfillmentMock.mockReturnValue(new Promise(() => undefined));
    renderPos();
    await addNamedPack(user, 'Amoxil');
    await pickPatientPos(user);
    await user.type(screen.getByLabelText('Rx reference'), 'RX-1');
    expect(await screen.findByText('Checking this Rx…')).toBeInTheDocument();
  });

  it('empty: first visit has no fills yet', async () => {
    const user = userEvent.setup();
    renderPos();
    await addNamedPack(user, 'Amoxil');
    await pickPatientPos(user);
    await user.type(screen.getByLabelText('Rx reference'), 'RX-1');
    expect(await screen.findByText('No fills on this Rx yet.')).toBeInTheDocument();
  });

  it('validation: Rx pack needs reference, checked, and prescribed qty', async () => {
    const user = userEvent.setup();
    renderPos();
    await addNamedPack(user, 'Amoxil');
    await pickPatientPos(user);
    await proceedPos(user);
    expect(screen.getByRole('alert')).toHaveTextContent('Rx reference');
    expect(createInvoiceMock).not.toHaveBeenCalled();
  });

  it('denied: cashier cannot dispense Schedule H1', async () => {
    const user = userEvent.setup();
    listCatalogueMock.mockResolvedValue([posH1Item]);
    renderPos(['SALES', 'CRM'], 'pharmacy_staff', [
      { id: 'r1', name: 'Cashier', code: 'cashier', kind: 'PREDEFINED' },
    ]);
    await addNamedPack(user, 'Alprazolam');
    expect(screen.getByText(/Call a pharmacist to this till/i)).toBeInTheDocument();
    await pickPatientPos(user);
    await user.type(screen.getByLabelText('Rx reference'), 'RX-H1');
    await user.click(screen.getByLabelText('Prescription checked'));
    await user.type(screen.getByLabelText('Prescribed qty for Alprazolam'), '30');
    await user.selectOptions(screen.getByLabelText('Prescribing doctor'), 'd1');
    await proceedPos(user);
    expect(screen.getByRole('alert')).toHaveTextContent('cashier-only');
    expect(createInvoiceMock).not.toHaveBeenCalled();
  });

  it('conflict: Rx reference already on another patient', async () => {
    const user = userEvent.setup();
    getFulfillmentMock.mockRejectedValue(
      new ApiError('That Rx reference is already on another patient.', 422, 'FOREIGN_REFERENCE'),
    );
    renderPos();
    await addNamedPack(user, 'Amoxil');
    await pickPatientPos(user);
    await user.type(screen.getByLabelText('Rx reference'), 'RX-BIND');
    expect(await screen.findByRole('alert')).toHaveTextContent('another patient');
  });

  it('denied: archived Rx cannot go on a new bill', async () => {
    const user = userEvent.setup();
    getFulfillmentMock.mockRejectedValue(
      new ApiError('This Rx is archived. Open history, not a new sale.', 422, 'ARCHIVED_REFERENCE'),
    );
    renderPos();
    await addNamedPack(user, 'Amoxil');
    await pickPatientPos(user);
    await user.type(screen.getByLabelText('Rx reference'), 'RX-OLD');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This Rx is archived — history only, not a new sale.',
    );
  });

  it('failure: remaining lookup network error', async () => {
    const user = userEvent.setup();
    getFulfillmentMock.mockRejectedValue(new Error('network'));
    renderPos();
    await addNamedPack(user, 'Amoxil');
    await pickPatientPos(user);
    await user.type(screen.getByLabelText('Rx reference'), 'RX-1');
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not check this Rx');
  });

  it('success: saves Rx reference and prescribed qty then Charge', async () => {
    const user = userEvent.setup();
    getFulfillmentMock.mockResolvedValue({
      items: [
        {
          productId: 'p-rx',
          prescribedQuantity: 90,
          fulfilledQuantity: 30,
          remainingQuantity: 60,
        },
      ],
    });
    completeInvoiceMock.mockResolvedValue({
      ...rxInvoice,
      status: 'COMPLETED',
      version: 2,
      amountPaidPaise: 11200,
      payments: [{ mode: 'CASH', amountPaise: 11200, reference: null }],
    });
    renderPos();
    await addNamedPack(user, 'Amoxil');
    await pickPatientPos(user);
    await user.type(screen.getByLabelText('Rx reference'), 'RX-1');
    await user.click(screen.getByLabelText('Prescription checked'));
    await user.type(screen.getByLabelText('Prescribed qty for Amoxil'), '90');
    await user.selectOptions(screen.getByLabelText('Prescribing doctor'), 'd1');
    expect(await screen.findByText(/Still on this Rx/)).toHaveTextContent('60');
    await proceedPos(user);
    await waitFor(() => {
      expect(createInvoiceMock).toHaveBeenCalledWith(
        expect.objectContaining({
          customerId: 'c1',
          prescriptionReference: 'RX-1',
          prescriptionVerified: true,
          lines: [expect.objectContaining({ productId: 'p-rx', prescribedQuantity: 90 })],
        }),
      );
    });
    await user.type(screen.getByLabelText('Cash ₹'), '112');
    await user.click(screen.getByRole('button', { name: /Charge ₹/ }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Bill INV/2026-27/BR01/00009 collected at this counter.',
    );
  });
});
