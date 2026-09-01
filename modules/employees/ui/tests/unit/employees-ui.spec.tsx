import type { ReactNode } from 'react';
import { Provider } from 'react-redux';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { emit, resetEventBus } from '@namma-medmate/event-bus';
import {
  AddEmployeeDialog,
  EmployeeDrawer,
  EmployeesNavLink,
  EmployeesPage,
  createEmployeesStore,
} from '../../src/index.ts';
import { interpolate, positionLabel, statusLabel, t } from '../../src/lib/copy.ts';
import { downloadBlob, downloadTextFile } from '../../src/lib/download.ts';
import {
  cashier,
  pharmacist,
  separated,
  summaryFixture,
} from '../../src/scenarios/employees.scenarios.ts';
import { useEmployeesEvents } from '../../src/hooks/use-employees-events.ts';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function renderWithStore(ui: ReactNode, fetchImpl: typeof fetch = vi.fn()) {
  const store = createEmployeesStore({
    baseUrl: 'http://localhost:3008',
    manageUsersBaseUrl: 'http://localhost:3007',
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

function employeesFetch(overrides: Partial<Record<string, Response>> = {}) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = requestUrl(input);
    const method = requestMethod(input, init);
    const key = `${method} ${url}`;
    for (const [match, response] of Object.entries(overrides)) {
      if (key.includes(match) && response) {
        return response;
      }
    }
    if (url.includes('/export.csv')) {
      return new Response('\uFEFFemployee_code,full_name\nEMP-0001,Anita Sharma\n', {
        status: 200,
        headers: { 'content-type': 'text/csv; charset=utf-8' },
      });
    }
    if (url.includes('/id-card.pdf')) {
      return new Response('%PDF-1.4 anita', {
        status: 200,
        headers: { 'content-type': 'application/pdf' },
      });
    }
    if (url.includes('/manage-users/users')) {
      return jsonResponse({
        success: true,
        data: {
          items: [
            { user_id: 'u-free', login_id: 'unlinked.login', employee_id: null },
            { user_id: 'u-1', login_id: 'anita.login', employee_id: pharmacist.employee_id },
          ],
          page: 1,
          page_size: 20,
          total: 2,
        },
      });
    }
    if (method === 'GET' && url.includes('/employees/summary')) {
      return jsonResponse({ success: true, data: summaryFixture });
    }
    if (method === 'GET' && /\/employees\/[0-9a-f-]{36}/.test(url)) {
      return jsonResponse({ success: true, data: pharmacist });
    }
    if (method === 'GET' && url.includes('/employees')) {
      return jsonResponse({
        success: true,
        data: { items: [pharmacist, cashier, separated], page: 1, page_size: 20, total: 3 },
      });
    }
    if (method === 'POST') {
      return jsonResponse({ success: true, data: pharmacist }, 201);
    }
    if (method === 'PATCH') {
      return jsonResponse({ success: true, data: { ...pharmacist, status: 'separated' } });
    }
    return jsonResponse({ success: true, data: pharmacist });
  });
}

function EventsProbe() {
  const events = useEmployeesEvents();
  return (
    <button type="button" onClick={() => events.listChanged('loc')}>
      emit
    </button>
  );
}

function stubDownload(): {
  createObjectURL: ReturnType<typeof vi.fn>;
  click: ReturnType<typeof vi.fn>;
} {
  const createObjectURL = vi.fn(() => 'blob:employees');
  const revokeObjectURL = vi.fn();
  vi.stubGlobal('URL', { createObjectURL, revokeObjectURL, canParse: URL.canParse });
  const click = vi.fn();
  HTMLAnchorElement.prototype.click = click;
  return { createObjectURL, click };
}

describe('employees-ui helpers', () => {
  afterEach(() => {
    cleanup();
    resetEventBus();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('interpolates copy and labels', () => {
    expect(interpolate('{{position}} {{count}}', { position: 'Pharmacist', count: '1' })).toBe(
      'Pharmacist 1',
    );
    expect(interpolate('x {{missing}}', {})).toBe('x ');
    expect(t('employees.nav.title')).toBe('Employees');
    expect(positionLabel('cashier')).toBe('Cashier');
    expect(statusLabel('separated')).toBe('Separated');
  });

  it('renders the account nav link', () => {
    render(<EmployeesNavLink />);
    expect(screen.getByRole('link', { name: 'Employees' })).toHaveAttribute(
      'href',
      '/account/employees',
    );
  });

  it('emits list changed events', () => {
    emit('employees.list.changed', { location_id: 'seed' });
    render(<EventsProbe />);
    fireEvent.click(screen.getByRole('button', { name: 'emit' }));
  });

  it('downloads blob and text files', () => {
    const { createObjectURL, click } = stubDownload();
    downloadBlob('id-card.pdf', new Blob(['pdf']));
    downloadTextFile('employees.csv', 'a,b', 'text/csv');
    expect(createObjectURL).toHaveBeenCalled();
    expect(click).toHaveBeenCalledTimes(2);
  });
});

describe('employees-ui screens', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('shows the Starter lock without a staff table', () => {
    renderWithStore(<EmployeesPage skipQuery planLocked />);
    expect(screen.getByRole('heading', { name: 'Employees is on Starter' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add employee' })).not.toBeInTheDocument();
  });

  it('renders composition bars and mixed statuses', () => {
    renderWithStore(
      <EmployeesPage
        skipQuery
        summary={summaryFixture}
        items={[
          pharmacist,
          cashier,
          separated,
          {
            ...cashier,
            employee_id: 'd-other',
            full_name: 'Intern',
            position: 'other',
            position_label: 'Intern',
          },
        ]}
      />,
    );
    expect(screen.getByRole('button', { name: 'Open Anita Sharma' })).toBeInTheDocument();
    expect(screen.getByText('Linked')).toBeInTheDocument();
    expect(screen.getAllByText('Separated').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Open Intern' })).toBeInTheDocument();
    expect(screen.getByText(/Pharmacist 1/)).toBeInTheDocument();
  });

  it('shows an empty state', () => {
    renderWithStore(<EmployeesPage skipQuery items={[]} />);
    expect(screen.getByText('No employees yet.')).toBeInTheDocument();
  });

  it('shows a load error banner', () => {
    renderWithStore(<EmployeesPage skipQuery error items={[]} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load employees.');
  });

  it('filters skipQuery rows and exports CSV', async () => {
    const user = userEvent.setup();
    stubDownload();
    renderWithStore(
      <EmployeesPage skipQuery summary={summaryFixture} items={[pharmacist, cashier, separated]} />,
    );
    await user.type(screen.getByLabelText('Search name, phone, or code'), 'anita');
    expect(screen.getByRole('button', { name: 'Open Anita Sharma' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Open Ravi Kumar' })).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Position'), 'cashier');
    expect(screen.queryByRole('button', { name: 'Open Anita Sharma' })).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Position'), '');
    await user.selectOptions(screen.getByLabelText('Status'), 'separated');
    expect(screen.getByRole('button', { name: 'Open Neha Singh' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Export CSV' }));
  });

  it('opens add employee from the list and submits in skipQuery', async () => {
    const user = userEvent.setup();
    renderWithStore(<EmployeesPage skipQuery summary={summaryFixture} items={[pharmacist]} />);
    await user.click(screen.getByRole('button', { name: 'Add employee' }));
    expect(screen.getByRole('dialog', { name: 'Add employee' })).toBeInTheDocument();
    await user.type(screen.getByLabelText('Full name'), 'Skip Pharmacist');
    await user.type(screen.getByLabelText('Phone'), '+919800000099');
    await user.click(screen.getByRole('button', { name: 'Save employee' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Add employee' })).not.toBeInTheDocument();
    });
  });

  it('opens a skipQuery drawer from a table row', async () => {
    const user = userEvent.setup();
    renderWithStore(<EmployeesPage skipQuery summary={summaryFixture} items={[pharmacist]} />);
    await user.click(screen.getByRole('button', { name: 'Open Anita Sharma' }));
    expect(screen.getByRole('heading', { name: 'Employee' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.queryByRole('heading', { name: 'Employee' })).not.toBeInTheDocument();
  });

  it('loads employees from the API', async () => {
    renderWithStore(
      <EmployeesPage locationId="1a2b3c4d-5e6f-7081-92a3-b4c5d6e7f809" />,
      employeesFetch(),
    );
    expect(await screen.findByRole('button', { name: 'Open Anita Sharma' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open Ravi Kumar' })).toBeInTheDocument();
  });

  it('shows a live list load error', async () => {
    renderWithStore(
      <EmployeesPage locationId="1a2b3c4d-5e6f-7081-92a3-b4c5d6e7f809" />,
      employeesFetch({
        'GET ': jsonResponse({ error: { code: 'FORBIDDEN' } }, 403),
      }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load employees.');
  });

  it('exports CSV over the API', async () => {
    const user = userEvent.setup();
    stubDownload();
    renderWithStore(
      <EmployeesPage locationId="1a2b3c4d-5e6f-7081-92a3-b4c5d6e7f809" />,
      employeesFetch(),
    );
    await screen.findByRole('button', { name: 'Open Anita Sharma' });
    await user.type(screen.getByLabelText('Search name, phone, or code'), 'anita');
    await user.selectOptions(screen.getByLabelText('Position'), 'pharmacist');
    await user.selectOptions(screen.getByLabelText('Status'), 'active');
    await user.click(screen.getByRole('button', { name: 'Export CSV' }));
  });

  it('treats a failed CSV export as an error result', async () => {
    const user = userEvent.setup();
    renderWithStore(
      <EmployeesPage locationId="1a2b3c4d-5e6f-7081-92a3-b4c5d6e7f809" />,
      employeesFetch({
        'export.csv': new Response('nope', { status: 403 }),
      }),
    );
    await screen.findByRole('button', { name: 'Open Anita Sharma' });
    await user.click(screen.getByRole('button', { name: 'Export CSV' }));
  });
});

describe('add employee dialog', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('creates an employee over the API', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    renderWithStore(
      <AddEmployeeDialog
        open
        locationId="1a2b3c4d-5e6f-7081-92a3-b4c5d6e7f809"
        onOpenChange={onOpenChange}
      />,
      employeesFetch(),
    );
    await user.type(screen.getByLabelText('Full name'), 'New Pharmacist');
    await user.type(screen.getByLabelText('Phone'), '+919800000088');
    await user.selectOptions(screen.getByLabelText('Position'), 'cashier');
    await user.type(screen.getByLabelText('Pharmacist registration no.'), 'KA-1');
    await user.type(screen.getByLabelText('Registration expiry'), '2027-01-01');
    await user.click(screen.getByRole('button', { name: 'Save employee' }));
    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('shows a create error', async () => {
    const user = userEvent.setup();
    renderWithStore(
      <AddEmployeeDialog open locationId="loc" />,
      employeesFetch({ 'POST ': jsonResponse({ error: { code: 'PLAN_REQUIRED' } }, 403) }),
    );
    await user.type(screen.getByLabelText('Full name'), 'Blocked');
    await user.type(screen.getByLabelText('Phone'), '+919800000077');
    await user.click(screen.getByRole('button', { name: 'Save employee' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not create the employee.');
  });

  it('renders add dialog with a seeded error', () => {
    renderWithStore(<AddEmployeeDialog open skipQuery error />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('leaves the user picker empty when manage-users fails', async () => {
    renderWithStore(
      <AddEmployeeDialog open locationId="loc" />,
      employeesFetch({
        'manage-users/users': jsonResponse({ error: { code: 'FORBIDDEN' } }, 403),
      }),
    );
    await waitFor(() => {
      expect(screen.getByLabelText('Linked login (optional)')).toBeInTheDocument();
    });
    expect(screen.queryByText('unlinked.login')).not.toBeInTheDocument();
  });
});

describe('employee drawer', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('covers skipQuery drawer actions', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    stubDownload();
    renderWithStore(
      <EmployeeDrawer
        open
        skipQuery
        employee={pharmacist}
        employeeId={pharmacist.employee_id}
        onOpenChange={onOpenChange}
      />,
    );
    await user.selectOptions(screen.getByLabelText('Status'), 'separated');
    await user.click(screen.getByRole('button', { name: 'Generate ID card' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it('renders an empty skipQuery drawer', () => {
    renderWithStore(<EmployeeDrawer open skipQuery />);
    expect(screen.getByRole('heading', { name: 'Employee' })).toBeInTheDocument();
    expect(screen.getByText('No documents uploaded.')).toBeInTheDocument();
  });

  it('saves and downloads an ID card over the API', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    stubDownload();
    renderWithStore(
      <EmployeeDrawer
        open
        employeeId={pharmacist.employee_id}
        locationId="1a2b3c4d-5e6f-7081-92a3-b4c5d6e7f809"
        onOpenChange={onOpenChange}
      />,
      employeesFetch(),
    );
    expect(await screen.findByLabelText('Full name')).toHaveValue('Anita Sharma');
    await user.click(screen.getByRole('button', { name: 'Generate ID card' }));
    await user.clear(screen.getByLabelText('Full name'));
    await user.type(screen.getByLabelText('Full name'), 'Anita S');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it('shows drawer errors from the API', async () => {
    const user = userEvent.setup();
    renderWithStore(
      <EmployeeDrawer open employeeId={pharmacist.employee_id} />,
      employeesFetch({
        'PATCH ': jsonResponse({ error: { code: 'FORBIDDEN' } }, 403),
        'id-card.pdf': new Response('nope', { status: 403 }),
      }),
    );
    expect(await screen.findByLabelText('Full name')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Generate ID card' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('shows a live employee load error', async () => {
    renderWithStore(
      <EmployeeDrawer open employeeId={pharmacist.employee_id} />,
      employeesFetch({
        'GET ': jsonResponse({ error: { code: 'NOT_FOUND' } }, 404),
      }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not update this employee.');
  });

  it('renders a seeded drawer error', () => {
    renderWithStore(<EmployeeDrawer open skipQuery error employee={pharmacist} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});
