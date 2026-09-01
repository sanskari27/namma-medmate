import { translate } from '@namma-medmate/i18n';
import { goLiveKycMessages } from '../i18n/en.ts';

export function interpolate(template: string, vars: Record<string, string>): string {
  return template.replaceAll(/\{\{(\w+)\}\}/g, (_match, key: string) => vars[key] ?? '');
}

export function t(key: string, vars?: Record<string, string>): string {
  const message = translate(goLiveKycMessages, key);
  return vars ? interpolate(message, vars) : message;
}
