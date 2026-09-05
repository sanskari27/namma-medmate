import { configureStore } from '@reduxjs/toolkit';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HqInboxBell } from '@organisms/hq-inbox-bell';
import { TooltipProvider } from '@atoms';
import { ROUTES } from '@/libs/constants/routes.const';
import { ApiError } from '@/services/axios';
import { authReducer, inboxReducer } from '@/store';

vi.mock('@/services/inbox', async () => {
  const axios = await import('@/services/axios');
  return {
    listHqInbox: vi.fn(),
    countHqUnread: vi.fn(),
    fileHqInboxItem: vi.fn(),
    openHqInboxItem: vi.fn(),
    ApiError: axios.ApiError,
    isApiError: axios.isApiError,
  };
});

import { countHqUnread, fileHqInboxItem, listHqInbox, openHqInboxItem } from '@/services/inbox';

const listMock = vi.mocked(listHqInbox);
const countMock = vi.mocked(countHqUnread);
const fileMock = vi.mocked(fileHqInboxItem);
const openMock = vi.mocked(openHqInboxItem);

const unreadRow = {
  id: 'hq-unread',
  title: 'KYC pack waiting on Varshmaan Pharmacy',
  body: 'Open the tenant file before the SLA clock.',
  sourceType: 'kyc',
  sourceId: 'src-kyc',
  read: false,
  createdAt: '2026-09-02T02:30:00Z',
};

const filedRow = {
  id: 'hq-filed',
  title: 'Yesterday’s KYC pass was filed',
  body: 'Tenant pulse already reflects the approval.',
  sourceType: 'kyc',
  sourceId: 'src-kyc',
  read: true,
  createdAt: '2026-09-01T10:00:00Z',
};

function renderInbox() {
  const store = configureStore({
    reducer: { auth: authReducer, inbox: inboxReducer },
    preloadedState: {
      auth: {
        user: {
          userId: 'm1',
          displayName: 'Sanskar',
          role: 'admin_super',
          tenantId: null,
          pinSet: true,
        },
      },
      inbox: {
        rows: [],
        unread: 0,
        page: 0,
        pageSize: 6,
        pageCount: 0,
        rowCount: 0,
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
              <Route path={ROUTES.DASHBOARD} element={<HqInboxBell />} />
              <Route path={ROUTES.KYC} element={<div>KYC page</div>} />
              <Route path={ROUTES.LICENCE_EXPIRY} element={<div>Licence expiry page</div>} />
              <Route path={ROUTES.SUBSCRIPTIONS} element={<div>Subscriptions page</div>} />
              <Route path={ROUTES.PHARMACIES} element={<div>Pharmacies page</div>} />
            </Routes>
          </MemoryRouter>
        </TooltipProvider>
      </Provider>,
    ),
  };
}

describe('admin HQ inbox', () => {
  beforeEach(() => {
    listMock.mockReset();
    countMock.mockReset();
    fileMock.mockReset();
    openMock.mockReset();
    countMock.mockResolvedValue(2);
  });

  it('loading: tenant signals are announced after the desk opens', async () => {
    const user = userEvent.setup();
    listMock.mockReturnValue(new Promise(() => undefined));
    renderInbox();
    await user.click(screen.getByRole('button', { name: /hq inbox/i }));
    expect(await screen.findByText('Loading tenant signals…')).toBeInTheDocument();
  });

  it('empty: a quiet HQ inbox has no mute controls', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue({
      items: [],
      unreadCount: 0,
      page: 0,
      size: 6,
      totalPages: 0,
      totalItems: 0,
    });
    renderInbox();
    await user.click(screen.getByRole('button', { name: /hq inbox/i }));
    expect(await screen.findByText('No tenant signals in this inbox.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /mute|preference/i })).not.toBeInTheDocument();
  });

  it('success: log lists unread and filed rows with IST stamps', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue({
      items: [unreadRow, filedRow],
      unreadCount: 1,
      page: 0,
      size: 6,
      totalPages: 1,
      totalItems: 2,
    });
    renderInbox();
    await user.click(screen.getByRole('button', { name: /hq inbox/i }));
    const table = await screen.findByRole('table', { name: 'HQ inbox' });
    expect(within(table).getByText('Unread')).toBeInTheDocument();
    expect(within(table).getByText('Filed')).toBeInTheDocument();
    expect(within(table).getByText('KYC pack waiting on Varshmaan Pharmacy')).toBeInTheDocument();
    expect(within(table).getAllByText('Opens KYC queue').length).toBeGreaterThan(0);
    expect(within(table).getAllByText(/IST/).length).toBeGreaterThan(0);
  });

  it('validation: a bad inbox id stays on this operator session', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue({
      items: [unreadRow],
      unreadCount: 1,
      page: 0,
      size: 6,
      totalPages: 1,
      totalItems: 1,
    });
    openMock.mockRejectedValue(new ApiError('Invalid request', 400, 'VALIDATION_ERROR'));
    renderInbox();
    await user.click(screen.getByRole('button', { name: /hq inbox/i }));
    await user.click(await screen.findByRole('button', { name: 'Open tenant file' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('That inbox id is not valid');
  });

  it('denied: lost tenant access is explained for the operator', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue({
      items: [unreadRow],
      unreadCount: 1,
      page: 0,
      size: 6,
      totalPages: 1,
      totalItems: 1,
    });
    openMock.mockRejectedValue(new ApiError('Denied', 403, 'SOURCE_DENIED'));
    renderInbox();
    await user.click(screen.getByRole('button', { name: /hq inbox/i }));
    await user.click(await screen.findByRole('button', { name: 'Open tenant file' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This operator no longer has access to that tenant file',
    );
  });

  it('conflict: a moved tenant file asks the operator to reload', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue({
      items: [unreadRow],
      unreadCount: 1,
      page: 0,
      size: 6,
      totalPages: 1,
      totalItems: 1,
    });
    openMock.mockRejectedValue(new ApiError('Moved', 409, 'SOURCE_CONFLICT'));
    renderInbox();
    await user.click(screen.getByRole('button', { name: /hq inbox/i }));
    await user.click(await screen.findByRole('button', { name: 'Open tenant file' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('The tenant file moved');
  });

  it('failure: API outage keeps the operator on this session', async () => {
    const user = userEvent.setup();
    listMock.mockRejectedValue(new ApiError('Could not reach the server', 0, 'NETWORK'));
    renderInbox();
    await user.click(screen.getByRole('button', { name: /hq inbox/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('HQ cannot reach the API');
  });

  it('success: opening a live signal walks to KYC', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue({
      items: [unreadRow],
      unreadCount: 1,
      page: 0,
      size: 6,
      totalPages: 1,
      totalItems: 1,
    });
    openMock.mockResolvedValue({ href: '/kyc', sourceType: 'kyc', sourceId: 'src-kyc' });
    renderInbox();
    await user.click(screen.getByRole('button', { name: /hq inbox/i }));
    await user.click(await screen.findByRole('button', { name: 'Open tenant file' }));
    expect(await screen.findByText('KYC page')).toBeInTheDocument();
  });

  it('success: a subscription signal names the destination and walks to subscriptions', async () => {
    const user = userEvent.setup();
    const subRow = {
      id: 'hq-sub',
      title: 'Subscription expiring',
      body: 'A tenant plan is nearing expiry. Open subscriptions.',
      sourceType: 'subscription_expiry',
      sourceId: 'src-sub',
      read: false,
      createdAt: '2026-09-02T03:00:00Z',
    };
    listMock.mockResolvedValue({
      items: [subRow],
      unreadCount: 1,
      page: 0,
      size: 6,
      totalPages: 1,
      totalItems: 1,
    });
    openMock.mockResolvedValue({
      href: '/subscriptions',
      sourceType: 'subscription_expiry',
      sourceId: 'src-sub',
    });
    renderInbox();
    await user.click(screen.getByRole('button', { name: /hq inbox/i }));
    expect(await screen.findByText('Opens subscriptions')).toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: 'Open tenant file' }));
    expect(await screen.findByText('Subscriptions page')).toBeInTheDocument();
  });

  it('success: a license signal walks to licence expiry', async () => {
    const user = userEvent.setup();
    const licenseRow = {
      id: 'hq-lic',
      title: 'License expiring',
      body: 'A tenant or branch license is nearing expiry. Open the pharmacy file.',
      sourceType: 'license_expiry',
      sourceId: 'src-lic',
      read: false,
      createdAt: '2026-09-02T03:10:00Z',
    };
    listMock.mockResolvedValue({
      items: [licenseRow],
      unreadCount: 1,
      page: 0,
      size: 6,
      totalPages: 1,
      totalItems: 1,
    });
    openMock.mockResolvedValue({
      href: '/licence-expiry',
      sourceType: 'license_expiry',
      sourceId: 'src-lic',
    });
    renderInbox();
    await user.click(screen.getByRole('button', { name: /hq inbox/i }));
    expect(await screen.findByText('Opens licence expiry')).toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: 'Open tenant file' }));
    expect(await screen.findByText('Licence expiry page')).toBeInTheDocument();
  });

  it('file as read persists without preference controls', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue({
      items: [unreadRow],
      unreadCount: 1,
      page: 0,
      size: 6,
      totalPages: 1,
      totalItems: 1,
    });
    fileMock.mockResolvedValue({ ...unreadRow, read: true });
    const { store } = renderInbox();
    await user.click(screen.getByRole('button', { name: /hq inbox/i }));
    await user.click(await screen.findByRole('button', { name: 'File as read' }));
    expect(await screen.findByText('Filed')).toBeInTheDocument();
    expect(store.getState().inbox.rows[0]?.read).toBe(true);
    expect(screen.queryByRole('button', { name: /mute|preference/i })).not.toBeInTheDocument();
  });

  it('deleted target explains a withdrawn KYC pack', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue({
      items: [unreadRow],
      unreadCount: 1,
      page: 0,
      size: 6,
      totalPages: 1,
      totalItems: 1,
    });
    openMock.mockRejectedValue(new ApiError('Gone', 404, 'SOURCE_DELETED'));
    renderInbox();
    await user.click(screen.getByRole('button', { name: /hq inbox/i }));
    await user.click(await screen.findByRole('button', { name: 'Open tenant file' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('That KYC pack was withdrawn');
  });

  it('paginates earlier operator signals', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValueOnce({
      items: [unreadRow],
      unreadCount: 1,
      page: 0,
      size: 6,
      totalPages: 2,
      totalItems: 7,
    });
    listMock.mockResolvedValueOnce({
      items: [filedRow],
      unreadCount: 1,
      page: 1,
      size: 6,
      totalPages: 2,
      totalItems: 7,
    });
    renderInbox();
    await user.click(screen.getByRole('button', { name: /hq inbox/i }));
    await user.click(await screen.findByRole('button', { name: 'Earlier page' }));
    expect(await screen.findByText('Yesterday’s KYC pass was filed')).toBeInTheDocument();
    expect(listMock).toHaveBeenLastCalledWith(1, 6);
  });
});
