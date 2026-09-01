import { createId } from '@namma-medmate/id-generator';
import { decodeCursor, encodeCursor } from '@namma-medmate/pagination-utils';
import { clonePlatformMasterSku, cloneSubstitute } from './clone.ts';
import type {
  CreatePlatformMasterSkuInput,
  ListPlatformMasterSkusInput,
  ListPlatformMasterSkusResult,
  MasterCatalogueRepository,
  PlatformMasterSkuRecord,
  SubstituteRecord,
  UpdatePlatformMasterSkuInput,
} from './types.ts';

function matchesQuery(row: PlatformMasterSkuRecord, q: string): boolean {
  const needle = q.toLowerCase();
  return (
    row.name.toLowerCase().includes(needle) ||
    row.composition.toLowerCase().includes(needle) ||
    (row.brand ?? '').toLowerCase().includes(needle)
  );
}

function matchesList(row: PlatformMasterSkuRecord, input: ListPlatformMasterSkusInput): boolean {
  if (input.category && row.category !== input.category) {
    return false;
  }
  if (input.schedule && row.schedule !== input.schedule) {
    return false;
  }
  if (input.gstSlab !== undefined && row.gstSlab !== input.gstSlab) {
    return false;
  }
  if (input.banned !== undefined && row.banned !== input.banned) {
    return false;
  }
  if (input.rxOnly === true && !row.rxOnly) {
    return false;
  }
  if (input.rxOnly === false && row.rxOnly) {
    return false;
  }
  if (input.q && !matchesQuery(row, input.q)) {
    return false;
  }
  return true;
}

function toSubstitute(substitute: PlatformMasterSkuRecord, sortOrder: number): SubstituteRecord {
  return {
    platformMasterSkuId: substitute.platformMasterSkuId,
    name: substitute.name,
    schedule: substitute.schedule,
    banned: substitute.banned,
    sortOrder,
  };
}

export function createMemoryMasterCatalogueRepository(
  now: () => Date = () => new Date(),
): MasterCatalogueRepository {
  const rows = new Map<string, PlatformMasterSkuRecord>();
  const substitutes = new Map<string, string[]>();

  function requireRow(id: string): PlatformMasterSkuRecord | undefined {
    const row = rows.get(id);
    return row ? clonePlatformMasterSku(row) : undefined;
  }

  function mapSubstitutes(skuId: string, forPos?: boolean): SubstituteRecord[] {
    const ids = substitutes.get(skuId) ?? [];
    const mapped: SubstituteRecord[] = [];
    ids.forEach((id, index) => {
      const row = rows.get(id);
      if (!row) {
        return;
      }
      if (forPos && row.banned) {
        return;
      }
      mapped.push(cloneSubstitute(toSubstitute(row, index)));
    });
    return mapped;
  }

  return {
    async createSku(input: CreatePlatformMasterSkuInput): Promise<PlatformMasterSkuRecord> {
      const stamp = now();
      const record: PlatformMasterSkuRecord = {
        platformMasterSkuId: createId(),
        name: input.name,
        composition: input.composition,
        manufacturer: input.manufacturer ?? null,
        brand: input.brand ?? null,
        pack: input.pack ?? null,
        form: input.form ?? null,
        category: input.category,
        schedule: input.schedule,
        rxOnly: input.rxOnly,
        hsn: input.hsn,
        gstSlab: input.gstSlab,
        dpcoCeiling: input.dpcoCeiling ?? null,
        banned: false,
        bannedAt: null,
        bannedByUserId: null,
        createdAt: stamp,
        updatedAt: stamp,
      };
      rows.set(record.platformMasterSkuId, record);
      return clonePlatformMasterSku(record);
    },

    async getById(platformMasterSkuId: string): Promise<PlatformMasterSkuRecord | undefined> {
      return requireRow(platformMasterSkuId);
    },

    async getByIds(ids: string[]): Promise<PlatformMasterSkuRecord[]> {
      return ids
        .map((id) => rows.get(id))
        .filter((row): row is PlatformMasterSkuRecord => Boolean(row))
        .map(clonePlatformMasterSku);
    },

    async listSkus(input: ListPlatformMasterSkusInput): Promise<ListPlatformMasterSkusResult> {
      const afterId = decodeCursor(input.cursor);
      const sorted = [...rows.values()]
        .filter((row) => matchesList(row, input))
        .sort((a, b) => {
          const name = a.name.localeCompare(b.name);
          return name !== 0 ? name : a.platformMasterSkuId.localeCompare(b.platformMasterSkuId);
        });
      const start = afterId
        ? sorted.findIndex((row) => row.platformMasterSkuId === afterId) + 1
        : 0;
      const sliced = sorted.slice(Math.max(start, 0));
      const page = sliced.slice(0, input.limit + 1);
      const hasMore = page.length > input.limit;
      const items = (hasMore ? page.slice(0, input.limit) : page).map(clonePlatformMasterSku);
      return {
        items,
        nextCursor: hasMore ? encodeCursor(items[items.length - 1]!.platformMasterSkuId) : null,
      };
    },

    async updateSku(
      platformMasterSkuId: string,
      input: UpdatePlatformMasterSkuInput,
    ): Promise<PlatformMasterSkuRecord | undefined> {
      const existing = rows.get(platformMasterSkuId);
      if (!existing) {
        return undefined;
      }
      const next: PlatformMasterSkuRecord = {
        ...existing,
        name: input.name ?? existing.name,
        composition: input.composition ?? existing.composition,
        manufacturer: input.manufacturer === undefined ? existing.manufacturer : input.manufacturer,
        brand: input.brand === undefined ? existing.brand : input.brand,
        pack: input.pack === undefined ? existing.pack : input.pack,
        form: input.form === undefined ? existing.form : input.form,
        category: input.category ?? existing.category,
        schedule: input.schedule ?? existing.schedule,
        rxOnly: input.rxOnly ?? existing.rxOnly,
        hsn: input.hsn ?? existing.hsn,
        gstSlab: input.gstSlab ?? existing.gstSlab,
        updatedAt: now(),
      };
      rows.set(platformMasterSkuId, next);
      return clonePlatformMasterSku(next);
    },

    async setCeiling(
      platformMasterSkuId: string,
      dpcoCeiling: string | null,
    ): Promise<PlatformMasterSkuRecord | undefined> {
      const existing = rows.get(platformMasterSkuId);
      if (!existing) {
        return undefined;
      }
      const next: PlatformMasterSkuRecord = { ...existing, dpcoCeiling, updatedAt: now() };
      rows.set(platformMasterSkuId, next);
      return clonePlatformMasterSku(next);
    },

    async ban(
      platformMasterSkuId: string,
      bannedByUserId: string,
    ): Promise<PlatformMasterSkuRecord | undefined> {
      const existing = rows.get(platformMasterSkuId);
      if (!existing) {
        return undefined;
      }
      const stamp = now();
      const next: PlatformMasterSkuRecord = {
        ...existing,
        banned: true,
        bannedAt: stamp,
        bannedByUserId,
        updatedAt: stamp,
      };
      rows.set(platformMasterSkuId, next);
      return clonePlatformMasterSku(next);
    },

    async unban(platformMasterSkuId: string): Promise<PlatformMasterSkuRecord | undefined> {
      const existing = rows.get(platformMasterSkuId);
      if (!existing) {
        return undefined;
      }
      const next: PlatformMasterSkuRecord = {
        ...existing,
        banned: false,
        bannedAt: null,
        bannedByUserId: null,
        updatedAt: now(),
      };
      rows.set(platformMasterSkuId, next);
      return clonePlatformMasterSku(next);
    },

    async replaceSubstitutes(
      platformMasterSkuId: string,
      substituteIds: string[],
    ): Promise<SubstituteRecord[]> {
      substitutes.set(platformMasterSkuId, [...substituteIds]);
      return mapSubstitutes(platformMasterSkuId);
    },

    async listSubstitutes(
      platformMasterSkuId: string,
      forPos?: boolean,
    ): Promise<SubstituteRecord[]> {
      return mapSubstitutes(platformMasterSkuId, forPos);
    },
  };
}
