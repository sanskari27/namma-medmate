import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '@/store';
import { ExpensesCategoryReport } from './components/expenses-category-report';
import { ExpensesFooter } from './components/expenses-footer';
import { ExpensesFormDialog } from './components/expenses-form-dialog';
import { ExpensesStatusBanner } from './components/expenses-status-banner';
import { ExpensesSummary } from './components/expenses-summary';
import { ExpensesTable } from './components/expenses-table';
import { ExpensesToolbar } from './components/expenses-toolbar';
import { EXPENSES_CONTENT } from './ExpensesScreen.content';
import { hasFinanceAccess } from './ExpensesScreen.utils';
import './ExpensesScreen.css';
import {
  accessDenied,
  hydrateOwnerScope,
  loadExpenses,
  selectExpensesFilterCategoryId,
  selectExpensesPeriod,
  selectExpensesReportMode,
  selectExpensesScope,
  selectExpensesSearch,
} from './store';

export default function ExpensesScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);
  const reportMode = useSelector(selectExpensesReportMode);
  const period = useSelector(selectExpensesPeriod);
  const filterCategoryId = useSelector(selectExpensesFilterCategoryId);
  const search = useSelector(selectExpensesSearch);
  const scope = useSelector(selectExpensesScope);
  const allowed = hasFinanceAccess(user?.role, user?.roles);
  const owner = user?.role === 'pharmacy_owner';

  useEffect(() => {
    if (!allowed) {
      dispatch(
        accessDenied(
          'Till staff cannot open shop books. Ask the owner for Accounts access.',
        ),
      );
      return;
    }
    dispatch(
      hydrateOwnerScope({
        owner,
        hasBranch: Boolean(user?.activeBranchId),
      }),
    );
  }, [allowed, dispatch, owner, user?.activeBranchId]);

  useEffect(() => {
    if (!allowed) {
      return;
    }
    const handle = window.setTimeout(() => {
      void dispatch(loadExpenses());
    }, search ? 250 : 0);
    return () => window.clearTimeout(handle);
  }, [allowed, dispatch, period, filterCategoryId, search, scope]);

  return (
    <div className="ex" aria-label={EXPENSES_CONTENT.regionLabel}>
      <ExpensesStatusBanner />

      {allowed ? (
        <>
          <ExpensesToolbar owner={owner} />
          {reportMode === 'transactions' ? <ExpensesSummary /> : null}
          {reportMode === 'category' ? <ExpensesCategoryReport /> : <ExpensesTable />}
          <ExpensesFooter />
          <ExpensesFormDialog />
        </>
      ) : null}
    </div>
  );
}
