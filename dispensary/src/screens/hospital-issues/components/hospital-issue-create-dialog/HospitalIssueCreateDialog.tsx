import { Button, Label } from '@atoms';
import { Dialog, DialogContent, DialogTitle } from '@molecules';
import type { HospitalIssueReason, HospitalWard } from '@/services/hospital';
import type { Product } from '@/services/products';
import { HOSPITAL_ISSUES_CONTENT } from '../../HospitalIssuesScreen.content';
import type { BatchOption, IssueDraft } from '../../HospitalIssuesScreen.utils';

type HospitalIssueCreateDialogProps = {
  open: boolean;
  draft: IssueDraft;
  wards: HospitalWard[];
  products: Product[];
  batchesByProduct: Record<string, BatchOption[]>;
  busy: boolean;
  message: string | null;
  onChange: (draft: IssueDraft) => void;
  onProductChange: (index: number, productId: string) => void;
  onClose: () => void;
  onSave: () => void;
};

export function HospitalIssueCreateDialog({
  open,
  draft,
  wards,
  products,
  batchesByProduct,
  busy,
  message,
  onChange,
  onProductChange,
  onClose,
  onSave,
}: HospitalIssueCreateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
        <DialogContent aria-describedby={undefined} className="hj-dialog">
        <DialogTitle>{HOSPITAL_ISSUES_CONTENT.newIssue}</DialogTitle>
        {message ? (
          <p className="hj-banner" role="alert" data-tone="warn">
            {message}
          </p>
        ) : null}
        <div className="grid gap-3">
          <div>
            <Label htmlFor="hj-ward">{HOSPITAL_ISSUES_CONTENT.wardLabel}</Label>
            <select
              id="hj-ward"
              aria-label={HOSPITAL_ISSUES_CONTENT.wardLabel}
              value={draft.wardId}
              onChange={(event) => onChange({ ...draft, wardId: event.target.value })}
            >
              <option value="">Select ward</option>
              {wards.map((ward) => (
                <option key={ward.id} value={ward.id}>
                  {ward.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="hj-reason">{HOSPITAL_ISSUES_CONTENT.reasonLabel}</Label>
            <select
              id="hj-reason"
              aria-label={HOSPITAL_ISSUES_CONTENT.reasonLabel}
              value={draft.reason}
              onChange={(event) =>
                onChange({ ...draft, reason: event.target.value as HospitalIssueReason })
              }
            >
              <option value="FLOOR_STOCK">Floor stock</option>
              <option value="CONSUMPTION">Consumption</option>
              <option value="PATIENT_REFILL">Patient refill</option>
            </select>
          </div>
          <div>
            <Label htmlFor="hj-uhid">{HOSPITAL_ISSUES_CONTENT.uhidLabel}</Label>
            <input
              id="hj-uhid"
              aria-label={HOSPITAL_ISSUES_CONTENT.uhidLabel}
              value={draft.uhid}
              onChange={(event) => onChange({ ...draft, uhid: event.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="hj-patient">{HOSPITAL_ISSUES_CONTENT.patientLabel}</Label>
            <input
              id="hj-patient"
              aria-label={HOSPITAL_ISSUES_CONTENT.patientLabel}
              value={draft.patientName}
              onChange={(event) => onChange({ ...draft, patientName: event.target.value })}
            />
          </div>
          {draft.lines.map((line, index) => {
            const batches = batchesByProduct[line.productId] ?? [];
            return (
              <div key={`line-${index}`} className="grid gap-2 sm:grid-cols-3">
                <div>
                  <Label htmlFor={`hj-product-${index}`}>{HOSPITAL_ISSUES_CONTENT.medicineLabel}</Label>
                  <select
                    id={`hj-product-${index}`}
                    aria-label={HOSPITAL_ISSUES_CONTENT.medicineLabel}
                    value={line.productId}
                    onChange={(event) => onProductChange(index, event.target.value)}
                  >
                    <option value="">Select medicine</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor={`hj-batch-${index}`}>{HOSPITAL_ISSUES_CONTENT.batchLabel}</Label>
                  <select
                    id={`hj-batch-${index}`}
                    aria-label={HOSPITAL_ISSUES_CONTENT.batchLabel}
                    value={line.batchId}
                    onChange={(event) => {
                      const next = [...draft.lines];
                      const selected = batches.find((batch) => batch.batchId === event.target.value);
                      next[index] = {
                        ...line,
                        batchId: event.target.value,
                        batchLabel: selected?.label ?? '',
                      };
                      onChange({ ...draft, lines: next });
                    }}
                  >
                    <option value="">Select batch</option>
                    {batches.map((batch) => (
                      <option key={batch.batchId} value={batch.batchId}>
                        {batch.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor={`hj-qty-${index}`}>{HOSPITAL_ISSUES_CONTENT.quantityLabel}</Label>
                  <input
                    id={`hj-qty-${index}`}
                    aria-label={HOSPITAL_ISSUES_CONTENT.quantityLabel}
                    value={line.quantity}
                    onChange={(event) => {
                      const next = [...draft.lines];
                      next[index] = { ...line, quantity: event.target.value };
                      onChange({ ...draft, lines: next });
                    }}
                  />
                </div>
              </div>
            );
          })}
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              onChange({
                ...draft,
                lines: [
                  ...draft.lines,
                  { productId: '', productName: '', batchId: '', batchLabel: '', quantity: '' },
                ],
              })
            }
          >
            {HOSPITAL_ISSUES_CONTENT.addLine}
          </Button>
        </div>
        <div className="hj-actions mt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            {HOSPITAL_ISSUES_CONTENT.cancelDialog}
          </Button>
          <Button type="button" disabled={busy} onClick={onSave}>
            {HOSPITAL_ISSUES_CONTENT.saveIssue}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
