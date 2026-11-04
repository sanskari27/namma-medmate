import {
  COUNTRY_CODE,
  formatPhone,
  formatPhoneWithCountry,
  isValidPhone,
  normalizePhone,
  PHONE_LENGTH,
} from './phone';

describe('normalizePhone', () => {
  it('strips everything but digits', () => {
    expect(normalizePhone('+91 98765-43210')).toBe('919876543210');
  });

  it('keeps a plain number intact', () => {
    expect(normalizePhone('9876543210')).toBe('9876543210');
  });

  it('returns an empty string for empty input', () => {
    expect(normalizePhone('')).toBe('');
  });
});

describe('isValidPhone', () => {
  it('accepts a 10-digit number', () => {
    expect(isValidPhone('9876543210')).toBe(true);
  });

  it('ignores formatting', () => {
    expect(isValidPhone('98765 43210')).toBe(true);
  });

  it('rejects a 9-digit number', () => {
    expect(isValidPhone('987654321')).toBe(false);
  });

  it('rejects a number with the country code still attached', () => {
    expect(isValidPhone('919876543210')).toBe(false);
  });

  it('rejects empty input', () => {
    expect(isValidPhone('')).toBe(false);
  });
});

describe('formatPhone', () => {
  it('groups the number the way the MVP does', () => {
    expect(formatPhone('9876543210')).toBe('98765 43210');
  });

  it('leaves a short number alone', () => {
    expect(formatPhone('98765')).toBe('98765');
  });

  it('never renders more than the expected length', () => {
    expect(formatPhone('98765432109999')).toBe('98765 43210');
  });
});

describe('formatPhoneWithCountry', () => {
  it('prefixes the country code', () => {
    expect(formatPhoneWithCountry('9876543210')).toBe(`${COUNTRY_CODE} 98765 43210`);
  });

  it('returns an empty string for empty input', () => {
    expect(formatPhoneWithCountry('')).toBe('');
  });
});

describe('constants', () => {
  it('expects a 10-digit Indian mobile number', () => {
    expect(PHONE_LENGTH).toBe(10);
  });
});
