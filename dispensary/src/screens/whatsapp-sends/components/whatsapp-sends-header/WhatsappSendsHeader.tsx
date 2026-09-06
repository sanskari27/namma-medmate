import { Reveal } from '@atoms';
import { ROUTES } from '@/libs/constants/routes.const';
import { Link } from 'react-router-dom';

export type WhatsappSendsHeaderProps = {
  denied?: boolean;
  queued: number;
  sent: number;
  failed: number;
};

export function WhatsappSendsHeader({
  denied = false,
  queued,
  sent,
  failed,
}: WhatsappSendsHeaderProps) {
  return (
    <Reveal>
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">WhatsApp sends</h1>
          <p className="mt-1 text-sm text-muted">
            Preview queued, sent, and failed patient messages. Retry a failed send from this
            counter.
          </p>
        </div>
        {denied ? null : (
          <div className="flex flex-wrap items-center gap-3">
            <p className="font-mono text-xs text-muted">
              {queued} queued · {sent} sent · {failed} failed
            </p>
            <Link
              to={ROUTES.CAMPAIGNS}
              className="inline-flex h-9 items-center border border-line bg-surface px-3 text-sm text-ink hover:bg-brand-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              Tag broadcasts
            </Link>
          </div>
        )}
      </header>
    </Reveal>
  );
}
