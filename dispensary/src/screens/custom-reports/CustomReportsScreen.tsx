import { CustomReportsColumns } from './components/custom-reports-columns';
import { CustomReportsDataset } from './components/custom-reports-dataset';
import { CustomReportsDateBranch } from './components/custom-reports-date-branch';
import { CustomReportsEmptyState } from './components/custom-reports-empty-state';
import { CustomReportsFilters } from './components/custom-reports-filters';
import { CustomReportsHeader } from './components/custom-reports-header';
import { CustomReportsPreviewTable } from './components/custom-reports-preview-table';
import { CustomReportsStatusBanner } from './components/custom-reports-status-banner';
import { useCustomReportsPage } from './useCustomReportsPage';

export default function CustomReportsScreen() {
  const page = useCustomReportsPage();
  const showBuilder = page.allowed && !page.planGate;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
      <CustomReportsHeader
        spreadsheetRef={page.spreadsheetRef}
        pdfRef={page.pdfRef}
        denied={!page.allowed || page.planGate}
        planGate={page.planGate}
        busy={page.busy}
        onSpreadsheet={page.onSpreadsheet}
        onPdf={page.onPdf}
      />
      <CustomReportsStatusBanner
        status={page.status}
        statusId={page.statusId}
        hint={page.statusHint}
      />
      {showBuilder ? (
        <>
          <CustomReportsDataset
            datasets={page.catalog?.datasets ?? []}
            selected={page.dataset}
            disabled={page.busy}
            onSelect={page.onSelectDataset}
          />
          <CustomReportsColumns
            fields={page.fields}
            selected={page.columns}
            disabled={page.busy}
            onToggle={page.onToggleColumn}
          />
          <CustomReportsFilters
            fields={page.fields}
            operators={page.operators}
            draft={page.filter}
            disabled={page.busy}
            onChange={page.onFilter}
          />
          <CustomReportsDateBranch
            from={page.from}
            to={page.to}
            owner={page.owner}
            scope={page.scope}
            disabled={page.busy}
            applyRef={page.applyRef}
            onFrom={page.onFrom}
            onTo={page.onTo}
            onScope={page.onScope}
            onApply={page.onApply}
          />
          {page.status === 'success' && page.preview ? (
            <CustomReportsPreviewTable
              title={
                page.catalog?.datasets.find((item) => item.key === page.preview?.dataset)?.label ??
                'Report'
              }
              columns={page.preview.columns}
              items={page.preview.items}
            />
          ) : null}
          {page.status === 'empty' ? <CustomReportsEmptyState /> : null}
        </>
      ) : null}
    </div>
  );
}
