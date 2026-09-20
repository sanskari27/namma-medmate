import { Input, Label } from '@atoms';
import type { HospitalDoctor } from '@/services/hospital';
import { HOSPITAL_DEPARTMENTS_CONTENT } from '../../HospitalDepartmentsScreen.content';
import {
  DEPARTMENT_TYPES,
  type DepartmentDraft,
  typeLabel,
} from '../../HospitalDepartmentsScreen.utils';

type Props = {
  draft: DepartmentDraft;
  doctors: HospitalDoctor[];
  disabled: boolean;
  onChange: (patch: Partial<DepartmentDraft>) => void;
};

export function HospitalDepartmentFields({ draft, doctors, disabled, onChange }: Props) {
  return (
    <div className="grid gap-3">
      <div className="space-y-1">
        <Label htmlFor="hd-name">{HOSPITAL_DEPARTMENTS_CONTENT.nameLabel}</Label>
        <Input
          id="hd-name"
          aria-label={HOSPITAL_DEPARTMENTS_CONTENT.nameLabel}
          value={draft.name}
          disabled={disabled}
          onChange={(event) => onChange({ name: event.target.value })}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="hd-type">{HOSPITAL_DEPARTMENTS_CONTENT.typeLabel}</Label>
        <select
          id="hd-type"
          className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm"
          aria-label={HOSPITAL_DEPARTMENTS_CONTENT.typeLabel}
          value={draft.type}
          disabled={disabled}
          onChange={(event) => onChange({ type: event.target.value as DepartmentDraft['type'] })}
        >
          {DEPARTMENT_TYPES.map((type) => (
            <option key={type} value={type}>
              {typeLabel(type)}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="hd-head">{HOSPITAL_DEPARTMENTS_CONTENT.headDoctorLabel}</Label>
        <select
          id="hd-head"
          className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm"
          aria-label={HOSPITAL_DEPARTMENTS_CONTENT.headDoctorLabel}
          value={draft.headDoctorId || ''}
          disabled={disabled}
          onChange={(event) => onChange({ headDoctorId: event.target.value })}
        >
          <option value="">No head doctor</option>
          {doctors.map((doctor) => (
            <option key={doctor.doctorId} value={doctor.doctorId}>
              {doctor.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
