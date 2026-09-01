import type { Pool, QueryResult } from 'pg';
import { createId } from '@namma-medmate/id-generator';
import { decodeCursor, encodeCursor } from '@namma-medmate/pagination-utils';
import type {
  CreatePlatformMasterSkuInput,
  GstSlab,
  ListPlatformMasterSkusInput,
  ListPlatformMasterSkusResult,
  MasterCatalogueRepository,
  PlatformMasterSkuRecord,
  Schedule,
  SubstituteRecord,
  UpdatePlatformMasterSkuInput,
} from './types.ts';

interface SkuRow {
  platform_master_sku_id: string;
  name: string;
  composition: string;
  manufacturer: string | null;
  brand: string | null;
  pack: string | null;
  form: string | null;
  category: string;
  schedule: Schedule;
  rx_only: boolean;
  hsn: string;
  gst_slab: GstSlab | string;
  dpco_ceiling: string | null;
  banned: boolean;
  banned_at: Date | null;
  banned_by_user_id: string | null;
  created_at: Date;
  updated_at: Date;
}

interface SubstituteJoinRow {
  substitute_platform_master_sku_id: string;
  name: string;
  schedule: Schedule;
  banned: boolean;
  sort_order: number;
}

const SELECT_SKU = `select platform_master_sku_id, name, composition, manufacturer, brand, pack, form,
  category, schedule, rx_only, hsn, gst_slab, dpco_ceiling, banned, banned_at, banned_by_user_id,
  created_at, updated_at from platform_master_skus`;

function formatCeiling(value: string | null): string | null {
  if (value === null) {
    return null;
  }
  const [whole, fraction = ''] = value.split('.');
  return `${whole}.${(fraction + '00').slice(0, 2)}`;
}

function mapSku(row: SkuRow): PlatformMasterSkuRecord {
  return {
    platformMasterSkuId: row.platform_master_sku_id,
    name: row.name,
    composition: row.composition,
    manufacturer: row.manufacturer,
    brand: row.brand,
    pack: row.pack,
    form: row.form,
    category: row.category,
    schedule: row.schedule,
    rxOnly: row.rx_only,
    hsn: row.hsn,
    gstSlab: Number(row.gst_slab) as GstSlab,
    dpcoCeiling: formatCeiling(row.dpco_ceiling),
    banned: row.banned,
    bannedAt: row.banned_at,
    bannedByUserId: row.banned_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function firstSku(result: QueryResult<SkuRow>): PlatformMasterSkuRecord | undefined {
  const row = result.rows[0];
  return row ? mapSku(row) : undefined;
}

function mapSubstitute(row: SubstituteJoinRow): SubstituteRecord {
  return {
    platformMasterSkuId: row.substitute_platform_master_sku_id,
    name: row.name,
    schedule: row.schedule,
    banned: row.banned,
    sortOrder: row.sort_order,
  };
}

export function createSqlMasterCatalogueRepository(pool: Pool): MasterCatalogueRepository {
  return {
    async createSku(input: CreatePlatformMasterSkuInput): Promise<PlatformMasterSkuRecord> {
      const id = createId();
      const result = await pool.query<SkuRow>(
        `insert into platform_master_skus (
          platform_master_sku_id, name, composition, manufacturer, brand, pack, form, category,
          schedule, rx_only, hsn, gst_slab, dpco_ceiling, banned, banned_at, banned_by_user_id,
          created_at, updated_at
        ) values (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, false, null, null, now(), now()
        ) returning platform_master_sku_id, name, composition, manufacturer, brand, pack, form,
          category, schedule, rx_only, hsn, gst_slab, dpco_ceiling, banned, banned_at,
          banned_by_user_id, created_at, updated_at`,
        [
          id,
          input.name,
          input.composition,
          input.manufacturer ?? null,
          input.brand ?? null,
          input.pack ?? null,
          input.form ?? null,
          input.category,
          input.schedule,
          input.rxOnly,
          input.hsn,
          input.gstSlab,
          input.dpcoCeiling ?? null,
        ],
      );
      const created = firstSku(result);
      if (!created) {
        throw new Error('Platform master SKU insert did not persist');
      }
      return created;
    },

    async getById(platformMasterSkuId: string): Promise<PlatformMasterSkuRecord | undefined> {
      const result = await pool.query<SkuRow>(`${SELECT_SKU} where platform_master_sku_id = $1`, [
        platformMasterSkuId,
      ]);
      return firstSku(result);
    },

    async getByIds(ids: string[]): Promise<PlatformMasterSkuRecord[]> {
      if (ids.length === 0) {
        return [];
      }
      const result = await pool.query<SkuRow>(
        `${SELECT_SKU} where platform_master_sku_id = any($1)`,
        [ids],
      );
      return result.rows.map(mapSku);
    },

    async listSkus(input: ListPlatformMasterSkusInput): Promise<ListPlatformMasterSkusResult> {
      const afterId = decodeCursor(input.cursor);
      const params: unknown[] = [];
      const clauses: string[] = [];
      if (input.category) {
        params.push(input.category);
        clauses.push(`category = $${params.length}`);
      }
      if (input.schedule) {
        params.push(input.schedule);
        clauses.push(`schedule = $${params.length}`);
      }
      if (input.gstSlab !== undefined) {
        params.push(input.gstSlab);
        clauses.push(`gst_slab = $${params.length}`);
      }
      if (input.banned !== undefined) {
        params.push(input.banned);
        clauses.push(`banned = $${params.length}`);
      }
      if (input.rxOnly === true) {
        clauses.push('rx_only = true');
      }
      if (input.rxOnly === false) {
        clauses.push('rx_only = false');
      }
      if (input.q) {
        params.push(`%${input.q}%`);
        const idx = params.length;
        clauses.push(
          `(name ilike $${idx} or composition ilike $${idx} or coalesce(brand, '') ilike $${idx})`,
        );
      }
      if (afterId) {
        params.push(afterId);
        clauses.push(`(name, platform_master_sku_id) > (
          select name, platform_master_sku_id from platform_master_skus
          where platform_master_sku_id = $${params.length}
        )`);
      }
      params.push(input.limit + 1);
      const where = clauses.length > 0 ? ` where ${clauses.join(' and ')}` : '';
      const result = await pool.query<SkuRow>(
        `${SELECT_SKU}${where} order by name asc, platform_master_sku_id asc limit $${params.length}`,
        params,
      );
      const hasMore = result.rows.length > input.limit;
      const items = (hasMore ? result.rows.slice(0, input.limit) : result.rows).map(mapSku);
      return {
        items,
        nextCursor: hasMore ? encodeCursor(items[items.length - 1]!.platformMasterSkuId) : null,
      };
    },

    async updateSku(
      platformMasterSkuId: string,
      input: UpdatePlatformMasterSkuInput,
    ): Promise<PlatformMasterSkuRecord | undefined> {
      const existing = await this.getById(platformMasterSkuId);
      if (!existing) {
        return undefined;
      }
      const result = await pool.query<SkuRow>(
        `update platform_master_skus set
          name = $2, composition = $3, manufacturer = $4, brand = $5, pack = $6, form = $7,
          category = $8, schedule = $9, rx_only = $10, hsn = $11, gst_slab = $12, updated_at = now()
        where platform_master_sku_id = $1
        returning platform_master_sku_id, name, composition, manufacturer, brand, pack, form,
          category, schedule, rx_only, hsn, gst_slab, dpco_ceiling, banned, banned_at,
          banned_by_user_id, created_at, updated_at`,
        [
          platformMasterSkuId,
          input.name ?? existing.name,
          input.composition ?? existing.composition,
          input.manufacturer === undefined ? existing.manufacturer : input.manufacturer,
          input.brand === undefined ? existing.brand : input.brand,
          input.pack === undefined ? existing.pack : input.pack,
          input.form === undefined ? existing.form : input.form,
          input.category ?? existing.category,
          input.schedule ?? existing.schedule,
          input.rxOnly ?? existing.rxOnly,
          input.hsn ?? existing.hsn,
          input.gstSlab ?? existing.gstSlab,
        ],
      );
      return firstSku(result);
    },

    async setCeiling(
      platformMasterSkuId: string,
      dpcoCeiling: string | null,
    ): Promise<PlatformMasterSkuRecord | undefined> {
      const result = await pool.query<SkuRow>(
        `update platform_master_skus set dpco_ceiling = $2, updated_at = now()
        where platform_master_sku_id = $1
        returning platform_master_sku_id, name, composition, manufacturer, brand, pack, form,
          category, schedule, rx_only, hsn, gst_slab, dpco_ceiling, banned, banned_at,
          banned_by_user_id, created_at, updated_at`,
        [platformMasterSkuId, dpcoCeiling],
      );
      return firstSku(result);
    },

    async ban(
      platformMasterSkuId: string,
      bannedByUserId: string,
    ): Promise<PlatformMasterSkuRecord | undefined> {
      const result = await pool.query<SkuRow>(
        `update platform_master_skus set banned = true, banned_at = now(), banned_by_user_id = $2,
          updated_at = now()
        where platform_master_sku_id = $1
        returning platform_master_sku_id, name, composition, manufacturer, brand, pack, form,
          category, schedule, rx_only, hsn, gst_slab, dpco_ceiling, banned, banned_at,
          banned_by_user_id, created_at, updated_at`,
        [platformMasterSkuId, bannedByUserId],
      );
      return firstSku(result);
    },

    async unban(platformMasterSkuId: string): Promise<PlatformMasterSkuRecord | undefined> {
      const result = await pool.query<SkuRow>(
        `update platform_master_skus set banned = false, banned_at = null, banned_by_user_id = null,
          updated_at = now()
        where platform_master_sku_id = $1
        returning platform_master_sku_id, name, composition, manufacturer, brand, pack, form,
          category, schedule, rx_only, hsn, gst_slab, dpco_ceiling, banned, banned_at,
          banned_by_user_id, created_at, updated_at`,
        [platformMasterSkuId],
      );
      return firstSku(result);
    },

    async replaceSubstitutes(
      platformMasterSkuId: string,
      substituteIds: string[],
    ): Promise<SubstituteRecord[]> {
      await pool.query('begin');
      try {
        await pool.query(
          'delete from platform_master_sku_substitutes where platform_master_sku_id = $1',
          [platformMasterSkuId],
        );
        for (const [index, substituteId] of substituteIds.entries()) {
          await pool.query(
            `insert into platform_master_sku_substitutes (
              platform_master_sku_id, substitute_platform_master_sku_id, sort_order
            ) values ($1, $2, $3)`,
            [platformMasterSkuId, substituteId, index],
          );
        }
        await pool.query('commit');
      } catch (error) {
        await pool.query('rollback');
        throw error;
      }
      return this.listSubstitutes(platformMasterSkuId);
    },

    async listSubstitutes(
      platformMasterSkuId: string,
      forPos?: boolean,
    ): Promise<SubstituteRecord[]> {
      const bannedClause = forPos ? ' and sku.banned = false' : '';
      const result = await pool.query<SubstituteJoinRow>(
        `select sub.substitute_platform_master_sku_id, sku.name, sku.schedule, sku.banned, sub.sort_order
         from platform_master_sku_substitutes sub
         join platform_master_skus sku on sku.platform_master_sku_id = sub.substitute_platform_master_sku_id
         where sub.platform_master_sku_id = $1${bannedClause}
         order by sub.sort_order asc`,
        [platformMasterSkuId],
      );
      return result.rows.map(mapSubstitute);
    },
  };
}
