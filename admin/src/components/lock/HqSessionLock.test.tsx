import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HqSessionLock } from '@/components/lock/HqSessionLock';
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

describe('admin HQ session lock', () => {
  beforeEach(() => {
    unlockMock.mockReset();
  });

  it('clicking the PIN cells then typing fills the operator PIN', async () => {
    const user = userEvent.setup();
    render(
      <HqSessionLock operatorName="Sanskar" onUnlocked={vi.fn()} onSessionRevoked={vi.fn()} />,
    );
    await user.click(screen.getByTestId('hq-pin-cells'));
    await user.keyboard('123456');
    expect(screen.getByLabelText('Operator PIN')).toHaveValue('123456');
  });

  it('empty: shows the locked HQ console without an alert', () => {
    render(
      <HqSessionLock operatorName="Sanskar" onUnlocked={vi.fn()} onSessionRevoked={vi.fn()} />,
    );
    expect(screen.getByRole('heading', { name: 'HQ session locked' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Operator PIN')).toHaveValue('');
  });

  it('validation: short PIN is rejected before the API', async () => {
    const user = userEvent.setup();
    render(
      <HqSessionLock operatorName="Sanskar" onUnlocked={vi.fn()} onSessionRevoked={vi.fn()} />,
    );
    await user.type(screen.getByLabelText('Operator PIN'), '12');
    await user.click(screen.getByRole('button', { name: 'Resume session' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Enter all six HQ PIN digits');
    expect(unlockMock).not.toHaveBeenCalled();
  });

  it('loading: resume disables while HQ waits', async () => {
    const user = userEvent.setup();
    unlockMock.mockReturnValue(new Promise(() => undefined));
    render(
      <HqSessionLock operatorName="Sanskar" onUnlocked={vi.fn()} onSessionRevoked={vi.fn()} />,
    );
    await user.type(screen.getByLabelText('Operator PIN'), '123456');
    await user.click(screen.getByRole('button', { name: 'Resume session' }));
    expect(screen.getByRole('button', { name: 'Resuming' })).toBeDisabled();
  });

  it('denied: unrecognised operator PIN stays on the overlay', async () => {
    const user = userEvent.setup();
    unlockMock.mockRejectedValue(new ApiError('Incorrect PIN', 401, 'INVALID_PIN'));
    render(
      <HqSessionLock operatorName="Sanskar" onUnlocked={vi.fn()} onSessionRevoked={vi.fn()} />,
    );
    await user.type(screen.getByLabelText('Operator PIN'), '111111');
    await user.click(screen.getByRole('button', { name: 'Resume session' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Operator PIN was not recognised');
  });

  it('conflict: stale HQ session is reported', async () => {
    const user = userEvent.setup();
    unlockMock.mockRejectedValue(new ApiError('Conflict', 409, 'CONFLICT'));
    render(
      <HqSessionLock operatorName="Sanskar" onUnlocked={vi.fn()} onSessionRevoked={vi.fn()} />,
    );
    await user.type(screen.getByLabelText('Operator PIN'), '123456');
    await user.click(screen.getByRole('button', { name: 'Resume session' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('This HQ session is stale');
  });

  it('failure: API outage stays on the lock overlay', async () => {
    const user = userEvent.setup();
    unlockMock.mockRejectedValue(new ApiError('The platform API did not respond', 0, 'NETWORK'));
    render(
      <HqSessionLock operatorName="Sanskar" onUnlocked={vi.fn()} onSessionRevoked={vi.fn()} />,
    );
    await user.type(screen.getByLabelText('Operator PIN'), '123456');
    await user.click(screen.getByRole('button', { name: 'Resume session' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Retry from this console');
  });

  it('success: resume restores the HQ session', async () => {
    const user = userEvent.setup();
    const onUnlocked = vi.fn();
    unlockMock.mockResolvedValue({
      userId: 'm1',
      displayName: 'Sanskar',
      role: 'admin_super',
      tenantId: null,
      pinSet: true,
    });
    render(
      <HqSessionLock operatorName="Sanskar" onUnlocked={onUnlocked} onSessionRevoked={vi.fn()} />,
    );
    await user.type(screen.getByLabelText('Operator PIN'), '123456');
    await user.click(screen.getByRole('button', { name: 'Resume session' }));
    expect(onUnlocked).toHaveBeenCalled();
  });

  it('missing HQ session forces a full login', async () => {
    const user = userEvent.setup();
    const onSessionRevoked = vi.fn();
    unlockMock.mockRejectedValue(new ApiError('Authentication required', 401, 'UNAUTHORIZED'));
    render(
      <HqSessionLock operatorName="Sanskar" onUnlocked={vi.fn()} onSessionRevoked={onSessionRevoked} />,
    );
    await user.type(screen.getByLabelText('Operator PIN'), '123456');
    await user.click(screen.getByRole('button', { name: 'Resume session' }));
    expect(onSessionRevoked).toHaveBeenCalled();
  });

  it('third failed unlock forces a full HQ login', async () => {
    const user = userEvent.setup();
    const onSessionRevoked = vi.fn();
    unlockMock
      .mockRejectedValueOnce(new ApiError('Incorrect PIN', 401, 'INVALID_PIN'))
      .mockRejectedValueOnce(new ApiError('Incorrect PIN', 401, 'INVALID_PIN'))
      .mockRejectedValueOnce(new ApiError('Session ended. Sign in again.', 401, 'SESSION_REVOKED'));
    render(
      <HqSessionLock operatorName="Sanskar" onUnlocked={vi.fn()} onSessionRevoked={onSessionRevoked} />,
    );
    for (let i = 0; i < 3; i += 1) {
      await user.clear(screen.getByLabelText('Operator PIN'));
      await user.type(screen.getByLabelText('Operator PIN'), '111111');
      await user.click(screen.getByRole('button', { name: 'Resume session' }));
    }
    expect(onSessionRevoked).toHaveBeenCalled();
  });
});
