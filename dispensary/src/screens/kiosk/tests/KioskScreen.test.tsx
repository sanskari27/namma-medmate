import { configureStore } from '@reduxjs/toolkit';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import KioskScreen from '@/screens/kiosk/KioskScreen';
import { initialKioskScreenState } from '@/screens/kiosk/store';
import { ApiError } from '@/services/axios';
import { authReducer, kioskReducer } from '@/store';
import type { KioskState } from '@/services/kiosk';
import { defaultConfig } from '@/screens/kiosk/KioskScreen.utils';

vi.mock('@/services/inventory', () => ({
  getInventoryOverview: vi.fn().mockResolvedValue({
    items: [
      {
        productId: 'p1',
        sku: 'SKU',
        name: 'Crocin 650',
        genericName: null,
        brandName: null,
        manufacturerName: null,
        categoryId: 'c1',
        categoryName: 'OTC',
        categoryIcon: null,
        scheduleClassification: null,
        prescriptionRequired: false,
        rackLocation: null,
        baseUnit: 'Tablet',
        packUnit: 'strip',
        packSize: 10,
        batchCount: 1,
        earliestExpiry: null,
        expired: false,
        nearExpiry: false,
        onHandQuantity: 8,
        lowStock: false,
        outOfStock: false,
        mrpPaise: 1200,
        costValuePaise: 0,
        retailValuePaise: 0,
        looseUnitPaise: null,
        looseSellingEnabled: false,
        onlineListed: false,
        unallocated: false,
        deadStock: false,
      },
    ],
  }),
}));

vi.mock('@/services/kiosk', async () => {
  const axios = await import('@/services/axios');
  return {
    getKiosk: vi.fn(),
    openKiosk: vi.fn(),
    closeKiosk: vi.fn(),
    createKioskTicket: vi.fn(),
    cancelKioskTicket: vi.fn(),
    verifyKioskExitPin: vi.fn(),
    saveKioskConfig: vi.fn(),
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
  verifyKioskExitPin,
} from '@/services/kiosk';

const getMock = vi.mocked(getKiosk);
const openMock = vi.mocked(openKiosk);
const closeMock = vi.mocked(closeKiosk);
const createMock = vi.mocked(createKioskTicket);
const cancelMock = vi.mocked(cancelKioskTicket);
const pinMock = vi.mocked(verifyKioskExitPin);

const ready: KioskState = {
  planEntitled: true,
  hasModule: true,
  branchType: 'KIOSK',
  activeBranchId: 'b1',
  branchName: 'Annex',
  blockReason: null,
  session: null,
  config: { ...defaultConfig('Annex'), staffExitPinSet: true },
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
    reducer: { auth: authReducer, kiosk: kioskReducer },
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
      kiosk: initialKioskScreenState,
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
    pinMock.mockReset();
  });

  it('loading: waits for this outlet’s kiosk', () => {
    getMock.mockReturnValue(new Promise(() => undefined));
    renderPage();
    expect(screen.getByRole('status')).toHaveTextContent('Loading this outlet’s kiosk…');
  });

  it('empty: no active outlet', async () => {
    getMock.mockResolvedValue({
      ...ready,
      activeBranchId: null,
      branchType: null,
      blockReason: 'NO_ACTIVE_BRANCH',
    });
    renderPage();
    expect(await screen.findByText(/Pick an outlet on this till/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open outlets' })).toHaveAttribute('href', '/branches');
  });

  it('denied: till without kiosk module', async () => {
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
    expect(await screen.findByText(/Self-order kiosk is on the Pro plan/i)).toBeInTheDocument();
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
    expect(await screen.findByText(/This outlet is Retail/i)).toBeInTheDocument();
  });

  it('failure: network error on load', async () => {
    getMock.mockRejectedValue(new ApiError('down', 500, 'DOWN'));
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not reach the server for this outlet’s kiosk',
    );
  });

  it('never echoes a staff exit PIN on the configuration form', async () => {
    getMock.mockResolvedValue(ready);
    renderPage();
    const pin = await screen.findByLabelText('Staff exit PIN');
    expect(pin).toHaveValue('');
    expect(pin).toHaveAttribute('placeholder', 'PIN is set — enter to replace');
    expect(screen.queryByDisplayValue('0000')).not.toBeInTheDocument();
  });

  it('conflict: open when already open', async () => {
    const user = userEvent.setup();
    getMock.mockResolvedValue(ready);
    openMock.mockRejectedValue(new ApiError('stale', 409, 'STALE_STATE'));
    renderPage();
    await screen.findByRole('heading', { name: 'Self-order kiosk is off' });
    await user.click(screen.getByRole('button', { name: 'Toggle kiosk' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Kiosk state changed on another till',
    );
  });

  it('validation: Place order stays off until a medicine is in the cart', async () => {
    const user = userEvent.setup();
    getMock.mockResolvedValue(ready);
    openMock.mockResolvedValue(opened);
    renderPage();
    await screen.findByRole('heading', { name: 'Self-order kiosk is off' });
    await user.click(screen.getByRole('button', { name: 'Toggle kiosk' }));
    expect(await screen.findByRole('button', { name: 'Place order' })).toBeDisabled();
    expect(createMock).not.toHaveBeenCalled();
  });

  it('success: open kiosk, place an in-stock order with one idempotency key', async () => {
    const user = userEvent.setup();
    getMock.mockResolvedValue(ready);
    openMock.mockResolvedValue(opened);
    createMock.mockResolvedValue({
      ...opened,
      waitingTickets: [
        {
          id: 't1',
          token: 1,
          walkInName: null,
          pickupRequest: 'Crocin 650',
          paymentMethod: 'UPI',
          requiresRx: false,
          items: [],
          createdAt: '2026-09-04T01:01:00Z',
        },
      ],
    });
    renderPage();
    await screen.findByRole('heading', { name: 'Self-order kiosk is off' });
    await user.click(screen.getByRole('button', { name: 'Toggle kiosk' }));
    await user.click(await screen.findByRole('button', { name: /Crocin 650/i }));
    await user.click(screen.getByRole('button', { name: 'Place order' }));
    await waitFor(() => expect(createMock).toHaveBeenCalledTimes(1));
    expect(createMock.mock.calls[0][0]).toMatchObject({
      idempotencyKey: expect.any(String),
      items: [expect.objectContaining({ productId: 'p1', name: 'Crocin 650' })],
    });
    expect(await screen.findByRole('heading', { name: 'Order placed!' })).toBeInTheDocument();
    expect(screen.getByText('1', { selector: 'b' })).toBeInTheDocument();
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
          paymentMethod: 'CASH',
          requiresRx: false,
          items: [],
          createdAt: '2026-09-04T01:02:00Z',
        },
      ],
    });
    cancelMock.mockResolvedValue(opened);
    renderPage();
    expect(await screen.findByText('Dolo')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear slip' }));
    await waitFor(() => expect(cancelMock).toHaveBeenCalledWith('t1'));
    expect(screen.getByText('No walk-in slips waiting at this outlet.')).toBeInTheDocument();
  });

  it('success: staff exit PIN is checked on the server before leaving customer mode', async () => {
    const user = userEvent.setup();
    getMock.mockResolvedValue(ready);
    openMock.mockResolvedValue(opened);
    pinMock.mockResolvedValue(opened);
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Toggle kiosk' }));
    await user.click(await screen.findByRole('button', { name: 'Staff exit' }));
    const pinField = document.querySelector('.ko-pin input') as HTMLInputElement;
    expect(pinField).toBeTruthy();
    await user.type(pinField, '2468');
    await user.click(screen.getByRole('button', { name: 'Staff view' }));
    await waitFor(() => expect(pinMock).toHaveBeenCalledWith('2468'));
    expect(screen.queryByRole('dialog', { name: /self order/i })).not.toBeInTheDocument();
  });
});
