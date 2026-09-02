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
    listSavedLogins: vi.fn(),
    pinLogin: vi.fn(),
    forgetSavedLogin: vi.fn(),
    ApiError: axios.ApiError,
    isApiError: axios.isApiError,
  };
});

import { forgetSavedLogin, listSavedLogins, loginWithPassword, pinLogin } from '@/services/auth';

const loginMock = vi.mocked(loginWithPassword);
const listMock = vi.mocked(listSavedLogins);
const pinMock = vi.mocked(pinLogin);
const forgetMock = vi.mocked(forgetSavedLogin);

const sanskar = {
  userId: 'm1',
  displayName: 'Sanskar',
  role: 'admin_super',
  email: 'sanskarkumar85111@gmail.com',
};

const desk = {
  userId: 'm2',
  displayName: 'Desk ops',
  role: 'admin_super',
  email: 'desk@hq.local',
};

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
    listMock.mockReset();
    pinMock.mockReset();
    forgetMock.mockReset();
    listMock.mockResolvedValue([]);
  });

  it('loading: waits for saved HQ operators', () => {
    listMock.mockReturnValue(new Promise(() => undefined));
    renderLogin();
    expect(screen.getByText('Loading HQ operators')).toBeInTheDocument();
  });

  it('empty: shows HQ sign in without an operator alert', async () => {
    renderLogin();
    expect(await screen.findByRole('heading', { name: 'HQ sign in' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Forgot the HQ password?' })).toBeInTheDocument();
  });

  it('empty: saved operators appear as a console list', async () => {
    listMock.mockResolvedValue([sanskar, desk]);
    renderLogin();
    expect(await screen.findByRole('heading', { name: 'Operators on this console' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Authenticate Sanskar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Authenticate Desk ops' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add another HQ login' })).toBeInTheDocument();
  });

  it('success: PIN on a saved operator reaches tenant pulse', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([sanskar]);
    pinMock.mockResolvedValue({
      userId: 'm1',
      displayName: 'Sanskar',
      role: 'admin_super',
      tenantId: null,
      pinSet: true,
    });
    const { store } = renderLogin();
    await user.click(await screen.findByRole('button', { name: 'Authenticate Sanskar' }));
    expect(screen.getByRole('heading', { name: 'Authenticate Sanskar' })).toBeInTheDocument();
    await user.type(screen.getByLabelText('Operator PIN'), '123456');
    await user.click(screen.getByRole('button', { name: 'Authenticate with PIN' }));
    expect(await screen.findByText('Tenant pulse')).toBeInTheDocument();
    expect(store.getState().auth.user?.displayName).toBe('Sanskar');
  });

  it('validation: short PIN asks for six HQ digits', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([sanskar]);
    renderLogin();
    await user.click(await screen.findByRole('button', { name: 'Authenticate Sanskar' }));
    await user.type(screen.getByLabelText('Operator PIN'), '12');
    await user.click(screen.getByRole('button', { name: 'Authenticate with PIN' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Enter all six HQ PIN digits.');
    expect(pinMock).not.toHaveBeenCalled();
  });

  it('denied: wrong operator PIN stays on the cells', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([sanskar]);
    pinMock.mockRejectedValue(new ApiError('Incorrect PIN', 401, 'INVALID_PIN'));
    renderLogin();
    await user.click(await screen.findByRole('button', { name: 'Authenticate Sanskar' }));
    await user.type(screen.getByLabelText('Operator PIN'), '111111');
    await user.click(screen.getByRole('button', { name: 'Authenticate with PIN' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Operator PIN was not recognised.');
  });

  it('conflict: stale PIN login is explained', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([sanskar]);
    pinMock.mockRejectedValue(new ApiError('Conflict', 409, 'CONFLICT'));
    renderLogin();
    await user.click(await screen.findByRole('button', { name: 'Authenticate Sanskar' }));
    await user.type(screen.getByLabelText('Operator PIN'), '123456');
    await user.click(screen.getByRole('button', { name: 'Authenticate with PIN' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('This HQ session is stale. Sign in again.');
  });

  it('failure: PIN API outage stays on the console', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([sanskar]);
    pinMock.mockRejectedValue(new ApiError('The platform API did not respond', 0, 'NETWORK'));
    renderLogin();
    await user.click(await screen.findByRole('button', { name: 'Authenticate Sanskar' }));
    await user.type(screen.getByLabelText('Operator PIN'), '123456');
    await user.click(screen.getByRole('button', { name: 'Authenticate with PIN' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The platform API did not respond. Retry from this console.',
    );
  });

  it('success: remove drops that operator from this console', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([sanskar, desk]);
    forgetMock.mockResolvedValue(undefined);
    renderLogin();
    await user.click(await screen.findByRole('button', { name: 'Remove Sanskar from this console' }));
    expect(forgetMock).toHaveBeenCalledWith('m1');
    expect(await screen.findByRole('button', { name: 'Authenticate Desk ops' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Authenticate Sanskar' })).not.toBeInTheDocument();
  });

  it('empty: add another HQ login shows email and password', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([sanskar]);
    renderLogin();
    await user.click(await screen.findByRole('button', { name: 'Add another HQ login' }));
    expect(screen.getByRole('heading', { name: 'HQ sign in' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back to saved HQ logins' })).toBeInTheDocument();
  });

  it('failure: saved-list errors fall back to the password form', async () => {
    listMock.mockRejectedValue(new ApiError('The platform API did not respond', 0, 'NETWORK'));
    renderLogin();
    expect(await screen.findByRole('heading', { name: 'HQ sign in' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Saved HQ operators could not be loaded.');
  });

  it('validation: empty submit asks for HQ credentials', async () => {
    const user = userEvent.setup();
    renderLogin();
    await screen.findByRole('heading', { name: 'HQ sign in' });
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Enter HQ email and password.');
    expect(loginMock).not.toHaveBeenCalled();
  });

  it('loading: authenticating disables the HQ submit', async () => {
    const user = userEvent.setup();
    loginMock.mockReturnValue(new Promise(() => undefined));
    renderLogin();
    await screen.findByRole('heading', { name: 'HQ sign in' });
    await user.type(screen.getByLabelText('Email'), 'ops@hq.local');
    await user.type(screen.getByLabelText('Password'), 'secret-pass');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(screen.getByRole('button', { name: 'Authenticating' })).toBeDisabled();
  });

  it('denied: 401 is operator-facing and generic', async () => {
    const user = userEvent.setup();
    loginMock.mockRejectedValue(new ApiError('Invalid email or password', 401, 'INVALID_CREDENTIALS'));
    renderLogin();
    await screen.findByRole('heading', { name: 'HQ sign in' });
    await user.type(screen.getByLabelText('Email'), 'ops@hq.local');
    await user.type(screen.getByLabelText('Password'), 'wrong');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('HQ credentials were not recognised.');
  });

  it('locked: 403 blocks the operator account', async () => {
    const user = userEvent.setup();
    loginMock.mockRejectedValue(new ApiError('This account cannot sign in.', 403, 'ACCOUNT_CANNOT_SIGN_IN'));
    renderLogin();
    await screen.findByRole('heading', { name: 'HQ sign in' });
    await user.type(screen.getByLabelText('Email'), 'ops@hq.local');
    await user.type(screen.getByLabelText('Password'), 'secret-pass');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('This operator account cannot enter HQ.');
  });

  it('conflict: 409 asks for a fresh HQ session', async () => {
    const user = userEvent.setup();
    loginMock.mockRejectedValue(new ApiError('Conflict', 409, 'CONFLICT'));
    renderLogin();
    await screen.findByRole('heading', { name: 'HQ sign in' });
    await user.type(screen.getByLabelText('Email'), 'ops@hq.local');
    await user.type(screen.getByLabelText('Password'), 'secret-pass');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('This HQ session is stale. Sign in again.');
  });

  it('failure: API outage stays on the console', async () => {
    const user = userEvent.setup();
    loginMock.mockRejectedValue(new ApiError('The platform API did not respond', 0, 'NETWORK'));
    renderLogin();
    await screen.findByRole('heading', { name: 'HQ sign in' });
    await user.type(screen.getByLabelText('Email'), 'ops@hq.local');
    await user.type(screen.getByLabelText('Password'), 'secret-pass');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The platform API did not respond. Retry from this console.',
    );
  });

  it('success: MASTER reaches tenant pulse', async () => {
    const user = userEvent.setup();
    loginMock.mockResolvedValue({
      userId: 'm1',
      displayName: 'Ops',
      role: 'admin_super',
      tenantId: null,
      pinSet: false,
    });
    const { store } = renderLogin();
    await screen.findByRole('heading', { name: 'HQ sign in' });
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
      pinSet: false,
    });
    renderLogin();
    await screen.findByRole('heading', { name: 'HQ sign in' });
    await user.type(screen.getByLabelText('Email'), 'owner@pharmacy.local');
    await user.type(screen.getByLabelText('Password'), 'secret-pass');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('HQ credentials were not recognised.');
    expect(screen.queryByText('Tenant pulse')).not.toBeInTheDocument();
  });

  it('slider next changes the HQ operation', async () => {
    const user = userEvent.setup();
    renderLogin();
    expect(await screen.findByRole('heading', { name: 'Tenant KYC queue' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next operation' }));
    expect(await screen.findByRole('heading', { name: 'Plan and expiry overrides' })).toBeInTheDocument();
  });
});
