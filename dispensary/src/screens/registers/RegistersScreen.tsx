import { RegistersBookList } from './components/registers-book-list';
import { RegistersEmptyState } from './components/registers-empty-state';
import { RegistersFilters } from './components/registers-filters';
import { RegistersHeader } from './components/registers-header';
import { RegistersStatusBanner } from './components/registers-status-banner';
import { RegistersTable } from './components/registers-table';
import { RegistersUpgrade } from './components/registers-upgrade';
import { useRegistersPage } from './useRegistersPage';

export default function RegistersScreen() {
  const page = useRegistersPage();

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
      <RegistersHeader
        spreadsheetRef={page.spreadsheetRef}
        pdfRef={page.pdfRef}
        denied={!page.allowed || page.planGate}
        busy={page.busy}
        onSpreadsheet={page.onSpreadsheet}
        onPdf={page.onPdf}
      />
      <RegistersStatusBanner
        status={page.status}
        statusId={page.statusId}
        hint={page.statusHint}
        planGate={page.planGate}
      />
      {page.allowed ? (
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[16rem_minmax(0,1fr)]">
          <RegistersBookList
            books={page.books}
            selectedKey={page.selectedKey}
            onSelect={page.onSelectBook}
          />
          <div className="flex min-h-0 flex-col gap-3">
            <RegistersFilters
              filters={page.filters}
              showBatch={page.showBatch}
              disabled={page.busy || page.planGate}
              onChange={page.onChangeFilters}
              onApply={page.onApplyFilters}
            />
            {page.planGate ? (
              <RegistersUpgrade
                hint={
                  page.upgradeHint ?? 'Near-expiry is on Starter. Open the plan to turn it on.'
                }
                linkRef={page.upgradeRef}
              />
            ) : page.status === 'loading' || page.status === 'denied' ? null : page.table ? (
              <RegistersTable
                title={page.table.title}
                columns={page.table.columns}
                items={page.table.items}
              />
            ) : (
              <RegistersEmptyState />
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
