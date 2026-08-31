import type { Messages } from '@namma-medmate/i18n';

export const whatsappMessages = {
  'whatsapp.inbox.title': 'WhatsApp',
  'whatsapp.inbox.subtitle': 'Delivery status for this shop.',
  'whatsapp.inbox.to': 'To',
  'whatsapp.inbox.template': 'Template',
  'whatsapp.inbox.status': 'Status',
  'whatsapp.inbox.time': 'Time',
  'whatsapp.inbox.retry': 'Retries',
  'whatsapp.inbox.preview': 'Preview',
  'whatsapp.inbox.filter': 'Status filter',
  'whatsapp.inbox.filterAll': 'All',
  'whatsapp.inbox.empty': 'No WhatsApp messages yet.',
  'whatsapp.inbox.error': 'Could not load the WhatsApp inbox.',
  'whatsapp.status.queued': 'Queued',
  'whatsapp.status.sent': 'Sent',
  'whatsapp.status.delivered': 'Delivered',
  'whatsapp.status.read': 'Read',
  'whatsapp.status.failed': 'Failed',
  'whatsapp.banner.mandatoryFailed':
    'WhatsApp to the owner failed for {{reason}}. Fix the issue or acknowledge.',
  'whatsapp.banner.acknowledge': 'Acknowledge',
  'whatsapp.banner.reason.irn_fail': 'IRN',
  'whatsapp.banner.reason.gstn_fail': 'GSTN',
  'whatsapp.banner.reason.licence_expiry': 'licence expiry',
  'whatsapp.banner.reason.other': 'a mandatory alert',
  'whatsapp.share.button': 'Share on WhatsApp',
  'whatsapp.share.opened': 'WhatsApp opened',
  'whatsapp.share.error': 'Could not build a WhatsApp link.',
  'whatsapp.templates.title': 'Templates',
  'whatsapp.templates.key': 'Key',
  'whatsapp.templates.body': 'Body',
  'whatsapp.errors.locationIdRequired': 'location_id is required',
  'whatsapp.errors.forbiddenRole': 'Only the Owner can acknowledge this alert',
} as const satisfies Messages;

export type WhatsAppMessageKey = keyof typeof whatsappMessages;
