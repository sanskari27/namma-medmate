import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '@/store';
import { POS_CONTENT } from '../../PosScreen.content';
import { formatPaise, rupeesToPaise } from '../../PosScreen.utils';
import { backToCart } from '../../store/pos.slice';
import {
  selectPosBusy,
  selectPosCustomerDisplayName,
  selectPosDraft,
  selectPosInvoice,
} from '../../store/pos.selectors';

export function PosOrderSummary() {
  const dispatch = useDispatch<AppDispatch>();
  const draft = useSelector(selectPosDraft);
  const invoice = useSelector(selectPosInvoice);
  const customerName = useSelector(selectPosCustomerDisplayName);
  const busy = useSelector(selectPosBusy);

  const rows =
    invoice?.lines.map((line) => ({
      id: line.id,
      name: POS_CONTENT.lineNameWithUnit(line.productName, line.unit),
      batch: line.batchNumber ?? POS_CONTENT.orderBatchEmpty,
      qty: Number(line.quantity),
      ratePaise: line.sellingPricePaise,
      amountPaise: line.lineTotalPaise,
    })) ??
    draft.map((line) => {
      const qty = Number(line.quantity) || 0;
      const rate = rupeesToPaise(line.sellingRupees) ?? 0;
      const batch =
        line.batches.find((item) => item.batchId === line.batchId)?.batchNumber ??
        POS_CONTENT.orderBatchEmpty;
      return {
        id: line.id,
        name: POS_CONTENT.lineNameWithUnit(line.product.name, line.unit),
        batch,
        qty,
        ratePaise: rate,
        amountPaise: Math.round(qty * rate),
      };
    });

  return (
    <section className="pos-panel" aria-label={POS_CONTENT.orderSummaryAria}>
      <div className="pos-panel-head">
        <h2>{POS_CONTENT.orderSummaryTitle}</h2>
        <button
          type="button"
          className="pos-edit-btn"
          disabled={busy}
          onClick={() => dispatch(backToCart())}
        >
          {POS_CONTENT.orderEdit}
        </button>
      </div>
      <p className="pos-customer-line">
        {POS_CONTENT.orderCustomer} <strong>{customerName}</strong>
      </p>
      <table className="pos-summary-table">
        <thead>
          <tr>
            <th>{POS_CONTENT.orderItem}</th>
            <th>{POS_CONTENT.orderBatch}</th>
            <th>{POS_CONTENT.orderQty}</th>
            <th>{POS_CONTENT.orderRate}</th>
            <th>{POS_CONTENT.orderAmount}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.name}</td>
              <td>{row.batch}</td>
              <td>{row.qty}</td>
              <td>{formatPaise(row.ratePaise)}</td>
              <td>{formatPaise(row.amountPaise)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
