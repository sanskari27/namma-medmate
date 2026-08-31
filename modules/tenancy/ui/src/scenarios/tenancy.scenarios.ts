import type { StoryScenario } from '@namma-medmate/story-generator';

export const shopIdentityScenarios = [
  {
    id: 'loaded',
    title: 'Loaded shop',
    description: 'One-shop badge with Location display_name.',
    props: { skipQuery: true },
    preloadedState: {
      tenant: {
        status: 'ready',
        tenantId: '8f1c0a7e-2b3d-4e5f-8a90-123456789abc',
        locationId: '1a2b3c4d-5e6f-7081-92a3-b4c5d6e7f809',
        displayName: 'Sri Krishna Medicals',
      },
    },
  },
  {
    id: 'error',
    title: 'Location required',
    description: 'Pharmacy call omitted location_id.',
    props: { skipQuery: true },
    preloadedState: {
      tenant: {
        status: 'error',
        message: 'tenancy.errors.locationIdRequired',
      },
    },
  },
  {
    id: 'cashier-forbidden',
    title: 'Cashier cannot rename',
    description: 'Owner-only rename is refused for Cashier.',
    props: { skipQuery: true },
    preloadedState: {
      tenant: {
        status: 'error',
        message: 'tenancy.errors.forbiddenRole',
      },
    },
  },
] as const satisfies readonly StoryScenario[];

export const createPharmacyScenarios = [
  {
    id: 'empty',
    title: 'Empty create form',
    description: 'HQ create fields with locked Regular GST and retail copy.',
    props: {},
  },
] as const satisfies readonly StoryScenario[];

export const renameShopScenarios = [
  {
    id: 'owner',
    title: 'Owner rename form',
    description: 'Owner can submit a new display name.',
    props: { skipMutation: true },
    preloadedState: {
      tenant: {
        status: 'ready',
        tenantId: '8f1c0a7e-2b3d-4e5f-8a90-123456789abc',
        locationId: '1a2b3c4d-5e6f-7081-92a3-b4c5d6e7f809',
        displayName: 'Sri Krishna Medicals',
      },
    },
  },
] as const satisfies readonly StoryScenario[];
