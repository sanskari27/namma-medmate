import { HOSPITAL_ISSUES_CONTENT } from '../../HospitalIssuesScreen.content';

type HospitalIssueInvoiceOverlayProps = {
  open: boolean;
};

export function HospitalIssueInvoiceOverlay({ open }: HospitalIssueInvoiceOverlayProps) {
  if (!open) {
    return null;
  }
  return (
    <div className="hj-overlay" role="status">
      <div className="hj-overlay-card">{HOSPITAL_ISSUES_CONTENT.preparingPdf}</div>
    </div>
  );
}
