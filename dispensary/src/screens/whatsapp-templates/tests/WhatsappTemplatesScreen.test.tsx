import { configureStore } from '@reduxjs/toolkit';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import WhatsappTemplatesScreen from '@/screens/whatsapp-templates/WhatsappTemplatesScreen';
import { ApiError } from '@/services/axios';
import { authReducer } from '@/store';
import type { WhatsAppTemplate } from '@/services/whatsappTemplates';

vi.mock('@/services/whatsappTemplates', async () => {
  const axios = await import('@/services/axios');
  return {
    listWhatsAppTemplates: vi.fn(),
    saveWhatsAppVariables: vi.fn(),
    ApiError: axios.ApiError,
    isApiError: axios.isApiError,
  };
});

import { listWhatsAppTemplates, saveWhatsAppVariables } from '@/services/whatsappTemplates';

const listMock = vi.mocked(listWhatsAppTemplates);
const saveMock = vi.mocked(saveWhatsAppVariables);

const refill: WhatsAppTemplate = {
  uniqueName: 'refill_due',
  namespaceName: 't1_refill_due',
  body: 'Hi {{customer_name}}, your refill for {{medicine_name}} is due. Visit {{pharmacy_name}} to restock.',
  tenantSlots: ['pharmacy_name'],
  runtimeSlots: ['customer_name', 'medicine_name'],
  status: 'APPROVED',
  variables: {},
  preview: 'Hi {{customer_name}}, your refill for {{medicine_name}} is due. Visit {{pharmacy_name}} to restock.',
  version: 0,
};

function renderPage(role = 'pharmacy_owner') {
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
          modules: ['STAFF'],
        },
      },
    },
  });
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <WhatsappTemplatesScreen />
      </MemoryRouter>
    </Provider>,
  );
}

describe('pharmacy WhatsApp slots', () => {
  beforeEach(() => {
    listMock.mockReset();
    saveMock.mockReset();
  });

  it('loading: waits for WhatsApp slots', () => {
    listMock.mockReturnValue(new Promise(() => undefined));
    renderPage();
    expect(screen.getByText('Loading WhatsApp slots for this pharmacy…')).toBeInTheDocument();
  });

  it('empty: no approved templates', async () => {
    listMock.mockResolvedValue({
      provider: {
        displayNumber: '+91 90000 00000',
        phoneNumberId: 'phone-1',
        health: 'NOT_CONFIGURED',
        syncedAt: null,
      },
      templates: [],
    });
    renderPage();
    expect(
      await screen.findByText('No approved WhatsApp templates for this pharmacy yet.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Nothing to fill until an approved message is on this pharmacy.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'WhatsApp slots' })).toBeInTheDocument();
  });

  it('denied: staff cannot set WhatsApp slots', () => {
    renderPage('pharmacy_staff');
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Only the owner can set WhatsApp slots at this counter. Ask the owner if a message needs a shop name.',
    );
    expect(listMock).not.toHaveBeenCalled();
  });

  it('validation: pharmacy name before save', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue({
      provider: {
        displayNumber: '+91 90000 00000',
        phoneNumberId: 'phone-1',
        health: 'NOT_CONFIGURED',
        syncedAt: null,
      },
      templates: [refill],
    });
    renderPage();
    await screen.findByRole('heading', { name: 'WhatsApp slots' });
    expect(screen.queryByLabelText('Message body')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save slots' }));
    expect(screen.getByRole('status')).toHaveTextContent(
      "Fill this pharmacy's name before saving slots.",
    );
    expect(saveMock).not.toHaveBeenCalled();
  });

  it('conflict: slots updated on another till', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue({
      provider: {
        displayNumber: '+91 90000 00000',
        phoneNumberId: 'phone-1',
        health: 'NOT_CONFIGURED',
        syncedAt: null,
      },
      templates: [refill],
    });
    saveMock.mockRejectedValue(new ApiError('stale', 409, 'STALE_STATE'));
    renderPage();
    await screen.findByLabelText("This pharmacy's name");
    await user.type(screen.getByLabelText("This pharmacy's name"), 'Varshmaan');
    await user.click(screen.getByRole('button', { name: 'Save slots' }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'These slots were updated on another till. Reload, then save.',
    );
  });

  it('failure: list network error', async () => {
    listMock.mockRejectedValue(new Error('network'));
    renderPage();
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Could not load WhatsApp slots. Check the connection and try again.',
    );
  });

  it('success: save pharmacy name into approved slots', async () => {
    const user = userEvent.setup();
    const saved: WhatsAppTemplate = {
      ...refill,
      variables: { pharmacy_name: 'Varshmaan' },
      preview:
        'Hi {{customer_name}}, your refill for {{medicine_name}} is due. Visit Varshmaan to restock.',
      version: 1,
    };
    listMock
      .mockResolvedValueOnce({
        provider: {
          displayNumber: '+91 90000 00000',
          phoneNumberId: 'phone-1',
          health: 'NOT_CONFIGURED',
          syncedAt: null,
        },
        templates: [refill],
      })
      .mockResolvedValue({
        provider: {
          displayNumber: '+91 90000 00000',
          phoneNumberId: 'phone-1',
          health: 'NOT_CONFIGURED',
          syncedAt: null,
        },
        templates: [saved],
      });
    saveMock.mockResolvedValue(saved);
    renderPage();
    await screen.findByText('Refill due');
    await user.type(screen.getByLabelText("This pharmacy's name"), 'Varshmaan');
    await user.click(screen.getByRole('button', { name: 'Save slots' }));
    await waitFor(() => expect(saveMock).toHaveBeenCalled());
    expect(await screen.findByRole('status')).toHaveTextContent(
      'WhatsApp slots saved for this pharmacy.',
    );
    expect(screen.getByText(/Visit Varshmaan to restock/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save slots' })).toHaveFocus();
  });
});
