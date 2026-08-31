import { translate } from '@namma-medmate/i18n';
import { whatsappMessages } from '../i18n/en.ts';

export type MessageStatus = 'queued' | 'sent' | 'delivered' | 'read' | 'failed';

export function interpolate(template: string, vars: Record<string, string>): string {
  return template.replaceAll(/\{\{(\w+)\}\}/g, (_match, key: string) => vars[key] ?? '');
}

export function statusLabel(status: MessageStatus): string {
  return translate(whatsappMessages, `whatsapp.status.${status}`);
}

export function mandatoryReason(templateKey: string): string {
  const key = `whatsapp.banner.reason.${templateKey}`;
  return translate(
    whatsappMessages,
    key,
    translate(whatsappMessages, 'whatsapp.banner.reason.other'),
  );
}

export function mandatoryBannerCopy(templateKey: string): string {
  return interpolate(translate(whatsappMessages, 'whatsapp.banner.mandatoryFailed'), {
    reason: mandatoryReason(templateKey),
  });
}
