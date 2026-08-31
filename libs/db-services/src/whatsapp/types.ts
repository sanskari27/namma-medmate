export const WHATSAPP_STATUSES = ['queued', 'sent', 'delivered', 'read', 'failed'] as const;
export type WhatsAppStatus = (typeof WHATSAPP_STATUSES)[number];

export const WHATSAPP_TEMPLATE_KEYS = [
  'login_otp',
  'khata_remind',
  'refill',
  'low_stock',
  'licence_expiry',
  'irn_fail',
  'gstn_fail',
  'subscription_dunning',
  'rx_pending',
  'kiosk_token',
  'bill_share',
] as const;
export type WhatsAppTemplateKey = (typeof WHATSAPP_TEMPLATE_KEYS)[number];

export const WHATSAPP_PURPOSES = [
  'otp',
  'khata_remind',
  'refill',
  'low_stock',
  'licence',
  'irn_fail',
  'gstn_fail',
  'dunning',
  'rx_pending',
  'kiosk_token',
  'bill_share',
  'campaign',
  'other',
] as const;
export type WhatsAppPurpose = (typeof WHATSAPP_PURPOSES)[number];

export interface WhatsAppMessageRecord {
  messageId: string;
  tenantId: string;
  locationId: string;
  templateKey: WhatsAppTemplateKey;
  to: string;
  purpose: WhatsAppPurpose;
  status: WhatsAppStatus;
  billId: string | null;
  campaignId: string | null;
  idempotencyKey: string;
  mandatory: boolean;
  acknowledgedAt: Date | null;
  acknowledgedByUserId: string | null;
  retryCount: number;
  metaMessageId: string | null;
  lastErrorCode: string | null;
  paramsRedacted: Record<string, unknown>;
  leaseExpiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  lastAttemptAt: Date | null;
}

export interface InsertWhatsAppMessageInput {
  tenantId: string;
  locationId: string;
  templateKey: WhatsAppTemplateKey;
  to: string;
  purpose: WhatsAppPurpose;
  billId: string | null;
  campaignId: string | null;
  idempotencyKey: string;
  mandatory: boolean;
  paramsRedacted: Record<string, unknown>;
}

export interface ListWhatsAppMessagesInput {
  tenantId: string;
  locationId: string;
  status?: WhatsAppStatus;
  templateKey?: WhatsAppTemplateKey;
  limit: number;
  cursor?: string;
}

export interface ListWhatsAppMessagesResult {
  items: WhatsAppMessageRecord[];
  nextCursor: string | null;
}

export interface WhatsAppRepository {
  insertQueued(input: InsertWhatsAppMessageInput): Promise<WhatsAppMessageRecord>;
  findById(messageId: string): Promise<WhatsAppMessageRecord | undefined>;
  findDuplicate(input: {
    templateKey: WhatsAppTemplateKey;
    to: string;
    billId: string | null;
    idempotencyKey: string;
  }): Promise<WhatsAppMessageRecord | undefined>;
  findByMetaMessageId(metaMessageId: string): Promise<WhatsAppMessageRecord | undefined>;
  listInbox(input: ListWhatsAppMessagesInput): Promise<ListWhatsAppMessagesResult>;
  listMandatoryFailures(input: {
    tenantId: string;
    locationId: string;
  }): Promise<WhatsAppMessageRecord[]>;
  acquireLease(messageId: string, expiresAt: Date): Promise<WhatsAppMessageRecord | undefined>;
  markAttempt(input: {
    messageId: string;
    status: WhatsAppStatus;
    retryCount: number;
    metaMessageId?: string | null;
    lastErrorCode?: string | null;
  }): Promise<WhatsAppMessageRecord>;
  updateStatus(input: {
    messageId: string;
    status: WhatsAppStatus;
    lastErrorCode?: string | null;
  }): Promise<WhatsAppMessageRecord | undefined>;
  acknowledge(input: {
    messageId: string;
    actorUserId: string;
    at: Date;
  }): Promise<WhatsAppMessageRecord>;
}
