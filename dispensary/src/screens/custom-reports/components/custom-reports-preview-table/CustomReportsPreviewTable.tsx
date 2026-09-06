export type CustomReportsPreviewTableProps = {
  title: string;
  columns: string[];
  items: Record<string, string>[];
};

export function CustomReportsPreviewTable({
  title,
  columns,
  items,
}: CustomReportsPreviewTableProps) {
  return (
    <div className="min-h-0 flex-1 overflow-auto border border-line bg-surface">
      <table className="w-full min-w-max border-collapse text-left text-sm" aria-label={title}>
        <thead className="sticky top-0 bg-surface">
          <tr>
            {columns.map((column) => (
              <th key={column} className="border-b border-line px-3 py-2 font-medium text-ink">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={`${title}-${index}`}>
              {columns.map((column) => (
                <td key={column} className="border-b border-line px-3 py-2 font-mono text-ink">
                  {item[column] ?? ''}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
