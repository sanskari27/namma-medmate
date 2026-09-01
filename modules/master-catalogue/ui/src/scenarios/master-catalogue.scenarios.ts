import type { StoryScenario } from '@namma-medmate/story-generator';
import type {
  MasterSkuDetail,
  MasterSkuListItem,
  StockingPharmacy,
} from '../store/api/master-catalogue-api.ts';

export const paracetamol: MasterSkuListItem = {
  platform_master_sku_id: '11111111-1111-4111-8111-111111111111',
  name: 'Paracetamol 500mg',
  composition: 'Paracetamol 500mg',
  category: 'Fever',
  schedule: 'OTC',
  rx_only: false,
  gst_slab: 12,
  dpco_ceiling: '20.00',
  banned: false,
};

export const bannedH1: MasterSkuListItem = {
  platform_master_sku_id: '22222222-2222-4222-8222-222222222222',
  name: 'Tramadol 50mg',
  composition: 'Tramadol',
  category: 'Pain',
  schedule: 'H1',
  rx_only: true,
  gst_slab: 12,
  dpco_ceiling: null,
  banned: true,
};

export const paracetamolDetail: MasterSkuDetail = {
  ...paracetamol,
  manufacturer: 'Example Labs',
  brand: 'Calpol',
  pack: '10 tablets',
  form: 'tablet',
  hsn: '3004',
  substitutes: [
    {
      platform_master_sku_id: bannedH1.platform_master_sku_id,
      name: bannedH1.name,
      schedule: bannedH1.schedule,
      banned: bannedH1.banned,
    },
  ],
};

export const stockingRow: StockingPharmacy = {
  tenant_id: '8f1c0a7e-2b3d-4e5f-8a90-123456789abc',
  location_id: '1a2b3c4d-5e6f-7081-92a3-b4c5d6e7f809',
  display_name: 'Sri Krishna Medicals',
};

export const listScenarios = [
  {
    id: 'loaded',
    title: 'Loaded master catalogue',
    description: 'HQ list with search, filters, and add medicine.',
    props: { skipQuery: true, items: [paracetamol, bannedH1] },
  },
  {
    id: 'empty',
    title: 'Empty master catalogue',
    description: 'No medicines match.',
    props: { skipQuery: true, items: [] },
  },
  {
    id: 'load-error',
    title: 'Master catalogue load error',
    description: 'Query failed.',
    props: { skipQuery: true, items: [], error: true },
  },
] as const satisfies readonly StoryScenario[];

export const drawerScenarios = [
  {
    id: 'loaded',
    title: 'Medicine drawer',
    description: 'Composition, substitutes, stocking, ceiling, and ban.',
    props: { skipQuery: true, sku: paracetamolDetail, stockingItems: [stockingRow] },
  },
  {
    id: 'empty-stocking',
    title: 'Drawer with empty stocking',
    description: 'No pharmacies currently map this medicine.',
    props: { skipQuery: true, sku: paracetamolDetail, stockingItems: [] },
  },
] as const satisfies readonly StoryScenario[];

export const addModalScenarios = [
  {
    id: 'open',
    title: 'Add medicine modal',
    description: 'POST fields for a new platform master SKU.',
    props: { skipQuery: true, open: true },
  },
] as const satisfies readonly StoryScenario[];
