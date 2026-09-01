import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import {
  createApiClient,
  queryEnvelope,
  type QueryEnvelopeResult,
} from '@namma-medmate/api-client';

export interface GateData {
  allowed: boolean;
  kyc_status: string;
  wizard_status: string;
  blockers: string[];
  reject_reason?: string;
}

export interface WizardData {
  wizard_status: string;
  steps: Record<string, { status: string }>;
  gate: GateData;
}

export interface StatusData {
  kyc_status: string;
  wizard_status: string;
  kyc_reject_reason: string | null;
  gstin: string | null;
  pan: string | null;
  bank_account_number_masked: string | null;
  wizard_progress: { steps: Record<string, { status: string }> };
  gate: GateData;
}

export interface QueueItem {
  tenant_id: string;
  location_id: string;
  pharmacy_name: string;
  gstin: string | null;
  kyc_status: string;
  submitted_at: string | null;
  plan: string | null;
}

export interface QueueData {
  items: QueueItem[];
  page: number;
  page_size: number;
  total: number;
}

export interface GoLiveKycApiContext {
  baseUrl: string;
  getAccessToken?: () => string | undefined | Promise<string | undefined>;
  getLocationId?: () => string | undefined;
  fetchImpl?: typeof fetch;
}

function authHeader() {
  return { authorization: 'Bearer session' as const };
}

function locationQuery(extra: GoLiveKycApiContext) {
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

export const goLiveKycApi = createApi({
  reducerPath: 'goLiveKycApi',
  baseQuery: fakeBaseQuery(),
  tagTypes: ['Gate', 'Wizard', 'Queue'],
  endpoints: (build) => ({
    getGate: build.query<GateData, void>({
      async queryFn(_arg, api) {
        const extra = api.extra as GoLiveKycApiContext;
        return load<GateData>(async () => {
          const client = createApiClient(extra);
          return client.GET('/go-live-kyc/gate', {
            params: { header: authHeader(), query: locationQuery(extra) },
          });
        });
      },
      providesTags: ['Gate'],
    }),
    getStatus: build.query<StatusData, void>({
      async queryFn(_arg, api) {
        const extra = api.extra as GoLiveKycApiContext;
        return load<StatusData>(async () => {
          const client = createApiClient(extra);
          return client.GET('/go-live-kyc/status', {
            params: { header: authHeader(), query: locationQuery(extra) },
          });
        });
      },
      providesTags: ['Wizard', 'Gate'],
    }),
    getWizard: build.query<WizardData, void>({
      async queryFn(_arg, api) {
        const extra = api.extra as GoLiveKycApiContext;
        return load<WizardData>(async () => {
          const client = createApiClient(extra);
          return client.GET('/go-live-kyc/wizard', {
            params: { header: authHeader(), query: locationQuery(extra) },
          });
        });
      },
      providesTags: ['Wizard'],
    }),
    putKyc: build.mutation<unknown, Record<string, unknown>>({
      async queryFn(body, api) {
        const extra = api.extra as GoLiveKycApiContext;
        return load(async () => {
          const client = createApiClient(extra);
          return client.PUT('/go-live-kyc/kyc', {
            params: {
              header: { ...authHeader(), 'idempotency-key': crypto.randomUUID() },
              query: locationQuery(extra),
            },
            body: body as never,
          });
        });
      },
      invalidatesTags: ['Gate', 'Wizard'],
    }),
    putStep1: build.mutation<unknown, Record<string, unknown>>({
      async queryFn(body, api) {
        const extra = api.extra as GoLiveKycApiContext;
        return load(async () => {
          const client = createApiClient(extra);
          return client.PUT('/go-live-kyc/wizard/steps/1', {
            params: { header: authHeader(), query: locationQuery(extra) },
            body: body as never,
          });
        });
      },
      invalidatesTags: ['Wizard'],
    }),
    postStep2: build.mutation<unknown, Record<string, unknown>>({
      async queryFn(body, api) {
        const extra = api.extra as GoLiveKycApiContext;
        return load(async () => {
          const client = createApiClient(extra);
          return client.POST('/go-live-kyc/wizard/steps/2', {
            params: { header: authHeader(), query: locationQuery(extra) },
            body: body as never,
          });
        });
      },
      invalidatesTags: ['Wizard'],
    }),
    putStep3: build.mutation<unknown, Record<string, unknown>>({
      async queryFn(body, api) {
        const extra = api.extra as GoLiveKycApiContext;
        return load(async () => {
          const client = createApiClient(extra);
          return client.PUT('/go-live-kyc/wizard/steps/3', {
            params: { header: authHeader(), query: locationQuery(extra) },
            body: body as never,
          });
        });
      },
      invalidatesTags: ['Wizard'],
    }),
    putStep4: build.mutation<unknown, Record<string, unknown>>({
      async queryFn(body, api) {
        const extra = api.extra as GoLiveKycApiContext;
        return load(async () => {
          const client = createApiClient(extra);
          return client.PUT('/go-live-kyc/wizard/steps/4', {
            params: { header: authHeader(), query: locationQuery(extra) },
            body: body as never,
          });
        });
      },
      invalidatesTags: ['Wizard'],
    }),
    putStep5: build.mutation<unknown, Record<string, unknown>>({
      async queryFn(body, api) {
        const extra = api.extra as GoLiveKycApiContext;
        return load(async () => {
          const client = createApiClient(extra);
          return client.PUT('/go-live-kyc/wizard/steps/5', {
            params: { header: authHeader(), query: locationQuery(extra) },
            body: body as never,
          });
        });
      },
      invalidatesTags: ['Wizard'],
    }),
    completeWizard: build.mutation<unknown, void>({
      async queryFn(_arg, api) {
        const extra = api.extra as GoLiveKycApiContext;
        return load(async () => {
          const client = createApiClient(extra);
          return client.POST('/go-live-kyc/wizard/complete', {
            params: { header: authHeader(), query: locationQuery(extra) },
          });
        });
      },
      invalidatesTags: ['Wizard', 'Gate'],
    }),
    rerunWizard: build.mutation<unknown, void>({
      async queryFn(_arg, api) {
        const extra = api.extra as GoLiveKycApiContext;
        return load(async () => {
          const client = createApiClient(extra);
          return client.POST('/go-live-kyc/wizard/rerun', {
            params: { header: authHeader(), query: locationQuery(extra) },
          });
        });
      },
      invalidatesTags: ['Wizard', 'Gate'],
    }),
    listQueue: build.query<QueueData, void>({
      async queryFn(_arg, api) {
        const extra = api.extra as GoLiveKycApiContext;
        return load<QueueData>(async () => {
          const client = createApiClient(extra);
          return client.GET('/go-live-kyc/admin/queue', {
            params: { header: authHeader(), query: { status: 'pending' } },
          });
        });
      },
      providesTags: ['Queue'],
    }),
    approveKyc: build.mutation<unknown, { tenantId: string; locationId: string }>({
      async queryFn(arg, api) {
        const extra = api.extra as GoLiveKycApiContext;
        return load(async () => {
          const client = createApiClient(extra);
          return client.POST('/go-live-kyc/admin/pharmacies/{tenant_id}/kyc/approve', {
            params: {
              header: authHeader(),
              path: { tenant_id: arg.tenantId },
              query: { location_id: arg.locationId },
            },
          });
        });
      },
      invalidatesTags: ['Queue'],
    }),
    rejectKyc: build.mutation<unknown, { tenantId: string; locationId: string; reason: string }>({
      async queryFn(arg, api) {
        const extra = api.extra as GoLiveKycApiContext;
        return load(async () => {
          const client = createApiClient(extra);
          return client.POST('/go-live-kyc/admin/pharmacies/{tenant_id}/kyc/reject', {
            params: {
              header: authHeader(),
              path: { tenant_id: arg.tenantId },
              query: { location_id: arg.locationId },
            },
            body: { reason: arg.reason },
          });
        });
      },
      invalidatesTags: ['Queue'],
    }),
  }),
});

export const {
  useGetGateQuery,
  useGetStatusQuery,
  useGetWizardQuery,
  usePutKycMutation,
  usePutStep1Mutation,
  usePostStep2Mutation,
  usePutStep3Mutation,
  usePutStep4Mutation,
  usePutStep5Mutation,
  useCompleteWizardMutation,
  useRerunWizardMutation,
  useListQueueQuery,
  useApproveKycMutation,
  useRejectKycMutation,
} = goLiveKycApi;
