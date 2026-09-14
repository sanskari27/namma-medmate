import { Download, FileSpreadsheet } from 'lucide-react';
import { useSelector } from 'react-redux';
import { EXPENSES_CONTENT } from '../../ExpensesScreen.content';
import {
  downloadCsv,
  formatExpenseWhen,
  formatPaise,
  paymentLabel,
  printExpenseReport,
} from '../../ExpensesScreen.utils';
import {
  selectExpensesItems,
  selectExpensesReportMode,
  selectExpensesTotals,
} from '../../store';

export function ExpensesFooter() {
  const items = useSelector(selectExpensesItems);
  const totals = useSelector(selectExpensesTotals);
  const mode = useSelector(selectExpensesReportMode);
  const count = mode === 'transactions' ? items.length : (totals?.byCategory.length ?? 0);

  function onExcel() {
    if (mode === 'category') {
      const rows = [
        ['Category', 'Entries', 'Taxable', 'GST', 'Amount'],
        ...(totals?.byCategory ?? []).map((row) => [
          row.label,
          String(row.entries),
          formatPaise(row.taxablePaise),
          formatPaise(row.gstPaise),
          formatPaise(row.totalPaise),
        ]),
      ];
      downloadCsv('expense-categories.csv', rows);
      return;
    }
    const rows = [
      ['Date', 'Expense No.', 'Party', 'Category', 'Payment', 'Amount'],
      ...items.map((row) => [
        formatExpenseWhen(row.occurredOn, row.createdAt),
        row.expenseNo,
        row.partyName ?? '',
        row.categoryLabel,
        paymentLabel(row.paymentMode),
        formatPaise(row.amountPaise),
      ]),
    ];
    downloadCsv('expenses.csv', rows);
  }

  function onPdf() {
    if (mode === 'category') {
      const body = (totals?.byCategory ?? [])
        .map(
          (row) =>
            `<tr><td>${row.label}</td><td>${row.entries}</td><td>${formatPaise(row.taxablePaise)}</td><td>${formatPaise(row.gstPaise)}</td><td>${formatPaise(row.totalPaise)}</td></tr>`,
        )
        .join('');
      printExpenseReport(
        EXPENSES_CONTENT.categoryReportTitle,
        `<table><thead><tr><th>Category</th><th>Entries</th><th>Taxable</th><th>GST</th><th>Amount</th></tr></thead><tbody>${body}</tbody></table>`,
      );
      return;
    }
    const body = items
      .map(
        (row) =>
          `<tr><td>${formatExpenseWhen(row.occurredOn, row.createdAt)}</td><td>${row.expenseNo}</td><td>${row.partyName ?? ''}</td><td>${row.categoryLabel}</td><td>${paymentLabel(row.paymentMode)}</td><td>${formatPaise(row.amountPaise)}</td></tr>`,
      )
      .join('');
    printExpenseReport(
      EXPENSES_CONTENT.title,
      `<table><thead><tr><th>Date</th><th>Expense No.</th><th>Party</th><th>Category</th><th>Payment</th><th>Amount</th></tr></thead><tbody>${body}</tbody></table>`,
    );
  }

  return (
    <div className="ex-foot">
      <p className="ex-foot-count">{EXPENSES_CONTENT.showing(count)}</p>
      <div className="ex-foot-actions">
        <button type="button" className="ex-btn ex-btn-ghost" onClick={onExcel}>
          <FileSpreadsheet size={15} aria-hidden />
          {EXPENSES_CONTENT.excel}
        </button>
        <button type="button" className="ex-btn ex-btn-ghost" onClick={onPdf}>
          <Download size={15} aria-hidden />
          {EXPENSES_CONTENT.pdf}
        </button>
      </div>
    </div>
  );
}
