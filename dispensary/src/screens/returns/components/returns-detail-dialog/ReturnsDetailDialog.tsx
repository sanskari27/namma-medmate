import { X } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '@/store';
import { RETURNS_CONTENT } from '../../ReturnsScreen.content';
import {
  formatIstDateTime,
  formatPaise,
  lineQuantity,
  refundModeLabel,
  refundTone,
} from '../../ReturnsScreen.utils';
import { closeReturnDetail } from '../../store/returns.slice';
import { selectSelectedReturn } from '../../store/returns.selectors';

export function ReturnsDetailDialog() {
  const dispatch = useDispatch<AppDispatch>();
  const row = useSelector(selectSelectedReturn);

  if (!row) return null;

  const tone = refundTone(row.refundMode);

  return (
    <div
      className="returns-modal-wrap"
      role="presentation"
      onClick={() => dispatch(closeReturnDetail())}
    >
      <div
        className="returns-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="returns-detail-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="returns-modal-head">
          <div>
            <h2 id="returns-detail-title">{row.invoiceNumber}</h2>
            <div className="returns-modal-pills">
              <span className={`returns-pill returns-pill-${tone}`}>
                <i className="d" aria-hidden />
                {refundModeLabel(row.refundMode)}
              </span>
              <span className="returns-pill returns-pill-gray">
                <i className="d" aria-hidden />
                Approved
              </span>
            </div>
          </div>
          <button
            type="button"
            className="returns-x"
            aria-label={RETURNS_CONTENT.actions.close}
            onClick={() => dispatch(closeReturnDetail())}
          >
            <X size={18} strokeWidth={1.8} aria-hidden />
          </button>
        </div>

        <div className="returns-modal-body">
          <div className="returns-fact">
            <div>
              <div className="k">{RETURNS_CONTENT.detail.returnDate}</div>
              <div className="v">{formatIstDateTime(row.createdAt)}</div>
            </div>
            <div>
              <div className="k">{RETURNS_CONTENT.detail.customer}</div>
              <div className="v">
                {row.customerName}
                {row.customerPhone ? (
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ret-muted)' }}>
                    {row.customerPhone}
                  </div>
                ) : null}
              </div>
            </div>
            <div>
              <div className="k">{RETURNS_CONTENT.detail.total}</div>
              <div className="v">{formatPaise(row.refundTotalPaise)}</div>
            </div>
          </div>

          <div className="returns-pl-head">{RETURNS_CONTENT.detail.reason}</div>
          <p style={{ margin: '0 0 12px', fontSize: 13.5 }}>{row.reason}</p>

          <div className="returns-fact">
            <div>
              <div className="k">{RETURNS_CONTENT.detail.cashBack}</div>
              <div className="v">{formatPaise(row.cashRefundPaise)}</div>
            </div>
            <div>
              <div className="k">{RETURNS_CONTENT.detail.creditNote}</div>
              <div className="v">{formatPaise(row.creditNotePaise)}</div>
            </div>
            <div>
              <div className="k">{RETURNS_CONTENT.detail.refund}</div>
              <div className="v">{refundModeLabel(row.refundMode)}</div>
            </div>
          </div>

          <div className="returns-pl-head">{RETURNS_CONTENT.detail.items}</div>
          <table className="returns-line-tbl">
            <thead>
              <tr>
                <th>{RETURNS_CONTENT.detail.itemCol}</th>
                <th>{RETURNS_CONTENT.detail.batchCol}</th>
                <th>{RETURNS_CONTENT.detail.qtyCol}</th>
                <th className="num">{RETURNS_CONTENT.detail.amountCol}</th>
              </tr>
            </thead>
            <tbody>
              {row.lines.map((line) => (
                <tr key={line.id}>
                  <td>
                    <div className="returns-cust-name">{line.productName}</div>
                    <div className="returns-sub returns-mono">{line.sku}</div>
                  </td>
                  <td className="returns-mono">{line.batchNumber ?? '—'}</td>
                  <td>{lineQuantity(line.quantity)}</td>
                  <td className="num">{formatPaise(line.refundAmountPaise)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="returns-modal-foot">
          <button
            type="button"
            className="returns-btn returns-btn-ghost"
            onClick={() => dispatch(closeReturnDetail())}
          >
            {RETURNS_CONTENT.actions.close}
          </button>
        </div>
      </div>
    </div>
  );
}
