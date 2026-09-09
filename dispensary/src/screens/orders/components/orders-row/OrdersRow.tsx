import type { MouseEvent } from 'react';
import {
  Globe,
  Printer,
  Share2,
  Store,
  FileText,
  ScrollText,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '@/store';
import { ROUTES } from '@/libs/constants/routes.const';
import type { SalesOrderRow } from '@/services/salesOrders';
import { downloadInvoicePdf, openInvoicePdf } from '@/services/salesInvoices';
import { ORDERS_CONTENT } from '../../OrdersScreen.content';
import {
  channelLabel,
  customerMeta,
  formatPaise,
  isUnpaid,
  needsAction,
  statusLabel,
  statusTone,
  unitsLabel,
} from '../../OrdersScreen.utils';
import { openOrderDetail, setOrdersActionHint } from '../../store/orders.slice';
import { shareOrderBill } from '../../store/orders.thunks';
import { selectOrdersActionBusyId } from '../../store/orders.selectors';

type OrdersRowProps = {
  row: SalesOrderRow;
};

export function OrdersRow({ row }: OrdersRowProps) {
  const dispatch = useDispatch<AppDispatch>();
  const busyId = useSelector(selectOrdersActionBusyId);
  const busy = busyId === row.id;
  const unpaid = isUnpaid(row);
  const tone = statusTone(row.status);

  async function onPrint(event: MouseEvent) {
    event.stopPropagation();
    try {
      const blob = await downloadInvoicePdf(row.id);
      openInvoicePdf(blob, `${row.invoiceNumber}.pdf`, true);
    } catch {
      dispatch(setOrdersActionHint(ORDERS_CONTENT.printFail));
    }
  }

  function onShare(event: MouseEvent) {
    event.stopPropagation();
    void dispatch(shareOrderBill(row.id));
  }

  return (
    <tr onClick={() => dispatch(openOrderDetail(row.id))}>
      <td className="orders-mono">
        {row.invoiceNumber}
        {row.hasPrescription ? (
          <span className="orders-tag">
            <ScrollText size={11} strokeWidth={1.8} aria-hidden />
            {ORDERS_CONTENT.rx}
          </span>
        ) : null}
      </td>
      <td>
        <div className="orders-cust-name">{row.customerName}</div>
        <div className="orders-sub">{customerMeta(row)}</div>
      </td>
      <td>
        {unitsLabel(row)}
        {row.itemSummary ? <div className="orders-sub">{row.itemSummary}</div> : null}
      </td>
      <td>
        <span
          className={`orders-pill ${row.channel === 'ONLINE' ? 'orders-pill-blue' : 'orders-pill-gray'}`}
        >
          {row.channel === 'ONLINE' ? (
            <Globe size={13} strokeWidth={1.8} aria-hidden />
          ) : (
            <Store size={13} strokeWidth={1.8} aria-hidden />
          )}
          {channelLabel(row.channel)}
        </span>
      </td>
      <td>
        <div className="orders-pay-stack">
          {unpaid ? <span className="orders-pill orders-pill-rose">● {ORDERS_CONTENT.unpaid}</span> : null}
          {row.paymentLabel ? <span>{row.paymentLabel}</span> : null}
        </div>
      </td>
      <td>
        <span className={`orders-pill orders-pill-${tone}`}>
          <i className="d" aria-hidden />
          {statusLabel(row.status)}
        </span>
      </td>
      <td className="num">{formatPaise(row.totalPaise)}</td>
      <td>
        <div className="orders-actions" onClick={(event) => event.stopPropagation()}>
          {needsAction(row) ? (
            <Link className="orders-btn orders-btn-primary" to={ROUTES.SALES}>
              {ORDERS_CONTENT.actions.continue}
            </Link>
          ) : null}
          {unpaid && row.status === 'COMPLETED' ? (
            <Link className="orders-btn orders-btn-gold" to={ROUTES.CREDIT}>
              <FileText size={13} strokeWidth={1.8} aria-hidden />
              {ORDERS_CONTENT.actions.markPaid}
            </Link>
          ) : null}
          <button
            type="button"
            className="orders-iconbtn"
            title={ORDERS_CONTENT.actions.share}
            disabled={busy || row.status !== 'COMPLETED'}
            onClick={onShare}
          >
            <Share2 size={16} strokeWidth={1.8} aria-hidden />
          </button>
          <button
            type="button"
            className="orders-iconbtn"
            title={ORDERS_CONTENT.actions.print}
            disabled={row.status !== 'COMPLETED'}
            onClick={(event) => void onPrint(event)}
          >
            <Printer size={16} strokeWidth={1.8} aria-hidden />
          </button>
        </div>
      </td>
    </tr>
  );
}
