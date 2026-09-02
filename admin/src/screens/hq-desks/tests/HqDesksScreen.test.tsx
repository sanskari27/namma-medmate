import { configureStore } from '@reduxjs/toolkit';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import HqDesksScreen from '@/screens/hq-desks/HqDesksScreen';
import { ApiError } from '@/services/axios';
import { authReducer } from '@/store';
import type { RoleCatalog } from '@/services/roles';

vi.mock('@/services/roles', () => ({
  listRoles: vi.fn(),
  createRole: vi.fn(),
}));

import { createRole, listRoles } from '@/services/roles';

const listMock = vi.mocked(listRoles);
const createMock = vi.mocked(createRole);

const catalog: RoleCatalog = {
  roles: [
    {
      id: 'd1',
      name: 'Verification Agent',
      code: 'verification_agent',
      kind: 'PREDEFINED',
      scope: 'PLATFORM',
      version: 1,
      modules: ['STAFF_VERIFICATION', 'TENANT_KYC'],
    },
  ],
  catalog: [
    { code: 'TENANT_KYC', entitled: true, gated: false, reason: null },
    { code: 'STAFF_VERIFICATION', entitled: true, gated: false, reason: null },
    { code: 'SUPPORT', entitled: true, gated: false, reason: null },
  ],
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
      <HqDesksScreen />
    </Provider>,
  );
}

describe('HQ desks', () => {
  beforeEach(() => {
    listMock.mockReset();
    createMock.mockReset();
  });

  it('loading: waits for HQ desks', () => {
    listMock.mockReturnValue(new Promise(() => undefined));
    renderPage('admin_super');
    expect(screen.getByRole('alert')).toHaveTextContent('Loading HQ desks');
  });

  it('empty: no custom desks on file', async () => {
    listMock.mockResolvedValue(catalog);
    renderPage('admin_super');
    expect(await screen.findByText(/No custom desks yet/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Verification Agent' })).toBeInTheDocument();
  });

  it('denied: verification agent cannot edit desks', () => {
    renderPage('admin_verification');
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Only the HQ administrator can manage operator desks.',
    );
    expect(listMock).not.toHaveBeenCalled();
  });

  it('validation: desk name and a platform module are required', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue(catalog);
    renderPage('admin_super');
    await user.click(await screen.findByRole('button', { name: 'New desk' }));
    await user.click(screen.getByRole('button', { name: 'Save desk' }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Enter a desk name and select at least one HQ area.',
    );
    expect(createMock).not.toHaveBeenCalled();
  });

  it('conflict: duplicate desk name', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue(catalog);
    createMock.mockRejectedValue(new ApiError('taken', 409, 'ROLE_NAME_TAKEN'));
    renderPage('admin_super');
    await user.click(await screen.findByRole('button', { name: 'New desk' }));
    await user.type(screen.getByLabelText('Desk name'), 'KYC night desk');
    await user.click(screen.getByLabelText('Tenant KYC'));
    await user.click(screen.getByRole('button', { name: 'Save desk' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'A desk with this name already exists.',
    );
  });

  it('failure: cannot load HQ desks', async () => {
    listMock.mockRejectedValue(new ApiError('down', 500, 'SERVER'));
    renderPage('admin_super');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not load HQ desks. Try again.',
    );
  });

  it('success: files a custom platform desk', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue(catalog);
    createMock.mockResolvedValue({
      id: 'c1',
      name: 'KYC night desk',
      code: null,
      kind: 'CUSTOM',
      scope: 'PLATFORM',
      version: 1,
      modules: ['TENANT_KYC'],
    });
    renderPage('admin_super');
    await user.click(await screen.findByRole('button', { name: 'New desk' }));
    expect(screen.queryByText(/till role|counter|pharmacy's plan/i)).not.toBeInTheDocument();
    await user.type(screen.getByLabelText('Desk name'), 'KYC night desk');
    await user.click(screen.getByLabelText('Tenant KYC'));
    await user.click(screen.getByRole('button', { name: 'Save desk' }));
    expect(createMock).toHaveBeenCalledWith('KYC night desk', ['TENANT_KYC']);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Desk saved. Assign it from Operators.',
    );
  });
});
