import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import OperatorPasswordScreen from '@/screens/operator-password/OperatorPasswordScreen';
import { ApiError } from '@/services/axios';

vi.mock('@/services/auth', async () => {
  const axios = await import('@/services/axios');
  return {
    adminResetPassword: vi.fn(),
    ApiError: axios.ApiError,
    isApiError: axios.isApiError,
  };
});

import { adminResetPassword } from '@/services/auth';

const resetMock = vi.mocked(adminResetPassword);

describe('HQ operator password reset', () => {
  beforeEach(() => {
    resetMock.mockReset();
  });

  it('empty: shows the operator form without a status', () => {
    render(<OperatorPasswordScreen />);
    expect(screen.getByRole('heading', { name: 'Reset operator password' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('validation: MASTER must enter email and an eight-character secret', async () => {
    const user = userEvent.setup();
    render(<OperatorPasswordScreen />);
    await user.click(screen.getByRole('button', { name: 'Set operator secret' }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Enter the operator email and a temporary secret',
    );
    expect(resetMock).not.toHaveBeenCalled();
  });

  it('loading: submit disables the console button', async () => {
    const user = userEvent.setup();
    resetMock.mockReturnValue(new Promise(() => undefined));
    render(<OperatorPasswordScreen />);
    await user.type(screen.getByLabelText('Operator email'), 'agent@hq.local');
    await user.type(screen.getByLabelText('Temporary secret'), 'temp-pass-9');
    await user.type(screen.getByLabelText('Confirm temporary secret'), 'temp-pass-9');
    await user.click(screen.getByRole('button', { name: 'Set operator secret' }));
    expect(screen.getByRole('button', { name: 'Saving operator secret' })).toBeDisabled();
  });

  it('denied: unknown operator is not disclosed', async () => {
    const user = userEvent.setup();
    resetMock.mockRejectedValue(new ApiError('missing', 404, 'NOT_FOUND'));
    render(<OperatorPasswordScreen />);
    await user.type(screen.getByLabelText('Operator email'), 'gone@hq.local');
    await user.type(screen.getByLabelText('Temporary secret'), 'temp-pass-9');
    await user.type(screen.getByLabelText('Confirm temporary secret'), 'temp-pass-9');
    await user.click(screen.getByRole('button', { name: 'Set operator secret' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('not a sub-account you created');
  });

  it('conflict: reused secret is rejected', async () => {
    const user = userEvent.setup();
    resetMock.mockRejectedValue(new ApiError('reuse', 422, 'PASSWORD_REUSED'));
    render(<OperatorPasswordScreen />);
    await user.type(screen.getByLabelText('Operator email'), 'agent@hq.local');
    await user.type(screen.getByLabelText('Temporary secret'), 'password1');
    await user.type(screen.getByLabelText('Confirm temporary secret'), 'password1');
    await user.click(screen.getByRole('button', { name: 'Set operator secret' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('already in this operator history');
  });

  it('failure: API outage stays on the console form', async () => {
    const user = userEvent.setup();
    resetMock.mockRejectedValue(new ApiError('down', 0, 'NETWORK'));
    render(<OperatorPasswordScreen />);
    await user.type(screen.getByLabelText('Operator email'), 'agent@hq.local');
    await user.type(screen.getByLabelText('Temporary secret'), 'temp-pass-9');
    await user.type(screen.getByLabelText('Confirm temporary secret'), 'temp-pass-9');
    await user.click(screen.getByRole('button', { name: 'Set operator secret' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The platform API did not reset the operator',
    );
  });

  it('success: MASTER is told the operator must rotate on next authentication', async () => {
    const user = userEvent.setup();
    resetMock.mockResolvedValue({
      userId: 'a1',
      displayName: 'Agent',
      role: 'admin_super',
      tenantId: null,
      pinSet: false,
      mustChangePassword: true,
    });
    render(<OperatorPasswordScreen />);
    await user.type(screen.getByLabelText('Operator email'), 'agent@hq.local');
    await user.type(screen.getByLabelText('Temporary secret'), 'temp-pass-9');
    await user.type(screen.getByLabelText('Confirm temporary secret'), 'temp-pass-9');
    await user.click(screen.getByRole('button', { name: 'Set operator secret' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'must rotate it on next authentication',
    );
  });
});
