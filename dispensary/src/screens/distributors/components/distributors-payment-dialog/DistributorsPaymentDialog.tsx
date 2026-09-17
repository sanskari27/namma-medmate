import { FormEvent, useEffect, useId, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '@/store';
import { DISTRIBUTORS_CONTENT } from '../../DistributorsScreen.content';
import { formatPaise } from '../../DistributorsScreen.utils';
import {
  selectDistributorEditingId,
  selectDistributorLedger,
  selectDistributorPayBusy,
  selectDistributorPayError,
  selectDistributorPayOpen,
} from '../../store/distributors.selectors';
import { closePayDialog } from '../../store/distributors.slice';
import { payDistributor } from '../../store/distributors.thunks';

const PAYMENT_MODES = ['CASH', 'UPI', 'NEFT', 'RTGS', 'CHEQUE', 'CARD'] as const;

export function DistributorsPaymentDialog() {
  const dispatch = useDispatch<AppDispatch>();
  const open = useSelector(selectDistributorPayOpen);
  const busy = useSelector(selectDistributorPayBusy);
  const error = useSelector(selectDistributorPayError);
  const ledger = useSelector(selectDistributorLedger);
  const editingId = useSelector(selectDistributorEditingId);
  const formId = useId();
  const [amountRupees, setAmountRupees] = useState('');
  const [mode, setMode] = useState<(typeof PAYMENT_MODES)[number]>('UPI');
  const [reference, setReference] = useState('');

  useEffect(() => {
    if (open) {
      setAmountRupees('');
      setMode('UPI');
      setReference('');
    }
  }, [open]);

  if (!open) return null;

  const outstanding = formatPaise(ledger?.balancePaise ?? 0);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!editingId || !ledger) return;
    const rupees = Number(amountRupees);
    if (!Number.isFinite(rupees) || rupees <= 0 || !reference.trim()) return;
    const amountPaise = Math.round(rupees * 100);
    if (
      !window.confirm(
        DISTRIBUTORS_CONTENT.payment.confirm(formatPaise(amountPaise), outstanding),
      )
    ) {
      return;
    }
    void dispatch(
      payDistributor({
        id: editingId,
        input: {
          amountPaise,
          mode,
          reference: reference.trim(),
          idempotencyKey: crypto.randomUUID(),
          expectedAccountVersion: ledger.version,
        },
      }),
    );
  }

  return (
    <div
      className="dist-modal-wrap"
      role="presentation"
      style={{ zIndex: 110 }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) dispatch(closePayDialog());
      }}
    >
      <div className="dist-modal" role="dialog" aria-modal="true" style={{ maxWidth: 420 }}>
        <div className="dist-modal-head">
          <h2>{DISTRIBUTORS_CONTENT.payment.title}</h2>
          <button
            type="button"
            className="dist-x"
            aria-label="Close"
            onClick={() => dispatch(closePayDialog())}
          >
            ×
          </button>
        </div>
        <form id={formId} onSubmit={onSubmit}>
          <div className="dist-modal-body">
            <p className="dist-hint" style={{ marginBottom: 12 }}>
              {DISTRIBUTORS_CONTENT.payment.body}
            </p>
            <p className="dist-hint" style={{ marginBottom: 12 }}>
              {DISTRIBUTORS_CONTENT.payment.outstanding}: {outstanding}
            </p>
            {ledger?.entries?.length ? (
              <div className="dist-field" style={{ marginBottom: 12 }}>
                <span>{DISTRIBUTORS_CONTENT.payment.ledger}</span>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
                  {ledger.entries.map((row) => (
                    <li key={row.id}>
                      {new Date(row.occurredAt).toLocaleDateString('en-IN', {
                        timeZone: 'Asia/Kolkata',
                      })}{' '}
                      {row.type} {formatPaise(row.amountPaise)}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className="dist-grid" style={{ gridTemplateColumns: '1fr' }}>
              <label className="dist-field">
                <span>{DISTRIBUTORS_CONTENT.payment.amount}</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={amountRupees}
                  onChange={(event) => setAmountRupees(event.target.value)}
                />
              </label>
              <label className="dist-field">
                <span>{DISTRIBUTORS_CONTENT.payment.mode}</span>
                <select
                  value={mode}
                  onChange={(event) =>
                    setMode(event.target.value as (typeof PAYMENT_MODES)[number])
                  }
                >
                  {PAYMENT_MODES.map((row) => (
                    <option key={row} value={row}>
                      {row}
                    </option>
                  ))}
                </select>
              </label>
              <label className="dist-field">
                <span>{DISTRIBUTORS_CONTENT.payment.reference}</span>
                <input
                  value={reference}
                  onChange={(event) => setReference(event.target.value)}
                  autoComplete="off"
                />
              </label>
              {error ? (
                <p role="alert" style={{ color: 'var(--dist-rose)', fontSize: 13, margin: 0 }}>
                  {error}
                </p>
              ) : null}
            </div>
          </div>
          <div className="dist-modal-foot">
            <button
              type="button"
              className="dist-btn dist-btn-ghost"
              onClick={() => dispatch(closePayDialog())}
            >
              {DISTRIBUTORS_CONTENT.payment.cancel}
            </button>
            <button type="submit" className="dist-btn dist-btn-primary" disabled={busy}>
              {DISTRIBUTORS_CONTENT.payment.submit}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
