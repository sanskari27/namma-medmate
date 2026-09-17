import { configureStore } from '@reduxjs/toolkit';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CaPackScreen from '@/screens/ca-pack/CaPackScreen';
import { caPackReducer } from '@/screens/ca-pack/store/caPack.slice';
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

vi.mock('@/services/branches', () => ({
  listBranches: vi.fn().mockResolvedValue([
    { id: 'br1', gstin: '29ABCDE1234F1Z5' },
  ]),
}));

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
        { key: 'revenue', label: 'Taxable revenue', amountPaise: 10000 },
        { key: 'profit', label: 'Profit', amountPaise: 3000 },
      ],
      columns: ['line', 'amountPaise'],
      items: [
        { line: 'Taxable revenue', amountPaise: '10000' },
        { line: 'Profit', amountPaise: '3000' },
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
      key: 'GSTR3B',
      title: 'GSTR-3B',
      totals: [{ key: 'itc', label: 'ITC', amountPaise: 0 }],
      columns: ['line'],
      items: [{ line: 'nil' }],
    },
  ],
};

const omittedGst: CaPack = {
  ...filled,
  sections: filled.sections.filter((section) => section.key !== 'GSTR1' && section.key !== 'GSTR3B'),
};

function renderPage(role = 'pharmacy_owner', desks: string[] = []) {
  const store = configureStore({
    reducer: { auth: authReducer, caPack: caPackReducer },
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
          modules: ['FINANCE'],
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

describe('CaPackScreen', () => {
  beforeEach(() => {
    getMock.mockReset();
    downloadMock.mockReset();
    URL.createObjectURL = vi.fn(() => 'blob:ca-pack');
    URL.revokeObjectURL = vi.fn();
    localStorage.clear();
  });

  it('loading: waits for the CA pack', () => {
    getMock.mockReturnValue(new Promise(() => undefined));
    renderPage();
    expect(screen.getByText('Loading the CA pack…')).toBeInTheDocument();
  });

  it('denied: till staff without Accountant desk cannot open the pack', async () => {
    renderPage('pharmacy_staff');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Till staff cannot open the CA pack. Ask the owner for the Accountant desk.',
    );
    expect(getMock).not.toHaveBeenCalled();
  });

  it('failure: list network error', async () => {
    getMock.mockRejectedValue(new Error('network'));
    renderPage();
    expect(await screen.findByText('Could not load the CA pack. Check the connection and try again.')).toBeInTheDocument();
  });

  it('success: downloads a PDF pack and does not talk about filing', async () => {
    const user = userEvent.setup();
    getMock.mockResolvedValue(filled);
    downloadMock.mockResolvedValue(new Blob(['%PDF'], { type: 'application/pdf' }));
    renderPage();
    expect(await screen.findByRole('button', { name: /Download PDF pack/ })).toBeInTheDocument();
    expect(screen.getByText(/not a GSTR filing/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Download PDF pack/ }));
    await waitFor(() => expect(downloadMock).toHaveBeenCalled());
    expect(await screen.findByRole('status')).toHaveTextContent('CA pack saved. Hand this file to the CA.');
  });

  it('turns GST off when Growth sections are omitted', async () => {
    getMock.mockResolvedValue(omittedGst);
    renderPage();
    const gst = await screen.findByRole('switch', { name: 'GST summary' });
    expect(gst).toHaveAttribute('aria-checked', 'false');
    expect(gst).toBeDisabled();
  });

  it('conflict: download is stale on another till', async () => {
    const user = userEvent.setup();
    getMock.mockResolvedValue(filled);
    downloadMock.mockRejectedValue(new ApiError('stale', 409, 'STALE_STATE'));
    renderPage();
    await screen.findByRole('button', { name: /Download PDF pack/ });
    await user.click(screen.getByRole('button', { name: /Download PDF pack/ }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'This pack changed on another till. Reload, then download again.',
    );
  });
});
