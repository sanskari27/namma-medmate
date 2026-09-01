import { translate } from '@namma-medmate/i18n';
import { employeesMessages } from '../i18n/en.ts';

export function interpolate(template: string, vars: Record<string, string>): string {
  return template.replaceAll(/\{\{(\w+)\}\}/g, (_match, key: string) => vars[key] ?? '');
}

export function t(key: string, vars?: Record<string, string>): string {
  const message = translate(employeesMessages, key);
  return vars ? interpolate(message, vars) : message;
}

export function positionLabel(position: string): string {
  return t(`employees.positions.${position}`);
}

export function statusLabel(status: string): string {
  return t(`employees.statuses.${status}`);
}
