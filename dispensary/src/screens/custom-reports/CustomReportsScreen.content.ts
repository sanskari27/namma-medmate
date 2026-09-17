export const CUSTOM_REPORTS_CONTENT = {
  title: 'Build a report',
  subtitle: 'Sales & GST summary',
  catalogSubtitle: 'Pick a dataset, then choose columns and dates',
  regionLabel: 'Build a report',
  filterBy: 'Filter By',
  findReport: 'Find report…',
  allReports: 'All reports',
  openPlan: 'Open the plan',
  loading: 'Loading the report builder…',
  empty: 'No rows for this pick. Change the dates or columns and show rows again.',
  noMatches: 'No reports match that search.',
  tabs: {
    columns: 'Columns',
    filters: 'Filters',
    preview: 'Preview',
  },
  exportSheet: 'CSV',
  exportPdf: 'PDF',
  showRows: 'Show rows',
  outlet: 'Outlet',
  thisOutlet: 'This outlet',
  allOutlets: 'All outlets',
  from: 'From',
  to: 'To',
  stats: {
    rows: 'Rows',
    columns: 'Columns',
    dataset: 'Dataset',
    truncated: 'Preview cap',
  },
  groups: {
    Favourite: 'Favourite',
    Transaction: 'Transaction',
    Item: 'Item',
    Party: 'Party',
  },
} as const;

export const CATALOG_FILTER_CHIPS = [
  'All',
  'Favourite',
  'Transaction',
  'Item',
  'Party',
] as const;

export type CatalogFilterChip = (typeof CATALOG_FILTER_CHIPS)[number];
