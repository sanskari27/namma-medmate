import { ROUTES } from '@/libs/constants/routes.const';
import type { Branch } from '@/services/branches';
import type { ComplianceLicense } from '@/services/licenses';
import type { StaffAccount } from '@/services/staff';
import type { CurrentSubscription } from '@/services/subscriptions';
import type { KycStatus } from '@/services/tenant';

export type PageStatus =
  | 'loading'
  | 'empty'
  | 'validation'
  | 'denied'
  | 'conflict'
  | 'failure'
  | 'success'
  | 'submitted'
  | 'rejected'
  | 'approved'
  | null;

export function isOwner(role: string | undefined): boolean {
  return role === 'pharmacy_owner';
}

export function licenseTypeLabel(type: ComplianceLicense['docType']): string {
  switch (type) {
    case 'DRUG_LICENSE':
      return 'Drug licence';
    case 'GST':
      return 'GST';
    case 'FSSAI':
      return 'FSSAI licence';
    case 'PHARMACIST_REGISTRATION':
      return 'Registered pharmacist';
    default:
      return type;
  }
}

export function formatRupees(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export function formatIstDate(value: string | null | undefined): string {
  if (!value) {
    return '—';
  }
  const date = value.length === 10 ? new Date(`${value}T00:00:00Z`) : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeZone: 'Asia/Kolkata',
  }).format(date);
}

export function planLabel(code: string | undefined): string {
  switch (code) {
    case 'FREE':
      return 'Free';
    case 'STARTER':
      return 'Starter';
    case 'GROWTH':
      return 'Growth';
    case 'PRO':
      return 'Pro';
    default:
      return code ?? 'Plan';
  }
}

export function tenantTone(status: string | null | undefined): 'green' | 'gold' | 'rose' {
  if (status === 'ACTIVE') {
    return 'green';
  }
  if (status === 'VERIFICATION_REQUIRED') {
    return 'gold';
  }
  return 'rose';
}

export function tenantLabel(status: string | null | undefined): string {
  switch (status) {
    case 'ACTIVE':
      return 'Active';
    case 'VERIFICATION_REQUIRED':
      return 'KYC pending';
    case 'SUSPENDED':
      return 'Suspended';
    case 'EXPIRED':
      return 'Expired';
    case 'TERMINATED':
      return 'Closed';
    default:
      return status ?? 'Unknown';
  }
}

export function pickOutlet(branches: Branch[]): Branch | null {
  return branches.find((row) => row.defaultBranch) ?? branches[0] ?? null;
}

export function pharmacyAddress(branch: Branch | null): string {
  if (!branch) {
    return 'Add an outlet address from Outlets.';
  }
  return [branch.addressLine, branch.city, branch.pincode].filter(Boolean).join(', ');
}

export function roleLabel(row: StaffAccount): string {
  if (row.role === 'pharmacy_owner') {
    return 'Owner';
  }
  return row.kind === 'PHARMACIST' ? 'Pharmacist' : 'Staff';
}

export function roleTone(label: string): 'gold' | 'blue' | 'green' | 'tag' {
  if (label === 'Owner') {
    return 'gold';
  }
  if (label === 'Pharmacist') {
    return 'green';
  }
  if (label === 'Staff') {
    return 'blue';
  }
  return 'tag';
}

export function teamByRole(staff: StaffAccount[]): { label: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const row of staff) {
    const label = roleLabel(row);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()].map(([label, count]) => ({ label, count }));
}

export type CompletenessItem = {
  id: string;
  label: string;
  done: boolean;
  href: string;
};

export function completenessItems(
  pack: KycStatus | null,
  licenses: ComplianceLicense[],
  branches: Branch[],
  staff: StaffAccount[],
): CompletenessItem[] {
  const has = (type: ComplianceLicense['docType']) => licenses.some((row) => row.docType === type);
  return [
    {
      id: 'kyc',
      label: 'KYC pack',
      done: pack?.status === 'APPROVED' || pack?.tenantStatus === 'ACTIVE',
      href: ROUTES.ACCOUNT,
    },
    { id: 'drug', label: 'Drug licence', done: has('DRUG_LICENSE'), href: ROUTES.LICENSES },
    { id: 'gst', label: 'GST', done: has('GST'), href: ROUTES.LICENSES },
    { id: 'fssai', label: 'FSSAI licence', done: has('FSSAI'), href: ROUTES.LICENSES },
    {
      id: 'pharmacist',
      label: 'Registered pharmacist',
      done: has('PHARMACIST_REGISTRATION'),
      href: ROUTES.LICENSES,
    },
    { id: 'outlet', label: 'Outlet address', done: branches.length > 0, href: ROUTES.BRANCHES },
    {
      id: 'staff',
      label: 'Staff login',
      done: staff.some((row) => row.role === 'pharmacy_staff'),
      href: ROUTES.USERS,
    },
    {
      id: 'plan',
      label: 'Active plan',
      done: pack?.tenantStatus === 'ACTIVE',
      href: ROUTES.SUBSCRIPTION,
    },
  ];
}

export function seatsLabel(sub: CurrentSubscription | null): string {
  if (!sub) {
    return '—';
  }
  if (sub.maxUsers == null) {
    return `${sub.usersUsed} / open`;
  }
  return `${sub.usersUsed} / ${sub.maxUsers}`;
}

export function modulesLabel(sub: CurrentSubscription | null): string {
  if (!sub) {
    return '—';
  }
  return `${sub.entitledModules.length} unlocked`;
}

export function statusCopy(status: PageStatus): string | null {
  switch (status) {
    case 'loading':
      return 'Loading pharmacy account…';
    case 'empty':
      return 'No KYC pack yet. Fill the counter form below to unlock the floor.';
    case 'validation':
      return 'Enter legal name, licence, PAN, address, phone, and upload drug licence plus PAN files (PDF/JPEG/PNG). GST certificate is required when GSTIN is set.';
    case 'denied':
      return 'Only the pharmacy owner can open this account desk.';
    case 'conflict':
      return 'A KYC pack is already waiting, or this pharmacy is already decided. Refresh the page.';
    case 'failure':
      return 'Could not reach the server for this account. Try again from this counter.';
    case 'success':
    case 'submitted':
      return 'KYC pack sent. Floor stays locked until review finishes.';
    case 'rejected':
      return 'This pack was rejected. Fix the noted issue and resubmit from this counter.';
    case 'approved':
      return 'KYC approved. Floor modules are unlocked for this pharmacy.';
    default:
      return null;
  }
}

export function pdfOrImage(file: File | null): boolean {
  if (!file) {
    return false;
  }
  return ['application/pdf', 'image/jpeg', 'image/png'].includes(file.type);
}

export function canSubmitKyc(
  owner: boolean,
  pack: KycStatus | null,
  tenantStatus: string | null | undefined,
): boolean {
  return (
    owner &&
    pack?.status !== 'SUBMITTED' &&
    pack?.status !== 'APPROVED' &&
    tenantStatus === 'VERIFICATION_REQUIRED'
  );
}

export function mapApiStatus(error: { status: number; code: string | null }): PageStatus {
  if (error.status === 403 || error.code === 'FORBIDDEN') {
    return 'denied';
  }
  if (error.status === 409 || error.code === 'CONFLICT') {
    return 'conflict';
  }
  if (error.status === 400 || error.status === 422) {
    return 'validation';
  }
  return 'failure';
}
