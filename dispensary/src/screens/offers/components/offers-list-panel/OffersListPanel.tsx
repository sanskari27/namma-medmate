import { Button } from '@atoms';
import type { SalesOffer } from '@/services/offers';
import { kindLabel, statusLabel } from '../../OffersScreen.utils';

export type OffersListPanelProps = {
  items: SalesOffer[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export function OffersListPanel({ items, selectedId, onSelect }: OffersListPanelProps) {
  return (
    <section className="border border-line bg-surface p-3" aria-label="Scheme list">
      <h2 className="text-sm font-semibold text-ink">On this counter</h2>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-muted">Nothing live or drafted yet.</p>
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
                <span>{item.name}</span>
                <span className="font-mono text-xs text-muted">
                  {kindLabel(item.kind)} · {statusLabel(item.status)}
                </span>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
