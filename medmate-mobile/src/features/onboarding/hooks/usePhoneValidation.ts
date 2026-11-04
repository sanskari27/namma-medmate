import { useMemo } from 'react';

import { formatPhone, isValidPhone, normalizePhone } from '@/utils';

export interface PhoneValidation {
  /** True once the value is a complete 10-digit Indian mobile number. */
  isValid: boolean;
  /** Digits only, without the +91 prefix. */
  normalized: string;
  /** Grouped for display, e.g. "98765 43210". */
  display: string;
}

/** Validates a phone number as the user types. */
export function usePhoneValidation(value: string): PhoneValidation {
  return useMemo(() => {
    const normalized = normalizePhone(value);

    return {
      isValid: isValidPhone(normalized),
      normalized,
      display: formatPhone(normalized),
    };
  }, [value]);
}
