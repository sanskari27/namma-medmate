import { Plus, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '@/store';
import { ROUTES } from '@/libs/constants/routes.const';
import { PURCHASES_CONTENT } from '../../PurchasesScreen.content';
import {
  openCreatePurchase,
  setPurchasesDesk,
  setPurchasesQuery,
} from '../../store/purchases.slice';
import {
  selectCreateBusy,
  selectCreateHint,
  selectCreateStatus,
  selectFilteredPurchases,
  selectPurchasesDesk,
  selectPurchasesQuery,
} from '../../store/purchases.selectors';
import { draftFromReorder } from '../../store/purchases.thunks';
import { PurchasesRow } from '../purchases-row';
import { PurchasesIndentTable } from '../purchases-indent-table';

export function PurchasesTable() {
  const dispatch = useDispatch<AppDispatch>();
  const rows = useSelector(selectFilteredPurchases);
  const query = useSelector(selectPurchasesQuery);
  const desk = useSelector(selectPurchasesDesk);
  const busy = useSelector(selectCreateBusy);
  const createStatus = useSelector(selectCreateStatus);
  const createHint = useSelector(selectCreateHint);

  return (
    <div className="purchases-card">
      <div className="purchases-card-head">
        <div className="purchases-desk">
          <button
            type="button"
            className="purchases-btn purchases-btn-ghost"
            data-active={desk === 'bills'}
            onClick={() => dispatch(setPurchasesDesk('bills'))}
          >
            {PURCHASES_CONTENT.deskBills}
          </button>
          <button
            type="button"
            className="purchases-btn purchases-btn-ghost"
            data-active={desk === 'indents'}
            onClick={() => dispatch(setPurchasesDesk('indents'))}
          >
            {PURCHASES_CONTENT.deskIndents}
          </button>
        </div>
        <div className="purchases-card-tools">
          <label className="purchases-search">
            <Search size={16} aria-hidden />
            <input
              value={query}
              onChange={(e) => dispatch(setPurchasesQuery(e.target.value))}
              placeholder={PURCHASES_CONTENT.searchPlaceholder}
              aria-label={PURCHASES_CONTENT.searchPlaceholder}
            />
          </label>
          <button
            type="button"
            className="purchases-btn purchases-btn-ghost"
            disabled={busy}
            onClick={() => void dispatch(draftFromReorder())}
          >
            {PURCHASES_CONTENT.reorder}
          </button>
          <button
            type="button"
            className="purchases-btn purchases-btn-outline"
            onClick={() => dispatch(openCreatePurchase('indent'))}
          >
            {PURCHASES_CONTENT.newIndent}
          </button>
          <button
            type="button"
            className="purchases-btn purchases-btn-primary"
            onClick={() => dispatch(openCreatePurchase('bill'))}
          >
            <Plus size={16} aria-hidden />
            {PURCHASES_CONTENT.newEntry}
          </button>
        </div>
      </div>

      {createStatus === 'denied' && createHint === PURCHASES_CONTENT.reorderDenied ? (
        <p className="purchases-banner" data-tone="alert" role="status">
          {createHint} <Link to={ROUTES.SUBSCRIPTION}>Open the plan</Link>
        </p>
      ) : null}

      {desk === 'indents' ? (
        <PurchasesIndentTable />
      ) : rows.length === 0 ? (
        <div className="purchases-empty">
          <strong>{PURCHASES_CONTENT.emptyTitle}</strong>
          {PURCHASES_CONTENT.emptyBody}
        </div>
      ) : (
        <div className="purchases-tbl-wrap">
          <table className="purchases-tbl">
            <thead>
              <tr>
                <th>{PURCHASES_CONTENT.columns.grn}</th>
                <th>{PURCHASES_CONTENT.columns.distributor}</th>
                <th>{PURCHASES_CONTENT.columns.invoice}</th>
                <th>{PURCHASES_CONTENT.columns.date}</th>
                <th>{PURCHASES_CONTENT.columns.items}</th>
                <th className="num">{PURCHASES_CONTENT.columns.taxable}</th>
                <th className="num">{PURCHASES_CONTENT.columns.gst}</th>
                <th className="num">{PURCHASES_CONTENT.columns.total}</th>
                <th>{PURCHASES_CONTENT.columns.status}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <PurchasesRow key={row.id} row={row} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
