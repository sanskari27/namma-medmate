import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import VerifyEmailScreen from '@/screens/verify-email/VerifyEmailScreen';
import { ApiError } from '@/services/axios';

vi.mock('@/services/tenant', async () => {
  const axios = await import('@/services/axios');
  return {
    verifyPharmacyEmail: vi.fn(),
    ApiError: axios.ApiError,
    isApiError: axios.isApiError,
  };
});

import { verifyPharmacyEmail } from '@/services/tenant';

const verifyMock = vi.mocked(verifyPharmacyEmail);

function renderVerify(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/verify-email" element={<VerifyEmailScreen />} />
        <Route path="/login" element={<div>Pharmacy sign in</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('dispensary pharmacy email verification', () => {
  beforeEach(() => {
    verifyMock.mockReset();
  });

  it('empty: missing token asks for the owner email link', () => {
    renderVerify('/verify-email');
    expect(screen.getByRole('heading', { name: 'Verify owner email' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Open the verification link from the owner email',
    );
    expect(verifyMock).not.toHaveBeenCalled();
  });

  it('loading: shows checking copy while the token is verified', () => {
    verifyMock.mockReturnValue(new Promise(() => undefined));
    renderVerify('/verify-email?token=abc');
    expect(screen.getByText('Checking the verification link…')).toBeInTheDocument();
  });

  it('success: resumes with a counter sign-in CTA', async () => {
    verifyMock.mockResolvedValue({ tenantId: 't1', email: 'asha@chemist.local' });
    renderVerify('/verify-email?token=abc');
    expect(await screen.findByRole('alert')).toHaveTextContent('Owner email verified');
    expect(screen.getByRole('link', { name: 'Sign in at this counter' })).toBeInTheDocument();
  });

  it('denied: expired token explains the next step', async () => {
    verifyMock.mockRejectedValue(new ApiError('Invalid', 422, 'VERIFY_TOKEN_INVALID'));
    renderVerify('/verify-email?token=bad');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This verification link is expired or already used',
    );
  });

  it('conflict: already verified points to sign in', async () => {
    verifyMock.mockRejectedValue(new ApiError('Conflict', 409, 'EMAIL_TAKEN'));
    renderVerify('/verify-email?token=used');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This pharmacy email was already verified',
    );
  });

  it('failure: offline error asks to retry', async () => {
    verifyMock.mockRejectedValue(new Error('offline'));
    renderVerify('/verify-email?token=abc');
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not reach the server');
  });

  it('validation path stays unused when a token is present', async () => {
    verifyMock.mockResolvedValue({ tenantId: 't1', email: 'asha@chemist.local' });
    renderVerify('/verify-email?token=abc');
    await waitFor(() => expect(verifyMock).toHaveBeenCalledWith('abc'));
    expect(screen.queryByText(/missing a token/i)).not.toBeInTheDocument();
  });
});
