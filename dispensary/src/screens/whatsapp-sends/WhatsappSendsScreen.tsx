import { WhatsappSendsDetailPanel } from './components/whatsapp-sends-detail-panel';
import { WhatsappSendsEmptyState } from './components/whatsapp-sends-empty-state';
import { WhatsappSendsHeader } from './components/whatsapp-sends-header';
import { WhatsappSendsListPanel } from './components/whatsapp-sends-list-panel';
import { WhatsappSendsStatusBanner } from './components/whatsapp-sends-status-banner';
import { useWhatsappSendsPage } from './useWhatsappSendsPage';

export default function WhatsappSendsScreen() {
  const page = useWhatsappSendsPage();

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
      <WhatsappSendsHeader
        denied={!page.allowed}
        queued={page.queued}
        sent={page.sent}
        failed={page.failed}
      />
      <WhatsappSendsStatusBanner
        status={page.status}
        statusId={page.statusId}
        hint={page.statusHint}
      />
      {page.allowed ? (
        <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(16rem,20rem)_1fr]">
          <WhatsappSendsListPanel
            items={page.items}
            selectedId={page.selected?.id ?? null}
            kind={page.kind}
            onKindChange={page.setKind}
            onSelect={page.selectMessage}
          />
          {page.selected ? (
            <WhatsappSendsDetailPanel
              message={page.selected}
              busy={page.busy}
              retryRef={page.retryRef}
              onRetry={page.onRetry}
            />
          ) : page.status === 'empty' ? (
            <WhatsappSendsEmptyState />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
