import { Button, Label } from '@atoms';
import { Dialog, DialogContent, DialogTitle } from '@molecules';
import { HOSPITAL_BILLING_CONTENT } from '../../HospitalBillingScreen.content';
import { PAYMENT_MODES, type PaymentMode } from '../../HospitalBillingScreen.utils';

export function HospitalPaymentDialog({
  open,
  amountRupees,
  mode,
  reference,
  busy,
  onAmountRupees,
  onMode,
  onReference,
  message,
  onClose,
  onConfirm,
  onCloseAutoFocus,
}: {
  open: boolean;
  amountRupees: string;
  mode: PaymentMode;
  reference: string;
  busy: boolean;
  message: string | null;
  onAmountRupees: (value: string) => void;
  onMode: (value: PaymentMode) => void;
  onReference: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  onCloseAutoFocus: () => void;
}) {
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
        <DialogTitle>{HOSPITAL_BILLING_CONTENT.recordPayment}</DialogTitle>
        {message ? (
          <p className="hb-banner" data-tone="alert" role="alert">
            {message}
          </p>
        ) : null}
        <div className="grid gap-3">
          <div>
            <Label htmlFor="hb-pay-amount">{HOSPITAL_BILLING_CONTENT.paymentAmountLabel}</Label>
            <input
              id="hb-pay-amount"
              aria-label={HOSPITAL_BILLING_CONTENT.paymentAmountLabel}
              inputMode="decimal"
              value={amountRupees}
              onChange={(event) => onAmountRupees(event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="hb-pay-mode">{HOSPITAL_BILLING_CONTENT.paymentModeLabel}</Label>
            <select
              id="hb-pay-mode"
              aria-label={HOSPITAL_BILLING_CONTENT.paymentModeLabel}
              value={mode}
              onChange={(event) => onMode(event.target.value as PaymentMode)}
            >
              {PAYMENT_MODES.map((row) => (
                <option key={row} value={row}>
                  {row}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="hb-pay-ref">{HOSPITAL_BILLING_CONTENT.paymentReferenceLabel}</Label>
            <input
              id="hb-pay-ref"
              aria-label={HOSPITAL_BILLING_CONTENT.paymentReferenceLabel}
              value={reference}
              autoComplete="off"
              onChange={(event) => onReference(event.target.value)}
            />
          </div>
        </div>
        <div className="hb-dialog-actions">
          <Button type="button" variant="ghost" onClick={onClose}>
            {HOSPITAL_BILLING_CONTENT.cancelDialog}
          </Button>
          <Button type="button" disabled={busy} aria-busy={busy} onClick={onConfirm}>
            {HOSPITAL_BILLING_CONTENT.confirmPayment}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
