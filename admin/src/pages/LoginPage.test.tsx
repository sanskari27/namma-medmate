import { configureStore } from '@reduxjs/toolkit';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LoginPage from '@/pages/LoginPage';
import { ApiError } from '@/services/axios';
import { authReducer } from '@/store';

vi.mock('@/services/auth', async () => {
  const axios = await import('@/services/axios');
  return {
    loginWithPassword: vi.fn(),
    ApiError: axios.ApiError,
    isApiError: axios.isApiError,
  };
});

import { loginWithPassword } from '@/services/auth';

const loginMock = vi.mocked(loginWithPassword);

function renderLogin() {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: { auth: { user: null } },
  });
  return {
    store,
    ...render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/login']}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<div>Tenant pulse</div>} />
          </Routes>
        </MemoryRouter>
      </Provider>,
    ),
  };
}

describe('admin HQ login', () => {
  beforeEach(() => {
    loginMock.mockReset();
  });

  it('empty: shows HQ sign in without an operator alert', () => {
    renderLogin();
    expect(screen.getByRole('heading', { name: 'HQ sign in' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('validation: empty submit asks for HQ credentials', async () => {
    const user = userEvent.setup();
    renderLogin();
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Enter HQ email and password.');
    expect(loginMock).not.toHaveBeenCalled();
  });

  it('loading: authenticating disables the HQ submit', async () => {
    const user = userEvent.setup();
    loginMock.mockReturnValue(new Promise(() => undefined));
    renderLogin();
    await user.type(screen.getByLabelText('Email'), 'ops@hq.local');
    await user.type(screen.getByLabelText('Password'), 'secret-pass');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(screen.getByRole('button', { name: 'Authenticating' })).toBeDisabled();
  });

  it('denied: 401 is operator-facing and generic', async () => {
    const user = userEvent.setup();
    loginMock.mockRejectedValue(new ApiError('Invalid email or password', 401, 'INVALID_CREDENTIALS'));
    renderLogin();
    await user.type(screen.getByLabelText('Email'), 'ops@hq.local');
    await user.type(screen.getByLabelText('Password'), 'wrong');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('HQ credentials were not recognised.');
  });

  it('locked: 403 blocks the operator account', async () => {
    const user = userEvent.setup();
    loginMock.mockRejectedValue(new ApiError('This account cannot sign in.', 403, 'ACCOUNT_CANNOT_SIGN_IN'));
    renderLogin();
    await user.type(screen.getByLabelText('Email'), 'ops@hq.local');
    await user.type(screen.getByLabelText('Password'), 'secret-pass');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('This operator account cannot enter HQ.');
  });

  it('conflict: 409 asks for a fresh HQ session', async () => {
    const user = userEvent.setup();
    loginMock.mockRejectedValue(new ApiError('Conflict', 409, 'CONFLICT'));
    renderLogin();
    await user.type(screen.getByLabelText('Email'), 'ops@hq.local');
    await user.type(screen.getByLabelText('Password'), 'secret-pass');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('This HQ session is stale. Sign in again.');
  });

  it('failure: API outage stays on the console', async () => {
    const user = userEvent.setup();
    loginMock.mockRejectedValue(new ApiError('The platform API did not respond', 0, 'NETWORK'));
    renderLogin();
    await user.type(screen.getByLabelText('Email'), 'ops@hq.local');
    await user.type(screen.getByLabelText('Password'), 'secret-pass');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('The platform API did not respond. Retry from this console.');
  });

  it('success: MASTER reaches tenant pulse', async () => {
    const user = userEvent.setup();
    loginMock.mockResolvedValue({
      userId: 'm1',
      displayName: 'Ops',
      role: 'admin_super',
      tenantId: null,
    });
    const { store } = renderLogin();
    await user.type(screen.getByLabelText('Email'), 'ops@hq.local');
    await user.type(screen.getByLabelText('Password'), 'secret-pass');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Tenant pulse')).toBeInTheDocument();
    expect(store.getState().auth.user?.role).toBe('admin_super');
  });

  it('denied: pharmacy staff cannot enter HQ', async () => {
    const user = userEvent.setup();
    loginMock.mockResolvedValue({
      userId: 'u1',
      displayName: 'Owner',
      role: 'pharmacy_owner',
      tenantId: 't1',
    });
    renderLogin();
    await user.type(screen.getByLabelText('Email'), 'owner@pharmacy.local');
    await user.type(screen.getByLabelText('Password'), 'secret-pass');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('HQ credentials were not recognised.');
    expect(screen.queryByText('Tenant pulse')).not.toBeInTheDocument();
  });

  it('slider next changes the HQ operation', async () => {
    const user = userEvent.setup();
    renderLogin();
    expect(screen.getByRole('heading', { name: 'Tenant KYC queue' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next operation' }));
    expect(await screen.findByRole('heading', { name: 'Plan and expiry overrides' })).toBeInTheDocument();
  });
});
