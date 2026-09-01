import type { StoryScenario } from '@namma-medmate/story-generator';
import type {
  EmployeeDetail,
  EmployeeListItem,
  EmployeeSummary,
} from '../store/api/employees-api.ts';

const LOCATION = '1a2b3c4d-5e6f-7081-92a3-b4c5d6e7f809';

export const summaryFixture: EmployeeSummary = {
  headcount: { total: 3, active: 2, inactive: 0, separated: 1 },
  composition: [
    { position: 'pharmacist', count: 1 },
    { position: 'cashier', count: 1 },
  ],
};

export const pharmacist: EmployeeDetail = {
  employee_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  employee_code: 'EMP-0001',
  full_name: 'Anita Sharma',
  phone: '+919812345678',
  position: 'pharmacist',
  position_label: null,
  status: 'active',
  join_date: '2024-06-01',
  user_id: 'u-1',
  pharmacist_eligible: true,
  photo_url: 'https://example.test/anita.jpg',
  aadhaar_masked: 'XXXX-XXXX-1234',
  email: 'anita@example.com',
  date_of_birth: '1990-04-12',
  gender: 'female',
  address: '12 MG Road',
  pan: 'ABCDE1234F',
  aadhaar: '123412341234',
  pharmacist_registration_no: 'KA-12345',
  pharmacist_registration_expiry: '2027-03-31',
  bank_account_holder: 'Anita Sharma',
  bank_account_number: null,
  bank_ifsc: 'HDFC0001234',
  bank_upi_id: 'anita@hdfc',
  emergency_name: 'Ravi Sharma',
  emergency_phone: '+919811112222',
  emergency_relation: 'spouse',
  documents: [
    {
      document_id: 'd-1',
      type: 'id_proof',
      object_key: 'k',
      file_name: 'id.pdf',
      uploaded_at: '2026-08-01T10:00:00Z',
      download_url: null,
    },
  ],
};

export const cashier: EmployeeListItem = {
  employee_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  employee_code: 'EMP-0002',
  full_name: 'Ravi Kumar',
  phone: '+919800000002',
  position: 'cashier',
  position_label: null,
  status: 'active',
  join_date: null,
  user_id: null,
  pharmacist_eligible: false,
  photo_url: null,
  aadhaar_masked: null,
};

export const separated: EmployeeListItem = {
  employee_id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  employee_code: 'EMP-0003',
  full_name: 'Neha Singh',
  phone: '+919800000003',
  position: 'helper',
  position_label: null,
  status: 'separated',
  join_date: null,
  user_id: null,
  pharmacist_eligible: false,
  photo_url: null,
  aadhaar_masked: null,
};

const directoryItems: EmployeeListItem[] = [pharmacist, cashier, separated];

export const employeesPageScenarios = [
  {
    id: 'directory',
    title: 'Directory with composition',
    description: 'Headcount tiles, bars, and mixed statuses including a pharmacist.',
    props: {
      skipQuery: true,
      locationId: LOCATION,
      summary: summaryFixture,
      items: directoryItems,
    },
  },
  {
    id: 'plan-locked',
    title: 'Starter lock',
    description: 'Free plan sees the lock copy, not a staff table.',
    props: {
      skipQuery: true,
      planLocked: true,
    },
  },
  {
    id: 'empty',
    title: 'Empty directory',
    description: 'No employees yet.',
    props: {
      skipQuery: true,
      locationId: LOCATION,
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
      items: [],
    },
  },
  {
    id: 'employee-drawer',
    title: 'Employee drawer',
    description: 'Open a pharmacist with ID card and documents.',
    props: {
      skipQuery: true,
      locationId: LOCATION,
      summary: summaryFixture,
      items: directoryItems,
      selectedEmployeeId: pharmacist.employee_id,
      selectedEmployee: pharmacist,
    },
  },
] as const satisfies readonly StoryScenario[];
