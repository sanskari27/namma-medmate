import type { StoryScenario } from '@namma-medmate/story-generator';
import { PERMISSION_KEYS } from '../lib/permissions.ts';
import type { ManageUserDetail, ManageUserListItem } from '../store/api/manage-users-api.ts';
import type { SeatSummary } from '../lib/seats.ts';

const LOCATION = '1a2b3c4d-5e6f-7081-92a3-b4c5d6e7f809';

function allTrue(): Record<string, boolean> {
  return Object.fromEntries(PERMISSION_KEYS.map((key) => [key, true]));
}

export const ownerUser: ManageUserDetail = {
  user_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  login_id: 'priya.owner',
  role: 'owner',
  permissions: allTrue(),
  active: true,
  employee_id: null,
  otp_mobile: '+919876543210',
  password_enabled: true,
  otp_enabled: true,
  pin_set: true,
  temp_password_pending: false,
  saved_device_count: 0,
  saved_devices: [],
  created_at: '2026-08-01T10:00:00Z',
  updated_at: '2026-08-15T10:00:00Z',
};

export const cashierUser: ManageUserDetail = {
  user_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  login_id: 'ravi.cashier',
  role: 'cashier',
  permissions: {
    ...Object.fromEntries(PERMISSION_KEYS.map((key) => [key, false])),
    'pos-billing': true,
    orders: true,
    khata: true,
    customers: true,
    returns: true,
  },
  active: true,
  employee_id: 'e_01',
  otp_mobile: '+919876543211',
  password_enabled: true,
  otp_enabled: false,
  pin_set: false,
  temp_password_pending: true,
  saved_device_count: 1,
  saved_devices: [
    {
      device_id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      label: 'Counter iPad',
      last_seen_at: '2026-08-20T10:00:00Z',
      created_at: '2026-08-01T10:00:00Z',
    },
  ],
  created_at: '2026-08-02T10:00:00Z',
  updated_at: '2026-08-16T10:00:00Z',
};

const freeSeats: SeatSummary = {
  plan: 'free',
  seat_limit: 2,
  active_count: 1,
  unlimited: false,
};

const capSeats: SeatSummary = { ...freeSeats, active_count: 2 };
const unlimitedSeats: SeatSummary = {
  plan: 'pro',
  seat_limit: null,
  active_count: 3,
  unlimited: true,
};

const ownerItem: ManageUserListItem = ownerUser;
const cashierItem: ManageUserListItem = cashierUser;

export const manageUsersPageScenarios = [
  {
    id: 'free-with-seat',
    title: 'Free with an open seat',
    description: 'Owner plus room to add a Cashier on Free.',
    props: {
      skipQuery: true,
      locationId: LOCATION,
      seats: freeSeats,
      items: [ownerItem],
    },
  },
  {
    id: 'at-cap',
    title: 'Free seat cap reached',
    description: 'Add user is disabled and names Growth and Pro.',
    props: {
      skipQuery: true,
      locationId: LOCATION,
      seats: capSeats,
      items: [ownerItem, cashierItem],
    },
  },
  {
    id: 'cashier-drawer',
    title: 'Cashier drawer',
    description: 'Open a Cashier with copy password and devices.',
    props: {
      skipQuery: true,
      locationId: LOCATION,
      seats: capSeats,
      items: [ownerItem, cashierItem],
      selectedUserId: cashierUser.user_id,
      selectedUser: cashierUser,
    },
  },
  {
    id: 'owner-drawer',
    title: 'Owner drawer',
    description: 'Owner role and permissions stay locked.',
    props: {
      skipQuery: true,
      locationId: LOCATION,
      seats: unlimitedSeats,
      items: [ownerItem],
      selectedUserId: ownerUser.user_id,
      selectedUser: ownerUser,
    },
  },
  {
    id: 'empty',
    title: 'Empty list',
    description: 'No staff users yet.',
    props: {
      skipQuery: true,
      locationId: LOCATION,
      seats: { ...freeSeats, active_count: 0 },
      items: [],
    },
  },
  {
    id: 'load-error',
    title: 'Load error',
    description: 'List request failed.',
    props: {
      skipQuery: true,
      error: true,
      locationId: LOCATION,
      seats: freeSeats,
      items: [],
    },
  },
] as const satisfies readonly StoryScenario[];
