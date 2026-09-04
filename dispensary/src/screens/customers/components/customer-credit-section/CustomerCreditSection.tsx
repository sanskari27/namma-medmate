import { Button, Input, Label } from '@atoms';
import type { CustomerCredit } from '@/services/credit';
import { formatPaise } from '@/services/credit';
import { Wallet } from 'lucide-react';
import { type RefObject, useId, useState } from 'react';

export type CustomerCreditSectionProps = {
  credit: CustomerCredit | null;
  loading: boolean;
  canSetLimit: boolean;
  limitBusy: boolean;
  settleButtonRef?: RefObject<HTMLButtonElement | null>;
  onSetLimit: (limitPaise: number) => void;
  onSettle: () => void;
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

export function CustomerCreditSection({
  credit,
  loading,
  canSetLimit,
  limitBusy,
  settleButtonRef,
  onSetLimit,
  onSettle,
}: CustomerCreditSectionProps) {
  const formId = useId();
  const [limitRupees, setLimitRupees] = useState('');

  const limitPaise = credit?.limitPaise ?? 0;
  const balancePaise = credit?.balancePaise ?? 0;
  const availablePaise = credit?.availablePaise ?? 0;

  function saveLimit() {
    const rupees = Number(limitRupees.trim());
    if (!Number.isFinite(rupees) || rupees < 0) {
      return;
    }
    onSetLimit(Math.round(rupees * 100));
  }

  return (
    <div className="grid gap-3 border-t border-line pt-4" aria-label="Khata credit">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <Wallet className="size-3.5 shrink-0 text-brand" aria-hidden />
            <p className="font-mono text-[11px] tracking-wide text-muted">Khata credit</p>
          </div>
          <p className="mt-1 text-sm text-muted">
            Available credit for the till and running balance for settlements.
          </p>
        </div>
        <Button
          ref={settleButtonRef}
          type="button"
          variant="outline"
          onClick={onSettle}
          disabled={loading || balancePaise <= 0}
          aria-haspopup="dialog"
        >
          Settle
        </Button>
      </div>

      {loading || !credit ? (
        <p className="text-sm text-muted" role="status">
          Loading khata…
        </p>
      ) : (
        <>
          <dl className="grid grid-cols-3 gap-2 text-sm">
            <div className="border border-line px-2.5 py-2">
              <dt className="text-xs text-muted">Limit</dt>
              <dd className="font-mono tabular-nums text-ink">{formatPaise(limitPaise)}</dd>
            </div>
            <div className="border border-line px-2.5 py-2">
              <dt className="text-xs text-muted">Outstanding</dt>
              <dd className="font-mono tabular-nums text-ink">{formatPaise(balancePaise)}</dd>
            </div>
            <div className="border border-line px-2.5 py-2">
              <dt className="text-xs text-muted">Available</dt>
              <dd className="font-mono tabular-nums text-brand">{formatPaise(availablePaise)}</dd>
            </div>
          </dl>

          {canSetLimit ? (
            <div className="flex flex-wrap items-end gap-2">
              <div className="grid min-w-[8rem] flex-1 gap-1">
                <Label htmlFor={`${formId}-limit`} className="text-xs text-muted">
                  Set limit (₹)
                </Label>
                <Input
                  id={`${formId}-limit`}
                  inputMode="decimal"
                  value={limitRupees}
                  placeholder={String(limitPaise / 100)}
                  onChange={(event) => setLimitRupees(event.target.value)}
                  disabled={limitBusy}
                />
              </div>
              <Button type="button" variant="outline" disabled={limitBusy} onClick={saveLimit}>
                {limitBusy ? 'Saving…' : 'Save limit'}
              </Button>
            </div>
          ) : null}

          {credit.entries.length === 0 ? (
            <p className="text-sm text-muted">No khata movements on this profile yet.</p>
          ) : (
            <ul className="grid gap-1.5" aria-label="Khata ledger">
              {credit.entries.slice(0, 8).map((entry) => (
                <li
                  key={entry.id}
                  className="flex flex-wrap items-baseline justify-between gap-2 border border-line px-2.5 py-1.5 text-sm"
                >
                  <span className="text-ink">
                    {entry.type === 'SALE_CHARGE'
                      ? 'Sale charge'
                      : entry.type === 'SETTLEMENT'
                        ? 'Settlement'
                        : 'Limit set'}
                    {entry.settlementMode ? ` · ${entry.settlementMode}` : ''}
                  </span>
                  <span className="font-mono text-xs tabular-nums text-muted">
                    {formatPaise(entry.amountPaise)} · {formatIst(entry.occurredAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
