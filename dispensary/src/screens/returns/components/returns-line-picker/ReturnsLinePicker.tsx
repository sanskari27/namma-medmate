import { Input } from '@atoms';
import type { SalesInvoice } from '@/services/salesInvoices';
import { formatPaise, lineQuantity, type LineDraft } from '../../ReturnsScreen.utils';

export type ReturnsLinePickerProps = {
  invoice: SalesInvoice;
  qtyByLine: LineDraft;
  onQtyChange: (lineId: string, value: string) => void;
};

export function ReturnsLinePicker({ invoice, qtyByLine, onQtyChange }: ReturnsLinePickerProps) {
  return (
    <section className="border border-line bg-surface">
      <header className="border-b border-line px-3 py-2">
        <h2 className="text-sm font-semibold text-ink">Bill {invoice.invoiceNumber}</h2>
        <p className="font-mono text-xs tabular-nums text-muted">
          {formatPaise(invoice.totalPaise)} collected
        </p>
      </header>
      <table className="w-full text-left text-sm">
        <thead className="border-b border-line text-xs text-muted">
          <tr>
            <th className="px-3 py-2 font-medium">Pack</th>
            <th className="px-3 py-2 font-medium">Batch</th>
            <th className="px-3 py-2 font-medium">Sold</th>
            <th className="px-3 py-2 font-medium">Take back</th>
          </tr>
        </thead>
        <tbody>
          {invoice.lines.map((line) => (
            <tr key={line.id} className="border-b border-line last:border-0">
              <td className="px-3 py-2">
                <p className="text-ink">{line.productName}</p>
                <p className="font-mono text-xs text-muted">{line.sku}</p>
              </td>
              <td className="px-3 py-2 font-mono text-xs text-ink">
                {line.batchNumber ?? '—'}
              </td>
              <td className="px-3 py-2 font-mono tabular-nums text-ink">
                {lineQuantity(line.quantity)}
              </td>
              <td className="px-3 py-2">
                <label className="sr-only" htmlFor={`return-qty-${line.id}`}>
                  Return quantity for {line.productName}
                </label>
                <Input
                  id={`return-qty-${line.id}`}
                  inputMode="decimal"
                  value={qtyByLine[line.id] ?? ''}
                  onChange={(event) => onQtyChange(line.id, event.target.value)}
                  className="w-24"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
