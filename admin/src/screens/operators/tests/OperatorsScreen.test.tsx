import { configureStore } from '@reduxjs/toolkit';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import OperatorsScreen from '@/screens/operators/OperatorsScreen';
import { ApiError } from '@/services/axios';
import { authReducer } from '@/store';
import type { HqOperator } from '@/services/staff';

vi.mock('@/services/staff', () => ({
  listOperators: vi.fn(),
  createOperator: vi.fn(),
  deactivateOperator: vi.fn(),
}));

vi.mock('@/services/roles', () => ({
  listRoles: vi.fn(),
  listUserRoles: vi.fn(),
  replaceUserRoles: vi.fn(),
}));

import { createOperator, deactivateOperator, listOperators } from '@/services/staff';
import { listRoles, listUserRoles, replaceUserRoles } from '@/services/roles';

const listMock = vi.mocked(listOperators);
const createMock = vi.mocked(createOperator);
const deactivateMock = vi.mocked(deactivateOperator);
const listRolesMock = vi.mocked(listRoles);
const listUserRolesMock = vi.mocked(listUserRoles);
const replaceRolesMock = vi.mocked(replaceUserRoles);

const master: HqOperator = {
  id: 'm1',
  email: 'ops@hq.local',
  displayName: 'Sanskar',
  phone: '9000000000',
  role: 'admin_super',
  status: 'ACTIVE',
  kind: null,
  registrationId: null,
  createdBy: null,
  mustChangePassword: false,
};

const agent: HqOperator = {
  id: 'v1',
  email: 'agent@hq.local',
  displayName: 'Meera',
  phone: '9000000001',
  role: 'admin_verification',
  status: 'PENDING',
  kind: 'STAFF',
  registrationId: 'r1',
  createdBy: 'm1',
  mustChangePassword: true,
};

function renderPage(role: string) {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        user: {
          userId: 'm1',
          displayName: 'Sanskar',
          role,
          tenantId: null,
          pinSet: true,
        },
      },
    },
  });
  return render(
    <Provider store={store}>
      <OperatorsScreen />
    </Provider>,
  );
}

describe('HQ operators', () => {
  beforeEach(() => {
    listMock.mockReset();
    createMock.mockReset();
    deactivateMock.mockReset();
    listRolesMock.mockReset();
    listUserRolesMock.mockReset();
    replaceRolesMock.mockReset();
  });

  it('loading: waits for operators', () => {
    listMock.mockReturnValue(new Promise(() => undefined));
    renderPage('admin_super');
    expect(screen.getByText('Loading operators')).toBeInTheDocument();
  });

  it('empty: administrator sees no agents yet', async () => {
    listMock.mockResolvedValue([master]);
    renderPage('admin_super');
    expect(await screen.findByRole('heading', { name: 'Operators' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('No verification agents yet.');
  });

  it('denied: verification agents cannot add operators', async () => {
    listMock.mockResolvedValue([master, agent]);
    renderPage('admin_verification');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Only the HQ administrator can add verification agents.',
    );
    expect(
      screen.queryByRole('button', { name: 'Add verification agent' }),
    ).not.toBeInTheDocument();
  });

  it('validation: administrator must complete the form', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([master]);
    renderPage('admin_super');
    await screen.findByRole('heading', { name: 'Operators' });
    await user.click(screen.getByRole('button', { name: 'Add verification agent' }));
    await user.click(screen.getByRole('button', { name: 'Save agent' }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Enter name, phone, email, and a password of at least eight characters.',
    );
    expect(createMock).not.toHaveBeenCalled();
  });

  it('conflict: duplicate email is rejected', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([master]);
    createMock.mockRejectedValue(new ApiError('taken', 409, 'EMAIL_TAKEN'));
    renderPage('admin_super');
    await screen.findByRole('heading', { name: 'Operators' });
    await user.click(screen.getByRole('button', { name: 'Add verification agent' }));
    await user.type(screen.getByLabelText('Name'), 'Meera');
    await user.type(screen.getByLabelText('Phone'), '9000000001');
    await user.type(screen.getByLabelText('Email'), 'agent@hq.local');
    await user.type(screen.getByLabelText('Temporary password'), 'hq-secret-1');
    await user.click(screen.getByRole('button', { name: 'Save agent' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('That email is already in use.');
  });

  it('failure: list errors stay on the page', async () => {
    listMock.mockRejectedValue(new ApiError('down', 0, 'NETWORK'));
    renderPage('admin_super');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not load operators. Try again.',
    );
  });

  it('success: administrator adds a verification agent who still needs approval', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValueOnce([master]).mockResolvedValueOnce([master, agent]);
    createMock.mockResolvedValue(agent);
    renderPage('admin_super');
    await screen.findByRole('heading', { name: 'Operators' });
    await user.click(screen.getByRole('button', { name: 'Add verification agent' }));
    await user.type(screen.getByLabelText('Name'), 'Meera');
    await user.type(screen.getByLabelText('Phone'), '9000000001');
    await user.type(screen.getByLabelText('Email'), 'agent@hq.local');
    await user.type(screen.getByLabelText('Temporary password'), 'hq-secret-1');
    await user.click(screen.getByRole('button', { name: 'Save agent' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Verification agent saved. Approve them under Staff approvals before they can sign in.',
    );
    expect(await screen.findByText('Meera')).toBeInTheDocument();
  });

  it('success: administrator can remove operator access', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValueOnce([master, agent]).mockResolvedValueOnce([master]);
    deactivateMock.mockResolvedValue({ ...agent, status: 'TERMINATED' });
    renderPage('admin_super');
    await screen.findByText('Meera');
    await user.click(screen.getByRole('button', { name: 'Actions for Meera' }));
    await user.click(screen.getByRole('button', { name: 'Remove access' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Remove access' }));
    expect(deactivateMock).toHaveBeenCalledWith('v1');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Access removed. Historical records remain.',
    );
  });

  it('conflict: already removed access stays on the page', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([master, agent]);
    deactivateMock.mockRejectedValue(new ApiError('gone', 409, 'CONFLICT'));
    renderPage('admin_super');
    await screen.findByText('Meera');
    await user.click(screen.getByRole('button', { name: 'Actions for Meera' }));
    await user.click(screen.getByRole('button', { name: 'Remove access' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Remove access' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Access has already been removed.');
  });

  it('success: administrator assigns an HQ desk', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([master, agent]);
    listRolesMock.mockResolvedValue({
      roles: [
        {
          id: 'va',
          name: 'Verification Agent',
          code: 'verification_agent',
          kind: 'PREDEFINED',
          scope: 'PLATFORM',
          version: 1,
          modules: ['TENANT_KYC'],
        },
      ],
      catalog: [],
    });
    listUserRolesMock.mockResolvedValue({ userId: 'v1', roles: [] });
    replaceRolesMock.mockResolvedValue({
      userId: 'v1',
      roles: [
        {
          id: 'va',
          name: 'Verification Agent',
          code: 'verification_agent',
          kind: 'PREDEFINED',
          scope: 'PLATFORM',
          version: 1,
          modules: ['TENANT_KYC'],
        },
      ],
    });
    renderPage('admin_super');
    await screen.findByText('Meera');
    await user.click(screen.getByRole('button', { name: 'Actions for Meera' }));
    await user.click(screen.getByRole('button', { name: 'Desk assignment' }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByLabelText('Verification Agent'));
    await user.click(within(dialog).getByRole('button', { name: 'Save assignment' }));
    expect(replaceRolesMock).toHaveBeenCalledWith('v1', ['va']);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Desk assignment saved for Meera.',
    );
  });
});
