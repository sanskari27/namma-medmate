import { Input, Label } from '@atoms';
import type { HospitalDoctor } from '@/services/hospital';
import { HOSPITAL_WARDS_CONTENT } from '../../HospitalWardsScreen.content';
import type { AdmitDraft } from '../../HospitalWardsScreen.utils';

type Props = {
  draft: AdmitDraft;
  doctors: HospitalDoctor[];
  disabled: boolean;
  onChange: (patch: Partial<AdmitDraft>) => void;
};

export function HospitalAdmitStayFields({ draft, doctors, disabled, onChange }: Props) {
  return (
    <div className="hw-admit-grid">
      <div className="hw-admit-span-2">
        <Label htmlFor="hw-admit-bed">{HOSPITAL_WARDS_CONTENT.wardBedLabel}</Label>
        <Input
          id="hw-admit-bed"
          aria-label={HOSPITAL_WARDS_CONTENT.wardBedLabel}
          value={`${draft.wardName} · ${draft.bedLabel}`}
          readOnly
          disabled
        />
      </div>
      <div>
        <Label htmlFor="hw-admit-attending">{HOSPITAL_WARDS_CONTENT.attendingLabel}</Label>
        <select
          id="hw-admit-attending"
          aria-label={HOSPITAL_WARDS_CONTENT.attendingLabel}
          className="hw-select"
          value={draft.attendingDoctorId}
          disabled={disabled}
          onChange={(event) => onChange({ attendingDoctorId: event.target.value })}
        >
          <option value="">Optional</option>
          {doctors.map((doctor) => (
            <option key={doctor.id} value={doctor.id}>
              {doctor.name}
            </option>
          ))}
        </select>
      </div>
      <div className="hw-admit-span-2">
        <Label htmlFor="hw-admit-diagnosis">{HOSPITAL_WARDS_CONTENT.diagnosisLabel}</Label>
        <Input
          id="hw-admit-diagnosis"
          aria-label={HOSPITAL_WARDS_CONTENT.diagnosisLabel}
          value={draft.diagnosis}
          disabled={disabled}
          onChange={(event) => onChange({ diagnosis: event.target.value })}
        />
      </div>
    </div>
  );
}
