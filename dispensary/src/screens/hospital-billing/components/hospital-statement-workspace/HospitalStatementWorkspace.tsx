import { HOSPITAL_BILLING_CONTENT } from '../../HospitalBillingScreen.content';
import type { HospitalStatement } from '@/services/hospital';
import { formatRupees } from '../../HospitalBillingScreen.utils';
import { HospitalAgeingStrip } from '../hospital-ageing-strip';
import { HospitalStatementTable } from '../hospital-statement-table';

export function HospitalStatementWorkspace({
  statement,
  includePatient,
  onIncludePatient,
}: {
  statement: HospitalStatement;
  includePatient: boolean;
  onIncludePatient: (value: boolean) => void;
}) {
  return (
    <section className="hb-panel space-y-4" aria-label={HOSPITAL_BILLING_CONTENT.viewStatement}>
      <dl className="hb-strip">
        <div>
          <dt>Opening</dt>
          <dd>₹{formatRupees(statement.openingPaise)}</dd>
        </div>
        <div>
          <dt>Supplied</dt>
          <dd>₹{formatRupees(statement.suppliedPaise)}</dd>
        </div>
        <div>
          <dt>Credits</dt>
          <dd>₹{formatRupees(statement.creditsPaise)}</dd>
        </div>
        <div>
          <dt>Closing</dt>
          <dd>₹{formatRupees(statement.closingPaise)}</dd>
        </div>
      </dl>
      <HospitalAgeingStrip ageing={statement.ageing} />
      <label className="hb-check">
        <input
          type="checkbox"
          checked={includePatient}
          onChange={(event) => onIncludePatient(event.target.checked)}
        />
        {HOSPITAL_BILLING_CONTENT.includePatient}
      </label>
      <HospitalStatementTable lines={statement.lines} />
    </section>
  );
}
