import { Check, X } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '@/store';
import { PURCHASES_CONTENT } from '../../PurchasesScreen.content';
import { toNumber } from '../../PurchasesScreen.utils';
import {
  closeDelivery,
  setDeliveryQty,
  setDeliveryRef,
} from '../../store/purchases.slice';
import { selectDelivery } from '../../store/purchases.selectors';
import { recordDelivery } from '../../store/purchases.thunks';

export function PurchasesDeliveryDialog() {
  const dispatch = useDispatch<AppDispatch>();
  const delivery = useSelector(selectDelivery);

  if (!delivery.open) return null;

  const outstanding = delivery.outstanding;
  const busy = delivery.status === 'saving';

  return (
    <div className="purchases-modal-wrap" role="presentation" onClick={() => dispatch(closeDelivery())}>
      <div
        className="purchases-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="purchases-delivery-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="purchases-modal-head">
          <h2 id="purchases-delivery-title">{PURCHASES_CONTENT.entry.deliveryTitle}</h2>
          <button
            type="button"
            className="purchases-x"
            aria-label={PURCHASES_CONTENT.actions.close}
            onClick={() => dispatch(closeDelivery())}
          >
            <X size={16} />
          </button>
        </div>
        <div className="purchases-modal-body">
          {delivery.hint ? (
            <div className="purchases-banner" data-tone="alert" role="status">
              {delivery.hint}
            </div>
          ) : null}
          {outstanding ? (
            <>
              <p className="purchases-intro">
                {outstanding.poNumber} · {outstanding.supplierLegalName}
              </p>
              <div className="purchases-field">
                <label htmlFor="pur-delivery-ref">{PURCHASES_CONTENT.entry.invoiceNo}</label>
                <input
                  id="pur-delivery-ref"
                  value={delivery.receiptReference}
                  onChange={(e) => dispatch(setDeliveryRef(e.target.value))}
                  placeholder={PURCHASES_CONTENT.entry.invoicePlaceholder}
                />
              </div>
              <div className="purchases-tbl-wrap">
                <table className="purchases-tbl">
                  <thead>
                    <tr>
                      <th>{PURCHASES_CONTENT.detail.product}</th>
                      <th className="num">{PURCHASES_CONTENT.entry.outstanding}</th>
                      <th className="num">{PURCHASES_CONTENT.entry.receiveQty}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {outstanding.lines.map((line) => (
                      <tr key={line.purchaseOrderLineId} style={{ cursor: 'default' }}>
                        <td>{line.productName}</td>
                        <td className="num">{toNumber(line.remainingQuantity)}</td>
                        <td className="num">
                          <input
                            inputMode="decimal"
                            aria-label={`${PURCHASES_CONTENT.entry.receiveQty} ${line.productName}`}
                            value={delivery.qtyByLineId[line.purchaseOrderLineId] ?? ''}
                            onChange={(e) =>
                              dispatch(
                                setDeliveryQty({
                                  lineId: line.purchaseOrderLineId,
                                  qty: e.target.value,
                                }),
                              )
                            }
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="purchases-loading" role="status">
              {PURCHASES_CONTENT.status.loading}
            </div>
          )}
        </div>
        <div className="purchases-modal-foot">
          <div className="purchases-foot-actions">
            <button
              type="button"
              className="purchases-btn purchases-btn-ghost"
              onClick={() => dispatch(closeDelivery())}
              disabled={busy}
            >
              {PURCHASES_CONTENT.entry.cancel}
            </button>
            <button
              type="button"
              className="purchases-btn purchases-btn-soft"
              onClick={() => void dispatch(recordDelivery())}
              disabled={busy || !outstanding}
            >
              <Check size={15} aria-hidden />
              {busy ? 'Saving…' : PURCHASES_CONTENT.entry.deliverySave}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
