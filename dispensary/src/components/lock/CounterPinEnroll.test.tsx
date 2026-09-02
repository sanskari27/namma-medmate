import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CounterPinEnroll } from '@/components/lock/CounterPinEnroll';
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

describe('dispensary counter PIN enroll', () => {
  beforeEach(() => {
    setPinMock.mockReset();
  });

  it('empty: asks the chemist to set a till PIN', () => {
    render(<CounterPinEnroll onEnrolled={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Set a counter PIN' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Counter PIN')).toHaveValue('');
  });

  it('validation: mismatched digits stay on the till form', async () => {
    const user = userEvent.setup();
    render(<CounterPinEnroll onEnrolled={vi.fn()} />);
    await user.type(screen.getByLabelText('Counter PIN'), '123456');
    await user.type(screen.getByLabelText('Repeat PIN'), '111111');
    await user.click(screen.getByRole('button', { name: 'Save PIN' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Enter the same six-digit PIN twice');
    expect(setPinMock).not.toHaveBeenCalled();
  });

  it('loading: save disables while the counter waits', async () => {
    const user = userEvent.setup();
    setPinMock.mockReturnValue(new Promise(() => undefined));
    render(<CounterPinEnroll onEnrolled={vi.fn()} />);
    await user.type(screen.getByLabelText('Counter PIN'), '123456');
    await user.type(screen.getByLabelText('Repeat PIN'), '123456');
    await user.click(screen.getByRole('button', { name: 'Save PIN' }));
    expect(screen.getByRole('button', { name: 'Saving PIN' })).toBeDisabled();
  });

  it('denied: expired session tells the chemist to sign in again', async () => {
    const user = userEvent.setup();
    setPinMock.mockRejectedValue(new ApiError('Authentication required', 401, 'UNAUTHORIZED'));
    render(<CounterPinEnroll onEnrolled={vi.fn()} />);
    await user.type(screen.getByLabelText('Counter PIN'), '123456');
    await user.type(screen.getByLabelText('Repeat PIN'), '123456');
    await user.click(screen.getByRole('button', { name: 'Save PIN' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Sign in again, then set the PIN');
  });

  it('conflict: existing PIN is explained in counter language', async () => {
    const user = userEvent.setup();
    setPinMock.mockRejectedValue(new ApiError('PIN is already set.', 409, 'PIN_ALREADY_SET'));
    render(<CounterPinEnroll onEnrolled={vi.fn()} />);
    await user.type(screen.getByLabelText('Counter PIN'), '123456');
    await user.type(screen.getByLabelText('Repeat PIN'), '123456');
    await user.click(screen.getByRole('button', { name: 'Save PIN' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('This counter already has a PIN');
  });

  it('failure: network errors stay on the enroll form', async () => {
    const user = userEvent.setup();
    setPinMock.mockRejectedValue(new ApiError('Could not reach the server', 0, 'NETWORK'));
    render(<CounterPinEnroll onEnrolled={vi.fn()} />);
    await user.type(screen.getByLabelText('Counter PIN'), '123456');
    await user.type(screen.getByLabelText('Repeat PIN'), '123456');
    await user.click(screen.getByRole('button', { name: 'Save PIN' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Try saving the PIN from this counter');
  });

  it('success: enrolled callback runs after a saved PIN', async () => {
    const user = userEvent.setup();
    const onEnrolled = vi.fn();
    setPinMock.mockResolvedValue({
      userId: 'u1',
      displayName: 'Chemist',
      role: 'pharmacy_owner',
      tenantId: 't1',
      pinSet: true,
    });
    render(<CounterPinEnroll onEnrolled={onEnrolled} />);
    await user.type(screen.getByLabelText('Counter PIN'), '123456');
    await user.type(screen.getByLabelText('Repeat PIN'), '123456');
    await user.click(screen.getByRole('button', { name: 'Save PIN' }));
    expect(onEnrolled).toHaveBeenCalled();
  });

  it('escape does not dismiss the blocking enroll overlay', async () => {
    const user = userEvent.setup();
    render(<CounterPinEnroll onEnrolled={vi.fn()} />);
    await user.keyboard('{Escape}');
    expect(screen.getByRole('dialog', { name: 'Set a counter PIN' })).toBeInTheDocument();
  });
});
