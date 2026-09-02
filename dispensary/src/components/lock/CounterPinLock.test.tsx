import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CounterPinLock } from '@/components/lock/CounterPinLock';
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

import { unlockPin } from '@/services/auth';

const unlockMock = vi.mocked(unlockPin);

describe('dispensary counter PIN lock', () => {
  beforeEach(() => {
    unlockMock.mockReset();
  });

  it('empty: shows the locked till without an alert', () => {
    render(
      <CounterPinLock staffName="Chemist" onUnlocked={vi.fn()} onSessionRevoked={vi.fn()} />,
    );
    expect(screen.getByRole('heading', { name: 'Counter locked' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Counter PIN')).toHaveValue('');
    expect(screen.getByText('0 of 6 digits')).toBeInTheDocument();
  });

  it('validation: short PIN asks for all six digits', async () => {
    const user = userEvent.setup();
    render(
      <CounterPinLock staffName="Chemist" onUnlocked={vi.fn()} onSessionRevoked={vi.fn()} />,
    );
    await user.type(screen.getByLabelText('Counter PIN'), '123');
    await user.click(screen.getByRole('button', { name: 'Unlock this counter' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Enter all six digits');
    expect(unlockMock).not.toHaveBeenCalled();
  });

  it('loading: unlock disables while the till waits', async () => {
    const user = userEvent.setup();
    unlockMock.mockReturnValue(new Promise(() => undefined));
    render(
      <CounterPinLock staffName="Chemist" onUnlocked={vi.fn()} onSessionRevoked={vi.fn()} />,
    );
    await user.type(screen.getByLabelText('Counter PIN'), '123456');
    await user.click(screen.getByRole('button', { name: 'Unlock this counter' }));
    expect(screen.getByRole('button', { name: 'Unlocking' })).toBeDisabled();
  });

  it('denied: wrong PIN stays at this till', async () => {
    const user = userEvent.setup();
    unlockMock.mockRejectedValue(new ApiError('Incorrect PIN', 401, 'INVALID_PIN'));
    render(
      <CounterPinLock staffName="Chemist" onUnlocked={vi.fn()} onSessionRevoked={vi.fn()} />,
    );
    await user.type(screen.getByLabelText('Counter PIN'), '111111');
    await user.click(screen.getByRole('button', { name: 'Unlock this counter' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('That PIN does not match this till');
  });

  it('conflict: stale counter session is explained', async () => {
    const user = userEvent.setup();
    unlockMock.mockRejectedValue(new ApiError('Conflict', 409, 'CONFLICT'));
    render(
      <CounterPinLock staffName="Chemist" onUnlocked={vi.fn()} onSessionRevoked={vi.fn()} />,
    );
    await user.type(screen.getByLabelText('Counter PIN'), '123456');
    await user.click(screen.getByRole('button', { name: 'Unlock this counter' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Sign in again');
  });

  it('failure: network errors stay on the lock', async () => {
    const user = userEvent.setup();
    unlockMock.mockRejectedValue(new ApiError('Could not reach the server', 0, 'NETWORK'));
    render(
      <CounterPinLock staffName="Chemist" onUnlocked={vi.fn()} onSessionRevoked={vi.fn()} />,
    );
    await user.type(screen.getByLabelText('Counter PIN'), '123456');
    await user.click(screen.getByRole('button', { name: 'Unlock this counter' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Stay at this till and retry');
  });

  it('success: unlock restores the same session', async () => {
    const user = userEvent.setup();
    const onUnlocked = vi.fn();
    unlockMock.mockResolvedValue({
      userId: 'u1',
      displayName: 'Chemist',
      role: 'pharmacy_owner',
      tenantId: 't1',
      pinSet: true,
    });
    render(
      <CounterPinLock staffName="Chemist" onUnlocked={onUnlocked} onSessionRevoked={vi.fn()} />,
    );
    await user.type(screen.getByLabelText('Counter PIN'), '123456');
    await user.click(screen.getByRole('button', { name: 'Unlock this counter' }));
    expect(onUnlocked).toHaveBeenCalled();
  });

  it('missing counter session sends the chemist back to login', async () => {
    const user = userEvent.setup();
    const onSessionRevoked = vi.fn();
    unlockMock.mockRejectedValue(new ApiError('Authentication required', 401, 'UNAUTHORIZED'));
    render(
      <CounterPinLock staffName="Chemist" onUnlocked={vi.fn()} onSessionRevoked={onSessionRevoked} />,
    );
    await user.type(screen.getByLabelText('Counter PIN'), '123456');
    await user.click(screen.getByRole('button', { name: 'Unlock this counter' }));
    expect(onSessionRevoked).toHaveBeenCalled();
  });

  it('third failed unlock revokes the counter session', async () => {
    const user = userEvent.setup();
    const onSessionRevoked = vi.fn();
    unlockMock
      .mockRejectedValueOnce(new ApiError('Incorrect PIN', 401, 'INVALID_PIN'))
      .mockRejectedValueOnce(new ApiError('Incorrect PIN', 401, 'INVALID_PIN'))
      .mockRejectedValueOnce(new ApiError('Session ended. Sign in again.', 401, 'SESSION_REVOKED'));
    render(
      <CounterPinLock staffName="Chemist" onUnlocked={vi.fn()} onSessionRevoked={onSessionRevoked} />,
    );
    for (let i = 0; i < 3; i += 1) {
      await user.clear(screen.getByLabelText('Counter PIN'));
      await user.type(screen.getByLabelText('Counter PIN'), '111111');
      await user.click(screen.getByRole('button', { name: 'Unlock this counter' }));
    }
    expect(onSessionRevoked).toHaveBeenCalled();
  });
});
