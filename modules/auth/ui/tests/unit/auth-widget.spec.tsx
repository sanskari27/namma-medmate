import { Provider } from 'react-redux';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AuthWidget,
  ChemistLoginPage,
  ChemistPinUnlockPage,
  LockoutBanner,
  LoginPage,
  OtpChallengeForm,
  PinUnlockPage,
  createAuthStore,
} from '../../src/index.ts';
import { resetSession } from '../../src/store/slices/session-slice.ts';
import { authApi } from '../../src/store/api/auth-api.ts';
import { errorCopyKey, readAuthError, readMutationFailure } from '../../src/lib/auth-error.ts';

const sessionPayload = {
  session_id: 'sess-1',
  user_id: 'user-1',
  login_id: 'priya.cashier',
  role: 'Cashier',
  tenant_id: '8f1c0a7e-2b3d-4e5f-8a90-123456789abc',
  location_id: '1a2b3c4d-5e6f-7081-92a3-b4c5d6e7f809',
  password_enabled: true,
  otp_enabled: true,
  has_pin: true,
  permissions_owner_frozen: false,
};

const loginPayload = {
  session_token: 'nm_sess_abc',
  session_id: 'sess-1',
  user_id: 'user-1',
  tenant_id: sessionPayload.tenant_id,
  location_id: sessionPayload.location_id,
  role: 'Cashier',
  password_enabled: true,
  otp_enabled: true,
  device_token: 'nm_dev_abc',
};

function renderWidget(
  fetchImpl: typeof fetch,
  preloadedState?: {
    session?: {
      status: 'idle' | 'loading' | 'authenticated' | 'unauthenticated' | 'error';
      sub?: string;
      loginId?: string;
      message?: string;
    };
  },
  skipQuery = false,
) {
  const store = createAuthStore(
    { baseUrl: 'http://localhost:3001', getAccessToken: () => 'token', fetchImpl },
    preloadedState,
  );
  return {
    store,
    ...render(
      <Provider store={store}>
        <AuthWidget skipQuery={skipQuery} />
      </Provider>,
    ),
  };
}

describe('auth-ui chemist login', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('shows password and WhatsApp OTP actions when both methods are on', () => {
    render(<LoginPage passwordEnabled otpEnabled />);
    expect(screen.getByRole('button', { name: 'Password' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'WhatsApp OTP' })).toBeInTheDocument();
  });

  it('submits password login and OTP request from the form', async () => {
    const onPasswordSubmit = vi.fn();
    const onOtpRequest = vi.fn();
    render(
      <LoginPage
        passwordEnabled
        otpEnabled
        onPasswordSubmit={onPasswordSubmit}
        onOtpRequest={onOtpRequest}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Password' }));
    fireEvent.change(screen.getByLabelText('Login ID'), { target: { value: 'priya.cashier' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'CounterPass1' } });
    fireEvent.click(document.querySelector('[data-slot="checkbox"]')!);
    fireEvent.submit(screen.getByRole('button', { name: 'Sign in' }).closest('form')!);
    await waitFor(() => {
      expect(onPasswordSubmit).toHaveBeenCalledWith({
        loginId: 'priya.cashier',
        password: 'CounterPass1',
        rememberDevice: true,
      });
    });
    fireEvent.click(screen.getAllByRole('button', { name: 'WhatsApp OTP' })[0]!);
    fireEvent.change(screen.getByLabelText('Login ID'), { target: { value: 'otp.only' } });
    fireEvent.submit(
      screen
        .getAllByRole('button', { name: 'WhatsApp OTP' })
        .find((button) => button.closest('form'))!
        .closest('form')!,
    );
    await waitFor(() => {
      expect(onOtpRequest).toHaveBeenCalledWith('otp.only');
    });
  });

  it('shows lockout, undeliverable, OTP-only, and no-method states', () => {
    const { rerender } = render(
      <LoginPage errorCode="ACCOUNT_LOCKED" lockedUntil="2026-08-31T16:15:00.000Z" />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Too many attempts');
    rerender(<LoginPage errorCode="WHATSAPP_OTP_UNDELIVERABLE" />);
    expect(
      screen.getByText('Use your password if enabled, or ask the Owner to reset.'),
    ).toBeInTheDocument();
    rerender(<LoginPage passwordEnabled={false} otpEnabled />);
    expect(screen.queryByRole('button', { name: 'Password' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'WhatsApp OTP' })).toBeInTheDocument();
    rerender(<LoginPage passwordEnabled={false} otpEnabled={false} />);
    expect(screen.getByText('No login method is enabled')).toBeInTheDocument();
  });

  it('verifies OTP and PIN forms', async () => {
    const onVerify = vi.fn();
    const onResend = vi.fn();
    const onUnlock = vi.fn();
    const onUsePassword = vi.fn();
    render(
      <OtpChallengeForm
        otp="4821"
        onVerify={onVerify}
        onResend={onResend}
        onOtpChange={() => undefined}
      />,
    );
    fireEvent.submit(screen.getByRole('button', { name: 'Verify code' }).closest('form')!);
    await waitFor(() => expect(onVerify).toHaveBeenCalledWith('4821'));
    fireEvent.click(screen.getByRole('button', { name: 'Resend code' }));
    expect(onResend).toHaveBeenCalled();
    cleanup();
    render(
      <PinUnlockPage loginId="priya.cashier" onUnlock={onUnlock} onUsePassword={onUsePassword} />,
    );
    fireEvent.change(screen.getByLabelText('Unlock'), { target: { value: '1234' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Unlock' }).closest('form')!);
    await waitFor(() => expect(onUnlock).toHaveBeenCalledWith('1234'));
    fireEvent.click(screen.getByRole('button', { name: 'Use password or OTP instead' }));
    expect(onUsePassword).toHaveBeenCalled();
    expect(screen.getByText('priya.cashier')).toBeInTheDocument();
    render(<LockoutBanner lockedUntil="soon" />);
    expect(screen.getByText(/Try again after soon/)).toBeInTheDocument();
  });

  it('shows an authenticated chemist session and logs out', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: sessionPayload }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const persist = vi.fn();
    const clearSession = vi.fn();
    const navigate = vi.fn();
    const store = createAuthStore({
      baseUrl: 'http://localhost:3001',
      getAccessToken: () => 'token',
      fetchImpl,
      persistSession: persist,
      clearSession,
      navigate,
    });
    render(
      <Provider store={store}>
        <AuthWidget />
      </Provider>,
    );
    expect(await screen.findByText('Signed in as priya.cashier.')).toBeInTheDocument();
    fetchImpl.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, data: { revoked: true } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Log out' }));
    await waitFor(() => expect(clearSession).toHaveBeenCalled());
    expect(navigate).toHaveBeenCalledWith('/login');
  });

  it('shows unauthenticated copy for 401 responses', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ success: false, error: { code: 'UNAUTHENTICATED', message: 'nope' } }),
          { status: 401, headers: { 'content-type': 'application/json' } },
        ),
      );
    renderWidget(fetchImpl);
    expect(await screen.findByText('Sign in to continue.')).toBeInTheDocument();
  });

  it('shows a service failure message', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('nope', { status: 500 }));
    renderWidget(fetchImpl);
    expect(await screen.findByText('Unable to verify your session.')).toBeInTheDocument();
  });

  it('uses default copy when session messages are missing', () => {
    const fetchImpl = vi.fn().mockImplementation(() => new Promise(() => undefined));
    renderWidget(fetchImpl, { session: { status: 'unauthenticated' } }, true);
    expect(screen.getByText('Sign in to continue.')).toBeInTheDocument();
  });

  it('uses default error copy and a custom title', () => {
    const fetchImpl = vi.fn().mockImplementation(() => new Promise(() => undefined));
    const store = createAuthStore(
      { baseUrl: 'http://localhost:3001', fetchImpl },
      { session: { status: 'error' } },
    );
    render(
      <Provider store={store}>
        <AuthWidget title="Pharmacy session" skipQuery />
      </Provider>,
    );
    expect(screen.getByRole('heading', { name: 'Pharmacy session' })).toBeInTheDocument();
    expect(screen.getByText('Unable to verify your session.')).toBeInTheDocument();
  });

  it('renders loading copy from preloaded state and supports reset', async () => {
    const fetchImpl = vi.fn().mockImplementation(() => new Promise(() => undefined));
    const { store } = renderWidget(fetchImpl, { session: { status: 'loading' } }, true);
    expect(screen.getByText('Checking your session.')).toBeInTheDocument();
    store.dispatch(resetSession());
    await waitFor(() => {
      expect(store.getState().session.status).toBe('idle');
    });
    store.dispatch(authApi.util.resetApiState());
  });

  it('treats a rejected fetch as an error session', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('offline'));
    renderWidget(fetchImpl);
    expect(await screen.findByText('Unable to verify your session.')).toBeInTheDocument();
  });

  it('persists a password login through the connected page', async () => {
    const persistSession = vi.fn();
    const navigate = vi.fn();
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: loginPayload }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const store = createAuthStore({
      baseUrl: 'http://localhost:3001',
      fetchImpl,
      persistSession,
      navigate,
    });
    render(
      <Provider store={store}>
        <ChemistLoginPage />
      </Provider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Password' }));
    fireEvent.change(screen.getByLabelText('Login ID'), { target: { value: 'priya.cashier' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'CounterPass1' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Sign in' }).closest('form')!);
    await waitFor(() => expect(persistSession).toHaveBeenCalled());
    expect(persistSession.mock.calls[0]?.[0]).toMatchObject({
      session_token: 'nm_sess_abc',
      login_id: 'priya.cashier',
      location_id: sessionPayload.location_id,
    });
    expect(navigate).toHaveBeenCalledWith('/');
  });

  it('shows undeliverable copy from a failed OTP request', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: { code: 'WHATSAPP_OTP_UNDELIVERABLE', message: 'undeliverable' },
        }),
        { status: 503, headers: { 'content-type': 'application/json' } },
      ),
    );
    const store = createAuthStore({ baseUrl: 'http://localhost:3001', fetchImpl });
    render(
      <Provider store={store}>
        <ChemistLoginPage />
      </Provider>,
    );
    fireEvent.click(screen.getAllByRole('button', { name: 'WhatsApp OTP' })[0]!);
    fireEvent.change(screen.getByLabelText('Login ID'), { target: { value: 'priya.cashier' } });
    fireEvent.submit(
      screen
        .getAllByRole('button', { name: 'WhatsApp OTP' })
        .find((button) => button.closest('form'))!
        .closest('form')!,
    );
    expect(
      await screen.findByText('Use your password if enabled, or ask the Owner to reset.'),
    ).toBeInTheDocument();
  });

  it('falls back to login when the device token is missing', () => {
    const store = createAuthStore({ baseUrl: 'http://localhost:3001' });
    render(
      <Provider store={store}>
        <ChemistPinUnlockPage />
      </Provider>,
    );
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('unlocks a saved device with PIN', async () => {
    const persistSession = vi.fn();
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            ...loginPayload,
            purpose: 'saved_device_unlock',
            verified: true,
            verification_id: null,
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    const store = createAuthStore({
      baseUrl: 'http://localhost:3001',
      fetchImpl,
      persistSession,
      navigate: vi.fn(),
    });
    render(
      <Provider store={store}>
        <ChemistPinUnlockPage deviceToken="nm_dev_abc" loginId="priya.cashier" />
      </Provider>,
    );
    fireEvent.change(screen.getByLabelText('Unlock'), { target: { value: '1234' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Unlock' }).closest('form')!);
    await waitFor(() => expect(persistSession).toHaveBeenCalled());
  });

  it('maps API error envelopes', () => {
    expect(
      readAuthError(423, { error: { code: 'ACCOUNT_LOCKED', details: { locked_until: 'x' } } }),
    ).toEqual({
      status: 423,
      code: 'ACCOUNT_LOCKED',
      message: undefined,
      lockedUntil: 'x',
      resendAvailableAt: undefined,
    });
    expect(errorCopyKey('INVALID_OTP')).toBe('auth.otp.invalid');
    expect(errorCopyKey('UNKNOWN')).toBe('auth.session.error');
    for (const code of [
      'INVALID_CREDENTIALS',
      'METHOD_DISABLED',
      'USER_INACTIVE',
      'NO_LOGIN_METHOD',
      'OTP_EXPIRED',
      'OTP_CONSUMED',
      'RESEND_COOLDOWN',
      'INVALID_PIN_FORMAT',
      'PIN_NOT_SET',
      'INVALID_DEVICE',
      'DEVICE_EXPIRED',
      'ACCOUNT_LOCKED',
      'KIOSK_PIN_LOCKED',
      'RATE_LIMITED',
      'UNAUTHENTICATED',
    ]) {
      expect(errorCopyKey(code).startsWith('auth.')).toBe(true);
    }
    expect(
      readAuthError(429, {
        error: { code: 'RESEND_COOLDOWN', details: { resend_available_at: 't' } },
      }).resendAvailableAt,
    ).toBe('t');
    expect(readAuthError(400, { error: { code: 1, message: 2 } }).code).toBeUndefined();
    expect(readMutationFailure({ data: { ok: true } })).toBeUndefined();
    expect(readMutationFailure({ error: 'offline' })).toMatchObject({ status: 500 });
    expect(
      readMutationFailure({
        error: { status: 401, data: { error: { code: 'INVALID_CREDENTIALS' } } },
      })?.code,
    ).toBe('INVALID_CREDENTIALS');
    const onOtpVerify = vi.fn();
    render(
      <LoginPage
        challenge={{ challengeId: 'ch-1' }}
        onOtpVerify={onOtpVerify}
        onOtpResend={() => undefined}
      />,
    );
    expect(screen.getByText('Enter the code from WhatsApp')).toBeInTheDocument();
    cleanup();
    render(<LoginPage submitting onPasswordSubmit={vi.fn()} passwordEnabled otpEnabled={false} />);
    fireEvent.submit(screen.getByRole('button', { name: 'Sign in' }).closest('form')!);
    cleanup();
    render(<OtpChallengeForm otp="12" submitting onVerify={vi.fn()} />);
    fireEvent.submit(screen.getByRole('button', { name: 'Verify code' }).closest('form')!);
    cleanup();
    render(<PinUnlockPage submitting onUnlock={vi.fn()} />);
    fireEvent.submit(screen.getByRole('button', { name: 'Unlock' }).closest('form')!);
    cleanup();
    render(<LoginPage submitting passwordEnabled={false} otpEnabled onOtpRequest={vi.fn()} />);
    fireEvent.submit(screen.getByRole('button', { name: 'WhatsApp OTP' }).closest('form')!);
    cleanup();
    render(<PinUnlockPage errorCode="INVALID_DEVICE" />);
    expect(screen.getByText('Saved device is not valid')).toBeInTheDocument();
  });

  it('verifies a WhatsApp OTP and persists the chemist session', async () => {
    const persistSession = vi.fn();
    const navigate = vi.fn();
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              challenge_id: 'ch-1',
              expires_at: 't',
              resend_available_at: 't2',
              otp_length: 4,
            },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, data: loginPayload }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );
    const store = createAuthStore({
      baseUrl: 'http://localhost:3001',
      fetchImpl,
      persistSession,
      navigate,
    });
    render(
      <Provider store={store}>
        <ChemistLoginPage />
      </Provider>,
    );
    fireEvent.click(screen.getAllByRole('button', { name: 'WhatsApp OTP' })[0]!);
    fireEvent.change(screen.getByLabelText('Login ID'), { target: { value: 'priya.cashier' } });
    fireEvent.submit(
      screen
        .getAllByRole('button', { name: 'WhatsApp OTP' })
        .find((button) => button.closest('form'))!
        .closest('form')!,
    );
    expect(await screen.findByText('Enter the code from WhatsApp')).toBeInTheDocument();
    fireEvent.change(document.querySelector('input[data-input-otp="true"]')!, {
      target: { value: '4821' },
    });
    fireEvent.submit(screen.getByRole('button', { name: 'Verify code' }).closest('form')!);
    await waitFor(() => expect(persistSession).toHaveBeenCalled());
    expect(navigate).toHaveBeenCalledWith('/');
  });

  it('shows OTP verify and resend errors from the connected page', async () => {
    const originalSetTimeout = globalThis.setTimeout;
    vi.spyOn(globalThis, 'setTimeout').mockImplementation(((
      handler: TimerHandler,
      delay?: number,
      ...args: unknown[]
    ) => {
      if (delay === 30_000 && typeof handler === 'function') {
        return originalSetTimeout(handler as () => void, 0);
      }
      return originalSetTimeout(handler, delay, ...args);
    }) as typeof setTimeout);
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              challenge_id: 'ch-1',
              expires_at: 't',
              resend_available_at: 't2',
              otp_length: 4,
            },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: { code: 'RESEND_COOLDOWN', message: 'wait' } }), {
          status: 429,
          headers: { 'content-type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: { code: 'INVALID_OTP', message: 'bad' } }), {
          status: 401,
          headers: { 'content-type': 'application/json' },
        }),
      );
    const store = createAuthStore({ baseUrl: 'http://localhost:3001', fetchImpl });
    render(
      <Provider store={store}>
        <ChemistLoginPage />
      </Provider>,
    );
    fireEvent.click(screen.getAllByRole('button', { name: 'WhatsApp OTP' })[0]!);
    fireEvent.change(screen.getByLabelText('Login ID'), { target: { value: 'priya.cashier' } });
    fireEvent.submit(
      screen
        .getAllByRole('button', { name: 'WhatsApp OTP' })
        .find((button) => button.closest('form'))!
        .closest('form')!,
    );
    expect(await screen.findByText('Enter the code from WhatsApp')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Resend code' })).not.toBeDisabled(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Resend code' }));
    expect(await screen.findByText('OTP resend is not available yet')).toBeInTheDocument();
    fireEvent.change(document.querySelector('input[data-input-otp="true"]')!, {
      target: { value: '0000' },
    });
    fireEvent.submit(screen.getByRole('button', { name: 'Verify code' }).closest('form')!);
    expect(await screen.findByText('Invalid OTP')).toBeInTheDocument();
    vi.mocked(globalThis.setTimeout).mockRestore();
  });

  it('resends an OTP challenge and maps a password lockout', async () => {
    const originalSetTimeout = globalThis.setTimeout;
    vi.spyOn(globalThis, 'setTimeout').mockImplementation(((
      handler: TimerHandler,
      delay?: number,
      ...args: unknown[]
    ) => {
      if (delay === 30_000 && typeof handler === 'function') {
        return originalSetTimeout(handler as () => void, 0);
      }
      return originalSetTimeout(handler, delay, ...args);
    }) as typeof setTimeout);
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              challenge_id: 'ch-1',
              expires_at: 't',
              resend_available_at: 't2',
              otp_length: 4,
            },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              challenge_id: 'ch-2',
              expires_at: 't',
              resend_available_at: 't3',
              otp_length: 4,
            },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: {
              code: 'ACCOUNT_LOCKED',
              details: { locked_until: '2026-08-31T16:15:00.000Z' },
            },
          }),
          { status: 423, headers: { 'content-type': 'application/json' } },
        ),
      );
    const store = createAuthStore({ baseUrl: 'http://localhost:3001', fetchImpl });
    render(
      <Provider store={store}>
        <ChemistLoginPage />
      </Provider>,
    );
    fireEvent.click(screen.getAllByRole('button', { name: 'WhatsApp OTP' })[0]!);
    fireEvent.change(screen.getByLabelText('Login ID'), { target: { value: 'priya.cashier' } });
    fireEvent.submit(
      screen
        .getAllByRole('button', { name: 'WhatsApp OTP' })
        .find((button) => button.closest('form'))!
        .closest('form')!,
    );
    expect(await screen.findByText('Enter the code from WhatsApp')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Resend code' })).not.toBeDisabled(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Resend code' }));
    await waitFor(() => expect(fetchImpl).toHaveBeenCalledTimes(2));
    cleanup();
    vi.mocked(globalThis.setTimeout).mockRestore();
    const passwordStore = createAuthStore({ baseUrl: 'http://localhost:3001', fetchImpl });
    render(
      <Provider store={passwordStore}>
        <ChemistLoginPage />
      </Provider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Password' }));
    fireEvent.change(screen.getByLabelText('Login ID'), { target: { value: 'priya.cashier' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Sign in' }).closest('form')!);
    expect(await screen.findByText(/Too many attempts/)).toBeInTheDocument();
    cleanup();
    const unavailableFetch = vi.fn().mockResolvedValue(new Response('nope', { status: 500 }));
    const unavailableStore = createAuthStore({
      baseUrl: 'http://localhost:3001',
      fetchImpl: unavailableFetch,
    });
    render(
      <Provider store={unavailableStore}>
        <ChemistLoginPage />
      </Provider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Password' }));
    fireEvent.change(screen.getByLabelText('Login ID'), { target: { value: 'priya.cashier' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Sign in' }).closest('form')!);
    expect(await screen.findByText('Unable to verify your session.')).toBeInTheDocument();
  });

  it('falls back to the subject when login id is missing and logs out to PIN', async () => {
    const navigate = vi.fn();
    const onLogout = vi.fn();
    renderWidget(
      vi.fn().mockImplementation(() => new Promise(() => undefined)),
      { session: { status: 'authenticated', sub: 'user-1' } },
      true,
    );
    expect(screen.getByText('Signed in as user-1.')).toBeInTheDocument();
    cleanup();
    renderWidget(
      vi.fn().mockImplementation(() => new Promise(() => undefined)),
      { session: { status: 'authenticated' } },
      true,
    );
    expect(screen.getByText('Signed in as .')).toBeInTheDocument();
    cleanup();
    const logoutFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { revoked: true } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const authedStore = createAuthStore(
      {
        baseUrl: 'http://localhost:3001',
        fetchImpl: logoutFetch,
        getDeviceToken: () => 'nm_dev_x',
        clearSession: vi.fn(),
        navigate,
      },
      { session: { status: 'authenticated', loginId: 'priya.cashier', sub: 'user-1' } },
    );
    render(
      <Provider store={authedStore}>
        <AuthWidget skipQuery onLogout={onLogout} />
      </Provider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Log out' }));
    await waitFor(() => expect(onLogout).toHaveBeenCalled());
    expect(navigate).toHaveBeenCalledWith('/login/pin');
  });

  it('maps PIN unlock errors and sparse session fields', async () => {
    const persistSession = vi.fn();
    const navigate = vi.fn();
    const pinErrorFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: { code: 'INVALID_DEVICE', message: 'nope' } }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const pinStore = createAuthStore({
      baseUrl: 'http://localhost:3001',
      fetchImpl: pinErrorFetch,
    });
    const onUsePassword = vi.fn();
    render(
      <Provider store={pinStore}>
        <ChemistPinUnlockPage
          deviceToken="nm_dev_abc"
          loginId="priya.cashier"
          onUsePassword={onUsePassword}
        />
      </Provider>,
    );
    fireEvent.change(screen.getByLabelText('Unlock'), { target: { value: '0000' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Unlock' }).closest('form')!);
    expect(await screen.findByText('Saved device is not valid')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Use password or OTP instead' }));
    expect(onUsePassword).toHaveBeenCalled();
    cleanup();

    const sparsePin = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            verified: true,
            verification_id: null,
            purpose: 'saved_device_unlock',
            session_token: 'nm_sess_z',
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    const sparseStore = createAuthStore({
      baseUrl: 'http://localhost:3001',
      fetchImpl: sparsePin,
      persistSession,
      navigate,
    });
    render(
      <Provider store={sparseStore}>
        <ChemistPinUnlockPage deviceToken="nm_dev_abc" loginId="priya.cashier" />
      </Provider>,
    );
    fireEvent.change(screen.getByLabelText('Unlock'), { target: { value: '1234' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Unlock' }).closest('form')!);
    await waitFor(() => expect(persistSession).toHaveBeenCalled());
    expect(persistSession.mock.calls[0]?.[0]).toMatchObject({
      session_token: 'nm_sess_z',
      role: 'Cashier',
      device_token: null,
    });
    cleanup();

    const missingToken = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            verified: true,
            verification_id: null,
            purpose: 'saved_device_unlock',
            session_token: null,
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    const missingStore = createAuthStore({
      baseUrl: 'http://localhost:3001',
      fetchImpl: missingToken,
    });
    render(
      <Provider store={missingStore}>
        <ChemistPinUnlockPage deviceToken="nm_dev_abc" loginId="priya.cashier" />
      </Provider>,
    );
    fireEvent.change(screen.getByLabelText('Unlock'), { target: { value: '1234' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Unlock' }).closest('form')!);
    expect(await screen.findByText('Unable to verify your session.')).toBeInTheDocument();
  });

  it('skips the extra error banner when the account is locked', () => {
    render(<LoginPage errorCode="ACCOUNT_LOCKED" />);
    expect(screen.queryByText('Unable to verify your session.')).not.toBeInTheDocument();
    cleanup();
    render(<PinUnlockPage errorCode="ACCOUNT_LOCKED" lockedUntil="2026-08-31T16:15:00.000Z" />);
    expect(screen.getByText(/Try again after 2026-08-31T16:15:00.000Z/)).toBeInTheDocument();
    cleanup();
    render(<LoginPage passwordEnabled otpEnabled={false} />);
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Password' })).not.toBeInTheDocument();
  });
});
