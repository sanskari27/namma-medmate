import { describe, expect, it } from 'vitest';
import { kycDocumentUrl } from '@/services/kyc';

describe('kycDocumentUrl', () => {
  it('prefixes evidence links with the API base URL', () => {
    expect(kycDocumentUrl('pack-1', 'doc-1')).toBe(
      'http://localhost:8080/api/v1/admin/kyc/pack-1/documents/doc-1',
    );
  });
});
