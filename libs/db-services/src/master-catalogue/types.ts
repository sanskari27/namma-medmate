export const SCHEDULES = ['OTC', 'H', 'H1', 'X'] as const;
export type Schedule = (typeof SCHEDULES)[number];

export const GST_SLABS = [0, 5, 12, 18, 28] as const;
export type GstSlab = (typeof GST_SLABS)[number];

export interface PlatformMasterSkuRecord {
  platformMasterSkuId: string;
  name: string;
  composition: string;
  manufacturer: string | null;
  brand: string | null;
  pack: string | null;
  form: string | null;
  category: string;
  schedule: Schedule;
  rxOnly: boolean;
  hsn: string;
  gstSlab: GstSlab;
  dpcoCeiling: string | null;
  banned: boolean;
  bannedAt: Date | null;
  bannedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubstituteRecord {
  platformMasterSkuId: string;
  name: string;
  schedule: Schedule;
  banned: boolean;
  sortOrder: number;
}

export interface CreatePlatformMasterSkuInput {
  name: string;
  composition: string;
  manufacturer?: string | null;
  brand?: string | null;
  pack?: string | null;
  form?: string | null;
  category: string;
  schedule: Schedule;
  rxOnly: boolean;
  hsn: string;
  gstSlab: GstSlab;
  dpcoCeiling?: string | null;
}

export interface UpdatePlatformMasterSkuInput {
  name?: string;
  composition?: string;
  manufacturer?: string | null;
  brand?: string | null;
  pack?: string | null;
  form?: string | null;
  category?: string;
  schedule?: Schedule;
  rxOnly?: boolean;
  hsn?: string;
  gstSlab?: GstSlab;
}

export interface ListPlatformMasterSkusInput {
  category?: string;
  schedule?: Schedule;
  gstSlab?: GstSlab;
  rxOnly?: boolean;
  banned?: boolean;
  q?: string;
  limit: number;
  cursor?: string;
}

export interface ListPlatformMasterSkusResult {
  items: PlatformMasterSkuRecord[];
  nextCursor: string | null;
}

export interface MasterCatalogueRepository {
  createSku(input: CreatePlatformMasterSkuInput): Promise<PlatformMasterSkuRecord>;
  getById(platformMasterSkuId: string): Promise<PlatformMasterSkuRecord | undefined>;
  getByIds(ids: string[]): Promise<PlatformMasterSkuRecord[]>;
  listSkus(input: ListPlatformMasterSkusInput): Promise<ListPlatformMasterSkusResult>;
  updateSku(
    platformMasterSkuId: string,
    input: UpdatePlatformMasterSkuInput,
  ): Promise<PlatformMasterSkuRecord | undefined>;
  setCeiling(
    platformMasterSkuId: string,
    dpcoCeiling: string | null,
  ): Promise<PlatformMasterSkuRecord | undefined>;
  ban(
    platformMasterSkuId: string,
    bannedByUserId: string,
  ): Promise<PlatformMasterSkuRecord | undefined>;
  unban(platformMasterSkuId: string): Promise<PlatformMasterSkuRecord | undefined>;
  replaceSubstitutes(
    platformMasterSkuId: string,
    substituteIds: string[],
  ): Promise<SubstituteRecord[]>;
  listSubstitutes(platformMasterSkuId: string, forPos?: boolean): Promise<SubstituteRecord[]>;
}
