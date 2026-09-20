import { Input, Label } from '@atoms';
import { HOSPITAL_WARDS_CONTENT } from '../../HospitalWardsScreen.content';
import type { AdmitDraft } from '../../HospitalWardsScreen.utils';

type Props = {
  draft: AdmitDraft;
  disabled: boolean;
  onChange: (patch: Partial<AdmitDraft>) => void;
};

export function HospitalAdmitPayerFields({ draft, disabled, onChange }: Props) {
  const tpa = draft.payerType === 'INSURANCE_TPA';

  return (
    <div className="hw-admit-grid">
      <fieldset className="hw-admit-span-2 hw-payer-fieldset">
        <legend>{HOSPITAL_WARDS_CONTENT.payerLabel}</legend>
        <label className="hw-payer-option">
          <input
            type="radio"
            name="hw-payer"
            checked={draft.payerType === 'SELF_PAY'}
            disabled={disabled}
            onChange={() => onChange({ payerType: 'SELF_PAY' })}
          />
          {HOSPITAL_WARDS_CONTENT.payerSelfPay}
        </label>
        <label className="hw-payer-option">
          <input
            type="radio"
            name="hw-payer"
            checked={tpa}
            disabled={disabled}
            onChange={() => onChange({ payerType: 'INSURANCE_TPA' })}
          />
          {HOSPITAL_WARDS_CONTENT.payerTpa}
        </label>
      </fieldset>
      {tpa ? (
        <>
          <div>
            <Label htmlFor="hw-admit-insurer">{HOSPITAL_WARDS_CONTENT.insurerLabel}</Label>
            <Input
              id="hw-admit-insurer"
              aria-label={HOSPITAL_WARDS_CONTENT.insurerLabel}
              value={draft.insurerName}
              disabled={disabled}
              onChange={(event) => onChange({ insurerName: event.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="hw-admit-policy">{HOSPITAL_WARDS_CONTENT.policyLabel}</Label>
            <Input
              id="hw-admit-policy"
              aria-label={HOSPITAL_WARDS_CONTENT.policyLabel}
              value={draft.policyNumber}
              disabled={disabled}
              onChange={(event) => onChange({ policyNumber: event.target.value })}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
