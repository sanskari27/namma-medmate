import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ShopBooksScreen from '@/screens/shop-books/ShopBooksScreen';
import { ROUTES } from '@/libs/constants/routes.const';
import { ApiError } from '@/services/axios';
import { authReducer } from '@/store';
import type { FinanceReportCatalogItem, FinanceReportTable } from '@/services/financeReports';

vi.mock('@/services/financeReports', async () => {
  const axios = await import('@/services/axios');
  return {
    listFinanceReports: vi.fn(),
    getFinanceReport: vi.fn(),
    downloadFinanceReport: vi.fn(),
    ApiError: axios.ApiError,
    isApiError: axios.isApiError,
  };
});

import {
  downloadFinanceReport,
  getFinanceReport,
  listFinanceReports,
} from '@/services/financeReports';

const listMock = vi.mocked(listFinanceReports);
const tableMock = vi.mocked(getFinanceReport);
const exportMock = vi.mocked(downloadFinanceReport);

const catalog: FinanceReportCatalogItem[] = [
  { key: 'DAY_BOOK', title: 'Day Book', filters: ['from', 'to'] },
  { key: 'SALES_SUMMARY', title: 'Sales Summary', filters: ['from', 'to'] },
  { key: 'PROFIT_AND_LOSS', title: 'Profit & Loss', filters: ['from', 'to'] },
  { key: 'GSTR1', title: 'GSTR-1 style sales', filters: ['from', 'to'] },
  { key: 'GSTR3B', title: 'GSTR-3B style summary', filters: ['from', 'to'] },
  { key: 'BRANCH_PNL', title: 'Branch-wise P&L', filters: ['from', 'to'] },
];

const dayBook: FinanceReportTable = {
  key: 'DAY_BOOK',
  title: 'Day Book',
  from: '2026-09-06',
  to: '2026-09-06',
  scope: 'branch',
  branchId: 'br1',
  totals: [
    { key: 'cashLike', label: 'Cash-like collected', amountPaise: 11200 },
    { key: 'khata', label: 'Khata', amountPaise: 0 },
    { key: 'spend', label: 'Shop spend', amountPaise: 2000 },
    { key: 'stockistPayments', label: 'Stockist payments', amountPaise: 0 },
  ],
  columns: ['occurredIst', 'kind', 'reference', 'amountPaise'],
  items: [
    {
      occurredIst: '2026-09-06 07:30',
      kind: 'Cash',
      reference: 'INV-1',
      amountPaise: '11200',
    },
  ],
  generatedAt: '2026-09-06T02:00:00Z',
};

const pnl: FinanceReportTable = {
  key: 'PROFIT_AND_LOSS',
  title: 'Profit & Loss',
  from: '2026-09-06',
  to: '2026-09-06',
  scope: 'branch',
  branchId: 'br1',
  totals: [
    { key: 'revenue', label: 'Revenue', amountPaise: 11200 },
    { key: 'cogs', label: 'COGS', amountPaise: 5000 },
    { key: 'expenses', label: 'Spend', amountPaise: 2000 },
    { key: 'profit', label: 'Profit', amountPaise: 4200 },
  ],
  columns: ['line', 'amountPaise'],
  items: [
    { line: 'Revenue', amountPaise: '11200' },
    { line: 'Purchase-price COGS', amountPaise: '5000' },
    { line: 'Posted spend', amountPaise: '2000' },
    { line: 'Profit', amountPaise: '4200' },
  ],
  generatedAt: '2026-09-06T02:00:00Z',
};

const gstr1: FinanceReportTable = {
  key: 'GSTR1',
  title: 'GSTR-1 style sales',
  from: '2026-09-06',
  to: '2026-09-06',
  scope: 'branch',
  branchId: 'br1',
  totals: [
    { key: 'b2bTaxable', label: 'B2B taxable', amountPaise: 10000 },
    { key: 'b2csTaxable', label: 'B2CS taxable', amountPaise: 10000 },
  ],
  columns: ['section', 'invoiceNumber', 'gstin', 'hsn', 'taxablePaise'],
  items: [
    {
      section: 'B2B',
      invoiceNumber: 'INV-B2B',
      gstin: '27AAAAA0000A1Z5',
      hsn: '30049099',
      taxablePaise: '10000',
    },
    {
      section: 'B2CS',
      invoiceNumber: 'INV-WALK',
      gstin: '',
      hsn: '30049099',
      taxablePaise: '10000',
    },
  ],
  generatedAt: '2026-09-06T02:00:00Z',
};

function renderPage(role = 'pharmacy_owner', modules: string[] = ['FINANCE', 'SALES']) {
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
          roles: [],
          activeBranchId: 'br1',
          branches: [{ id: 'br1', name: 'Main', branchCode: 'BR01', status: 'ACTIVE' }],
        },
      },
    },
  });
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <ShopBooksScreen />
      </MemoryRouter>
    </Provider>,
  );
}

describe('Shop books', () => {
  beforeEach(() => {
    listMock.mockReset();
    tableMock.mockReset();
    exportMock.mockReset();
    URL.createObjectURL = vi.fn(() => 'blob:shop-books');
    URL.revokeObjectURL = vi.fn();
  });

  it('loading: waits for shop books', () => {
    listMock.mockReturnValue(new Promise(() => undefined));
    renderPage();
    expect(screen.getByText('Loading shop books…')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Shop books' })).toBeInTheDocument();
  });

  it('empty: no rows in this shop book yet', async () => {
    listMock.mockResolvedValue(catalog);
    tableMock.mockResolvedValue({ ...dayBook, items: [] });
    renderPage();
    expect(
      await screen.findByText(
        'No rows in this shop book yet. Complete a sale or post spend and it lands here.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Shop books' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Day book/i })).toBeInTheDocument();
    expect(ROUTES.BOOKS).toBe('/books');
    expect(ROUTES.REPORTS).toBe('/reports');
  });

  it('denied: till staff without Accounts cannot open shop books', () => {
    renderPage('pharmacy_staff', ['SALES']);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Till staff cannot open shop books. Ask the owner for Accounts access.',
    );
    expect(listMock).not.toHaveBeenCalled();
  });

  it('validation: period cannot end before it starts', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue(catalog);
    tableMock.mockResolvedValue(dayBook);
    renderPage();
    await screen.findByRole('table', { name: 'Day book' });
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-09-10' } });
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-09-01' } });
    await user.click(screen.getByRole('button', { name: 'Show this book' }));
    expect(screen.getByRole('status')).toHaveTextContent(
      'Choose a period that starts on or before the end date.',
    );
    expect(exportMock).not.toHaveBeenCalled();
  });

  it('conflict: export is stale on another till', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue(catalog);
    tableMock.mockResolvedValue(dayBook);
    exportMock.mockRejectedValue(new ApiError('stale', 409, 'STALE_STATE'));
    renderPage();
    await screen.findByRole('table', { name: 'Day book' });
    await user.click(screen.getByRole('button', { name: 'Download spreadsheet' }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'This book changed on another till. Reload, then take the sheet again.',
    );
  });

  it('failure: list network error', async () => {
    listMock.mockRejectedValue(new Error('network'));
    renderPage();
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Could not load shop books. Check the connection and try again.',
    );
  });

  it('success: day book, GST for the CA, P&L totals, and restores print focus', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue(catalog);
    tableMock.mockResolvedValue(dayBook);
    exportMock.mockResolvedValue(new Blob(['%PDF'], { type: 'application/pdf' }));
    renderPage();
    const book = await screen.findByRole('table', { name: 'Day book' });
    expect(book).toHaveTextContent('Cash');
    expect(book).toHaveTextContent('INV-1');
    expect(screen.getByText('Cash-like collected')).toBeInTheDocument();
    expect(screen.getAllByText(/GST for the CA/).length).toBeGreaterThan(0);
    tableMock.mockResolvedValue(pnl);
    await user.click(screen.getByRole('button', { name: 'Shop P&L' }));
    expect(await screen.findByText('Purchase-price COGS')).toBeInTheDocument();
    expect(screen.getByLabelText('Reconciliation totals')).toHaveTextContent(/42/);
    tableMock.mockResolvedValue(gstr1);
    await user.click(screen.getByRole('button', { name: 'GST for the CA (GSTR-1)' }));
    expect(await screen.findByText('B2B')).toBeInTheDocument();
    expect(screen.getByText('B2CS')).toBeInTheDocument();
    tableMock.mockResolvedValue(dayBook);
    await user.click(screen.getByRole('button', { name: 'Day book' }));
    await screen.findByRole('table', { name: 'Day book' });
    await user.click(screen.getByRole('button', { name: 'Print this book' }));
    await waitFor(() => expect(exportMock).toHaveBeenCalled());
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Print file saved for this shop book.',
    );
    expect(screen.getByRole('button', { name: 'Print this book' })).toHaveFocus();
  });

  it('owner all outlets consolidates shop books', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue(catalog);
    tableMock.mockResolvedValue(dayBook);
    renderPage();
    await screen.findByRole('table', { name: 'Day book' });
    await user.selectOptions(screen.getByLabelText('Outlet'), 'tenant');
    await waitFor(() =>
      expect(tableMock).toHaveBeenCalledWith(
        'DAY_BOOK',
        expect.objectContaining({ scope: 'tenant' }),
      ),
    );
    expect(screen.getByRole('option', { name: 'All outlets' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'This outlet' })).toBeInTheDocument();
  });

  it('staff sees this outlet only', async () => {
    listMock.mockResolvedValue(catalog);
    tableMock.mockResolvedValue(dayBook);
    renderPage('pharmacy_staff', ['FINANCE']);
    await screen.findByRole('table', { name: 'Day book' });
    expect(screen.queryByLabelText('Outlet')).not.toBeInTheDocument();
    expect(screen.queryByText('All outlets')).not.toBeInTheDocument();
  });
});
