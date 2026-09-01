import type { ReactNode } from 'react';
import { Provider } from 'react-redux';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AddMedicineModal,
  MasterCatalogueDrawer,
  MasterCatalogueList,
  createMasterCatalogueStore,
} from '../../src/index.ts';
import { applySkuFilters, toDetail } from '../../src/lib/filters.ts';
import { emptyToNull, formString } from '../../src/lib/form.ts';
import { parseGstSlabValue, parseScheduleValue } from '../../src/lib/constants.ts';
import {
  bannedH1,
  paracetamol,
  paracetamolDetail,
  stockingRow,
} from '../../src/scenarios/master-catalogue.scenarios.ts';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function renderWithStore(ui: ReactNode, fetchImpl: typeof fetch = vi.fn()) {
  const store = createMasterCatalogueStore({
    baseUrl: 'http://localhost:3005',
    getAccessToken: () => 'token',
    fetchImpl,
  });
  return render(<Provider store={store}>{ui}</Provider>);
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

function catalogueFetch(overrides: Partial<Record<string, Response>> = {}) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = requestUrl(input);
    const method = requestMethod(input, init);
    const key = `${method} ${url}`;
    for (const [match, response] of Object.entries(overrides)) {
      if (key.includes(match) && response) {
        return response;
      }
    }
    if (method === 'POST' && url.endsWith('/skus')) {
      return jsonResponse({ success: true, data: paracetamol }, 201);
    }
    if (url.includes('/ceiling')) {
      return jsonResponse({ success: true, data: paracetamol });
    }
    if (url.includes('/substitutes')) {
      return jsonResponse({ success: true, data: { items: [] } });
    }
    if (url.includes('/unban')) {
      return jsonResponse({ success: true, data: { banned: false } });
    }
    if (url.includes('/ban')) {
      return jsonResponse({ success: true, data: { banned: true } });
    }
    if (url.includes('/stocking-pharmacies')) {
      return jsonResponse({ success: true, data: { items: [stockingRow] } });
    }
    if (url.includes(paracetamol.platform_master_sku_id) && method === 'GET') {
      return jsonResponse({ success: true, data: paracetamolDetail });
    }
    return jsonResponse({ success: true, data: { items: [paracetamol], next_cursor: null } });
  });
}

describe('master-catalogue-ui', () => {
  afterEach(() => {
    cleanup();
  });

  it('filters seeded rows and maps list items to drawer details', () => {
    expect(applySkuFilters([paracetamol, bannedH1], { q: 'tramadol' })).toEqual([bannedH1]);
    expect(applySkuFilters([paracetamol], { q: 'missing' })).toEqual([]);
    expect(applySkuFilters([paracetamol], { category: 'Pain' })).toEqual([]);
    expect(applySkuFilters([paracetamol], { schedule: 'H' })).toEqual([]);
    expect(applySkuFilters([paracetamol], { gstSlab: 5 })).toEqual([]);
    expect(applySkuFilters([paracetamol], { rxOnly: true })).toEqual([]);
    expect(applySkuFilters([paracetamol], { banned: true })).toEqual([]);
    expect(applySkuFilters([paracetamol, bannedH1], { banned: true, rxOnly: true })).toEqual([
      bannedH1,
    ]);
    expect(toDetail(paracetamol, [bannedH1]).substitutes[0]?.name).toBe(bannedH1.name);
    expect(toDetail({ ...paracetamol, dpco_ceiling: undefined }).dpco_ceiling).toBeNull();
    expect(parseScheduleValue('H1')).toBe('H1');
    expect(parseScheduleValue('all')).toBeUndefined();
    expect(parseScheduleValue(null)).toBeUndefined();
    expect(parseGstSlabValue('0')).toBe(0);
    expect(parseGstSlabValue('12')).toBe(12);
    expect(parseGstSlabValue('all')).toBeUndefined();
    expect(parseGstSlabValue(null)).toBeUndefined();
    expect(parseGstSlabValue('')).toBeUndefined();
    expect(formString('ok')).toBe('ok');
    expect(formString(null)).toBe('');
    expect(emptyToNull('  cap  ')).toBe('cap');
    expect(emptyToNull('')).toBeNull();
    expect(emptyToNull(null)).toBeNull();
  });

  it('renders list, empty, and error states', () => {
    renderWithStore(<MasterCatalogueList skipQuery items={[paracetamol, bannedH1]} />);
    expect(screen.getByRole('heading', { name: 'Master catalogue' })).toBeInTheDocument();
    expect(screen.getAllByRole('cell', { name: 'Paracetamol 500mg' }).length).toBeGreaterThan(0);
    cleanup();
    renderWithStore(<MasterCatalogueList skipQuery items={[]} />);
    expect(screen.getByText('No medicines match these filters.')).toBeInTheDocument();
    cleanup();
    renderWithStore(<MasterCatalogueList skipQuery items={[]} error />);
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load the master catalogue.');
  });

  it('filters the seeded list and opens the drawer and add modal', async () => {
    const user = userEvent.setup();
    renderWithStore(<MasterCatalogueList skipQuery items={[paracetamol, bannedH1]} />);
    await user.type(screen.getByLabelText('Search'), 'Para');
    expect(screen.getAllByRole('cell', { name: 'Paracetamol 500mg' }).length).toBeGreaterThan(0);
    await user.clear(screen.getByLabelText('Search'));
    fireEvent.change(screen.getByLabelText('Schedule'), { target: { value: 'H1' } });
    fireEvent.change(screen.getByLabelText('GST slab'), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText('Schedule'), { target: { value: 'all' } });
    fireEvent.change(screen.getByLabelText('GST slab'), { target: { value: 'all' } });
    await user.type(screen.getByLabelText('Category'), 'Pain');
    expect(screen.queryAllByRole('cell', { name: 'Paracetamol 500mg' })).toHaveLength(0);
    const switches = screen.getAllByRole('switch');
    await user.click(switches[0]!);
    expect(screen.getByRole('cell', { name: 'Tramadol 50mg' })).toBeInTheDocument();
    await user.click(switches[0]!);
    await user.click(switches[1]!);
    expect(screen.getByRole('cell', { name: 'Tramadol 50mg' })).toBeInTheDocument();
    await user.click(switches[1]!);
    await user.clear(screen.getByLabelText('Category'));
    await user.click(screen.getByRole('button', { name: 'Add medicine' }));
    expect(screen.getByRole('dialog', { name: 'Add medicine' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getAllByRole('cell', { name: 'Paracetamol 500mg' })[0]!);
    expect(screen.getByText('Pharmacies cannot sell above this ceiling.')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Close' })[0]!);
  });

  it('loads rows from the API and surfaces a fetch error', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ success: true, data: { items: [paracetamol], next_cursor: null } }),
      )
      .mockResolvedValueOnce(jsonResponse({ success: false, error: { code: 'HQ_ONLY' } }, 403));
    renderWithStore(<MasterCatalogueList />, fetchImpl);
    expect(await screen.findAllByRole('cell', { name: 'Paracetamol 500mg' })).not.toHaveLength(0);
    cleanup();
    renderWithStore(<MasterCatalogueList />, fetchImpl);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not load the master catalogue.',
    );
  });

  it('submits add-medicine without calling the API in skipQuery mode', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    renderWithStore(<AddMedicineModal skipQuery open onOpenChange={onOpenChange} />);
    await user.type(screen.getByLabelText('Name'), 'N');
    await user.type(screen.getByLabelText('Composition'), 'C');
    await user.type(screen.getByLabelText('Category'), 'Fever');
    await user.type(screen.getByLabelText('HSN'), '3004');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    cleanup();
    renderWithStore(<AddMedicineModal skipQuery error open onOpenChange={onOpenChange} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Could not add this medicine.');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('creates a medicine through RTK and reports create failures', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    renderWithStore(<AddMedicineModal open onOpenChange={onOpenChange} />, catalogueFetch());
    await user.type(screen.getByLabelText('Name'), 'Paracetamol 500mg');
    await user.type(screen.getByLabelText('Composition'), 'Paracetamol 500mg');
    await user.type(screen.getByLabelText('Manufacturer'), 'Example Labs');
    await user.type(screen.getByLabelText('Brand'), 'Calpol');
    await user.type(screen.getByLabelText('Pack'), '10 tablets');
    await user.type(screen.getByLabelText('Form'), 'tablet');
    await user.type(screen.getByLabelText('Category'), 'Fever');
    await user.type(screen.getByLabelText('HSN'), '3004');
    await user.type(screen.getByLabelText('DPCO ceiling'), '20.00');
    await user.click(screen.getByRole('switch', { name: 'Rx-only' }));
    fireEvent.change(screen.getByLabelText('Schedule'), { target: { value: 'H' } });
    fireEvent.change(screen.getByLabelText('Schedule'), { target: { value: 'nope' } });
    fireEvent.change(screen.getByLabelText('GST slab'), { target: { value: '0' } });
    fireEvent.change(screen.getByLabelText('GST slab'), { target: { value: 'nope' } });
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
    cleanup();
    const failing = catalogueFetch({
      'POST http://localhost:3005/master-catalogue/skus': jsonResponse(
        { success: false, error: { code: 'VALIDATION_FAILED' } },
        400,
      ),
    });
    renderWithStore(<AddMedicineModal open />, failing);
    await user.type(screen.getByLabelText('Name'), 'N');
    await user.type(screen.getByLabelText('Composition'), 'C');
    await user.type(screen.getByLabelText('Category'), 'Fever');
    await user.type(screen.getByLabelText('HSN'), '3004');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not add this medicine.');
  });

  it('saves ceiling, substitutes, ban, and unban in the drawer', async () => {
    const user = userEvent.setup();
    renderWithStore(
      <MasterCatalogueDrawer skuId={paracetamol.platform_master_sku_id} />,
      catalogueFetch(),
    );
    expect(await screen.findByText('Sri Krishna Medicals')).toBeInTheDocument();
    await user.clear(screen.getByLabelText('DPCO ceiling'));
    await user.type(screen.getByLabelText('DPCO ceiling'), '18.00');
    await user.click(screen.getByRole('button', { name: 'Save ceiling' }));
    await user.click(screen.getByRole('button', { name: 'Clear ceiling' }));
    await user.click(screen.getByRole('button', { name: 'Add substitute' }));
    await user.type(screen.getByLabelText('Substitute id'), 'abc');
    await user.click(screen.getByRole('button', { name: 'Add substitute' }));
    await user.type(screen.getByLabelText('Substitute id'), 'abc');
    await user.click(screen.getByRole('button', { name: 'Add substitute' }));
    await user.click(screen.getByRole('button', { name: 'Save substitutes' }));
    await user.click(screen.getByRole('button', { name: 'Ban' }));
    expect(
      screen.getByText('Banning un-maps this medicine at every pharmacy.'),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('alertdialog').querySelector('[data-slot="alert-dialog-action"]')!,
    );
    expect(await screen.findByRole('button', { name: 'Un-ban' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Un-ban' }));
  });

  it('covers skipQuery drawer actions and mutation error banners', async () => {
    const user = userEvent.setup();
    renderWithStore(<MasterCatalogueDrawer skipQuery sku={paracetamolDetail} stockingItems={[]} />);
    expect(screen.getByText('No pharmacies currently map this medicine.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save ceiling' }));
    await user.click(screen.getByRole('button', { name: 'Save substitutes' }));
    await user.click(screen.getByRole('button', { name: 'Ban' }));
    fireEvent.click(
      screen.getByRole('alertdialog').querySelector('[data-slot="alert-dialog-action"]')!,
    );
    expect(screen.getByRole('button', { name: 'Un-ban' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Un-ban' }));
    cleanup();
    renderWithStore(
      <MasterCatalogueDrawer
        skipQuery
        sku={{ ...paracetamolDetail, banned: true }}
        stockingItems={[stockingRow]}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Un-ban' }));
    cleanup();
    const failing = vi.fn(async () =>
      jsonResponse({ success: false, error: { code: 'NOT_FOUND' } }, 404),
    );
    renderWithStore(
      <MasterCatalogueDrawer skuId={paracetamol.platform_master_sku_id} error />,
      failing,
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not save changes.');
    cleanup();
    renderWithStore(<MasterCatalogueDrawer skuId={paracetamol.platform_master_sku_id} />, failing);
    await user.click(await screen.findByRole('button', { name: 'Save ceiling' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not save changes.');
    cleanup();
    renderWithStore(<MasterCatalogueDrawer skipQuery />);
    expect(screen.getByText('Medicine')).toBeInTheDocument();
    cleanup();
    renderWithStore(
      <MasterCatalogueDrawer
        skipQuery
        sku={{ ...paracetamolDetail, dpco_ceiling: null }}
        onOpenChange={() => undefined}
      />,
    );
    expect(screen.getByLabelText('DPCO ceiling')).toHaveValue('');
    fireEvent.click(screen.getAllByRole('button', { name: 'Close' })[0]!);
  });
});
