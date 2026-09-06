import { Button } from '@atoms';
import type { Campaign } from '@/services/campaigns';
import { statusLabel } from '../../CampaignsScreen.utils';

export type CampaignsListPanelProps = {
  items: Campaign[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export function CampaignsListPanel({ items, selectedId, onSelect }: CampaignsListPanelProps) {
  return (
    <section className="border border-line bg-surface p-3" aria-label="Broadcast list">
      <h2 className="text-sm font-semibold text-ink">On this pharmacy</h2>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-muted">Nothing drafted or ready yet.</p>
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
                <span className="font-mono text-xs">{statusLabel(item.status)}</span>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
