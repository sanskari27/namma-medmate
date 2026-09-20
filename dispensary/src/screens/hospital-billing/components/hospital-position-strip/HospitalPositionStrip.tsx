import { HOSPITAL_BILLING_CONTENT } from '../../HospitalBillingScreen.content';
import { formatRupees } from '../../HospitalBillingScreen.utils';

export function HospitalPositionStrip({
  creditLimitPaise,
  balancePaise,
  availableCreditPaise,
}: {
  creditLimitPaise: number;
  balancePaise: number;
  availableCreditPaise: number;
}) {
  return (
    <dl className="hb-strip" aria-label="Hospital credit position">
      <div>
        <dt>{HOSPITAL_BILLING_CONTENT.positionLimit}</dt>
        <dd>₹{formatRupees(creditLimitPaise)}</dd>
      </div>
      <div>
        <dt>{HOSPITAL_BILLING_CONTENT.positionBalance}</dt>
        <dd>₹{formatRupees(balancePaise)}</dd>
      </div>
      <div>
        <dt>{HOSPITAL_BILLING_CONTENT.positionAvailable}</dt>
        <dd>₹{formatRupees(availableCreditPaise)}</dd>
      </div>
    </dl>
  );
}
