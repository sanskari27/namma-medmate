import { Button } from '@atoms';
import type { FamilyCredit } from '@/services/customerFamilies';
import { formatPaise } from '@/services/credit';
import { Wallet } from 'lucide-react';

export type CustomerFamilyCreditSectionProps = {
  credit: FamilyCredit | null;
  loading: boolean;
  onSettleMember: (member: {
    customerId: string;
    customerName: string;
    balancePaise: number;
    version: number;
  }) => void;
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

function entryLabel(type: string): string {
  if (type === 'SALE_CHARGE') {
    return 'Sale charge';
  }
  if (type === 'SETTLEMENT') {
    return 'Settlement';
  }
  if (type === 'LIMIT_SET') {
    return 'Limit set';
  }
  return type;
}

export function CustomerFamilyCreditSection({
  credit,
  loading,
  onSettleMember,
}: CustomerFamilyCreditSectionProps) {
  return (
    <div className="grid gap-3 border-t border-line pt-4" aria-label="Family khata">
      <div>
        <div className="flex items-center gap-2">
          <Wallet className="size-3.5 shrink-0 text-brand" aria-hidden />
          <p className="font-mono text-[11px] tracking-wide text-muted">Family khata</p>
        </div>
        <p className="mt-1 text-sm text-muted">
          Each member keeps their own limit. Combined dues and history stay visible here.
        </p>
      </div>

      {loading || !credit ? (
        <p className="text-sm text-muted" role="status">
          Loading family khata…
        </p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 border border-line bg-canvas px-3 py-2.5 text-sm">
            <div>
              <p className="font-mono text-[10px] tracking-wide text-muted">Combined dues</p>
              <p className="mt-0.5 font-medium tabular-nums text-ink">
                {formatPaise(credit.totalBalancePaise)}
              </p>
            </div>
            <div>
              <p className="font-mono text-[10px] tracking-wide text-muted">Combined limit</p>
              <p className="mt-0.5 font-medium tabular-nums text-ink">
                {formatPaise(credit.totalLimitPaise)}
              </p>
            </div>
            <div>
              <p className="font-mono text-[10px] tracking-wide text-muted">Combined available</p>
              <p className="mt-0.5 font-medium tabular-nums text-ink">
                {formatPaise(credit.totalAvailablePaise)}
              </p>
            </div>
          </div>

          {credit.members.length === 0 ? (
            <p className="text-sm text-muted">No family members linked.</p>
          ) : (
            <ul className="divide-y divide-line border border-line bg-canvas">
              {credit.members.map((member) => (
                <li
                  key={member.customerId}
                  className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">{member.customerName}</p>
                    <p className="mt-0.5 font-mono text-xs tabular-nums text-muted">
                      Due {formatPaise(member.balancePaise)} · Limit{' '}
                      {formatPaise(member.limitPaise)} · Avail {formatPaise(member.availablePaise)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 shrink-0 px-2 text-xs"
                    disabled={member.balancePaise <= 0}
                    aria-haspopup="dialog"
                    onClick={() =>
                      onSettleMember({
                        customerId: member.customerId,
                        customerName: member.customerName,
                        balancePaise: member.balancePaise,
                        version: member.version,
                      })
                    }
                  >
                    Settle
                  </Button>
                </li>
              ))}
            </ul>
          )}

          <div>
            <p className="mb-1.5 font-mono text-[10px] tracking-wide text-muted">Combined ledger</p>
            {credit.entries.length === 0 ? (
              <p className="text-sm text-muted">No family khata entries yet.</p>
            ) : (
              <ul className="divide-y divide-line border border-line bg-canvas">
                {credit.entries.slice(0, 10).map((entry) => (
                  <li key={entry.id} className="px-3 py-2 text-sm">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="font-medium text-ink">
                        {entry.customerName} · {entryLabel(entry.type)}
                      </p>
                      <p className="font-mono text-xs tabular-nums text-ink">
                        {formatPaise(entry.amountPaise)}
                      </p>
                    </div>
                    <p className="mt-0.5 font-mono text-[11px] text-muted">
                      {formatIst(entry.occurredAt)}
                      {entry.invoiceId ? ` · inv ${entry.invoiceId.slice(0, 8)}` : ''}
                      {entry.settlementReference ? ` · ${entry.settlementReference}` : ''}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
