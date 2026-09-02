import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CounterPasswordChange } from '@organisms/counter-password-change';
import { ApiError } from '@/services/axios';

vi.mock('@/services/auth', async () => {
  const axios = await import('@/services/axios');
  return {
    changePassword: vi.fn(),
    ApiError: axios.ApiError,
    isApiError: axios.isApiError,
  };
});

import { changePassword } from '@/services/auth';

const changeMock = vi.mocked(changePassword);

describe('counter forced password change', () => {
  beforeEach(() => {
    changeMock.mockReset();
  });

  it('empty: shows the till password form without a status', () => {
    render(<CounterPasswordChange onChanged={() => undefined} />);
    expect(
      screen.getByRole('heading', { name: 'Change this counter password' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('validation: short new password stays on the till form', async () => {
    const user = userEvent.setup();
    render(<CounterPasswordChange onChanged={() => undefined} />);
    await user.type(screen.getByLabelText('Current password'), 'counter-pass-1');
    await user.type(screen.getByLabelText('New password'), 'short');
    await user.type(screen.getByLabelText('Confirm new password'), 'short');
    await user.click(screen.getByRole('button', { name: 'Save counter password' }));
    expect(screen.getByRole('alert')).toHaveTextContent('at least eight characters');
    expect(changeMock).not.toHaveBeenCalled();
  });

  it('loading: submit disables the till button', async () => {
    const user = userEvent.setup();
    changeMock.mockReturnValue(new Promise(() => undefined));
    render(<CounterPasswordChange onChanged={() => undefined} />);
    await user.type(screen.getByLabelText('Current password'), 'counter-pass-1');
    await user.type(screen.getByLabelText('New password'), 'counter-pass-2');
    await user.type(screen.getByLabelText('Confirm new password'), 'counter-pass-2');
    await user.click(screen.getByRole('button', { name: 'Save counter password' }));
    expect(screen.getByRole('button', { name: 'Saving password' })).toBeDisabled();
  });

  it('denied: wrong current password is a counter mismatch', async () => {
    const user = userEvent.setup();
    changeMock.mockRejectedValue(new ApiError('nope', 401, 'INVALID_CREDENTIALS'));
    render(<CounterPasswordChange onChanged={() => undefined} />);
    await user.type(screen.getByLabelText('Current password'), 'wrong-pass');
    await user.type(screen.getByLabelText('New password'), 'counter-pass-2');
    await user.type(screen.getByLabelText('Confirm new password'), 'counter-pass-2');
    await user.click(screen.getByRole('button', { name: 'Save counter password' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Current password does not match this counter',
    );
  });

  it('conflict: reused password is rejected', async () => {
    const user = userEvent.setup();
    changeMock.mockRejectedValue(new ApiError('reuse', 422, 'PASSWORD_REUSED'));
    render(<CounterPasswordChange onChanged={() => undefined} />);
    await user.type(screen.getByLabelText('Current password'), 'counter-pass-1');
    await user.type(screen.getByLabelText('New password'), 'counter-pass-1');
    await user.type(screen.getByLabelText('Confirm new password'), 'counter-pass-1');
    await user.click(screen.getByRole('button', { name: 'Save counter password' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'That password was used before on this till',
    );
  });

  it('failure: network errors stay on the till form', async () => {
    const user = userEvent.setup();
    changeMock.mockRejectedValue(new ApiError('down', 0, 'NETWORK'));
    render(<CounterPasswordChange onChanged={() => undefined} />);
    await user.type(screen.getByLabelText('Current password'), 'counter-pass-1');
    await user.type(screen.getByLabelText('New password'), 'counter-pass-2');
    await user.type(screen.getByLabelText('Confirm new password'), 'counter-pass-2');
    await user.click(screen.getByRole('button', { name: 'Save counter password' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not reach the server');
  });

  it('success: calls onChanged after the till password is saved', async () => {
    const user = userEvent.setup();
    const onChanged = vi.fn();
    changeMock.mockResolvedValue({
      userId: 'u1',
      displayName: 'Owner',
      role: 'pharmacy_owner',
      tenantId: 't1',
      pinSet: true,
      mustChangePassword: false,
    });
    render(<CounterPasswordChange onChanged={onChanged} />);
    await user.type(screen.getByLabelText('Current password'), 'counter-pass-1');
    await user.type(screen.getByLabelText('New password'), 'counter-pass-2');
    await user.type(screen.getByLabelText('Confirm new password'), 'counter-pass-2');
    await user.click(screen.getByRole('button', { name: 'Save counter password' }));
    expect(onChanged).toHaveBeenCalled();
  });
});
