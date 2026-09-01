import type { PlatformMasterSkuRecord, SubstituteRecord } from '@namma-medmate/db-services';

export function toListItem(record: PlatformMasterSkuRecord) {
  return {
    platform_master_sku_id: record.platformMasterSkuId,
    name: record.name,
    composition: record.composition,
    category: record.category,
    schedule: record.schedule,
    rx_only: record.rxOnly,
    gst_slab: record.gstSlab,
    dpco_ceiling: record.dpcoCeiling,
    banned: record.banned,
  };
}

export function toMasterSku(record: PlatformMasterSkuRecord) {
  return {
    platform_master_sku_id: record.platformMasterSkuId,
    name: record.name,
    composition: record.composition,
    manufacturer: record.manufacturer,
    brand: record.brand,
    pack: record.pack,
    form: record.form,
    category: record.category,
    schedule: record.schedule,
    rx_only: record.rxOnly,
    hsn: record.hsn,
    gst_slab: record.gstSlab,
    dpco_ceiling: record.dpcoCeiling,
    banned: record.banned,
  };
}

export function toSubstitute(record: SubstituteRecord) {
  return {
    platform_master_sku_id: record.platformMasterSkuId,
    name: record.name,
    schedule: record.schedule,
    banned: record.banned,
  };
}

export function toDetail(record: PlatformMasterSkuRecord, substitutes: SubstituteRecord[]) {
  return {
    ...toMasterSku(record),
    substitutes: substitutes.map(toSubstitute),
  };
}
