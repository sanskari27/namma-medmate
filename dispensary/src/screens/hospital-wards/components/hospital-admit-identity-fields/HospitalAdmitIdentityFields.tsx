import { Input, Label } from '@atoms';
import { HOSPITAL_WARDS_CONTENT } from '../../HospitalWardsScreen.content';
import type { AdmitDraft } from '../../HospitalWardsScreen.utils';

type Props = {
  draft: AdmitDraft;
  disabled: boolean;
  onChange: (patch: Partial<AdmitDraft>) => void;
};

export function HospitalAdmitIdentityFields({ draft, disabled, onChange }: Props) {
  return (
    <div className="hw-admit-grid">
      <div>
        <Label htmlFor="hw-admit-name">{HOSPITAL_WARDS_CONTENT.patientNameLabel}</Label>
        <Input
          id="hw-admit-name"
          aria-label={HOSPITAL_WARDS_CONTENT.patientNameLabel}
          value={draft.patientName}
          disabled={disabled}
          onChange={(event) => onChange({ patientName: event.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="hw-admit-uhid">{HOSPITAL_WARDS_CONTENT.uhidLabel}</Label>
        <Input
          id="hw-admit-uhid"
          aria-label={HOSPITAL_WARDS_CONTENT.uhidLabel}
          value={draft.uhid}
          disabled={disabled}
          onChange={(event) => onChange({ uhid: event.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="hw-admit-phone">{HOSPITAL_WARDS_CONTENT.phoneLabel}</Label>
        <Input
          id="hw-admit-phone"
          aria-label={HOSPITAL_WARDS_CONTENT.phoneLabel}
          value={draft.phone}
          disabled={disabled}
          onChange={(event) => onChange({ phone: event.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="hw-admit-age">{HOSPITAL_WARDS_CONTENT.ageLabel}</Label>
        <Input
          id="hw-admit-age"
          aria-label={HOSPITAL_WARDS_CONTENT.ageLabel}
          inputMode="numeric"
          value={draft.age}
          disabled={disabled}
          onChange={(event) => onChange({ age: event.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="hw-admit-gender">{HOSPITAL_WARDS_CONTENT.genderLabel}</Label>
        <Input
          id="hw-admit-gender"
          aria-label={HOSPITAL_WARDS_CONTENT.genderLabel}
          value={draft.gender}
          disabled={disabled}
          onChange={(event) => onChange({ gender: event.target.value })}
        />
      </div>
    </div>
  );
}
