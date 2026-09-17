import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AgingScreen from '@/screens/aging/AgingScreen';
import { agingReducer } from '@/screens/aging/store/aging.slice';
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
    { key: 'D0_30', label: '0–30', totalPaise: 4000 },
    { key: 'D31_60', label: '31–60', totalPaise: 8000 },
    { key: 'D61_90', label: '61–90', totalPaise: 0 },
    { key: 'D90_PLUS', label: '90+', totalPaise: 0 },
  ],
  items: [
    {
      partyId: 'c1',
      name: 'Khata Buyer',
      amountPaise: 12000,
      days: 45,
      ageOn: '2026-07-23',
      branchId: 'b1',
    },
  ],
});

function renderPage(role = 'pharmacy_owner') {
  const store = configureStore({
    reducer: { auth: authReducer, aging: agingReducer },
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
          modules: ['FINANCE'],
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
    expect(screen.getByText('Loading dues…')).toBeInTheDocument();
  });

  it('empty: no khata remaining', async () => {
    renderPage();
    expect(await screen.findByText('No khata remaining as of this date.')).toBeInTheDocument();
  });

  it('denied: till staff cannot open dues', async () => {
    renderPage('pharmacy_staff');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Till staff cannot open dues. Ask the owner for Accounts access.',
    );
    expect(receivablesMock).not.toHaveBeenCalled();
  });

  it('validation: future as-of is rejected', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('heading', { name: 'Receivable Ageing Report' });
    await user.selectOptions(screen.getByLabelText('Period'), 'custom');
    fireEvent.change(screen.getByLabelText('As of'), { target: { value: '2099-01-01' } });
    expect(await screen.findByRole('status')).toHaveTextContent('As-of date must be today or earlier.');
  });

  it('failure: list network error', async () => {
    receivablesMock.mockRejectedValue(new Error('network'));
    renderPage();
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Could not load dues. Check the connection and try again.',
    );
  });

  it('success: renders FIFO remaining buckets separately from oldest days', async () => {
    receivablesMock.mockResolvedValue(filledAr);
    payablesMock.mockResolvedValue(report());
    renderPage();
    expect(await screen.findByLabelText('FIFO remaining')).toBeInTheDocument();
    expect(screen.getByText('Khata Buyer')).toBeInTheDocument();
    expect(screen.getByText('45')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Oldest bucket' })).toBeInTheDocument();
    const buckets = screen.getByLabelText('FIFO remaining');
    expect(buckets).toHaveTextContent('0–30');
    expect(buckets).toHaveTextContent('31–60');
  });

  it('denied PLAN_LIMIT: hides parties and links to the plan', async () => {
    receivablesMock.mockRejectedValue(
      new ApiError('Khata and stockist aging is on Growth. Open the plan to turn it on.', 422, 'PLAN_LIMIT'),
    );
    payablesMock.mockRejectedValue(
      new ApiError('Khata and stockist aging is on Growth. Open the plan to turn it on.', 422, 'PLAN_LIMIT'),
    );
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Khata and stockist aging is on Growth. Open the plan to turn it on.',
    );
    expect(screen.getByRole('link', { name: 'Open the plan' })).toHaveAttribute('href', '/subscription');
    expect(screen.queryByText('Khata Buyer')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('FIFO remaining')).not.toBeInTheDocument();
  });
});
