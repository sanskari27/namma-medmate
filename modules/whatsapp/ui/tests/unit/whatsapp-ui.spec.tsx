import type { ReactNode } from 'react';
import { Provider } from 'react-redux';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  MandatoryWhatsAppBanner,
  ShareWhatsAppButton,
  TemplateCatalogueTable,
  WhatsAppInboxPage,
  createWhatsAppStore,
} from '../../src/index.ts';
import {
  interpolate,
  mandatoryBannerCopy,
  mandatoryReason,
  statusLabel,
} from '../../src/lib/copy.ts';
import { whatsappApi } from '../../src/store/api/whatsapp-api.ts';

const locationId = '1a2b3c4d-5e6f-7081-92a3-b4c5d6e7f809';
const tenantId = '8f1c0a7e-2b3d-4e5f-8a90-123456789abc';

const inboxItem = {
  message_id: '3c9f1a22-1111-4b22-8333-444455556666',
  template_key: 'khata_remind',
  to: '+919876543210',
  purpose: 'khata_remind',
  status: 'read' as const,
  bill_id: 'INV-24-00018',
  mandatory: false,
  retry_count: 0,
  created_at: '2026-08-31T10:00:00.000Z',
  preview: 'Sri Krishna Medicals: payment reminder for your khata.',
};

const otpItem = {
  ...inboxItem,
  message_id: '7b2e8c11-2222-4c33-9444-555566667777',
  template_key: 'login_otp',
  purpose: 'otp',
  status: 'sent' as const,
  bill_id: null,
  preview: 'Login code sent.',
};

const irnFail = {
  message_id: 'aa111111-2222-4333-8444-555566667777',
  template_key: 'irn_fail',
  bill_id: 'INV-24-00019',
  status: 'failed' as const,
  last_error_code: 'META_UNAVAILABLE',
  created_at: '2026-08-31T11:00:00.000Z',
};

const template = {
  template_key: 'login_otp',
  meta_template_name: 'namma_login_otp',
  language: 'en',
  i18n_key: 'whatsapp.templates.loginOtp.body',
  transactional: true,
  body_preview_en: '{{shop_name}}: your login code is {{otp}}. It expires in 10 minutes.',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function renderWithStore(
  ui: ReactNode,
  fetchImpl: typeof fetch = vi.fn(),
  extra: {
    getLocationId?: () => string | undefined;
    getTenantId?: () => string | undefined;
    openUrl?: (url: string) => void;
    omitIdentity?: boolean;
  } = {},
) {
  const store = createWhatsAppStore({
    baseUrl: 'http://localhost:3003',
    getAccessToken: () => 'token',
    getLocationId: extra.omitIdentity ? undefined : (extra.getLocationId ?? (() => locationId)),
    getTenantId: extra.omitIdentity ? undefined : (extra.getTenantId ?? (() => tenantId)),
    fetchImpl,
    openUrl: extra.openUrl,
  });
  return {
    store,
    ...render(<Provider store={store}>{ui}</Provider>),
  };
}

describe('whatsapp-ui', () => {
  afterEach(() => {
    cleanup();
  });

  it('maps status and mandatory copy without leftover placeholders', () => {
    expect(statusLabel('read')).toBe('Read');
    expect(mandatoryReason('irn_fail')).toBe('IRN');
    expect(mandatoryReason('licence_expiry')).toBe('licence expiry');
    expect(mandatoryReason('unknown')).toBe('a mandatory alert');
    expect(mandatoryBannerCopy('gstn_fail')).toContain('GSTN');
    expect(interpolate('Hello {{name}} {{missing}}', { name: 'Shop' })).toBe('Hello Shop ');
  });

  it('renders a seeded inbox with redacted OTP preview and filters by status', () => {
    renderWithStore(<WhatsAppInboxPage skipQuery items={[inboxItem, otpItem]} />);
    expect(screen.getByRole('heading', { name: 'WhatsApp' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Read' })).toBeInTheDocument();
    expect(screen.getByText('login_otp')).toBeInTheDocument();
    expect(screen.getByText('Login code sent.')).toBeInTheDocument();
    expect(screen.queryByText(/4821/)).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Status filter'), { target: { value: 'read' } });
    expect(screen.getByRole('cell', { name: 'Read' })).toBeInTheDocument();
    expect(screen.queryByText('login_otp')).not.toBeInTheDocument();
  });

  it('shows an empty inbox and a seeded error', () => {
    renderWithStore(<WhatsAppInboxPage skipQuery items={[]} />);
    expect(screen.getByRole('status')).toHaveTextContent('No WhatsApp messages yet.');
    cleanup();
    renderWithStore(<WhatsAppInboxPage skipQuery errorMessage="location_id is required" />);
    expect(screen.getByRole('alert')).toHaveTextContent('location_id is required');
  });

  it('loads inbox rows from the API and shows a fetch error', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ success: true, data: { items: [inboxItem], next_cursor: null } }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ success: false, error: { code: 'LOCATION_ID_REQUIRED' } }, 400),
      );
    renderWithStore(<WhatsAppInboxPage />, fetchImpl);
    expect(await screen.findByRole('cell', { name: 'Read' })).toBeInTheDocument();
    cleanup();
    renderWithStore(<WhatsAppInboxPage />, fetchImpl);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not load the WhatsApp inbox.',
    );
  });

  it('filters inbox through the API when a status is chosen', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ success: true, data: { items: [inboxItem], next_cursor: null } }),
      );
    renderWithStore(<WhatsAppInboxPage />, fetchImpl);
    await screen.findByText('Read');
    fireEvent.change(screen.getByLabelText('Status filter'), { target: { value: 'failed' } });
    await waitFor(() => {
      expect(fetchImpl.mock.calls.length).toBeGreaterThan(1);
    });
  });

  it('shows a mandatory banner and hides it after Owner acknowledge', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { items: [irnFail] } }))
      .mockResolvedValueOnce(
        jsonResponse({
          success: true,
          data: { message_id: irnFail.message_id, acknowledged_at: '2026-08-31T12:00:00.000Z' },
        }),
      )
      .mockResolvedValue(jsonResponse({ success: true, data: { items: [] } }));
    renderWithStore(<MandatoryWhatsAppBanner locationId={locationId} />, fetchImpl);
    expect(await screen.findByText('INV-24-00019')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('IRN');
    fireEvent.click(screen.getByRole('button', { name: 'Acknowledge' }));
    await waitFor(() => {
      expect(screen.queryByText('INV-24-00019')).not.toBeInTheDocument();
    });
  });

  it('keeps the banner when a Cashier cannot acknowledge', async () => {
    renderWithStore(
      <MandatoryWhatsAppBanner skipQuery skipMutation canAcknowledge={false} items={[irnFail]} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Acknowledge' }));
    expect(screen.getByText('INV-24-00019')).toBeInTheDocument();
    expect(screen.getByText('Only the Owner can acknowledge this alert')).toBeInTheDocument();
  });

  it('hides a seeded banner after skipMutation acknowledge', () => {
    renderWithStore(
      <MandatoryWhatsAppBanner skipQuery skipMutation items={[irnFail]} locationId={locationId} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Acknowledge' }));
    expect(screen.queryByText('INV-24-00019')).not.toBeInTheDocument();
  });

  it('keeps the banner when acknowledge is refused by the API', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { items: [irnFail] } }))
      .mockResolvedValueOnce(
        jsonResponse({ success: false, error: { code: 'FORBIDDEN_ROLE' } }, 403),
      );
    renderWithStore(<MandatoryWhatsAppBanner />, fetchImpl);
    await screen.findByText('INV-24-00019');
    fireEvent.click(screen.getByRole('button', { name: 'Acknowledge' }));
    expect(
      await screen.findByText('Only the Owner can acknowledge this alert'),
    ).toBeInTheDocument();
    expect(screen.getByText('INV-24-00019')).toBeInTheDocument();
  });

  it('renders no banner when the mandatory list is empty', () => {
    renderWithStore(<MandatoryWhatsAppBanner skipQuery />);
    expect(screen.queryByRole('button', { name: 'Acknowledge' })).not.toBeInTheDocument();
  });

  it('falls back to template key when a mandatory row has no bill', () => {
    renderWithStore(
      <MandatoryWhatsAppBanner
        skipQuery
        items={[{ ...irnFail, bill_id: null, template_key: 'licence_expiry' }]}
      />,
    );
    expect(screen.getByText('licence_expiry')).toBeInTheDocument();
  });

  it('acknowledges and shares without optional identity helpers', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { items: [irnFail] } }))
      .mockResolvedValueOnce(
        jsonResponse({
          success: true,
          data: { message_id: irnFail.message_id, acknowledged_at: '2026-08-31T12:00:00.000Z' },
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { items: [] } }))
      .mockResolvedValueOnce(
        jsonResponse({ success: true, data: { url: 'https://wa.me/?text=invoice' } }),
      );
    renderWithStore(<MandatoryWhatsAppBanner />, fetchImpl, { omitIdentity: true });
    await screen.findByText('INV-24-00019');
    fireEvent.click(screen.getByRole('button', { name: 'Acknowledge' }));
    await waitFor(() => {
      expect(screen.queryByText('INV-24-00019')).not.toBeInTheDocument();
    });
    cleanup();
    const openUrl = vi.fn();
    renderWithStore(<ShareWhatsAppButton text="invoice" openUrl={openUrl} />, fetchImpl, {
      omitIdentity: true,
    });
    fireEvent.click(screen.getByRole('button', { name: 'Share on WhatsApp' }));
    await waitFor(() => {
      expect(openUrl).toHaveBeenCalled();
    });
  });

  it('opens a share deeplink and reports errors', async () => {
    const openUrl = vi.fn();
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ success: true, data: { url: 'https://wa.me/919876543210?text=bill' } }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ success: false, error: { code: 'TEXT_TOO_LONG' } }, 400),
      );
    renderWithStore(
      <ShareWhatsAppButton text="invoice" to="+919876543210" openUrl={openUrl} />,
      fetchImpl,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Share on WhatsApp' }));
    await waitFor(() => {
      expect(openUrl).toHaveBeenCalledWith('https://wa.me/919876543210?text=bill');
    });
    expect(screen.getByRole('status')).toHaveTextContent('WhatsApp opened');
    cleanup();
    renderWithStore(<ShareWhatsAppButton text="invoice" openUrl={openUrl} />, fetchImpl);
    fireEvent.click(screen.getByRole('button', { name: 'Share on WhatsApp' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not build a WhatsApp link.');
  });

  it('announces a skipMutation share without opening a window', () => {
    const open = vi.fn();
    const openUrl = vi.fn();
    vi.stubGlobal('open', open);
    renderWithStore(
      <ShareWhatsAppButton skipMutation text="invoice" to="+919876543210" openUrl={openUrl} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Share on WhatsApp' }));
    expect(screen.getByText('WhatsApp opened')).toBeInTheDocument();
    expect(openUrl).toHaveBeenCalledWith('https://wa.me/');
    expect(open).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('opens a live share URL through window.open', async () => {
    const open = vi.fn();
    vi.stubGlobal('open', open);
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse({ success: true, data: { url: 'https://wa.me/9198' } }));
    renderWithStore(<ShareWhatsAppButton text="invoice" />, fetchImpl);
    fireEvent.click(screen.getByRole('button', { name: 'Share on WhatsApp' }));
    await waitFor(() => {
      expect(open).toHaveBeenCalledWith('https://wa.me/9198', '_blank', 'noopener,noreferrer');
    });
    vi.unstubAllGlobals();
  });

  it('lists templates from seed and from the API', async () => {
    renderWithStore(<TemplateCatalogueTable skipQuery />);
    expect(screen.getByRole('heading', { name: 'Templates' })).toBeInTheDocument();
    cleanup();
    renderWithStore(<TemplateCatalogueTable skipQuery items={[template]} />);
    expect(screen.getByText('login_otp')).toBeInTheDocument();
    cleanup();
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse({ success: true, data: { items: [template] } }));
    renderWithStore(<TemplateCatalogueTable />, fetchImpl);
    expect(await screen.findByText('login_otp')).toBeInTheDocument();
    const store = createWhatsAppStore({ baseUrl: 'http://localhost:3003', fetchImpl });
    store.dispatch(whatsappApi.util.resetApiState());
  });
});
