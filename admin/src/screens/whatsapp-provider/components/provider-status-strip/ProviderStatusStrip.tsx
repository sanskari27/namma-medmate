import type { WhatsAppProvider } from '@/services/whatsappTemplates';
import { formatIstDateTime } from '../../WhatsappProviderScreen.utils';

export type ProviderStatusStripProps = {
  provider: WhatsAppProvider | null;
};

export function ProviderStatusStrip({ provider }: ProviderStatusStripProps) {
  if (!provider) {
    return null;
  }
  return (
    <dl className="grid gap-3 border border-line bg-surface px-3 py-3 text-sm sm:grid-cols-3">
      <div>
        <dt className="font-mono text-[11px] tracking-wide text-muted">Display number</dt>
        <dd className="mt-1 font-mono text-ink">{provider.displayNumber || '—'}</dd>
      </div>
      <div>
        <dt className="font-mono text-[11px] tracking-wide text-muted">Health</dt>
        <dd className="mt-1 text-ink">{provider.health}</dd>
      </div>
      <div>
        <dt className="font-mono text-[11px] tracking-wide text-muted">Last sync (IST)</dt>
        <dd className="mt-1 font-mono text-ink">{formatIstDateTime(provider.syncedAt)}</dd>
      </div>
    </dl>
  );
}
