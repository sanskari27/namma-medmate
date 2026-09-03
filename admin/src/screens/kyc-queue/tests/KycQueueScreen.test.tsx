import { configureStore } from '@reduxjs/toolkit';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import KycQueueScreen from '@/screens/kyc-queue/KycQueueScreen';
import { ApiError } from '@/services/axios';
import { authReducer } from '@/store';
import type { KycPack } from '@/services/kyc';

vi.mock('@/services/kyc', () => ({
  listKycQueue: vi.fn(),
  getKycPack: vi.fn(),
  approveKycPack: vi.fn(),
  rejectKycPack: vi.fn(),
  kycDocumentUrl: (packId: string, documentId: string) =>
    `http://localhost:8080/api/v1/admin/kyc/${packId}/documents/${documentId}`,
}));

import { approveKycPack, listKycQueue, rejectKycPack } from '@/services/kyc';

const listMock = vi.mocked(listKycQueue);
const approveMock = vi.mocked(approveKycPack);
const rejectMock = vi.mocked(rejectKycPack);

const pending: KycPack = {
  id: 'pack-1',
  tenantId: 't1',
  tenantName: 'Varshmaan Pharmacy',
  legalName: 'Varshmaan Retail Pvt Ltd',
  drugLicenseNumber: 'KA-DL-1',
  pan: 'ABCDE1234F',
  gstin: null,
  addressLine1: '12 MG Road',
  city: 'Bengaluru',
  state: 'KA',
  pincode: '560001',
  contactPhone: '9876543210',
  status: 'SUBMITTED',
  rejectionReason: null,
  submittedAt: '2026-09-03T00:00:00Z',
  reviewedBy: null,
  reviewedAt: null,
  version: 0,
  documents: [
    {
      id: 'doc-1',
      docType: 'DRUG_LICENSE',
      contentType: 'application/pdf',
      byteSize: 100,
      originalFilename: 'license.pdf',
    },
  ],
};

function renderPage(role: string, modules: string[] = []) {
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
          modules,
        },
      },
    },
  });
  return render(
    <Provider store={store}>
      <KycQueueScreen />
    </Provider>,
  );
}

describe('tenant KYC queue', () => {
  beforeEach(() => {
    listMock.mockReset();
    approveMock.mockReset();
    rejectMock.mockReset();
  });

  it('loading: waits for dossiers', () => {
    listMock.mockReturnValue(new Promise(() => undefined));
    renderPage('admin_super');
    expect(screen.getByText('Loading tenant KYC dossiers…')).toBeInTheDocument();
  });

  it('empty: no packs waiting', async () => {
    listMock.mockResolvedValue([]);
    renderPage('admin_super');
    expect(await screen.findByRole('heading', { name: 'Tenant KYC queue' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('No pharmacy KYC packs waiting on HQ.');
  });

  it('validation: rejection requires a reason', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([pending]);
    renderPage('admin_super');
    await user.click(await screen.findByRole('button', { name: /Varshmaan Pharmacy/i }));
    await user.click(screen.getByRole('button', { name: 'Reject with reason' }));
    await user.click(screen.getByRole('button', { name: 'Confirm reject' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a rejection reason before filing.');
    expect(rejectMock).not.toHaveBeenCalled();
  });

  it('denied: desks without TENANT_KYC cannot open the queue', async () => {
    renderPage('admin_verification', []);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Your desk cannot open the tenant KYC queue.',
    );
  });

  it('conflict: already decided packs stay in the message', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([pending]);
    approveMock.mockRejectedValue(new ApiError('stale', 409, 'KYC_CONFLICT'));
    renderPage('admin_super');
    await user.click(await screen.findByRole('button', { name: /Varshmaan Pharmacy/i }));
    await user.click(screen.getByRole('button', { name: 'Approve dossier' }));
    await user.click(screen.getByRole('button', { name: 'Confirm approve' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This KYC pack was already decided.',
    );
  });

  it('failure: queue load errors surface', async () => {
    listMock.mockRejectedValue(new Error('offline'));
    renderPage('admin_super');
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load the KYC queue');
  });

  it('success: approve files the decision', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValueOnce([pending]).mockResolvedValueOnce([]);
    approveMock.mockResolvedValue({ ...pending, status: 'APPROVED' });
    renderPage('admin_verification', ['TENANT_KYC']);
    await user.click(await screen.findByRole('button', { name: /Varshmaan Pharmacy/i }));
    expect(screen.getByRole('link', { name: 'Open evidence' })).toHaveAttribute(
      'href',
      'http://localhost:8080/api/v1/admin/kyc/pack-1/documents/doc-1',
    );
    await user.click(screen.getByRole('button', { name: 'Approve dossier' }));
    await user.click(screen.getByRole('button', { name: 'Confirm approve' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Decision filed');
    expect(approveMock).toHaveBeenCalledWith('pack-1');
  });

  it('success: reject files a reason', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValueOnce([pending]).mockResolvedValueOnce([]);
    rejectMock.mockResolvedValue({
      ...pending,
      status: 'REJECTED',
      rejectionReason: 'Blurry licence',
    });
    renderPage('admin_super');
    await user.click(await screen.findByRole('button', { name: /Varshmaan Pharmacy/i }));
    await user.click(screen.getByRole('button', { name: 'Reject with reason' }));
    await user.type(screen.getByLabelText('Rejection reason'), 'Blurry licence');
    await user.click(screen.getByRole('button', { name: 'Confirm reject' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Decision filed');
    expect(rejectMock).toHaveBeenCalledWith('pack-1', 'Blurry licence');
  });
});
