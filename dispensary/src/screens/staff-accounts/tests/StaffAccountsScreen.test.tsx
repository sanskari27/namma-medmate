import { configureStore } from '@reduxjs/toolkit';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import StaffAccountsScreen from '@/screens/staff-accounts/StaffAccountsScreen';
import { ApiError } from '@/services/axios';
import { authReducer } from '@/store';
import type { StaffAccount } from '@/services/staff';

vi.mock('@/services/staff', () => ({
  listStaff: vi.fn(),
  createStaff: vi.fn(),
  deactivateStaff: vi.fn(),
}));

vi.mock('@/services/roles', () => ({
  listRoles: vi.fn(),
  listUserRoles: vi.fn(),
  replaceUserRoles: vi.fn(),
}));

vi.mock('@/services/auth', async () => {
  const axios = await import('@/services/axios');
  return {
    adminResetPassword: vi.fn(),
    ApiError: axios.ApiError,
    isApiError: axios.isApiError,
  };
});

import { adminResetPassword } from '@/services/auth';
import { listRoles, listUserRoles, replaceUserRoles } from '@/services/roles';
import { createStaff, deactivateStaff, listStaff } from '@/services/staff';

const listMock = vi.mocked(listStaff);
const createMock = vi.mocked(createStaff);
const deactivateMock = vi.mocked(deactivateStaff);
const resetMock = vi.mocked(adminResetPassword);
const listRolesMock = vi.mocked(listRoles);
const listUserRolesMock = vi.mocked(listUserRoles);
const replaceRolesMock = vi.mocked(replaceUserRoles);

const owner: StaffAccount = {
  id: 'u1',
  email: 'owner@pharmacy.local',
  displayName: 'Varshmaan',
  phone: '9000000000',
  role: 'pharmacy_owner',
  status: 'ACTIVE',
  kind: null,
  licenseNumber: null,
  registrationId: null,
  createdBy: null,
  mustChangePassword: false,
  createdAt: '2026-09-01T00:00:00Z',
};

const clerk: StaffAccount = {
  id: 's1',
  email: 'clerk@pharmacy.local',
  displayName: 'Asha',
  phone: '9876543210',
  role: 'pharmacy_staff',
  status: 'PENDING',
  kind: 'STAFF',
  licenseNumber: null,
  registrationId: 'r1',
  createdBy: 'u1',
  mustChangePassword: true,
  createdAt: '2026-09-02T00:00:00Z',
};

function renderPage(role: string) {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        user: {
          userId: 'u1',
          displayName: 'Varshmaan',
          role,
          tenantId: 't1',
          pinSet: true,
        },
      },
    },
  });
  return render(
    <Provider store={store}>
      <StaffAccountsScreen />
    </Provider>,
  );
}

describe('staff accounts at this pharmacy', () => {
  beforeEach(() => {
    listMock.mockReset();
    createMock.mockReset();
    deactivateMock.mockReset();
    resetMock.mockReset();
    listRolesMock.mockReset();
    listUserRolesMock.mockReset();
    replaceRolesMock.mockReset();
  });

  it('loading: waits for staff accounts', () => {
    listMock.mockReturnValue(new Promise(() => undefined));
    renderPage('pharmacy_owner');
    expect(screen.getByText('Loading staff accounts')).toBeInTheDocument();
  });

  it('empty: owner sees no extra staff yet', async () => {
    listMock.mockResolvedValue([owner]);
    renderPage('pharmacy_owner');
    expect(await screen.findByRole('heading', { name: 'Staff accounts' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('No additional staff accounts yet');
    expect(
      screen.queryByRole('link', { name: /create account|sign up|register/i }),
    ).not.toBeInTheDocument();
  });

  it('denied: staff cannot add another account', async () => {
    listMock.mockResolvedValue([owner, clerk]);
    renderPage('pharmacy_staff');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Only the pharmacy owner can add or remove staff access.',
    );
    expect(screen.queryByRole('button', { name: 'Add staff' })).not.toBeInTheDocument();
  });

  it('validation: owner must fill name, phone, email and password', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([owner]);
    renderPage('pharmacy_owner');
    await screen.findByRole('heading', { name: 'Staff accounts' });
    await user.click(screen.getByRole('button', { name: 'Add staff' }));
    await user.click(screen.getByRole('button', { name: 'Save staff' }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Enter name, phone, email, and a password of at least eight characters.',
    );
    expect(createMock).not.toHaveBeenCalled();
  });

  it('conflict: plan limit is shown separately from a duplicate email', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([owner]);
    createMock.mockRejectedValue(new ApiError('limit', 422, 'PLAN_LIMIT'));
    renderPage('pharmacy_owner');
    await screen.findByRole('heading', { name: 'Staff accounts' });
    await user.click(screen.getByRole('button', { name: 'Add staff' }));
    await user.type(screen.getByLabelText('Name'), 'Asha');
    await user.type(screen.getByLabelText('Phone'), '9876543210');
    await user.type(screen.getByLabelText('Email'), 'clerk@pharmacy.local');
    await user.type(screen.getByLabelText('Temporary password'), 'till-pass-1');
    await user.click(screen.getByRole('button', { name: 'Save staff' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This pharmacy already has the maximum number of staff accounts on the current plan.',
    );
  });

  it('conflict: duplicate email is rejected', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([owner]);
    createMock.mockRejectedValue(new ApiError('taken', 409, 'EMAIL_TAKEN'));
    renderPage('pharmacy_owner');
    await screen.findByRole('heading', { name: 'Staff accounts' });
    await user.click(screen.getByRole('button', { name: 'Add staff' }));
    await user.type(screen.getByLabelText('Name'), 'Asha');
    await user.type(screen.getByLabelText('Phone'), '9876543210');
    await user.type(screen.getByLabelText('Email'), 'clerk@pharmacy.local');
    await user.type(screen.getByLabelText('Temporary password'), 'till-pass-1');
    await user.click(screen.getByRole('button', { name: 'Save staff' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'That email is already in use at this pharmacy.',
    );
  });

  it('failure: network errors stay on staff accounts', async () => {
    listMock.mockRejectedValue(new ApiError('down', 0, 'NETWORK'));
    renderPage('pharmacy_owner');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not load staff accounts. Try again.',
    );
  });

  it('success: new staff waits for approval', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValueOnce([owner]).mockResolvedValueOnce([owner, clerk]);
    createMock.mockResolvedValue(clerk);
    renderPage('pharmacy_owner');
    await screen.findByRole('heading', { name: 'Staff accounts' });
    await user.click(screen.getByRole('button', { name: 'Add staff' }));
    await user.type(screen.getByLabelText('Name'), 'Asha');
    await user.type(screen.getByLabelText('Phone'), '9876543210');
    await user.type(screen.getByLabelText('Email'), 'clerk@pharmacy.local');
    await user.type(screen.getByLabelText('Temporary password'), 'till-pass-1');
    await user.click(screen.getByRole('button', { name: 'Save staff' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Staff saved. They cannot sign in until their registration is approved.',
    );
    expect(createMock).toHaveBeenCalledWith({
      displayName: 'Asha',
      phone: '9876543210',
      email: 'clerk@pharmacy.local',
      password: 'till-pass-1',
      role: 'pharmacy_staff',
      kind: 'STAFF',
    });
    expect(await screen.findByText('Asha')).toBeInTheDocument();
  });

  it('success: owner can remove staff access', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValueOnce([owner, clerk]).mockResolvedValueOnce([owner]);
    deactivateMock.mockResolvedValue({ ...clerk, status: 'TERMINATED' });
    renderPage('pharmacy_owner');
    await screen.findByText('Asha');
    await user.click(screen.getByRole('button', { name: 'Actions for Asha' }));
    await user.click(screen.getByRole('menuitem', { name: 'Remove access' }));
    await user.click(screen.getByRole('button', { name: 'Remove access' }));
    expect(deactivateMock).toHaveBeenCalledWith('s1');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Access removed. Their record remains on file.',
    );
  });

  it('success: selected staff gets a temporary password without retyping email', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([owner, clerk]);
    resetMock.mockResolvedValue({
      userId: 's1',
      displayName: 'Asha',
      role: 'pharmacy_staff',
      tenantId: 't1',
      pinSet: false,
      mustChangePassword: true,
    });
    renderPage('pharmacy_owner');
    await screen.findByText('Asha');
    await user.click(screen.getByRole('button', { name: 'Actions for Asha' }));
    await user.click(screen.getByRole('menuitem', { name: 'Reset password' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('clerk@pharmacy.local')).toBeInTheDocument();
    expect(within(dialog).queryByLabelText('Staff email')).not.toBeInTheDocument();
    await user.type(within(dialog).getByLabelText('Temporary password'), 'temp-pass-9');
    await user.type(within(dialog).getByLabelText('Confirm password'), 'temp-pass-9');
    await user.click(within(dialog).getByRole('button', { name: 'Save password' }));
    expect(resetMock).toHaveBeenCalledWith('clerk@pharmacy.local', 'temp-pass-9');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Temporary password saved. They must change it at next sign-in.',
    );
  });

  it('validation: pharmacist licence is required before adding', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([owner]);
    renderPage('pharmacy_owner');
    await screen.findByRole('heading', { name: 'Staff accounts' });
    await user.click(screen.getByRole('button', { name: 'Add staff' }));
    await user.type(screen.getByLabelText('Name'), 'Ravi');
    await user.type(screen.getByLabelText('Phone'), '9876543211');
    await user.type(screen.getByLabelText('Email'), 'rx@pharmacy.local');
    await user.type(screen.getByLabelText('Temporary password'), 'till-pass-1');
    await user.selectOptions(screen.getByLabelText('Role'), 'PHARMACIST');
    await user.click(screen.getByRole('button', { name: 'Save staff' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Enter the pharmacist licence number.');
    expect(createMock).not.toHaveBeenCalled();
  });

  it('success: owner assigns pharmacist and cashier roles', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([owner, clerk]);
    listRolesMock.mockResolvedValue({
      roles: [
        {
          id: 'pharm',
          name: 'Pharmacist',
          code: 'pharmacist',
          kind: 'PREDEFINED',
          scope: 'TENANT',
          version: 1,
          modules: ['SALES'],
        },
        {
          id: 'cash',
          name: 'Cashier',
          code: 'cashier',
          kind: 'PREDEFINED',
          scope: 'TENANT',
          version: 1,
          modules: ['SALES'],
        },
      ],
      catalog: [],
    });
    listUserRolesMock.mockResolvedValue({ userId: 's1', roles: [] });
    replaceRolesMock.mockResolvedValue({
      userId: 's1',
      roles: [
        {
          id: 'pharm',
          name: 'Pharmacist',
          code: 'pharmacist',
          kind: 'PREDEFINED',
          scope: 'TENANT',
          version: 1,
          modules: ['SALES'],
        },
      ],
    });
    renderPage('pharmacy_owner');
    await screen.findByText('Asha');
    await user.click(screen.getByRole('button', { name: 'Actions for Asha' }));
    await user.click(screen.getByRole('menuitem', { name: 'Roles' }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByLabelText('Pharmacist'));
    await user.click(within(dialog).getByRole('button', { name: 'Save roles' }));
    expect(replaceRolesMock).toHaveBeenCalledWith('s1', ['pharm']);
    expect(await screen.findByRole('alert')).toHaveTextContent('Roles updated for Asha.');
  });
});
