import type { HospitalStatementAging } from '@/services/hospital';
import { HOSPITAL_BILLING_CONTENT } from '../../HospitalBillingScreen.content';
import { formatRupees } from '../../HospitalBillingScreen.utils';

export function HospitalAgeingStrip({ ageing }: { ageing: HospitalStatementAging }) {
  return (
    <dl className="hb-ageing" aria-label={HOSPITAL_BILLING_CONTENT.ageingLabel}>
      <div>
        <dt>{HOSPITAL_BILLING_CONTENT.ageing030}</dt>
        <dd>₹{formatRupees(ageing.d0_30)}</dd>
      </div>
      <div>
        <dt>{HOSPITAL_BILLING_CONTENT.ageing3160}</dt>
        <dd>₹{formatRupees(ageing.d31_60)}</dd>
      </div>
      <div>
        <dt>{HOSPITAL_BILLING_CONTENT.ageing6190}</dt>
        <dd>₹{formatRupees(ageing.d61_90)}</dd>
      </div>
      <div>
        <dt>{HOSPITAL_BILLING_CONTENT.ageing90}</dt>
        <dd>₹{formatRupees(ageing.d90Plus)}</dd>
      </div>
      <div>
        <dt>{HOSPITAL_BILLING_CONTENT.overdueLabel}</dt>
        <dd>₹{formatRupees(ageing.overduePaise)}</dd>
      </div>
    </dl>
  );
}
