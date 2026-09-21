import { Label } from '@atoms';
import { HOSPITAL_PATIENTS_CONTENT } from '../../HospitalPatientsScreen.content';
import {
  SETTLE_MODES,
  settleModeLabel,
  type SettleDraft,
} from '../../HospitalPatientsScreen.utils';

type Props = {
  idPrefix: string;
  draft: SettleDraft;
  disabled: boolean;
  onChange: (draft: SettleDraft) => void;
};

export function HospitalPatientsSettleFields({ idPrefix, draft, disabled, onChange }: Props) {
  return (
    <div className="hp-settle">
      <div>
        <Label htmlFor={`${idPrefix}-mode`}>{HOSPITAL_PATIENTS_CONTENT.paymentModeLabel}</Label>
        <select
          id={`${idPrefix}-mode`}
          aria-label={HOSPITAL_PATIENTS_CONTENT.paymentModeLabel}
          value={draft.paymentMode}
          disabled={disabled}
          onChange={(event) =>
            onChange({ ...draft, paymentMode: event.target.value as SettleDraft['paymentMode'] })
          }
        >
          <option value="">Select</option>
          {SETTLE_MODES.map((mode) => (
            <option key={mode} value={mode}>
              {settleModeLabel(mode)}
            </option>
          ))}
        </select>
      </div>
      {draft.paymentMode === 'INSURANCE_TPA' ? (
        <>
          <div>
            <Label htmlFor={`${idPrefix}-insurer`}>{HOSPITAL_PATIENTS_CONTENT.insurerLabel}</Label>
            <input
              id={`${idPrefix}-insurer`}
              aria-label={HOSPITAL_PATIENTS_CONTENT.insurerLabel}
              value={draft.insurerName}
              disabled={disabled}
              onChange={(event) => onChange({ ...draft, insurerName: event.target.value })}
            />
          </div>
          <div>
            <Label htmlFor={`${idPrefix}-policy`}>{HOSPITAL_PATIENTS_CONTENT.policyLabel}</Label>
            <input
              id={`${idPrefix}-policy`}
              aria-label={HOSPITAL_PATIENTS_CONTENT.policyLabel}
              value={draft.policyNumber}
              disabled={disabled}
              onChange={(event) => onChange({ ...draft, policyNumber: event.target.value })}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
