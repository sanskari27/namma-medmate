import { Plus, Search } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '@/store';
import { PURCHASES_CONTENT } from '../../PurchasesScreen.content';
import {
  openCreatePurchase,
  setPurchasesQuery,
} from '../../store/purchases.slice';
import {
  selectFilteredPurchases,
  selectPurchasesQuery,
} from '../../store/purchases.selectors';
import { PurchasesRow } from '../purchases-row';

export function PurchasesTable() {
  const dispatch = useDispatch<AppDispatch>();
  const rows = useSelector(selectFilteredPurchases);
  const query = useSelector(selectPurchasesQuery);

  return (
    <div className="purchases-card">
      <div className="purchases-card-head">
        <h2>{PURCHASES_CONTENT.sectionTitle}</h2>
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
            className="purchases-btn purchases-btn-primary"
            onClick={() => dispatch(openCreatePurchase())}
          >
            <Plus size={16} aria-hidden />
            {PURCHASES_CONTENT.newEntry}
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
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
