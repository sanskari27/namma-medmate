import { describe, expect, it } from 'vitest';
import { plainError } from '@/services/plainError';

describe('plainError', () => {
  it('uses the code, not the server sentence', () => {
    expect(plainError('VALIDATION_ERROR')).toBe(
      'Some details are missing or wrong. Check the form and try again.',
    );
    expect(plainError('IDEMPOTENCY_CONFLICT')).toBe(
      'This was already saved. Refresh the page instead of sending it again.',
    );
    expect(plainError('FORBIDDEN')).toBe(
      "You don't have permission for this. Ask the pharmacy owner to allow it.",
    );
    expect(plainError('DUPLICATE_CODE')).toBe(
      'That value is already used. Use a different one, or open the existing record.',
    );
    expect(plainError('NOT_FOUND')).toBe(
      'That record is no longer here. Go back and refresh the list.',
    );
    expect(plainError('CONFLICT')).toBe(
      'Someone else updated this. Refresh the page and try again.',
    );
    expect(plainError('LINES_REQUIRED')).toBe('Add at least one medicine line.');
    expect(plainError('REVIEW_REASON_REQUIRED')).toBe(
      'A review reason is required. Type why you are continuing, then try again.',
    );
    expect(plainError('TENANT_EXPIRED')).toBe(
      "This pharmacy's plan has expired. Renew the plan, then sign in again.",
    );
  });

  it('uses one fallback when the code is missing or unknown', () => {
    const fallback = 'Something went wrong. Try again. If it keeps happening, refresh the page.';
    expect(plainError(null)).toBe(fallback);
    expect(plainError('NOT_A_REAL_CODE')).toBe(fallback);
  });
});
