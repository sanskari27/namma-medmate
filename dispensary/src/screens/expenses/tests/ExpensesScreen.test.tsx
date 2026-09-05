import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ExpensesScreen from '@/screens/expenses/ExpensesScreen';
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
    createExpenseCategory: vi.fn(),
    attachExpenseEvidence: vi.fn(),
    ApiError: axios.ApiError,
    isApiError: axios.isApiError,
  };
});

import {
  createExpense,
  createExpenseCategory,
  listExpenseCategories,
  listExpenseTotals,
  listExpenses,
  updateExpense,
} from '@/services/expenses';

const listMock = vi.mocked(listExpenses);
const catsMock = vi.mocked(listExpenseCategories);
const totalsMock = vi.mocked(listExpenseTotals);
const createMock = vi.mocked(createExpense);
const updateMock = vi.mocked(updateExpense);
const categoryCreateMock = vi.mocked(createExpenseCategory);

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
  categoryId: 'cat-rent',
  categoryCode: 'RENT',
  categoryLabel: 'Rent',
  amountPaise: 150000,
  occurredOn: '2026-09-01',
  notes: 'September rent',
  currentEvidenceId: null,
  version: 1,
  status: 'POSTED',
  createdAt: '2026-09-06T00:00:00Z',
  updatedAt: '2026-09-06T00:00:00Z',
  evidence: [],
};

const emptyTotals: ExpenseTotals = { totalPaise: 0, byCategory: [], byBranch: [] };
const rentTotals: ExpenseTotals = {
  totalPaise: 150000,
  byCategory: [{ categoryId: 'cat-rent', code: 'RENT', label: 'Rent', totalPaise: 150000 }],
  byBranch: [{ branchId: 'b1', branchName: 'Main', totalPaise: 150000 }],
};

function renderPage(role = 'pharmacy_owner', modules: string[] = ['FINANCE']) {
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

describe('shop spend', () => {
  beforeEach(() => {
    listMock.mockReset();
    catsMock.mockReset();
    totalsMock.mockReset();
    createMock.mockReset();
    updateMock.mockReset();
    categoryCreateMock.mockReset();
    catsMock.mockResolvedValue([rent]);
    totalsMock.mockResolvedValue(emptyTotals);
  });

  it('loading: waits for shop spend', () => {
    listMock.mockReturnValue(new Promise(() => undefined));
    renderPage();
    expect(screen.getByText('Loading shop spend for this outlet…')).toBeInTheDocument();
  });

  it('empty: no spend on the books', async () => {
    listMock.mockResolvedValue([]);
    renderPage();
    expect(
      await screen.findByText(
        'No spend on the books. Record rent, power, salaries, or miscellaneous.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Shop spend' })).toBeInTheDocument();
  });

  it('denied: till staff cannot open shop books', () => {
    renderPage('pharmacy_staff', ['SALES']);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Till staff cannot open shop books. Ask the owner for Accounts access.',
    );
    expect(listMock).not.toHaveBeenCalled();
  });

  it('validation: category amount and date before save', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([]);
    renderPage();
    await screen.findByRole('heading', { name: 'Shop spend' });
    await user.click(screen.getByRole('button', { name: 'Record spend' }));
    await user.click(screen.getByRole('button', { name: 'Save this spend' }));
    expect(screen.getByRole('status')).toHaveTextContent(
      'Category, amount, and the date it occurred are needed before saving.',
    );
    expect(createMock).not.toHaveBeenCalled();
  });

  it('conflict: spend updated on another till', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([]);
    createMock.mockRejectedValue(new ApiError('stale', 409, 'STALE_STATE'));
    renderPage();
    await screen.findByRole('heading', { name: 'Shop spend' });
    await user.click(screen.getByRole('button', { name: 'Record spend' }));
    fireEvent.change(screen.getByLabelText('Spend category'), { target: { value: 'cat-rent' } });
    fireEvent.change(screen.getByLabelText('Amount (₹)'), { target: { value: '1500' } });
    fireEvent.change(screen.getByLabelText('Occurred on'), { target: { value: '2026-09-01' } });
    await user.click(screen.getByRole('button', { name: 'Save this spend' }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'This spend was updated on another till. Reload, then save again.',
    );
  });

  it('failure: list network error', async () => {
    listMock.mockRejectedValue(new Error('network'));
    renderPage();
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Could not load shop spend. Check the connection and try again.',
    );
  });

  it('success: record rent and restore focus', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValueOnce([]).mockResolvedValue([sample]);
    totalsMock.mockResolvedValueOnce(emptyTotals).mockResolvedValue(rentTotals);
    createMock.mockResolvedValue(sample);
    renderPage();
    await screen.findByRole('heading', { name: 'Shop spend' });
    await user.click(screen.getByRole('button', { name: 'Record spend' }));
    fireEvent.change(screen.getByLabelText('Spend category'), { target: { value: 'cat-rent' } });
    fireEvent.change(screen.getByLabelText('Amount (₹)'), { target: { value: '1500' } });
    fireEvent.change(screen.getByLabelText('Occurred on'), { target: { value: '2026-09-01' } });
    await user.click(screen.getByRole('button', { name: 'Save this spend' }));
    await waitFor(() => expect(createMock).toHaveBeenCalled());
    expect(await screen.findByRole('status')).toHaveTextContent('Spend recorded for this outlet.');
    expect(screen.getByText(/Main/)).toBeInTheDocument();
    expect(screen.getByText(/This outlet:/)).toHaveTextContent('₹1,500.00');
    expect(screen.getByRole('button', { name: 'Record spend' })).toHaveFocus();
  });

  it('adds a custom category from the form', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([]);
    categoryCreateMock.mockResolvedValue({
      id: 'cat-water',
      tenantId: 't1',
      code: 'WATER_BILL',
      label: 'Water bill',
      system: false,
    });
    catsMock.mockResolvedValueOnce([rent]).mockResolvedValue([
      rent,
      {
        id: 'cat-water',
        tenantId: 't1',
        code: 'WATER_BILL',
        label: 'Water bill',
        system: false,
      },
    ]);
    renderPage();
    await screen.findByRole('heading', { name: 'Shop spend' });
    await user.click(screen.getByRole('button', { name: 'Record spend' }));
    fireEvent.change(screen.getByLabelText('Code'), { target: { value: 'water_bill' } });
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Water bill' } });
    await user.click(screen.getByRole('button', { name: 'Add a category' }));
    await waitFor(() => expect(categoryCreateMock).toHaveBeenCalled());
    expect(await screen.findByRole('status')).toHaveTextContent('Category added to the shop books.');
  });

  it('owner all outlets consolidates tenant totals', async () => {
    const user = userEvent.setup();
    const tenantTotals: ExpenseTotals = {
      totalPaise: 280000,
      byCategory: [{ categoryId: 'cat-rent', code: 'RENT', label: 'Rent', totalPaise: 280000 }],
      byBranch: [
        { branchId: 'b1', branchName: 'Main', totalPaise: 150000 },
        { branchId: 'b2', branchName: 'Annex', totalPaise: 130000 },
      ],
    };
    listMock.mockResolvedValue([sample]);
    totalsMock.mockResolvedValueOnce(rentTotals).mockResolvedValue(tenantTotals);
    renderPage();
    expect(await screen.findByText(/This outlet:/)).toHaveTextContent('₹1,500.00');
    await user.selectOptions(screen.getByLabelText('Outlet'), 'tenant');
    await waitFor(() =>
      expect(listMock).toHaveBeenCalledWith(expect.objectContaining({ scope: 'tenant' })),
    );
    expect(totalsMock).toHaveBeenCalledWith(expect.objectContaining({ scope: 'tenant' }));
    expect(await screen.findByText(/All outlets:/)).toHaveTextContent('₹2,800.00');
  });

  it('waiting: spend posts as you record it', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([]);
    renderPage();
    await screen.findByRole('heading', { name: 'Shop spend' });
    await user.selectOptions(screen.getByLabelText('Spend state'), 'PENDING');
    expect(
      await screen.findByText('Spend posts as you record it — nothing waits on sign-off.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /send for approval/i })).not.toBeInTheDocument();
    await waitFor(() =>
      expect(listMock).toHaveBeenCalledWith(expect.objectContaining({ status: 'PENDING' })),
    );
  });

  it('turned down: phase 1 does not reject spend', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([]);
    renderPage();
    await screen.findByRole('heading', { name: 'Shop spend' });
    await user.selectOptions(screen.getByLabelText('Spend state'), 'REJECTED');
    expect(await screen.findByText('Phase 1 does not reject spend.')).toBeInTheDocument();
    await waitFor(() =>
      expect(listMock).toHaveBeenCalledWith(expect.objectContaining({ status: 'REJECTED' })),
    );
  });

  it('posted badge on the books', async () => {
    listMock.mockResolvedValue([sample]);
    totalsMock.mockResolvedValue(rentTotals);
    renderPage();
    expect(await screen.findByRole('button', { name: /On the books/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Rent/ })).toBeInTheDocument();
  });

  it('success: correct posted spend and restore focus', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([sample]);
    totalsMock.mockResolvedValue(rentTotals);
    updateMock.mockResolvedValue({ ...sample, amountPaise: 160000, version: 2 });
    renderPage();
    await screen.findByRole('button', { name: /On the books/ });
    await user.click(screen.getByRole('button', { name: /Rent/ }));
    fireEvent.change(screen.getByLabelText('Amount (₹)'), { target: { value: '1600' } });
    await user.click(screen.getByRole('button', { name: 'Correct this spend' }));
    await waitFor(() => expect(updateMock).toHaveBeenCalled());
    expect(await screen.findByRole('status')).toHaveTextContent('Spend is still on the books.');
    expect(screen.getByRole('button', { name: 'Record spend' })).toHaveFocus();
  });
});
