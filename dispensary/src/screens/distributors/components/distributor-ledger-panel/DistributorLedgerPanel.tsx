import { Button } from '@atoms';
import type { Ref } from 'react';
import type { SupplierLedger } from '@/services/suppliers';
import { formatPaise } from '../../DistributorsScreen.utils';
import { DistributorLedgerEntries } from '../distributor-ledger-entries';

export type DistributorLedgerPanelProps = {
  ledger: SupplierLedger | null;
  loading: boolean;
  payButtonRef?: Ref<HTMLButtonElement>;
  onPay: () => void;
};

export function DistributorLedgerPanel({
  ledger,
  loading,
  payButtonRef,
  onPay,
}: DistributorLedgerPanelProps) {
  return (
    <section className="grid gap-2 border border-line bg-surface p-3" aria-label="Stockist khata">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="font-mono text-[11px] tracking-wide text-muted">This outlet</p>
          <h2 className="text-sm font-medium text-ink">Stockist khata</h2>
          {ledger ? (
            <p className="mt-1 font-mono text-sm text-ink">
              Payable {formatPaise(ledger.balancePaise)}
            </p>
          ) : null}
        </div>
        <Button ref={payButtonRef} type="button" disabled={!ledger || loading} onClick={onPay}>
          Record payment
        </Button>
      </div>
      {loading ? (
        <p className="text-sm text-muted">Loading stockist khata…</p>
      ) : (
        <DistributorLedgerEntries entries={ledger?.entries ?? []} />
      )}
    </section>
  );
}
