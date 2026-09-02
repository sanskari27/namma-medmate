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
      </Routes>
    </MemoryRouter>,
  );
}

describe('HQ password reset request', () => {
  beforeEach(() => {
    requestMock.mockReset();
  });

  it('empty: shows HQ reset without an operator alert', () => {
    renderForgot();
    expect(screen.getByRole('heading', { name: 'HQ password reset' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('validation: empty submit asks for HQ email', async () => {
    const user = userEvent.setup();
    renderForgot();
    await user.click(screen.getByRole('button', { name: 'Queue HQ reset' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Enter the HQ operator email.');
    expect(requestMock).not.toHaveBeenCalled();
  });

  it('loading: submit disables the console button', async () => {
    const user = userEvent.setup();
    requestMock.mockReturnValue(new Promise(() => undefined));
    renderForgot();
    await user.type(screen.getByLabelText('HQ email'), 'ops@hq.local');
    await user.click(screen.getByRole('button', { name: 'Queue HQ reset' }));
    expect(screen.getByRole('button', { name: 'Queueing reset' })).toBeDisabled();
  });

  it('denied: 403 stays generic on this console', async () => {
    const user = userEvent.setup();
    requestMock.mockRejectedValue(new ApiError('no', 403, 'FORBIDDEN'));
    renderForgot();
    await user.type(screen.getByLabelText('HQ email'), 'ops@hq.local');
    await user.click(screen.getByRole('button', { name: 'Queue HQ reset' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('This console cannot start an email reset');
  });

  it('conflict: 409 says a reset is already queued', async () => {
    const user = userEvent.setup();
    requestMock.mockRejectedValue(new ApiError('Conflict', 409, 'IDEMPOTENCY_CONFLICT'));
    renderForgot();
    await user.type(screen.getByLabelText('HQ email'), 'ops@hq.local');
    await user.click(screen.getByRole('button', { name: 'Queue HQ reset' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('An HQ reset is already queued');
  });

  it('failure: API outage stays on the console form', async () => {
    const user = userEvent.setup();
    requestMock.mockRejectedValue(new ApiError('down', 0, 'NETWORK'));
    renderForgot();
    await user.type(screen.getByLabelText('HQ email'), 'ops@hq.local');
    await user.click(screen.getByRole('button', { name: 'Queue HQ reset' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('The platform API did not accept the reset');
  });

  it('success: MASTER is told a time-limited link may be queued', async () => {
    const user = userEvent.setup();
    requestMock.mockResolvedValue(undefined);
    renderForgot();
    await user.type(screen.getByLabelText('HQ email'), 'ops@hq.local');
    await user.click(screen.getByRole('button', { name: 'Queue HQ reset' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('If this MASTER account can reset by email');
  });
});
