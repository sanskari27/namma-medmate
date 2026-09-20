import type { HospitalAdmission } from '@/services/hospital';
import { HOSPITAL_WARDS_CONTENT } from '../../HospitalWardsScreen.content';
import { formatIstDateTime, payerSummary } from '../../HospitalWardsScreen.utils';

type Props = {
  admission: HospitalAdmission;
  onClose: () => void;
};

export function HospitalOccupiedBedHeader({ admission, onClose }: Props) {
  return (
    <section className="hw-occupied" aria-label={HOSPITAL_WARDS_CONTENT.occupiedHeaderLabel}>
      <header className="hw-occupied-head">
        <div>
          <h2 className="text-sm font-semibold text-ink">
            {admission.patientName} · {admission.uhid}
          </h2>
          <p className="hw-ward-meta">
            {admission.wardName} · {admission.bedLabel}
          </p>
        </div>
        <button type="button" className="text-sm text-brand underline" onClick={onClose}>
          {HOSPITAL_WARDS_CONTENT.dismiss}
        </button>
      </header>
      <dl className="hw-occupied-grid">
        <div>
          <dt>{HOSPITAL_WARDS_CONTENT.attendingLabel}</dt>
          <dd>{admission.attendingDoctorName ?? HOSPITAL_WARDS_CONTENT.noAttending}</dd>
        </div>
        <div>
          <dt>{HOSPITAL_WARDS_CONTENT.diagnosisLabel}</dt>
          <dd>{admission.diagnosis ?? HOSPITAL_WARDS_CONTENT.noDiagnosis}</dd>
        </div>
        <div>
          <dt>{HOSPITAL_WARDS_CONTENT.payerLabel}</dt>
          <dd>
            {payerSummary(admission.payerType, admission.insurerName, admission.policyNumber)}
          </dd>
        </div>
        <div>
          <dt>{HOSPITAL_WARDS_CONTENT.admittedAtLabel}</dt>
          <dd>{formatIstDateTime(admission.admittedAt)}</dd>
        </div>
      </dl>
    </section>
  );
}
