import { Archive, Clock3, MessageSquare, Phone, ScrollText, UserRound, X } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '@/store';
import { RX_CONTENT } from '../../PrescriptionsScreen.content';
import {
  cardStatusLabel,
  cardTone,
  doctorLine,
  formatIst,
  formatPaise,
  isExpiringSoon,
  isPastValidity,
  reasonLabel,
} from '../../PrescriptionsScreen.utils';
import { closeRxDetail } from '../../store/prescriptions.slice';
import { archivePrescription } from '../../store/prescriptions.thunks';
import {
  selectRxActionBusy,
  selectSelectedPrescription,
} from '../../store/prescriptions.selectors';

export function PrescriptionsDetailDialog() {
  const dispatch = useDispatch<AppDispatch>();
  const row = useSelector(selectSelectedPrescription);
  const busy = useSelector(selectRxActionBusy);

  if (!row) return null;

  const tone = cardTone(row);
  const phone = row.customerPhone?.replace(/\D/g, '') || null;

  return (
    <div
      className="rx-modal-wrap"
      role="presentation"
      onClick={() => dispatch(closeRxDetail())}
    >
      <div
        className="rx-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rx-detail-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="rx-modal-head">
          <div>
            <h2 id="rx-detail-title">
              {RX_CONTENT.detail.title} {row.prescriptionReference}
            </h2>
            <div className="rx-modal-pills">
              <span className={`rx-pill rx-pill-${tone}`}>
                <i className="d" aria-hidden />
                {cardStatusLabel(row)}
              </span>
              {isExpiringSoon(row) || isPastValidity(row) ? (
                <span className="rx-pill rx-pill-rose">
                  {isPastValidity(row) ? RX_CONTENT.card.overdue : RX_CONTENT.card.urgent}
                </span>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            className="rx-x"
            aria-label="Close"
            onClick={() => dispatch(closeRxDetail())}
          >
            <X size={16} strokeWidth={1.8} />
          </button>
        </div>

        <div className="rx-modal-body">
          <div className="rx-detail">
            <div className="rx-file">
              <div className="rx-file-banner">
                <ScrollText size={15} strokeWidth={1.8} aria-hidden />
                Sale-time Rx reference
                <span className="chip">{row.status === 'ACTIVE' ? 'On file' : 'Archived'}</span>
              </div>
              <div className="rx-kv">
                <span className="k">Reference</span>
                <span className="v">{row.prescriptionReference}</span>
              </div>
              <div className="rx-kv">
                <span className="k">Patient</span>
                <span className="v">{row.customerName || '—'}</span>
              </div>
              <div className="rx-kv">
                <span className="k">Doctor</span>
                <span className="v">{doctorLine(row)}</span>
              </div>
              <div className="rx-kv">
                <span className="k">{RX_CONTENT.detail.outlet}</span>
                <span className="v">{row.branchName || '—'}</span>
              </div>
              <div className="rx-kv">
                <span className="k">{RX_CONTENT.detail.attached}</span>
                <span className="v">{formatIst(row.issuedAt)}</span>
              </div>
              <div className="rx-kv">
                <span className="k">{RX_CONTENT.detail.validUntil}</span>
                <span className="v">{formatIst(row.expiresAt)}</span>
              </div>
              <div className="rx-kv">
                <span className="k">{RX_CONTENT.detail.why}</span>
                <span className="v">{reasonLabel(row.archiveReason)}</span>
              </div>
            </div>

            <div className="rx-side">
              <div className="rx-block">
                <div className="rx-blkh">
                  <UserRound size={13} strokeWidth={1.8} aria-hidden />
                  {RX_CONTENT.detail.patient}
                </div>
                <div className="rx-kv">
                  <span className="k">Name</span>
                  <span className="v">{row.customerName || '—'}</span>
                </div>
                <div className="rx-kv">
                  <span className="k">Phone</span>
                  <span className="v">{row.customerPhone || '—'}</span>
                </div>
                <div className="rx-kv">
                  <span className="k">Doctor</span>
                  <span className="v">{doctorLine(row)}</span>
                </div>
                {phone ? (
                  <div className="rx-quick">
                    <a className="rx-btn-line" href={`tel:${phone}`}>
                      <Phone size={12} strokeWidth={1.8} aria-hidden />
                      {RX_CONTENT.detail.call}
                    </a>
                    <a className="rx-btn-line" href={`sms:${phone}`}>
                      <MessageSquare size={12} strokeWidth={1.8} aria-hidden />
                      {RX_CONTENT.detail.sms}
                    </a>
                  </div>
                ) : null}
              </div>

              <div className="rx-block">
                <div className="rx-blkh">
                  <Clock3 size={13} strokeWidth={1.8} aria-hidden />
                  {RX_CONTENT.detail.timeline}
                </div>
                <div className="rx-tl">
                  <div className="rx-tlrow">
                    <span className="dot" aria-hidden />
                    <div>
                      <div>Attached from sale</div>
                      <div className="muted">{formatIst(row.issuedAt)}</div>
                    </div>
                  </div>
                  {row.archivedAt ? (
                    <div className="rx-tlrow">
                      <span className="dot" aria-hidden />
                      <div>
                        <div>Archived · {reasonLabel(row.archiveReason)}</div>
                        <div className="muted">{formatIst(row.archivedAt)}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="rx-tlrow">
                      <span className="dot" aria-hidden />
                      <div>
                        <div>Valid until</div>
                        <div className="muted">{formatIst(row.expiresAt)}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="rx-block">
                <div className="rx-blkh">{RX_CONTENT.detail.bills}</div>
                {row.invoices.length === 0 ? (
                  <p style={{ margin: 0, fontSize: 12.5, color: 'var(--rx-muted)' }}>
                    {RX_CONTENT.detail.noBills}
                  </p>
                ) : (
                  <table className="rx-tbl">
                    <thead>
                      <tr>
                        <th>{RX_CONTENT.detail.bill}</th>
                        <th>{RX_CONTENT.detail.collected}</th>
                        <th style={{ textAlign: 'right' }}>{RX_CONTENT.detail.total}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {row.invoices.map((inv) => (
                        <tr key={inv.id}>
                          <td className="mono">{inv.invoiceNumber}</td>
                          <td>{formatIst(inv.completedAt)}</td>
                          <td className="num">{formatPaise(inv.totalPaise)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="rx-modal-foot">
          <button
            type="button"
            className="rx-btn rx-btn-ghost"
            onClick={() => dispatch(closeRxDetail())}
          >
            {RX_CONTENT.detail.close}
          </button>
          {row.status === 'ACTIVE' ? (
            <button
              type="button"
              className="rx-btn rx-btn-primary"
              disabled={busy}
              onClick={() =>
                void dispatch(archivePrescription({ id: row.id, version: row.version }))
              }
            >
              <Archive size={14} strokeWidth={1.8} aria-hidden />
              {RX_CONTENT.detail.archive}
            </button>
          ) : (
            <span style={{ fontSize: 12.5, color: 'var(--rx-muted)', alignSelf: 'center' }}>
              {RX_CONTENT.detail.historyOnly}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
