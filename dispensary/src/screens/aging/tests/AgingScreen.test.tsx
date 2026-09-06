import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AgingScreen from '@/screens/aging/AgingScreen';
import { ApiError } from '@/services/axios';
import { authReducer } from '@/store';
import type { AgingReport } from '@/services/aging';

vi.mock('@/services/aging', async () => {
  const axios = await import('@/services/axios');
  return {
    getReceivables: vi.fn(),
    getPayables: vi.fn(),
    ApiError: axios.ApiError,
    isApiError: axios.isApiError,
  };
});

import { getPayables, getReceivables } from '@/services/aging';

const receivablesMock = vi.mocked(getReceivables);
const payablesMock = vi.mocked(getPayables);

const emptyBuckets: AgingReport['buckets'] = [
  { key: 'D0_30', label: '0–30', totalPaise: 0 },
  { key: 'D31_60', label: '31–60', totalPaise: 0 },
  { key: 'D61_90', label: '61–90', totalPaise: 0 },
  { key: 'D90_PLUS', label: '90+', totalPaise: 0 },
];

function report(overrides: Partial<AgingReport> = {}): AgingReport {
  return {
    asOf: '2026-09-06',
    scope: 'branch',
    branchId: 'b1',
    totalPaise: 0,
    sourceBalancePaise: 0,
    buckets: emptyBuckets,
    items: [],
    ...overrides,
  };
}

const filledAr = report({
  totalPaise: 12000,
  sourceBalancePaise: 12000,
  buckets: [
    { key: 'D0_30', label: '0–30', totalPaise: 12000 },
    { key: 'D31_60', label: '31–60', totalPaise: 0 },
    { key: 'D61_90', label: '61–90', totalPaise: 0 },
    { key: 'D90_PLUS', label: '90+', totalPaise: 0 },
  ],
  items: [
    {
      partyId: 'c1',
      name: 'Khata Buyer',
      amountPaise: 12000,
      days: 5,
      ageOn: '2026-09-01',
      branchId: 'b1',
    },
  ],
});

const filledAp = report({
  totalPaise: 8000,
  sourceBalancePaise: 8000,
  buckets: [
    { key: 'D0_30', label: '0–30', totalPaise: 8000 },
    { key: 'D31_60', label: '31–60', totalPaise: 0 },
    { key: 'D61_90', label: '61–90', totalPaise: 0 },
    { key: 'D90_PLUS', label: '90+', totalPaise: 0 },
  ],
  items: [
    {
      partyId: 's1',
      name: 'Acme Stockist',
      amountPaise: 8000,
      days: 5,
      ageOn: '2026-09-01',
      branchId: 'b1',
    },
  ],
});

function renderPage(role = 'pharmacy_owner', modules: string[] = ['FINANCE']) {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        user: {
          userId: 'user-1',
          displayName: 'Varshmaan',
          role,
          tenantId: 't1',
          pinSet: true,
          tenantStatus: 'ACTIVE',
          emailVerified: true,
          modules,
          branches: [{ id: 'b1', name: 'Main', branchCode: 'BR01', status: 'ACTIVE' }],
          activeBranchId: 'b1',
        },
      },
    },
  });
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <AgingScreen />
      </MemoryRouter>
    </Provider>,
  );
}

describe('AgingScreen', () => {
  beforeEach(() => {
    receivablesMock.mockReset();
    payablesMock.mockReset();
    receivablesMock.mockResolvedValue(report());
    payablesMock.mockResolvedValue(report());
  });

  it('loading: shows dues loading copy', () => {
    receivablesMock.mockReturnValue(new Promise(() => undefined));
    payablesMock.mockReturnValue(new Promise(() => undefined));
    renderPage();
    expect(screen.getByRole('status')).toHaveTextContent('Loading khata and stockist dues…');
    expect(screen.getByRole('heading', { name: 'Khata and stockist dues' })).toBeInTheDocument();
  });

  it('empty: no dues as of this date', async () => {
    renderPage();
    expect(
      await screen.findByText('No dues as of this date. Khata and stockist books are clear.'),
    ).toBeInTheDocument();
  });

  it('denied: till staff cannot open dues', () => {
    renderPage('pharmacy_staff', ['SALES']);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Till staff cannot open dues. Ask the owner for Accounts access.',
    );
    expect(receivablesMock).not.toHaveBeenCalled();
  });

  it('validation: future as-of is rejected', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('heading', { name: 'Khata and stockist dues' });
    fireEvent.change(screen.getByLabelText('As of'), { target: { value: '2099-01-01' } });
    await user.click(screen.getByRole('button', { name: 'Apply date' }));
    expect(screen.getByRole('status')).toHaveTextContent('As-of date must be today or earlier.');
    expect(receivablesMock).toHaveBeenCalledTimes(1);
  });

  it('conflict: figures changed on another till', async () => {
    const user = userEvent.setup();
    receivablesMock
      .mockResolvedValueOnce(report())
      .mockRejectedValue(new ApiError('stale', 409, 'STALE_STATE'));
    payablesMock.mockResolvedValue(report());
    renderPage();
    await screen.findByRole('heading', { name: 'Khata and stockist dues' });
    await user.click(screen.getByRole('button', { name: 'Apply date' }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'These figures changed on another till. Reload, then apply the date again.',
    );
  });

  it('failure: list network error', async () => {
    receivablesMock.mockRejectedValue(new Error('network'));
    renderPage();
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Could not load dues. Check the connection and try again.',
    );
  });

  it('success: shows buckets, parties, and restores apply focus', async () => {
    const user = userEvent.setup();
    receivablesMock.mockResolvedValue(filledAr);
    payablesMock.mockResolvedValue(filledAp);
    renderPage();
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Dues as of this date, from khata and stockist books.',
    );
    expect(screen.getByRole('heading', { name: 'Patients owe us' })).toBeInTheDocument();
    expect(screen.getByText('Khata Buyer')).toBeInTheDocument();
    expect(screen.getByText('Acme Stockist')).toBeInTheDocument();
    expect(screen.getByText('0–30 days')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('As of'), { target: { value: '2026-08-01' } });
    await user.click(screen.getByRole('button', { name: 'Apply date' }));
    await waitFor(() =>
      expect(receivablesMock).toHaveBeenCalledWith(expect.objectContaining({ asOf: '2026-08-01' })),
    );
    expect(screen.getByRole('button', { name: 'Apply date' })).toHaveFocus();
  });

  it('owner all outlets consolidates tenant dues', async () => {
    const user = userEvent.setup();
    receivablesMock.mockResolvedValueOnce(filledAr).mockResolvedValue({
      ...filledAr,
      scope: 'tenant',
      totalPaise: 25000,
    });
    payablesMock.mockResolvedValueOnce(filledAp).mockResolvedValue({
      ...filledAp,
      scope: 'tenant',
      totalPaise: 25000,
    });
    renderPage();
    expect(await screen.findByText('Khata Buyer')).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Outlet'), 'tenant');
    await waitFor(() =>
      expect(receivablesMock).toHaveBeenCalledWith(expect.objectContaining({ scope: 'tenant' })),
    );
    expect(screen.getByRole('columnheader', { name: 'All outlets' })).toBeInTheDocument();
  });

  it('denied PLAN_LIMIT: hides buckets and parties and links to the plan', async () => {
    receivablesMock.mockRejectedValue(
      new ApiError(
        'Khata and stockist aging is on Growth. Open the plan to turn it on.',
        422,
        'PLAN_LIMIT',
      ),
    );
    payablesMock.mockRejectedValue(
      new ApiError(
        'Khata and stockist aging is on Growth. Open the plan to turn it on.',
        422,
        'PLAN_LIMIT',
      ),
    );
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Khata and stockist aging is on Growth. Open the plan to turn it on.',
    );
    expect(screen.getByRole('link', { name: 'Open the plan' })).toHaveAttribute(
      'href',
      '/subscription',
    );
    expect(screen.getByText(/Growth unlocks these aged books/)).toBeInTheDocument();
    expect(screen.queryByText('Khata Buyer')).not.toBeInTheDocument();
    expect(screen.queryByText('Acme Stockist')).not.toBeInTheDocument();
    expect(screen.queryByText('0–30 days')).not.toBeInTheDocument();
    expect(screen.queryByText('No khata remaining as of this date.')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('As of')).not.toBeInTheDocument();
  });
});
