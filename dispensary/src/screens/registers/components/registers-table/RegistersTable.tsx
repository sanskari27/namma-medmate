import { columnLabel } from '../../RegistersScreen.utils';

export type RegistersTableProps = {
  title: string;
  columns: string[];
  items: Record<string, string>[];
};

export function RegistersTable({ title, columns, items }: RegistersTableProps) {
  if (items.length === 0) {
    return <p className="rg-loading">No rows match these filters in this outlet.</p>;
  }
  return (
    <div className="rg-card">
      <div className="rg-tbl-wrap">
        <table className="rg-tbl" aria-label={title}>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column}>{columnLabel(column)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={`${item.sku ?? ''}-${index}`}>
                {columns.map((column) => (
                  <td key={column}>{item[column] ?? ''}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
