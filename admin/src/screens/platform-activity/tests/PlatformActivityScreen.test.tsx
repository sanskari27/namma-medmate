import { configureStore } from '@reduxjs/toolkit';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PlatformActivityScreen from '@/screens/platform-activity/PlatformActivityScreen';
import { ApiError } from '@/services/axios';
import { authReducer } from '@/store';

vi.mock('@/services/workflows', () => ({
  listPlatformActivity: vi.fn(),
}));

import { listPlatformActivity } from '@/services/workflows';

const listAudit = vi.mocked(listPlatformActivity);

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
      <PlatformActivityScreen />
    </Provider>,
  );
}

describe('PlatformActivityScreen', () => {
  beforeEach(() => {
    listAudit.mockReset();
  });

  it('shows loading then empty', async () => {
    let resolveAudit: (value: never[]) => void = () => undefined;
    listAudit.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveAudit = resolve as (value: never[]) => void;
        }),
    );
    renderPage('admin_super');
    expect(screen.getByText(/Loading platform activity/i)).toBeInTheDocument();
    resolveAudit([]);
    expect(await screen.findByText(/No retained platform activity/i)).toBeInTheDocument();
  });

  it('denies non-master', async () => {
    renderPage('admin_verification');
    expect(await screen.findByText(/authorized HQ desks/i)).toBeInTheDocument();
  });

  it('lists retained events', async () => {
    listAudit.mockResolvedValue([
      {
        id: 'a1',
        userId: 'm1',
        tenantId: null,
        branchId: null,
        action: 'LOGIN',
        outcome: 'SUCCESS',
        attemptedIdentity: 'hq@nammamedmate.local',
        sourceIp: '198.51.100.10',
        userAgent: 'Test',
        sessionId: 's1',
        contextJson: null,
        createdAt: '2026-09-03T00:00:00Z',
      },
    ]);
    renderPage('admin_super');
    expect(await screen.findByText('LOGIN')).toBeInTheDocument();
    expect(screen.getByText(/hq@nammamedmate.local/)).toBeInTheDocument();
  });

  it('shows failure', async () => {
    listAudit.mockRejectedValue(new ApiError('fail', 500, 'DOWN'));
    renderPage('admin_super');
    expect(await screen.findByText(/Could not load platform activity/i)).toBeInTheDocument();
  });
});
