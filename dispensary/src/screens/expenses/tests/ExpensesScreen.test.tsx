import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ExpensesScreen from '@/screens/expenses/ExpensesScreen';
import { expensesReducer } from '@/screens/expenses/store/expenses.slice';
import { ApiError } from '@/services/axios';
import { authReducer } from '@/store';
import type { ExpenseCategory, ExpenseTotals, ShopExpense } from '@/services/expenses';

vi.mock('@/services/expenses', async () => {
  const axios = await import('@/services/axios');
  return {
    listExpenseCategories: vi.fn(),
    listExpenses: vi.fn(),
    listExpenseTotals: vi.fn(),
    createExpense: vi.fn(),
    updateExpense: vi.fn(),
    deleteExpense: vi.fn(),
    createExpenseCategory: vi.fn(),
    attachExpenseEvidence: vi.fn(),
    expenseEvidenceUrl: () => 'http://localhost/evidence',
    ApiError: axios.ApiError,
    isApiError: axios.isApiError,
  };
});

import {
  attachExpenseEvidence,
  createExpense,
  deleteExpense,
  listExpenseCategories,
  listExpenseTotals,
  listExpenses,
} from '@/services/expenses';

const listMock = vi.mocked(listExpenses);
const catsMock = vi.mocked(listExpenseCategories);
const totalsMock = vi.mocked(listExpenseTotals);
const createMock = vi.mocked(createExpense);
const deleteMock = vi.mocked(deleteExpense);
const attachMock = vi.mocked(attachExpenseEvidence);

const rent: ExpenseCategory = {
  id: 'cat-rent',
  tenantId: null,
  code: 'RENT',
  label: 'Rent',
  system: true,
};

const sample: ShopExpense = {
  id: 'exp-1',
  tenantId: 't1',
  branchId: 'b1',
  branchName: 'Main',
  expenseNo: 'EXP/001',
  categoryId: 'cat-rent',
  categoryCode: 'RENT',
  categoryLabel: 'Rent',
  partyName: 'Landlord',
  paymentMode: 'CASH',
  amountPaise: 150000,
  gstPercent: 0,
  gstPaise: 0,
  occurredOn: '2026-09-01',
  notes: 'September rent',
  status: 'POSTED',
  currentEvidenceId: null,
  version: 1,
  createdAt: '2026-09-06T00:00:00Z',
  updatedAt: '2026-09-06T00:00:00Z',
  evidence: [],
};

const emptyTotals: ExpenseTotals = {
  totalPaise: 0,
  gstPaise: 0,
  count: 0,
  byCategory: [],
  byBranch: [],
};
const rentTotals: ExpenseTotals = {
  totalPaise: 150000,
  gstPaise: 0,
  count: 1,
  byCategory: [
    {
      categoryId: 'cat-rent',
      code: 'RENT',
      label: 'Rent',
      entries: 1,
      totalPaise: 150000,
      gstPaise: 0,
      taxablePaise: 150000,
    },
  ],
  byBranch: [{ branchId: 'b1', branchName: 'Main', totalPaise: 150000 }],
};

function renderPage(
  role = 'pharmacy_owner',
  extras: { activeBranchId?: string | null; branches?: { id: string; name: string; branchCode: string; status: string }[] } = {},
) {
  const store = configureStore({
    reducer: { auth: authReducer, expenses: expensesReducer },
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
          activeBranchId: extras.activeBranchId === undefined ? 'b1' : extras.activeBranchId,
          branches: extras.branches ?? [
            { id: 'b1', name: 'Main', branchCode: 'BR01', status: 'ACTIVE' },
            { id: 'b2', name: 'Annex', branchCode: 'BR02', status: 'ACTIVE' },
          ],
        },
      },
    },
  });
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <ExpensesScreen />
      </MemoryRouter>
    </Provider>,
  );
}

describe('ExpensesScreen', () => {
  beforeEach(() => {
    listMock.mockReset();
    catsMock.mockReset();
    totalsMock.mockReset();
    createMock.mockReset();
    deleteMock.mockReset();
    attachMock.mockReset();
    catsMock.mockResolvedValue([rent]);
    totalsMock.mockResolvedValue(emptyTotals);
    vi.stubGlobal('confirm', vi.fn(() => true));
  });

  it('loading: waits for expenses', () => {
    listMock.mockReturnValue(new Promise(() => undefined));
    renderPage();
    expect(screen.getByText('Loading expenses…')).toBeInTheDocument();
  });

  it('empty: no expenses in this period', async () => {
    listMock.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText('No expenses in this period. Create the first one.')).toBeInTheDocument();
    expect(screen.getByText('GST in spend (inclusive)')).toBeInTheDocument();
  });

  it('denied: till staff cannot open shop books', async () => {
    renderPage('pharmacy_staff');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Till staff cannot open shop books. Ask the owner for Accounts access.',
    );
    expect(listMock).not.toHaveBeenCalled();
  });

  it('validation: amount is required before save', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([]);
    renderPage();
    await screen.findByRole('button', { name: 'Create Expense' });
    await user.click(screen.getByRole('button', { name: 'Create Expense' }));
    fireEvent.change(screen.getByLabelText('Amount ₹ (incl. GST)'), { target: { value: 'abc' } });
    await user.click(screen.getByRole('button', { name: 'Save expense' }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Category, amount, and date are required before saving.',
    );
    expect(createMock).not.toHaveBeenCalled();
  });

  it('conflict: spend updated on another till', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([]);
    createMock.mockRejectedValue(new ApiError('stale', 409, 'STALE_STATE'));
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Create Expense' }));
    fireEvent.change(screen.getByLabelText('Amount ₹ (incl. GST)'), { target: { value: '1500' } });
    await user.click(screen.getByRole('button', { name: 'Save expense' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This expense was updated on another till. Reload, then save again.',
    );
  });

  it('failure: list network error', async () => {
    listMock.mockRejectedValue(new Error('network'));
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not load expenses. Check the connection and try again.',
    );
  });

  it('success: posts spend to the active outlet and keeps evidence', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValueOnce([]).mockResolvedValue([sample]);
    totalsMock.mockResolvedValueOnce(emptyTotals).mockResolvedValue(rentTotals);
    createMock.mockResolvedValue(sample);
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Create Expense' }));
    expect(screen.getByText('No receipt attached yet.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Amount ₹ (incl. GST)'), { target: { value: '1500' } });
    await user.click(screen.getByRole('button', { name: 'Save expense' }));
    await waitFor(() => expect(createMock).toHaveBeenCalled());
    expect(createMock.mock.calls[0][0]).toMatchObject({ branchId: 'b1', amountPaise: 150000 });
    expect(await screen.findByText('EXP/001')).toBeInTheDocument();
  });

  it('confirm before deleting posted spend', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([sample]);
    totalsMock.mockResolvedValue(rentTotals);
    deleteMock.mockResolvedValue(undefined);
    renderPage();
    await screen.findByText('EXP/001');
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() => expect(deleteMock).toHaveBeenCalledWith('exp-1'));
  });

  it('all-outlets never guesses the branch', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([]);
    renderPage('pharmacy_owner', { activeBranchId: null });
    await user.click(await screen.findByRole('button', { name: 'Create Expense' }));
    expect(screen.getByLabelText('Outlet')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Amount ₹ (incl. GST)'), { target: { value: '1500' } });
    await user.click(screen.getByRole('button', { name: 'Save expense' }));
    expect(createMock).not.toHaveBeenCalled();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Pick an outlet before posting spend. All-outlets never guesses the branch.',
    );
  });
});
