import type { HqDpdpRequest } from '@/services/dpdp';

type Props = {
  items: HqDpdpRequest[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export function PrincipalRequestsList({ items, selectedId, onSelect }: Props) {
  if (items.length === 0) return null;
  return (
    <table className="w-full text-left text-sm">
      <caption className="sr-only">Platform principal requests</caption>
      <thead>
        <tr className="border-b border-line text-muted">
          <th className="px-3 py-2 font-medium">Type</th>
          <th className="px-3 py-2 font-medium">Ask</th>
          <th className="px-3 py-2 font-medium">State</th>
        </tr>
      </thead>
      <tbody>
        {items.map((row) => (
          <tr key={row.id}>
            <td className="px-3 py-2">
              <button
                type="button"
                className={row.id === selectedId ? 'text-brand' : 'text-ink'}
                onClick={() => onSelect(row.id)}
              >
                {row.principalType}
              </button>
            </td>
            <td className="px-3 py-2">{row.requestType}</td>
            <td className="px-3 py-2">{row.status}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
