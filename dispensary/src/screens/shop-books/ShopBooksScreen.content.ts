export const SHOP_BOOKS_CONTENT = {
  regionLabel: 'Shop books',
  findReport: 'Find report…',
  filterBy: 'Filter By',
  favourite: 'Favourite',
  gst: 'GST',
  transaction: 'Transaction',
  allReports: '← All reports',
  excel: 'Excel',
  pdf: 'PDF',
  loading: 'Loading shop book…',
  empty: 'No rows in this shop book yet. Complete a sale or post spend and it lands here.',
  total: 'Total',
} as const;

export const FILTER_CHIPS = [
  { id: 'party', label: 'Party' },
  { id: 'category', label: 'Category' },
  { id: 'payment', label: 'Payment Collection' },
  { id: 'invoice', label: 'Invoice Details' },
  { id: 'summary', label: 'Summary' },
] as const;

export type FilterChipId = (typeof FILTER_CHIPS)[number]['id'];
