import { Button } from '@atoms';
import type { WhatsAppMessage } from '@/services/whatsappMessages';
import { kindLabel, outcomeLabel, type KindFilter } from '../../WhatsappSendsScreen.utils';

const FILTERS: { id: KindFilter; label: string }[] = [
  { id: 'ALL', label: 'All sends' },
  { id: 'REFILL_DUE', label: 'Refill due' },
  { id: 'CREDIT_DUE', label: 'Khata due' },
  { id: 'CAMPAIGN', label: 'Tag broadcast' },
];

export type WhatsappSendsListPanelProps = {
  items: WhatsAppMessage[];
  selectedId: string | null;
  kind: KindFilter;
  onKindChange: (kind: KindFilter) => void;
  onSelect: (id: string) => void;
};

export function WhatsappSendsListPanel({
  items,
  selectedId,
  kind,
  onKindChange,
  onSelect,
}: WhatsappSendsListPanelProps) {
  return (
    <section className="border border-line bg-surface p-3" aria-label="WhatsApp send list">
      <h2 className="text-sm font-semibold text-ink">On this pharmacy</h2>
      <div className="mt-2 flex flex-wrap gap-1" role="group" aria-label="Filter sends">
        {FILTERS.map((filter) => (
          <Button
            key={filter.id}
            type="button"
            size="sm"
            variant={kind === filter.id ? 'primary' : 'outline'}
            onClick={() => onKindChange(filter.id)}
          >
            {filter.label}
          </Button>
        ))}
      </div>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-muted">No sends in this filter.</p>
      ) : (
        <ul className="mt-2 space-y-1">
          {items.map((item) => (
            <li key={item.id}>
              <Button
                type="button"
                variant={item.id === selectedId ? 'primary' : 'outline'}
                className="w-full justify-between"
                onClick={() => onSelect(item.id)}
              >
                <span>{kindLabel(item.kind)}</span>
                <span className="font-mono text-xs">{outcomeLabel(item.status)}</span>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
