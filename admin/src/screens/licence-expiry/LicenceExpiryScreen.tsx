import { Reveal } from '@atoms';
import { LicenceExpiryDueList } from './components/licence-expiry-due-list';
import { LicenceExpiryEmptyState } from './components/licence-expiry-empty-state';
import { LicenceExpiryHeader } from './components/licence-expiry-header';
import { LicenceExpiryStatusBanner } from './components/licence-expiry-status-banner';
import { useLicenceExpiryPage } from './useLicenceExpiryPage';

export default function LicenceExpiryScreen() {
  const page = useLicenceExpiryPage();

  return (
    <Reveal className="space-y-5">
      <LicenceExpiryHeader
        denied={!page.allowed}
        tenantQuery={page.tenantQuery}
        busy={page.busy}
        rescanRef={page.rescanRef}
        onQueryChange={page.setTenantQuery}
        onIsolate={page.onIsolate}
        onRescan={page.onRescan}
      />
      <LicenceExpiryStatusBanner status={page.status} statusId={page.statusId} />
      {page.allowed && page.status !== 'loading' && page.status !== 'denied' ? (
        page.items.length > 0 ? (
          <LicenceExpiryDueList items={page.items} />
        ) : page.status === 'failure' ||
          page.status === 'conflict' ||
          page.status === 'validation' ? null : (
          <LicenceExpiryEmptyState />
        )
      ) : null}
    </Reveal>
  );
}
