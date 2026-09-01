import type { StoryScenario } from '@namma-medmate/story-generator';
import type { QueueItem, StatusData } from '../store/api/go-live-kyc-api.ts';

const LOCATION = '1a2b3c4d-5e6f-7081-92a3-b4c5d6e7f809';

export const startStatus: StatusData = {
  kyc_status: 'not_submitted',
  wizard_status: 'not_started',
  kyc_reject_reason: null,
  gstin: null,
  pan: null,
  bank_account_number_masked: null,
  wizard_progress: { steps: {} },
  gate: {
    allowed: false,
    kyc_status: 'not_submitted',
    wizard_status: 'not_started',
    blockers: ['GO_LIVE_KYC_INCOMPLETE', 'GO_LIVE_WIZARD_INCOMPLETE'],
  },
};

export const rejectedStatus: StatusData = {
  ...startStatus,
  kyc_status: 'rejected',
  kyc_reject_reason: 'FSSAI missing for food SKUs',
  gate: {
    allowed: false,
    kyc_status: 'rejected',
    wizard_status: 'in_progress',
    blockers: ['GO_LIVE_KYC_REJECTED'],
    reject_reason: 'FSSAI missing for food SKUs',
  },
};

export const completedStatus: StatusData = {
  ...startStatus,
  kyc_status: 'approved',
  wizard_status: 'completed',
  gate: {
    allowed: true,
    kyc_status: 'approved',
    wizard_status: 'completed',
    blockers: [],
  },
};

export const pendingItem: QueueItem = {
  tenant_id: '8f1c0a7e-2b3d-4e5f-8a90-123456789abc',
  location_id: LOCATION,
  pharmacy_name: 'Sri Krishna Medicals',
  gstin: '29ABCDE1234F1Z5',
  kyc_status: 'pending',
  submitted_at: '2026-08-30T10:00:00Z',
  plan: 'free',
};

export const wizardScenarios = [
  {
    id: 'start',
    title: 'Wizard start',
    description: 'Owner begins KYC and setup.',
    props: { skipQuery: true, locationId: LOCATION, status: startStatus },
  },
  {
    id: 'rejected',
    title: 'KYC rejected',
    description: 'HQ reason is shown on the wizard.',
    props: { skipQuery: true, locationId: LOCATION, status: rejectedStatus },
  },
  {
    id: 'complete',
    title: 'Wizard complete',
    description: 'Re-run is available after completion.',
    props: { skipQuery: true, locationId: LOCATION, status: completedStatus },
  },
  {
    id: 'load-error',
    title: 'Load error',
    description: 'Status request failed.',
    props: { skipQuery: true, error: true, locationId: LOCATION },
  },
] as const satisfies readonly StoryScenario[];

export const queueScenarios = [
  {
    id: 'pending',
    title: 'Pending queue',
    description: 'HQ can approve or reject.',
    props: { skipQuery: true, items: [pendingItem] },
  },
  {
    id: 'empty',
    title: 'Empty queue',
    description: 'No pending KYC.',
    props: { skipQuery: true, items: [] },
  },
  {
    id: 'load-error',
    title: 'Queue error',
    description: 'Queue request failed.',
    props: { skipQuery: true, error: true, items: [] },
  },
] as const satisfies readonly StoryScenario[];
