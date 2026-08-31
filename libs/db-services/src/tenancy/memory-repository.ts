import { AppError } from '@namma-medmate/error-handling';
import { ErrorCode, HttpStatus } from '@namma-medmate/constants';
import { createId } from '@namma-medmate/id-generator';
import { decodeCursor, encodeCursor } from '@namma-medmate/pagination-utils';
import type {
  CreatePharmacyInput,
  ListPharmaciesInput,
  ListPharmaciesResult,
  LocationRecord,
  PharmacyWithLocation,
  TenancyRepository,
  UpdateDisplayNameInput,
} from './types.ts';

function clonePharmacy(pharmacy: PharmacyWithLocation): PharmacyWithLocation {
  return {
    ...pharmacy,
    createdAt: new Date(pharmacy.createdAt),
    updatedAt: new Date(pharmacy.updatedAt),
    location: {
      ...pharmacy.location,
      createdAt: new Date(pharmacy.location.createdAt),
      updatedAt: new Date(pharmacy.location.updatedAt),
    },
  };
}

export function createMemoryTenancyRepository(seed?: PharmacyWithLocation): TenancyRepository {
  const pharmacies = new Map<string, PharmacyWithLocation>();
  if (seed) {
    pharmacies.set(seed.tenantId, seed);
  }

  return {
    async createPharmacyWithLocation(input: CreatePharmacyInput): Promise<PharmacyWithLocation> {
      const now = new Date();
      const tenantId = createId();
      const locationId = createId();
      const record: PharmacyWithLocation = {
        tenantId,
        gstDealerType: input.gstDealerType,
        businessType: input.businessType,
        createdAt: now,
        updatedAt: now,
        location: {
          locationId,
          tenantId,
          displayName: input.displayName,
          createdAt: now,
          updatedAt: now,
        },
      };
      pharmacies.set(tenantId, record);
      return clonePharmacy(record);
    },

    async getPharmacyByTenantId(tenantId: string): Promise<PharmacyWithLocation | undefined> {
      const record = pharmacies.get(tenantId);
      return record ? clonePharmacy(record) : undefined;
    },

    async listPharmacies(input: ListPharmaciesInput): Promise<ListPharmaciesResult> {
      const after = decodeCursor(input.cursor);
      const sorted = [...pharmacies.values()].sort((a, b) => a.tenantId.localeCompare(b.tenantId));
      const filtered = after ? sorted.filter((row) => row.tenantId > after) : sorted;
      const page = filtered.slice(0, input.limit + 1);
      const hasMore = page.length > input.limit;
      const items = (hasMore ? page.slice(0, input.limit) : page).map((row) => ({
        tenantId: row.tenantId,
        locationId: row.location.locationId,
        displayName: row.location.displayName,
      }));
      return {
        items,
        nextCursor: hasMore ? encodeCursor(items[items.length - 1]!.tenantId) : null,
      };
    },

    async getLocationById(locationId: string): Promise<LocationRecord | undefined> {
      for (const pharmacy of pharmacies.values()) {
        if (pharmacy.location.locationId === locationId) {
          return { ...pharmacy.location };
        }
      }
      return undefined;
    },

    async getLocationForTenant(tenantId: string): Promise<LocationRecord | undefined> {
      const pharmacy = pharmacies.get(tenantId);
      return pharmacy ? { ...pharmacy.location } : undefined;
    },

    async updateLocationDisplayName(input: UpdateDisplayNameInput): Promise<PharmacyWithLocation> {
      const pharmacy = pharmacies.get(input.tenantId);
      if (!pharmacy) {
        throw new AppError(
          'Pharmacy not found',
          ErrorCode.PHARMACY_NOT_FOUND,
          HttpStatus.NOT_FOUND,
          undefined,
          'tenancy.errors.pharmacyNotFound',
        );
      }
      if (pharmacy.location.locationId !== input.locationId) {
        throw new AppError(
          'Location does not belong to this pharmacy',
          ErrorCode.LOCATION_TENANT_MISMATCH,
          HttpStatus.FORBIDDEN,
          undefined,
          'tenancy.errors.locationTenantMismatch',
        );
      }
      const now = new Date();
      pharmacy.location.displayName = input.displayName;
      pharmacy.location.updatedAt = now;
      pharmacy.updatedAt = now;
      return clonePharmacy(pharmacy);
    },
  };
}
