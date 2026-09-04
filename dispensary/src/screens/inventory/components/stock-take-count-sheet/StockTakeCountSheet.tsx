import { Button } from '@atoms';
import type { StockTakeLine } from '@/services/stockTakes';

export type StockTakeCountSheetProps = {
  lines: StockTakeLine[];
  drafts: Record<string, string>;
  busy: boolean;
  onDraftChange: (lineId: string, value: string) => void;
  onSave: () => void;
};

export function StockTakeCountSheet({
  lines,
  drafts,
  busy,
  onDraftChange,
  onSave,
}: StockTakeCountSheetProps) {
  return (
    <section className="min-h-0 flex-1 border border-line bg-surface">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-2">
        <h2 className="text-sm font-semibold text-ink">Count sheet</h2>
        <Button type="button" size="sm" disabled={busy} onClick={onSave}>
          Save counts
        </Button>
      </header>
      {lines.length === 0 ? (
        <p className="px-3 py-4 text-sm text-muted">
          No book qty on this outlet at start. Post to close the count with no variances.
        </p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-xs text-muted">
            <tr>
              <th className="px-3 py-2 font-medium">Pack</th>
              <th className="px-3 py-2 font-medium">Batch</th>
              <th className="px-3 py-2 font-medium">Book qty at start</th>
              <th className="px-3 py-2 font-medium">
                <span className="sr-only">Counted quantity</span>
                Counted
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {lines.map((line) => (
              <tr key={line.id}>
                <td className="px-3 py-2">
                  <p className="font-medium text-ink">{line.productName}</p>
                  <p className="font-mono text-xs text-muted">{line.productSku}</p>
                </td>
                <td className="px-3 py-2 font-mono text-xs text-muted">
                  {line.batchNumber ?? 'no batch'}
                  {line.expiresOn ? ` · exp ${line.expiresOn}` : ''}
                </td>
                <td className="px-3 py-2 font-mono tabular-nums text-ink">
                  {line.expectedQuantity}
                </td>
                <td className="px-3 py-2">
                  <label className="grid gap-1">
                    <span className="sr-only">Counted quantity for {line.productName}</span>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      className="w-24 border border-line bg-canvas px-2 py-1 font-mono text-sm text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                      value={drafts[line.id] ?? ''}
                      onChange={(event) => onDraftChange(line.id, event.target.value)}
                    />
                  </label>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
