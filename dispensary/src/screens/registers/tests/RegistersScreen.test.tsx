import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RegistersScreen from '@/screens/registers/RegistersScreen';
import { ROUTES } from '@/libs/constants/routes.const';
import { ApiError } from '@/services/axios';
import { authReducer } from '@/store';
import type {
  ComplianceReportCatalogItem,
  ComplianceReportTable,
} from '@/services/complianceReports';

vi.mock('@/services/complianceReports', async () => {
  const axios = await import('@/services/axios');
  return {
    listComplianceReports: vi.fn(),
    getComplianceReport: vi.fn(),
    downloadComplianceReport: vi.fn(),
    ApiError: axios.ApiError,
    isApiError: axios.isApiError,
  };
});

import {
  downloadComplianceReport,
  getComplianceReport,
  listComplianceReports,
} from '@/services/complianceReports';

const listMock = vi.mocked(listComplianceReports);
const tableMock = vi.mocked(getComplianceReport);
const exportMock = vi.mocked(downloadComplianceReport);

const catalog: ComplianceReportCatalogItem[] = [
  { key: 'H1_SALES', title: 'Schedule H1 Sale Register', filters: ['from', 'to', 'productId'] },
  { key: 'PURCHASE', title: 'Purchase Register', filters: ['from', 'to', 'supplierId'] },
  { key: 'LICENSE_EXPIRY', title: 'Drug License Renewal/Expiry Records', filters: [] },
  {
    key: 'TRACEABILITY',
    title: 'Batch Traceability Reports',
    filters: ['from', 'to', 'batchNumber'],
  },
];

const h1Table: ComplianceReportTable = {
  key: 'H1_SALES',
  title: 'Schedule H1 Sale Register',
  columns: ['dateIst', 'productName', 'patientName', 'prescriptionReference'],
  items: [
    {
      dateIst: '05 Sep 2026, 17:30',
      productName: 'Alprazolam',
      patientName: 'Ravi Patient',
      prescriptionReference: 'RX-H1-1',
    },
  ],
  generatedAt: '2026-09-05T12:00:00Z',
};

function renderPage(modules: string[] = ['COMPLIANCE', 'SALES']) {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        user: {
          userId: 'u1',
          displayName: 'Owner',
          role: 'pharmacy_owner',
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
        <RegistersScreen />
      </MemoryRouter>
    </Provider>,
  );
}

describe('Register book', () => {
  beforeEach(() => {
    listMock.mockReset();
    tableMock.mockReset();
    exportMock.mockReset();
    URL.createObjectURL = vi.fn(() => 'blob:register-book');
    URL.revokeObjectURL = vi.fn();
  });

  it('loading: waits for the register book', () => {
    listMock.mockReturnValue(new Promise(() => undefined));
    renderPage();
    expect(screen.getByText('Loading this outlet register book…')).toBeInTheDocument();
  });

  it('empty: no rows in this book yet', async () => {
    listMock.mockResolvedValue(catalog);
    tableMock.mockResolvedValue({ ...h1Table, items: [] });
    renderPage();
    expect(
      await screen.findByText(
        'No rows in this book for this outlet yet. Complete a sale, delivery, or stock count and it lands here.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Register book' })).toBeInTheDocument();
    expect(screen.getByText('Schedule H1 Sale Register')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Reports' })).not.toBeInTheDocument();
    expect(ROUTES.REPORTS).toBe('/reports');
    expect(ROUTES.REGISTERS).toBe('/registers');
  });

  it('denied: staff without Register book cannot open it', () => {
    renderPage(['SALES']);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Ask the owner to grant Register book on your floor role before opening these books.',
    );
    expect(listMock).not.toHaveBeenCalled();
  });

  it('validation: period cannot end before it starts', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue(catalog);
    tableMock.mockResolvedValue(h1Table);
    renderPage();
    await screen.findByRole('table', { name: 'Schedule H1 Sale Register' });
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-09-10' } });
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-09-01' } });
    await user.click(screen.getByRole('button', { name: 'Apply filters' }));
    expect(screen.getByRole('status')).toHaveTextContent(
      'Choose a period that starts on or before the end date.',
    );
    expect(exportMock).not.toHaveBeenCalled();
  });

  it('conflict: export is stale on another till', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue(catalog);
    tableMock.mockResolvedValue(h1Table);
    exportMock.mockRejectedValue(new ApiError('stale', 409, 'STALE_STATE'));
    renderPage();
    await screen.findByRole('table', { name: 'Schedule H1 Sale Register' });
    await user.click(screen.getByRole('button', { name: 'Take spreadsheet' }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'This book changed on another till. Reload, then take the sheet again.',
    );
  });

  it('failure: list network error', async () => {
    listMock.mockRejectedValue(new Error('network'));
    renderPage();
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Could not load the register book. Check the connection and try again.',
    );
  });

  it('success: lists H1 rows and restores focus after PDF', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue(catalog);
    tableMock.mockResolvedValue(h1Table);
    exportMock.mockResolvedValue(new Blob(['%PDF'], { type: 'application/pdf' }));
    renderPage();
    const book = await screen.findByRole('table', { name: 'Schedule H1 Sale Register' });
    expect(book).toHaveTextContent('Alprazolam');
    expect(book).toHaveTextContent('Ravi Patient');
    expect(screen.getByText('Schedule H1 Sale Register')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Take PDF' }));
    await waitFor(() => expect(exportMock).toHaveBeenCalled());
    expect(await screen.findByRole('status')).toHaveTextContent('PDF saved for this outlet.');
    expect(screen.getByRole('button', { name: 'Take PDF' })).toHaveFocus();
  });

  it('denied PLAN_LIMIT: near-expiry stays listed without row leak', async () => {
    const user = userEvent.setup();
    const gatedCatalog: ComplianceReportCatalogItem[] = [
      ...catalog,
      {
        key: 'NEAR_EXPIRY',
        title: 'Near-Expiry / Expiry Report',
        filters: ['from', 'to'],
        entitled: false,
        minPlan: 'STARTER',
        upgradeHint: 'Near-expiry is on Starter. Open the plan to turn it on.',
      },
    ];
    listMock.mockResolvedValue(gatedCatalog);
    tableMock.mockResolvedValue(h1Table);
    renderPage();
    const book = await screen.findByRole('table', { name: 'Schedule H1 Sale Register' });
    expect(book).toHaveTextContent('Alprazolam');
    expect(screen.getByText('On Starter')).toBeInTheDocument();
    expect(tableMock.mock.calls.every((call) => call[0] === 'H1_SALES')).toBe(true);
    await user.click(
      screen.getByRole('button', { name: 'Near-Expiry / Expiry Report, On Starter' }),
    );
    const upgrade = await screen.findByRole('region', { name: 'Plan required for this register' });
    expect(upgrade).toHaveTextContent('Near-expiry is on Starter');
    await waitFor(() =>
      expect(within(upgrade).getByRole('link', { name: 'Open the plan' })).toHaveFocus(),
    );
    expect(within(upgrade).getByRole('link', { name: 'Open the plan' })).toHaveAttribute(
      'href',
      ROUTES.SUBSCRIPTION,
    );
    expect(screen.queryByText('Alprazolam')).not.toBeInTheDocument();
    expect(tableMock).not.toHaveBeenCalledWith('NEAR_EXPIRY', expect.anything());
  });
});
