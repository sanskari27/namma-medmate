import { Download, FileSpreadsheet } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '@/store';
import { SHOP_BOOKS_CONTENT } from '../../ShopBooksScreen.content';
import { type PeriodKind, type PeriodSpan } from '../../ShopBooksScreen.utils';
import {
  bookSelected,
  exportShopBook,
  periodKindChanged,
  periodPatched,
  periodSpanChanged,
  scopeChanged,
  selectShopBooksBusy,
  selectShopBooksPeriod,
  selectShopBooksPlanGate,
  selectShopBooksScope,
} from '../../store';

export function ShopBooksReportToolbar({ owner }: { owner: boolean }) {
  const dispatch = useDispatch<AppDispatch>();
  const period = useSelector(selectShopBooksPeriod);
  const scope = useSelector(selectShopBooksScope);
  const planGate = useSelector(selectShopBooksPlanGate);
  const busy = useSelector(selectShopBooksBusy);
  const hasBranch = Boolean(useSelector((state: RootState) => state.auth.user?.activeBranchId));
  const disabled = planGate || busy;

  return (
    <div className="bk-toolbar">
      <button type="button" className="bk-btn bk-btn-ghost" onClick={() => dispatch(bookSelected(null))}>
        {SHOP_BOOKS_CONTENT.allReports}
      </button>
      <div className="bk-toolbar-spacer" />
      <select
        className="bk-select"
        aria-label="Period"
        value={period.kind}
        onChange={(event) => dispatch(periodKindChanged(event.target.value as PeriodKind))}
      >
        <option value="today">Today</option>
        <option value="month">Month</option>
        <option value="year">Year</option>
        <option value="fy">Financial Year</option>
        <option value="custom">Custom dates</option>
        <option value="all">All time</option>
      </select>
      {period.kind === 'month' || period.kind === 'custom' ? (
        <select
          className="bk-select"
          aria-label="Range"
          value={period.span}
          onChange={(event) => dispatch(periodSpanChanged(event.target.value as PeriodSpan))}
        >
          <option value="single">Single</option>
          <option value="range">Range</option>
        </select>
      ) : null}
      {period.kind === 'month' ? (
        <>
          <input
            className="bk-field"
            type="month"
            aria-label="Month"
            value={period.month}
            onChange={(event) => dispatch(periodPatched({ month: event.target.value }))}
          />
          {period.span === 'range' ? (
            <input
              className="bk-field"
              type="month"
              aria-label="To month"
              value={period.monthTo}
              onChange={(event) => dispatch(periodPatched({ monthTo: event.target.value }))}
            />
          ) : null}
        </>
      ) : null}
      {period.kind === 'year' ? (
        <input
          className="bk-field"
          type="number"
          min="2020"
          max="2100"
          aria-label="Year"
          value={period.year}
          onChange={(event) => dispatch(periodPatched({ year: event.target.value }))}
        />
      ) : null}
      {period.kind === 'custom' ? (
        <>
          <input
            className="bk-field"
            type="date"
            aria-label="From"
            value={period.customFrom}
            onChange={(event) => dispatch(periodPatched({ customFrom: event.target.value }))}
          />
          <input
            className="bk-field"
            type="date"
            aria-label="To"
            value={period.customTo}
            onChange={(event) => dispatch(periodPatched({ customTo: event.target.value }))}
          />
        </>
      ) : null}
      {owner && hasBranch ? (
        <select
          className="bk-select"
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
      <button
        type="button"
        className="bk-btn bk-btn-ghost"
        disabled={disabled}
        onClick={() => void dispatch(exportShopBook('csv'))}
      >
        <FileSpreadsheet size={15} aria-hidden />
        {SHOP_BOOKS_CONTENT.excel}
      </button>
      <button
        type="button"
        className="bk-btn bk-btn-ghost"
        disabled={disabled}
        onClick={() => void dispatch(exportShopBook('pdf'))}
      >
        <Download size={15} aria-hidden />
        {SHOP_BOOKS_CONTENT.pdf}
      </button>
    </div>
  );
}
