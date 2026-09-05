import { Label } from '@atoms';
import type { Doctor } from '@/services/doctors';

export type PosControlledGateProps = {
  doctors: Doctor[];
  selectedDoctorId: string;
  onDoctorChange: (doctorId: string) => void;
  canDispense: boolean;
  busy: boolean;
};

export function PosControlledGate({
  doctors,
  selectedDoctorId,
  onDoctorChange,
  canDispense,
  busy,
}: PosControlledGateProps) {
  return (
    <div className="space-y-3 border-t border-line pt-3" aria-label="Schedule dispense">
      <div>
        <h3 className="text-sm font-semibold text-ink">Schedule H / H1 / X / NDPS</h3>
        <p className="text-xs text-muted">
          {canDispense
            ? 'Pharmacist or owner must link the prescriber before these packs leave the till.'
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
    </div>
  );
}
