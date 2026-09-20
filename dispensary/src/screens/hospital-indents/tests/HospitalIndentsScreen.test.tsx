import { configureStore } from '@reduxjs/toolkit';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import HospitalIndentsScreen from '@/screens/hospital-indents/HospitalIndentsScreen';
import { ApiError } from '@/services/axios';
import { authReducer } from '@/store';
import type { HospitalIndent, HospitalIndentList, HospitalWardOccupancy } from '@/services/hospital';

vi.mock('@/services/hospital', () => ({
  getHospitalIndents: vi.fn(),
  getHospitalWards: vi.fn(),
  createHospitalIndent: vi.fn(),
  approveHospitalIndent: vi.fn(),
  rejectHospitalIndent: vi.fn(),
  isApiError: (error: unknown) => error instanceof ApiError,
}));

vi.mock('@/services/products', () => ({
  listProducts: vi.fn(),
}));

import {
  approveHospitalIndent,
  createHospitalIndent,
  getHospitalIndents,
  getHospitalWards,
  rejectHospitalIndent,
} from '@/services/hospital';
import { listProducts } from '@/services/products';

const listMock = vi.mocked(getHospitalIndents);
const wardsMock = vi.mocked(getHospitalWards);
const createMock = vi.mocked(createHospitalIndent);
const approveMock = vi.mocked(approveHospitalIndent);
const rejectMock = vi.mocked(rejectHospitalIndent);
const productsMock = vi.mocked(listProducts);

const pendingIndent: HospitalIndent = {
  id: 'i1',
  indentNumber: 'IND-00001',
  wardId: 'w1',
  wardName: 'General A',
  bedId: 'b1',
  bedLabel: 'GA-1',
  patientName: 'Ravi Kumar',
  note: null,
  requestedBy: 'Sister Meena',
  requestedAt: '2026-09-20T10:00:00Z',
  status: 'PENDING',
  hospitalInvoiceRef: null,
  issuedAt: null,
  version: 0,
  lines: [
    {
      id: 'l1',
      productId: 'p1',
      productName: 'Paracetamol 500',
      sku: 'PARA-1',
      requestedQty: 10,
      issuedQty: 0,
    },
  ],
};

const approvedIndent: HospitalIndent = {
  ...pendingIndent,
  id: 'i2',
  indentNumber: 'IND-00002',
  status: 'APPROVED',
};

const board: HospitalIndentList = {
  pendingCount: 1,
  approvedCount: 1,
  issuedTodayCount: 0,
  totalCount: 2,
  items: [pendingIndent, approvedIndent],
};

const wards: HospitalWardOccupancy = {
  wardCount: 1,
  totalBeds: 1,
  occupiedBeds: 0,
  freeBeds: 1,
  occupancyPercent: 0,
  admittedCount: 0,
  wards: [
    {
      id: 'w1',
      name: 'General A',
      code: 'GA',
      floor: '2',
      category: 'GENERAL',
      capacity: 1,
      nurseInCharge: null,
      version: 1,
      beds: [{ id: 'b1', sequenceNo: 1, label: 'GA-1', occupancyStatus: 'FREE', version: 0 }],
    },
  ],
};

function renderPage(modules: string[] = ['HOSPITAL']) {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        user: {
          userId: 'u1',
          displayName: 'Varshmaan',
          role: 'pharmacy_owner',
          tenantId: 't1',
          modules,
          pinSet: true,
          activeBranchId: 'b1',
        },
      },
    },
  });
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <HospitalIndentsScreen />
      </MemoryRouter>
    </Provider>,
  );
}

describe('HospitalIndentsScreen', () => {
  beforeEach(() => {
    listMock.mockReset();
    wardsMock.mockReset();
    createMock.mockReset();
    approveMock.mockReset();
    rejectMock.mockReset();
    productsMock.mockReset();
    productsMock.mockResolvedValue([
      {
        id: 'p1',
        sku: 'PARA-1',
        name: 'Paracetamol 500',
      } as never,
    ]);
    wardsMock.mockResolvedValue(wards);
  });

  it('loading: waits for indents', () => {
    listMock.mockReturnValue(new Promise(() => undefined));
    renderPage();
    expect(screen.getByRole('status')).toHaveTextContent('Loading ward indents');
  });

  it('empty: prompts to record the first indent', async () => {
    listMock.mockResolvedValue({
      pendingCount: 0,
      approvedCount: 0,
      issuedTodayCount: 0,
      totalCount: 0,
      items: [],
    });
    renderPage();
    expect(await screen.findByRole('status')).toHaveTextContent('No ward indents on this outlet yet');
  });

  it('validation: ward, requester, and medicine lines are required', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue({
      pendingCount: 0,
      approvedCount: 0,
      issuedTodayCount: 0,
      totalCount: 0,
      items: [],
    });
    renderPage();
    await screen.findByRole('status');
    await user.click(screen.getByRole('button', { name: 'Record indent' }));
    await user.click(screen.getByRole('button', { name: 'Save indent' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Ward, requester, patient or note, and at least one medicine line are required',
    );
    expect(createMock).not.toHaveBeenCalled();
  });

  it('denied: staff cannot open ward indents', async () => {
    listMock.mockRejectedValue(new ApiError('Forbidden', 403, 'FORBIDDEN'));
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'You cannot manage ward indents at this counter',
    );
  });

  it('conflict: stale approve shows reload copy', async () => {
    listMock.mockResolvedValue(board);
    approveMock.mockRejectedValue(new ApiError('Conflict', 409, 'STALE_STATE'));
    renderPage();
    const list = await screen.findByLabelText('Indent board');
    await within(list).findByText('IND-00001');
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Approve' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Someone else updated this indent');
  });

  it('failure: cannot load indents', async () => {
    listMock.mockRejectedValue(new Error('network'));
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load ward indents. Try again.');
  });

  it('success: record indent and restore focus', async () => {
    listMock
      .mockResolvedValueOnce({
        pendingCount: 0,
        approvedCount: 0,
        issuedTodayCount: 0,
        totalCount: 0,
        items: [],
      })
      .mockResolvedValueOnce(board);
    createMock.mockResolvedValue(pendingIndent);
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('status');
    const recordButton = screen.getByRole('button', { name: 'Record indent' });
    await user.click(recordButton);
    await user.selectOptions(screen.getByLabelText('Ward'), 'w1');
    await user.type(screen.getByLabelText('Patient name'), 'Ravi Kumar');
    await user.type(screen.getByLabelText('Requested by'), 'Sister Meena');
    await user.selectOptions(screen.getByLabelText('Medicine'), 'p1');
    await user.type(screen.getByLabelText('Qty'), '10');
    await user.click(screen.getByRole('button', { name: 'Save indent' }));
    await waitFor(() => expect(createMock).toHaveBeenCalled());
    expect(await screen.findByRole('alert')).toHaveTextContent('Indent recorded.');
    await waitFor(() => expect(recordButton).toHaveFocus());
  });

  it('no_branch: asks to select an outlet first', async () => {
    const store = configureStore({
      reducer: { auth: authReducer },
      preloadedState: {
        auth: {
          user: {
            userId: 'u1',
            displayName: 'Varshmaan',
            role: 'pharmacy_owner',
            tenantId: 't1',
            modules: ['HOSPITAL'],
            pinSet: true,
            activeBranchId: null,
          },
        },
      },
    });
    render(
      <Provider store={store}>
        <MemoryRouter>
          <HospitalIndentsScreen />
        </MemoryRouter>
      </Provider>,
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Select an outlet before opening ward indents',
    );
    expect(listMock).not.toHaveBeenCalled();
  });

  it('plan_limit: shows upgrade link without hospital module', async () => {
    renderPage([]);
    expect(await screen.findByRole('alert')).toHaveTextContent('Ward indents are on the Pro plan');
    expect(screen.getByRole('link', { name: 'Open the plan' })).toHaveAttribute('href', '/subscription');
    expect(listMock).not.toHaveBeenCalled();
  });

  it('counts: pending, approved, issued today, and total render', async () => {
    listMock.mockResolvedValue(board);
    renderPage();
    const counts = await screen.findByLabelText('Indent counts');
    expect(within(counts).getByText('Pending').previousElementSibling).toHaveTextContent('1');
    expect(within(counts).getByText('Approved').previousElementSibling).toHaveTextContent('1');
    expect(within(counts).getByText('Issued today').previousElementSibling).toHaveTextContent('0');
    expect(within(counts).getByText('Total').previousElementSibling).toHaveTextContent('2');
  });

  it('approve pending indent', async () => {
    listMock.mockResolvedValueOnce(board).mockResolvedValue({
      ...board,
      pendingCount: 0,
      approvedCount: 2,
      items: [{ ...pendingIndent, status: 'APPROVED' }, approvedIndent],
    });
    approveMock.mockResolvedValue({ ...pendingIndent, status: 'APPROVED' });
    renderPage();
    await screen.findByLabelText('Indent board');
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(approveMock).toHaveBeenCalledWith('i1'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Indent approved.');
  });

  it('reject pending indent', async () => {
    listMock.mockResolvedValueOnce(board).mockResolvedValue({
      ...board,
      pendingCount: 0,
      items: [{ ...pendingIndent, status: 'REJECTED' }],
    });
    rejectMock.mockResolvedValue({ ...pendingIndent, status: 'REJECTED' });
    renderPage();
    await screen.findByLabelText('Indent board');
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Turn down' }));
    await waitFor(() => expect(rejectMock).toHaveBeenCalledWith('i1'));
  });

  it('approved indent shows zero issued qty, no invoice, and issue link', async () => {
    listMock.mockResolvedValue({
      ...board,
      pendingCount: 0,
      approvedCount: 1,
      totalCount: 1,
      items: [approvedIndent],
    });
    renderPage();
    const detail = await screen.findByLabelText('Indent detail');
    expect(within(detail).getByText('Issue & bill to hospital')).toHaveAttribute(
      'href',
      '/hospital-issues?indent=i2',
    );
    expect(within(detail).getByText(/Not issued yet/)).toBeInTheDocument();
    expect(within(detail).getByText('Issued')).toBeInTheDocument();
    expect(within(detail).getAllByText('0').length).toBeGreaterThan(0);
  });
});
