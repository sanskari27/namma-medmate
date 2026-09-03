import { configureStore } from '@reduxjs/toolkit';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AccountScreen from '@/screens/account/AccountScreen';
import { ApiError } from '@/services/axios';
import { authReducer } from '@/store';
import type { KycStatus } from '@/services/tenant';

vi.mock('@/services/tenant', async () => {
  const axios = await import('@/services/axios');
  return {
    getKycStatus: vi.fn(),
    submitKyc: vi.fn(),
    registerPharmacy: vi.fn(),
    verifyPharmacyEmail: vi.fn(),
    ApiError: axios.ApiError,
    isApiError: axios.isApiError,
  };
});

import { getKycStatus, submitKyc } from '@/services/tenant';

const getMock = vi.mocked(getKycStatus);
const submitMock = vi.mocked(submitKyc);

const emptyPack: KycStatus = {
  tenantId: 'tenant-1',
  tenantStatus: 'VERIFICATION_REQUIRED',
  emailVerified: true,
  status: null,
  rejectionReason: null,
  submittedAt: null,
  reviewedAt: null,
  submissionId: null,
  documents: [],
};

function renderPage(role = 'pharmacy_owner', tenantStatus = 'VERIFICATION_REQUIRED') {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        user: {
          userId: 'u1',
          displayName: 'Owner',
          role,
          tenantId: 'tenant-1',
          pinSet: true,
          tenantStatus,
          emailVerified: true,
        },
      },
    },
  });
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <AccountScreen />
      </MemoryRouter>
    </Provider>,
  );
}

function pdfFile(name: string) {
  return new File(['%PDF'], name, { type: 'application/pdf' });
}

describe('pharmacy account KYC', () => {
  beforeEach(() => {
    getMock.mockReset();
    submitMock.mockReset();
  });

  it('loading: waits for KYC status', () => {
    getMock.mockReturnValue(new Promise(() => undefined));
    renderPage();
    expect(screen.getByText('Loading pharmacy KYC status…')).toBeInTheDocument();
  });

  it('empty: prompts owner to fill the counter form', async () => {
    getMock.mockResolvedValue(emptyPack);
    renderPage();
    expect(await screen.findByRole('heading', { name: /pharmacy account \/ kyc/i })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('No KYC pack yet');
  });

  it('validation: required fields and files before submit', async () => {
    const user = userEvent.setup();
    getMock.mockResolvedValue(emptyPack);
    renderPage();
    await screen.findByLabelText('Legal pharmacy name');
    await user.click(screen.getByRole('button', { name: 'Submit KYC pack' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Enter legal name, licence, PAN');
    expect(submitMock).not.toHaveBeenCalled();
  });

  it('denied: staff cannot submit KYC', async () => {
    renderPage('pharmacy_staff');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Only the pharmacy owner can submit KYC',
    );
  });

  it('conflict: duplicate pack stays in the message', async () => {
    const user = userEvent.setup();
    getMock.mockResolvedValue(emptyPack);
    submitMock.mockRejectedValue(new ApiError('busy', 409, 'KYC_CONFLICT'));
    renderPage();
    await screen.findByLabelText('Legal pharmacy name');
    await user.type(screen.getByLabelText('Legal pharmacy name'), 'Asha Retail');
    await user.type(screen.getByLabelText('Drug licence number'), 'KA-1');
    await user.type(screen.getByLabelText('PAN'), 'ABCDE1234F');
    await user.type(screen.getByLabelText('Branch address line'), '12 MG Road');
    await user.type(screen.getByLabelText('City'), 'Bengaluru');
    await user.type(screen.getByLabelText('State'), 'KA');
    await user.type(screen.getByLabelText('Pincode'), '560001');
    await user.type(screen.getByLabelText('Contact phone'), '9876543210');
    await user.upload(screen.getByLabelText('Drug licence file'), pdfFile('license.pdf'));
    await user.upload(screen.getByLabelText('PAN file'), pdfFile('pan.pdf'));
    await user.click(screen.getByRole('button', { name: 'Submit KYC pack' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('already waiting');
  });

  it('failure: network errors surface', async () => {
    getMock.mockRejectedValue(new Error('offline'));
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not reach the server for KYC');
  });

  it('success: submit sends the pack and shows waiting copy', async () => {
    const user = userEvent.setup();
    getMock.mockResolvedValue(emptyPack);
    submitMock.mockResolvedValue({
      ...emptyPack,
      status: 'SUBMITTED',
      submissionId: 'sub-1',
      submittedAt: '2026-09-03T00:00:00Z',
      documents: [
        {
          id: 'd1',
          docType: 'DRUG_LICENSE',
          contentType: 'application/pdf',
          byteSize: 12,
          originalFilename: 'license.pdf',
        },
      ],
    });
    renderPage();
    await screen.findByLabelText('Legal pharmacy name');
    await user.type(screen.getByLabelText('Legal pharmacy name'), 'Asha Retail');
    await user.type(screen.getByLabelText('Drug licence number'), 'KA-1');
    await user.type(screen.getByLabelText('PAN'), 'ABCDE1234F');
    await user.type(screen.getByLabelText('Branch address line'), '12 MG Road');
    await user.type(screen.getByLabelText('City'), 'Bengaluru');
    await user.type(screen.getByLabelText('State'), 'KA');
    await user.type(screen.getByLabelText('Pincode'), '560001');
    await user.type(screen.getByLabelText('Contact phone'), '9876543210');
    await user.upload(screen.getByLabelText('Drug licence file'), pdfFile('license.pdf'));
    await user.upload(screen.getByLabelText('PAN file'), pdfFile('pan.pdf'));
    await user.click(screen.getByRole('button', { name: 'Submit KYC pack' }));
    await waitFor(() => expect(submitMock).toHaveBeenCalled());
    expect(await screen.findByRole('alert')).toHaveTextContent('KYC pack sent');
  });

  it('rejected: shows HQ reason and keeps the form for resubmit', async () => {
    getMock.mockResolvedValue({
      ...emptyPack,
      status: 'REJECTED',
      rejectionReason: 'Licence scan is illegible',
      submissionId: 'sub-old',
    });
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('Licence scan is illegible');
    expect(screen.getByRole('button', { name: 'Submit KYC pack' })).toBeInTheDocument();
  });
});
