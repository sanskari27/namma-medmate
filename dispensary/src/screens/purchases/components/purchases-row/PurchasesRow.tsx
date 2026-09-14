import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '@/store';
import type { GoodsReceiptSummary } from '@/services/goodsReceipts';
import { PURCHASES_CONTENT } from '../../PurchasesScreen.content';
import {
  formatDate,
  formatPaise,
  statusPill,
  toNumber,
} from '../../PurchasesScreen.utils';
import { openPurchaseDetail } from '../../store/purchases.slice';
import { loadPurchaseDetail } from '../../store/purchases.thunks';

type Props = { row: GoodsReceiptSummary };

export function PurchasesRow({ row }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const pill = statusPill(row.status);

  function onOpen() {
    dispatch(openPurchaseDetail(row.id));
    void dispatch(loadPurchaseDetail(row.id));
  }

  return (
    <tr onClick={onOpen} onKeyDown={(e) => e.key === 'Enter' && onOpen()} tabIndex={0}>
      <td className="purchases-mono">{row.receiptNumber}</td>
      <td>
        <div className="purchases-dist">{row.supplierLegalName}</div>
      </td>
      <td>{row.receiptReference}</td>
      <td>{formatDate(row.createdAt)}</td>
      <td>{PURCHASES_CONTENT.itemsLabel(row.lineCount ?? 0, toNumber(row.unitCount ?? 0))}</td>
      <td className="num">{formatPaise(row.taxablePaise)}</td>
      <td className="num">{formatPaise(row.taxPaise)}</td>
      <td className="num total">{formatPaise(row.totalPaise)}</td>
      <td>
        <span className={`purchases-pill purchases-pill-${pill}`}>
          <span className="d" aria-hidden />
          {PURCHASES_CONTENT.status[row.status]}
        </span>
      </td>
    </tr>
  );
}
