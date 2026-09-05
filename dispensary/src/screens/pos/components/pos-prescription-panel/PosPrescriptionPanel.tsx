import { Input, Label } from '@atoms';
import type { Doctor } from '@/services/doctors';
import type { PrescriptionFulfillmentItem } from '@/services/salesInvoices';
import { PosControlledGate } from '../pos-controlled-gate';
import type { PosDraftLine } from '../pos-draft-lines';
import type { PageStatus } from '../../PosScreen.utils';

export type PosPrescriptionPanelProps = {
  lines: PosDraftLine[];
  prescriptionReference: string;
  onPrescriptionReferenceChange: (value: string) => void;
  prescriptionVerified: boolean;
  onPrescriptionVerifiedChange: (checked: boolean) => void;
  onPrescribedQuantityChange: (productId: string, value: string) => void;
  doctors: Doctor[];
  selectedDoctorId: string;
  onDoctorChange: (doctorId: string) => void;
  canDispense: boolean;
  controlled: boolean;
  lookupStatus: PageStatus;
  lookupItems: PrescriptionFulfillmentItem[];
  busy: boolean;
};

export function PosPrescriptionPanel({
  lines,
  prescriptionReference,
  onPrescriptionReferenceChange,
  prescriptionVerified,
  onPrescriptionVerifiedChange,
  onPrescribedQuantityChange,
  doctors,
  selectedDoctorId,
  onDoctorChange,
  canDispense,
  controlled,
  lookupStatus,
  lookupItems,
  busy,
}: PosPrescriptionPanelProps) {
  const rxLines = lines.filter(
    (line) => line.product.prescriptionRequired || line.product.controlledSubstance,
  );
  return (
    <section
      className="space-y-3 rounded border border-line bg-surface p-3"
      aria-label="Prescription"
    >
      <div>
        <h2 className="text-sm font-semibold text-ink">Prescription</h2>
        <p className="text-xs text-muted">
          Tick Prescription checked and keep the Rx reference. Later visits show what is still on
          this Rx.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="pos-rx-reference">Rx reference</Label>
        <Input
          id="pos-rx-reference"
          value={prescriptionReference}
          onChange={(event) => onPrescriptionReferenceChange(event.target.value)}
          disabled={busy || (controlled && !canDispense)}
          autoComplete="off"
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          id="pos-rx-checked"
          type="checkbox"
          className="size-4 accent-brand"
          checked={prescriptionVerified}
          onChange={(event) => onPrescriptionVerifiedChange(event.target.checked)}
          disabled={busy || (controlled && !canDispense)}
        />
        <Label htmlFor="pos-rx-checked">Prescription checked</Label>
      </div>
      {rxLines.map((line) => (
        <div key={line.product.id} className="space-y-1.5">
          <Label htmlFor={`pos-rx-prescribed-${line.product.id}`}>
            Prescribed qty for {line.product.name}
          </Label>
          <Input
            id={`pos-rx-prescribed-${line.product.id}`}
            inputMode="decimal"
            value={line.prescribedQuantity}
            onChange={(event) => onPrescribedQuantityChange(line.product.id, event.target.value)}
            disabled={busy || (controlled && !canDispense)}
          />
        </div>
      ))}
      {lookupStatus === 'loading' ? <p className="text-xs text-muted">Checking this Rx…</p> : null}
      {lookupStatus === 'empty' ? (
        <p className="text-xs text-muted">No fills on this Rx yet.</p>
      ) : null}
      {lookupStatus === 'conflict' ? (
        <p role="alert" className="text-sm text-ink">
          That Rx reference is already on another patient.
        </p>
      ) : null}
      {lookupStatus === 'failure' ? (
        <p role="alert" className="text-sm text-ink">
          Could not check this Rx. Check the connection and try again.
        </p>
      ) : null}
      {lookupStatus === 'success' && lookupItems.length > 0
        ? lookupItems.map((item) => {
            const name =
              rxLines.find((line) => line.product.id === item.productId)?.product.name ??
              'this medicine';
            return (
              <p key={item.productId} className="font-mono text-xs text-muted">
                Still on this Rx: {item.remainingQuantity} of {item.prescribedQuantity} left for{' '}
                {name} ({item.fulfilledQuantity} already billed).
              </p>
            );
          })
        : null}
      {controlled ? (
        <PosControlledGate
          doctors={doctors}
          selectedDoctorId={selectedDoctorId}
          onDoctorChange={onDoctorChange}
          canDispense={canDispense}
          busy={busy}
        />
      ) : null}
    </section>
  );
}
