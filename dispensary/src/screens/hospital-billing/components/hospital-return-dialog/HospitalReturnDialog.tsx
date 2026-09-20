import { Button, Label } from '@atoms';
import { Dialog, DialogContent, DialogTitle } from '@molecules';
import type { HospitalIssue } from '@/services/hospital';
import { HOSPITAL_BILLING_CONTENT } from '../../HospitalBillingScreen.content';

export function HospitalReturnDialog({
  open,
  issues,
  issueId,
  productId,
  quantity,
  busy,
  onIssueId,
  onProductId,
  onQuantity,
  message,
  onClose,
  onConfirm,
  onCloseAutoFocus,
}: {
  open: boolean;
  issues: HospitalIssue[];
  issueId: string;
  productId: string;
  quantity: string;
  busy: boolean;
  message: string | null;
  onIssueId: (value: string) => void;
  onProductId: (value: string) => void;
  onQuantity: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  onCloseAutoFocus: () => void;
}) {
  const selected = issues.find((issue) => issue.id === issueId) ?? null;
  const lines = selected?.lines ?? [];

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
        <DialogContent
          aria-describedby={undefined}
          className="hb-dialog"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            onCloseAutoFocus();
          }}
        >
        <DialogTitle>{HOSPITAL_BILLING_CONTENT.recordReturn}</DialogTitle>
        {message ? (
          <p className="hb-banner" data-tone="alert" role="alert">
            {message}
          </p>
        ) : null}
        <div className="grid gap-3">
          <div>
            <Label htmlFor="hb-return-issue">{HOSPITAL_BILLING_CONTENT.returnIssueLabel}</Label>
            <select
              id="hb-return-issue"
              aria-label={HOSPITAL_BILLING_CONTENT.returnIssueLabel}
              value={issueId}
              onChange={(event) => onIssueId(event.target.value)}
            >
              <option value="">Select invoice</option>
              {issues.map((issue) => (
                <option key={issue.id} value={issue.id}>
                  {issue.invoiceNumber} · {issue.wardName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="hb-return-product">{HOSPITAL_BILLING_CONTENT.returnProductLabel}</Label>
            <select
              id="hb-return-product"
              aria-label={HOSPITAL_BILLING_CONTENT.returnProductLabel}
              value={productId}
              disabled={!selected}
              onChange={(event) => onProductId(event.target.value)}
            >
              <option value="">Select medicine</option>
              {lines.map((line) => (
                <option key={line.productId} value={line.productId}>
                  {line.productName} · {line.quantity}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="hb-return-qty">{HOSPITAL_BILLING_CONTENT.returnQtyLabel}</Label>
            <input
              id="hb-return-qty"
              aria-label={HOSPITAL_BILLING_CONTENT.returnQtyLabel}
              inputMode="numeric"
              value={quantity}
              onChange={(event) => onQuantity(event.target.value)}
            />
          </div>
        </div>
        <div className="hb-dialog-actions">
          <Button type="button" variant="ghost" onClick={onClose}>
            {HOSPITAL_BILLING_CONTENT.cancelDialog}
          </Button>
          <Button type="button" disabled={busy} aria-busy={busy} onClick={onConfirm}>
            {HOSPITAL_BILLING_CONTENT.confirmReturn}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
