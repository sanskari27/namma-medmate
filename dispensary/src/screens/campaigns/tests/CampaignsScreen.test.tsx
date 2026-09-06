import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CampaignsScreen from '@/screens/campaigns/CampaignsScreen';
import { ApiError } from '@/services/axios';
import { authReducer } from '@/store';
import type { Campaign } from '@/services/campaigns';

vi.mock('@/services/campaigns', async () => {
  const axios = await import('@/services/axios');
  return {
    listCampaigns: vi.fn(),
    createCampaign: vi.fn(),
    previewCampaign: vi.fn(),
    readyCampaign: vi.fn(),
    ApiError: axios.ApiError,
    isApiError: axios.isApiError,
  };
});

import {
  createCampaign,
  listCampaigns,
  previewCampaign,
  readyCampaign,
} from '@/services/campaigns';

const listMock = vi.mocked(listCampaigns);
const createMock = vi.mocked(createCampaign);
const previewMock = vi.mocked(previewCampaign);
const readyMock = vi.mocked(readyCampaign);

const sample: Campaign = {
  id: 'c1',
  tenantId: 't1',
  name: 'Diabetes promo',
  status: 'DRAFT',
  tagIds: ['tag1'],
  templateUniqueName: 'campaign',
  namespaceName: 't1_campaign',
  variables: { pharmacy_name: 'Varshmaan' },
  previewedAt: null,
  recipientCount: null,
  frozenAt: null,
  version: 1,
  createdAt: '2026-09-06T00:00:00Z',
  updatedAt: '2026-09-06T00:00:00Z',
};

const catalogue = {
  items: [] as Campaign[],
  tags: [{ id: 'tag1', name: 'diabetic' }],
  templates: [{ uniqueName: 'campaign', namespaceName: 't1_campaign', status: 'APPROVED' }],
};

function renderPage(
  role = 'pharmacy_owner',
  modules: string[] = ['CAMPAIGNS', 'CRM'],
  roles: { id: string; name: string; code: string | null; kind: string }[] = [],
) {
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
          roles,
        },
      },
    },
  });
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <CampaignsScreen />
      </MemoryRouter>
    </Provider>,
  );
}

describe('tag broadcasts', () => {
  beforeEach(() => {
    listMock.mockReset();
    createMock.mockReset();
    previewMock.mockReset();
    readyMock.mockReset();
  });

  it('loading: waits for tag broadcasts', () => {
    listMock.mockReturnValue(new Promise(() => undefined));
    renderPage();
    expect(screen.getByText('Loading tag broadcasts for this pharmacy…')).toBeInTheDocument();
  });

  it('empty: no broadcasts yet', async () => {
    listMock.mockResolvedValue(catalogue);
    renderPage();
    expect(
      await screen.findByText('No tag broadcasts yet. Pick a saved tag and count this list.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Tag broadcasts' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Pack for the CA' })).toHaveAttribute(
      'href',
      '/accountant',
    );
  });

  it('denied: till without Campaigns cannot prepare broadcasts', () => {
    renderPage('pharmacy_staff', ['CRM']);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'This till cannot prepare broadcasts. Ask the owner to grant Campaigns.',
    );
    expect(listMock).not.toHaveBeenCalled();
    expect(screen.queryByRole('link', { name: 'Pack for the CA' })).not.toBeInTheDocument();
  });

  it('validation: name and a tag before save', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue(catalogue);
    renderPage();
    await screen.findByRole('heading', { name: 'Tag broadcasts' });
    await user.click(screen.getByRole('button', { name: 'New broadcast' }));
    await user.click(screen.getByRole('button', { name: 'Save draft' }));
    expect(screen.getByRole('status')).toHaveTextContent(
      'Name and at least one patient tag are needed before saving this broadcast.',
    );
    expect(createMock).not.toHaveBeenCalled();
  });

  it('conflict: another till already changed this broadcast', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue({
      ...catalogue,
      items: [{ ...sample, previewedAt: '2026-09-06T01:00:00Z', recipientCount: 2, version: 2 }],
    });
    readyMock.mockRejectedValue(new ApiError('stale', 409, 'STALE_STATE'));
    renderPage();
    await user.click(await screen.findByRole('button', { name: /Diabetes promo/ }));
    await user.click(screen.getByRole('button', { name: 'Ready to send' }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'This broadcast was updated on another till. Reload, then count again.',
    );
  });

  it('failure: list network error', async () => {
    listMock.mockRejectedValue(new Error('network'));
    renderPage();
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Could not load tag broadcasts. Check the connection and try again.',
    );
  });

  it('success: save, count, and mark ready without sending', async () => {
    const user = userEvent.setup();
    const counted = {
      ...sample,
      previewedAt: '2026-09-06T01:00:00Z',
      recipientCount: 2,
      version: 2,
    };
    const ready = {
      ...counted,
      status: 'READY_FOR_DELIVERY' as const,
      frozenAt: '2026-09-06T01:05:00Z',
      version: 3,
    };
    listMock.mockResolvedValue(catalogue);
    createMock.mockResolvedValue(sample);
    previewMock.mockResolvedValue(counted);
    readyMock.mockResolvedValue(ready);
    renderPage();
    await screen.findByRole('heading', { name: 'Tag broadcasts' });
    await user.click(screen.getByRole('button', { name: 'New broadcast' }));
    fireEvent.change(screen.getByLabelText('Broadcast name'), {
      target: { value: 'Diabetes promo' },
    });
    await user.click(screen.getByRole('checkbox', { name: 'diabetic' }));
    await user.click(screen.getByRole('button', { name: 'Save draft' }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Broadcast saved as a draft at this counter.',
    );
    await user.click(screen.getByRole('button', { name: 'Count this list' }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'This list has 2 patients. Nobody was sent a message.',
    );
    expect(screen.getByText(/2 patients on these tags/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Ready to send' }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Diabetes promo is ready to send. Delivery is a later step.',
    );
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'New broadcast' })).toHaveFocus();
    });
    expect(screen.queryByText('9402000001')).not.toBeInTheDocument();
  });

  it('campaign desk can open the page without Pack for the CA', async () => {
    listMock.mockResolvedValue(catalogue);
    renderPage('pharmacy_staff', ['CAMPAIGNS']);
    expect(await screen.findByRole('heading', { name: 'Tag broadcasts' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Pack for the CA' })).not.toBeInTheDocument();
  });
});
