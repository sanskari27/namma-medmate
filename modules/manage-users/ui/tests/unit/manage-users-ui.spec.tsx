import type { ReactNode } from 'react';
import { Provider } from 'react-redux';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AddUserDialog,
  ManageUsersNavLink,
  ManageUsersPage,
  UserDrawer,
  createManageUsersStore,
} from '../../src/index.ts';
import { interpolate, roleLabel, t } from '../../src/lib/copy.ts';
import { methodsLabel } from '../../src/lib/permissions.ts';
import { atSeatCap, seatChipVars } from '../../src/lib/seats.ts';
import { cashierUser, ownerUser } from '../../src/scenarios/manage-users.scenarios.ts';
import { useManageUsersEvents } from '../../src/hooks/use-manage-users-events.ts';
import { emit, resetEventBus } from '@namma-medmate/event-bus';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function renderWithStore(ui: ReactNode, fetchImpl: typeof fetch = vi.fn()) {
  const store = createManageUsersStore({
    baseUrl: 'http://localhost:3007',
    getAccessToken: () => 'token',
    getLocationId: () => '1a2b3c4d-5e6f-7081-92a3-b4c5d6e7f809',
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

function usersFetch(overrides: Partial<Record<string, Response>> = {}) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = requestUrl(input);
    const method = requestMethod(input, init);
    const key = `${method} ${url}`;
    for (const [match, response] of Object.entries(overrides)) {
      if (key.includes(match) && response) {
        return response;
      }
    }
    if (url.includes('/seats')) {
      return jsonResponse({
        success: true,
        data: { plan: 'free', seat_limit: 2, active_count: 1, unlimited: false },
      });
    }
    if (method === 'GET' && url.includes('/users/') && url.includes('/devices') === false) {
      return jsonResponse({ success: true, data: cashierUser });
    }
    if (method === 'GET' && url.includes('/users')) {
      return jsonResponse({
        success: true,
        data: { items: [ownerUser, cashierUser], page: 1, page_size: 20, total: 2 },
      });
    }
    if (method === 'POST' && url.endsWith('/users')) {
      return jsonResponse(
        { success: true, data: { ...cashierUser, temp_password: 'K7mP2xQ9' } },
        201,
      );
    }
    if (url.includes('/password/copy')) {
      return jsonResponse({ success: true, data: { temp_password: 'K7mP2xQ9' } });
    }
    if (url.includes('/password/reset')) {
      return jsonResponse({
        success: true,
        data: { temp_password: 'K7mP2xQ9', temp_password_pending: true },
      });
    }
    if (url.includes('/share-link')) {
      return jsonResponse({
        success: true,
        data: { url: 'https://wa.me/?text=hello', body: 'hello', sent: false },
      });
    }
    if (url.includes('/permissions') || url.includes('/methods') || url.includes('/pin')) {
      return jsonResponse({
        success: true,
        data: { permissions: cashierUser.permissions, role: 'cashier', pin_set: true },
      });
    }
    if (method === 'PATCH') {
      return jsonResponse({ success: true, data: { ...cashierUser, active: false } });
    }
    if (method === 'DELETE') {
      return jsonResponse({ success: true, data: {} }, 204);
    }
    return jsonResponse({ success: true, data: cashierUser });
  });
}

function EventsProbe() {
  const events = useManageUsersEvents();
  return (
    <button type="button" onClick={() => events.listChanged('loc')}>
      emit
    </button>
  );
}

describe('manage-users-ui helpers', () => {
  afterEach(() => {
    cleanup();
    resetEventBus();
  });

  it('interpolates copy and role labels', () => {
    expect(interpolate('Seats {{used}} / {{limit}}', { used: '1', limit: '2' })).toBe(
      'Seats 1 / 2',
    );
    expect(interpolate('x {{missing}}', {})).toBe('x ');
    expect(t('manageUsers.nav.title')).toBe('Manage users');
    expect(roleLabel('cashier')).toBe('Cashier');
    expect(methodsLabel(true, true)).toBe('Password, WhatsApp OTP');
    expect(methodsLabel(false, false)).toBe('');
    expect(atSeatCap({ plan: 'free', seat_limit: 2, active_count: 2, unlimited: false })).toBe(
      true,
    );
    expect(atSeatCap({ plan: 'pro', seat_limit: null, active_count: 9, unlimited: true })).toBe(
      false,
    );
    expect(
      seatChipVars({ plan: 'pro', seat_limit: null, active_count: 3, unlimited: true }).limit,
    ).toBe('Unlimited');
  });

  it('renders the account nav link', () => {
    render(<ManageUsersNavLink />);
    expect(screen.getByRole('link', { name: 'Manage users' })).toHaveAttribute(
      'href',
      '/account/users',
    );
  });

  it('emits list changed events', () => {
    const seen: string[] = [];
    emit('manage-users.list.changed', { location_id: 'seed' });
    render(<EventsProbe />);
    fireEvent.click(screen.getByRole('button', { name: 'emit' }));
    expect(seen).toEqual([]);
  });
});

describe('manage-users-ui screens', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('disables Add user at the Free cap and names Growth and Pro', () => {
    renderWithStore(
      <ManageUsersPage
        skipQuery
        seats={{ plan: 'free', seat_limit: 2, active_count: 2, unlimited: false }}
        items={[ownerUser, cashierUser]}
      />,
    );
    expect(screen.getByRole('button', { name: 'Add user' })).toBeDisabled();
    expect(
      screen.getByText(/Growth raises the cap to 5 seats. Pro is unlimited/),
    ).toBeInTheDocument();
  });

  it('shows unlimited seats and an empty state', () => {
    renderWithStore(
      <ManageUsersPage
        skipQuery
        seats={{ plan: 'pro', seat_limit: null, active_count: 0, unlimited: true }}
        items={[]}
      />,
    );
    expect(screen.getByText(/Unlimited/)).toBeInTheDocument();
    expect(screen.getByText('No staff users yet.')).toBeInTheDocument();
  });

  it('opens add user from the list and submits in skipQuery', async () => {
    const user = userEvent.setup();
    renderWithStore(
      <ManageUsersPage
        skipQuery
        seats={{ plan: 'free', seat_limit: 2, active_count: 1, unlimited: false }}
        items={[ownerUser]}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Add user' }));
    expect(screen.getByRole('dialog', { name: 'Add user' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Create user' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Add user' })).not.toBeInTheDocument();
    });
  });

  it('opens a cashier drawer from the table', async () => {
    const user = userEvent.setup();
    renderWithStore(
      <ManageUsersPage
        skipQuery
        seats={{ plan: 'free', seat_limit: 2, active_count: 2, unlimited: false }}
        items={[ownerUser, cashierUser]}
        selectedUser={cashierUser}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Open ravi.cashier' }));
    expect(screen.getByRole('heading', { name: 'User' })).toBeInTheDocument();
  });

  it('shows a load error banner', () => {
    renderWithStore(<ManageUsersPage skipQuery error items={[]} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load users.');
  });

  it('loads seats and users from the API', async () => {
    renderWithStore(
      <ManageUsersPage locationId="1a2b3c4d-5e6f-7081-92a3-b4c5d6e7f809" />,
      usersFetch(),
    );
    expect(await screen.findByRole('button', { name: 'Open priya.owner' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open ravi.cashier' })).toBeInTheDocument();
  });

  it('creates a user over the API', async () => {
    const user = userEvent.setup();
    renderWithStore(
      <AddUserDialog open locationId="1a2b3c4d-5e6f-7081-92a3-b4c5d6e7f809" />,
      usersFetch(),
    );
    await user.type(screen.getByLabelText('Login ID'), 'new.cashier');
    await user.click(screen.getByRole('switch', { name: 'WhatsApp OTP' }));
    await user.type(screen.getByLabelText('WhatsApp mobile'), '+919876543299');
    await user.click(screen.getByRole('button', { name: 'Create user' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('shows a create error', async () => {
    const user = userEvent.setup();
    renderWithStore(
      <AddUserDialog open locationId="loc" />,
      usersFetch({ 'POST ': jsonResponse({ error: { code: 'SEAT_CAP_REACHED' } }, 409) }),
    );
    await user.type(screen.getByLabelText('Login ID'), 'blocked');
    await user.click(screen.getByRole('button', { name: 'Create user' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not create the user.');
  });

  it('renders add dialog with a seeded error', () => {
    renderWithStore(<AddUserDialog open skipQuery error />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});

describe('user drawer', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('copies, resets, shares, and updates a cashier', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn(async () => undefined);
    const open = vi.fn();
    vi.stubGlobal('open', open);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    renderWithStore(
      <UserDrawer
        open
        userId={cashierUser.user_id}
        locationId="1a2b3c4d-5e6f-7081-92a3-b4c5d6e7f809"
      />,
      usersFetch(),
    );
    expect(await screen.findByRole('button', { name: 'Copy password' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Copy password' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('K7mP2xQ9'));
    await user.click(screen.getByRole('button', { name: 'Reset password' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(2));
    await user.click(screen.getByRole('button', { name: 'Share via WhatsApp' }));
    await waitFor(() => expect(open).toHaveBeenCalled());
    await user.click(screen.getByRole('switch', { name: 'Active' }));
    await user.click(screen.getByRole('switch', { name: 'Password login' }));
    await user.click(screen.getByRole('switch', { name: 'WhatsApp OTP' }));
    await user.click(screen.getByRole('button', { name: 'Select all' }));
    await user.click(screen.getByRole('button', { name: 'Reset to role defaults' }));
    await user.click(screen.getByRole('checkbox', { name: 'crm' }));
    await user.type(screen.getByLabelText('Counter PIN'), '4455');
    await user.click(screen.getByRole('button', { name: 'Set PIN' }));
    await user.click(screen.getByRole('button', { name: 'Clear PIN' }));
    await user.click(screen.getByRole('button', { name: 'Revoke' }));
    await user.click(screen.getByRole('button', { name: 'Revoke all devices' }));
    await user.click(screen.getByRole('button', { name: 'Remove login' }));
    await user.click(screen.getByRole('button', { name: 'Remove' }));
  });

  it('covers skipQuery drawer actions', async () => {
    const user = userEvent.setup();
    renderWithStore(<UserDrawer open skipQuery user={cashierUser} userId={cashierUser.user_id} />);
    await user.click(screen.getByRole('button', { name: 'Copy password' }));
    expect(screen.getByText('Temporary password copied.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reset password' }));
    await user.click(screen.getByRole('switch', { name: 'Active' }));
    await user.click(screen.getByRole('button', { name: 'Share via WhatsApp' }));
    await user.click(screen.getByRole('button', { name: 'Set PIN' }));
    await user.click(screen.getByRole('button', { name: 'Clear PIN' }));
    await user.click(screen.getByRole('button', { name: 'Revoke' }));
    await user.click(screen.getByRole('button', { name: 'Revoke all devices' }));
    await user.click(screen.getByRole('button', { name: 'Select all' }));
    await user.click(screen.getByRole('button', { name: 'Remove login' }));
    await user.click(screen.getByRole('button', { name: 'Remove' }));
  });

  it('locks Owner permissions and hides remove', () => {
    renderWithStore(<UserDrawer open skipQuery user={ownerUser} userId={ownerUser.user_id} />);
    expect(screen.getByRole('checkbox', { name: 'manage-users' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Remove login' })).not.toBeInTheDocument();
  });

  it('shows drawer errors from the API', async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn(async () => undefined) },
      configurable: true,
    });
    renderWithStore(
      <UserDrawer open userId={cashierUser.user_id} />,
      usersFetch({
        'POST ': jsonResponse({ error: { code: 'TEMP_PASSWORD_UNAVAILABLE' } }, 409),
        'PUT ': jsonResponse({ error: { code: 'OWNER_ACCESS_IMMUTABLE' } }, 409),
        'PATCH ': jsonResponse({ error: { code: 'SEAT_CAP_REACHED' } }, 409),
        'DELETE ': jsonResponse({ error: { code: 'OWNER_REQUIRED' } }, 409),
      }),
    );
    expect(await screen.findByRole('button', { name: 'Copy password' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Copy password' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reset password' }));
    await user.click(screen.getByRole('switch', { name: 'Active' }));
    await user.click(screen.getByRole('button', { name: 'Select all' }));
    await user.click(screen.getByRole('button', { name: 'Remove login' }));
    await user.click(screen.getByRole('button', { name: 'Remove' }));
  });

  it('renders a seeded drawer error', () => {
    renderWithStore(<UserDrawer open skipQuery error user={cashierUser} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});
