import type { Logger } from '@namma-medmate/logger';
import type {
  TenancyRepository,
  WhatsAppMessageRecord,
  WhatsAppPurpose,
  WhatsAppRepository,
  WhatsAppStatus,
  WhatsAppTemplateKey,
} from '@namma-medmate/db-services';
import { ErrorCode } from '@namma-medmate/constants';
import {
  bodyParamsForMeta,
  getTemplate,
  inboxPreview,
  isMandatoryTemplate,
  purposeForTemplate,
} from '../catalogue.ts';
import { WhatsAppErrors } from '../errors.ts';
import type { MetaClient } from '../meta/client.ts';
import { resolveLocation } from '../tenancy/resolve-location.ts';
import { parseMobileTo } from '../http/validate.ts';
import { RETRY_BACKOFF_MS, type RetryScheduler } from './retry-scheduler.ts';

export interface SendInput {
  tenantId: string;
  locationId: string;
  to: string;
  templateKey: string;
  purpose?: WhatsAppPurpose;
  params?: Record<string, unknown>;
  billId?: string | null;
  campaignId?: string | null;
  idempotencyKey?: string;
  mandatory?: boolean;
}

export interface SendResult {
  message: WhatsAppMessageRecord;
  deduped: boolean;
}

const STATUS_RANK: Record<Exclude<WhatsAppStatus, 'failed'>, number> = {
  queued: 0,
  sent: 1,
  delivered: 2,
  read: 3,
};

export function canAdvanceStatus(from: WhatsAppStatus, to: WhatsAppStatus): boolean {
  if (from === to) {
    return false;
  }
  if (to === 'failed') {
    return from === 'queued' || from === 'sent';
  }
  if (from === 'failed') {
    return to === 'delivered' || to === 'read';
  }
  return STATUS_RANK[to] > STATUS_RANK[from];
}

function redactParams(
  _templateKey: WhatsAppTemplateKey,
  params: Record<string, unknown>,
  shopName: string,
): Record<string, unknown> {
  const redacted: Record<string, unknown> = { shop_name: shopName };
  for (const [key, value] of Object.entries(params)) {
    if (key === 'otp') {
      continue;
    }
    if (typeof value === 'string') {
      redacted[key] = value;
    }
  }
  return redacted;
}

export function createSendService(deps: {
  tenancy: TenancyRepository;
  messages: WhatsAppRepository;
  meta: MetaClient;
  scheduler: RetryScheduler;
  logger: Logger;
}) {
  const otpByMessage = new Map<string, string>();

  async function attemptDelivery(messageId: string): Promise<WhatsAppMessageRecord | undefined> {
    const leased = await deps.messages.acquireLease(messageId, new Date(Date.now() + 30_000));
    if (!leased) {
      return deps.messages.findById(messageId);
    }
    const template = getTemplate(leased.templateKey);
    if (!template) {
      return deps.messages.markAttempt({
        messageId,
        status: 'failed',
        retryCount: leased.retryCount,
        lastErrorCode: ErrorCode.UNKNOWN_TEMPLATE,
      });
    }
    const shopName =
      typeof leased.paramsRedacted.shop_name === 'string' ? leased.paramsRedacted.shop_name : '';
    const metaParams = { ...leased.paramsRedacted };
    const cachedOtp = otpByMessage.get(messageId);
    if (cachedOtp) {
      metaParams.otp = cachedOtp;
    }
    const result = await deps.meta.sendTemplate({
      to: leased.to,
      templateName: template.meta_template_name,
      language: template.language,
      bodyParams: bodyParamsForMeta(leased.templateKey, shopName, metaParams),
    });
    if (result.ok) {
      otpByMessage.delete(messageId);
      const sent = await deps.messages.markAttempt({
        messageId,
        status: 'sent',
        retryCount: leased.retryCount,
        metaMessageId: result.metaMessageId,
      });
      deps.logger.info('WhatsAppMessageStatusChanged', {
        message_id: sent.messageId,
        status: sent.status,
        retry_count: sent.retryCount,
      });
      return sent;
    }
    const attempts = leased.retryCount + 1;
    if (!result.retryable || attempts >= 3) {
      otpByMessage.delete(messageId);
      const failed = await deps.messages.markAttempt({
        messageId,
        status: 'failed',
        retryCount: result.retryable ? attempts : 0,
        lastErrorCode:
          leased.templateKey === 'login_otp'
            ? ErrorCode.WHATSAPP_OTP_UNDELIVERABLE
            : (result.errorCode ?? 'META_CLIENT_ERROR'),
      });
      deps.logger.info(
        failed.mandatory && failed.templateKey !== 'login_otp'
          ? 'WhatsAppMandatoryFailed'
          : failed.templateKey === 'login_otp'
            ? 'WhatsAppOtpUndeliverable'
            : 'WhatsAppMessageStatusChanged',
        {
          message_id: failed.messageId,
          tenant_id: failed.tenantId,
          location_id: failed.locationId,
          template_key: failed.templateKey,
          status: failed.status,
          retry_count: failed.retryCount,
        },
      );
      return failed;
    }
    await deps.messages.markAttempt({
      messageId,
      status: 'queued',
      retryCount: attempts,
      lastErrorCode: result.errorCode,
    });
    const delay = RETRY_BACKOFF_MS[attempts - 1]!;
    await deps.scheduler.schedule(messageId, delay);
    return (await deps.messages.findById(messageId))!;
  }

  deps.scheduler.bind(async (messageId) => {
    await attemptDelivery(messageId);
  });

  return {
    attemptDelivery,
    async send(input: SendInput): Promise<SendResult> {
      const template = getTemplate(input.templateKey);
      if (!template) {
        throw WhatsAppErrors.unknownTemplate();
      }
      const to = parseMobileTo(input.to);
      const billId = input.billId ?? null;
      const campaignId = input.campaignId ?? null;
      const idempotencyKey = input.idempotencyKey?.trim() ?? '';
      if (!billId && !idempotencyKey) {
        throw WhatsAppErrors.idempotencyKeyRequired();
      }
      const location = await resolveLocation(deps.tenancy, input.tenantId, input.locationId);
      const existing = await deps.messages.findDuplicate({
        templateKey: template.template_key,
        to,
        billId,
        idempotencyKey: idempotencyKey || billId!,
      });
      if (existing) {
        return { message: existing, deduped: true };
      }
      const params = input.params ?? {};
      const shopName =
        typeof params.shop_name === 'string' && params.shop_name.trim().length > 0
          ? params.shop_name
          : location.displayName;
      const mandatory = Boolean(input.mandatory) || isMandatoryTemplate(template.template_key);
      const created = await deps.messages.insertQueued({
        tenantId: input.tenantId,
        locationId: input.locationId,
        templateKey: template.template_key,
        to,
        purpose: campaignId
          ? 'campaign'
          : (input.purpose ?? purposeForTemplate(template.template_key, campaignId)),
        billId,
        campaignId,
        idempotencyKey: idempotencyKey || `${template.template_key}:${to}:${billId}`,
        mandatory,
        paramsRedacted: redactParams(template.template_key, params, shopName),
      });
      deps.logger.info('WhatsAppMessageQueued', {
        message_id: created.messageId,
        tenant_id: created.tenantId,
        location_id: created.locationId,
        template_key: created.templateKey,
        mandatory: created.mandatory,
      });
      const otpForMeta = typeof params.otp === 'string' ? params.otp : undefined;
      if (otpForMeta) {
        otpByMessage.set(created.messageId, otpForMeta);
      }
      return { message: (await attemptDelivery(created.messageId))!, deduped: false };
    },
    inboxPreview,
  };
}

export type SendService = ReturnType<typeof createSendService>;
