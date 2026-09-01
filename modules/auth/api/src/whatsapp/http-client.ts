import { createHttpClient } from '@namma-medmate/http-client';
import type { WhatsAppSendClient, WhatsAppOtpSendInput } from './client.ts';

interface WhatsAppSendBody {
  data?: { status?: string };
}

export function createHttpWhatsAppClient(
  baseUrl: string,
  serviceToken: string,
): WhatsAppSendClient {
  const request = createHttpClient({
    retries: 0,
    fetchImpl: (input, init) => fetch(input, init),
  });
  return {
    async sendLoginOtp(input: WhatsAppOtpSendInput): Promise<{ delivered: boolean }> {
      try {
        const response = await request(`${baseUrl.replace(/\/$/, '')}/whatsapp/messages`, {
          method: 'POST',
          headers: {
            authorization: `Bearer ${serviceToken}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            tenant_id: input.tenantId,
            location_id: input.locationId,
            to: input.to,
            template_key: 'login_otp',
            idempotency_key: `otp-challenge-${input.challengeId}`,
            params: { otp: input.otp },
          }),
        });
        const body = (await response.json()) as WhatsAppSendBody;
        return { delivered: body.data?.status !== 'failed' };
      } catch {
        return { delivered: false };
      }
    },
  };
}
