/** Product / legal brand strings shared across the dispensary shell. */
export const BRAND = {
  productName: 'MedMate',
  legalName: 'Medmate India Technology Private Limited',
} as const;

export function copyrightNotice(year: number = new Date().getFullYear()): string {
  return `© ${year} ${BRAND.legalName}`;
}
