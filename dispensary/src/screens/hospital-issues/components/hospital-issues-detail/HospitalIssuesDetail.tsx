import { Button } from '@atoms';
import type { HospitalIssue } from '@/services/hospital';
import { HOSPITAL_ISSUES_CONTENT } from '../../HospitalIssuesScreen.content';
import { formatPaise, reasonLabel } from '../../HospitalIssuesScreen.utils';

type HospitalIssuesDetailProps = {
  issue: HospitalIssue | null;
  pdfBusy: boolean;
  onPrint: () => void;
  onDownload: () => void;
};

export function HospitalIssuesDetail({
  issue,
  pdfBusy,
  onPrint,
  onDownload,
}: HospitalIssuesDetailProps) {
  if (!issue) {
    return (
      <section className="hj-panel" aria-label={HOSPITAL_ISSUES_CONTENT.detailLabel}>
        <p className="hj-empty">{HOSPITAL_ISSUES_CONTENT.selectIssue}</p>
      </section>
    );
  }

  return (
    <section className="hj-panel" aria-label={HOSPITAL_ISSUES_CONTENT.detailLabel}>
      <div className="hj-detail">
        <div>
          <h2 className="font-serif text-lg text-ink">{issue.invoiceNumber}</h2>
          <p className="text-sm text-muted">
            {issue.wardName} · {reasonLabel(issue.reason)}
          </p>
          {issue.patientName ? (
            <p className="text-sm text-muted">
              {issue.patientName}
              {issue.uhid ? ` · ${issue.uhid}` : ''}
            </p>
          ) : null}
        </div>
        <div>
          {issue.lines.map((line) => (
            <div key={line.id} className="hj-line-row">
              <span>{line.productName}</span>
              <span>{line.batchNumber ?? '—'}</span>
              <span>{formatPaise(line.creditPricePaise)}</span>
              <span>{formatPaise(line.amountPaise)}</span>
            </div>
          ))}
        </div>
        <p className="text-sm text-muted">
          {HOSPITAL_ISSUES_CONTENT.mrpValue}: {formatPaise(issue.mrpValuePaise)}
        </p>
        <p className="text-sm text-muted">
          {HOSPITAL_ISSUES_CONTENT.billedToHospital}: {formatPaise(issue.billedPaise)}
        </p>
        <p className="text-sm text-muted">
          {HOSPITAL_ISSUES_CONTENT.termsLabel}: {issue.creditTerms}
        </p>
        <p className="text-sm text-muted">
          {HOSPITAL_ISSUES_CONTENT.pharmacyGstin}: {issue.pharmacyGstin ?? '—'}
        </p>
        <p className="text-sm text-muted">
          {HOSPITAL_ISSUES_CONTENT.hospitalGstin}: {issue.hospitalGstin ?? '—'}
        </p>
        <div className="hj-actions">
          <Button type="button" disabled={pdfBusy} onClick={onPrint}>
            {HOSPITAL_ISSUES_CONTENT.printBill}
          </Button>
          <Button type="button" variant="outline" disabled={pdfBusy} onClick={onDownload}>
            {HOSPITAL_ISSUES_CONTENT.downloadA4}
          </Button>
        </div>
      </div>
    </section>
  );
}
