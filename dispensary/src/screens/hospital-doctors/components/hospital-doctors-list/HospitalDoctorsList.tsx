import { Button } from '@atoms';
import type { HospitalDoctor } from '@/services/hospital';
import { HOSPITAL_DOCTORS_CONTENT } from '../../HospitalDoctorsScreen.content';
import { statusLabel } from '../../HospitalDoctorsScreen.utils';

type Props = {
  doctors: HospitalDoctor[];
  onEdit: (doctor: HospitalDoctor, trigger: HTMLButtonElement) => void;
};

export function HospitalDoctorsList({ doctors, onEdit }: Props) {
  return (
    <section className="hdoc-list" aria-label={HOSPITAL_DOCTORS_CONTENT.listLabel}>
      <div className="hdoc-row hdoc-row-head">
        <span>{HOSPITAL_DOCTORS_CONTENT.nameLabel}</span>
        <span>{HOSPITAL_DOCTORS_CONTENT.specialtyLabel}</span>
        <span>{HOSPITAL_DOCTORS_CONTENT.departmentLabel}</span>
        <span>{HOSPITAL_DOCTORS_CONTENT.statusLabel}</span>
        <span aria-hidden="true" />
      </div>
      {doctors.map((doctor) => (
        <div key={doctor.doctorId} className="hdoc-row">
          <span>{doctor.name}</span>
          <span>{doctor.specialty ?? '—'}</span>
          <span>{doctor.departmentName ?? '—'}</span>
          <span>{statusLabel(doctor.status)}</span>
          <Button type="button" variant="outline" onClick={(event) => onEdit(doctor, event.currentTarget)}>
            {HOSPITAL_DOCTORS_CONTENT.editDoctor}
          </Button>
        </div>
      ))}
    </section>
  );
}
