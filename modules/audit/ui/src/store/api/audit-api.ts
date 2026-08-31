import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import { createApiClient, queryEnvelope } from '@namma-medmate/api-client';

export interface AuditEventItem {
  audit_event_id: string;
  tenant_id?: string | null;
  location_id?: string | null;
  actor_user_id: string;
  actor_role: string;
  actor_surface: string;
  action: string;
  target_type: string;
  target_id: string;
  money_or_stock: boolean;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  occurred_at: string;
}

export interface AuditEventPage {
  items: AuditEventItem[];
  next_cursor: string | null;
}

export interface AuditApiContext {
  baseUrl: string;
  getAccessToken?: () => string | undefined | Promise<string | undefined>;
  getLocationId?: () => string | undefined;
  getTenantId?: () => string | undefined;
  fetchImpl?: typeof fetch;
}

export const auditApi = createApi({
  reducerPath: 'auditApi',
  baseQuery: fakeBaseQuery(),
  tagTypes: ['Events'],
  endpoints: (builder) => ({
    listAuditEvents: builder.query<AuditEventPage, { targetId?: string } | void>({
      async queryFn(arg, api) {
        const extra = api.extra as AuditApiContext;
        const locationId = extra.getLocationId?.();
        return queryEnvelope(async () => {
          const client = createApiClient(extra);
          return client.GET('/audit/events', {
            params: {
              header: { authorization: 'Bearer session' },
              query: {
                location_id: locationId,
                target_id: arg && 'targetId' in arg ? arg.targetId : undefined,
              },
            },
          });
        });
      },
      providesTags: ['Events'],
    }),
    getAuditEvent: builder.query<AuditEventItem, { auditEventId: string }>({
      async queryFn(arg, api) {
        const extra = api.extra as AuditApiContext;
        const locationId = extra.getLocationId?.();
        return queryEnvelope(async () => {
          const client = createApiClient(extra);
          return client.GET('/audit/events/{audit_event_id}', {
            params: {
              header: { authorization: 'Bearer session' },
              path: { audit_event_id: arg.auditEventId },
              query: { location_id: locationId },
            },
          });
        });
      },
      providesTags: ['Events'],
    }),
  }),
});

export const { useListAuditEventsQuery, useGetAuditEventQuery } = auditApi;
