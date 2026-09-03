import { configureStore } from '@reduxjs/toolkit';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import KioskScreen from '@/screens/kiosk/KioskScreen';
import { ApiError } from '@/services/axios';
import { authReducer } from '@/store';
import type { KioskState } from '@/services/kiosk';

vi.mock('@/services/kiosk', async () => {
  const axios = await import('@/services/axios');
  return {
    getKiosk: vi.fn(),
    openKiosk: vi.fn(),
    closeKiosk: vi.fn(),
    createKioskTicket: vi.fn(),
    cancelKioskTicket: vi.fn(),
    ApiError: axios.ApiError,
    isApiError: axios.isApiError,
  };
});

import {
  cancelKioskTicket,
  closeKiosk,
  createKioskTicket,
  getKiosk,
  openKiosk,
} from '@/services/kiosk';

const getMock = vi.mocked(getKiosk);
const openMock = vi.mocked(openKiosk);
const closeMock = vi.mocked(closeKiosk);
const createMock = vi.mocked(createKioskTicket);
const cancelMock = vi.mocked(cancelKioskTicket);

const ready: KioskState = {
  planEntitled: true,
  hasModule: true,
  branchType: 'KIOSK',
  activeBranchId: 'b1',
  blockReason: null,
  session: null,
  waitingTickets: [],
};

const opened: KioskState = {
  ...ready,
  session: {
    id: 's1',
    status: 'OPEN',
    openedAt: '2026-09-04T01:00:00Z',
    openedBy: 'u1',
  },
};

function renderPage(modules: string[] = ['KIOSK']) {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        user: {
          userId: 'u1',
          displayName: 'Owner',
          role: 'pharmacy_owner',
          tenantId: 't1',
          pinSet: true,
          tenantStatus: 'ACTIVE',
          emailVerified: true,
          modules,
          activeBranchId: 'b1',
        },
      },
    },
  });
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <KioskScreen />
      </MemoryRouter>
    </Provider>,
  );
}

describe('self-order kiosk', () => {
  beforeEach(() => {
    getMock.mockReset();
    openMock.mockReset();
    closeMock.mockReset();
    createMock.mockReset();
    cancelMock.mockReset();
  });

  it('loading: waits for this outlet’s kiosk', () => {
    getMock.mockReturnValue(new Promise(() => undefined));
    renderPage();
    expect(screen.getByRole('alert')).toHaveTextContent('Loading this outlet’s kiosk…');
  });

  it('empty: no active outlet', async () => {
    getMock.mockResolvedValue({
      ...ready,
      activeBranchId: null,
      branchType: null,
      blockReason: 'NO_ACTIVE_BRANCH',
    });
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('Pick an outlet on this till');
    expect(screen.getByRole('link', { name: 'Open outlets' })).toHaveAttribute('href', '/branches');
  });

  it('denied: till without kiosk module', async () => {
    getMock.mockResolvedValue({ ...ready, hasModule: false });
    renderPage([]);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This till login cannot run the self-order kiosk',
    );
  });

  it('quota: Free plan cannot open', async () => {
    getMock.mockResolvedValue({
      ...ready,
      planEntitled: false,
      blockReason: 'PLAN_LIMIT',
    });
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Self-order kiosk is on the Pro plan',
    );
    expect(screen.getByRole('link', { name: 'Open plan for this pharmacy' })).toHaveAttribute(
      'href',
      '/subscription',
    );
  });

  it('retail: wrong outlet type', async () => {
    getMock.mockResolvedValue({
      ...ready,
      branchType: 'RETAIL',
      blockReason: 'BRANCH_TYPE',
    });
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('This outlet is Retail');
  });

  it('failure: network error on load', async () => {
    getMock.mockRejectedValue(new ApiError('down', 500, 'DOWN'));
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not reach the server for this outlet’s kiosk',
    );
  });

  it('conflict: open when already open', async () => {
    const user = userEvent.setup();
    getMock.mockResolvedValue(ready);
    openMock.mockRejectedValue(new ApiError('stale', 409, 'STALE_STATE'));
    renderPage();
    await screen.findByRole('heading', { name: 'Self-order kiosk' });
    await user.click(screen.getByRole('button', { name: 'Open this outlet’s kiosk' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Kiosk state changed on another till',
    );
  });

  it('validation: pickup text required before token', async () => {
    const user = userEvent.setup();
    getMock.mockResolvedValue(ready);
    openMock.mockResolvedValue(opened);
    renderPage();
    await screen.findByRole('heading', { name: 'Self-order kiosk' });
    await user.click(screen.getByRole('button', { name: 'Open this outlet’s kiosk' }));
    expect(
      await screen.findByRole('heading', { name: 'What do you need from this counter?' }),
    ).toBeInTheDocument();
    await user.clear(screen.getByLabelText('What to pick up'));
    await user.click(screen.getByRole('button', { name: 'Get pickup token' }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Write what the walk-in needs before printing a pickup token',
    );
    expect(createMock).not.toHaveBeenCalled();
  });

  it('success: open kiosk and issue a pickup token', async () => {
    const user = userEvent.setup();
    getMock.mockResolvedValue(ready);
    openMock.mockResolvedValue(opened);
    createMock.mockResolvedValue({
      ...opened,
      waitingTickets: [
        {
          id: 't1',
          token: 1,
          walkInName: 'Meera',
          pickupRequest: 'Crocin 650',
          createdAt: '2026-09-04T01:01:00Z',
        },
      ],
    });
    renderPage();
    await screen.findByRole('heading', { name: 'Self-order kiosk' });
    await user.click(screen.getByRole('button', { name: 'Open this outlet’s kiosk' }));
    await screen.findByRole('heading', { name: 'What do you need from this counter?' });
    await user.type(screen.getByLabelText('Your name (optional)'), 'Meera');
    await user.type(screen.getByLabelText('What to pick up'), 'Crocin 650');
    await user.click(screen.getByRole('button', { name: 'Get pickup token' }));
    await waitFor(() => expect(createMock).toHaveBeenCalled());
    expect(await screen.findByRole('alert')).toHaveTextContent('Pickup token ready');
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('success: staff clears a waiting slip from counter view', async () => {
    const user = userEvent.setup();
    getMock.mockResolvedValue({
      ...opened,
      waitingTickets: [
        {
          id: 't1',
          token: 2,
          walkInName: null,
          pickupRequest: 'Dolo',
          createdAt: '2026-09-04T01:02:00Z',
        },
      ],
    });
    cancelMock.mockResolvedValue(opened);
    renderPage();
    await screen.findByRole('heading', { name: 'What do you need from this counter?' });
    await user.click(screen.getByRole('button', { name: 'Staff: counter view' }));
    expect(await screen.findByText('Dolo')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear slip' }));
    await waitFor(() => expect(cancelMock).toHaveBeenCalledWith('t1'));
    expect(screen.getByText('No walk-in slips waiting at this outlet.')).toBeInTheDocument();
  });
});
