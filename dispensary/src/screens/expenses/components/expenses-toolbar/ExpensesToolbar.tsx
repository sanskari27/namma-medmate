import { BarChart3, ChevronDown, Plus, Search } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '@/store';
import { EXPENSES_CONTENT } from '../../ExpensesScreen.content';
import { PERIOD_OPTIONS, type PeriodKey } from '../../ExpensesScreen.utils';
import {
  categoryFilterChanged,
  openCreateExpense,
  periodChanged,
  reportModeChanged,
  reportsMenuToggled,
  scopeChanged,
  searchChanged,
  selectExpensesCategories,
  selectExpensesFilterCategoryId,
  selectExpensesPeriod,
  selectExpensesReportMode,
  selectExpensesReportsOpen,
  selectExpensesScope,
  selectExpensesSearch,
} from '../../store';

export function ExpensesToolbar({ owner }: { owner: boolean }) {
  const dispatch = useDispatch<AppDispatch>();
  const period = useSelector(selectExpensesPeriod);
  const categoryId = useSelector(selectExpensesFilterCategoryId);
  const search = useSelector(selectExpensesSearch);
  const categories = useSelector(selectExpensesCategories);
  const reportsOpen = useSelector(selectExpensesReportsOpen);
  const reportMode = useSelector(selectExpensesReportMode);
  const scope = useSelector(selectExpensesScope);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const hasBranch = Boolean(useSelector((s: RootState) => s.auth.user?.activeBranchId));

  useEffect(() => {
    if (!reportsOpen) {
      return;
    }
    function onDoc(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        dispatch(reportsMenuToggled(false));
      }
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [dispatch, reportsOpen]);

  return (
    <div className="ex-toolbar">
      {reportMode === 'category' ? (
        <button
          type="button"
          className="ex-btn ex-btn-ghost"
          onClick={() => dispatch(reportModeChanged('transactions'))}
        >
          {EXPENSES_CONTENT.allReports}
        </button>
      ) : null}

      <select
        className="ex-select"
        aria-label="Period"
        value={period}
        onChange={(event) => dispatch(periodChanged(event.target.value as PeriodKey))}
      >
        {PERIOD_OPTIONS.map((row) => (
          <option key={row.key} value={row.key}>
            {row.label}
          </option>
        ))}
      </select>

      {reportMode === 'transactions' ? (
        <>
          <select
            className="ex-select"
            aria-label={EXPENSES_CONTENT.allCategories}
            value={categoryId}
            onChange={(event) => dispatch(categoryFilterChanged(event.target.value))}
          >
            <option value="">{EXPENSES_CONTENT.allCategories}</option>
            {categories.map((row) => (
              <option key={row.id} value={row.id}>
                {row.label}
              </option>
            ))}
          </select>

          <label className="ex-search-wrap">
            <Search size={15} aria-hidden />
            <input
              className="ex-search"
              type="search"
              value={search}
              placeholder={EXPENSES_CONTENT.searchPlaceholder}
              aria-label={EXPENSES_CONTENT.searchPlaceholder}
              onChange={(event) => dispatch(searchChanged(event.target.value))}
            />
          </label>
        </>
      ) : null}

      {owner && hasBranch ? (
        <select
          className="ex-select"
          aria-label="Outlet scope"
          value={scope}
          onChange={(event) =>
            dispatch(scopeChanged(event.target.value === 'tenant' ? 'tenant' : 'session'))
          }
        >
          <option value="session">This outlet</option>
          <option value="tenant">All outlets</option>
        </select>
      ) : null}

      <div className="ex-toolbar-spacer" />

      <div className="ex-menu" ref={menuRef}>
        <button
          type="button"
          className="ex-btn ex-btn-ghost"
          aria-expanded={reportsOpen}
          onClick={() => dispatch(reportsMenuToggled())}
        >
          <BarChart3 size={15} aria-hidden />
          {EXPENSES_CONTENT.reports}
          <ChevronDown size={14} aria-hidden />
        </button>
        {reportsOpen ? (
          <div className="ex-menu-panel" role="menu">
            <button
              type="button"
              role="menuitem"
              data-active={reportMode === 'transactions'}
              onClick={() => dispatch(reportModeChanged('transactions'))}
            >
              {EXPENSES_CONTENT.expenseTransactions}
            </button>
            <button
              type="button"
              role="menuitem"
              data-active={reportMode === 'category'}
              onClick={() => dispatch(reportModeChanged('category'))}
            >
              {EXPENSES_CONTENT.expenseCategory}
            </button>
          </div>
        ) : null}
      </div>

      {reportMode === 'transactions' ? (
        <button
          type="button"
          className="ex-btn ex-btn-primary"
          onClick={() => dispatch(openCreateExpense())}
        >
          <Plus size={16} aria-hidden />
          {EXPENSES_CONTENT.createExpense}
        </button>
      ) : null}
    </div>
  );
}
