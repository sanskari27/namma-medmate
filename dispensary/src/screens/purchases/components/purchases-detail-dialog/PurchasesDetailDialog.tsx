import { X } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '@/store';
import { PURCHASES_CONTENT } from '../../PurchasesScreen.content';
import {
  formatDate,
  formatPaise,
  statusPill,
  toNumber,
} from '../../PurchasesScreen.utils';
import { closePurchaseDetail } from '../../store/purchases.slice';
import {
  selectPurchaseDetail,
  selectPurchaseDetailStatus,
  selectSelectedPurchase,
} from '../../store/purchases.selectors';

export function PurchasesDetailDialog() {
  const dispatch = useDispatch<AppDispatch>();
  const row = useSelector(selectSelectedPurchase);
  const detail = useSelector(selectPurchaseDetail);
  const detailStatus = useSelector(selectPurchaseDetailStatus);

  if (!row) return null;

  const pill = statusPill(row.status);

  return (
    <div
      className="purchases-modal-wrap"
      role="presentation"
      onClick={() => dispatch(closePurchaseDetail())}
    >
      <div
        className="purchases-modal purchases-modal-narrow"
        role="dialog"
        aria-modal="true"
        aria-labelledby="purchases-detail-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="purchases-modal-head">
          <div>
            <h2 id="purchases-detail-title">{PURCHASES_CONTENT.detail.title}</h2>
            <div style={{ marginTop: 8 }}>
              <span className={`purchases-pill purchases-pill-${pill}`}>
                <span className="d" aria-hidden />
                {PURCHASES_CONTENT.status[row.status]}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="purchases-x"
            aria-label={PURCHASES_CONTENT.detail.close}
            onClick={() => dispatch(closePurchaseDetail())}
          >
            <X size={16} />
          </button>
        </div>

        <div className="purchases-modal-body">
          <div className="purchases-facts">
            <div className="purchases-fact">
              <div className="k">{PURCHASES_CONTENT.columns.grn}</div>
              <div className="v purchases-mono">{row.receiptNumber}</div>
            </div>
            <div className="purchases-fact">
              <div className="k">{PURCHASES_CONTENT.detail.distributor}</div>
              <div className="v">{row.supplierLegalName}</div>
            </div>
            <div className="purchases-fact">
              <div className="k">{PURCHASES_CONTENT.detail.invoice}</div>
              <div className="v">{row.receiptReference}</div>
            </div>
            <div className="purchases-fact">
              <div className="k">{PURCHASES_CONTENT.detail.date}</div>
              <div className="v">{formatDate(row.createdAt)}</div>
            </div>
            <div className="purchases-fact">
              <div className="k">{PURCHASES_CONTENT.detail.taxable}</div>
              <div className="v">{formatPaise(row.taxablePaise)}</div>
            </div>
            <div className="purchases-fact">
              <div className="k">{PURCHASES_CONTENT.detail.total}</div>
              <div className="v">{formatPaise(row.totalPaise)}</div>
            </div>
          </div>

          {detailStatus === 'loading' ? (
            <div className="purchases-loading" role="status">
              {PURCHASES_CONTENT.status.loading}
            </div>
          ) : detail ? (
            <>
              <div className="purchases-lines-head">
                <h3>{PURCHASES_CONTENT.detail.items}</h3>
              </div>
              <div className="purchases-tbl-wrap">
                <table className="purchases-tbl">
                  <thead>
                    <tr>
                      <th>{PURCHASES_CONTENT.detail.product}</th>
                      <th>{PURCHASES_CONTENT.detail.sku}</th>
                      <th className="num">{PURCHASES_CONTENT.detail.qty}</th>
                      <th className="num">{PURCHASES_CONTENT.detail.rate}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.lines.map((line) => (
                      <tr key={line.id} style={{ cursor: 'default' }}>
                        <td>{line.productName}</td>
                        <td className="purchases-mono">{line.sku}</td>
                        <td className="num">{toNumber(line.quantity)}</td>
                        <td className="num">{formatPaise(line.unitRatePaise)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </div>

        <div className="purchases-modal-foot">
          <div className="purchases-foot-actions">
            <button
              type="button"
              className="purchases-btn purchases-btn-ghost"
              onClick={() => dispatch(closePurchaseDetail())}
            >
              {PURCHASES_CONTENT.detail.close}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
