import type { GstSlab, Schedule } from './constants.ts';
import type { MasterSkuListItem } from '../store/api/master-catalogue-api.ts';

export interface SkuFilters {
  q?: string;
  category?: string;
  schedule?: Schedule;
  gstSlab?: GstSlab;
  rxOnly?: boolean;
  banned?: boolean;
}

export function applySkuFilters(
  items: MasterSkuListItem[],
  filters: SkuFilters,
): MasterSkuListItem[] {
  const q = filters.q?.trim().toLowerCase();
  return items.filter((item) => {
    if (q) {
      const haystack = `${item.name} ${item.composition}`.toLowerCase();
      if (!haystack.includes(q)) {
        return false;
      }
    }
    if (filters.category && item.category !== filters.category) {
      return false;
    }
    if (filters.schedule && item.schedule !== filters.schedule) {
      return false;
    }
    if (filters.gstSlab !== undefined && item.gst_slab !== filters.gstSlab) {
      return false;
    }
    if (filters.rxOnly && !item.rx_only) {
      return false;
    }
    if (filters.banned && !item.banned) {
      return false;
    }
    return true;
  });
}

export function toDetail(
  item: MasterSkuListItem,
  substitutes: MasterSkuListItem[] = [],
): {
  platform_master_sku_id: string;
  name: string;
  composition: string;
  manufacturer: string | null;
  brand: string | null;
  pack: string | null;
  form: string | null;
  category: string;
  schedule: MasterSkuListItem['schedule'];
  rx_only: boolean;
  hsn: string;
  gst_slab: MasterSkuListItem['gst_slab'];
  dpco_ceiling: string | null;
  banned: boolean;
  substitutes: Array<{
    platform_master_sku_id: string;
    name: string;
    schedule: MasterSkuListItem['schedule'];
    banned: boolean;
  }>;
} {
  return {
    platform_master_sku_id: item.platform_master_sku_id,
    name: item.name,
    composition: item.composition,
    manufacturer: null,
    brand: null,
    pack: null,
    form: null,
    category: item.category,
    schedule: item.schedule,
    rx_only: item.rx_only,
    hsn: '',
    gst_slab: item.gst_slab,
    dpco_ceiling: item.dpco_ceiling ?? null,
    banned: item.banned,
    substitutes: substitutes.map((substitute) => ({
      platform_master_sku_id: substitute.platform_master_sku_id,
      name: substitute.name,
      schedule: substitute.schedule,
      banned: substitute.banned,
    })),
  };
}
