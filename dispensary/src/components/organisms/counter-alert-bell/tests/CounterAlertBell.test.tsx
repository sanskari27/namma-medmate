import { configureStore } from '@reduxjs/toolkit';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CounterAlertBell } from '@organisms/counter-alert-bell';
import { TooltipProvider } from '@atoms';
import { ROUTES } from '@/libs/constants/routes.const';
import { ApiError } from '@/services/axios';
import { authReducer, notificationsReducer } from '@/store';

vi.mock('@/services/notifications', async () => {
  const axios = await import('@/services/axios');
  return {
    fetchInbox: vi.fn(),
    fetchUnreadCount: vi.fn(),
    markNotificationRead: vi.fn(),
    openNotification: vi.fn(),
    ApiError: axios.ApiError,
    isApiError: axios.isApiError,
  };
});

import {
  fetchInbox,
  fetchUnreadCount,
  markNotificationRead,
  openNotification,
} from '@/services/notifications';

const fetchInboxMock = vi.mocked(fetchInbox);
const fetchUnreadMock = vi.mocked(fetchUnreadCount);
const markReadMock = vi.mocked(markNotificationRead);
const openMock = vi.mocked(openNotification);

const unreadItem = {
  id: 'n-unread',
  title: 'Paracetamol 500mg is below reorder',
  body: 'Shelf A has 4 strips left.',
  sourceType: 'low_stock',
  sourceId: 'src-1',
  read: false,
  createdAt: '2026-09-02T02:30:00Z',
};

const readItem = {
  id: 'n-read',
  title: 'Yesterday’s expiry walk is done',
  body: 'Rack B was cleared at close.',
  sourceType: 'stock_item',
  sourceId: 'src-1',
  read: true,
  createdAt: '2026-09-01T10:00:00Z',
};

function renderBell() {
  const store = configureStore({
    reducer: { auth: authReducer, notifications: notificationsReducer },
    preloadedState: {
      auth: {
        user: {
          userId: 'user-1',
          displayName: 'Chemist',
          role: 'pharmacy_owner',
          tenantId: 'tenant-1',
          pinSet: true,
        },
      },
      notifications: {
        items: [],
        unreadCount: 0,
        page: 0,
        size: 8,
        totalPages: 0,
        totalItems: 0,
      },
    },
  });

  return {
    store,
    ...render(
      <Provider store={store}>
        <TooltipProvider>
          <MemoryRouter initialEntries={[ROUTES.DASHBOARD]}>
            <Routes>
              <Route path={ROUTES.DASHBOARD} element={<CounterAlertBell />} />
              <Route path={ROUTES.INVENTORY} element={<div>Inventory page</div>} />
              <Route path={ROUTES.CREDIT} element={<div>Khata page</div>} />
            </Routes>
          </MemoryRouter>
        </TooltipProvider>
      </Provider>,
    ),
  };
}

describe('dispensary counter alert bell', () => {
  beforeEach(() => {
    fetchInboxMock.mockReset();
    fetchUnreadMock.mockReset();
    markReadMock.mockReset();
    openMock.mockReset();
    fetchUnreadMock.mockResolvedValue(2);
  });

  it('loading: pulling slips is announced after the bell opens', async () => {
    const user = userEvent.setup();
    fetchInboxMock.mockReturnValue(new Promise(() => undefined));
    renderBell();
    await user.click(screen.getByRole('button', { name: /counter alerts/i }));
    expect(await screen.findByText('Pulling slips for this counter…')).toBeInTheDocument();
  });

  it('empty: a quiet till tells the chemist to keep billing', async () => {
    const user = userEvent.setup();
    fetchInboxMock.mockResolvedValue({
      items: [],
      unreadCount: 0,
      page: 0,
      size: 8,
      totalPages: 0,
      totalItems: 0,
    });
    renderBell();
    await user.click(screen.getByRole('button', { name: /counter alerts/i }));
    expect(await screen.findByText('No slips on this counter. Keep billing.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /mute|preference/i })).not.toBeInTheDocument();
  });

  it('success: lists seen and unread slips with a left rail, not color alone', async () => {
    const user = userEvent.setup();
    fetchInboxMock.mockResolvedValue({
      items: [unreadItem, readItem],
      unreadCount: 1,
      page: 0,
      size: 8,
      totalPages: 1,
      totalItems: 2,
    });
    renderBell();
    await user.click(await screen.findByRole('button', { name: 'Counter alerts, 2 unread' }));
    const list = await screen.findByRole('list');
    expect(within(list).getByText('Unread')).toBeInTheDocument();
    expect(within(list).getByText('Seen')).toBeInTheDocument();
    expect(within(list).getByText('Paracetamol 500mg is below reorder')).toBeInTheDocument();
    expect(within(list).getAllByText('Opens inventory').length).toBeGreaterThan(0);
    expect(within(list).getAllByText(/IST/).length).toBeGreaterThan(0);
  });

  it('validation: a bad slip id stays on this list', async () => {
    const user = userEvent.setup();
    fetchInboxMock.mockResolvedValue({
      items: [unreadItem],
      unreadCount: 1,
      page: 0,
      size: 8,
      totalPages: 1,
      totalItems: 1,
    });
    openMock.mockRejectedValue(new ApiError('Invalid request', 400, 'VALIDATION_ERROR'));
    renderBell();
    await user.click(screen.getByRole('button', { name: /counter alerts/i }));
    await user.click(await screen.findByRole('button', { name: 'Open on this counter' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('That slip id is not valid');
  });

  it('denied: lost access keeps the chemist at this till', async () => {
    const user = userEvent.setup();
    fetchInboxMock.mockResolvedValue({
      items: [unreadItem],
      unreadCount: 1,
      page: 0,
      size: 8,
      totalPages: 1,
      totalItems: 1,
    });
    openMock.mockRejectedValue(new ApiError('Denied', 403, 'SOURCE_DENIED'));
    renderBell();
    await user.click(screen.getByRole('button', { name: /counter alerts/i }));
    await user.click(await screen.findByRole('button', { name: 'Open on this counter' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'You cannot open this record at this counter',
    );
  });

  it('conflict: a moved record asks the chemist to refresh slips', async () => {
    const user = userEvent.setup();
    fetchInboxMock.mockResolvedValue({
      items: [unreadItem],
      unreadCount: 1,
      page: 0,
      size: 8,
      totalPages: 1,
      totalItems: 1,
    });
    openMock.mockRejectedValue(new ApiError('Moved', 409, 'SOURCE_CONFLICT'));
    renderBell();
    await user.click(screen.getByRole('button', { name: /counter alerts/i }));
    await user.click(await screen.findByRole('button', { name: 'Open on this counter' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('This record moved');
  });

  it('failure: a down server keeps the till in place', async () => {
    const user = userEvent.setup();
    fetchInboxMock.mockRejectedValue(new ApiError('Could not reach the server', 0, 'NETWORK'));
    renderBell();
    await user.click(screen.getByRole('button', { name: /counter alerts/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Stay at this till and retry');
  });

  it('success: opening a live slip walks to inventory', async () => {
    const user = userEvent.setup();
    fetchInboxMock.mockResolvedValue({
      items: [unreadItem],
      unreadCount: 1,
      page: 0,
      size: 8,
      totalPages: 1,
      totalItems: 1,
    });
    openMock.mockResolvedValue({ href: '/inventory', sourceType: 'low_stock', sourceId: 'src-1' });
    renderBell();
    await user.click(screen.getByRole('button', { name: /counter alerts/i }));
    await user.click(await screen.findByRole('button', { name: 'Open on this counter' }));
    expect(await screen.findByText('Inventory page')).toBeInTheDocument();
  });

  it('success: a khata slip names the destination and walks to credit', async () => {
    const user = userEvent.setup();
    const creditItem = {
      id: 'n-credit',
      title: 'Customer credit due',
      body: 'A khata balance is due. Open credit to follow up.',
      sourceType: 'credit_due',
      sourceId: 'src-credit',
      read: false,
      createdAt: '2026-09-02T03:00:00Z',
    };
    fetchInboxMock.mockResolvedValue({
      items: [creditItem],
      unreadCount: 1,
      page: 0,
      size: 8,
      totalPages: 1,
      totalItems: 1,
    });
    openMock.mockResolvedValue({
      href: '/credit',
      sourceType: 'credit_due',
      sourceId: 'src-credit',
    });
    renderBell();
    await user.click(screen.getByRole('button', { name: /counter alerts/i }));
    expect(await screen.findByText('Opens khata')).toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: 'Open on this counter' }));
    expect(await screen.findByText('Khata page')).toBeInTheDocument();
  });

  it('mark seen persists on the slip without mute controls', async () => {
    const user = userEvent.setup();
    fetchInboxMock.mockResolvedValue({
      items: [unreadItem],
      unreadCount: 1,
      page: 0,
      size: 8,
      totalPages: 1,
      totalItems: 1,
    });
    markReadMock.mockResolvedValue({ ...unreadItem, read: true });
    const { store } = renderBell();
    await user.click(screen.getByRole('button', { name: /counter alerts/i }));
    await user.click(await screen.findByRole('button', { name: 'Mark seen' }));
    expect(await screen.findByText('Seen')).toBeInTheDocument();
    expect(store.getState().notifications.items[0]?.read).toBe(true);
    expect(screen.queryByRole('button', { name: /mute|preference/i })).not.toBeInTheDocument();
  });

  it('deleted target explains the stock record left the floor', async () => {
    const user = userEvent.setup();
    fetchInboxMock.mockResolvedValue({
      items: [unreadItem],
      unreadCount: 1,
      page: 0,
      size: 8,
      totalPages: 1,
      totalItems: 1,
    });
    openMock.mockRejectedValue(new ApiError('Gone', 404, 'SOURCE_DELETED'));
    renderBell();
    await user.click(screen.getByRole('button', { name: /counter alerts/i }));
    await user.click(await screen.findByRole('button', { name: 'Open on this counter' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('That stock record left the floor');
  });

  it('paginates older slips', async () => {
    const user = userEvent.setup();
    fetchInboxMock.mockResolvedValueOnce({
      items: [unreadItem],
      unreadCount: 1,
      page: 0,
      size: 8,
      totalPages: 2,
      totalItems: 9,
    });
    fetchInboxMock.mockResolvedValueOnce({
      items: [readItem],
      unreadCount: 1,
      page: 1,
      size: 8,
      totalPages: 2,
      totalItems: 9,
    });
    renderBell();
    await user.click(screen.getByRole('button', { name: /counter alerts/i }));
    await user.click(await screen.findByRole('button', { name: 'Older slips' }));
    expect(await screen.findByText('Yesterday’s expiry walk is done')).toBeInTheDocument();
    expect(fetchInboxMock).toHaveBeenLastCalledWith(1, 8);
  });
});
