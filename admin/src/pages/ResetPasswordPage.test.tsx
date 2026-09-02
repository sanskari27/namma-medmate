import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import { ApiError } from '@/services/axios';

vi.mock('@/services/auth', async () => {
  const axios = await import('@/services/axios');
  return {
    completePasswordReset: vi.fn(),
    ApiError: axios.ApiError,
    isApiError: axios.isApiError,
  };
});

import { completePasswordReset } from '@/services/auth';

const completeMock = vi.mocked(completePasswordReset);

function renderReset(search = '?token=abc') {
  return render(
    <MemoryRouter initialEntries={[`/reset-password${search}`]}>
      <Routes>
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('HQ password complete', () => {
  beforeEach(() => {
    completeMock.mockReset();
  });

  it('empty: missing token tells the operator to open the email link', () => {
    renderReset('');
    expect(screen.getByRole('alert')).toHaveTextContent('Open the HQ reset link from email');
    expect(screen.getByRole('button', { name: 'Save HQ password' })).toBeDisabled();
  });

  it('validation: short passwords stay on the console form', async () => {
    const user = userEvent.setup();
    renderReset();
    await user.type(screen.getByLabelText('New HQ password'), 'short');
    await user.type(screen.getByLabelText('Confirm HQ password'), 'short');
    await user.click(screen.getByRole('button', { name: 'Save HQ password' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Use at least eight characters');
    expect(completeMock).not.toHaveBeenCalled();
  });

  it('loading: submit disables the console button', async () => {
    const user = userEvent.setup();
    completeMock.mockReturnValue(new Promise(() => undefined));
    renderReset();
    await user.type(screen.getByLabelText('New HQ password'), 'hq-pass-22');
    await user.type(screen.getByLabelText('Confirm HQ password'), 'hq-pass-22');
    await user.click(screen.getByRole('button', { name: 'Save HQ password' }));
    expect(screen.getByRole('button', { name: 'Saving HQ password' })).toBeDisabled();
  });

  it('denied: invalid token asks to queue a new MASTER reset', async () => {
    const user = userEvent.setup();
    completeMock.mockRejectedValue(new ApiError('bad', 422, 'RESET_TOKEN_INVALID'));
    renderReset();
    await user.type(screen.getByLabelText('New HQ password'), 'hq-pass-22');
    await user.type(screen.getByLabelText('Confirm HQ password'), 'hq-pass-22');
    await user.click(screen.getByRole('button', { name: 'Save HQ password' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('This HQ reset link is expired or spent');
  });

  it('conflict: reused secret is rejected', async () => {
    const user = userEvent.setup();
    completeMock.mockRejectedValue(new ApiError('reuse', 422, 'PASSWORD_REUSED'));
    renderReset();
    await user.type(screen.getByLabelText('New HQ password'), 'password1');
    await user.type(screen.getByLabelText('Confirm HQ password'), 'password1');
    await user.click(screen.getByRole('button', { name: 'Save HQ password' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('already in this operator history');
  });

  it('failure: API outage stays on the console form', async () => {
    const user = userEvent.setup();
    completeMock.mockRejectedValue(new ApiError('down', 0, 'NETWORK'));
    renderReset();
    await user.type(screen.getByLabelText('New HQ password'), 'hq-pass-22');
    await user.type(screen.getByLabelText('Confirm HQ password'), 'hq-pass-22');
    await user.click(screen.getByRole('button', { name: 'Save HQ password' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('The platform API did not save the password');
  });

  it('success: operator can authenticate with the new HQ secret', async () => {
    const user = userEvent.setup();
    completeMock.mockResolvedValue(undefined);
    renderReset();
    await user.type(screen.getByLabelText('New HQ password'), 'hq-pass-22');
    await user.type(screen.getByLabelText('Confirm HQ password'), 'hq-pass-22');
    await user.click(screen.getByRole('button', { name: 'Save HQ password' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('HQ password updated');
  });
});
