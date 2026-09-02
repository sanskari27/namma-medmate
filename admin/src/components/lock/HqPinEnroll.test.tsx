import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HqPinEnroll } from '@/components/lock/HqPinEnroll';
import { ApiError } from '@/services/axios';

vi.mock('@/services/auth', async () => {
  const axios = await import('@/services/axios');
  return {
    setPin: vi.fn(),
    unlockPin: vi.fn(),
    loginWithPassword: vi.fn(),
    ApiError: axios.ApiError,
    isApiError: axios.isApiError,
  };
});

import { setPin } from '@/services/auth';

const setPinMock = vi.mocked(setPin);

describe('admin HQ PIN enroll', () => {
  beforeEach(() => {
    setPinMock.mockReset();
  });

  it('empty: asks the operator to set an HQ PIN', () => {
    render(<HqPinEnroll onEnrolled={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Set HQ PIN' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByLabelText('HQ PIN')).toHaveValue('');
  });

  it('validation: mismatched HQ digits stay on the console form', async () => {
    const user = userEvent.setup();
    render(<HqPinEnroll onEnrolled={vi.fn()} />);
    await user.type(screen.getByLabelText('HQ PIN'), '123456');
    await user.type(screen.getByLabelText('Confirm HQ PIN'), '000000');
    await user.click(screen.getByRole('button', { name: 'Save HQ PIN' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Enter the same six-digit HQ PIN twice');
    expect(setPinMock).not.toHaveBeenCalled();
  });

  it('loading: save disables while HQ waits', async () => {
    const user = userEvent.setup();
    setPinMock.mockReturnValue(new Promise(() => undefined));
    render(<HqPinEnroll onEnrolled={vi.fn()} />);
    await user.type(screen.getByLabelText('HQ PIN'), '123456');
    await user.type(screen.getByLabelText('Confirm HQ PIN'), '123456');
    await user.click(screen.getByRole('button', { name: 'Save HQ PIN' }));
    expect(screen.getByRole('button', { name: 'Saving HQ PIN' })).toBeDisabled();
  });

  it('denied: expired HQ session is explained', async () => {
    const user = userEvent.setup();
    setPinMock.mockRejectedValue(new ApiError('Authentication required', 401, 'UNAUTHORIZED'));
    render(<HqPinEnroll onEnrolled={vi.fn()} />);
    await user.type(screen.getByLabelText('HQ PIN'), '123456');
    await user.type(screen.getByLabelText('Confirm HQ PIN'), '123456');
    await user.click(screen.getByRole('button', { name: 'Save HQ PIN' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Authenticate again, then set the PIN');
  });

  it('conflict: existing operator PIN is reported', async () => {
    const user = userEvent.setup();
    setPinMock.mockRejectedValue(new ApiError('PIN is already set.', 409, 'PIN_ALREADY_SET'));
    render(<HqPinEnroll onEnrolled={vi.fn()} />);
    await user.type(screen.getByLabelText('HQ PIN'), '123456');
    await user.type(screen.getByLabelText('Confirm HQ PIN'), '123456');
    await user.click(screen.getByRole('button', { name: 'Save HQ PIN' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('An HQ PIN is already on this operator');
  });

  it('failure: API outage stays on the enroll panel', async () => {
    const user = userEvent.setup();
    setPinMock.mockRejectedValue(new ApiError('The platform API did not respond', 0, 'NETWORK'));
    render(<HqPinEnroll onEnrolled={vi.fn()} />);
    await user.type(screen.getByLabelText('HQ PIN'), '123456');
    await user.type(screen.getByLabelText('Confirm HQ PIN'), '123456');
    await user.click(screen.getByRole('button', { name: 'Save HQ PIN' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Retry from this console');
  });

  it('success: enrolled callback runs after HQ PIN save', async () => {
    const user = userEvent.setup();
    const onEnrolled = vi.fn();
    setPinMock.mockResolvedValue({
      userId: 'm1',
      displayName: 'Sanskar',
      role: 'admin_super',
      tenantId: null,
      pinSet: true,
    });
    render(<HqPinEnroll onEnrolled={onEnrolled} />);
    await user.type(screen.getByLabelText('HQ PIN'), '123456');
    await user.type(screen.getByLabelText('Confirm HQ PIN'), '123456');
    await user.click(screen.getByRole('button', { name: 'Save HQ PIN' }));
    expect(onEnrolled).toHaveBeenCalled();
  });
});
