import { Button } from '@atoms';
import type { HospitalDepartment } from '@/services/hospital';
import { HOSPITAL_DEPARTMENTS_CONTENT } from '../../HospitalDepartmentsScreen.content';
import { typeLabel } from '../../HospitalDepartmentsScreen.utils';

type Props = {
  departments: HospitalDepartment[];
  onEdit: (department: HospitalDepartment, trigger: HTMLButtonElement) => void;
};

export function HospitalDepartmentsList({ departments, onEdit }: Props) {
  return (
    <section className="hd-list" aria-label={HOSPITAL_DEPARTMENTS_CONTENT.listLabel}>
      <div className="hd-row hd-row-head">
        <span>{HOSPITAL_DEPARTMENTS_CONTENT.nameLabel}</span>
        <span>{HOSPITAL_DEPARTMENTS_CONTENT.typeLabel}</span>
        <span>{HOSPITAL_DEPARTMENTS_CONTENT.headDoctorLabel}</span>
        <span aria-hidden="true" />
      </div>
      {departments.map((department) => (
        <div key={department.id} className="hd-row">
          <span>{department.name}</span>
          <span>{typeLabel(department.type)}</span>
          <span>{department.headDoctorName ?? '—'}</span>
          <Button type="button" variant="outline" onClick={(event) => onEdit(department, event.currentTarget)}>
            {HOSPITAL_DEPARTMENTS_CONTENT.editDepartment}
          </Button>
        </div>
      ))}
    </section>
  );
}
