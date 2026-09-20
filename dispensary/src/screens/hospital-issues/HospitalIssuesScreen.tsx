import { hasHospitalAccess } from '@/libs/hospitalAccess';
import type { RootState } from '@/store';
import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { HospitalIssueCreateDialog } from './components/hospital-issue-create-dialog';
import { HospitalIssueInvoiceOverlay } from './components/hospital-issue-invoice-overlay';
import { HospitalIssuesDetail } from './components/hospital-issues-detail';
import { HospitalIssuesFilters } from './components/hospital-issues-filters';
import { HospitalIssuesHeader } from './components/hospital-issues-header';
import { HospitalIssuesList } from './components/hospital-issues-list';
import { HospitalIssuesStatusBanner } from './components/hospital-issues-status-banner';
import { HOSPITAL_ISSUES_CONTENT } from './HospitalIssuesScreen.content';
import './HospitalIssuesScreen.css';
import { matchesIssueFilter } from './HospitalIssuesScreen.utils';
import { useHospitalIssuesBoard } from './useHospitalIssuesBoard';

export default function HospitalIssuesScreen() {
  const user = useSelector((state: RootState) => state.auth.user);
  const allowed = hasHospitalAccess(user?.modules);
  const [searchParams] = useSearchParams();
  const board = useHospitalIssuesBoard(allowed, user?.activeBranchId);
  const consumeIndentPrefill = board.consumeIndentPrefill;

  useEffect(() => {
    consumeIndentPrefill(searchParams.get('indent'));
  }, [consumeIndentPrefill, searchParams]);

  const filteredItems = board.board.items.filter((issue) =>
    matchesIssueFilter(issue, board.wardFilter, board.kindFilter, board.query),
  );
  const disabled = !allowed || board.status === 'loading' || !user?.activeBranchId;

  return (
    <main className="hj" aria-label={HOSPITAL_ISSUES_CONTENT.regionLabel}>
      <HospitalIssuesHeader disabled={disabled} onNewIssue={() => void board.openDialog()} />
      <HospitalIssuesStatusBanner
        status={board.status}
        message={board.message}
        onDismiss={board.dismiss}
        onRetry={() => void board.load()}
      />
      {allowed && user?.activeBranchId && board.status !== 'loading' && board.status !== 'denied' ? (
        <div className="hj-board">
          <div>
            <HospitalIssuesFilters
              wards={board.wards}
              wardId={board.wardFilter}
              kind={board.kindFilter}
              query={board.query}
              onWardChange={board.setWardFilter}
              onKindChange={board.setKindFilter}
              onQueryChange={board.setQuery}
            />
            <HospitalIssuesList
              items={filteredItems}
              selectedId={board.selectedIssue?.id ?? null}
              onSelect={(issue) => board.setSelectedId(issue.id)}
            />
          </div>
          <HospitalIssuesDetail
            issue={board.selectedIssue}
            pdfBusy={board.pdfBusy}
            onPrint={() => board.selectedIssue && void board.openPdf(board.selectedIssue, true)}
            onDownload={() => board.selectedIssue && void board.openPdf(board.selectedIssue, false)}
          />
        </div>
      ) : null}
      <HospitalIssueCreateDialog
        open={board.dialogOpen}
        draft={board.draft}
        wards={board.wards}
        products={board.products}
        batchesByProduct={board.batchesByProduct}
        busy={board.saveBusy}
        message={board.dialogMessage}
        onChange={board.setDraft}
        onProductChange={(index, productId) => void board.onProductChange(index, productId)}
        onClose={board.closeDialog}
        onSave={() => void board.saveIssue()}
      />
      <HospitalIssueInvoiceOverlay open={board.pdfBusy} />
    </main>
  );
}
