import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import {
  createApiClient,
  queryEnvelope,
  type QueryEnvelopeResult,
} from '@namma-medmate/api-client';
import type { SeatSummary } from '../../lib/seats.ts';
import type { StaffRole } from '../../lib/permissions.ts';

export interface ManageUserListItem {
  user_id: string;
  login_id: string;
  role: StaffRole;
  permissions?: Record<string, boolean>;
  active: boolean;
  employee_id: string | null;
  otp_mobile: string | null;
  password_enabled: boolean;
  otp_enabled: boolean;
  pin_set: boolean;
  temp_password_pending: boolean;
  saved_device_count: number;
  created_at: string;
  updated_at: string;
}

export interface SavedDevice {
  device_id: string;
  label: string;
  last_seen_at: string;
  created_at: string;
}

export interface ManageUserDetail extends ManageUserListItem {
  permissions: Record<string, boolean>;
  saved_devices?: SavedDevice[];
  temp_password?: string;
}

export interface ManageUsersPageData {
  items: ManageUserListItem[];
  page: number;
  page_size: number;
  total: number;
}

export interface CreateUserInput {
  login_id: string;
  role: Exclude<StaffRole, 'owner'>;
  password_enabled: boolean;
  otp_enabled: boolean;
  otp_mobile?: string | null;
  pin?: string;
}

export interface ManageUsersApiContext {
  baseUrl: string;
  getAccessToken?: () => string | undefined | Promise<string | undefined>;
  getLocationId?: () => string | undefined;
  fetchImpl?: typeof fetch;
}

function authHeader() {
  return { authorization: 'Bearer session' as const };
}

function locationQuery(extra: ManageUsersApiContext) {
  return { location_id: extra.getLocationId?.() };
}

function load<T>(
  execute: () => Promise<{
    data?: { data: unknown };
    error?: unknown;
    response?: { status: number };
  }>,
): Promise<QueryEnvelopeResult<T>> {
  return queryEnvelope(
    execute as () => Promise<{
      data?: { data: T };
      error?: unknown;
      response?: { status: number };
    }>,
  );
}

export const manageUsersApi = createApi({
  reducerPath: 'manageUsersApi',
  baseQuery: fakeBaseQuery(),
  tagTypes: ['Seats', 'Users', 'User'],
  endpoints: (builder) => ({
    getSeats: builder.query<SeatSummary, void>({
      async queryFn(_arg, api) {
        const extra = api.extra as ManageUsersApiContext;
        return load<SeatSummary>(async () => {
          const client = createApiClient(extra);
          return client.GET('/manage-users/seats', {
            params: { header: authHeader(), query: locationQuery(extra) },
          });
        });
      },
      providesTags: ['Seats'],
    }),
    listUsers: builder.query<ManageUsersPageData, void>({
      async queryFn(_arg, api) {
        const extra = api.extra as ManageUsersApiContext;
        return load<ManageUsersPageData>(async () => {
          const client = createApiClient(extra);
          return client.GET('/manage-users/users', {
            params: { header: authHeader(), query: locationQuery(extra) },
          });
        });
      },
      providesTags: ['Users'],
    }),
    getUser: builder.query<ManageUserDetail, { userId: string }>({
      async queryFn(arg, api) {
        const extra = api.extra as ManageUsersApiContext;
        return load<ManageUserDetail>(async () => {
          const client = createApiClient(extra);
          return client.GET('/manage-users/users/{user_id}', {
            params: {
              header: authHeader(),
              path: { user_id: arg.userId },
              query: locationQuery(extra),
            },
          });
        });
      },
      providesTags: ['User'],
    }),
    createUser: builder.mutation<ManageUserDetail, CreateUserInput>({
      async queryFn(arg, api) {
        const extra = api.extra as ManageUsersApiContext;
        return load<ManageUserDetail>(async () => {
          const client = createApiClient(extra);
          return client.POST('/manage-users/users', {
            params: { header: authHeader(), query: locationQuery(extra) },
            body: arg,
          });
        });
      },
      invalidatesTags: ['Seats', 'Users'],
    }),
    patchUser: builder.mutation<
      ManageUserDetail,
      { userId: string; active?: boolean; login_id?: string; otp_mobile?: string | null }
    >({
      async queryFn(arg, api) {
        const extra = api.extra as ManageUsersApiContext;
        return load<ManageUserDetail>(async () => {
          const client = createApiClient(extra);
          return client.PATCH('/manage-users/users/{user_id}', {
            params: {
              header: authHeader(),
              path: { user_id: arg.userId },
              query: locationQuery(extra),
            },
            body: {
              active: arg.active,
              login_id: arg.login_id,
              otp_mobile: arg.otp_mobile,
            },
          });
        });
      },
      invalidatesTags: ['Seats', 'Users', 'User'],
    }),
    putPermissions: builder.mutation<
      { permissions: Record<string, boolean>; role: string },
      {
        userId: string;
        mode: 'merge' | 'replace' | 'select_all' | 'reset_defaults';
        permissions?: Record<string, boolean>;
      }
    >({
      async queryFn(arg, api) {
        const extra = api.extra as ManageUsersApiContext;
        return load<{ permissions: Record<string, boolean>; role: string }>(async () => {
          const client = createApiClient(extra);
          return client.PUT('/manage-users/users/{user_id}/permissions', {
            params: {
              header: authHeader(),
              path: { user_id: arg.userId },
              query: locationQuery(extra),
            },
            body: { mode: arg.mode, permissions: arg.permissions },
          });
        });
      },
      invalidatesTags: ['Users', 'User'],
    }),
    putMethods: builder.mutation<
      { password_enabled: boolean; otp_enabled: boolean; otp_mobile: string | null },
      { userId: string; password_enabled: boolean; otp_enabled: boolean; otp_mobile: string | null }
    >({
      async queryFn(arg, api) {
        const extra = api.extra as ManageUsersApiContext;
        return load<{
          password_enabled: boolean;
          otp_enabled: boolean;
          otp_mobile: string | null;
        }>(async () => {
          const client = createApiClient(extra);
          return client.PUT('/manage-users/users/{user_id}/methods', {
            params: {
              header: authHeader(),
              path: { user_id: arg.userId },
              query: locationQuery(extra),
            },
            body: {
              password_enabled: arg.password_enabled,
              otp_enabled: arg.otp_enabled,
              otp_mobile: arg.otp_mobile,
            },
          });
        });
      },
      invalidatesTags: ['Users', 'User'],
    }),
    resetPassword: builder.mutation<
      { temp_password: string; temp_password_pending: boolean },
      { userId: string }
    >({
      async queryFn(arg, api) {
        const extra = api.extra as ManageUsersApiContext;
        return load<{ temp_password: string; temp_password_pending: boolean }>(async () => {
          const client = createApiClient(extra);
          return client.POST('/manage-users/users/{user_id}/password/reset', {
            params: {
              header: authHeader(),
              path: { user_id: arg.userId },
              query: locationQuery(extra),
            },
          });
        });
      },
      invalidatesTags: ['User'],
    }),
    copyPassword: builder.mutation<{ temp_password: string }, { userId: string }>({
      async queryFn(arg, api) {
        const extra = api.extra as ManageUsersApiContext;
        return load<{ temp_password: string }>(async () => {
          const client = createApiClient(extra);
          return client.POST('/manage-users/users/{user_id}/password/copy', {
            params: {
              header: authHeader(),
              path: { user_id: arg.userId },
              query: locationQuery(extra),
            },
          });
        });
      },
    }),
    putPin: builder.mutation<{ pin_set: boolean }, { userId: string; pin: string }>({
      async queryFn(arg, api) {
        const extra = api.extra as ManageUsersApiContext;
        return load<{ pin_set: boolean }>(async () => {
          const client = createApiClient(extra);
          return client.PUT('/manage-users/users/{user_id}/pin', {
            params: {
              header: authHeader(),
              path: { user_id: arg.userId },
              query: locationQuery(extra),
            },
            body: { pin: arg.pin },
          });
        });
      },
      invalidatesTags: ['User'],
    }),
    deletePin: builder.mutation<{ pin_set: boolean }, { userId: string }>({
      async queryFn(arg, api) {
        const extra = api.extra as ManageUsersApiContext;
        return load<{ pin_set: boolean }>(async () => {
          const client = createApiClient(extra);
          return client.DELETE('/manage-users/users/{user_id}/pin', {
            params: {
              header: authHeader(),
              path: { user_id: arg.userId },
              query: locationQuery(extra),
            },
          });
        });
      },
      invalidatesTags: ['User'],
    }),
    revokeDevice: builder.mutation<{ revoked: boolean }, { userId: string; deviceId: string }>({
      async queryFn(arg, api) {
        const extra = api.extra as ManageUsersApiContext;
        return load<{ revoked: boolean }>(async () => {
          const client = createApiClient(extra);
          return client.DELETE('/manage-users/users/{user_id}/devices/{device_id}', {
            params: {
              header: authHeader(),
              path: { user_id: arg.userId, device_id: arg.deviceId },
              query: locationQuery(extra),
            },
          });
        });
      },
      invalidatesTags: ['User'],
    }),
    revokeAllDevices: builder.mutation<{ revoked: boolean }, { userId: string }>({
      async queryFn(arg, api) {
        const extra = api.extra as ManageUsersApiContext;
        return load<{ revoked: boolean }>(async () => {
          const client = createApiClient(extra);
          return client.DELETE('/manage-users/users/{user_id}/devices', {
            params: {
              header: authHeader(),
              path: { user_id: arg.userId },
              query: locationQuery(extra),
            },
          });
        });
      },
      invalidatesTags: ['User'],
    }),
    shareLink: builder.mutation<{ url: string; body: string; sent: false }, { userId: string }>({
      async queryFn(arg, api) {
        const extra = api.extra as ManageUsersApiContext;
        return load<{ url: string; body: string; sent: false }>(async () => {
          const client = createApiClient(extra);
          return client.POST('/manage-users/users/{user_id}/share-link', {
            params: {
              header: authHeader(),
              path: { user_id: arg.userId },
              query: locationQuery(extra),
            },
          });
        });
      },
    }),
    removeUser: builder.mutation<Record<string, never>, { userId: string }>({
      async queryFn(arg, api) {
        const extra = api.extra as ManageUsersApiContext;
        return load<Record<string, never>>(async () => {
          const client = createApiClient(extra);
          return client.DELETE('/manage-users/users/{user_id}', {
            params: {
              header: authHeader(),
              path: { user_id: arg.userId },
              query: locationQuery(extra),
            },
          });
        });
      },
      invalidatesTags: ['Seats', 'Users'],
    }),
  }),
});

export const {
  useGetSeatsQuery,
  useListUsersQuery,
  useGetUserQuery,
  useCreateUserMutation,
  usePatchUserMutation,
  usePutPermissionsMutation,
  usePutMethodsMutation,
  useResetPasswordMutation,
  useCopyPasswordMutation,
  usePutPinMutation,
  useDeletePinMutation,
  useRevokeDeviceMutation,
  useRevokeAllDevicesMutation,
  useShareLinkMutation,
  useRemoveUserMutation,
} = manageUsersApi;
