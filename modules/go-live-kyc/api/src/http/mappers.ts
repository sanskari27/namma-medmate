import { openSecret } from '@namma-medmate/encryption-utils';
import type { GoLiveKycRecord } from '@namma-medmate/db-services';

export function maskBank(value: string | null): string | null {
  if (!value) {
    return null;
  }
  const digits = value.replaceAll(/\D/g, '');
  if (digits.length < 4) {
    return '****';
  }
  return `****${digits.slice(-4)}`;
}

export function decryptOptional(ciphertext: string | null, key: string): string | null {
  if (!ciphertext) {
    return null;
  }
  return openSecret(ciphertext, key);
}

export interface GatePayload {
  allowed: boolean;
  kyc_status: string;
  wizard_status: string;
  blockers: string[];
  reject_reason?: string;
}

export function toGate(row: GoLiveKycRecord): GatePayload {
  const blockers: string[] = [];
  if (row.kycStatus === 'rejected') {
    blockers.push('GO_LIVE_KYC_REJECTED');
  } else if (row.kycStatus !== 'approved') {
    blockers.push('GO_LIVE_KYC_INCOMPLETE');
  }
  if (row.wizardStatus !== 'completed') {
    blockers.push('GO_LIVE_WIZARD_INCOMPLETE');
  }
  return {
    allowed: blockers.length === 0,
    kyc_status: row.kycStatus,
    wizard_status: row.wizardStatus,
    blockers,
    ...(row.kycStatus === 'rejected' && row.kycRejectReason
      ? { reject_reason: row.kycRejectReason }
      : {}),
  };
}
