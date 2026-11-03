/**
 * Indian mobile number helpers.
 *
 * Numbers are stored and sent to the API as 10 digits without the +91 prefix.
 */

export const COUNTRY_CODE = '+91';
export const PHONE_LENGTH = 10;

const DIGITS_ONLY = /\D/g;

export function normalizePhone(input: string): string {
  return input.replace(DIGITS_ONLY, '');
}

export function isValidPhone(input: string): boolean {
  return normalizePhone(input).length === PHONE_LENGTH;
}

/** `9876543210` → `98765 43210`, matching the MVP's placeholder format. */
export function formatPhone(input: string): string {
  const digits = normalizePhone(input).slice(0, PHONE_LENGTH);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)} ${digits.slice(5)}`;
}

/** `9876543210` → `+91 98765 43210`, as shown on the OTP screen. */
export function formatPhoneWithCountry(input: string): string {
  const digits = normalizePhone(input);
  if (!digits) return '';
  return `${COUNTRY_CODE} ${formatPhone(digits)}`;
}
