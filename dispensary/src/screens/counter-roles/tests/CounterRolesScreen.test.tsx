import { configureStore } from '@reduxjs/toolkit';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CounterRolesScreen from '@/screens/counter-roles/CounterRolesScreen';
import { ApiError } from '@/services/axios';
import { authReducer } from '@/store';
import type { RoleCatalog } from '@/services/roles';

vi.mock('@/services/roles', () => ({
  listRoles: vi.fn(),
  createRole: vi.fn(),
  patchRole: vi.fn(),
  deactivateRole: vi.fn(),
}));

import { createRole, listRoles } from '@/services/roles';

const listMock = vi.mocked(listRoles);
const createMock = vi.mocked(createRole);

const catalog: RoleCatalog = {
  roles: [
    {
      id: 'r1',
      name: 'Pharmacist',
      code: 'pharmacist',
      kind: 'PREDEFINED',
      scope: 'TENANT',
      version: 1,
      modules: ['SALES', 'INVENTORY', 'CRM'],
    },
  ],
  catalog: [
    { code: 'SALES', entitled: true, gated: false, reason: null },
    { code: 'INVENTORY', entitled: true, gated: false, reason: null },
    {
      code: 'LOYALTY',
      entitled: false,
      gated: true,
      reason: 'Not included in the current plan.',
    },
  ],
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
      <CounterRolesScreen />
    </Provider>,
  );
}

describe('Floor roles', () => {
  beforeEach(() => {
    listMock.mockReset();
    createMock.mockReset();
  });

  it('loading: waits for floor roles', () => {
    listMock.mockReturnValue(new Promise(() => undefined));
    renderPage('pharmacy_owner');
    expect(screen.getByRole('alert')).toHaveTextContent('Loading floor roles');
  });

  it('empty: no custom roles yet', async () => {
    listMock.mockResolvedValue(catalog);
    renderPage('pharmacy_owner');
    expect(await screen.findByText(/No custom roles yet/i)).toBeInTheDocument();
    expect(screen.getByText('Pharmacist')).toBeInTheDocument();
  });

  it('denied: staff cannot change floor roles', () => {
    renderPage('pharmacy_staff');
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Only the pharmacy owner can manage floor roles.',
    );
    expect(listMock).not.toHaveBeenCalled();
  });

  it('validation: name and a grantable module are required', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue(catalog);
    renderPage('pharmacy_owner');
    await user.click(await screen.findByRole('button', { name: 'Add role' }));
    await user.click(screen.getByRole('button', { name: 'Save role' }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Enter a role name and select at least one area this pharmacy already has.',
    );
    expect(createMock).not.toHaveBeenCalled();
  });

  it('conflict: duplicate role name', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue(catalog);
    createMock.mockRejectedValue(new ApiError('taken', 409, 'ROLE_NAME_TAKEN'));
    renderPage('pharmacy_owner');
    await user.click(await screen.findByRole('button', { name: 'Add role' }));
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText('Role name'), 'Evening till');
    await user.click(within(dialog).getByLabelText('Sales'));
    await user.click(within(dialog).getByRole('button', { name: 'Save role' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'A role with this name already exists at this pharmacy.',
    );
  });

  it('failure: cannot load floor roles', async () => {
    listMock.mockRejectedValue(new ApiError('down', 500, 'SERVER'));
    renderPage('pharmacy_owner');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not load floor roles. Try again.',
    );
  });

  it('success: saves a custom role from entitled modules', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue(catalog);
    createMock.mockResolvedValue({
      id: 'c1',
      name: 'Evening till',
      code: null,
      kind: 'CUSTOM',
      scope: 'TENANT',
      version: 1,
      modules: ['SALES'],
    });
    renderPage('pharmacy_owner');
    await user.click(await screen.findByRole('button', { name: 'Add role' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/Not on this pharmacy's plan/i)).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Loyalty')).toBeDisabled();
    await user.type(within(dialog).getByLabelText('Role name'), 'Evening till');
    await user.click(within(dialog).getByLabelText('Sales'));
    await user.click(within(dialog).getByRole('button', { name: 'Save role' }));
    expect(createMock).toHaveBeenCalledWith('Evening till', ['SALES']);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Role saved. Assign it to staff from Staff accounts.',
    );
  });
});
