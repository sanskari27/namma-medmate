import { Button } from '@atoms';
import type { CustomerLoyalty, LoyaltyLedgerType } from '@/services/loyalty';
import { Coins } from 'lucide-react';
import { type RefObject, useState } from 'react';
import { CustomerLoyaltyAdjustDialog } from './CustomerLoyaltyAdjustDialog';

export type CustomerLoyaltySectionProps = {
  loyalty: CustomerLoyalty | null;
  loading: boolean;
  entitled: boolean;
  canAdjust: boolean;
  adjustButtonRef?: RefObject<HTMLButtonElement | null>;
  onAdjusted: () => void;
};

function formatIst(iso: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function ledgerLabel(type: LoyaltyLedgerType): string {
  switch (type) {
    case 'EARN':
      return 'Earned';
    case 'REDEEM':
      return 'Used';
    case 'SETTLEMENT_EARN':
      return 'Earned on khata settle';
    case 'RETURN_EARN':
      return 'Return (earned reversed)';
    case 'RETURN_REDEEM':
      return 'Return (points back)';
    case 'ADJUSTMENT':
      return 'Owner adjustment';
    default:
      return type;
  }
}

export function CustomerLoyaltySection({
  loyalty,
  loading,
  entitled,
  canAdjust,
  adjustButtonRef,
  onAdjusted,
}: CustomerLoyaltySectionProps) {
  const [adjustOpen, setAdjustOpen] = useState(false);
  const balance = loyalty?.balancePoints ?? 0;

  return (
    <div className="grid gap-3 border-t border-line pt-4" aria-label="Points">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <Coins className="size-3.5 shrink-0 text-brand" aria-hidden />
            <p className="font-mono text-[11px] tracking-wide text-muted">Points</p>
          </div>
          <p className="mt-1 text-sm text-muted">
            Running points for this patient. Earn and redeem need Growth or Pro.
          </p>
        </div>
        {canAdjust ? (
          <Button
            ref={adjustButtonRef}
            type="button"
            variant="outline"
            onClick={() => setAdjustOpen(true)}
            disabled={loading || !loyalty}
            aria-haspopup="dialog"
          >
            Adjust points
          </Button>
        ) : null}
      </div>

      {!entitled ? (
        <p className="text-sm text-muted">
          Not on this plan. Balance stays on the patient; earn and redeem stay frozen.
        </p>
      ) : null}

      {loading || !loyalty ? (
        <p className="text-sm text-muted">Loading points…</p>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <div className="border border-line px-2.5 py-2">
              <dt className="text-xs text-muted">Balance</dt>
              <dd className="font-mono tabular-nums text-brand">{balance} pts</dd>
            </div>
            <div className="border border-line px-2.5 py-2">
              <dt className="text-xs text-muted">Value</dt>
              <dd className="font-mono tabular-nums text-ink">₹{balance.toLocaleString('en-IN')}</dd>
            </div>
          </dl>

          {loyalty.entries.length === 0 ? (
            <p className="text-sm text-muted">No points on this patient yet.</p>
          ) : (
            <ul className="grid gap-1.5" aria-label="Points ledger">
              {loyalty.entries.slice(0, 8).map((entry) => (
                <li
                  key={entry.id}
                  className="flex flex-wrap items-baseline justify-between gap-2 border border-line px-2.5 py-1.5 text-sm"
                >
                  <span className="text-ink">
                    {ledgerLabel(entry.type)}
                    {entry.reason ? ` · ${entry.reason}` : ''}
                  </span>
                  <span className="font-mono text-xs tabular-nums text-muted">
                    {entry.deltaPoints > 0 ? '+' : ''}
                    {entry.deltaPoints} · {formatIst(entry.occurredAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {loyalty ? (
        <CustomerLoyaltyAdjustDialog
          open={adjustOpen}
          customerId={loyalty.customerId}
          balancePoints={loyalty.balancePoints}
          version={loyalty.version}
          onOpenChange={setAdjustOpen}
          onAdjusted={onAdjusted}
          onCloseFocus={() => adjustButtonRef?.current?.focus()}
        />
      ) : null}
    </div>
  );
}
