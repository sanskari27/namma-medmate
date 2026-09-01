import { z } from 'zod';
import { GST_SLABS, SCHEDULES, type GstSlab, type Schedule } from '@namma-medmate/db-services';
import { uuidSchema } from '@namma-medmate/validation-schemas';
import { MasterCatalogueErrors } from '../errors.ts';
import { parseMoney } from './money.ts';

const createBodySchema = z.object({
  name: z.string().min(1),
  composition: z.string().min(1),
  manufacturer: z.string().min(1).nullable().optional(),
  brand: z.string().min(1).nullable().optional(),
  pack: z.string().min(1).nullable().optional(),
  form: z.string().min(1).nullable().optional(),
  category: z.string().min(1),
  schedule: z.string(),
  rx_only: z.boolean().optional(),
  hsn: z.string().min(1),
  gst_slab: z.number(),
  dpco_ceiling: z.string().nullable().optional(),
});

const patchBodySchema = createBodySchema.partial();

export function parseUuid(value: string | undefined, label: string): string {
  const result = uuidSchema.safeParse(value ?? '');
  if (!result.success) {
    throw MasterCatalogueErrors.validationFailed(`${label} must be a UUID`);
  }
  return result.data;
}

export function parseSkuId(params: { [key: string]: string | undefined }): string {
  return parseUuid(params.platform_master_sku_id, 'platform_master_sku_id');
}

export function parseLimit(raw: unknown): number {
  if (raw === undefined || raw === '') {
    return 50;
  }
  const parsed = z.coerce.number().int().min(1).safeParse(raw);
  if (!parsed.success) {
    throw MasterCatalogueErrors.validationFailed('limit must be a positive integer');
  }
  return Math.min(parsed.data, 200);
}

export function parseOptionalString(raw: unknown): string | undefined {
  if (raw === undefined || raw === '') {
    return undefined;
  }
  if (typeof raw !== 'string') {
    throw MasterCatalogueErrors.validationFailed('Filter values must be strings');
  }
  return raw;
}

export function parseOptionalBoolean(raw: unknown): boolean | undefined {
  if (raw === undefined || raw === '') {
    return undefined;
  }
  if (raw === true || raw === 'true') {
    return true;
  }
  if (raw === false || raw === 'false') {
    return false;
  }
  throw MasterCatalogueErrors.validationFailed('Boolean filters must be true or false');
}

export function parseSchedule(raw: unknown): Schedule {
  if (typeof raw !== 'string' || !SCHEDULES.includes(raw as Schedule)) {
    throw MasterCatalogueErrors.validationFailed('schedule must be OTC, H, H1, or X');
  }
  return raw as Schedule;
}

export function parseOptionalSchedule(raw: unknown): Schedule | undefined {
  if (raw === undefined || raw === '') {
    return undefined;
  }
  return parseSchedule(raw);
}

export function parseGstSlab(raw: unknown): GstSlab {
  const parsed = z.coerce.number().int().safeParse(raw);
  if (!parsed.success || !GST_SLABS.includes(parsed.data as GstSlab)) {
    throw MasterCatalogueErrors.invalidGstSlab();
  }
  return parsed.data as GstSlab;
}

export function parseOptionalGstSlab(raw: unknown): GstSlab | undefined {
  if (raw === undefined || raw === '') {
    return undefined;
  }
  return parseGstSlab(raw);
}

export function effectiveRxOnly(schedule: Schedule, rxOnly: boolean | undefined): boolean {
  if (schedule === 'H' || schedule === 'H1' || schedule === 'X') {
    return true;
  }
  return rxOnly ?? false;
}

export function parseCreateBody(body: unknown) {
  const parsed = createBodySchema.safeParse(body ?? {});
  if (!parsed.success) {
    throw MasterCatalogueErrors.validationFailed('Validation failed');
  }
  const schedule = parseSchedule(parsed.data.schedule);
  const gstSlab = parseGstSlab(parsed.data.gst_slab);
  const dpcoCeiling =
    parsed.data.dpco_ceiling === undefined ? undefined : parseMoney(parsed.data.dpco_ceiling, true);
  return {
    name: parsed.data.name,
    composition: parsed.data.composition,
    manufacturer: parsed.data.manufacturer ?? null,
    brand: parsed.data.brand ?? null,
    pack: parsed.data.pack ?? null,
    form: parsed.data.form ?? null,
    category: parsed.data.category,
    schedule,
    rxOnly: effectiveRxOnly(schedule, parsed.data.rx_only),
    hsn: parsed.data.hsn,
    gstSlab,
    dpcoCeiling: dpcoCeiling ?? null,
  };
}

export function parsePatchBody(body: unknown) {
  const parsed = patchBodySchema.safeParse(body ?? {});
  if (!parsed.success) {
    throw MasterCatalogueErrors.validationFailed('Validation failed');
  }
  const data = parsed.data;
  const schedule = data.schedule === undefined ? undefined : parseSchedule(data.schedule);
  const gstSlab = data.gst_slab === undefined ? undefined : parseGstSlab(data.gst_slab);
  return {
    name: data.name,
    composition: data.composition,
    manufacturer: data.manufacturer,
    brand: data.brand,
    pack: data.pack,
    form: data.form,
    category: data.category,
    schedule,
    rxOnly: data.rx_only,
    hsn: data.hsn,
    gstSlab,
  };
}

export function parseCeilingBody(body: unknown): string | null {
  if (!body || typeof body !== 'object' || !('dpco_ceiling' in body)) {
    throw MasterCatalogueErrors.validationFailed('dpco_ceiling is required');
  }
  return parseMoney((body as { dpco_ceiling: unknown }).dpco_ceiling, true);
}

export function parseAssertPriceBody(body: unknown): string {
  if (!body || typeof body !== 'object' || !('unit_price' in body)) {
    throw MasterCatalogueErrors.validationFailed('unit_price is required');
  }
  return parseMoney((body as { unit_price: unknown }).unit_price, false);
}

export function parseSubstituteIds(body: unknown, selfId: string): string[] {
  const parsed = z.object({ substitute_ids: z.array(z.string().uuid()) }).safeParse(body ?? {});
  if (!parsed.success) {
    throw MasterCatalogueErrors.validationFailed('substitute_ids must be UUIDs');
  }
  const ids = parsed.data.substitute_ids;
  if (new Set(ids).size !== ids.length) {
    throw MasterCatalogueErrors.validationFailed('substitute_ids must be unique');
  }
  if (ids.includes(selfId)) {
    throw MasterCatalogueErrors.validationFailed('A SKU cannot substitute itself');
  }
  return ids;
}

export function parseOptionalBooleanQuery(raw: unknown): boolean {
  return parseOptionalBoolean(raw) === true;
}
