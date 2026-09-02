import { configureStore } from '@reduxjs/toolkit';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LoginScreen from '@/screens/login/LoginScreen';
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

const owner = {
  userId: 'u1',
  displayName: 'Varshmaan',
  role: 'pharmacy_owner',
  email: 'owner@pharmacy.local',
};

const clerk = {
  userId: 'u2',
  displayName: 'Counter staff',
  role: 'pharmacy_staff',
  email: 'counter.staff@varshmaan.local',
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
            <Route path="/login" element={<LoginScreen />} />
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
    listMock.mockReset();
    pinMock.mockReset();
    forgetMock.mockReset();
    listMock.mockResolvedValue([]);
  });

  it('loading: waits for saved till logins', () => {
    listMock.mockReturnValue(new Promise(() => undefined));
    renderLogin();
    expect(screen.getByText('Loading till logins')).toBeInTheDocument();
  });

  it('empty: shows the counter sign-in form without a status', async () => {
    renderLogin();
    expect(await screen.findByRole('heading', { name: 'Pharmacy sign in' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Forgot the owner password?' })).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /sign up|create account|register/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText('Staff passwords are reset by the owner from Staff accounts.'),
    ).toBeInTheDocument();
  });

  it('empty: saved people appear as till tiles', async () => {
    listMock.mockResolvedValue([owner, clerk]);
    renderLogin();
    expect(
      await screen.findByRole('heading', { name: 'Who is at this counter?' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in as Varshmaan' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in as Counter staff' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add another counter login' })).toBeInTheDocument();
  });

  it('success: PIN on a saved person reaches the counter', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([owner]);
    pinMock.mockResolvedValue({
      userId: 'u1',
      displayName: 'Varshmaan',
      role: 'pharmacy_owner',
      tenantId: 't1',
      pinSet: true,
    });
    const { store } = renderLogin();
    await user.click(await screen.findByRole('button', { name: 'Sign in as Varshmaan' }));
    expect(screen.getByRole('heading', { name: 'Sign in as Varshmaan' })).toBeInTheDocument();
    await user.type(screen.getByLabelText('Counter PIN'), '123456');
    await user.click(screen.getByRole('button', { name: 'Sign in to this counter' }));
    expect(await screen.findByText('Counter overview')).toBeInTheDocument();
    expect(store.getState().auth.user?.displayName).toBe('Varshmaan');
    expect(pinMock).toHaveBeenCalledWith('u1', '123456');
  });

  it('validation: short PIN on the till keypad asks for six digits', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([owner]);
    renderLogin();
    await user.click(await screen.findByRole('button', { name: 'Sign in as Varshmaan' }));
    await user.type(screen.getByLabelText('Counter PIN'), '12');
    await user.click(screen.getByRole('button', { name: 'Sign in to this counter' }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Enter all six digits before signing in at this counter.',
    );
    expect(pinMock).not.toHaveBeenCalled();
  });

  it('denied: wrong PIN stays on the keypad', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([owner]);
    pinMock.mockRejectedValue(new ApiError('Incorrect PIN', 401, 'INVALID_PIN'));
    renderLogin();
    await user.click(await screen.findByRole('button', { name: 'Sign in as Varshmaan' }));
    await user.type(screen.getByLabelText('Counter PIN'), '111111');
    await user.click(screen.getByRole('button', { name: 'Sign in to this counter' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'That PIN does not match this till login.',
    );
  });

  it('conflict: stale PIN login asks to pick again', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([owner]);
    pinMock.mockRejectedValue(new ApiError('Conflict', 409, 'CONFLICT'));
    renderLogin();
    await user.click(await screen.findByRole('button', { name: 'Sign in as Varshmaan' }));
    await user.type(screen.getByLabelText('Counter PIN'), '123456');
    await user.click(screen.getByRole('button', { name: 'Sign in to this counter' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This counter session is out of date. Sign in again.',
    );
  });

  it('failure: PIN network errors stay at the till', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([owner]);
    pinMock.mockRejectedValue(new ApiError('Could not reach the server', 0, 'NETWORK'));
    renderLogin();
    await user.click(await screen.findByRole('button', { name: 'Sign in as Varshmaan' }));
    await user.type(screen.getByLabelText('Counter PIN'), '123456');
    await user.click(screen.getByRole('button', { name: 'Sign in to this counter' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not reach the server. Stay at this till and retry.',
    );
  });

  it('success: forget removes that person from this till', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValueOnce([owner, clerk]).mockResolvedValueOnce([clerk]);
    forgetMock.mockResolvedValue(undefined);
    renderLogin();
    await user.click(await screen.findByRole('button', { name: 'Forget Varshmaan on this till' }));
    expect(forgetMock).toHaveBeenCalledWith('u1');
    expect(
      await screen.findByRole('button', { name: 'Sign in as Counter staff' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sign in as Varshmaan' })).not.toBeInTheDocument();
  });

  it('empty: add another counter login shows email and password', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([owner]);
    renderLogin();
    await user.click(await screen.findByRole('button', { name: 'Add another counter login' }));
    expect(screen.getByRole('heading', { name: 'Pharmacy sign in' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back to saved till logins' })).toBeInTheDocument();
  });

  it('failure: saved-list errors fall back to the password form', async () => {
    listMock.mockRejectedValue(new ApiError('Could not reach the server', 0, 'NETWORK'));
    renderLogin();
    expect(await screen.findByRole('heading', { name: 'Pharmacy sign in' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Could not load saved logins. Use email and password.',
    );
  });

  it('validation: empty submit asks for counter credentials', async () => {
    const user = userEvent.setup();
    renderLogin();
    await screen.findByRole('heading', { name: 'Pharmacy sign in' });
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Enter the email and password for this counter.',
    );
    expect(loginMock).not.toHaveBeenCalled();
  });

  it('loading: submit disables the button while the counter waits', async () => {
    const user = userEvent.setup();
    loginMock.mockReturnValue(new Promise(() => undefined));
    renderLogin();
    await screen.findByRole('heading', { name: 'Pharmacy sign in' });
    await user.type(screen.getByLabelText('Email'), 'owner@pharmacy.local');
    await user.type(screen.getByLabelText('Password'), 'secret-pass');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(screen.getByRole('button', { name: 'Signing in' })).toBeDisabled();
  });

  it('denied: 401 shows a generic counter mismatch', async () => {
    const user = userEvent.setup();
    loginMock.mockRejectedValue(
      new ApiError('Invalid email or password', 401, 'INVALID_CREDENTIALS'),
    );
    renderLogin();
    await screen.findByRole('heading', { name: 'Pharmacy sign in' });
    await user.type(screen.getByLabelText('Email'), 'owner@pharmacy.local');
    await user.type(screen.getByLabelText('Password'), 'wrong');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Email or password does not match this counter login',
    );
  });

  it('locked: 403 tells the chemist to ask the owner', async () => {
    const user = userEvent.setup();
    loginMock.mockRejectedValue(
      new ApiError('This account cannot sign in.', 403, 'ACCOUNT_CANNOT_SIGN_IN'),
    );
    renderLogin();
    await screen.findByRole('heading', { name: 'Pharmacy sign in' });
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
    await screen.findByRole('heading', { name: 'Pharmacy sign in' });
    await user.type(screen.getByLabelText('Email'), 'owner@pharmacy.local');
    await user.type(screen.getByLabelText('Password'), 'secret-pass');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This counter session is out of date',
    );
  });

  it('failure: network errors stay on the counter form', async () => {
    const user = userEvent.setup();
    loginMock.mockRejectedValue(new ApiError('Could not reach the server', 0, 'NETWORK'));
    renderLogin();
    await screen.findByRole('heading', { name: 'Pharmacy sign in' });
    await user.type(screen.getByLabelText('Email'), 'owner@pharmacy.local');
    await user.type(screen.getByLabelText('Password'), 'secret-pass');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not reach the server. Try again from this counter.',
    );
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
    await screen.findByRole('heading', { name: 'Pharmacy sign in' });
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
    await screen.findByRole('heading', { name: 'Pharmacy sign in' });
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
    expect(await screen.findByRole('heading', { name: 'Bill at the counter' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next feature' }));
    expect(
      await screen.findByRole('heading', { name: 'Stock before it expires' }),
    ).toBeInTheDocument();
  });
});
