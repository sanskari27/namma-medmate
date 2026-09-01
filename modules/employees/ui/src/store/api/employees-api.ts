import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import {
  createApiClient,
  queryEnvelope,
  type QueryEnvelopeResult,
} from '@namma-medmate/api-client';

export interface EmployeeListItem {
  employee_id: string;
  employee_code: string;
  full_name: string;
  phone: string;
  position: string;
  position_label: string | null;
  status: string;
  join_date: string | null;
  user_id: string | null;
  pharmacist_eligible: boolean;
  photo_url: string | null;
  aadhaar_masked: string | null;
}

export interface EmployeeDocument {
  document_id: string;
  type: string;
  object_key: string;
  file_name: string;
  uploaded_at: string;
  download_url: string | null;
}

export interface EmployeeDetail extends EmployeeListItem {
  email: string | null;
  date_of_birth: string | null;
  gender: string | null;
  address: string | null;
  pan: string | null;
  aadhaar: string | null;
  pharmacist_registration_no: string | null;
  pharmacist_registration_expiry: string | null;
  bank_account_holder: string | null;
  bank_account_number: string | null;
  bank_ifsc: string | null;
  bank_upi_id: string | null;
  emergency_name: string | null;
  emergency_phone: string | null;
  emergency_relation: string | null;
  documents: EmployeeDocument[];
}

export interface EmployeeSummary {
  headcount: { total: number; active: number; inactive: number; separated: number };
  composition: Array<{ position: string; count: number }>;
}

export interface EmployeePageData {
  items: EmployeeListItem[];
  page: number;
  page_size: number;
  total: number;
}

export interface CreateEmployeeInput {
  full_name: string;
  phone: string;
  position: string;
  pharmacist_registration_no?: string;
  pharmacist_registration_expiry?: string;
  user_id?: string | null;
}

export interface ListEmployeesArgs {
  q?: string;
  position?: string;
  status?: string;
}

export interface UnlinkedUser {
  user_id: string;
  login_id: string;
  employee_id: string | null;
}

export interface EmployeesApiContext {
  baseUrl: string;
  getAccessToken?: () => string | undefined | Promise<string | undefined>;
  getLocationId?: () => string | undefined;
  fetchImpl?: typeof fetch;
  manageUsersBaseUrl?: string;
}

function authHeader() {
  return { authorization: 'Bearer session' as const };
}

function locationQuery(extra: EmployeesApiContext) {
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

export const employeesApi = createApi({
  reducerPath: 'employeesApi',
  baseQuery: fakeBaseQuery(),
  tagTypes: ['Employees', 'Employee'],
  endpoints: (build) => ({
    getSummary: build.query<EmployeeSummary, void>({
      async queryFn(_arg, api) {
        const extra = api.extra as EmployeesApiContext;
        return load<EmployeeSummary>(async () => {
          const client = createApiClient(extra);
          return client.GET('/employees/summary', {
            params: { header: authHeader(), query: locationQuery(extra) },
          });
        });
      },
      providesTags: ['Employees'],
    }),
    listEmployees: build.query<EmployeePageData, ListEmployeesArgs>({
      async queryFn(arg, api) {
        const extra = api.extra as EmployeesApiContext;
        const filters = arg;
        return load<EmployeePageData>(async () => {
          const client = createApiClient(extra);
          return client.GET('/employees', {
            params: {
              header: authHeader(),
              query: {
                ...locationQuery(extra),
                q: filters.q || undefined,
                position: filters.position || undefined,
                status: filters.status || undefined,
              },
            },
          });
        });
      },
      providesTags: ['Employees'],
    }),
    getEmployee: build.query<EmployeeDetail, { employeeId: string }>({
      async queryFn(arg, api) {
        const extra = api.extra as EmployeesApiContext;
        return load<EmployeeDetail>(async () => {
          const client = createApiClient(extra);
          return client.GET('/employees/{employee_id}', {
            params: {
              header: authHeader(),
              path: { employee_id: arg.employeeId },
              query: locationQuery(extra),
            },
          });
        });
      },
      providesTags: ['Employee'],
    }),
    listUnlinkedUsers: build.query<UnlinkedUser[], void>({
      async queryFn(_arg, api) {
        const extra = api.extra as EmployeesApiContext;
        const client = createApiClient({
          ...extra,
          baseUrl: extra.manageUsersBaseUrl ?? extra.baseUrl,
        });
        const result = await load<{ items: UnlinkedUser[] }>(async () =>
          client.GET('/manage-users/users', {
            params: { header: authHeader(), query: locationQuery(extra) },
          }),
        );
        if ('error' in result) {
          return result;
        }
        return {
          data: result.data.items.filter((item) => item.employee_id == null),
        };
      },
    }),
    createEmployee: build.mutation<EmployeeDetail, CreateEmployeeInput>({
      async queryFn(body, api) {
        const extra = api.extra as EmployeesApiContext;
        return load<EmployeeDetail>(async () => {
          const client = createApiClient(extra);
          return client.POST('/employees', {
            params: {
              header: { ...authHeader(), 'idempotency-key': crypto.randomUUID() },
              query: locationQuery(extra),
            },
            body,
          });
        });
      },
      invalidatesTags: ['Employees'],
    }),
    patchEmployee: build.mutation<
      EmployeeDetail,
      { employeeId: string; body: Record<string, unknown> }
    >({
      async queryFn(arg, api) {
        const extra = api.extra as EmployeesApiContext;
        return load<EmployeeDetail>(async () => {
          const client = createApiClient(extra);
          return client.PATCH('/employees/{employee_id}', {
            params: {
              header: authHeader(),
              path: { employee_id: arg.employeeId },
              query: locationQuery(extra),
            },
            body: arg.body,
          });
        });
      },
      invalidatesTags: ['Employees', 'Employee'],
    }),
    exportCsv: build.mutation<string, ListEmployeesArgs>({
      async queryFn(arg, api) {
        const extra = api.extra as EmployeesApiContext;
        const token = (await extra.getAccessToken?.()) ?? 'session';
        const locationId = extra.getLocationId?.() ?? '';
        const fetchImpl = extra.fetchImpl ?? fetch;
        const params = new URLSearchParams({ location_id: locationId });
        if (arg.q) {
          params.set('q', arg.q);
        }
        if (arg.position) {
          params.set('position', arg.position);
        }
        if (arg.status) {
          params.set('status', arg.status);
        }
        const response = await fetchImpl(`${extra.baseUrl}/employees/export.csv?${params}`, {
          headers: { authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          return { error: { status: response.status } };
        }
        return { data: await response.text() };
      },
    }),
    getIdCard: build.mutation<Blob, { employeeId: string }>({
      async queryFn(arg, api) {
        const extra = api.extra as EmployeesApiContext;
        const token = (await extra.getAccessToken?.()) ?? 'session';
        const locationId = extra.getLocationId?.() ?? '';
        const fetchImpl = extra.fetchImpl ?? fetch;
        const response = await fetchImpl(
          `${extra.baseUrl}/employees/${arg.employeeId}/id-card.pdf?location_id=${encodeURIComponent(locationId)}`,
          { headers: { authorization: `Bearer ${token}` } },
        );
        if (!response.ok) {
          return { error: { status: response.status } };
        }
        return { data: await response.blob() };
      },
    }),
  }),
});

export const {
  useGetSummaryQuery,
  useListEmployeesQuery,
  useGetEmployeeQuery,
  useListUnlinkedUsersQuery,
  useCreateEmployeeMutation,
  usePatchEmployeeMutation,
  useExportCsvMutation,
  useGetIdCardMutation,
} = employeesApi;
