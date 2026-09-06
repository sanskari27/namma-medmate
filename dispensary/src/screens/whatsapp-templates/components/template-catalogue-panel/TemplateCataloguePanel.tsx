import type { WhatsAppTemplate } from '@/services/whatsappTemplates';
import { templateLabel } from '../../WhatsappTemplatesScreen.utils';

export type TemplateCataloguePanelProps = {
  items: WhatsAppTemplate[];
  selectedName: string | null;
  onSelect: (uniqueName: string) => void;
};

export function TemplateCataloguePanel({
  items,
  selectedName,
  onSelect,
}: TemplateCataloguePanelProps) {
  if (items.length === 0) {
    return (
      <p className="border border-dashed border-line px-3 py-6 text-sm text-muted">
        No approved messages on file for this pharmacy.
      </p>
    );
  }
  return (
    <ul className="divide-y divide-line border border-line bg-surface">
      {items.map((row) => {
        const selected = row.uniqueName === selectedName;
        return (
          <li key={row.uniqueName}>
            <button
              type="button"
              aria-current={selected ? 'true' : undefined}
              className={`flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm ${
                selected ? 'bg-brand-soft' : 'hover:bg-canvas'
              }`}
              onClick={() => onSelect(row.uniqueName)}
            >
              <span className="font-medium text-ink">{templateLabel(row.uniqueName)}</span>
              <span className="font-mono text-xs text-muted">{row.namespaceName}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
