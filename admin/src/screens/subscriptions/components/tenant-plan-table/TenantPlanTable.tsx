import { Button, Input, Label } from '@atoms';
import type { AdminSubscription } from '@/services/subscriptions';
import { formatIstDate, occupancy, planLabel } from '../../SubscriptionsScreen.utils';

function UsageTrack({ label, used, cap }: { label: string; used: number; cap: number | null }) {
  const { label: fraction, ratio } = occupancy(used, cap);
  return (
    <div>
      <p className="font-mono text-[11px] text-muted">
        {label} {fraction}
      </p>
      <div className="mt-1 h-1 w-24 bg-elevated" aria-hidden="true">
        <div className="h-1 bg-brand" style={{ width: `${Math.round(ratio * 100)}%` }} />
      </div>
    </div>
  );
}

export function TenantPlanTable({
  items,
  visible,
  mix,
  query,
  findId,
  onQuery,
  onOpenFile,
}: {
  items: AdminSubscription[];
  visible: AdminSubscription[];
  mix: Record<string, number>;
  query: string;
  findId: string;
  onQuery: (value: string) => void;
  onOpenFile: (row: AdminSubscription, trigger: HTMLElement) => void;
}) {
  if (items.length === 0) {
    return null;
  }
  return (
    <>
      <section
        aria-labelledby="mix-heading"
        className="grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-4"
      >
        <h2 id="mix-heading" className="sr-only">
          Tenants by plan
        </h2>
        {(['FREE', 'STARTER', 'GROWTH', 'PRO'] as const).map((code) => (
          <div key={code} className="bg-surface px-3 py-2">
            <p className="font-mono text-[11px] text-brand">{code}</p>
            <p className="font-serif text-lg text-ink">{mix[code] ?? 0}</p>
            <p className="text-xs text-muted">{planLabel(code)} tenants</p>
          </div>
        ))}
      </section>
      <div className="max-w-sm space-y-1.5">
        <Label htmlFor={findId}>Find tenant</Label>
        <Input
          id={findId}
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          autoComplete="off"
        />
      </div>
      <div className="overflow-x-auto border border-line">
        <table className="w-full min-w-[52rem] border-collapse text-left text-sm">
          <caption className="sr-only">Tenant subscriptions</caption>
          <thead className="border-b border-line bg-elevated text-[11px] text-muted">
            <tr>
              <th scope="col" className="px-3 py-2 font-medium">
                Tenant
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                Plan
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                Status
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                Occupancy
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                Expiry (IST)
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                File
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={row.tenantId} className="border-b border-line last:border-b-0">
                <td className="px-3 py-3 text-ink">
                  <p>{row.tenantName}</p>
                  {row.branchLimitOverride != null ? (
                    <p className="font-mono text-[11px] text-warn">
                      Branch cap override {row.branchLimitOverride}
                    </p>
                  ) : null}
                </td>
                <td className="px-3 py-3 font-mono text-[11px] text-brand">{row.planCode}</td>
                <td className="px-3 py-3 font-mono text-[11px] text-muted">{row.status}</td>
                <td className="px-3 py-3">
                  <div className="flex flex-col gap-2">
                    <UsageTrack
                      label="Outlets"
                      used={row.branchesUsed}
                      cap={row.effectiveBranchLimit}
                    />
                    <UsageTrack label="Users" used={row.usersUsed} cap={row.maxUsers} />
                  </div>
                </td>
                <td className="px-3 py-3 font-mono text-[11px] text-muted">
                  {formatIstDate(row.expiresAt)}
                </td>
                <td className="px-3 py-3">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={(event) => onOpenFile(row, event.currentTarget)}
                  >
                    Override file
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {visible.length === 0 ? (
        <p className="text-sm text-muted">No tenant on this ledger matches that search.</p>
      ) : null}
    </>
  );
}
