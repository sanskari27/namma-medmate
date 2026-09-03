import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BranchesDialog } from '@/screens/staff-accounts/components/branches-dialog/BranchesDialog';
import type { StaffAccount } from '@/services/staff';
import { ApiError } from '@/services/axios';

vi.mock('@/services/branches', () => ({
  listBranches: vi.fn(),
}));

vi.mock('@/services/userBranches', () => ({
  listUserBranches: vi.fn(),
  replaceUserBranches: vi.fn(),
}));

import { listBranches } from '@/services/branches';
import { listUserBranches, replaceUserBranches } from '@/services/userBranches';

const listBranchesMock = vi.mocked(listBranches);
const listUserBranchesMock = vi.mocked(listUserBranches);
const replaceUserBranchesMock = vi.mocked(replaceUserBranches);

const staff: StaffAccount = {
  id: 'staff-1',
  displayName: 'Counter Clerk',
  email: 'clerk@varshmaan.local',
  role: 'pharmacy_staff',
  kind: 'STAFF',
  status: 'ACTIVE',
  phone: '9876543210',
  licenseNumber: null,
  registrationId: null,
  createdBy: null,
  mustChangePassword: false,
  createdAt: '2026-09-01T00:00:00Z',
};

describe('BranchesDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listBranchesMock.mockResolvedValue([
      {
        id: 'b1',
        tenantId: 't1',
        name: 'Main outlet',
        branchCode: 'BR01',
        addressLine: '1 Road',
        city: 'Bengaluru',
        state: 'KA',
        pincode: '560001',
        contactPhone: '9876543210',
        contactEmail: null,
        drugLicenseNumber: 'DL-1',
        gstin: null,
        operatingHours: {},
        branchType: 'RETAIL',
        status: 'ACTIVE',
        openingDate: '2026-09-01',
        defaultBranch: true,
        linkedWarehouse: false,
        pricingSettings: {},
        taxSettings: {},
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      },
      {
        id: 'b2',
        tenantId: 't1',
        name: 'Annex outlet',
        branchCode: 'BR02',
        addressLine: '2 Road',
        city: 'Bengaluru',
        state: 'KA',
        pincode: '560002',
        contactPhone: '9876543211',
        contactEmail: null,
        drugLicenseNumber: 'DL-2',
        gstin: null,
        operatingHours: {},
        branchType: 'RETAIL',
        status: 'ACTIVE',
        openingDate: '2026-09-01',
        defaultBranch: false,
        linkedWarehouse: false,
        pricingSettings: {},
        taxSettings: {},
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      },
    ]);
    listUserBranchesMock.mockResolvedValue({
      userId: staff.id,
      branches: [{ id: 'b1', name: 'Main outlet', branchCode: 'BR01', status: 'ACTIVE' }],
    });
    replaceUserBranchesMock.mockResolvedValue({
      userId: staff.id,
      branches: [
        { id: 'b1', name: 'Main outlet', branchCode: 'BR01', status: 'ACTIVE' },
        { id: 'b2', name: 'Annex outlet', branchCode: 'BR02', status: 'ACTIVE' },
      ],
    });
  });

  it('loads assigned outlets and saves a successful replace', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    const onOpenChange = vi.fn();
    render(<BranchesDialog staff={staff} open onOpenChange={onOpenChange} onSuccess={onSuccess} />);

    expect(screen.getByRole('alert')).toHaveTextContent('Loading outlets');
    await screen.findByRole('checkbox', { name: /main outlet/i });
    expect(screen.getByRole('checkbox', { name: /main outlet/i })).toBeChecked();

    await user.click(screen.getByRole('checkbox', { name: /annex outlet/i }));
    await user.click(screen.getByRole('button', { name: /save outlets/i }));

    await waitFor(() => {
      expect(replaceUserBranchesMock).toHaveBeenCalledWith(staff.id, ['b1', 'b2']);
      expect(onSuccess).toHaveBeenCalledWith('Outlets updated for Counter Clerk.');
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('shows empty when the pharmacy has no outlets', async () => {
    listBranchesMock.mockResolvedValueOnce([]);
    listUserBranchesMock.mockResolvedValueOnce({ userId: staff.id, branches: [] });
    render(<BranchesDialog staff={staff} open onOpenChange={vi.fn()} onSuccess={vi.fn()} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('No outlets yet');
  });

  it('shows denied when only owner may assign', async () => {
    listBranchesMock.mockRejectedValueOnce(new ApiError('denied', 403, 'FORBIDDEN'));
    render(<BranchesDialog staff={staff} open onOpenChange={vi.fn()} onSuccess={vi.fn()} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Only the pharmacy owner');
  });

  it('shows conflict when the server returns 409', async () => {
    const user = userEvent.setup();
    replaceUserBranchesMock.mockRejectedValueOnce(new ApiError('conflict', 409, 'STALE_STATE'));
    render(<BranchesDialog staff={staff} open onOpenChange={vi.fn()} onSuccess={vi.fn()} />);
    await screen.findByRole('checkbox', { name: /main outlet/i });
    await user.click(screen.getByRole('button', { name: /save outlets/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Outlet list changed');
  });

  it('shows validation when the server returns 422', async () => {
    const user = userEvent.setup();
    replaceUserBranchesMock.mockRejectedValueOnce(new ApiError('inactive', 422, 'BRANCH_INACTIVE'));
    render(<BranchesDialog staff={staff} open onOpenChange={vi.fn()} onSuccess={vi.fn()} />);
    await screen.findByRole('checkbox', { name: /main outlet/i });
    await user.click(screen.getByRole('button', { name: /save outlets/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Pick at least one outlet');
  });

  it('restores focus to the trigger after close', async () => {
    const user = userEvent.setup();
    const trigger = document.createElement('button');
    trigger.textContent = 'Open outlets';
    document.body.appendChild(trigger);
    trigger.focus();
    const onOpenChange = vi.fn((open: boolean) => {
      if (!open) {
        /* dialog closed */
      }
    });
    const { rerender } = render(
      <BranchesDialog staff={staff} open onOpenChange={onOpenChange} onSuccess={vi.fn()} />,
    );
    await screen.findByRole('checkbox', { name: /main outlet/i });
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    rerender(
      <BranchesDialog staff={staff} open={false} onOpenChange={onOpenChange} onSuccess={vi.fn()} />,
    );
    await waitFor(() => {
      expect(document.activeElement).toBe(trigger);
    });
    trigger.remove();
  });

  it('shows failure when save fails', async () => {
    const user = userEvent.setup();
    replaceUserBranchesMock.mockRejectedValueOnce(new Error('network'));
    render(<BranchesDialog staff={staff} open onOpenChange={vi.fn()} onSuccess={vi.fn()} />);
    await screen.findByRole('checkbox', { name: /main outlet/i });
    await user.click(screen.getByRole('button', { name: /save outlets/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not save outlets');
  });
});
