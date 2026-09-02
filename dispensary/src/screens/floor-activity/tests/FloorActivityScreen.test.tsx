import { configureStore } from '@reduxjs/toolkit';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FloorActivityScreen from '@/screens/floor-activity/FloorActivityScreen';
import { ApiError } from '@/services/axios';
import { authReducer } from '@/store';

vi.mock('@/services/approvals', () => ({
  listAuditEvents: vi.fn(),
}));

import { listAuditEvents } from '@/services/approvals';

const listAudit = vi.mocked(listAuditEvents);

function renderPage(role: string, modules?: string[]) {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        user: {
          userId: 'u1',
          displayName: 'Varshmaan',
          role,
          tenantId: 't1',
          pinSet: true,
          modules,
        },
      },
    },
  });
  return render(
    <Provider store={store}>
      <FloorActivityScreen />
    </Provider>,
  );
}

describe('FloorActivityScreen', () => {
  beforeEach(() => {
    listAudit.mockReset();
  });

  it('shows loading then list', async () => {
    let resolveAudit: (value: Awaited<ReturnType<typeof listAuditEvents>>) => void = () =>
      undefined;
    listAudit.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveAudit = resolve;
        }),
    );
    renderPage('pharmacy_owner');
    expect(screen.getByText(/Loading floor activity/i)).toBeInTheDocument();
    resolveAudit([
      {
        id: 'a1',
        userId: 'u1',
        tenantId: 't1',
        branchId: null,
        action: 'LOGIN',
        outcome: 'SUCCESS',
        attemptedIdentity: 'owner@shop.local',
        sourceIp: '203.0.113.9',
        userAgent: 'Test',
        sessionId: 's1',
        contextJson: null,
        createdAt: '2026-09-03T00:00:00Z',
      },
    ]);
    expect(await screen.findByText('LOGIN')).toBeInTheDocument();
  });

  it('shows denied without approvals', async () => {
    renderPage('pharmacy_staff', ['SALES']);
    expect(await screen.findByText(/need Approvals access/i)).toBeInTheDocument();
  });

  it('lists recent activity for owner', async () => {
    listAudit.mockResolvedValue([
      {
        id: 'a1',
        userId: 'u1',
        tenantId: 't1',
        branchId: null,
        action: 'LOGIN',
        outcome: 'SUCCESS',
        attemptedIdentity: 'owner@shop.local',
        sourceIp: '203.0.113.9',
        userAgent: 'Test',
        sessionId: 's1',
        contextJson: null,
        createdAt: '2026-09-03T00:00:00Z',
      },
    ]);
    renderPage('pharmacy_owner');
    expect(await screen.findByText('LOGIN')).toBeInTheDocument();
    expect(screen.getByText(/owner@shop.local/)).toBeInTheDocument();
  });

  it('shows empty state', async () => {
    listAudit.mockResolvedValue([]);
    renderPage('pharmacy_owner');
    expect(await screen.findByText(/No recent floor activity/i)).toBeInTheDocument();
  });

  it('shows failure state', async () => {
    listAudit.mockRejectedValue(new ApiError('fail', 500, 'DOWN'));
    renderPage('pharmacy_owner');
    expect(await screen.findByText(/Could not load floor activity/i)).toBeInTheDocument();
  });
});
