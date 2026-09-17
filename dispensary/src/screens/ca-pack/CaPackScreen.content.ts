export const CA_PACK_CONTENT = {
  regionLabel: 'CA / Accountant',
  shareTitle: 'Download reports',
  period: 'Reporting period',
  sendTo: 'Hand to',
  include: 'Include reports',
  shareHint: 'Downloads a PDF pack for your CA. This is not a GSTR filing.',
  share: (count: number) =>
    count === 1 ? 'Download PDF pack (1 report)' : `Download PDF pack (${count} reports)`,
  advisorsTitle: 'Your CA & Accountant',
  addCa: '+ CA',
  addAccountant: '+ Accountant',
  snapshot: 'Snapshot (all data)',
  gstin: 'GSTIN',
  netRevenue: 'Net revenue',
  outputGst: 'Output GST',
  inputGst: 'Input GST credit',
  netGst: 'Net GST',
  history: 'Sharing history',
  historyEmpty: 'No packs shared yet. Download a pack to start the trail.',
  loading: 'Loading the CA pack…',
  save: 'Save',
  cancel: 'Cancel',
  remove: 'Remove',
  edit: 'Edit',
  fieldName: 'Name',
  fieldFirm: 'Firm / desk',
  fieldEmail: 'Email',
  fieldPhone: 'Phone',
} as const;

export const SHARE_TOGGLES = [
  { id: 'gst', label: 'GST summary', keys: ['GSTR1', 'GSTR3B'] },
  { id: 'sales', label: 'Sales register', keys: ['SALES_SUMMARY'] },
  { id: 'purchase', label: 'Purchase register', keys: ['PURCHASE_SUMMARY'] },
  { id: 'pnl', label: 'Profit & Loss statement', keys: ['PROFIT_AND_LOSS'] },
  { id: 'daybook', label: 'Day book', keys: ['DAY_BOOK'] },
] as const;

export type ShareToggleId = (typeof SHARE_TOGGLES)[number]['id'];
