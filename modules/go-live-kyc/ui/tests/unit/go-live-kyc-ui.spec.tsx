import type { ReactNode } from 'react';
import { Provider } from 'react-redux';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { emit, resetEventBus } from '@namma-medmate/event-bus';
import {
  GoLiveBanner,
  GoLiveNavLink,
  GoLiveWizardPage,
  HqKycQueuePage,
  createGoLiveKycStore,
} from '../../src/index.ts';
import { interpolate, t } from '../../src/lib/copy.ts';
import { useGoLiveKycEvents } from '../../src/hooks/use-go-live-kyc-events.ts';
import { goLiveKycApi } from '../../src/store/api/go-live-kyc-api.ts';
import {
  completedStatus,
  pendingItem,
  rejectedStatus,
  startStatus,
} from '../../src/scenarios/go-live-kyc.scenarios.ts';

const LOCATION = '1a2b3c4d-5e6f-7081-92a3-b4c5d6e7f809';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') {
    return input;
  }
  if (input instanceof URL) {
    return input.href;
  }
  return input.url;
}

function requestMethod(input: RequestInfo | URL, init?: RequestInit): string {
  if (input instanceof Request) {
    return input.method.toUpperCase();
  }
  return (init?.method ?? 'GET').toUpperCase();
}

function kycFetch(overrides: Partial<Record<string, Response>> = {}) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = requestUrl(input);
    const method = requestMethod(input, init);
    const key = `${method} ${url}`;
    for (const [match, response] of Object.entries(overrides)) {
      if (key.includes(match) && response) {
        return response;
      }
    }
    if (method === 'GET' && url.includes('/go-live-kyc/status')) {
      return jsonResponse({ success: true, data: startStatus });
    }
    if (method === 'GET' && url.includes('/go-live-kyc/wizard')) {
      return jsonResponse({
        success: true,
        data: { wizard_status: 'not_started', steps: {}, gate: startStatus.gate },
      });
    }
    if (method === 'GET' && url.includes('/go-live-kyc/gate')) {
      return jsonResponse({ success: true, data: startStatus.gate });
    }
    if (method === 'GET' && url.includes('/go-live-kyc/admin/queue')) {
      return jsonResponse({
        success: true,
        data: { items: [pendingItem], page: 1, page_size: 20, total: 1 },
      });
    }
    return jsonResponse({ success: true, data: startStatus });
  });
}

function renderWithStore(
  ui: ReactNode,
  fetchImpl: typeof fetch = vi.fn(),
  extra: { locationId?: string } = {},
) {
  const store = createGoLiveKycStore({
    baseUrl: 'http://localhost:3009',
    getAccessToken: () => 'token',
    getLocationId: () => extra.locationId ?? LOCATION,
    fetchImpl,
  });
  return { store, ...render(<Provider store={store}>{ui}</Provider>) };
}

function EventsProbe() {
  const events = useGoLiveKycEvents();
  return (
    <button type="button" onClick={() => events.wizardUpdated('loc')}>
      emit
    </button>
  );
}

describe('go-live-kyc-ui helpers', () => {
  afterEach(() => {
    cleanup();
    resetEventBus();
    vi.restoreAllMocks();
  });

  it('interpolates copy and nav', () => {
    expect(interpolate('HQ rejected KYC: {{reason}}', { reason: 'bad GSTIN' })).toBe(
      'HQ rejected KYC: bad GSTIN',
    );
    expect(interpolate('x {{missing}}', {})).toBe('x ');
    expect(t('goLiveKyc.nav.title')).toBe('Go-live setup');
    expect(t('goLiveKyc.wizard.rejected', { reason: 'expired DL' })).toBe(
      'HQ rejected KYC: expired DL',
    );
    render(<GoLiveNavLink />);
    expect(screen.getByRole('link', { name: 'Go-live setup' })).toHaveAttribute(
      'href',
      '/account/go-live',
    );
  });

  it('emits wizard updated events', () => {
    emit('go-live-kyc.wizard.updated', { location_id: 'seed' });
    render(<EventsProbe />);
    fireEvent.click(screen.getByRole('button', { name: 'emit' }));
  });
});

describe('go-live banner', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('hides when the gate is allowed or missing', () => {
    const { rerender } = renderWithStore(
      <GoLiveBanner
        skipQuery
        gate={{ ...startStatus.gate, allowed: true }}
        locationId={LOCATION}
      />,
    );
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    rerender(
      <Provider
        store={createGoLiveKycStore({
          baseUrl: 'http://localhost:3009',
          getAccessToken: () => 'token',
          getLocationId: () => LOCATION,
        })}
      >
        <GoLiveBanner skipQuery locationId="" />
      </Provider>,
    );
    expect(
      screen.queryByText('Finish go-live setup before charging a bill.'),
    ).not.toBeInTheDocument();
  });

  it('shows setup copy when the gate is closed', async () => {
    renderWithStore(<GoLiveBanner skipQuery gate={startStatus.gate} locationId={LOCATION} />);
    expect(screen.getByText('Finish go-live setup before charging a bill.')).toBeInTheDocument();
    cleanup();
    renderWithStore(<GoLiveBanner locationId={LOCATION} />, kycFetch());
    expect(
      await screen.findByText('Finish go-live setup before charging a bill.'),
    ).toBeInTheDocument();
  });
});

describe('go-live wizard', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders start, rejected, complete, and load-error states', () => {
    renderWithStore(<GoLiveWizardPage skipQuery locationId={LOCATION} status={startStatus} />);
    expect(screen.getByRole('heading', { name: 'Go-live wizard' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Run setup wizard' })).not.toBeInTheDocument();
    cleanup();
    renderWithStore(<GoLiveWizardPage skipQuery locationId={LOCATION} status={rejectedStatus} />);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'HQ rejected KYC: FSSAI missing for food SKUs',
    );
    cleanup();
    renderWithStore(<GoLiveWizardPage skipQuery locationId={LOCATION} status={completedStatus} />);
    expect(screen.getByRole('button', { name: 'Run setup wizard' })).toBeInTheDocument();
    cleanup();
    renderWithStore(<GoLiveWizardPage skipQuery error locationId={LOCATION} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Could not save this step.');
  });

  it('loads status from the API and saves every wizard step', async () => {
    const fetchImpl = kycFetch();
    renderWithStore(<GoLiveWizardPage locationId={LOCATION} />, fetchImpl);
    expect(await screen.findByRole('heading', { name: 'Go-live wizard' })).toBeInTheDocument();
    fireEvent.change(screen.getByDisplayValue('29ABCDE1234F1Z5'), {
      target: { value: '27AAAAA0000A1Z5' },
    });
    fireEvent.change(screen.getByDisplayValue('ABCDE1234F'), { target: { value: 'AAAAA0000A' } });
    fireEvent.change(screen.getByDisplayValue('INV'), { target: { value: 'MM' } });
    fireEvent.change(screen.getByDisplayValue('4455'), { target: { value: '7788' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Pharmacy profile' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start with zero stock' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start at ₹0' }));
    fireEvent.click(screen.getByRole('button', { name: 'Invoice prefix' }));
    fireEvent.click(screen.getByRole('button', { name: 'Owner-only' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit KYC' }));
    fireEvent.click(screen.getByRole('button', { name: 'Complete setup' }));
    await waitFor(() => {
      expect(fetchImpl.mock.calls.length).toBeGreaterThan(7);
    });
  });

  it('shows a live status load error', async () => {
    renderWithStore(
      <GoLiveWizardPage locationId={LOCATION} />,
      kycFetch({
        'GET ': jsonResponse({ error: { code: 'FORBIDDEN' } }, 403),
      }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not save this step.');
  });

  it('shows a step save error and reruns after completion', async () => {
    const fail = kycFetch({
      'PUT ': jsonResponse({ error: { code: 'VALIDATION_ERROR' } }, 400),
      'POST ': jsonResponse({ error: { code: 'VALIDATION_ERROR' } }, 400),
    });
    renderWithStore(
      <GoLiveWizardPage skipQuery locationId={LOCATION} status={completedStatus} />,
      fail,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Pharmacy profile' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not save this step.');
    fireEvent.click(screen.getByRole('button', { name: 'Run setup wizard' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not save this step.');
  });
});

describe('hq kyc queue', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders pending, empty, and error states', () => {
    renderWithStore(<HqKycQueuePage skipQuery items={[pendingItem]} />);
    expect(screen.getByRole('heading', { name: 'KYC queue' })).toBeInTheDocument();
    expect(screen.getByText('Sri Krishna Medicals')).toBeInTheDocument();
    cleanup();
    renderWithStore(
      <HqKycQueuePage
        skipQuery
        items={[
          {
            ...pendingItem,
            gstin: null,
            plan: null,
          },
        ]}
      />,
    );
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
    cleanup();
    renderWithStore(<HqKycQueuePage skipQuery items={[]} />);
    expect(screen.getByText('No KYC submissions.')).toBeInTheDocument();
    cleanup();
    renderWithStore(<HqKycQueuePage skipQuery error items={[]} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load the KYC queue.');
  });

  it('loads the queue and approves or rejects a shop', async () => {
    const fetchImpl = kycFetch();
    renderWithStore(<HqKycQueuePage />, fetchImpl);
    expect(await screen.findByText('Sri Krishna Medicals')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Reject reason'), {
      target: { value: 'PAN mismatch' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reject' }));
    await waitFor(() => {
      expect(
        fetchImpl.mock.calls.some((call) => requestUrl(call[0]).includes('/kyc/approve')),
      ).toBe(true);
    });
  });

  it('shows a live queue load error and mutation failures', async () => {
    renderWithStore(
      <HqKycQueuePage />,
      kycFetch({
        'GET ': jsonResponse({ error: { code: 'HQ_ONLY' } }, 403),
      }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load the KYC queue.');
    cleanup();
    renderWithStore(
      <HqKycQueuePage skipQuery items={[pendingItem]} />,
      kycFetch({
        'POST ': jsonResponse({ error: { code: 'KYC_NOT_PENDING' } }, 409),
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load the KYC queue.');
    fireEvent.click(screen.getByRole('button', { name: 'Reject' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load the KYC queue.');
  });
});

describe('go-live-kyc store', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('loads gate and wizard endpoints without a location helper', async () => {
    const fetchImpl = kycFetch();
    const store = createGoLiveKycStore({
      baseUrl: 'http://localhost:3009',
      fetchImpl,
    });
    await store.dispatch(goLiveKycApi.endpoints.getGate.initiate());
    await store.dispatch(goLiveKycApi.endpoints.getWizard.initiate());
    await store.dispatch(goLiveKycApi.endpoints.getStatus.initiate());
    await store.dispatch(goLiveKycApi.endpoints.listQueue.initiate());
    expect(fetchImpl).toHaveBeenCalled();
  });
});
