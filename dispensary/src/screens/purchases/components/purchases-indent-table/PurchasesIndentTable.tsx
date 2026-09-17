import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '@/store';
import type { PurchaseOrder } from '@/services/purchaseOrders';
import { PURCHASES_CONTENT } from '../../PurchasesScreen.content';
import { formatPaise } from '../../PurchasesScreen.utils';
import { selectOpenIndents } from '../../store/purchases.selectors';
import { issueIndent, loadDelivery } from '../../store/purchases.thunks';

export function PurchasesIndentTable() {
  const rows = useSelector(selectOpenIndents);

  if (rows.length === 0) {
    return (
      <div className="purchases-empty">
        <strong>{PURCHASES_CONTENT.indentEmptyTitle}</strong>
        {PURCHASES_CONTENT.indentEmptyBody}
      </div>
    );
  }

  return (
    <div className="purchases-tbl-wrap">
      <table className="purchases-tbl">
        <thead>
          <tr>
            <th>Indent</th>
            <th>{PURCHASES_CONTENT.columns.distributor}</th>
            <th className="num">{PURCHASES_CONTENT.columns.total}</th>
            <th>{PURCHASES_CONTENT.columns.status}</th>
            <th aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <IndentRow key={row.id} row={row} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function IndentRow({ row }: { row: PurchaseOrder }) {
  const dispatch = useDispatch<AppDispatch>();
  return (
    <tr style={{ cursor: 'default' }}>
      <td className="purchases-mono">{row.poNumber}</td>
      <td>{row.supplierLegalName}</td>
      <td className="num">{formatPaise(row.totalPaise)}</td>
      <td>{PURCHASES_CONTENT.status[row.status]}</td>
      <td>
        {row.status === 'DRAFT' ? (
          <button
            type="button"
            className="purchases-btn purchases-btn-outline"
            onClick={() => void dispatch(issueIndent(row.id))}
          >
            {PURCHASES_CONTENT.issueIndent}
          </button>
        ) : (
          <button
            type="button"
            className="purchases-btn purchases-btn-soft"
            onClick={() => void dispatch(loadDelivery(row.id))}
          >
            {PURCHASES_CONTENT.recordDelivery}
          </button>
        )}
      </td>
    </tr>
  );
}
