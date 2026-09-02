import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HqPasswordChange } from '@organisms/hq-password-change';
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

describe('HQ forced password rotate', () => {
  beforeEach(() => {
    changeMock.mockReset();
  });

  it('empty: shows the HQ rotate form without a status', () => {
    render(<HqPasswordChange onChanged={() => undefined} />);
    expect(screen.getByRole('heading', { name: 'Rotate HQ password' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('validation: short secret stays on the console form', async () => {
    const user = userEvent.setup();
    render(<HqPasswordChange onChanged={() => undefined} />);
    await user.type(screen.getByLabelText('Current HQ password'), 'password1');
    await user.type(screen.getByLabelText('New HQ password'), 'short');
    await user.type(screen.getByLabelText('Confirm HQ password'), 'short');
    await user.click(screen.getByRole('button', { name: 'Save HQ password' }));
    expect(screen.getByRole('alert')).toHaveTextContent('at least eight characters');
    expect(changeMock).not.toHaveBeenCalled();
  });

  it('loading: submit disables the console button', async () => {
    const user = userEvent.setup();
    changeMock.mockReturnValue(new Promise(() => undefined));
    render(<HqPasswordChange onChanged={() => undefined} />);
    await user.type(screen.getByLabelText('Current HQ password'), 'password1');
    await user.type(screen.getByLabelText('New HQ password'), 'hq-pass-22');
    await user.type(screen.getByLabelText('Confirm HQ password'), 'hq-pass-22');
    await user.click(screen.getByRole('button', { name: 'Save HQ password' }));
    expect(screen.getByRole('button', { name: 'Saving HQ password' })).toBeDisabled();
  });

  it('denied: wrong current secret is not recognised', async () => {
    const user = userEvent.setup();
    changeMock.mockRejectedValue(new ApiError('nope', 401, 'INVALID_CREDENTIALS'));
    render(<HqPasswordChange onChanged={() => undefined} />);
    await user.type(screen.getByLabelText('Current HQ password'), 'wrong-pass');
    await user.type(screen.getByLabelText('New HQ password'), 'hq-pass-22');
    await user.type(screen.getByLabelText('Confirm HQ password'), 'hq-pass-22');
    await user.click(screen.getByRole('button', { name: 'Save HQ password' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Current HQ password was not recognised',
    );
  });

  it('conflict: reused secret is rejected', async () => {
    const user = userEvent.setup();
    changeMock.mockRejectedValue(new ApiError('reuse', 422, 'PASSWORD_REUSED'));
    render(<HqPasswordChange onChanged={() => undefined} />);
    await user.type(screen.getByLabelText('Current HQ password'), 'password1');
    await user.type(screen.getByLabelText('New HQ password'), 'password1');
    await user.type(screen.getByLabelText('Confirm HQ password'), 'password1');
    await user.click(screen.getByRole('button', { name: 'Save HQ password' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('already in this operator history');
  });

  it('failure: API outage stays on the console form', async () => {
    const user = userEvent.setup();
    changeMock.mockRejectedValue(new ApiError('down', 0, 'NETWORK'));
    render(<HqPasswordChange onChanged={() => undefined} />);
    await user.type(screen.getByLabelText('Current HQ password'), 'password1');
    await user.type(screen.getByLabelText('New HQ password'), 'hq-pass-22');
    await user.type(screen.getByLabelText('Confirm HQ password'), 'hq-pass-22');
    await user.click(screen.getByRole('button', { name: 'Save HQ password' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The platform API did not save the password',
    );
  });

  it('success: calls onChanged after the HQ secret is saved', async () => {
    const user = userEvent.setup();
    const onChanged = vi.fn();
    changeMock.mockResolvedValue({
      userId: 'm1',
      displayName: 'Sanskar',
      role: 'admin_super',
      tenantId: null,
      pinSet: true,
      mustChangePassword: false,
    });
    render(<HqPasswordChange onChanged={onChanged} />);
    await user.type(screen.getByLabelText('Current HQ password'), 'password1');
    await user.type(screen.getByLabelText('New HQ password'), 'hq-pass-22');
    await user.type(screen.getByLabelText('Confirm HQ password'), 'hq-pass-22');
    await user.click(screen.getByRole('button', { name: 'Save HQ password' }));
    expect(onChanged).toHaveBeenCalled();
  });
});
