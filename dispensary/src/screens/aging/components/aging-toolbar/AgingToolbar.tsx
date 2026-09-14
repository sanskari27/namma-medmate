import { Download, FileSpreadsheet } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '@/store';
import { AGING_CONTENT } from '../../AgingScreen.content';
import {
  csvRows,
  downloadCsv,
  formatPaise,
  printReport,
  type AgingBook,
  type PeriodKind,
} from '../../AgingScreen.utils';
import {
  bookChanged,
  customAsOfChanged,
  monthChanged,
  periodKindChanged,
  scopeChanged,
  selectAgingActiveReport,
  selectAgingBook,
  selectAgingCustomAsOf,
  selectAgingMonth,
  selectAgingPeriodKind,
  selectAgingPlanGate,
  selectAgingScope,
} from '../../store';

export function AgingToolbar({ owner }: { owner: boolean }) {
  const dispatch = useDispatch<AppDispatch>();
  const book = useSelector(selectAgingBook);
  const kind = useSelector(selectAgingPeriodKind);
  const month = useSelector(selectAgingMonth);
  const customAsOf = useSelector(selectAgingCustomAsOf);
  const scope = useSelector(selectAgingScope);
  const planGate = useSelector(selectAgingPlanGate);
  const report = useSelector(selectAgingActiveReport);
  const hasBranch = Boolean(useSelector((state: RootState) => state.auth.user?.activeBranchId));

  function onExcel() {
    downloadCsv(
      book === 'payables' ? 'payable-ageing.csv' : 'receivable-ageing.csv',
      csvRows(report.items),
    );
  }

  function onPdf() {
    const title =
      book === 'payables' ? AGING_CONTENT.payablesTitle : AGING_CONTENT.receivablesTitle;
    const body = report.items
      .map(
        (row) =>
          `<tr><td>${row.name}</td><td>${formatPaise(row.amountPaise)}</td><td>${row.days}</td></tr>`,
      )
      .join('');
    printReport(
      title,
      `<table><thead><tr><th>Party</th><th>Outstanding</th><th>Age</th></tr></thead><tbody>${body}</tbody></table>`,
    );
  }

  return (
    <div className="ag-toolbar">
      <button
        type="button"
        className="ag-btn ag-btn-ghost"
        data-active={book === 'receivables'}
        onClick={() => dispatch(bookChanged('receivables'))}
      >
        {AGING_CONTENT.receivables}
      </button>
      <button
        type="button"
        className="ag-btn ag-btn-ghost"
        data-active={book === 'payables'}
        onClick={() => dispatch(bookChanged('payables'))}
      >
        {AGING_CONTENT.payables}
      </button>

      <div className="ag-toolbar-spacer" />

      <select
        className="ag-select"
        aria-label="Period"
        value={kind}
        onChange={(event) => dispatch(periodKindChanged(event.target.value as PeriodKind))}
      >
        <option value="today">{AGING_CONTENT.periodToday}</option>
        <option value="month">{AGING_CONTENT.periodMonth}</option>
        <option value="custom">{AGING_CONTENT.periodCustom}</option>
      </select>

      {kind === 'month' ? (
        <input
          className="ag-field"
          type="month"
          aria-label="Month"
          value={month}
          onChange={(event) => dispatch(monthChanged(event.target.value))}
        />
      ) : null}
      {kind === 'custom' ? (
        <input
          className="ag-field"
          type="date"
          aria-label="As of"
          value={customAsOf}
          onChange={(event) => dispatch(customAsOfChanged(event.target.value))}
        />
      ) : null}

      {owner && hasBranch ? (
        <select
          className="ag-select"
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

      <button type="button" className="ag-btn ag-btn-ghost" disabled={planGate} onClick={onExcel}>
        <FileSpreadsheet size={15} aria-hidden />
        {AGING_CONTENT.excel}
      </button>
      <button type="button" className="ag-btn ag-btn-ghost" disabled={planGate} onClick={onPdf}>
        <Download size={15} aria-hidden />
        {AGING_CONTENT.pdf}
      </button>
    </div>
  );
}

export type { AgingBook };
