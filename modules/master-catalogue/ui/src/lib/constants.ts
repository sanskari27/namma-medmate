export const SCHEDULES = ['OTC', 'H', 'H1', 'X'] as const;
export const GST_SLABS = [0, 5, 12, 18, 28] as const;

export type Schedule = (typeof SCHEDULES)[number];
export type GstSlab = (typeof GST_SLABS)[number];

export function parseScheduleValue(value: string | null | undefined): Schedule | undefined {
  return SCHEDULES.find((item) => item === value);
}

export function parseGstSlabValue(value: string | null | undefined): GstSlab | undefined {
  if (value == null || value === '') {
    return undefined;
  }
  const parsed = Number(value);
  return GST_SLABS.find((item) => item === parsed);
}
