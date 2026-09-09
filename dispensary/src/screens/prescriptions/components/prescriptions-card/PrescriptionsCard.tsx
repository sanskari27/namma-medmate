import { Archive, Clock3, Zap } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '@/store';
import type { PrescriptionReference } from '@/services/prescriptionReferences';
import { RX_CONTENT } from '../../PrescriptionsScreen.content';
import {
  cardStatusLabel,
  cardTone,
  doctorLine,
  expiryBanner,
  formatPaise,
  billedPaiseOf,
  initials,
  isExpiringSoon,
  isPastValidity,
  relativeAge,
} from '../../PrescriptionsScreen.utils';
import { openRxDetail } from '../../store/prescriptions.slice';
import { archivePrescription } from '../../store/prescriptions.thunks';
import { selectRxActionBusy } from '../../store/prescriptions.selectors';

type Props = { row: PrescriptionReference };

export function PrescriptionsCard({ row }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const busy = useSelector(selectRxActionBusy);
  const tone = cardTone(row);
  const urgent = isExpiringSoon(row) || isPastValidity(row);
  const banner = expiryBanner(row);
  const bannerTone = isPastValidity(row) ? undefined : isExpiringSoon(row) ? 'warn' : 'ok';
  const preview = row.invoices.slice(0, 2);

  return (
    <article className="rx-rxcard" data-urgent={urgent ? 'true' : 'false'}>
      <button
        type="button"
        className="rx-card-head"
        style={{ width: '100%', background: 'transparent', border: 0, cursor: 'pointer' }}
        onClick={() => dispatch(openRxDetail(row.id))}
      >
        <div>
          <h3>{row.prescriptionReference}</h3>
          <div className="meta">
            {urgent ? (
              <span className="rx-urgent">
                <Zap size={11} strokeWidth={2} aria-hidden />
                {isPastValidity(row) ? RX_CONTENT.card.overdue : RX_CONTENT.card.urgent}
              </span>
            ) : null}
            <span className="age">{relativeAge(row.issuedAt)}</span>
            <span className={`rx-pill rx-pill-${tone}`}>
              <i className="d" aria-hidden />
              {cardStatusLabel(row)}
            </span>
          </div>
        </div>
      </button>

      <button
        type="button"
        className="rx-patient"
        style={{ width: 'calc(100% - 32px)', cursor: 'pointer', textAlign: 'left' }}
        onClick={() => dispatch(openRxDetail(row.id))}
      >
        <div className="rx-av" aria-hidden>
          {initials(row.customerName || 'P')}
        </div>
        <div className="who">
          <b>{row.customerName || 'Patient'}</b>
          <span>{doctorLine(row)}</span>
        </div>
        <span className="rx-kind">{row.branchName || 'Outlet'}</span>
      </button>

      {banner ? (
        <div className="rx-sla" data-tone={bannerTone}>
          <Clock3 size={12} strokeWidth={1.8} aria-hidden />
          {banner}
        </div>
      ) : null}

      <button
        type="button"
        className="rx-bills"
        style={{
          width: 'calc(100% - 32px)',
          background: 'transparent',
          borderTop: '1px dashed var(--rx-line)',
          cursor: 'pointer',
          textAlign: 'left',
        }}
        onClick={() => dispatch(openRxDetail(row.id))}
      >
        <div className="lbl">
          <span>SOURCE BILLS</span>
          <span>{RX_CONTENT.card.bills(row.invoiceCount ?? row.invoices.length)}</span>
        </div>
        {preview.length === 0 ? (
          <div className="row">
            <span>No collected bills yet</span>
          </div>
        ) : (
          preview.map((inv) => (
            <div key={inv.id} className="row">
              <span className="mono">{inv.invoiceNumber}</span>
              <span>{formatPaise(inv.totalPaise)}</span>
            </div>
          ))
        )}
      </button>

      <div className="rx-total">
        <span>Billed on this Rx</span>
        <b>{formatPaise(billedPaiseOf(row))}</b>
      </div>

      <div className="rx-card-actions">
        <button
          type="button"
          className="rx-btn rx-btn-ghost rx-btn-sm"
          onClick={() => dispatch(openRxDetail(row.id))}
        >
          {RX_CONTENT.card.view}
        </button>
        {row.status === 'ACTIVE' ? (
          <button
            type="button"
            className="rx-btn rx-btn-primary rx-btn-sm"
            disabled={busy}
            onClick={() => void dispatch(archivePrescription({ id: row.id, version: row.version }))}
          >
            <Archive size={13} strokeWidth={1.8} aria-hidden />
            {RX_CONTENT.card.archive}
          </button>
        ) : null}
      </div>
    </article>
  );
}
