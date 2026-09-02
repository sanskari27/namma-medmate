import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';
import { ApiError } from '@/services/axios';

vi.mock('@/services/auth', async () => {
  const axios = await import('@/services/axios');
  return {
    requestPasswordReset: vi.fn(),
    ApiError: axios.ApiError,
    isApiError: axios.isApiError,
  };
});

import { requestPasswordReset } from '@/services/auth';

const requestMock = vi.mocked(requestPasswordReset);

function renderForgot() {
  return render(
    <MemoryRouter initialEntries={['/forgot-password']}>
      <Routes>
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/login" element={<div>Pharmacy sign in</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('dispensary owner password reset request', () => {
  beforeEach(() => {
    requestMock.mockReset();
  });

  it('empty: shows the owner reset form without a status', () => {
    renderForgot();
    expect(screen.getByRole('heading', { name: 'Owner password reset' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Owner email')).toHaveValue('');
  });

  it('validation: empty submit asks for the owner email', async () => {
    const user = userEvent.setup();
    renderForgot();
    await user.click(screen.getByRole('button', { name: 'Send owner reset' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Enter the owner email for this pharmacy.');
    expect(requestMock).not.toHaveBeenCalled();
  });

  it('loading: submit disables the button while the counter waits', async () => {
    const user = userEvent.setup();
    requestMock.mockReturnValue(new Promise(() => undefined));
    renderForgot();
    await user.type(screen.getByLabelText('Owner email'), 'owner@pharmacy.local');
    await user.click(screen.getByRole('button', { name: 'Send owner reset' }));
    expect(screen.getByRole('button', { name: 'Sending reset' })).toBeDisabled();
  });

  it('denied: 403 tells staff to ask the owner', async () => {
    const user = userEvent.setup();
    requestMock.mockRejectedValue(new ApiError('Forbidden', 403, 'FORBIDDEN'));
    renderForgot();
    await user.type(screen.getByLabelText('Owner email'), 'staff@pharmacy.local');
    await user.click(screen.getByRole('button', { name: 'Send owner reset' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('This counter cannot start an email reset');
  });

  it('conflict: 409 says a reset is already in flight', async () => {
    const user = userEvent.setup();
    requestMock.mockRejectedValue(new ApiError('Conflict', 409, 'IDEMPOTENCY_CONFLICT'));
    renderForgot();
    await user.type(screen.getByLabelText('Owner email'), 'owner@pharmacy.local');
    await user.click(screen.getByRole('button', { name: 'Send owner reset' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('A reset is already in flight');
  });

  it('failure: network errors stay on the owner form', async () => {
    const user = userEvent.setup();
    requestMock.mockRejectedValue(new ApiError('down', 0, 'NETWORK'));
    renderForgot();
    await user.type(screen.getByLabelText('Owner email'), 'owner@pharmacy.local');
    await user.click(screen.getByRole('button', { name: 'Send owner reset' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not reach the server');
  });

  it('success: accepted request tells the chemist a link may be on the way', async () => {
    const user = userEvent.setup();
    requestMock.mockResolvedValue(undefined);
    renderForgot();
    await user.type(screen.getByLabelText('Owner email'), 'owner@pharmacy.local');
    await user.click(screen.getByRole('button', { name: 'Send owner reset' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('If this owner account can reset by email');
  });
});
