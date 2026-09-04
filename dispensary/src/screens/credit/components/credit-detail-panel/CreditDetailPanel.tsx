import { Button } from '@atoms';
import type { OutstandingCreditAccount } from '@/services/credit';
import { formatPaise } from '@/services/credit';
import { Wallet } from 'lucide-react';
import type { RefObject } from 'react';

export type CreditDetailPanelProps = {
  account: OutstandingCreditAccount | null;
  settleButtonRef?: RefObject<HTMLButtonElement | null>;
  onSettle: () => void;
};

export function CreditDetailPanel({
  account,
  settleButtonRef,
  onSettle,
}: CreditDetailPanelProps) {
  if (!account) {
    return (
      <section
        aria-label="Khata detail"
        className="flex h-full min-h-0 flex-col border border-line bg-surface"
      >
        <div className="flex h-full flex-col items-start justify-center gap-3 px-6 py-10">
          <Wallet className="size-8 text-brand" aria-hidden />
          <div>
            <h2 className="font-sans text-base font-semibold text-ink">Select a khata</h2>
            <p className="mt-1 max-w-sm text-sm text-muted">
              Pick an outstanding balance to settle cash, UPI, card, or bank payoff.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label="Khata detail"
      className="flex h-full min-h-0 flex-col border border-line bg-surface"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3">
        <div>
          <h2 className="font-sans text-base font-semibold text-ink">{account.customerName}</h2>
          <p className="mt-0.5 font-mono text-xs tabular-nums text-muted">{account.customerPhone}</p>
        </div>
        <Button
          ref={settleButtonRef}
          type="button"
          onClick={onSettle}
          aria-haspopup="dialog"
        >
          Settle
        </Button>
      </div>
      <dl className="grid grid-cols-3 gap-2 p-4 text-sm">
        <div className="border border-line px-2.5 py-2">
          <dt className="text-xs text-muted">Limit</dt>
          <dd className="font-mono tabular-nums text-ink">{formatPaise(account.limitPaise)}</dd>
        </div>
        <div className="border border-line px-2.5 py-2">
          <dt className="text-xs text-muted">Outstanding</dt>
          <dd className="font-mono tabular-nums text-ink">{formatPaise(account.balancePaise)}</dd>
        </div>
        <div className="border border-line px-2.5 py-2">
          <dt className="text-xs text-muted">Available</dt>
          <dd className="font-mono tabular-nums text-brand">
            {formatPaise(account.availablePaise)}
          </dd>
        </div>
      </dl>
      <p className="px-4 pb-4 text-sm text-muted">
        Settlements post to the ledger only — source invoices stay unchanged.
      </p>
    </section>
  );
}
