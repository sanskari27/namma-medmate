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

describe('dispensary owner password complete', () => {
  beforeEach(() => {
    completeMock.mockReset();
  });

  it('empty: missing token tells the chemist to open the email link', () => {
    renderReset('');
    expect(screen.getByRole('alert')).toHaveTextContent('Open the reset link from the owner email');
    expect(screen.getByRole('button', { name: 'Save owner password' })).toBeDisabled();
  });

  it('validation: short or mismatched passwords stay on the counter form', async () => {
    const user = userEvent.setup();
    renderReset();
    await user.type(screen.getByLabelText('New password'), 'short');
    await user.type(screen.getByLabelText('Confirm password'), 'short');
    await user.click(screen.getByRole('button', { name: 'Save owner password' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Use at least eight characters');
    expect(completeMock).not.toHaveBeenCalled();
  });

  it('loading: submit disables the button while saving', async () => {
    const user = userEvent.setup();
    completeMock.mockReturnValue(new Promise(() => undefined));
    renderReset();
    await user.type(screen.getByLabelText('New password'), 'counter-pass-2');
    await user.type(screen.getByLabelText('Confirm password'), 'counter-pass-2');
    await user.click(screen.getByRole('button', { name: 'Save owner password' }));
    expect(screen.getByRole('button', { name: 'Saving password' })).toBeDisabled();
  });

  it('denied: invalid token asks for a new owner email', async () => {
    const user = userEvent.setup();
    completeMock.mockRejectedValue(new ApiError('bad', 422, 'RESET_TOKEN_INVALID'));
    renderReset();
    await user.type(screen.getByLabelText('New password'), 'counter-pass-2');
    await user.type(screen.getByLabelText('Confirm password'), 'counter-pass-2');
    await user.click(screen.getByRole('button', { name: 'Save owner password' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('This reset link is expired or already used');
  });

  it('conflict: reused password is rejected', async () => {
    const user = userEvent.setup();
    completeMock.mockRejectedValue(new ApiError('reuse', 422, 'PASSWORD_REUSED'));
    renderReset();
    await user.type(screen.getByLabelText('New password'), 'counter-pass-1');
    await user.type(screen.getByLabelText('Confirm password'), 'counter-pass-1');
    await user.click(screen.getByRole('button', { name: 'Save owner password' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('That password was used before on this counter');
  });

  it('failure: network errors stay on the form', async () => {
    const user = userEvent.setup();
    completeMock.mockRejectedValue(new ApiError('down', 0, 'NETWORK'));
    renderReset();
    await user.type(screen.getByLabelText('New password'), 'counter-pass-2');
    await user.type(screen.getByLabelText('Confirm password'), 'counter-pass-2');
    await user.click(screen.getByRole('button', { name: 'Save owner password' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not reach the server');
  });

  it('success: chemist can sign in with the new owner password', async () => {
    const user = userEvent.setup();
    completeMock.mockResolvedValue(undefined);
    renderReset();
    await user.type(screen.getByLabelText('New password'), 'counter-pass-2');
    await user.type(screen.getByLabelText('Confirm password'), 'counter-pass-2');
    await user.click(screen.getByRole('button', { name: 'Save owner password' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Owner password updated');
  });
});
