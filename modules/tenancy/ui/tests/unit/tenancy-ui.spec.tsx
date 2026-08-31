import { Provider } from 'react-redux';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  CreatePharmacyFields,
  PharmacyIdentityReadOnly,
  RenameShopForm,
  TenantShell,
  createTenancyStore,
  useTenant,
} from '../../src/index.ts';
import { resetTenant } from '../../src/store/slices/tenant-slice.ts';
import { tenancyApi } from '../../src/store/api/tenancy-api.ts';

const pharmacy = {
  tenant_id: '8f1c0a7e-2b3d-4e5f-8a90-123456789abc',
  gst_dealer_type: 'regular' as const,
  business_type: 'retail' as const,
  location: {
    location_id: '1a2b3c4d-5e6f-7081-92a3-b4c5d6e7f809',
    tenant_id: '8f1c0a7e-2b3d-4e5f-8a90-123456789abc',
    display_name: 'Sri Krishna Medicals',
  },
  created_at: '2026-08-31T16:00:00.000Z',
  updated_at: '2026-08-31T16:00:00.000Z',
};

function renderShell(
  fetchImpl: typeof fetch,
  preloadedState?: {
    tenant?: {
      status: 'idle' | 'loading' | 'ready' | 'error';
      tenantId?: string;
      locationId?: string;
      displayName?: string;
      message?: string;
    };
  },
  skipQuery = false,
) {
  const store = createTenancyStore(
    {
      baseUrl: 'http://localhost:3002',
      getAccessToken: () => 'token',
      getLocationId: () => pharmacy.location.location_id,
      fetchImpl,
    },
    preloadedState,
  );
  return {
    store,
    ...render(
      <Provider store={store}>
        <TenantShell skipQuery={skipQuery} />
      </Provider>,
    ),
  };
}

describe('tenancy-ui', () => {
  afterEach(() => {
    cleanup();
  });

  it('shows the shop identity badge without a location switcher', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: pharmacy }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    renderShell(fetchImpl);
    expect(await screen.findByText('Sri Krishna Medicals')).toBeInTheDocument();
    expect(screen.getByText('Namma MedMate')).toBeInTheDocument();
    expect(screen.getByText('Dispensary')).toBeInTheDocument();
    expect(screen.queryByText(/unlimited branches/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('shows an error when the current pharmacy cannot be loaded', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          error: { code: 'LOCATION_ID_REQUIRED', message: 'location_id is required' },
        }),
        { status: 400, headers: { 'content-type': 'application/json' } },
      ),
    );
    renderShell(fetchImpl);
    expect(await screen.findByRole('alert')).toHaveTextContent('location_id is required');
  });

  it('hides the badge while identity is unknown and supports reset', async () => {
    const fetchImpl = vi.fn().mockImplementation(() => new Promise(() => undefined));
    const { store } = renderShell(fetchImpl, { tenant: { status: 'idle' } }, true);
    expect(screen.queryByText('Sri Krishna Medicals')).not.toBeInTheDocument();
    store.dispatch(resetTenant());
    await waitFor(() => {
      expect(store.getState().tenant.status).toBe('idle');
    });
    store.dispatch(tenancyApi.util.resetApiState());
  });

  it('creates a pharmacy name from HQ fields and shows read-only identity', async () => {
    const onSubmit = vi.fn();
    render(<CreatePharmacyFields onSubmit={onSubmit} submitting />);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSubmit).not.toHaveBeenCalled();
    cleanup();
    render(<CreatePharmacyFields onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText('Shop name'), { target: { value: 'New Shop' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith('New Shop');
    });
    render(
      <PharmacyIdentityReadOnly
        displayName="New Shop"
        tenantId={pharmacy.tenant_id}
        locationId={pharmacy.location.location_id}
      />,
    );
    expect(screen.getByText('New Shop')).toBeInTheDocument();
  });

  it('ignores submit while the create form is marked submitting', () => {
    const onSubmit = vi.fn();
    render(<CreatePharmacyFields onSubmit={onSubmit} submitting />);
    fireEvent.submit(
      screen.getByRole('button', { name: 'Save' }).closest('form') as HTMLFormElement,
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('renames the shop through PATCH current', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            ...pharmacy,
            location: { ...pharmacy.location, display_name: 'Sri Krishna Medicals Indiranagar' },
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    const store = createTenancyStore(
      {
        baseUrl: 'http://localhost:3002',
        getAccessToken: () => 'token',
        getLocationId: () => pharmacy.location.location_id,
        fetchImpl,
      },
      {
        tenant: {
          status: 'ready',
          tenantId: pharmacy.tenant_id,
          locationId: pharmacy.location.location_id,
          displayName: pharmacy.location.display_name,
        },
      },
    );
    render(
      <Provider store={store}>
        <RenameShopForm />
      </Provider>,
    );
    fireEvent.change(screen.getByLabelText('Shop name'), {
      target: { value: 'Sri Krishna Medicals Indiranagar' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => {
      expect(store.getState().tenant.displayName).toBe('Sri Krishna Medicals Indiranagar');
    });
  });

  it('skips rename mutation when asked or when location is missing', async () => {
    const fetchImpl = vi.fn();
    const store = createTenancyStore({ baseUrl: 'http://localhost:3002', fetchImpl });
    const { unmount } = render(
      <Provider store={store}>
        <RenameShopForm />
      </Provider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(fetchImpl).not.toHaveBeenCalled();
    unmount();
    const withLocation = createTenancyStore(
      { baseUrl: 'http://localhost:3002', fetchImpl },
      {
        tenant: {
          status: 'ready',
          locationId: pharmacy.location.location_id,
          displayName: pharmacy.location.display_name,
        },
      },
    );
    render(
      <Provider store={withLocation}>
        <RenameShopForm skipMutation />
      </Provider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('exposes useTenant from the store', () => {
    function Probe() {
      const tenant = useTenant();
      return <p>{tenant.display_name ?? 'none'}</p>;
    }
    const store = createTenancyStore(
      { baseUrl: 'http://localhost:3002' },
      {
        tenant: {
          status: 'ready',
          displayName: 'Sri Krishna Medicals',
        },
      },
    );
    render(
      <Provider store={store}>
        <Probe />
      </Provider>,
    );
    expect(screen.getByText('Sri Krishna Medicals')).toBeInTheDocument();
  });

  it('renders a preloaded error badge without a fetch', () => {
    renderShell(vi.fn(), { tenant: { status: 'error' } }, true);
    expect(screen.getByRole('alert')).toHaveTextContent('location_id is required');
  });
});
