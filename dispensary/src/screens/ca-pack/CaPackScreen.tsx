import { CaPackEmptyState } from './components/ca-pack-empty-state';
import { CaPackFilterBar } from './components/ca-pack-filter-bar';
import { CaPackHeader } from './components/ca-pack-header';
import { CaPackSectionList } from './components/ca-pack-section-list';
import { CaPackStatusBanner } from './components/ca-pack-status-banner';
import { useCaPackPage } from './useCaPackPage';

export default function CaPackScreen() {
  const page = useCaPackPage();

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
      <CaPackHeader
        downloadRef={page.downloadRef}
        denied={!page.allowed}
        busy={page.busy}
        onDownload={() => {
          void page.onDownload();
        }}
      />
      <CaPackStatusBanner status={page.status} statusId={page.statusId} hint={page.statusHint} />
      {page.allowed ? (
        <>
          <CaPackFilterBar
            filters={page.filters}
            owner={page.owner}
            scope={page.scope}
            disabled={page.busy}
            onChange={page.onChangeFilters}
            onScope={page.onScope}
            onApply={page.onApplyFilters}
          />
          {page.status === 'loading' || page.status === 'denied' ? null : page.pack &&
            page.pack.sections.length > 0 &&
            page.status !== 'empty' ? (
            <CaPackSectionList sections={page.pack.sections} />
          ) : (
            <CaPackEmptyState />
          )}
        </>
      ) : null}
    </div>
  );
}
