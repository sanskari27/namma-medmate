import type { StoryScenario } from '@namma-medmate/story-generator';
import type { AuditEventItem } from '../store/api/audit-api.ts';

export const billEvent: AuditEventItem = {
  audit_event_id: '9d9d9d9d-0000-4111-8222-333344445555',
  tenant_id: '8f1c0a7e-2b3d-4e5f-8a90-123456789abc',
  location_id: '1a2b3c4d-5e6f-7081-92a3-b4c5d6e7f809',
  actor_user_id: 'user-111',
  actor_role: 'Pharmacist',
  actor_surface: 'pharmacy',
  action: 'bill_posted',
  target_type: 'Bill',
  target_id: 'INV-24-00018',
  money_or_stock: true,
  before: { batch_qty: { 'SKU1:B1': 10 } },
  after: { batch_qty: { 'SKU1:B1': 8 } },
  occurred_at: '2026-08-31T12:00:00.120Z',
};

export const tableScenarios = [
  {
    id: 'loaded',
    title: 'Loaded audit table',
    description: 'Pharmacy audit rows with before/after snapshots.',
    props: { skipQuery: true, items: [billEvent] },
  },
  {
    id: 'empty',
    title: 'Empty audit table',
    description: 'No events for this shop.',
    props: { skipQuery: true, items: [] },
  },
  {
    id: 'load-error',
    title: 'Audit load error',
    description: 'Query failed.',
    props: { skipQuery: true, items: [], error: true },
  },
] as const satisfies readonly StoryScenario[];

export const hqTableScenarios = [
  {
    id: 'loaded',
    title: 'HQ audit table',
    description: 'Platform admin table with tenant column.',
    props: { skipQuery: true, items: [billEvent] },
  },
] as const satisfies readonly StoryScenario[];
