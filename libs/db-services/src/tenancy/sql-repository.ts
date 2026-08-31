import type { Pool, PoolClient } from 'pg';
import { AppError } from '@namma-medmate/error-handling';
import { ErrorCode, HttpStatus } from '@namma-medmate/constants';
import { createId } from '@namma-medmate/id-generator';
import { decodeCursor, encodeCursor } from '@namma-medmate/pagination-utils';
import { isUniqueViolation } from './errors.ts';
import type {
  CreatePharmacyInput,
  GstDealerType,
  ListPharmaciesInput,
  ListPharmaciesResult,
  LocationRecord,
  PharmacyWithLocation,
  TenancyRepository,
  UpdateDisplayNameInput,
} from './types.ts';

interface PharmacyRow {
  tenant_id: string;
  gst_dealer_type: GstDealerType;
  business_type: 'retail';
  created_at: Date;
  updated_at: Date;
  location_id: string;
  display_name: string;
  location_created_at: Date;
  location_updated_at: Date;
}

function toPharmacy(row: PharmacyRow): PharmacyWithLocation {
  return {
    tenantId: row.tenant_id,
    gstDealerType: row.gst_dealer_type,
    businessType: row.business_type,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    location: {
      locationId: row.location_id,
      tenantId: row.tenant_id,
      displayName: row.display_name,
      createdAt: row.location_created_at,
      updatedAt: row.location_updated_at,
    },
  };
}

const PHARMACY_SELECT = `select p.tenant_id, p.gst_dealer_type, p.business_type, p.created_at, p.updated_at,
  l.location_id, l.display_name, l.created_at as location_created_at, l.updated_at as location_updated_at
  from pharmacies p
  join locations l on l.tenant_id = p.tenant_id`;

async function withTransaction<T>(
  pool: Pool,
  work: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  let outcome: { ok: true; value: T } | { ok: false; error: unknown };
  try {
    await client.query('begin');
    const value = await work(client);
    await client.query('commit');
    outcome = { ok: true, value };
  } catch (error) {
    await client.query('rollback');
    outcome = { ok: false, error };
  } finally {
    client.release();
  }
  if (outcome.ok) {
    return outcome.value;
  }
  if (isUniqueViolation(outcome.error)) {
    throw new AppError(
      'This pharmacy already has its location. Extra branches are not available.',
      ErrorCode.LOCATION_LIMIT_V1,
      HttpStatus.CONFLICT,
      undefined,
      'tenancy.errors.locationLimitV1',
    );
  }
  throw outcome.error;
}

export function createSqlTenancyRepository(pool: Pool): TenancyRepository {
  return {
    async createPharmacyWithLocation(input: CreatePharmacyInput): Promise<PharmacyWithLocation> {
      const tenantId = createId();
      const locationId = createId();
      return withTransaction(pool, async (client) => {
        await client.query(
          `insert into pharmacies (tenant_id, gst_dealer_type, business_type)
           values ($1, $2, $3)`,
          [tenantId, input.gstDealerType, input.businessType],
        );
        await client.query(
          `insert into locations (location_id, tenant_id, display_name)
           values ($1, $2, $3)`,
          [locationId, tenantId, input.displayName],
        );
        const result = await client.query<PharmacyRow>(
          `${PHARMACY_SELECT} where p.tenant_id = $1`,
          [tenantId],
        );
        const row = result.rows[0];
        if (!row) {
          throw new Error('Pharmacy create did not persist both rows');
        }
        return toPharmacy(row);
      });
    },

    async getPharmacyByTenantId(tenantId: string): Promise<PharmacyWithLocation | undefined> {
      const result = await pool.query<PharmacyRow>(`${PHARMACY_SELECT} where p.tenant_id = $1`, [
        tenantId,
      ]);
      const row = result.rows[0];
      return row ? toPharmacy(row) : undefined;
    },

    async listPharmacies(input: ListPharmaciesInput): Promise<ListPharmaciesResult> {
      const after = decodeCursor(input.cursor);
      const result = after
        ? await pool.query<PharmacyRow>(
            `${PHARMACY_SELECT} where p.tenant_id > $1 order by p.tenant_id asc limit $2`,
            [after, input.limit + 1],
          )
        : await pool.query<PharmacyRow>(`${PHARMACY_SELECT} order by p.tenant_id asc limit $1`, [
            input.limit + 1,
          ]);
      const hasMore = result.rows.length > input.limit;
      const rows = hasMore ? result.rows.slice(0, input.limit) : result.rows;
      const items = rows.map((row) => ({
        tenantId: row.tenant_id,
        locationId: row.location_id,
        displayName: row.display_name,
      }));
      return {
        items,
        nextCursor: hasMore ? encodeCursor(items[items.length - 1]!.tenantId) : null,
      };
    },

    async getLocationById(locationId: string): Promise<LocationRecord | undefined> {
      const result = await pool.query<PharmacyRow>(`${PHARMACY_SELECT} where l.location_id = $1`, [
        locationId,
      ]);
      return result.rows[0] ? toPharmacy(result.rows[0]).location : undefined;
    },

    async getLocationForTenant(tenantId: string): Promise<LocationRecord | undefined> {
      const result = await pool.query<PharmacyRow>(`${PHARMACY_SELECT} where p.tenant_id = $1`, [
        tenantId,
      ]);
      return result.rows[0] ? toPharmacy(result.rows[0]).location : undefined;
    },

    async updateLocationDisplayName(input: UpdateDisplayNameInput): Promise<PharmacyWithLocation> {
      const existing = await pool.query<PharmacyRow>(`${PHARMACY_SELECT} where p.tenant_id = $1`, [
        input.tenantId,
      ]);
      const current = existing.rows[0];
      if (!current) {
        throw new AppError(
          'Pharmacy not found',
          ErrorCode.PHARMACY_NOT_FOUND,
          HttpStatus.NOT_FOUND,
          undefined,
          'tenancy.errors.pharmacyNotFound',
        );
      }
      if (current.location_id !== input.locationId) {
        throw new AppError(
          'Location does not belong to this pharmacy',
          ErrorCode.LOCATION_TENANT_MISMATCH,
          HttpStatus.FORBIDDEN,
          undefined,
          'tenancy.errors.locationTenantMismatch',
        );
      }
      await pool.query(
        `update locations set display_name = $1, updated_at = now() where location_id = $2`,
        [input.displayName, input.locationId],
      );
      await pool.query(`update pharmacies set updated_at = now() where tenant_id = $1`, [
        input.tenantId,
      ]);
      const updated = await pool.query<PharmacyRow>(`${PHARMACY_SELECT} where p.tenant_id = $1`, [
        input.tenantId,
      ]);
      const row = updated.rows[0];
      if (!row) {
        throw new AppError(
          'Pharmacy not found',
          ErrorCode.PHARMACY_NOT_FOUND,
          HttpStatus.NOT_FOUND,
          undefined,
          'tenancy.errors.pharmacyNotFound',
        );
      }
      return toPharmacy(row);
    },
  };
}
