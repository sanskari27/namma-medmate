import { Link } from 'react-router-dom';
import { Button } from '@atoms';
import { ROUTES } from '@/libs/constants/routes.const';
import type { HospitalIndent } from '@/services/hospital';
import { HOSPITAL_INDENTS_CONTENT } from '../../HospitalIndentsScreen.content';
import { patientOrNote, statusLabel, wardBedLabel } from '../../HospitalIndentsScreen.utils';

type HospitalIndentsDetailProps = {
  indent: HospitalIndent | null;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
};

export function HospitalIndentsDetail({
  indent,
  busy,
  onApprove,
  onReject,
}: HospitalIndentsDetailProps) {
  if (!indent) {
    return (
      <section className="hi-panel" aria-label={HOSPITAL_INDENTS_CONTENT.detailLabel}>
        <p className="hi-empty">{HOSPITAL_INDENTS_CONTENT.selectIndent}</p>
      </section>
    );
  }

  return (
    <section className="hi-panel" aria-label={HOSPITAL_INDENTS_CONTENT.detailLabel}>
      <div className="hi-detail">
        <div>
          <h2 className="font-serif text-lg text-ink">{indent.indentNumber}</h2>
          <p className="text-sm text-muted">
            {wardBedLabel(indent)} · {patientOrNote(indent)}
          </p>
          <p className="text-sm text-muted">
            {HOSPITAL_INDENTS_CONTENT.requestedByLabel}: {indent.requestedBy}
          </p>
          <p className="text-sm text-muted">Status: {statusLabel(indent.status)}</p>
        </div>

        <div className="hi-lines">
          <div className="hi-line-row hi-row-head" aria-hidden="true">
            <span>{HOSPITAL_INDENTS_CONTENT.medicineLabel}</span>
            <span>{HOSPITAL_INDENTS_CONTENT.requestedQtyLabel}</span>
            <span>{HOSPITAL_INDENTS_CONTENT.issuedQtyLabel}</span>
          </div>
          {indent.lines.map((line) => (
            <div key={line.id} className="hi-line-row">
              <span>{line.productName}</span>
              <span>{line.requestedQty}</span>
              <span>{line.issuedQty}</span>
            </div>
          ))}
        </div>

        <p className="text-sm text-muted">
          {HOSPITAL_INDENTS_CONTENT.invoiceRefLabel}:{' '}
          {indent.hospitalInvoiceRef ?? HOSPITAL_INDENTS_CONTENT.noInvoice}
        </p>

        <div className="hi-actions">
          {indent.status === 'PENDING' ? (
            <>
              <Button type="button" disabled={busy} onClick={onApprove}>
                {HOSPITAL_INDENTS_CONTENT.approve}
              </Button>
              <Button type="button" variant="outline" disabled={busy} onClick={onReject}>
                {HOSPITAL_INDENTS_CONTENT.turnDown}
              </Button>
            </>
          ) : null}
          {indent.status === 'APPROVED' ? (
            <Link to={`${ROUTES.HOSPITAL_ISSUES}?indent=${indent.id}`}>
              {HOSPITAL_INDENTS_CONTENT.issueToHospital}
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
