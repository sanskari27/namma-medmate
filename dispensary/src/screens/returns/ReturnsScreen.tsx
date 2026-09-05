import { ReturnsDecisionForm } from './components/returns-decision-form';
import { ReturnsHeader } from './components/returns-header';
import { ReturnsInvoiceLocator } from './components/returns-invoice-locator';
import { ReturnsLinePicker } from './components/returns-line-picker';
import { ReturnsList } from './components/returns-list';
import { ReturnsRefundSummary } from './components/returns-refund-summary';
import { ReturnsStatusBanner } from './components/returns-status-banner';
import { useReturnsPage } from './useReturnsPage';

export default function ReturnsScreen() {
  const page = useReturnsPage();

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
      <ReturnsHeader />
      <ReturnsStatusBanner status={page.status} statusId={page.statusId} hint={page.statusHint} />
      {page.allowed ? (
        <>
          <ReturnsInvoiceLocator
            query={page.query}
            busy={page.busy}
            onQueryChange={page.setQuery}
            onFind={() => void page.findBill()}
          />
          {page.invoice ? (
            <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1fr)_16rem]">
              <div className="grid gap-3">
                <ReturnsLinePicker
                  invoice={page.invoice}
                  qtyByLine={page.qtyByLine}
                  onQtyChange={page.changeQty}
                />
                <ReturnsDecisionForm
                  reason={page.reason}
                  refundMode={page.refundMode}
                  busy={page.busy}
                  creditNoteDisabled={!page.invoice.customerId}
                  onReasonChange={page.setReason}
                  onRefundModeChange={page.setRefundMode}
                  onPreview={() => void page.onPreview()}
                  onConfirm={(event) => void page.onConfirm(event)}
                />
              </div>
              {page.preview ? <ReturnsRefundSummary preview={page.preview} /> : null}
            </div>
          ) : null}
          <ReturnsList items={page.returns} />
        </>
      ) : null}
    </div>
  );
}
