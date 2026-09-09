import { MapPin, Printer, ScrollText, Share2, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '@/store';
import { ROUTES } from '@/libs/constants/routes.const';
import { downloadInvoicePdf, openInvoicePdf } from '@/services/salesInvoices';
import { OrdersPrescriptionCard } from '../orders-prescription-card';
import { ORDERS_CONTENT } from '../../OrdersScreen.content';
import {
  channelLabel,
  formatIstDateTime,
  formatPaise,
  gstLabel,
  historyEvents,
  isUnpaid,
  itemsFactLabel,
  needsAction,
  statusLabel,
  statusTone,
} from '../../OrdersScreen.utils';
import {
  closeOrderDetail,
  setOrderDetailTab,
  setOrdersActionHint,
} from '../../store/orders.slice';
import { shareOrderBill } from '../../store/orders.thunks';
import {
  selectOrdersActionBusyId,
  selectOrdersDetailTab,
  selectSelectedOrder,
} from '../../store/orders.selectors';

export function OrdersDetailDialog() {
  const dispatch = useDispatch<AppDispatch>();
  const row = useSelector(selectSelectedOrder);
  const tab = useSelector(selectOrdersDetailTab);
  const busyId = useSelector(selectOrdersActionBusyId);

  if (!row) return null;

  const unpaid = isUnpaid(row);
  const tone = statusTone(row.status);
  const busy = busyId === row.id;
  const events = historyEvents(row);

  async function onPrint() {
    try {
      const blob = await downloadInvoicePdf(row.id);
      openInvoicePdf(blob, `${row.invoiceNumber}.pdf`, true);
    } catch {
      dispatch(setOrdersActionHint(ORDERS_CONTENT.printFail));
    }
  }

  return (
    <div
      className="orders-modal-wrap"
      role="presentation"
      onClick={() => dispatch(closeOrderDetail())}
    >
      <div
        className="orders-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="orders-detail-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="orders-modal-head">
          <div>
            <h2 id="orders-detail-title">
              {row.invoiceNumber}{' '}
              <span>
                ·{' '}
                {row.channel === 'ONLINE'
                  ? ORDERS_CONTENT.detail.onlineOrder
                  : ORDERS_CONTENT.detail.counterSale}
              </span>
            </h2>
            <div className="orders-modal-pills">
              <span className={`orders-pill orders-pill-${tone}`}>
                <i className="d" aria-hidden />
                {statusLabel(row.status)}
              </span>
              <span
                className={`orders-pill ${row.channel === 'ONLINE' ? 'orders-pill-blue' : 'orders-pill-gray'}`}
              >
                {channelLabel(row.channel)}
              </span>
              {row.hasPrescription ? (
                <span className="orders-tag" style={{ marginLeft: 0 }}>
                  <ScrollText size={11} strokeWidth={1.8} aria-hidden />
                  {ORDERS_CONTENT.detail.prescription}
                </span>
              ) : null}
              {unpaid ? (
                <span className="orders-pill orders-pill-rose">● {ORDERS_CONTENT.unpaid}</span>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            className="orders-x"
            aria-label={ORDERS_CONTENT.actions.close}
            onClick={() => dispatch(closeOrderDetail())}
          >
            <X size={18} strokeWidth={1.8} aria-hidden />
          </button>
        </div>

        <div className="orders-modal-tabs">
          <div className="orders-seg" role="tablist">
            <button
              type="button"
              role="tab"
              data-on={tab === 'details'}
              aria-selected={tab === 'details'}
              onClick={() => dispatch(setOrderDetailTab('details'))}
            >
              {ORDERS_CONTENT.actions.detailsTab}
            </button>
            <button
              type="button"
              role="tab"
              data-on={tab === 'invoice'}
              aria-selected={tab === 'invoice'}
              onClick={() => dispatch(setOrderDetailTab('invoice'))}
            >
              {ORDERS_CONTENT.actions.invoiceTab}
            </button>
          </div>
        </div>

        <div className="orders-modal-body">
          <div className="orders-fact">
            <div>
              <div className="k">{ORDERS_CONTENT.detail.orderDate}</div>
              <div className="v sm">{formatIstDateTime(row.createdAt)}</div>
            </div>
            <div>
              <div className="k">{ORDERS_CONTENT.detail.amount}</div>
              <div className="v">{formatPaise(row.totalPaise)}</div>
            </div>
            <div>
              <div className="k">{ORDERS_CONTENT.detail.payment}</div>
              <div className="v sm">
                {unpaid
                  ? ORDERS_CONTENT.unpaid
                  : (row.paymentLabel ?? '—')}
              </div>
            </div>
            <div>
              <div className="k">{ORDERS_CONTENT.detail.customer}</div>
              <div className="v sm">
                {row.customerName}
                {row.customerPhone ? ` · ${row.customerPhone}` : ''}
              </div>
            </div>
            <div>
              <div className="k">{ORDERS_CONTENT.detail.items}</div>
              <div className="v sm">{itemsFactLabel(row)}</div>
            </div>
            <div>
              <div className="k">{ORDERS_CONTENT.detail.gst}</div>
              <div className="v sm">{gstLabel(row)}</div>
            </div>
          </div>

          {row.customerAddress ? (
            <p className="orders-address">
              <MapPin size={12} strokeWidth={1.8} aria-hidden />
              {ORDERS_CONTENT.detail.address}: {row.customerAddress}
            </p>
          ) : null}

          {tab === 'details' ? (
            <>
              <div className="orders-pl-head">{ORDERS_CONTENT.detail.statusHistory}</div>
              <div className="orders-vtl">
                {events.map((event) => (
                  <div key={event.label} className={`ev${event.future ? ' future' : ''}`}>
                    <div className="t">{event.label}</div>
                    <div className="d">{event.detail}</div>
                  </div>
                ))}
              </div>
              <OrdersPrescriptionCard row={row} />
            </>
          ) : null}

          <div className="orders-pl-head">{ORDERS_CONTENT.detail.items}</div>
          <div className="orders-tbl-wrap">
            <table className="orders-tbl">
              <thead>
                <tr>
                  <th>{ORDERS_CONTENT.detail.itemCol}</th>
                  <th>{ORDERS_CONTENT.detail.batchCol}</th>
                  <th className="num">{ORDERS_CONTENT.detail.qtyCol}</th>
                  <th className="num">{ORDERS_CONTENT.detail.rateCol}</th>
                  <th className="num">{ORDERS_CONTENT.detail.amountCol}</th>
                </tr>
              </thead>
              <tbody>
                {row.lines.map((line) => (
                  <tr key={line.id} style={{ cursor: 'default' }}>
                    <td style={{ fontWeight: 600 }}>{line.productName}</td>
                    <td className="orders-mono">{line.batchNumber ?? '—'}</td>
                    <td className="num">{String(line.quantity)}</td>
                    <td className="num">{formatPaise(line.sellingPricePaise)}</td>
                    <td className="num" style={{ fontWeight: 700 }}>
                      {formatPaise(line.lineTotalPaise)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4}>{ORDERS_CONTENT.detail.totalPayable}</td>
                  <td className="num">{formatPaise(row.totalPaise)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className="orders-modal-foot">
          <button
            type="button"
            className="orders-btn orders-btn-ghost"
            onClick={() => dispatch(closeOrderDetail())}
          >
            {ORDERS_CONTENT.actions.close}
          </button>
          {needsAction(row) ? (
            <Link className="orders-btn orders-btn-primary" to={ROUTES.SALES}>
              {ORDERS_CONTENT.actions.continue}
            </Link>
          ) : null}
          {unpaid && row.status === 'COMPLETED' ? (
            <Link className="orders-btn orders-btn-gold" to={ROUTES.CREDIT}>
              {ORDERS_CONTENT.actions.markPaid}
            </Link>
          ) : null}
          <button
            type="button"
            className="orders-btn orders-btn-ghost"
            disabled={busy || row.status !== 'COMPLETED'}
            onClick={() => void dispatch(shareOrderBill(row.id))}
          >
            <Share2 size={15} strokeWidth={1.8} aria-hidden />
            {ORDERS_CONTENT.actions.shareShort}
          </button>
          <button
            type="button"
            className="orders-btn orders-btn-primary"
            disabled={row.status !== 'COMPLETED'}
            onClick={() => void onPrint()}
          >
            <Printer size={16} strokeWidth={1.8} aria-hidden />
            {ORDERS_CONTENT.actions.printShort}
          </button>
        </div>
      </div>
    </div>
  );
}
