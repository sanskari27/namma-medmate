import type { FormEvent } from 'react';
import { X } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '@/store';
import { RETURNS_CONTENT } from '../../ReturnsScreen.content';
import {
  formatPaise,
  lineQuantity,
  refundModeLabel,
  selectedReturnLines,
} from '../../ReturnsScreen.utils';
import {
  clearFoundBill,
  closeCreateReturn,
  setBillQuery,
  setRefundMode,
  setReturnQty,
  setReturnReason,
} from '../../store/returns.slice';
import {
  createReturn,
  findReturnBill,
  previewReturn,
} from '../../store/returns.thunks';
import {
  selectBillQuery,
  selectCreateBusy,
  selectCreateHint,
  selectCreateOpen,
  selectCreateStatus,
  selectQtyByLine,
  selectRefundMode,
  selectReturnInvoice,
  selectReturnPreview,
  selectReturnReason,
} from '../../store/returns.selectors';

export function ReturnsCreateDialog() {
  const dispatch = useDispatch<AppDispatch>();
  const open = useSelector(selectCreateOpen);
  const billQuery = useSelector(selectBillQuery);
  const invoice = useSelector(selectReturnInvoice);
  const qtyByLine = useSelector(selectQtyByLine);
  const reason = useSelector(selectReturnReason);
  const refundMode = useSelector(selectRefundMode);
  const preview = useSelector(selectReturnPreview);
  const busy = useSelector(selectCreateBusy);
  const createStatus = useSelector(selectCreateStatus);
  const createHint = useSelector(selectCreateHint);

  if (!open) return null;

  const creditDisabled = !invoice?.customerId;
  const hintTone =
    createStatus === 'success'
      ? 'ok'
      : createStatus === 'validation' ||
          createStatus === 'failure' ||
          createStatus === 'conflict'
        ? 'alert'
        : null;

  function onFind(event: FormEvent) {
    event.preventDefault();
    void dispatch(findReturnBill());
  }

  function onPreview() {
    if (!invoice) return;
    const lines = selectedReturnLines(invoice, qtyByLine);
    if (lines.length === 0 || !reason.trim()) {
      return;
    }
    void dispatch(
      previewReturn({
        salesInvoiceId: invoice.id,
        reason: reason.trim(),
        decision: 'APPROVED',
        refundMode,
        lines,
      }),
    );
  }

  function onConfirm(event: FormEvent) {
    event.preventDefault();
    if (!invoice) return;
    const lines = selectedReturnLines(invoice, qtyByLine);
    if (lines.length === 0 || !reason.trim()) {
      return;
    }
    void dispatch(
      createReturn({
        salesInvoiceId: invoice.id,
        reason: reason.trim(),
        decision: 'APPROVED',
        refundMode,
        idempotencyKey: crypto.randomUUID(),
        lines,
      }),
    );
  }

  return (
    <div
      className="returns-modal-wrap"
      role="presentation"
      onClick={() => dispatch(closeCreateReturn())}
    >
      <div
        className="returns-modal returns-modal-wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="returns-create-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="returns-modal-head">
          <div>
            <h2 id="returns-create-title">{RETURNS_CONTENT.create.title}</h2>
            <p>{RETURNS_CONTENT.create.subtitle}</p>
          </div>
          <button
            type="button"
            className="returns-x"
            aria-label={RETURNS_CONTENT.actions.close}
            onClick={() => dispatch(closeCreateReturn())}
          >
            <X size={18} strokeWidth={1.8} aria-hidden />
          </button>
        </div>

        <form className="returns-modal-body" onSubmit={onConfirm}>
          {hintTone && (createHint || createStatus === 'success') ? (
            <p className="returns-hint" data-tone={hintTone} role={hintTone === 'alert' ? 'alert' : 'status'}>
              {createStatus === 'success'
                ? RETURNS_CONTENT.status.success
                : createHint}
            </p>
          ) : null}

          {!invoice ? (
            <div className="returns-find">
              <div className="returns-field">
                <label htmlFor="return-bill">{RETURNS_CONTENT.create.billLabel}</label>
                <input
                  id="return-bill"
                  value={billQuery}
                  autoComplete="off"
                  placeholder={RETURNS_CONTENT.create.billPlaceholder}
                  onChange={(event) => dispatch(setBillQuery(event.target.value))}
                />
              </div>
              <button
                type="button"
                className="returns-btn returns-btn-primary"
                disabled={busy}
                onClick={onFind}
              >
                {RETURNS_CONTENT.actions.findBill}
              </button>
            </div>
          ) : (
            <div className="returns-create-grid">
              <div>
                <div className="returns-bill-card">
                  <strong>{invoice.invoiceNumber}</strong>
                  <span>
                    {RETURNS_CONTENT.create.billFound(formatPaise(invoice.totalPaise))}
                  </span>
                  <div style={{ marginTop: 8 }}>
                    <button
                      type="button"
                      className="returns-btn returns-btn-ghost"
                      onClick={() => dispatch(clearFoundBill())}
                    >
                      {RETURNS_CONTENT.actions.changeBill}
                    </button>
                  </div>
                </div>

                <table className="returns-line-tbl">
                  <thead>
                    <tr>
                      <th>{RETURNS_CONTENT.create.pack}</th>
                      <th>{RETURNS_CONTENT.create.batch}</th>
                      <th>{RETURNS_CONTENT.create.sold}</th>
                      <th>{RETURNS_CONTENT.create.takeBack}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.lines.map((line) => (
                      <tr key={line.id}>
                        <td>
                          <div className="returns-cust-name">{line.productName}</div>
                          <div className="returns-sub returns-mono">{line.sku}</div>
                        </td>
                        <td className="returns-mono">{line.batchNumber ?? '—'}</td>
                        <td>{lineQuantity(line.quantity)}</td>
                        <td>
                          <label className="sr-only" htmlFor={`return-qty-${line.id}`}>
                            Return quantity for {line.productName}
                          </label>
                          <input
                            id={`return-qty-${line.id}`}
                            inputMode="decimal"
                            value={qtyByLine[line.id] ?? ''}
                            onChange={(event) =>
                              dispatch(
                                setReturnQty({ lineId: line.id, value: event.target.value }),
                              )
                            }
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="returns-field">
                  <label htmlFor="return-reason">{RETURNS_CONTENT.create.reasonLabel}</label>
                  <input
                    id="return-reason"
                    value={reason}
                    placeholder={RETURNS_CONTENT.create.reasonPlaceholder}
                    onChange={(event) => dispatch(setReturnReason(event.target.value))}
                  />
                </div>

                <fieldset style={{ border: 0, margin: '12px 0 0', padding: 0 }}>
                  <legend
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'var(--ret-muted)',
                      marginBottom: 6,
                    }}
                  >
                    {RETURNS_CONTENT.create.refundLegend}
                  </legend>
                  <div className="returns-refund-opts">
                    <label data-on={refundMode === 'CASH'}>
                      <input
                        type="radio"
                        name="refund-mode"
                        checked={refundMode === 'CASH'}
                        onChange={() => dispatch(setRefundMode('CASH'))}
                      />
                      {RETURNS_CONTENT.create.cash}
                    </label>
                    <label data-on={refundMode === 'CREDIT_NOTE'}>
                      <input
                        type="radio"
                        name="refund-mode"
                        checked={refundMode === 'CREDIT_NOTE'}
                        disabled={creditDisabled}
                        onChange={() => dispatch(setRefundMode('CREDIT_NOTE'))}
                      />
                      {RETURNS_CONTENT.create.credit}
                    </label>
                  </div>
                </fieldset>
              </div>

              <aside className="returns-aside">
                <h3>{RETURNS_CONTENT.create.previewTitle}</h3>
                {preview ? (
                  <>
                    <dl>
                      <div className="row">
                        <dt>{RETURNS_CONTENT.create.mode}</dt>
                        <dd>{refundModeLabel(preview.refundMode)}</dd>
                      </div>
                      <div className="row">
                        <dt>{RETURNS_CONTENT.create.cashBack}</dt>
                        <dd>{formatPaise(preview.cashRefundPaise)}</dd>
                      </div>
                      <div className="row">
                        <dt>{RETURNS_CONTENT.create.creditNote}</dt>
                        <dd>{formatPaise(preview.creditNotePaise)}</dd>
                      </div>
                      <div className="row total">
                        <dt>{RETURNS_CONTENT.create.totalRefund}</dt>
                        <dd>{formatPaise(preview.refundTotalPaise)}</dd>
                      </div>
                    </dl>
                    <ul>
                      {preview.lines.map((line) => (
                        <li key={`${line.salesInvoiceLineId}-${line.quantity}`}>
                          {RETURNS_CONTENT.create.restock(
                            line.quantity,
                            line.productName,
                            line.batchNumber,
                          )}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p style={{ margin: 0, fontSize: 12.5, color: 'var(--ret-muted)' }}>
                    Preview to see cash / credit split and restock lines.
                  </p>
                )}
              </aside>
            </div>
          )}
        </form>

        <div className="returns-modal-foot">
          <button
            type="button"
            className="returns-btn returns-btn-ghost"
            onClick={() => dispatch(closeCreateReturn())}
          >
            {RETURNS_CONTENT.actions.cancel}
          </button>
          {invoice ? (
            <>
              <button
                type="button"
                className="returns-btn returns-btn-outline"
                disabled={busy}
                onClick={onPreview}
              >
                {RETURNS_CONTENT.actions.preview}
              </button>
              <button
                type="button"
                className="returns-btn returns-btn-primary"
                disabled={busy}
                onClick={onConfirm}
              >
                {RETURNS_CONTENT.actions.record}
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
