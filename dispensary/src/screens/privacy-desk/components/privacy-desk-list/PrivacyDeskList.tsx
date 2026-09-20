import type { DpdpRequest } from '@/services/dpdp';
import { formatDeadline } from '../../PrivacyDeskScreen.utils';

type Props = {
  items: DpdpRequest[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export function PrivacyDeskList({ items, selectedId, onSelect }: Props) {
  if (items.length === 0) return null;
  return (
    <div className="min-w-0 overflow-auto border-r border-line">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-line text-muted">
            <th className="px-3 py-2 font-medium">Person</th>
            <th className="px-3 py-2 font-medium">Ask</th>
            <th className="px-3 py-2 font-medium">State</th>
            <th className="px-3 py-2 font-medium">Due (IST)</th>
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
                  {row.submittedName ?? row.principalType}
                </button>
              </td>
              <td className="px-3 py-2">{row.requestType}</td>
              <td className="px-3 py-2">{row.status}</td>
              <td className="px-3 py-2 font-mono text-xs">{formatDeadline(row.deadlineAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
