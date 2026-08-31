import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import { createApiClient, queryEnvelope } from '@namma-medmate/api-client';
import type { MessageStatus } from '../../lib/copy.ts';

export interface InboxItem {
  message_id: string;
  template_key: string;
  to: string;
  purpose: string;
  status: MessageStatus;
  bill_id?: string | null;
  mandatory: boolean;
  retry_count: number;
  created_at: string;
  preview: string;
}

export interface InboxPage {
  items: InboxItem[];
  next_cursor: string | null;
}

export interface MandatoryFailure {
  message_id: string;
  template_key: string;
  bill_id?: string | null;
  status: MessageStatus;
  last_error_code?: string | null;
  created_at: string;
}

export interface AcknowledgeResult {
  message_id: string;
  acknowledged_at: string;
}

export interface ShareDeeplink {
  url: string;
}

export interface TemplateItem {
  template_key: string;
  meta_template_name: string;
  language: string;
  i18n_key: string;
  transactional: boolean;
  body_preview_en: string;
}

export interface WhatsAppApiContext {
  baseUrl: string;
  getAccessToken?: () => string | undefined | Promise<string | undefined>;
  getLocationId?: () => string | undefined;
  getTenantId?: () => string | undefined;
  fetchImpl?: typeof fetch;
  openUrl?: (url: string) => void;
}

export const whatsappApi = createApi({
  reducerPath: 'whatsappApi',
  baseQuery: fakeBaseQuery(),
  tagTypes: ['Inbox', 'Mandatory', 'Templates'],
  endpoints: (builder) => ({
    listMessages: builder.query<InboxPage, { status?: MessageStatus } | void>({
      async queryFn(arg, api) {
        const extra = api.extra as WhatsAppApiContext;
        const locationId = extra.getLocationId?.();
        return queryEnvelope(async () => {
          const client = createApiClient(extra);
          return client.GET('/whatsapp/messages', {
            params: {
              header: { authorization: 'Bearer session' },
              query: {
                location_id: locationId,
                status: arg && 'status' in arg ? arg.status : undefined,
              },
            },
          });
        });
      },
      providesTags: ['Inbox'],
    }),
    listMandatoryFailures: builder.query<{ items: MandatoryFailure[] }, void>({
      async queryFn(_arg, api) {
        const extra = api.extra as WhatsAppApiContext;
        const locationId = extra.getLocationId?.();
        return queryEnvelope(async () => {
          const client = createApiClient(extra);
          return client.GET('/whatsapp/mandatory-failures', {
            params: {
              header: { authorization: 'Bearer session' },
              query: { location_id: locationId },
            },
          });
        });
      },
      providesTags: ['Mandatory'],
    }),
    acknowledgeMessage: builder.mutation<AcknowledgeResult, { messageId: string }>({
      async queryFn(arg, api) {
        const extra = api.extra as WhatsAppApiContext;
        const locationId = extra.getLocationId?.();
        return queryEnvelope(async () => {
          const client = createApiClient(extra);
          return client.POST('/whatsapp/messages/{message_id}/acknowledge', {
            params: {
              header: { authorization: 'Bearer session' },
              path: { message_id: arg.messageId },
            },
            body: { location_id: locationId || '' },
          });
        });
      },
      invalidatesTags: ['Mandatory', 'Inbox'],
    }),
    shareDeeplink: builder.mutation<
      ShareDeeplink,
      { text: string; to?: string; tenantId?: string; locationId?: string }
    >({
      async queryFn(arg, api) {
        const extra = api.extra as WhatsAppApiContext;
        return queryEnvelope(async () => {
          const client = createApiClient(extra);
          return client.POST('/whatsapp/share-deeplink', {
            params: { header: { authorization: 'Bearer session' } },
            body: {
              tenant_id: arg.tenantId || extra.getTenantId?.() || '',
              location_id: arg.locationId || extra.getLocationId?.() || '',
              to: arg.to,
              text: arg.text,
            },
          });
        });
      },
    }),
    listTemplates: builder.query<{ items: TemplateItem[] }, void>({
      async queryFn(_arg, api) {
        const extra = api.extra as WhatsAppApiContext;
        return queryEnvelope(async () => {
          const client = createApiClient(extra);
          return client.GET('/whatsapp/templates', {
            params: { header: { authorization: 'Bearer session' } },
          });
        });
      },
      providesTags: ['Templates'],
    }),
  }),
});

export const {
  useListMessagesQuery,
  useListMandatoryFailuresQuery,
  useAcknowledgeMessageMutation,
  useShareDeeplinkMutation,
  useListTemplatesQuery,
} = whatsappApi;
