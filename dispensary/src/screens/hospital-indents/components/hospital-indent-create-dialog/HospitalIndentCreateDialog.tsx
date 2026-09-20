import { Button, Label } from '@atoms';
import { Dialog, DialogContent, DialogTitle } from '@molecules';
import type { HospitalWard } from '@/services/hospital';
import type { Product } from '@/services/products';
import { HOSPITAL_INDENTS_CONTENT } from '../../HospitalIndentsScreen.content';
import type { IndentDraft } from '../../HospitalIndentsScreen.utils';

type HospitalIndentCreateDialogProps = {
  open: boolean;
  draft: IndentDraft;
  wards: HospitalWard[];
  products: Product[];
  busy: boolean;
  message: string | null;
  onChange: (draft: IndentDraft) => void;
  onClose: () => void;
  onSave: () => void;
};

export function HospitalIndentCreateDialog({
  open,
  draft,
  wards,
  products,
  busy,
  message,
  onChange,
  onClose,
  onSave,
}: HospitalIndentCreateDialogProps) {
  const selectedWard = wards.find((ward) => ward.id === draft.wardId);
  const beds = selectedWard?.beds ?? [];

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent aria-describedby={undefined}>
        <DialogTitle>{HOSPITAL_INDENTS_CONTENT.recordIndent}</DialogTitle>
        {message ? (
          <p className="hi-banner" role="alert" data-tone="warn">
            {message}
          </p>
        ) : null}
        <div className="grid gap-3">
          <div>
            <Label htmlFor="hi-ward">{HOSPITAL_INDENTS_CONTENT.wardLabel}</Label>
            <select
              id="hi-ward"
              aria-label={HOSPITAL_INDENTS_CONTENT.wardLabel}
              value={draft.wardId}
              onChange={(event) =>
                onChange({ ...draft, wardId: event.target.value, bedId: '' })
              }
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
            <Label htmlFor="hi-bed">{HOSPITAL_INDENTS_CONTENT.bedLabel}</Label>
            <select
              id="hi-bed"
              aria-label={HOSPITAL_INDENTS_CONTENT.bedLabel}
              value={draft.bedId}
              disabled={!draft.wardId}
              onChange={(event) => onChange({ ...draft, bedId: event.target.value })}
            >
              <option value="">Optional</option>
              {beds.map((bed) => (
                <option key={bed.id} value={bed.id}>
                  {bed.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="hi-patient">{HOSPITAL_INDENTS_CONTENT.patientLabel}</Label>
            <input
              id="hi-patient"
              aria-label={HOSPITAL_INDENTS_CONTENT.patientLabel}
              value={draft.patientName}
              onChange={(event) => onChange({ ...draft, patientName: event.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="hi-note">{HOSPITAL_INDENTS_CONTENT.noteLabel}</Label>
            <input
              id="hi-note"
              aria-label={HOSPITAL_INDENTS_CONTENT.noteLabel}
              value={draft.note}
              onChange={(event) => onChange({ ...draft, note: event.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="hi-requested-by">{HOSPITAL_INDENTS_CONTENT.requestedByLabel}</Label>
            <input
              id="hi-requested-by"
              aria-label={HOSPITAL_INDENTS_CONTENT.requestedByLabel}
              value={draft.requestedBy}
              onChange={(event) => onChange({ ...draft, requestedBy: event.target.value })}
            />
          </div>
          {draft.lines.map((line, index) => (
            <div key={index} className="grid gap-2 md:grid-cols-2">
              <div>
                <Label htmlFor={`hi-product-${index}`}>{HOSPITAL_INDENTS_CONTENT.medicineLabel}</Label>
                <select
                  id={`hi-product-${index}`}
                  aria-label={HOSPITAL_INDENTS_CONTENT.medicineLabel}
                  value={line.productId}
                  onChange={(event) => {
                    const product = products.find((row) => row.id === event.target.value);
                    const next = [...draft.lines];
                    next[index] = {
                      ...line,
                      productId: event.target.value,
                      productName: product?.name ?? '',
                    };
                    onChange({ ...draft, lines: next });
                  }}
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
                <Label htmlFor={`hi-qty-${index}`}>{HOSPITAL_INDENTS_CONTENT.quantityLabel}</Label>
                <input
                  id={`hi-qty-${index}`}
                  aria-label={HOSPITAL_INDENTS_CONTENT.quantityLabel}
                  inputMode="decimal"
                  value={line.quantity}
                  onChange={(event) => {
                    const next = [...draft.lines];
                    next[index] = { ...line, quantity: event.target.value };
                    onChange({ ...draft, lines: next });
                  }}
                />
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              onChange({
                ...draft,
                lines: [...draft.lines, { productId: '', productName: '', quantity: '' }],
              })
            }
          >
            {HOSPITAL_INDENTS_CONTENT.addLine}
          </Button>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="outline" disabled={busy} onClick={onClose}>
            {HOSPITAL_INDENTS_CONTENT.cancelDialog}
          </Button>
          <Button type="button" disabled={busy} onClick={onSave}>
            {HOSPITAL_INDENTS_CONTENT.saveIndent}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
