import type { HospitalIndent } from '@/services/hospital';
import { HOSPITAL_INDENTS_CONTENT } from '../../HospitalIndentsScreen.content';
import {
  patientOrNote,
  statusLabel,
  type StatusFilter,
  wardBedLabel,
} from '../../HospitalIndentsScreen.utils';

type HospitalIndentsListProps = {
  items: HospitalIndent[];
  selectedId: string | null;
  filter: StatusFilter;
  onFilterChange: (filter: StatusFilter) => void;
  onSelect: (indent: HospitalIndent) => void;
};

const FILTER_LABELS: Record<StatusFilter, string> = {
  ALL: HOSPITAL_INDENTS_CONTENT.filterAll,
  PENDING: HOSPITAL_INDENTS_CONTENT.filterPending,
  APPROVED: HOSPITAL_INDENTS_CONTENT.filterApproved,
  REJECTED: HOSPITAL_INDENTS_CONTENT.filterRejected,
  ISSUED: HOSPITAL_INDENTS_CONTENT.filterIssued,
};

export function HospitalIndentsList({
  items,
  selectedId,
  filter,
  onFilterChange,
  onSelect,
}: HospitalIndentsListProps) {
  return (
    <section className="hi-panel" aria-label={HOSPITAL_INDENTS_CONTENT.listLabel}>
      <div className="hi-panel-head">
        <div className="hi-filter" role="group" aria-label="Status filter">
          {(Object.keys(FILTER_LABELS) as StatusFilter[]).map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={filter === key}
              onClick={() => onFilterChange(key)}
            >
              {FILTER_LABELS[key]}
            </button>
          ))}
        </div>
      </div>
      {items.length === 0 ? (
        <p className="hi-empty">{HOSPITAL_INDENTS_CONTENT.empty}</p>
      ) : (
        <>
          <div className="hi-row hi-row-head" aria-hidden="true">
            <span>Indent</span>
            <span>Ward / patient</span>
            <span>Requested by</span>
            <span>Status</span>
          </div>
          {items.map((indent) => (
            <button
              key={indent.id}
              type="button"
              className="hi-row"
              aria-selected={selectedId === indent.id}
              onClick={() => onSelect(indent)}
            >
              <span>{indent.indentNumber}</span>
              <span>
                {wardBedLabel(indent)} · {patientOrNote(indent)}
              </span>
              <span>{indent.requestedBy}</span>
              <span>{statusLabel(indent.status)}</span>
            </button>
          ))}
        </>
      )}
    </section>
  );
}
