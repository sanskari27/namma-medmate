import { createHttpClient, HttpClientError } from '@namma-medmate/http-client';
import type { WhatsAppEnv } from '../config/env.ts';
import {
  META_MESSAGING_PRODUCT,
  type MetaClient,
  type MetaSendInput,
  type MetaSendResult,
} from './client.ts';

interface GraphMessageResponse {
  messages?: Array<{ id?: string }>;
}

export function createGraphMetaClient(env: WhatsAppEnv, fetchImpl?: typeof fetch): MetaClient {
  const request = createHttpClient({ timeoutMs: 5_000, retries: 0, fetchImpl });
  return {
    async sendTemplate(input: MetaSendInput): Promise<MetaSendResult> {
      const url = `${env.META_GRAPH_BASE_URL}/${env.META_WABA_PHONE_NUMBER_ID}/messages`;
      try {
        const response = await request(url, {
          method: 'POST',
          headers: {
            authorization: `Bearer ${env.META_WABA_ACCESS_TOKEN}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: META_MESSAGING_PRODUCT,
            to: input.to.replace(/^\+/, ''),
            type: 'template',
            template: {
              name: input.templateName,
              language: { code: input.language },
              components: [
                {
                  type: 'body',
                  parameters: input.bodyParams.map((text) => ({ type: 'text', text })),
                },
              ],
            },
          }),
        });
        const payload = (await response.json()) as GraphMessageResponse;
        return {
          ok: true,
          retryable: false,
          metaMessageId: payload.messages?.[0]?.id,
        };
      } catch (error) {
        if (error instanceof HttpClientError) {
          const retryable = error.status === undefined || error.status >= 500;
          return {
            ok: false,
            retryable,
            errorCode: retryable ? 'META_UNAVAILABLE' : 'META_CLIENT_ERROR',
          };
        }
        return { ok: false, retryable: true, errorCode: 'META_UNAVAILABLE' };
      }
    },
  };
}
