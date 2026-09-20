import type { HospitalIssue } from '@/services/hospital';
import { HOSPITAL_ISSUES_CONTENT } from '../../HospitalIssuesScreen.content';
import { formatPaise, reasonLabel } from '../../HospitalIssuesScreen.utils';

type HospitalIssuesListProps = {
  items: HospitalIssue[];
  selectedId: string | null;
  onSelect: (issue: HospitalIssue) => void;
};

export function HospitalIssuesList({ items, selectedId, onSelect }: HospitalIssuesListProps) {
  return (
    <section className="hj-panel" aria-label={HOSPITAL_ISSUES_CONTENT.listLabel}>
      {items.length === 0 ? (
        <p className="hj-empty">{HOSPITAL_ISSUES_CONTENT.empty}</p>
      ) : (
        items.map((issue) => (
          <button
            key={issue.id}
            type="button"
            className="hj-row"
            aria-selected={issue.id === selectedId}
            onClick={() => onSelect(issue)}
          >
            <span>{issue.invoiceNumber}</span>
            <span>
              {issue.wardName} · {reasonLabel(issue.reason)}
            </span>
            <span>{formatPaise(issue.billedPaise)}</span>
          </button>
        ))
      )}
    </section>
  );
}
