import { configureStore } from '@reduxjs/toolkit';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import StaffVerificationScreen from '@/screens/staff-verifications/StaffVerificationScreen';
import { ApiError } from '@/services/axios';
import { authReducer } from '@/store';
import type { StaffVerificationItem } from '@/services/staff';

vi.mock('@/services/staff', () => ({
  listStaffVerifications: vi.fn(),
  approveStaffVerification: vi.fn(),
}));

import { approveStaffVerification, listStaffVerifications } from '@/services/staff';

const listMock = vi.mocked(listStaffVerifications);
const approveMock = vi.mocked(approveStaffVerification);

const pending: StaffVerificationItem = {
  id: 'reg-1',
  userId: 's1',
  tenantId: '11111111-1111-1111-1111-111111111111',
  email: 'rx@pharmacy.local',
  displayName: 'Ravi',
  kind: 'PHARMACIST',
  licenseNumber: 'KA-PCI-99',
  evidenceReference: null,
  status: 'PENDING',
  reviewedBy: null,
  reviewedAt: null,
};

function renderPage(role: string) {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        user: {
          userId: 'm1',
          displayName: 'Sanskar',
          role,
          tenantId: null,
          pinSet: true,
        },
      },
    },
  });
  return render(
    <Provider store={store}>
      <StaffVerificationScreen />
    </Provider>,
  );
}

describe('staff registration queue', () => {
  beforeEach(() => {
    listMock.mockReset();
    approveMock.mockReset();
  });

  it('loading: waits for pending approvals', () => {
    listMock.mockReturnValue(new Promise(() => undefined));
    renderPage('admin_super');
    expect(screen.getByText('Loading pending approvals')).toBeInTheDocument();
  });

  it('empty: no staff pending approval', async () => {
    listMock.mockResolvedValue([]);
    renderPage('admin_super');
    expect(await screen.findByRole('heading', { name: 'Staff approvals' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('No staff pending approval.');
  });

  it('validation: verification notes are required before approve', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([pending]);
    renderPage('admin_verification');
    await screen.findByText('Ravi');
    await user.click(screen.getByRole('button', { name: 'Review Ravi' }));
    await user.click(screen.getByRole('button', { name: 'Approve access' }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Enter verification notes before approving.',
    );
    expect(approveMock).not.toHaveBeenCalled();
  });

  it('denied: pharmacy roles cannot open the HQ queue', async () => {
    renderPage('pharmacy_owner');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'You do not have permission to approve staff.',
    );
  });

  it('conflict: already decided registrations stay in the message', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([pending]);
    approveMock.mockRejectedValue(new ApiError('stale', 409, 'VERIFICATION_CONFLICT'));
    renderPage('admin_super');
    await screen.findByText('Ravi');
    await user.click(screen.getByRole('button', { name: 'Review Ravi' }));
    await user.type(screen.getByLabelText('Verification notes'), 'pci-scan-2026');
    await user.click(screen.getByRole('button', { name: 'Approve access' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This registration has already been decided.',
    );
  });

  it('failure: list errors stay on the page', async () => {
    listMock.mockRejectedValue(new ApiError('down', 0, 'NETWORK'));
    renderPage('admin_super');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not load pending approvals. Try again.',
    );
  });

  it('success: administrator records verification notes', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValueOnce([pending]).mockResolvedValueOnce([]);
    approveMock.mockResolvedValue({
      ...pending,
      status: 'APPROVED',
      evidenceReference: 'pci-scan-2026',
      reviewedBy: 'm1',
      reviewedAt: '2026-09-02T00:00:00Z',
    });
    renderPage('admin_super');
    await screen.findByText('Ravi');
    expect(screen.getByText('11111111-1111-1111-1111-111111111111')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Review Ravi' }));
    await user.type(screen.getByLabelText('Verification notes'), 'pci-scan-2026');
    await user.click(screen.getByRole('button', { name: 'Approve access' }));
    expect(approveMock).toHaveBeenCalledWith('reg-1', 'pci-scan-2026');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Approved. That person can now sign in.',
    );
  });
});
