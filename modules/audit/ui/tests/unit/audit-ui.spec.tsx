import type { ReactNode } from 'react';
import { Provider } from 'react-redux';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuditEventTable, HqAuditEventTable, createAuditStore } from '../../src/index.ts';
import { formatSnapshot, formatTarget } from '../../src/lib/format.ts';
import { useGetAuditEventQuery, useListAuditEventsQuery } from '../../src/store/api/audit-api.ts';
import { billEvent } from '../../src/scenarios/audit.scenarios.ts';

const locationId = '1a2b3c4d-5e6f-7081-92a3-b4c5d6e7f809';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function renderWithStore(ui: ReactNode, fetchImpl: typeof fetch = vi.fn()) {
  const store = createAuditStore({
    baseUrl: 'http://localhost:3004',
    getAccessToken: () => 'token',
    getLocationId: () => locationId,
    getTenantId: () => billEvent.tenant_id ?? undefined,
    fetchImpl,
  });
  return {
    store,
    ...render(<Provider store={store}>{ui}</Provider>),
  };
}

describe('audit-ui', () => {
  afterEach(() => {
    cleanup();
  });

  it('formats snapshots and targets', () => {
    expect(formatSnapshot(undefined)).toBe('');
    expect(formatSnapshot(null)).toBe('');
    expect(formatSnapshot({ qty: 1 })).toBe('{"qty":1}');
    expect(formatTarget('Bill', 'INV-1')).toBe('Bill INV-1');
  });

  it('renders a seeded pharmacy table with before/after', () => {
    renderWithStore(<AuditEventTable skipQuery items={[billEvent]} />);
    expect(screen.getByRole('columnheader', { name: 'Time' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'bill_posted' })).toBeInTheDocument();
    expect(screen.getAllByText(/SKU1:B1/).length).toBeGreaterThan(0);
    expect(screen.queryByRole('columnheader', { name: 'Tenant' })).not.toBeInTheDocument();
  });

  it('renders HQ tenant column and empty/error states', () => {
    renderWithStore(<HqAuditEventTable skipQuery items={[{ ...billEvent, tenant_id: null }]} />);
    expect(screen.getByRole('columnheader', { name: 'Tenant' })).toBeInTheDocument();
    cleanup();
    renderWithStore(<AuditEventTable skipQuery items={[]} />);
    expect(screen.getByText('No audit events yet.')).toBeInTheDocument();
    cleanup();
    renderWithStore(<AuditEventTable skipQuery items={[]} error />);
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load the audit trail.');
  });

  it('hides snapshots when money_or_stock is false', () => {
    renderWithStore(
      <AuditEventTable
        skipQuery
        items={[{ ...billEvent, money_or_stock: false, before: { secret: false } }]}
      />,
    );
    expect(screen.queryByText(/secret/)).not.toBeInTheDocument();
  });

  it('loads rows from the API and surfaces a fetch error', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ success: true, data: { items: [billEvent], next_cursor: null } }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ success: false, error: { code: 'LOCATION_ID_REQUIRED' } }, 400),
      );
    renderWithStore(<AuditEventTable />, fetchImpl);
    expect(await screen.findByRole('cell', { name: 'bill_posted' })).toBeInTheDocument();
    cleanup();
    renderWithStore(<AuditEventTable />, fetchImpl);
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load the audit trail.');
  });

  it('fetches a single event through RTK', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ success: true, data: billEvent }));
    function EventDetail() {
      const query = useGetAuditEventQuery({ auditEventId: billEvent.audit_event_id });
      useListAuditEventsQuery({ targetId: 'INV-24-00018' });
      return <p>{query.data?.action ?? query.status}</p>;
    }
    renderWithStore(<EventDetail />, fetchImpl);
    expect(await screen.findByText('bill_posted')).toBeInTheDocument();
    renderWithStore(<AuditEventTable />, fetchImpl);
    await waitFor(() => {
      expect(fetchImpl.mock.calls.length).toBeGreaterThan(1);
    });
  });
});
