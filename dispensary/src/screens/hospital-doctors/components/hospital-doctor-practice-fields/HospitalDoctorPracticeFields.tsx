import { Input, Label } from '@atoms';
import type { HospitalDepartment } from '@/services/hospital';
import { HOSPITAL_DOCTORS_CONTENT } from '../../HospitalDoctorsScreen.content';
import {
  DOCTOR_STATUSES,
  statusLabel,
  type DoctorDraft,
} from '../../HospitalDoctorsScreen.utils';

type Props = {
  draft: DoctorDraft;
  departments: HospitalDepartment[];
  disabled: boolean;
  onChange: (patch: Partial<DoctorDraft>) => void;
};

export function HospitalDoctorPracticeFields({ draft, departments, disabled, onChange }: Props) {
  return (
    <div className="hdoc-fields">
      <p className="hdoc-section-title">Practice</p>
      <div className="space-y-1">
        <Label htmlFor="hdoc-dept">{HOSPITAL_DOCTORS_CONTENT.departmentLabel}</Label>
        <select
          id="hdoc-dept"
          className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm"
          aria-label={HOSPITAL_DOCTORS_CONTENT.departmentLabel}
          value={draft.departmentId || ''}
          disabled={disabled}
          onChange={(event) => onChange({ departmentId: event.target.value })}
        >
          <option value="">No department</option>
          {departments.map((department) => (
            <option key={department.id} value={department.id}>
              {department.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="hdoc-room">{HOSPITAL_DOCTORS_CONTENT.opdRoomLabel}</Label>
        <Input
          id="hdoc-room"
          aria-label={HOSPITAL_DOCTORS_CONTENT.opdRoomLabel}
          value={draft.opdRoom}
          disabled={disabled}
          onChange={(event) => onChange({ opdRoom: event.target.value })}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="hdoc-days">{HOSPITAL_DOCTORS_CONTENT.consultingDaysLabel}</Label>
        <Input
          id="hdoc-days"
          aria-label={HOSPITAL_DOCTORS_CONTENT.consultingDaysLabel}
          value={draft.consultingDays}
          disabled={disabled}
          onChange={(event) => onChange({ consultingDays: event.target.value })}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="hdoc-hours">{HOSPITAL_DOCTORS_CONTENT.consultingHoursLabel}</Label>
        <Input
          id="hdoc-hours"
          aria-label={HOSPITAL_DOCTORS_CONTENT.consultingHoursLabel}
          value={draft.consultingHours}
          disabled={disabled}
          onChange={(event) => onChange({ consultingHours: event.target.value })}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="hdoc-fee">{HOSPITAL_DOCTORS_CONTENT.feeLabel}</Label>
        <Input
          id="hdoc-fee"
          aria-label={HOSPITAL_DOCTORS_CONTENT.feeLabel}
          inputMode="decimal"
          value={draft.consultationFeeRupees}
          disabled={disabled}
          onChange={(event) => onChange({ consultationFeeRupees: event.target.value })}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="hdoc-exp">{HOSPITAL_DOCTORS_CONTENT.experienceLabel}</Label>
        <Input
          id="hdoc-exp"
          aria-label={HOSPITAL_DOCTORS_CONTENT.experienceLabel}
          inputMode="numeric"
          value={draft.experienceYears}
          disabled={disabled}
          onChange={(event) => onChange({ experienceYears: event.target.value })}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="hdoc-status">{HOSPITAL_DOCTORS_CONTENT.statusLabel}</Label>
        <select
          id="hdoc-status"
          className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm"
          aria-label={HOSPITAL_DOCTORS_CONTENT.statusLabel}
          value={draft.status}
          disabled={disabled}
          onChange={(event) => onChange({ status: event.target.value as DoctorDraft['status'] })}
        >
          {DOCTOR_STATUSES.map((status) => (
            <option key={status} value={status}>
              {statusLabel(status)}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="hdoc-notes">{HOSPITAL_DOCTORS_CONTENT.notesLabel}</Label>
        <Input
          id="hdoc-notes"
          aria-label={HOSPITAL_DOCTORS_CONTENT.notesLabel}
          value={draft.notes}
          disabled={disabled}
          onChange={(event) => onChange({ notes: event.target.value })}
        />
      </div>
    </div>
  );
}
