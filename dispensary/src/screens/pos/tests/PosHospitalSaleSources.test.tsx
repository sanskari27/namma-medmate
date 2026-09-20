import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/services/axios';
import type { HospitalAdmission, HospitalDoctor, HospitalWardOccupancy } from '@/services/hospital';

vi.mock('@/services/customers', async () => {
  const axios = await import('@/services/axios');
  return {
    listCustomers: vi.fn(),
    getCustomer: vi.fn(),
    ApiError: axios.ApiError,
    isApiError: axios.isApiError,
  };
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
vi.mock('@/services/hospital', async () => {
  const axios = await import('@/services/axios');
  return {
    getHospitalWards: vi.fn(),
    getHospitalDoctors: vi.fn(),
    getHospitalAdmission: vi.fn(),
    createHospitalIssue: vi.fn(),
    ApiError: axios.ApiError,
    isApiError: axios.isApiError,
  };
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

import { getCustomer, listCustomers } from '@/services/customers';
import { listDoctors } from '@/services/doctors';
import {
  createHospitalIssue,
  getHospitalAdmission,
  getHospitalDoctors,
  getHospitalWards,
} from '@/services/hospital';
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
  posCustomer,
  posDraftInvoice,
  posPricedItem,
  proceedPos,
  renderPos,
  walkInPos,
} from './posTestRender';

const listCustomersMock = vi.mocked(listCustomers);
const getCustomerMock = vi.mocked(getCustomer);
const listCatalogueMock = vi.mocked(listSalesCatalogue);
const evaluateMock = vi.mocked(evaluateMedicationSafety);
const listUnitsMock = vi.mocked(listProductUnits);
const convertMock = vi.mocked(convertProductUnit);
const listBatchesMock = vi.mocked(listStockBatches);
const listDoctorsMock = vi.mocked(listDoctors);
const createInvoiceMock = vi.mocked(createSalesInvoice);
const updateInvoiceMock = vi.mocked(updateSalesInvoice);
const applyPricingMock = vi.mocked(applyInvoicePricing);
const completeInvoiceMock = vi.mocked(completeSalesInvoice);
const wardsMock = vi.mocked(getHospitalWards);
const hospitalDoctorsMock = vi.mocked(getHospitalDoctors);
const admissionMock = vi.mocked(getHospitalAdmission);
const issueMock = vi.mocked(createHospitalIssue);

const occupancy: HospitalWardOccupancy = {
  wardCount: 1,
  totalBeds: 2,
  occupiedBeds: 1,
  freeBeds: 1,
  occupancyPercent: 50,
  admittedCount: 1,
  wards: [
    {
      id: 'w1',
      name: 'General A',
      code: 'GA',
      floor: '2',
      category: 'GENERAL',
      capacity: 2,
      nurseInCharge: 'Sister Meena',
      version: 1,
      beds: [],
    },
  ],
};

const hospitalDoctor: HospitalDoctor = {
  id: 'hd1',
  doctorId: 'd-crm',
  name: 'Dr. Rao',
  registrationNumber: 'KA-88',
  phone: null,
  departmentId: null,
  departmentName: null,
  qualification: null,
  specialty: 'Medicine',
  gender: null,
  experienceYears: null,
  email: null,
  opdRoom: null,
  consultingDays: null,
  consultingHours: null,
  consultationFeePaise: 0,
  status: 'AVAILABLE',
  languages: null,
  notes: null,
  version: 1,
};

const admission: HospitalAdmission = {
  id: 'a1',
  uhid: 'UHID-00001',
  patientName: 'Ravi Kumar',
  phone: '9876500001',
  age: null,
  gender: null,
  customerId: 'c1',
  wardId: 'w1',
  wardName: 'General A',
  bedId: 'b1',
  bedLabel: 'GA-1',
  attendingDoctorId: null,
  attendingDoctorName: null,
  diagnosis: 'Observation',
  payerType: 'SELF_PAY',
  insurerName: null,
  policyNumber: null,
  status: 'ACTIVE',
  admittedAt: '2026-09-20T10:00:00Z',
  version: 0,
};

const hospitalModules = ['SALES', 'HOSPITAL', 'CRM', 'INVENTORY', 'LOYALTY'];

async function chooseWardSource(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: 'Ward' }));
  await screen.findByRole('option', { name: 'General A' });
}

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

describe('POS hospital sale sources', () => {
  beforeEach(() => {
    listCustomersMock.mockReset();
    getCustomerMock.mockReset();
    listCatalogueMock.mockReset();
    evaluateMock.mockReset();
    listUnitsMock.mockReset();
    convertMock.mockReset();
    listBatchesMock.mockReset();
    listDoctorsMock.mockReset();
    createInvoiceMock.mockReset();
    updateInvoiceMock.mockReset();
    applyPricingMock.mockReset();
    completeInvoiceMock.mockReset();
    wardsMock.mockReset();
    hospitalDoctorsMock.mockReset();
    admissionMock.mockReset();
    issueMock.mockReset();
    listCustomersMock.mockResolvedValue([posCustomer]);
    getCustomerMock.mockResolvedValue(posCustomer);
    listCatalogueMock.mockResolvedValue([posPricedItem]);
    listDoctorsMock.mockResolvedValue([]);
    listBatchesMock.mockResolvedValue([]);
    evaluateMock.mockResolvedValue({
      checkStatus: 'CHECKED',
      checkLabel: null,
      productsChecked: 1,
      warnings: [],
    });
    stubUnits();
    wardsMock.mockResolvedValue(occupancy);
    hospitalDoctorsMock.mockResolvedValue([hospitalDoctor]);
    admissionMock.mockResolvedValue(admission);
    const invoice = posDraftInvoice({ saleSource: 'WARD', uhid: 'UHID-00001', wardId: 'w1' });
    createInvoiceMock.mockResolvedValue(invoice);
    updateInvoiceMock.mockResolvedValue(invoice);
    applyPricingMock.mockResolvedValue(invoice);
    completeInvoiceMock.mockResolvedValue({
      ...invoice,
      status: 'COMPLETED',
      invoiceNumber: 'INV/2026-27/BR01/00001',
      version: 2,
    });
  });

  it('loading: waits for catalogue before hospital sources', () => {
    listCatalogueMock.mockReturnValue(new Promise(() => undefined));
    renderPos(hospitalModules);
    expect(screen.getByText('Loading sales catalogue…')).toBeInTheDocument();
  });

  it('empty: Counter till has no UHID field', async () => {
    renderPos(hospitalModules);
    expect(await screen.findByRole('group', { name: 'Sale source' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Counter' })).toHaveAttribute('data-active', 'true');
    expect(screen.queryByLabelText('UHID')).not.toBeInTheDocument();
  });

  it('validation: Ward sale needs UHID', async () => {
    const user = userEvent.setup();
    renderPos(hospitalModules);
    await addNamedPack(user, 'Penicillin V');
    await chooseWardSource(user);
    await walkInPos(user);
    await proceedPos(user);
    expect(await screen.findByRole('alert')).toHaveTextContent(/UHID/);
    expect(createInvoiceMock).not.toHaveBeenCalled();
    expect(issueMock).not.toHaveBeenCalled();
  });

  it('validation: Ward sale needs a ward after UHID', async () => {
    const user = userEvent.setup();
    renderPos(hospitalModules);
    await addNamedPack(user, 'Penicillin V');
    await chooseWardSource(user);
    await user.type(screen.getByLabelText('UHID'), 'UHID-00001');
    await walkInPos(user);
    await proceedPos(user);
    expect(await screen.findByRole('alert')).toHaveTextContent(/Pick a ward/);
    expect(createInvoiceMock).not.toHaveBeenCalled();
  });

  it('validation: Emergency sale needs UHID', async () => {
    const user = userEvent.setup();
    renderPos(hospitalModules);
    await addNamedPack(user, 'Penicillin V');
    await user.click(await screen.findByRole('button', { name: 'Emergency' }));
    await walkInPos(user);
    await proceedPos(user);
    expect(await screen.findByRole('alert')).toHaveTextContent(/UHID/);
    expect(createInvoiceMock).not.toHaveBeenCalled();
    expect(issueMock).not.toHaveBeenCalled();
  });

  it('success: Emergency casualty bills without a ward', async () => {
    const user = userEvent.setup();
    createInvoiceMock.mockResolvedValue(
      posDraftInvoice({ saleSource: 'EMERGENCY', uhid: 'UHID-CAS-1', wardId: null }),
    );
    renderPos(hospitalModules);
    await addNamedPack(user, 'Penicillin V');
    await user.click(await screen.findByRole('button', { name: 'Emergency' }));
    await user.type(screen.getByLabelText('UHID'), 'UHID-CAS-1');
    await walkInPos(user);
    await proceedPos(user);
    await waitFor(() =>
      expect(createInvoiceMock).toHaveBeenCalledWith(
        expect.objectContaining({
          saleSource: 'EMERGENCY',
          uhid: 'UHID-CAS-1',
          wardId: null,
        }),
      ),
    );
    expect(issueMock).not.toHaveBeenCalled();
  });

  it('denied: till without Hospital hides sale sources', async () => {
    renderPos(['SALES', 'CRM', 'INVENTORY']);
    await screen.findByText('Penicillin V');
    expect(screen.queryByRole('group', { name: 'Sale source' })).not.toBeInTheDocument();
  });

  it('denied: hospital source without HOSPITAL is refused', async () => {
    const user = userEvent.setup();
    createInvoiceMock.mockRejectedValue(new ApiError('no hospital', 403, 'FORBIDDEN'));
    renderPos(hospitalModules);
    await addNamedPack(user, 'Penicillin V');
    await chooseWardSource(user);
    await user.type(screen.getByLabelText('UHID'), 'UHID-00001');
    await user.selectOptions(screen.getByLabelText('Ward'), 'w1');
    await walkInPos(user);
    await proceedPos(user);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This counter cannot bill Ward, Emergency, or OPD Rx',
    );
  });

  it('conflict: stale version on a Ward draft', async () => {
    const user = userEvent.setup();
    createInvoiceMock.mockRejectedValue(new ApiError('stale', 409, 'STALE_STATE'));
    renderPos(hospitalModules);
    await addNamedPack(user, 'Penicillin V');
    await chooseWardSource(user);
    await user.type(screen.getByLabelText('UHID'), 'UHID-00001');
    await user.selectOptions(screen.getByLabelText('Ward'), 'w1');
    await walkInPos(user);
    await proceedPos(user);
    expect(await screen.findByRole('alert')).toHaveTextContent('this bill changed');
  });

  it('failure: Ward draft network error', async () => {
    const user = userEvent.setup();
    createInvoiceMock.mockRejectedValue(new Error('network'));
    renderPos(hospitalModules);
    await addNamedPack(user, 'Penicillin V');
    await chooseWardSource(user);
    await user.type(screen.getByLabelText('UHID'), 'UHID-00001');
    await user.selectOptions(screen.getByLabelText('Ward'), 'w1');
    await walkInPos(user);
    await proceedPos(user);
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not save this bill');
  });

  it('success: Ward complete stays on the till and never issues to the hospital account', async () => {
    const user = userEvent.setup();
    renderPos(hospitalModules);
    await addNamedPack(user, 'Penicillin V');
    await chooseWardSource(user);
    await user.type(screen.getByLabelText('UHID'), 'UHID-00001');
    await user.selectOptions(screen.getByLabelText('Ward'), 'w1');
    await walkInPos(user);
    await proceedPos(user);
    await waitFor(() =>
      expect(createInvoiceMock).toHaveBeenCalledWith(
        expect.objectContaining({
          saleSource: 'WARD',
          uhid: 'UHID-00001',
          wardId: 'w1',
        }),
      ),
    );
    await user.type(screen.getByLabelText('Cash ₹'), '112');
    await user.click(screen.getByRole('button', { name: /Charge ₹/ }));
    await waitFor(() => expect(completeInvoiceMock).toHaveBeenCalled());
    expect(completeInvoiceMock.mock.calls[0]?.[1]).not.toHaveProperty('saleSource');
    expect(issueMock).not.toHaveBeenCalled();
  });

  it('success: occupied-bed deep-link prefills Ward UHID and patient', async () => {
    renderPos(hospitalModules, 'pharmacy_owner', [], '/pos?saleSource=WARD&admissionId=a1');
    expect(await screen.findByDisplayValue('UHID-00001')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ward' })).toHaveAttribute('data-active', 'true');
    expect(screen.getByLabelText('Ward')).toHaveValue('w1');
    await waitFor(() => expect(admissionMock).toHaveBeenCalledWith('a1'));
    await waitFor(() => expect(getCustomerMock).toHaveBeenCalledWith('c1'));
    expect(await screen.findByText('Ravi Kumar')).toBeInTheDocument();
  });

  it('validation: Insurance / TPA needs insurer and policy', async () => {
    const user = userEvent.setup();
    renderPos(hospitalModules);
    await addNamedPack(user, 'Penicillin V');
    await chooseWardSource(user);
    await user.type(screen.getByLabelText('UHID'), 'UHID-00001');
    await user.selectOptions(screen.getByLabelText('Ward'), 'w1');
    await walkInPos(user);
    await proceedPos(user);
    await screen.findByRole('region', { name: 'Take payment' });
    await user.click(screen.getByRole('button', { name: 'Insurance / TPA' }));
    await user.click(screen.getByRole('button', { name: /Charge ₹/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('insurer name and policy');
    expect(completeInvoiceMock).not.toHaveBeenCalled();
  });

  it('success: OPD Rx sends the CRM doctor id', async () => {
    const user = userEvent.setup();
    createInvoiceMock.mockResolvedValue(posDraftInvoice({ saleSource: 'OPD_RX', doctorId: 'd-crm' }));
    renderPos(hospitalModules);
    await addNamedPack(user, 'Penicillin V');
    await user.click(await screen.findByRole('button', { name: 'OPD Rx' }));
    await screen.findByRole('option', { name: 'Dr. Rao' });
    await user.selectOptions(screen.getByLabelText('Prescribing doctor'), 'd-crm');
    await walkInPos(user);
    await proceedPos(user);
    await waitFor(() =>
      expect(createInvoiceMock).toHaveBeenCalledWith(
        expect.objectContaining({
          saleSource: 'OPD_RX',
          doctorId: 'd-crm',
        }),
      ),
    );
  });
});
