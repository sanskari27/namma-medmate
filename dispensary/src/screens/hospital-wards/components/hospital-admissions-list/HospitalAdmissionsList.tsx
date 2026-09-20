import type { HospitalAdmission } from '@/services/hospital';
import { HOSPITAL_WARDS_CONTENT } from '../../HospitalWardsScreen.content';
import { payerSummary } from '../../HospitalWardsScreen.utils';

type Props = {
  admissions: HospitalAdmission[];
  selectedBedId: string | null;
  onSelect: (admission: HospitalAdmission) => void;
};

export function HospitalAdmissionsList({ admissions, selectedBedId, onSelect }: Props) {
  if (admissions.length === 0) {
    return (
      <section className="hw-admissions" aria-label={HOSPITAL_WARDS_CONTENT.admissionsListLabel}>
        <p className="hw-admissions-empty">{HOSPITAL_WARDS_CONTENT.admissionsEmpty}</p>
      </section>
    );
  }

  return (
    <section className="hw-admissions" aria-label={HOSPITAL_WARDS_CONTENT.admissionsListLabel}>
      <div className="hw-admissions-head">
        <span>{HOSPITAL_WARDS_CONTENT.uhidLabel}</span>
        <span>{HOSPITAL_WARDS_CONTENT.patientNameLabel}</span>
        <span>{HOSPITAL_WARDS_CONTENT.wardBedLabel}</span>
        <span>{HOSPITAL_WARDS_CONTENT.payerLabel}</span>
      </div>
      {admissions.map((admission) => (
        <button
          key={admission.id}
          type="button"
          className="hw-admissions-row"
          data-selected={selectedBedId === admission.bedId ? 'true' : 'false'}
          onClick={() => onSelect(admission)}
        >
          <span className="font-mono text-sm">{admission.uhid}</span>
          <span>{admission.patientName}</span>
          <span>
            {admission.wardName} · {admission.bedLabel}
          </span>
          <span>{payerSummary(admission.payerType, admission.insurerName, admission.policyNumber)}</span>
        </button>
      ))}
    </section>
  );
}
