import { Label } from '@atoms';
import type { Doctor } from '@/services/doctors';

export type PosControlledGateProps = {
  doctors: Doctor[];
  selectedDoctorId: string;
  onDoctorChange: (doctorId: string) => void;
  prescriptionVerified: boolean;
  onPrescriptionVerifiedChange: (checked: boolean) => void;
  canDispense: boolean;
  busy: boolean;
};

export function PosControlledGate({
  doctors,
  selectedDoctorId,
  onDoctorChange,
  prescriptionVerified,
  onPrescriptionVerifiedChange,
  canDispense,
  busy,
}: PosControlledGateProps) {
  return (
    <section
      className="space-y-3 rounded border border-line bg-surface p-3"
      aria-label="Schedule dispense"
    >
      <div>
        <h2 className="text-sm font-semibold text-ink">Schedule H / H1 / X / NDPS</h2>
        <p className="text-xs text-muted">
          {canDispense
            ? 'Pharmacist or owner must link the prescriber and tick that the prescription was checked.'
            : 'Cashier-only logins cannot dispense these packs. Call a pharmacist to this till.'}
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="pos-prescriber">Prescriber</Label>
        <select
          id="pos-prescriber"
          className="w-full rounded border border-line bg-canvas px-2 py-1.5 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          value={selectedDoctorId}
          onChange={(event) => onDoctorChange(event.target.value)}
          disabled={busy || !canDispense}
          aria-required
        >
          <option value="">Select prescriber</option>
          {doctors.map((doctor) => (
            <option key={doctor.id} value={doctor.id}>
              {doctor.name}
              {doctor.registrationNumber ? ` · ${doctor.registrationNumber}` : ''}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <input
          id="pos-rx-checked"
          type="checkbox"
          className="size-4 accent-brand"
          checked={prescriptionVerified}
          onChange={(event) => onPrescriptionVerifiedChange(event.target.checked)}
          disabled={busy || !canDispense}
        />
        <Label htmlFor="pos-rx-checked">Prescription checked</Label>
      </div>
    </section>
  );
}
