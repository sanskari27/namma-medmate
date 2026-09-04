import { configureStore } from '@reduxjs/toolkit';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CustomersScreen from '@/screens/customers/CustomersScreen';
import { ApiError } from '@/services/axios';
import { authReducer } from '@/store';
import type { Customer } from '@/services/customers';

vi.mock('@/services/customers', async () => {
  const axios = await import('@/services/axios');
  return {
    listCustomers: vi.fn(),
    getCustomer: vi.fn(),
    createCustomer: vi.fn(),
    updateCustomer: vi.fn(),
    getCustomerHistory: vi.fn(),
    previewCustomerMerge: vi.fn(),
    executeCustomerMerge: vi.fn(),
    ApiError: axios.ApiError,
    isApiError: axios.isApiError,
  };
});

vi.mock('@/services/customerFamilies', async () => {
  const axios = await import('@/services/axios');
  return {
    getFamilyForCustomer: vi.fn(),
    getFamilyHistory: vi.fn(),
    createCustomerFamily: vi.fn(),
    addFamilyMember: vi.fn(),
    removeFamilyMember: vi.fn(),
    ApiError: axios.ApiError,
    isApiError: axios.isApiError,
  };
});

vi.mock('@/services/doctors', async () => {
  const axios = await import('@/services/axios');
  return {
    listDoctors: vi.fn(),
    listTopReferringDoctors: vi.fn(),
    createDoctor: vi.fn(),
    updateDoctor: vi.fn(),
    deactivateDoctor: vi.fn(),
    ApiError: axios.ApiError,
    isApiError: axios.isApiError,
  };
});

vi.mock('@/services/credit', async () => {
  const axios = await import('@/services/axios');
  return {
    getCustomerCredit: vi.fn(),
    listOutstandingCreditAccounts: vi.fn(),
    setCustomerCreditLimit: vi.fn(),
    settleCustomerCredit: vi.fn(),
    chargeCustomerCredit: vi.fn(),
    formatPaise: (paise: number) => `₹${(paise / 100).toLocaleString('en-IN')}`,
    ApiError: axios.ApiError,
    isApiError: axios.isApiError,
  };
});

vi.mock('@/services/customerRefills', async () => {
  const axios = await import('@/services/axios');
  return {
    listCustomerRefills: vi.fn(),
    listDueRefills: vi.fn(),
    createCustomerRefill: vi.fn(),
    updateCustomerRefill: vi.fn(),
    deleteCustomerRefill: vi.fn(),
    listTenantTags: vi.fn(),
    createTenantTag: vi.fn(),
    deleteTenantTag: vi.fn(),
    listCustomerTags: vi.fn(),
    replaceCustomerTags: vi.fn(),
    formatDueDate: (isoDate: string) => isoDate,
    ApiError: axios.ApiError,
    isApiError: axios.isApiError,
  };
});

import {
  createCustomer,
  executeCustomerMerge,
  getCustomerHistory,
  listCustomers,
  previewCustomerMerge,
  updateCustomer,
} from '@/services/customers';
import {
  createCustomerFamily,
  getFamilyForCustomer,
  getFamilyHistory,
} from '@/services/customerFamilies';
import { createDoctor, listDoctors, listTopReferringDoctors } from '@/services/doctors';
import { getCustomerCredit, setCustomerCreditLimit } from '@/services/credit';
import {
  createCustomerRefill,
  createTenantTag,
  listCustomerRefills,
  listCustomerTags,
  listDueRefills,
  listTenantTags,
  replaceCustomerTags,
  updateCustomerRefill,
} from '@/services/customerRefills';

const listMock = vi.mocked(listCustomers);
const createMock = vi.mocked(createCustomer);
const updateMock = vi.mocked(updateCustomer);
const previewMergeMock = vi.mocked(previewCustomerMerge);
const executeMergeMock = vi.mocked(executeCustomerMerge);
const getHistoryMock = vi.mocked(getCustomerHistory);
const getFamilyMock = vi.mocked(getFamilyForCustomer);
const getFamilyHistoryMock = vi.mocked(getFamilyHistory);
const createFamilyMock = vi.mocked(createCustomerFamily);
const listDoctorsMock = vi.mocked(listDoctors);
const listTopMock = vi.mocked(listTopReferringDoctors);
const createDoctorMock = vi.mocked(createDoctor);
const getCreditMock = vi.mocked(getCustomerCredit);
const setLimitMock = vi.mocked(setCustomerCreditLimit);
const listRefillsMock = vi.mocked(listCustomerRefills);
const listDueMock = vi.mocked(listDueRefills);
const createRefillMock = vi.mocked(createCustomerRefill);
const updateRefillMock = vi.mocked(updateCustomerRefill);
const listTenantTagsMock = vi.mocked(listTenantTags);
const listCustomerTagsMock = vi.mocked(listCustomerTags);
const createTagMock = vi.mocked(createTenantTag);
const replaceTagsMock = vi.mocked(replaceCustomerTags);

const sample: Customer = {
  id: 'c1',
  tenantId: 't1',
  name: 'Ravi Kumar',
  phone: '9876500001',
  email: 'ravi@example.com',
  dateOfBirth: '1988-04-12',
  gender: 'MALE',
  address: '12 MG Road',
  bloodGroup: 'B+',
  allergies: 'Penicillin',
  chronicConditions: 'Diabetes',
  createdAt: '2026-09-04T00:00:00Z',
  updatedAt: '2026-09-04T00:00:00Z',
};

function renderPage(modules: string[] = ['CRM', 'SALES']) {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        user: {
          userId: 'u1',
          displayName: 'Owner',
          role: 'pharmacy_owner',
          tenantId: 't1',
          pinSet: true,
          tenantStatus: 'ACTIVE',
          emailVerified: true,
          modules,
        },
      },
    },
  });
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <CustomersScreen />
      </MemoryRouter>
    </Provider>,
  );
}

describe('counter customers', () => {
  beforeEach(() => {
    listMock.mockReset();
    createMock.mockReset();
    updateMock.mockReset();
    previewMergeMock.mockReset();
    executeMergeMock.mockReset();
    getHistoryMock.mockReset();
    getFamilyMock.mockReset();
    getFamilyHistoryMock.mockReset();
    createFamilyMock.mockReset();
    listDoctorsMock.mockReset();
    listTopMock.mockReset();
    createDoctorMock.mockReset();
    getCreditMock.mockReset();
    setLimitMock.mockReset();
    listRefillsMock.mockReset();
    listDueMock.mockReset();
    createRefillMock.mockReset();
    updateRefillMock.mockReset();
    listTenantTagsMock.mockReset();
    listCustomerTagsMock.mockReset();
    createTagMock.mockReset();
    replaceTagsMock.mockReset();
    getFamilyMock.mockResolvedValue(null);
    getFamilyHistoryMock.mockResolvedValue([]);
    getHistoryMock.mockResolvedValue([]);
    listDoctorsMock.mockResolvedValue([]);
    listTopMock.mockResolvedValue([]);
    getCreditMock.mockResolvedValue({
      customerId: 'c1',
      limitPaise: 0,
      balancePaise: 0,
      availablePaise: 0,
      version: 0,
      entries: [],
    });
    listRefillsMock.mockResolvedValue([]);
    listDueMock.mockResolvedValue([]);
    listTenantTagsMock.mockResolvedValue([]);
    listCustomerTagsMock.mockResolvedValue([]);
  });

  it('loading: waits for customers', () => {
    listMock.mockReturnValue(new Promise(() => undefined));
    renderPage();
    expect(screen.getByText('Loading customers for this counter…')).toBeInTheDocument();
  });

  it('empty: no customers yet', async () => {
    listMock.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByRole('heading', { name: 'Customers' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'No customers yet. Add the first walk-in or regular for this pharmacy.',
    );
  });

  it('denied: till without CRM', () => {
    renderPage(['SALES']);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'This till login cannot open customer records. Ask the owner to grant the CRM area.',
    );
    expect(listMock).not.toHaveBeenCalled();
  });

  it('validation: name and phone required in create dialog', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([]);
    renderPage();
    await screen.findByRole('heading', { name: 'Customers' });
    await user.click(screen.getByRole('button', { name: 'Add customer' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Save customer' }));
    expect(within(dialog).getByRole('alert')).toHaveTextContent(
      'Name and phone are required before saving this customer.',
    );
    expect(createMock).not.toHaveBeenCalled();
  });

  it('conflict: duplicate phone offers search choice', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([]);
    createMock.mockRejectedValue(
      new ApiError(
        'A customer with this phone already exists. Search or open the existing profile.',
        409,
        'PHONE_TAKEN',
      ),
    );
    renderPage();
    await screen.findByRole('heading', { name: 'Customers' });
    await user.click(screen.getByRole('button', { name: 'Add customer' }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText('Name'), 'Dup');
    await user.type(within(dialog).getByLabelText('Phone'), '9876500001');
    await user.click(within(dialog).getByRole('button', { name: 'Save customer' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'A customer with this phone already exists',
    );
    expect(within(dialog).getByRole('button', { name: 'Search this phone' })).toBeInTheDocument();
  });

  it('failure: list network error', async () => {
    listMock.mockRejectedValue(new ApiError('Could not reach the server', 0, 'NETWORK'));
    renderPage();
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Could not reach the server for customers. Try again.',
    );
  });

  it('success: create customer then edit fields', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([]);
    createMock.mockResolvedValue(sample);
    updateMock.mockResolvedValue({
      ...sample,
      allergies: 'Penicillin, Sulfa',
    });
    renderPage();
    await screen.findByRole('heading', { name: 'Customers' });
    await user.click(screen.getByRole('button', { name: 'Add customer' }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText('Name'), 'Ravi Kumar');
    await user.type(within(dialog).getByLabelText('Phone'), '9876500001');
    await user.click(within(dialog).getByRole('button', { name: 'Save customer' }));

    await waitFor(() => {
      expect(createMock).toHaveBeenCalled();
    });
    expect(await screen.findByRole('status')).toHaveTextContent('Customer saved on this floor.');
    expect(screen.getByRole('button', { name: 'Ravi Kumar' })).toBeInTheDocument();

    const allergyField = screen.getByLabelText('Allergies');
    await user.clear(allergyField);
    await user.type(allergyField, 'Penicillin, Sulfa');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => {
      expect(updateMock).toHaveBeenCalledWith(
        'c1',
        expect.objectContaining({ allergies: 'Penicillin, Sulfa' }),
      );
    });
  });

  it('success: opens merge review from selected profile', async () => {
    const user = userEvent.setup();
    const other: Customer = {
      ...sample,
      id: 'c2',
      name: 'Ravi Dup',
      phone: '9876500002',
    };
    listMock.mockResolvedValue([sample, other]);
    previewMergeMock.mockResolvedValue({
      mode: 'PREVIEW',
      survivor: sample,
      duplicate: other,
      fields: [
        {
          field: 'phone',
          status: 'CONFLICT',
          survivorValue: sample.phone,
          duplicateValue: other.phone,
        },
      ],
      conflicts: ['phone'],
      linkedRecords: { notificationEvents: 0 },
    });
    executeMergeMock.mockResolvedValue(sample);

    renderPage();
    await screen.findByRole('button', { name: 'Ravi Kumar' });
    await user.click(screen.getByRole('button', { name: 'Ravi Kumar' }));
    await user.click(screen.getByRole('button', { name: 'Merge duplicate' }));

    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).getByRole('heading', { name: 'Merge duplicate profile' }),
    ).toBeInTheDocument();
    await user.selectOptions(within(dialog).getByLabelText('Duplicate to deactivate'), 'c2');
    await waitFor(() => expect(previewMergeMock).toHaveBeenCalledWith('c1', 'c2'));
    await user.click(within(dialog).getByRole('button', { name: 'Confirm merge' }));
    await waitFor(() => {
      expect(executeMergeMock).toHaveBeenCalled();
    });
  });

  it('success: links a family member and shows empty collective history', async () => {
    const user = userEvent.setup();
    const child: Customer = {
      ...sample,
      id: 'c2',
      name: 'Child Kumar',
      phone: '9876500002',
      allergies: null,
      chronicConditions: null,
    };
    listMock.mockResolvedValue([sample, child]);
    createFamilyMock.mockResolvedValue({
      id: 'f1',
      label: null,
      members: [
        { id: 'c1', name: sample.name, phone: sample.phone },
        { id: 'c2', name: child.name, phone: child.phone },
      ],
      createdAt: '2026-09-04T00:00:00Z',
    });

    renderPage();
    await screen.findByRole('button', { name: 'Ravi Kumar' });
    await user.click(screen.getByRole('button', { name: 'Ravi Kumar' }));
    expect(await screen.findByText('No family linked yet.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Link member' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'Link family member' })).toBeInTheDocument();
    await user.selectOptions(within(dialog).getByLabelText('Dependent to link'), 'c2');
    await user.click(within(dialog).getByRole('button', { name: 'Link member' }));

    await waitFor(() => {
      expect(createFamilyMock).toHaveBeenCalledWith(['c1', 'c2']);
    });
    expect(
      await screen.findByText('Child Kumar', { selector: 'p.font-medium' }),
    ).toBeInTheDocument();
    expect(
      within(screen.getByLabelText('Family history')).getByText(
        'No purchase or prescription history for this family yet.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Member')).toBeInTheDocument();
  });

  it('empty: purchase history and doctors when none posted', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([sample]);
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Ravi Kumar' }));
    expect(
      await screen.findByText('No purchase or prescription history on this profile yet.'),
    ).toBeInTheDocument();
    expect(screen.getByText('No doctor references on this counter yet.')).toBeInTheDocument();
  });

  it('success: shows purchase history facts and top referring doctors', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([sample]);
    getHistoryMock.mockResolvedValue([
      {
        id: 'h1',
        customerId: 'c1',
        type: 'PRESCRIPTION',
        summary: 'Rx REF-88',
        prescriptionReference: 'REF-88',
        doctorId: 'd1',
        doctorName: 'Dr. Mehta',
        invoiceId: 'inv1',
        amountPaise: null,
        occurredAt: '2026-09-04T04:00:00Z',
      },
      {
        id: 'h2',
        customerId: 'c1',
        type: 'PURCHASE',
        summary: 'Sale INV-1',
        prescriptionReference: null,
        doctorId: null,
        doctorName: null,
        invoiceId: 'inv1',
        amountPaise: 12500,
        occurredAt: '2026-09-04T04:00:00Z',
      },
    ]);
    listDoctorsMock.mockResolvedValue([
      {
        id: 'd1',
        tenantId: 't1',
        name: 'Dr. Mehta',
        registrationNumber: 'KA-1',
        phone: null,
        notes: null,
        createdAt: '2026-09-04T00:00:00Z',
        updatedAt: '2026-09-04T00:00:00Z',
      },
    ]);
    listTopMock.mockResolvedValue([
      { id: 'd1', name: 'Dr. Mehta', registrationNumber: 'KA-1', referralCount: 3 },
    ]);

    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Ravi Kumar' }));
    expect(await screen.findByText('Rx REF-88')).toBeInTheDocument();
    expect(screen.getByText('Sale INV-1')).toBeInTheDocument();
    expect(screen.getByText(/₹125/)).toBeInTheDocument();
    expect(
      within(screen.getByLabelText('Top referring doctors')).getByText('Dr. Mehta'),
    ).toBeInTheDocument();
    expect(screen.getByText('3 referrals')).toBeInTheDocument();
  });

  it('validation: doctor dialog requires name', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([sample]);
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Ravi Kumar' }));
    await user.click(await screen.findByRole('button', { name: 'Add doctor' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Save doctor' }));
    expect(
      within(dialog).getByText('Name is required for a doctor reference.'),
    ).toBeInTheDocument();
    expect(createDoctorMock).not.toHaveBeenCalled();
  });

  it('conflict: duplicate doctor registration', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([sample]);
    createDoctorMock.mockRejectedValue(new ApiError('taken', 409, 'REGISTRATION_TAKEN'));
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Ravi Kumar' }));
    await user.click(await screen.findByRole('button', { name: 'Add doctor' }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText('Name'), 'Dr. Dup');
    await user.type(within(dialog).getByLabelText('Registration'), 'DUP-1');
    await user.click(within(dialog).getByRole('button', { name: 'Save doctor' }));
    expect(
      await within(dialog).findByText('That registration number is already on file.'),
    ).toBeInTheDocument();
  });

  it('success: adds a doctor reference', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([sample]);
    createDoctorMock.mockResolvedValue({
      id: 'd2',
      tenantId: 't1',
      name: 'Dr. Rao',
      registrationNumber: 'KA-9',
      phone: null,
      notes: null,
      createdAt: '2026-09-04T00:00:00Z',
      updatedAt: '2026-09-04T00:00:00Z',
    });
    listDoctorsMock.mockResolvedValueOnce([]).mockResolvedValueOnce([
      {
        id: 'd2',
        tenantId: 't1',
        name: 'Dr. Rao',
        registrationNumber: 'KA-9',
        phone: null,
        notes: null,
        createdAt: '2026-09-04T00:00:00Z',
        updatedAt: '2026-09-04T00:00:00Z',
      },
    ]);

    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Ravi Kumar' }));
    await user.click(await screen.findByRole('button', { name: 'Add doctor' }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText('Name'), 'Dr. Rao');
    await user.type(within(dialog).getByLabelText('Registration'), 'KA-9');
    await user.click(within(dialog).getByRole('button', { name: 'Save doctor' }));
    await waitFor(() => {
      expect(createDoctorMock).toHaveBeenCalledWith({
        name: 'Dr. Rao',
        registrationNumber: 'KA-9',
        phone: undefined,
        notes: undefined,
      });
    });
    expect(await screen.findByText('Dr. Rao')).toBeInTheDocument();
  });

  it('failure: purchase history load error surfaces failure banner', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([sample]);
    getHistoryMock.mockRejectedValue(new Error('network'));
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Ravi Kumar' }));
    expect(
      await screen.findByText('Could not reach the server for customers. Try again.'),
    ).toBeInTheDocument();
  });

  it('success: owner sets khata limit and sees available credit', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([sample]);
    updateMock.mockResolvedValue(sample);
    getCreditMock.mockResolvedValue({
      customerId: 'c1',
      limitPaise: 0,
      balancePaise: 0,
      availablePaise: 0,
      version: 0,
      entries: [],
    });
    setLimitMock.mockResolvedValue({
      customerId: 'c1',
      limitPaise: 50000,
      balancePaise: 0,
      availablePaise: 50000,
      version: 1,
      entries: [
        {
          id: 'e1',
          type: 'LIMIT_SET',
          amountPaise: 50000,
          balanceAfterPaise: 0,
          invoiceId: null,
          settlementMode: null,
          settlementReference: null,
          occurredAt: '2026-09-04T05:00:00Z',
        },
      ],
    });
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Ravi Kumar' }));
    const khata = await screen.findByLabelText('Khata credit');
    await user.type(screen.getByLabelText('Set limit (₹)'), '500');
    await user.click(screen.getByRole('button', { name: 'Save limit' }));
    await waitFor(() => {
      expect(setLimitMock).toHaveBeenCalledWith('c1', 50000, 0);
    });
    expect(within(khata).getByText('Available')).toBeInTheDocument();
    expect(within(khata).getAllByText('₹500').length).toBeGreaterThanOrEqual(1);
  });

  it('empty: due refills strip when none due', async () => {
    listMock.mockResolvedValue([sample]);
    listDueMock.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByLabelText('Due refills')).toHaveTextContent(
      'No refill due on the floor today.',
    );
  });

  it('success: add refill schedule on customer profile', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([sample]);
    createRefillMock.mockResolvedValue({
      id: 'r1',
      customerId: 'c1',
      medicineName: 'Metformin 500',
      intervalDays: 30,
      nextDueOn: '2026-10-04',
      version: 0,
      updatedAt: '2026-09-04T06:00:00Z',
    });
    listRefillsMock.mockResolvedValueOnce([]).mockResolvedValueOnce([
      {
        id: 'r1',
        customerId: 'c1',
        medicineName: 'Metformin 500',
        intervalDays: 30,
        nextDueOn: '2026-10-04',
        version: 0,
        updatedAt: '2026-09-04T06:00:00Z',
      },
    ]);
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Ravi Kumar' }));
    const section = await screen.findByLabelText('Refill schedules');
    expect(
      within(section).getByText('No refill schedules for this customer yet.'),
    ).toBeInTheDocument();
    await user.type(screen.getByLabelText('Medicine'), 'Metformin 500');
    await user.click(screen.getByRole('button', { name: 'Add refill' }));
    await waitFor(() => {
      expect(createRefillMock).toHaveBeenCalledWith('c1', {
        medicineName: 'Metformin 500',
        intervalDays: undefined,
        nextDueOn: undefined,
      });
    });
    expect(await within(section).findByText('Metformin 500')).toBeInTheDocument();
  });

  it('conflict: duplicate refill medicine surfaces conflict', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([sample]);
    createRefillMock.mockRejectedValue(
      new ApiError('A refill schedule already exists for this medicine', 409, 'DUPLICATE_REFILL'),
    );
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Ravi Kumar' }));
    await screen.findByLabelText('Refill schedules');
    await user.type(screen.getByLabelText('Medicine'), 'Aspirin');
    await user.click(screen.getByRole('button', { name: 'Add refill' }));
    expect(
      await screen.findByText(
        'That change conflicts with existing floor data — duplicate phone, refill, or tag. Refresh and try again.',
      ),
    ).toBeInTheDocument();
  });

  it('success: create and assign tenant tag', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([sample]);
    createTagMock.mockResolvedValue({
      id: 'tag1',
      name: 'diabetic',
      createdAt: '2026-09-04T06:00:00Z',
    });
    replaceTagsMock.mockResolvedValue([
      { id: 'tag1', name: 'diabetic', createdAt: '2026-09-04T06:00:00Z' },
    ]);
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Ravi Kumar' }));
    const tags = await screen.findByLabelText('Customer tags');
    await user.type(screen.getByLabelText('New tag'), 'diabetic');
    await user.click(screen.getByRole('button', { name: 'Add tag' }));
    await waitFor(() => {
      expect(createTagMock).toHaveBeenCalledWith('diabetic');
    });
    const toggle = await within(tags).findByRole('button', { name: 'diabetic' });
    await user.click(toggle);
    await waitFor(() => {
      expect(replaceTagsMock).toHaveBeenCalledWith('c1', ['tag1']);
    });
  });

  it('validation: blank medicine does not call create refill', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([sample]);
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Ravi Kumar' }));
    await screen.findByLabelText('Refill schedules');
    expect(screen.getByRole('button', { name: 'Add refill' })).toBeDisabled();
    expect(createRefillMock).not.toHaveBeenCalled();
  });

  it('success: customize refill interval and due date', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([sample]);
    listRefillsMock
      .mockResolvedValueOnce([
        {
          id: 'r1',
          customerId: 'c1',
          medicineName: 'Metformin 500',
          intervalDays: 30,
          nextDueOn: '2026-10-04',
          version: 0,
          updatedAt: '2026-09-04T06:00:00Z',
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'r1',
          customerId: 'c1',
          medicineName: 'Metformin 500',
          intervalDays: 14,
          nextDueOn: '2026-08-01',
          version: 1,
          updatedAt: '2026-09-04T07:00:00Z',
        },
      ]);
    updateRefillMock.mockResolvedValue({
      id: 'r1',
      customerId: 'c1',
      medicineName: 'Metformin 500',
      intervalDays: 14,
      nextDueOn: '2026-08-01',
      version: 1,
      updatedAt: '2026-09-04T07:00:00Z',
    });
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Ravi Kumar' }));
    const section = await screen.findByLabelText('Refill schedules');
    expect(within(section).getByText('Metformin 500')).toBeInTheDocument();
    await user.click(within(section).getByRole('button', { name: 'Customize' }));
    const days = within(section).getAllByLabelText('Days')[0];
    await user.clear(days);
    await user.type(days, '14');
    const due = within(section).getAllByLabelText('Next due')[0];
    await user.clear(due);
    await user.type(due, '2026-08-01');
    await user.click(within(section).getByRole('button', { name: 'Save' }));
    await waitFor(() => {
      expect(updateRefillMock).toHaveBeenCalledWith('c1', 'r1', {
        intervalDays: 14,
        nextDueOn: '2026-08-01',
        expectedVersion: 0,
      });
    });
  });

  it('loading: due refills strip while fetch pending', async () => {
    listMock.mockResolvedValue([sample]);
    listDueMock.mockReturnValue(new Promise(() => undefined));
    renderPage();
    expect(await screen.findByLabelText('Due refills')).toHaveTextContent('Checking due refills…');
  });

  it('loading: refill schedules while customer selected', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([sample]);
    listRefillsMock.mockReturnValue(new Promise(() => undefined));
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Ravi Kumar' }));
    expect(await screen.findByText('Loading refill schedules…')).toBeInTheDocument();
  });

  it('failure: refill list error surfaces failure banner', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([sample]);
    listRefillsMock.mockRejectedValue(new Error('network'));
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Ravi Kumar' }));
    expect(
      await screen.findByText('Could not reach the server for customers. Try again.'),
    ).toBeInTheDocument();
  });

  it('conflict: duplicate tag name surfaces conflict', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([sample]);
    createTagMock.mockRejectedValue(
      new ApiError('A tag with this name already exists', 409, 'DUPLICATE_TAG'),
    );
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Ravi Kumar' }));
    await screen.findByLabelText('Customer tags');
    await user.type(screen.getByLabelText('New tag'), 'senior');
    await user.click(screen.getByRole('button', { name: 'Add tag' }));
    expect(
      await screen.findByText(
        'That change conflicts with existing floor data — duplicate phone, refill, or tag. Refresh and try again.',
      ),
    ).toBeInTheDocument();
  });
});
