import type { PlatformMasterSkuRecord, SubstituteRecord } from './types.ts';

export function clonePlatformMasterSku(row: PlatformMasterSkuRecord): PlatformMasterSkuRecord {
  return {
    ...row,
    bannedAt: row.bannedAt ? new Date(row.bannedAt) : null,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  };
}

export function cloneSubstitute(row: SubstituteRecord): SubstituteRecord {
  return { ...row };
}
