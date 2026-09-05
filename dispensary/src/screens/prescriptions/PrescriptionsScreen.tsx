import { PrescriptionDetailPanel } from './components/prescription-detail-panel';
import { PrescriptionListPanel } from './components/prescription-list-panel';
import { PrescriptionsFilter } from './components/prescriptions-filter';
import { PrescriptionsHeader } from './components/prescriptions-header';
import { PrescriptionsStatusBanner } from './components/prescriptions-status-banner';
import { usePrescriptionsPage } from './usePrescriptionsPage';

export default function PrescriptionsScreen() {
  const page = usePrescriptionsPage();

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
      <PrescriptionsHeader
        archiveRef={page.archiveRef}
        denied={!page.allowed}
        onScan={page.onScan}
      />
      <PrescriptionsStatusBanner
        status={page.status}
        statusId={page.statusId}
        hint={page.statusHint}
      />
      {page.allowed ? (
        <>
          <PrescriptionsFilter
            filter={page.filter}
            disabled={page.busy}
            onChange={page.setFilter}
          />
          <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(16rem,20rem)_1fr]">
            <PrescriptionListPanel
              items={page.items}
              selectedId={page.selected?.id ?? null}
              onSelect={page.selectReference}
            />
            <PrescriptionDetailPanel
              selected={page.selected}
              busy={page.busy}
              onArchive={page.onArchive}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
