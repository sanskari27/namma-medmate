import { Label } from '@atoms';
import type { PurchaseOrderVersion } from '@/services/purchaseOrders';
import { compareVersions, formatPaise } from '../../PurchasesScreen.utils';

export type PurchaseOrderVersionsProps = {
  formId: string;
  versions: PurchaseOrderVersion[];
  left: number | null;
  right: number | null;
  onLeft: (version: number) => void;
  onRight: (version: number) => void;
};

export function PurchaseOrderVersions({
  formId,
  versions,
  left,
  right,
  onLeft,
  onRight,
}: PurchaseOrderVersionsProps) {
  if (versions.length === 0) {
    return null;
  }
  const leftRow = versions.find((row) => row.version === left) ?? null;
  const rightRow = versions.find((row) => row.version === right) ?? null;
  const diffs = compareVersions(leftRow, rightRow);

  return (
    <section aria-label="Version comparison" className="grid gap-2">
      <h2 className="text-sm font-medium text-ink">Saved versions</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1">
          <Label htmlFor={`${formId}-ver-left`}>Earlier save</Label>
          <select
            id={`${formId}-ver-left`}
            value={left ?? ''}
            onChange={(e) => onLeft(Number(e.target.value))}
            className="h-9 border border-line bg-canvas px-2 font-mono text-sm text-ink focus-visible:outline-2 focus-visible:outline-focus"
          >
            <option value="">Select version</option>
            {versions.map((row) => (
              <option key={row.version} value={row.version}>
                v{row.version} · {formatPaise(row.totalPaise)}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1">
          <Label htmlFor={`${formId}-ver-right`}>Later save</Label>
          <select
            id={`${formId}-ver-right`}
            value={right ?? ''}
            onChange={(e) => onRight(Number(e.target.value))}
            className="h-9 border border-line bg-canvas px-2 font-mono text-sm text-ink focus-visible:outline-2 focus-visible:outline-focus"
          >
            <option value="">Select version</option>
            {versions.map((row) => (
              <option key={row.version} value={row.version}>
                v{row.version} · {formatPaise(row.totalPaise)}
              </option>
            ))}
          </select>
        </div>
      </div>
      {diffs.length === 0 ? (
        <p className="text-sm text-muted">Pick two versions to compare pack quantities.</p>
      ) : (
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">
            Quantity and total changes between the selected versions
          </caption>
          <thead>
            <tr className="border-b border-line text-left text-muted">
              <th className="py-1 font-medium">Pack</th>
              <th className="py-1 font-medium">Earlier qty</th>
              <th className="py-1 font-medium">Later qty</th>
              <th className="py-1 font-medium">Totals</th>
            </tr>
          </thead>
          <tbody>
            {diffs.map((row) => (
              <tr key={row.productName} className="border-b border-line">
                <td className="py-1.5 text-ink">{row.productName}</td>
                <td className="py-1.5 font-mono tabular-nums">{row.leftQty}</td>
                <td className="py-1.5 font-mono tabular-nums">{row.rightQty}</td>
                <td className="py-1.5 font-mono tabular-nums text-muted">
                  {row.leftTotal} → {row.rightTotal}
                  {row.changed ? ' (changed)' : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
