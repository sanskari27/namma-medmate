import { Input, Label } from '@atoms';
import { HOSPITAL_DOCTORS_CONTENT } from '../../HospitalDoctorsScreen.content';
import type { DoctorDraft } from '../../HospitalDoctorsScreen.utils';

type Props = {
  draft: DoctorDraft;
  disabled: boolean;
  onChange: (patch: Partial<DoctorDraft>) => void;
};

export function HospitalDoctorContactFields({ draft, disabled, onChange }: Props) {
  return (
    <div className="hdoc-fields">
      <p className="hdoc-section-title">Contact</p>
      <div className="space-y-1">
        <Label htmlFor="hdoc-phone">{HOSPITAL_DOCTORS_CONTENT.phoneLabel}</Label>
        <Input
          id="hdoc-phone"
          aria-label={HOSPITAL_DOCTORS_CONTENT.phoneLabel}
          value={draft.phone}
          disabled={disabled}
          onChange={(event) => onChange({ phone: event.target.value })}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="hdoc-email">{HOSPITAL_DOCTORS_CONTENT.emailLabel}</Label>
        <Input
          id="hdoc-email"
          aria-label={HOSPITAL_DOCTORS_CONTENT.emailLabel}
          value={draft.email}
          disabled={disabled}
          onChange={(event) => onChange({ email: event.target.value })}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="hdoc-gender">{HOSPITAL_DOCTORS_CONTENT.genderLabel}</Label>
        <Input
          id="hdoc-gender"
          aria-label={HOSPITAL_DOCTORS_CONTENT.genderLabel}
          value={draft.gender}
          disabled={disabled}
          onChange={(event) => onChange({ gender: event.target.value })}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="hdoc-lang">{HOSPITAL_DOCTORS_CONTENT.languagesLabel}</Label>
        <Input
          id="hdoc-lang"
          aria-label={HOSPITAL_DOCTORS_CONTENT.languagesLabel}
          value={draft.languages}
          disabled={disabled}
          onChange={(event) => onChange({ languages: event.target.value })}
        />
      </div>
    </div>
  );
}
