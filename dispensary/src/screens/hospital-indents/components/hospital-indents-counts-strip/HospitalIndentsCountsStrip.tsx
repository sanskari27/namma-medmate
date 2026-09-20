import type { HospitalIndentList } from '@/services/hospital';
import { HOSPITAL_INDENTS_CONTENT } from '../../HospitalIndentsScreen.content';

type HospitalIndentsCountsStripProps = {
  counts: Pick<
    HospitalIndentList,
    'pendingCount' | 'approvedCount' | 'issuedTodayCount' | 'totalCount'
  >;
};

export function HospitalIndentsCountsStrip({ counts }: HospitalIndentsCountsStripProps) {
  return (
    <section className="hi-counts" aria-label="Indent counts">
      <div className="hi-count">
        <strong>{counts.pendingCount}</strong>
        <span>{HOSPITAL_INDENTS_CONTENT.countsPending}</span>
      </div>
      <div className="hi-count">
        <strong>{counts.approvedCount}</strong>
        <span>{HOSPITAL_INDENTS_CONTENT.countsApproved}</span>
      </div>
      <div className="hi-count">
        <strong>{counts.issuedTodayCount}</strong>
        <span>{HOSPITAL_INDENTS_CONTENT.countsIssuedToday}</span>
      </div>
      <div className="hi-count">
        <strong>{counts.totalCount}</strong>
        <span>{HOSPITAL_INDENTS_CONTENT.countsTotal}</span>
      </div>
    </section>
  );
}
