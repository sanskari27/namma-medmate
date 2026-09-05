import { Button, Input, Label } from '@atoms';
import { formatPaise, type TenderDraft, type TenderPreview } from '../../PosScreen.utils';

interface PosTenderPanelProps {
  tender: TenderDraft;
  preview: TenderPreview;
  totalPaise: number;
  walkIn: boolean;
  hasCustomer: boolean;
  availablePaise: number | null;
  collected: boolean;
  disabled: boolean;
  busy: boolean;
  onChange: (patch: Partial<TenderDraft>) => void;
  onCollect: () => void;
}

export function PosTenderPanel({
  tender,
  preview,
  totalPaise,
  walkIn,
  hasCustomer,
  availablePaise,
  collected,
  disabled,
  busy,
  onChange,
  onCollect,
}: PosTenderPanelProps) {
  const khataLocked = walkIn || !hasCustomer || collected;
  const freeze = collected || busy || disabled;
  return (
    <section
      className="space-y-3 rounded border border-line bg-surface p-3"
      aria-label="Take payment"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-ink">Take payment</h2>
        <p className="font-mono text-xs tabular-nums text-muted">Bill {formatPaise(totalPaise)}</p>
      </div>
      {preview.parts.length === 0 && !collected ? (
        <p className="text-sm text-muted">Add cash, UPI, card, bank, or khata to collect.</p>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label htmlFor="pos-tender-cash">Cash ₹</Label>
          <Input
            id="pos-tender-cash"
            inputMode="decimal"
            value={tender.cashRupees}
            onChange={(event) => onChange({ cashRupees: event.target.value })}
            disabled={freeze}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="pos-tender-card">Card ₹</Label>
          <Input
            id="pos-tender-card"
            inputMode="decimal"
            value={tender.cardRupees}
            onChange={(event) => onChange({ cardRupees: event.target.value })}
            disabled={freeze}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="pos-tender-upi">UPI ₹</Label>
          <Input
            id="pos-tender-upi"
            inputMode="decimal"
            value={tender.upiRupees}
            onChange={(event) => onChange({ upiRupees: event.target.value })}
            disabled={freeze}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="pos-tender-bank">Bank transfer ₹</Label>
          <Input
            id="pos-tender-bank"
            inputMode="decimal"
            value={tender.bankRupees}
            onChange={(event) => onChange({ bankRupees: event.target.value })}
            disabled={freeze}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="pos-tender-khata">Khata ₹</Label>
          <Input
            id="pos-tender-khata"
            inputMode="decimal"
            value={tender.creditRupees}
            onChange={(event) => onChange({ creditRupees: event.target.value })}
            disabled={freeze || khataLocked}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label htmlFor="pos-tender-card-ref">Card reference</Label>
          <Input
            id="pos-tender-card-ref"
            className="font-mono"
            value={tender.cardReference}
            onChange={(event) => onChange({ cardReference: event.target.value })}
            disabled={freeze}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="pos-tender-upi-ref">UPI reference</Label>
          <Input
            id="pos-tender-upi-ref"
            className="font-mono"
            value={tender.upiReference}
            onChange={(event) => onChange({ upiReference: event.target.value })}
            disabled={freeze}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="pos-tender-bank-ref">Bank reference</Label>
          <Input
            id="pos-tender-bank-ref"
            className="font-mono"
            value={tender.bankReference}
            onChange={(event) => onChange({ bankReference: event.target.value })}
            disabled={freeze}
          />
        </div>
      </div>
      {availablePaise != null && hasCustomer && !walkIn ? (
        <p className="text-sm text-muted">Khata left {formatPaise(availablePaise)}</p>
      ) : null}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <dt className="text-muted">Collected</dt>
        <dd className="font-mono tabular-nums text-ink">{formatPaise(preview.paidPaise)}</dd>
        <dt className="text-muted">Still due</dt>
        <dd className="font-mono tabular-nums text-ink">{formatPaise(preview.remainingPaise)}</dd>
        <dt className="text-muted">Change back</dt>
        <dd className="font-mono tabular-nums text-ink">{formatPaise(preview.changePaise)}</dd>
        <dt className="text-muted">Khata on this bill</dt>
        <dd className="font-mono tabular-nums text-ink">{formatPaise(preview.duePaise)}</dd>
      </dl>
      <Button
        type="button"
        onClick={onCollect}
        disabled={freeze || preview.parts.length === 0 || preview.invalid}
      >
        Collect bill
      </Button>
    </section>
  );
}
