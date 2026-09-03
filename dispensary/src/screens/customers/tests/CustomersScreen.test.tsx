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

import {
  createCustomer,
  executeCustomerMerge,
  listCustomers,
  previewCustomerMerge,
  updateCustomer,
} from '@/services/customers';
import {
  createCustomerFamily,
  getFamilyForCustomer,
  getFamilyHistory,
} from '@/services/customerFamilies';

const listMock = vi.mocked(listCustomers);
const createMock = vi.mocked(createCustomer);
const updateMock = vi.mocked(updateCustomer);
const previewMergeMock = vi.mocked(previewCustomerMerge);
const executeMergeMock = vi.mocked(executeCustomerMerge);
const getFamilyMock = vi.mocked(getFamilyForCustomer);
const getHistoryMock = vi.mocked(getFamilyHistory);
const createFamilyMock = vi.mocked(createCustomerFamily);

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
    getFamilyMock.mockReset();
    getHistoryMock.mockReset();
    createFamilyMock.mockReset();
    getFamilyMock.mockResolvedValue(null);
    getHistoryMock.mockResolvedValue([]);
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
});
