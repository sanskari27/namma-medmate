import { Button } from '@atoms';
import type { Doctor, TopReferringDoctor } from '@/services/doctors';
import { Stethoscope } from 'lucide-react';
import type { RefObject } from 'react';

export type CustomerDoctorSectionProps = {
  doctors: Doctor[];
  topReferring: TopReferringDoctor[];
  loading: boolean;
  addButtonRef?: RefObject<HTMLButtonElement | null>;
  onAdd: () => void;
};

export function CustomerDoctorSection({
  doctors,
  topReferring,
  loading,
  addButtonRef,
  onAdd,
}: CustomerDoctorSectionProps) {
  return (
    <div className="grid gap-3 border-t border-line pt-4" aria-label="Doctor references">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <Stethoscope className="size-3.5 shrink-0 text-brand" aria-hidden />
            <p className="font-mono text-[11px] tracking-wide text-muted">Doctor references</p>
          </div>
          <p className="mt-1 text-sm text-muted">
            Staff-managed referring doctors — no portal login in Phase 1.
          </p>
        </div>
        <Button
          ref={addButtonRef}
          type="button"
          variant="outline"
          onClick={onAdd}
          aria-haspopup="dialog"
        >
          Add doctor
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted" role="status">
          Loading doctors…
        </p>
      ) : (
        <>
          {topReferring.length > 0 ? (
            <div className="grid gap-1.5" aria-label="Top referring doctors">
              <p className="text-xs text-muted">Top referring</p>
              <ul className="grid gap-1">
                {topReferring.map((row) => (
                  <li
                    key={row.id}
                    className="flex flex-wrap items-baseline justify-between gap-2 border border-line px-2.5 py-1.5 text-sm"
                  >
                    <span className="font-medium text-ink">{row.name}</span>
                    <span className="font-mono text-xs tabular-nums text-muted">
                      {row.referralCount} referral{row.referralCount === 1 ? '' : 's'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {doctors.length === 0 ? (
            <p className="text-sm text-muted">No doctor references on this counter yet.</p>
          ) : (
            <ul className="grid gap-1.5">
              {doctors.map((doctor) => (
                <li key={doctor.id} className="border border-line px-2.5 py-1.5 text-sm">
                  <p className="font-medium text-ink">{doctor.name}</p>
                  <p className="font-mono text-xs text-muted">
                    {doctor.registrationNumber ?? 'No registration'}
                    {doctor.phone ? ` · ${doctor.phone}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
