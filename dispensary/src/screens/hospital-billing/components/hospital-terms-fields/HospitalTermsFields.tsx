import { Input, Label } from '@atoms';
import type { HospitalCreditTerms } from '@/services/hospital';
import { HOSPITAL_BILLING_CONTENT } from '../../HospitalBillingScreen.content';
import { CREDIT_TERMS, creditTermsLabel } from '../../HospitalBillingScreen.utils';

export function HospitalTermsFields({
  creditTerms,
  creditLimitRupees,
  disabled,
  onCreditTerms,
  onCreditLimitRupees,
}: {
  creditTerms: HospitalCreditTerms;
  creditLimitRupees: string;
  disabled: boolean;
  onCreditTerms: (value: HospitalCreditTerms) => void;
  onCreditLimitRupees: (value: string) => void;
}) {
  return (
    <div className="hb-fields">
      <div className="space-y-1.5">
        <Label htmlFor="hb-terms">{HOSPITAL_BILLING_CONTENT.creditTermsLabel}</Label>
        <select
          id="hb-terms"
          className="w-full border border-line bg-canvas px-3 py-2 text-sm"
          value={creditTerms}
          disabled={disabled}
          onChange={(event) => onCreditTerms(event.target.value as HospitalCreditTerms)}
        >
          {CREDIT_TERMS.map((terms) => (
            <option key={terms} value={terms}>
              {creditTermsLabel(terms)}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="hb-limit">{HOSPITAL_BILLING_CONTENT.creditLimitLabel}</Label>
        <Input
          id="hb-limit"
          inputMode="decimal"
          value={creditLimitRupees}
          disabled={disabled}
          onChange={(event) => onCreditLimitRupees(event.target.value)}
        />
      </div>
    </div>
  );
}
