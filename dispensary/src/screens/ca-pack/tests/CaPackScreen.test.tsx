import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CaPackScreen from '@/screens/ca-pack/CaPackScreen';
import { ROUTES } from '@/libs/constants/routes.const';
import { ApiError } from '@/services/axios';
import { authReducer } from '@/store';
import type { CaPack } from '@/services/caPack';

vi.mock('@/services/caPack', async () => {
  const axios = await import('@/services/axios');
  return {
    getCaPack: vi.fn(),
    downloadCaPack: vi.fn(),
    ApiError: axios.ApiError,
    isApiError: axios.isApiError,
  };
});

import { downloadCaPack, getCaPack } from '@/services/caPack';

const getMock = vi.mocked(getCaPack);
const downloadMock = vi.mocked(downloadCaPack);

const filled: CaPack = {
  from: '2026-09-06',
  to: '2026-09-06',
  scope: 'branch',
  branchId: 'br1',
  generatedAt: '2026-09-06T02:00:00Z',
  sections: [
    {
      key: 'PROFIT_AND_LOSS',
      title: 'Profit & Loss',
      totals: [
        { key: 'revenue', label: 'Revenue', amountPaise: 11200 },
        { key: 'profit', label: 'Profit', amountPaise: 4200 },
      ],
      columns: ['line', 'amountPaise'],
      items: [
        { line: 'Revenue', amountPaise: '11200' },
        { line: 'Profit', amountPaise: '4200' },
      ],
    },
    {
      key: 'GSTR1',
      title: 'GSTR-1 style sales',
      totals: [{ key: 'outputTax', label: 'Output tax', amountPaise: 1200 }],
      columns: ['section', 'invoiceNumber'],
      items: [{ section: 'B2CS', invoiceNumber: 'INV-1' }],
    },
    {
      key: 'RECEIVABLES',
      title: 'Khata dues',
      totals: [{ key: 'total', label: 'Total', amountPaise: 0 }],
      columns: ['name', 'amountPaise', 'days'],
      items: [],
    },
  ],
};

const emptyPack: CaPack = {
  ...filled,
  sections: filled.sections.map((section) => ({ ...section, items: [], totals: [] })),
};

function renderPage(
  role = 'pharmacy_owner',
  modules: string[] = ['FINANCE'],
  desks: string[] = [],
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
          roles: desks.map((code) => ({ id: code, name: code, code, kind: 'PREDEFINED' })),
          activeBranchId: 'br1',
          branches: [{ id: 'br1', name: 'Main', branchCode: 'BR01', status: 'ACTIVE' }],
        },
      },
    },
  });
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <CaPackScreen />
      </MemoryRouter>
    </Provider>,
  );
}

describe('Pack for the CA', () => {
  beforeEach(() => {
    getMock.mockReset();
    downloadMock.mockReset();
    URL.createObjectURL = vi.fn(() => 'blob:ca-pack');
    URL.revokeObjectURL = vi.fn();
  });

  it('loading: waits for the CA pack', () => {
    getMock.mockReturnValue(new Promise(() => undefined));
    renderPage();
    expect(screen.getByText('Loading the CA pack…')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Pack for the CA' })).toBeInTheDocument();
  });

  it('empty: nothing to pack yet', async () => {
    getMock.mockResolvedValue(emptyPack);
    renderPage();
    expect(
      await screen.findByText(
        'Nothing to pack yet. Complete a sale or post spend, then take this file.',
      ),
    ).toBeInTheDocument();
    expect(ROUTES.ACCOUNTANT).toBe('/accountant');
  });

  it('denied: till staff without Accountant desk cannot open the pack', () => {
    renderPage('pharmacy_staff', ['SALES']);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Till staff cannot open the CA pack. Ask the owner for the Accountant desk.',
    );
    expect(getMock).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Download CA pack' })).not.toBeInTheDocument();
  });

  it('validation: period cannot end before it starts', async () => {
    const user = userEvent.setup();
    getMock.mockResolvedValue(filled);
    renderPage();
    await screen.findByRole('region', { name: 'Shop P&L' });
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-09-10' } });
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-09-01' } });
    await user.click(screen.getByRole('button', { name: 'Show this pack' }));
    expect(screen.getByRole('status')).toHaveTextContent(
      'Choose a period that starts on or before the end date.',
    );
    expect(downloadMock).not.toHaveBeenCalled();
  });

  it('conflict: download is stale on another till', async () => {
    const user = userEvent.setup();
    getMock.mockResolvedValue(filled);
    downloadMock.mockRejectedValue(new ApiError('stale', 409, 'STALE_STATE'));
    renderPage();
    await screen.findByRole('region', { name: 'Shop P&L' });
    await user.click(screen.getByRole('button', { name: 'Download CA pack' }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'This pack changed on another till. Reload, then download again.',
    );
  });

  it('failure: list network error', async () => {
    getMock.mockRejectedValue(new Error('network'));
    renderPage();
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Could not load the CA pack. Check the connection and try again.',
    );
  });

  it('success: categorized finance without medical fields, restores download focus', async () => {
    const user = userEvent.setup();
    getMock.mockResolvedValue(filled);
    downloadMock.mockResolvedValue(new Blob(['%PDF'], { type: 'application/pdf' }));
    renderPage();
    expect(await screen.findByRole('region', { name: 'Shop P&L' })).toHaveTextContent('Revenue');
    expect(screen.getByRole('region', { name: 'GST for the CA (GSTR-1)' })).toHaveTextContent(
      'B2CS',
    );
    expect(screen.queryByText(/Penicillin/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/prescription/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/allerg/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Download CA pack' }));
    await waitFor(() => expect(downloadMock).toHaveBeenCalled());
    expect(await screen.findByRole('status')).toHaveTextContent(
      'CA pack saved. Hand this file to the CA.',
    );
    expect(screen.getByRole('button', { name: 'Download CA pack' })).toHaveFocus();
  });

  it('owner all outlets consolidates the pack', async () => {
    const user = userEvent.setup();
    getMock.mockResolvedValue(filled);
    renderPage();
    await screen.findByRole('region', { name: 'Shop P&L' });
    await user.selectOptions(screen.getByLabelText('Outlet'), 'tenant');
    await waitFor(() =>
      expect(getMock).toHaveBeenCalledWith(expect.objectContaining({ scope: 'tenant' })),
    );
    expect(screen.getByRole('option', { name: 'All outlets' })).toBeInTheDocument();
  });

  it('accountant sees this outlet only', async () => {
    getMock.mockResolvedValue(filled);
    renderPage('pharmacy_staff', ['FINANCE'], ['accountant']);
    await screen.findByRole('region', { name: 'Shop P&L' });
    expect(screen.queryByLabelText('Outlet')).not.toBeInTheDocument();
    expect(screen.queryByText('All outlets')).not.toBeInTheDocument();
  });
});
