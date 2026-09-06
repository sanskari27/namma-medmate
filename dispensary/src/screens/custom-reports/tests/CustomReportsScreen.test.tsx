import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CustomReportsScreen from '@/screens/custom-reports/CustomReportsScreen';
import { ROUTES } from '@/libs/constants/routes.const';
import { ApiError } from '@/services/axios';
import { authReducer } from '@/store';
import type { CustomReportCatalog, CustomReportPreview } from '@/services/customReports';

vi.mock('@/services/customReports', async () => {
  const axios = await import('@/services/axios');
  return {
    getCustomReportCatalog: vi.fn(),
    previewCustomReport: vi.fn(),
    downloadCustomReport: vi.fn(),
    ApiError: axios.ApiError,
    isApiError: axios.isApiError,
  };
});

import {
  downloadCustomReport,
  getCustomReportCatalog,
  previewCustomReport,
} from '@/services/customReports';

const catalogMock = vi.mocked(getCustomReportCatalog);
const previewMock = vi.mocked(previewCustomReport);
const downloadMock = vi.mocked(downloadCustomReport);

const catalog: CustomReportCatalog = {
  datasets: [
    {
      key: 'SALES',
      label: 'Till bills',
      fields: [
        { key: 'invoiceNumber', label: 'Bill number', kind: 'TEXT' },
        { key: 'productName', label: 'Medicine', kind: 'TEXT' },
        { key: 'sellingPaise', label: 'Selling paise', kind: 'MONEY' },
      ],
    },
    {
      key: 'CUSTOMERS',
      label: 'Patients',
      fields: [
        { key: 'name', label: 'Patient', kind: 'TEXT' },
        { key: 'phone', label: 'Phone', kind: 'TEXT' },
      ],
    },
  ],
  operators: [
    { key: 'EQ', label: 'is' },
    { key: 'CONTAINS', label: 'contains' },
  ],
};

const preview: CustomReportPreview = {
  dataset: 'SALES',
  from: '2026-09-06',
  to: '2026-09-06',
  scope: 'branch',
  branchId: 'b1',
  columns: ['invoiceNumber', 'productName'],
  items: [{ invoiceNumber: 'INV-1', productName: 'Top Pack' }],
  rowCount: 1,
  truncated: false,
  generatedAt: '2026-09-06T02:00:00Z',
};

function renderPage(
  role = 'pharmacy_owner',
  modules: string[] = ['REPORTING'],
  activeBranchId: string | null = 'b1',
) {
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
          activeBranchId,
        },
      },
    },
  });
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <CustomReportsScreen />
      </MemoryRouter>
    </Provider>,
  );
}

describe('CustomReportsScreen', () => {
  beforeEach(() => {
    catalogMock.mockReset();
    previewMock.mockReset();
    downloadMock.mockReset();
    URL.createObjectURL = vi.fn(() => 'blob:custom-report');
    URL.revokeObjectURL = vi.fn();
  });

  it('loading: reserved builder status while the catalog loads', () => {
    catalogMock.mockReturnValue(new Promise(() => undefined));
    renderPage();
    expect(screen.getByRole('status')).toHaveTextContent('Loading the report builder…');
    expect(screen.getByRole('heading', { name: 'Build a report' })).toBeInTheDocument();
  });

  it('empty: no rows for this pick', async () => {
    catalogMock.mockResolvedValue(catalog);
    previewMock.mockResolvedValue({ ...preview, items: [], rowCount: 0 });
    renderPage();
    expect(
      await screen.findByText(
        'No rows for this pick. Change the dates or columns and show rows again.',
      ),
    ).toBeInTheDocument();
    expect(ROUTES.CUSTOM_REPORTS).toBe('/custom-reports');
  });

  it('validation: period cannot end before it starts', async () => {
    const user = userEvent.setup();
    catalogMock.mockResolvedValue(catalog);
    previewMock.mockResolvedValue(preview);
    renderPage();
    await screen.findByRole('table', { name: 'Till bills' });
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-09-10' } });
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-09-01' } });
    await user.click(screen.getByRole('button', { name: 'Show rows' }));
    expect(screen.getByRole('status')).toHaveTextContent(
      'Choose a period that starts on or before the end date.',
    );
    expect(downloadMock).not.toHaveBeenCalled();
  });

  it('denied: till staff without reporting cannot build a report', () => {
    renderPage('pharmacy_staff', ['SALES']);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Till staff cannot build a report. Ask the owner for Accounts access.',
    );
    expect(catalogMock).not.toHaveBeenCalled();
  });

  it('denied: Growth plan is required and does not leak rows', async () => {
    catalogMock.mockRejectedValue(
      new ApiError('Growth or Pro is required to build an ad-hoc report.', 422, 'PLAN_LIMIT'),
    );
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Build a report is on Growth. Open the plan to turn it on.',
    );
    expect(screen.getByRole('link', { name: 'Open the plan' })).toHaveAttribute(
      'href',
      ROUTES.SUBSCRIPTION,
    );
    expect(screen.queryByText('Top Pack')).not.toBeInTheDocument();
  });

  it('conflict: another till changed this report', async () => {
    catalogMock.mockResolvedValue(catalog);
    previewMock.mockRejectedValue(new ApiError('Stale', 409, 'STALE_STATE'));
    renderPage();
    expect(
      await screen.findByText('This report changed on another till. Reload, then show rows again.'),
    ).toBeInTheDocument();
  });

  it('failure: connection copy when the catalog cannot load', async () => {
    catalogMock.mockRejectedValue(new ApiError('Could not reach the server', 0, 'NETWORK'));
    renderPage();
    expect(
      await screen.findByText('Could not build this report. Check the connection and try again.'),
    ).toBeInTheDocument();
  });

  it('success: preview till bills, no schedule, restores print focus', async () => {
    const user = userEvent.setup();
    catalogMock.mockResolvedValue(catalog);
    previewMock.mockResolvedValue(preview);
    downloadMock.mockResolvedValue(new Blob(['%PDF'], { type: 'application/pdf' }));
    renderPage();
    const table = await screen.findByRole('table', { name: 'Till bills' });
    expect(table).toHaveTextContent('INV-1');
    expect(table).toHaveTextContent('Top Pack');
    expect(screen.queryByText(/schedule/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/every night/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Print this report' }));
    await waitFor(() => expect(downloadMock).toHaveBeenCalled());
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Print file saved for this report.',
    );
    expect(screen.getByRole('button', { name: 'Print this report' })).toHaveFocus();
  });

  it('success: owner on all outlets sends tenant scope', async () => {
    catalogMock.mockResolvedValue(catalog);
    previewMock.mockResolvedValue(preview);
    renderPage('pharmacy_owner', ['REPORTING'], null);
    await screen.findByRole('table', { name: 'Till bills' });
    expect(previewMock).toHaveBeenCalledWith(expect.objectContaining({ scope: 'tenant' }));
    expect(screen.getByRole('option', { name: 'All outlets' })).toBeInTheDocument();
  });

  it('validation: unknown field copy from the server', async () => {
    catalogMock.mockResolvedValue(catalog);
    previewMock.mockRejectedValue(
      new ApiError('That column is not on this report.', 422, 'UNKNOWN_FIELD'),
    );
    renderPage();
    expect(
      await screen.findByText('That column is not on this report. Pick from the list.'),
    ).toBeInTheDocument();
  });
});
