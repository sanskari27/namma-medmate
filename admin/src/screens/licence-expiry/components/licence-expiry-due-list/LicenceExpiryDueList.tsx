import type { AdminDueLicense } from '@/services/licenses';
import { formatIstDate, paperLabel, scopeLabel } from '../../LicenceExpiryScreen.utils';

export type LicenceExpiryDueListProps = {
  items: AdminDueLicense[];
};

export function LicenceExpiryDueList({ items }: LicenceExpiryDueListProps) {
  return (
    <div className="overflow-x-auto border border-line bg-surface">
      <table className="w-full min-w-[40rem] text-left text-sm">
        <caption className="sr-only">Tenant papers due in the next 30 days</caption>
        <thead className="border-b border-line bg-elevated font-mono text-[11px] tracking-wide text-muted">
          <tr>
            <th className="px-3 py-2 font-medium">Tenant</th>
            <th className="px-3 py-2 font-medium">Paper</th>
            <th className="px-3 py-2 font-medium">Scope</th>
            <th className="px-3 py-2 font-medium">Number</th>
            <th className="px-3 py-2 font-medium">Expires (IST)</th>
          </tr>
        </thead>
        <tbody>
          {items.map((row) => (
            <tr key={row.id} className="border-b border-line last:border-b-0">
              <td className="px-3 py-2.5 text-ink">
                <p>{row.tenantName}</p>
                {row.branchName ? (
                  <p className="font-mono text-[11px] text-muted">{row.branchName}</p>
                ) : null}
                {row.staffDisplayName ? (
                  <p className="font-mono text-[11px] text-muted">{row.staffDisplayName}</p>
                ) : null}
              </td>
              <td className="px-3 py-2.5 text-ink">{paperLabel(row.docType)}</td>
              <td className="px-3 py-2.5 text-muted">{scopeLabel(row.scope)}</td>
              <td className="px-3 py-2.5 font-mono text-[12px] text-brand">{row.licenseNumber}</td>
              <td className="px-3 py-2.5 font-mono text-[12px] text-ink">
                {formatIstDate(row.expiresOn)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
