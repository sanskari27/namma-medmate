import { Input, Label } from '@atoms';
import { HOSPITAL_DOCTORS_CONTENT } from '../../HospitalDoctorsScreen.content';
import type { DoctorDraft } from '../../HospitalDoctorsScreen.utils';

type Props = {
  draft: DoctorDraft;
  disabled: boolean;
  onChange: (patch: Partial<DoctorDraft>) => void;
};

export function HospitalDoctorIdentityFields({ draft, disabled, onChange }: Props) {
  return (
    <div className="hdoc-fields">
      <p className="hdoc-section-title">Identity</p>
      <div className="space-y-1">
        <Label htmlFor="hdoc-name">{HOSPITAL_DOCTORS_CONTENT.nameLabel}</Label>
        <Input
          id="hdoc-name"
          aria-label={HOSPITAL_DOCTORS_CONTENT.nameLabel}
          value={draft.name}
          disabled={disabled}
          onChange={(event) => onChange({ name: event.target.value })}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="hdoc-reg">{HOSPITAL_DOCTORS_CONTENT.registrationLabel}</Label>
        <Input
          id="hdoc-reg"
          aria-label={HOSPITAL_DOCTORS_CONTENT.registrationLabel}
          value={draft.registrationNumber}
          disabled={disabled}
          onChange={(event) => onChange({ registrationNumber: event.target.value })}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="hdoc-qual">{HOSPITAL_DOCTORS_CONTENT.qualificationLabel}</Label>
        <Input
          id="hdoc-qual"
          aria-label={HOSPITAL_DOCTORS_CONTENT.qualificationLabel}
          value={draft.qualification}
          disabled={disabled}
          onChange={(event) => onChange({ qualification: event.target.value })}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="hdoc-spec">{HOSPITAL_DOCTORS_CONTENT.specialtyLabel}</Label>
        <Input
          id="hdoc-spec"
          aria-label={HOSPITAL_DOCTORS_CONTENT.specialtyLabel}
          value={draft.specialty}
          disabled={disabled}
          onChange={(event) => onChange({ specialty: event.target.value })}
        />
      </div>
    </div>
  );
}
