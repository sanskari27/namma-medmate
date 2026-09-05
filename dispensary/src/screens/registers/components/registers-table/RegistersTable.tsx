import { columnLabel } from '../../RegistersScreen.utils';

export type RegistersTableProps = {
  title: string;
  columns: string[];
  items: Record<string, string>[];
};

export function RegistersTable({ title, columns, items }: RegistersTableProps) {
  if (items.length === 0) {
    return (
      <p className="border border-dashed border-line px-3 py-6 text-sm text-muted">
        No rows match these filters in this outlet.
      </p>
    );
  }
  return (
    <section className="min-h-0 overflow-auto border border-line bg-surface">
      <table className="w-full text-left text-sm" aria-label={title}>
        <thead className="sticky top-0 bg-surface text-xs text-muted">
          <tr className="border-b border-line">
            {columns.map((column) => (
              <th key={column} className="px-3 py-2 font-medium">
                {columnLabel(column)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={`${item.sku ?? ''}-${index}`} className="border-b border-line last:border-b-0">
              {columns.map((column) => (
                <td key={column} className="px-3 py-2 text-ink">
                  {item[column] ?? ''}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
