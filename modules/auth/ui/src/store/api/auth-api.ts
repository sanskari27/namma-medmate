import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import { createApiClient, queryEnvelope } from '@namma-medmate/api-client';

export interface PharmacySession {
  session_id: string;
  user_id: string;
  login_id: string;
  role: string;
  tenant_id: string;
  location_id: string;
  password_enabled: boolean;
  otp_enabled: boolean;
  has_pin: boolean;
  permissions_owner_frozen: boolean;
}

export interface LoginSession {
  session_token: string;
  session_id: string;
  user_id: string;
  tenant_id: string;
  location_id: string;
  role: string;
  password_enabled: boolean;
  otp_enabled: boolean;
  device_token: string | null;
}

export interface OtpChallenge {
  challenge_id: string;
  expires_at: string;
  resend_available_at: string;
  otp_length: 4;
}

export interface AuthSessionPersist extends LoginSession {
  login_id: string;
}

export interface AuthApiContext {
  baseUrl: string;
  getAccessToken?: () => string | undefined | Promise<string | undefined>;
  persistSession?: (session: AuthSessionPersist) => void;
  clearSession?: () => void;
  getDeviceToken?: () => string | undefined;
  getStoredLoginId?: () => string | undefined;
  fetchImpl?: typeof fetch;
  navigate?: (path: string) => void;
}

function persistLogin(extra: AuthApiContext, session: LoginSession, loginId: string): void {
  extra.persistSession?.({ ...session, login_id: loginId });
  extra.navigate?.('/');
}

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: fakeBaseQuery(),
  endpoints: (builder) => ({
    getSession: builder.query<PharmacySession, void>({
      async queryFn(_arg, api) {
        const extra = api.extra as AuthApiContext;
        return queryEnvelope(async () => {
          const client = createApiClient(extra);
          return client.GET('/auth/session', {
            params: { header: { authorization: 'Bearer session' } },
          });
        });
      },
    }),
    loginWithPassword: builder.mutation<
      LoginSession,
      { loginId: string; password: string; rememberDevice: boolean }
    >({
      async queryFn(arg, api) {
        const extra = api.extra as AuthApiContext;
        const result = await queryEnvelope(async () => {
          const client = createApiClient(extra);
          return client.POST('/auth/login/password', {
            body: {
              login_id: arg.loginId,
              password: arg.password,
              remember_device: arg.rememberDevice,
            },
          });
        });
        if ('data' in result) {
          persistLogin(extra, result.data, arg.loginId);
        }
        return result;
      },
    }),
    requestOtp: builder.mutation<OtpChallenge, { loginId: string }>({
      async queryFn(arg, api) {
        const extra = api.extra as AuthApiContext;
        return queryEnvelope(async () => {
          const client = createApiClient(extra);
          return client.POST('/auth/login/otp/request', {
            body: { login_id: arg.loginId },
          });
        });
      },
    }),
    verifyOtp: builder.mutation<
      LoginSession,
      { loginId: string; challengeId: string; otp: string; rememberDevice: boolean }
    >({
      async queryFn(arg, api) {
        const extra = api.extra as AuthApiContext;
        const result = await queryEnvelope(async () => {
          const client = createApiClient(extra);
          return client.POST('/auth/login/otp/verify', {
            body: {
              login_id: arg.loginId,
              challenge_id: arg.challengeId,
              otp: arg.otp,
              remember_device: arg.rememberDevice,
            },
          });
        });
        if ('data' in result) {
          persistLogin(extra, result.data, arg.loginId);
        }
        return result;
      },
    }),
    verifyPin: builder.mutation<
      LoginSession,
      { pin: string; deviceToken: string; loginId: string }
    >({
      async queryFn(arg, api) {
        const extra = api.extra as AuthApiContext;
        const result = await queryEnvelope(async () => {
          const client = createApiClient(extra);
          return client.POST('/auth/pin/verify', {
            body: {
              purpose: 'saved_device_unlock',
              pin: arg.pin,
              device_token: arg.deviceToken,
              login_id: arg.loginId,
            },
          });
        });
        if ('error' in result) {
          return result;
        }
        if (!result.data.session_token) {
          return { error: { status: 500, data: 'request_unavailable' } };
        }
        const session: LoginSession = {
          session_token: result.data.session_token,
          session_id: result.data.session_id ?? '',
          user_id: result.data.user_id ?? '',
          tenant_id: result.data.tenant_id ?? '',
          location_id: result.data.location_id ?? '',
          role: result.data.role ?? 'Cashier',
          password_enabled: result.data.password_enabled ?? true,
          otp_enabled: result.data.otp_enabled ?? false,
          device_token: result.data.device_token ?? null,
        };
        persistLogin(extra, session, arg.loginId);
        return { data: session };
      },
    }),
    logout: builder.mutation<{ revoked: boolean }, void>({
      async queryFn(_arg, api) {
        const extra = api.extra as AuthApiContext;
        const result = await queryEnvelope(async () => {
          const client = createApiClient(extra);
          return client.POST('/auth/logout', {});
        });
        extra.clearSession?.();
        extra.navigate?.(extra.getDeviceToken?.() ? '/login/pin' : '/login');
        return result;
      },
    }),
  }),
});

export const {
  useGetSessionQuery,
  useLoginWithPasswordMutation,
  useRequestOtpMutation,
  useVerifyOtpMutation,
  useVerifyPinMutation,
  useLogoutMutation,
} = authApi;
