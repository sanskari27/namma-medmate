import { configureStore } from '@reduxjs/toolkit';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import WhatsappSendsScreen from '@/screens/whatsapp-sends/WhatsappSendsScreen';
import { ApiError } from '@/services/axios';
import { authReducer } from '@/store';
import type { WhatsAppMessage } from '@/services/whatsappMessages';

vi.mock('@/services/whatsappMessages', async () => {
  const axios = await import('@/services/axios');
  return {
    listWhatsAppMessages: vi.fn(),
    retryWhatsAppMessage: vi.fn(),
    sendCampaignMessages: vi.fn(),
    ApiError: axios.ApiError,
    isApiError: axios.isApiError,
  };
});

import { listWhatsAppMessages, retryWhatsAppMessage } from '@/services/whatsappMessages';

const listMock = vi.mocked(listWhatsAppMessages);
const retryMock = vi.mocked(retryWhatsAppMessage);

const failed: WhatsAppMessage = {
  id: 'm1',
  tenantId: 't1',
  kind: 'REFILL_DUE',
  sourceId: 's1',
  customerId: 'c1',
  campaignId: null,
  templateUniqueName: 'refill_due',
  namespaceName: 't1_refill_due',
  preview: 'Hi Ravi, your refill for Amlodipine is due. Visit Varshmaan to restock.',
  status: 'FAILED',
  failureCode: 'PROVIDER_UNAVAILABLE',
  providerMessageId: null,
  attemptCount: 1,
  createdAt: '2026-09-06T00:00:00Z',
  updatedAt: '2026-09-06T00:00:00Z',
};

function renderPage(role = 'pharmacy_owner', modules: string[] = ['CAMPAIGNS']) {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        user: {
          userId: 'u1',
          displayName: 'Owner',
          role,
          tenantId: 't1',
          pinSet: true,
          tenantStatus: 'ACTIVE',
          emailVerified: true,
          modules,
        },
      },
    },
  });
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <WhatsappSendsScreen />
      </MemoryRouter>
    </Provider>,
  );
}

describe('WhatsApp sends', () => {
  beforeEach(() => {
    listMock.mockReset();
    retryMock.mockReset();
  });

  it('loading: waits for WhatsApp sends', () => {
    listMock.mockReturnValue(new Promise(() => undefined));
    renderPage();
    expect(screen.getByText('Loading WhatsApp sends for this pharmacy…')).toBeInTheDocument();
  });

  it('empty: no sends yet', async () => {
    listMock.mockResolvedValue({ items: [], queued: 0, sent: 0, failed: 0 });
    renderPage();
    expect(
      await screen.findByText(
        'No WhatsApp sends yet. Freeze a tag list, or wait for refill and khata reminders.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'WhatsApp sends' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Tag broadcasts' })).toHaveAttribute(
      'href',
      '/campaigns',
    );
  });

  it('denied: till without Campaigns cannot send', () => {
    renderPage('pharmacy_staff', ['CRM']);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'This till cannot send WhatsApp. Ask the owner to grant Campaigns.',
    );
    expect(listMock).not.toHaveBeenCalled();
  });

  it('validation: only a failed send can be retried', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue({
      items: [{ ...failed, status: 'SENT', failureCode: null, providerMessageId: 'wamid.1' }],
      queued: 0,
      sent: 1,
      failed: 0,
    });
    renderPage();
    await screen.findByText(/Hi Ravi/);
    await user.click(screen.getByRole('button', { name: 'Send again' }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Only a failed send can be tried again from this counter.',
    );
    expect(retryMock).not.toHaveBeenCalled();
  });

  it('conflict: another till already changed this send', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue({ items: [failed], queued: 0, sent: 0, failed: 1 });
    retryMock.mockRejectedValue(new ApiError('stale', 409, 'STALE_STATE'));
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Send again' }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'This send was updated on another till. Reload, then retry.',
    );
  });

  it('failure: list network error', async () => {
    listMock.mockRejectedValue(new Error('network'));
    renderPage();
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Could not load WhatsApp sends. Check the connection and try again.',
    );
  });

  it('success: retry a failed send and restore focus', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue({ items: [failed], queued: 0, sent: 0, failed: 1 });
    retryMock.mockResolvedValue({
      ...failed,
      status: 'SENT',
      failureCode: null,
      providerMessageId: 'wamid.retry',
      attemptCount: 2,
    });
    renderPage();
    expect(await screen.findByText(/Hi Ravi, your refill for Amlodipine/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Send again' }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'This WhatsApp send went out from the counter.',
    );
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Send again' })).toHaveFocus();
    });
    expect(retryMock).toHaveBeenCalledWith('m1');
  });
});
