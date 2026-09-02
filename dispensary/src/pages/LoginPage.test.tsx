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
            <Route path="/" element={<div>Counter overview</div>} />
          </Routes>
        </MemoryRouter>
      </Provider>,
    ),
  };
}

describe('dispensary login', () => {
  beforeEach(() => {
    loginMock.mockReset();
  });

  it('empty: shows the counter sign-in form without a status', () => {
    renderLogin();
    expect(screen.getByRole('heading', { name: 'Pharmacy sign in' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Forgot the owner password?' })).toBeInTheDocument();
    expect(screen.getByText('Staff passwords are reset by the owner at the counter.')).toBeInTheDocument();
  });

  it('validation: empty submit asks for counter credentials', async () => {
    const user = userEvent.setup();
    renderLogin();
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Enter the email and password for this counter.');
    expect(loginMock).not.toHaveBeenCalled();
  });

  it('loading: submit disables the button while the counter waits', async () => {
    const user = userEvent.setup();
    loginMock.mockReturnValue(new Promise(() => undefined));
    renderLogin();
    await user.type(screen.getByLabelText('Email'), 'owner@pharmacy.local');
    await user.type(screen.getByLabelText('Password'), 'secret-pass');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(screen.getByRole('button', { name: 'Signing in' })).toBeDisabled();
  });

  it('denied: 401 shows a generic counter mismatch', async () => {
    const user = userEvent.setup();
    loginMock.mockRejectedValue(new ApiError('Invalid email or password', 401, 'INVALID_CREDENTIALS'));
    renderLogin();
    await user.type(screen.getByLabelText('Email'), 'owner@pharmacy.local');
    await user.type(screen.getByLabelText('Password'), 'wrong');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Email or password does not match this counter login',
    );
  });

  it('locked: 403 tells the chemist to ask the owner', async () => {
    const user = userEvent.setup();
    loginMock.mockRejectedValue(new ApiError('This account cannot sign in.', 403, 'ACCOUNT_CANNOT_SIGN_IN'));
    renderLogin();
    await user.type(screen.getByLabelText('Email'), 'owner@pharmacy.local');
    await user.type(screen.getByLabelText('Password'), 'secret-pass');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This staff account cannot enter the dispensary. Ask the owner.',
    );
  });

  it('conflict: 409 asks for a fresh counter sign-in', async () => {
    const user = userEvent.setup();
    loginMock.mockRejectedValue(new ApiError('Conflict', 409, 'CONFLICT'));
    renderLogin();
    await user.type(screen.getByLabelText('Email'), 'owner@pharmacy.local');
    await user.type(screen.getByLabelText('Password'), 'secret-pass');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('This counter session is out of date');
  });

  it('failure: network errors stay on the counter form', async () => {
    const user = userEvent.setup();
    loginMock.mockRejectedValue(new ApiError('Could not reach the server', 0, 'NETWORK'));
    renderLogin();
    await user.type(screen.getByLabelText('Email'), 'owner@pharmacy.local');
    await user.type(screen.getByLabelText('Password'), 'secret-pass');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not reach the server. Try again from this counter.');
  });

  it('success: pharmacy owner reaches the counter overview', async () => {
    const user = userEvent.setup();
    loginMock.mockResolvedValue({
      userId: 'u1',
      displayName: 'Owner',
      role: 'pharmacy_owner',
      tenantId: 't1',
      pinSet: false,
    });
    const { store } = renderLogin();
    await user.type(screen.getByLabelText('Email'), 'owner@pharmacy.local');
    await user.type(screen.getByLabelText('Password'), 'secret-pass');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Counter overview')).toBeInTheDocument();
    expect(store.getState().auth.user?.displayName).toBe('Owner');
  });

  it('denied: HQ operators cannot use this counter login', async () => {
    const user = userEvent.setup();
    loginMock.mockResolvedValue({
      userId: 'm1',
      displayName: 'Master',
      role: 'admin_super',
      tenantId: null,
      pinSet: false,
    });
    renderLogin();
    await user.type(screen.getByLabelText('Email'), 'ops@hq.local');
    await user.type(screen.getByLabelText('Password'), 'secret-pass');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Email or password does not match this counter login',
    );
    expect(screen.queryByText('Counter overview')).not.toBeInTheDocument();
  });

  it('slider next changes the feature copy', async () => {
    const user = userEvent.setup();
    renderLogin();
    expect(screen.getByRole('heading', { name: 'Bill at the counter' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next feature' }));
    expect(await screen.findByRole('heading', { name: 'Stock before it expires' })).toBeInTheDocument();
  });
});
