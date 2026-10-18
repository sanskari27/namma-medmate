import { configureStore } from '@reduxjs/toolkit';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import WaitlistScreen from '@/screens/waitlist/WaitlistScreen';
import { ApiError } from '@/services/axios';
import { authReducer } from '@/store';
import type { WaitlistSignup } from '@/services/waitlist';

vi.mock('@/services/waitlist', () => ({
  listWaitlist: vi.fn(),
}));

import { listWaitlist } from '@/services/waitlist';

const list = vi.mocked(listWaitlist);

const row: WaitlistSignup = {
  id: 'w1',
  name: 'Asha Rao',
  phone: '9845012345',
  pincode: '560034',
  age: 28,
  gender: 'female',
  consent: true,
  source: 'home',
  lang: 'en',
  offer: 'premium-3m-v1',
  createdAt: '2026-10-18T08:30:00Z',
};

function renderPage(role: string) {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        user: {
          userId: 'm1',
          displayName: 'Sanskar',
          role,
          tenantId: null,
          pinSet: true,
        },
      },
    },
  });
  return render(
    <Provider store={store}>
      <WaitlistScreen />
    </Provider>,
  );
}

describe('WaitlistScreen', () => {
  beforeEach(() => {
    list.mockReset();
  });

  it('shows loading then empty', async () => {
    let resolveList: (value: WaitlistSignup[]) => void = () => undefined;
    list.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveList = resolve;
        }),
    );
    renderPage('admin_super');
    expect(screen.getByText(/Loading waitlist sign-ups/i)).toBeInTheDocument();
    resolveList([]);
    expect(await screen.findByText(/No waitlist sign-ups yet/i)).toBeInTheDocument();
  });

  it('denies non-master', async () => {
    renderPage('admin_verification');
    expect(await screen.findByText(/Only MASTER can read the waitlist/i)).toBeInTheDocument();
    expect(list).not.toHaveBeenCalled();
  });

  it('lists sign-ups and filters by phone', async () => {
    list.mockResolvedValue([row, { ...row, id: 'w2', name: 'Ravi', phone: '9000000001' }]);
    renderPage('admin_super');
    expect(await screen.findByText('Asha Rao')).toBeInTheDocument();
    expect(screen.getAllByText('Female').length).toBeGreaterThan(0);
    expect(screen.getAllByText('premium-3m-v1').length).toBeGreaterThan(0);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Find sign-up'), '98450');
    expect(screen.getByText('Asha Rao')).toBeInTheDocument();
    expect(screen.queryByText('Ravi')).not.toBeInTheDocument();
  });

  it('shows failure and retries', async () => {
    list.mockRejectedValueOnce(new ApiError('fail', 500, 'DOWN'));
    list.mockResolvedValueOnce([]);
    renderPage('admin_super');
    expect(await screen.findByText(/Could not load the waitlist/i)).toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText(/No waitlist sign-ups yet/i)).toBeInTheDocument();
  });

  it('shows denied when the API forbids the desk', async () => {
    list.mockRejectedValue(new ApiError('no', 403, 'FORBIDDEN'));
    renderPage('admin_super');
    expect(await screen.findByText(/Only MASTER can read the waitlist/i)).toBeInTheDocument();
  });
});
