import { configureStore } from '@reduxjs/toolkit';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import WhatsappProviderScreen from '@/screens/whatsapp-provider/WhatsappProviderScreen';
import { ApiError } from '@/services/axios';
import { authReducer } from '@/store';
import type { WhatsAppStructure } from '@/services/whatsappTemplates';

vi.mock('@/services/whatsappTemplates', () => ({
  listWhatsAppTemplates: vi.fn(),
  syncWhatsAppProvider: vi.fn(),
}));

import { listWhatsAppTemplates, syncWhatsAppProvider } from '@/services/whatsappTemplates';

const listMock = vi.mocked(listWhatsAppTemplates);
const syncMock = vi.mocked(syncWhatsAppProvider);

const refill: WhatsAppStructure = {
  uniqueName: 'refill_due',
  body: 'Hi {{customer_name}}, visit {{pharmacy_name}}.',
  tenantSlots: ['pharmacy_name'],
  runtimeSlots: ['customer_name'],
  status: 'APPROVED',
  metaTemplateId: 'meta-refill-due',
};

const catalogue = {
  provider: {
    displayNumber: '+91 90000 00000',
    phoneNumberId: 'phone-1',
    health: 'NOT_CONFIGURED',
    syncedAt: '2026-09-06T06:00:00Z',
  },
  structures: [refill],
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
      <WhatsappProviderScreen />
    </Provider>,
  );
}

describe('HQ WABA templates', () => {
  beforeEach(() => {
    listMock.mockReset();
    syncMock.mockReset();
  });

  it('loading: waits for provider catalogue', () => {
    listMock.mockReturnValue(new Promise(() => undefined));
    renderPage('admin_super');
    expect(
      screen.getByText('Reading MASTER WABA provider and approved structures…'),
    ).toBeInTheDocument();
  });

  it('empty: no approved structures', async () => {
    listMock.mockResolvedValue({
      provider: {
        displayNumber: '+91 90000 00000',
        phoneNumberId: 'phone-1',
        health: 'NOT_CONFIGURED',
        syncedAt: null,
      },
      structures: [],
    });
    renderPage('admin_super');
    expect(await screen.findByRole('heading', { name: 'WABA templates' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'No approved WhatsApp structures on the platform WABA.',
    );
    expect(screen.getByText('No Meta-approved structures are published on this number.')).toBeInTheDocument();
  });

  it('denied: verification desks cannot open WABA templates', () => {
    renderPage('admin_verification');
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Only MASTER can monitor the platform WhatsApp provider.',
    );
    expect(listMock).not.toHaveBeenCalled();
  });

  it('validation: isolate needs a unique name', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue(catalogue);
    renderPage('admin_super');
    await screen.findByText('refill_due');
    await user.click(screen.getByRole('button', { name: 'Isolate template' }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Enter a template unique name before isolating the catalogue.',
    );
  });

  it('conflict: stale provider scan', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue(catalogue);
    syncMock.mockRejectedValue(new ApiError('stale', 409, 'CONFLICT'));
    renderPage('admin_super');
    await screen.findByText('refill_due');
    await user.click(screen.getByRole('button', { name: 'Rescan provider' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Provider status moved during this scan. Rescan the WABA.',
    );
  });

  it('failure: catalogue network error', async () => {
    listMock.mockRejectedValue(new Error('offline'));
    renderPage('admin_super');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not load WABA templates. Retry from this HQ desk.',
    );
  });

  it('success: rescan refreshes provider and structures', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue(catalogue);
    syncMock.mockResolvedValue(catalogue);
    renderPage('admin_super');
    await screen.findByText('+91 90000 00000');
    await user.click(screen.getByRole('button', { name: 'Rescan provider' }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Provider scan refreshed. Approved structures are current.',
    );
    expect(screen.getByText('{tenantId}_refill_due')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rescan provider' })).toHaveFocus();
  });
});
