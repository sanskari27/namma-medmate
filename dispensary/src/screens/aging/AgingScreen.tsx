import { AgingBucketsStrip } from './components/aging-buckets-strip';
import { AgingFilterBar } from './components/aging-filter-bar';
import { AgingHeader } from './components/aging-header';
import { AgingPartyList } from './components/aging-party-list';
import { AgingStatusBanner } from './components/aging-status-banner';
import { useAgingPage } from './useAgingPage';

export default function AgingScreen() {
  const page = useAgingPage();

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
      <AgingHeader />
      <AgingStatusBanner status={page.status} statusId={page.statusId} hint={page.statusHint} />
      {page.allowed ? (
        <>
          <AgingFilterBar
            asOf={page.asOf}
            owner={page.owner}
            scope={page.scope}
            applyRef={page.applyRef}
            onAsOf={page.setAsOf}
            onScope={page.setScope}
            onApply={page.applyAsOf}
          />
          <AgingBucketsStrip
            receivables={page.receivables}
            payables={page.payables}
            allOutlets={page.scope === 'tenant'}
          />
          <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-2">
            <AgingPartyList
              title="Patients owe us"
              empty="No khata remaining as of this date."
              items={page.receivables.items}
            />
            <AgingPartyList
              title="We owe stockists"
              empty="No stockist dues as of this date."
              items={page.payables.items}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
