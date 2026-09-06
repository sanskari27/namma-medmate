import { Reveal } from '@atoms';
import { ApprovedStructuresList } from './components/approved-structures-list';
import { ProviderStatusStrip } from './components/provider-status-strip';
import { WhatsappProviderEmptyState } from './components/whatsapp-provider-empty-state';
import { WhatsappProviderHeader } from './components/whatsapp-provider-header';
import { WhatsappProviderStatusBanner } from './components/whatsapp-provider-status-banner';
import { useWhatsappProviderPage } from './useWhatsappProviderPage';

export default function WhatsappProviderScreen() {
  const page = useWhatsappProviderPage();

  return (
    <Reveal className="space-y-5">
      <WhatsappProviderHeader
        denied={!page.allowed}
        uniqueQuery={page.uniqueQuery}
        busy={page.busy}
        rescanRef={page.rescanRef}
        onQueryChange={page.setUniqueQuery}
        onIsolate={page.onIsolate}
        onRescan={page.onRescan}
      />
      <WhatsappProviderStatusBanner status={page.status} statusId={page.statusId} />
      {page.allowed && page.status !== 'loading' && page.status !== 'denied' ? (
        <>
          <ProviderStatusStrip provider={page.provider} />
          {page.items.length > 0 ? (
            <ApprovedStructuresList items={page.items} />
          ) : page.status === 'failure' ||
            page.status === 'conflict' ||
            page.status === 'validation' ? null : (
            <WhatsappProviderEmptyState />
          )}
        </>
      ) : null}
    </Reveal>
  );
}
