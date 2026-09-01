import { MasterCatalogueErrors } from '../errors.ts';

const MONEY = /^-?\d+(\.\d{1,2})?$/;

export function moneyToCents(value: string): number {
  const negative = value.startsWith('-');
  const unsigned = negative ? value.slice(1) : value;
  const [whole = '0', fraction = ''] = unsigned.split('.');
  const cents = Number(whole) * 100 + Number((fraction + '00').slice(0, 2));
  return negative ? -cents : cents;
}

export function normalizeMoney(value: string): string {
  const cents = moneyToCents(value);
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / 100);
  const fraction = String(abs % 100).padStart(2, '0');
  return `${sign}${whole}.${fraction}`;
}

export function parseMoney(raw: unknown, allowNull: false): string;
export function parseMoney(raw: unknown, allowNull: true): string | null;
export function parseMoney(raw: unknown, allowNull: boolean): string | null {
  if (raw === null) {
    if (!allowNull) {
      throw MasterCatalogueErrors.validationFailed('unit_price is required');
    }
    return null;
  }
  if (typeof raw !== 'string' || !MONEY.test(raw)) {
    throw MasterCatalogueErrors.validationFailed('Amount must be a decimal with up to 2 places');
  }
  if (moneyToCents(raw) < 0) {
    throw allowNull
      ? MasterCatalogueErrors.invalidCeiling()
      : MasterCatalogueErrors.validationFailed('Amount cannot be negative');
  }
  return normalizeMoney(raw);
}
