import { GoodsReceiptDialog } from './components/goods-receipt-dialog';
import { PurchaseOrderListPanel } from './components/purchase-order-list-panel';
import { PurchaseOrderPanel } from './components/purchase-order-panel';
import { PurchasesHeader } from './components/purchases-header';
import { PurchasesProStrip } from './components/purchases-pro-strip';
import { PurchasesStatusBanner } from './components/purchases-status-banner';
import { ReorderDraftDialog } from './components/reorder-draft-dialog';
import { isProPlan } from './PurchasesScreen.utils';
import { usePurchasesPage } from './usePurchasesPage';

export default function PurchasesScreen() {
  const page = usePurchasesPage();

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <PurchasesHeader
        addButtonId={`${page.formId}-add`}
        addButtonRef={page.addRef}
        reorderButtonId={`${page.formId}-reorder`}
        reorderButtonRef={page.reorderRef}
        denied={!page.allowed}
        onAdd={page.startCreate}
        onReorderDraft={() => page.setReorderOpen(true)}
      />
      <PurchasesStatusBanner
        status={page.status}
        statusId={page.statusId}
        asAlert={page.status === 'denied'}
      />
      {page.allowed && isProPlan(page.planCode) ? (
        <PurchasesProStrip
          drafts={page.orders.filter((row) => row.status === 'DRAFT')}
          busy={page.busy}
          analytics={page.analytics}
          spendStatus={page.spendStatus}
          onIssue={(items) => {
            void page.onBulkIssue(items);
          }}
        />
      ) : null}
      {page.allowed ? (
        <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(16rem,20rem)_1fr]">
          <PurchaseOrderListPanel
            formId={page.formId}
            orders={page.orders}
            selectedId={page.creating ? null : (page.selected?.id ?? null)}
            query={page.query}
            showEmptyHint={page.orders.length === 0 && page.status !== 'loading'}
            onQueryChange={page.setQuery}
            onSelect={(order) => {
              void page.selectOrder(order);
            }}
          />
          <PurchaseOrderPanel
            formId={page.formId}
            form={page.form}
            selected={page.creating ? null : page.selected}
            creating={page.creating}
            busy={page.busy}
            suppliers={page.suppliers}
            products={page.products}
            versions={page.versions}
            leftVersion={page.leftVersion}
            rightVersion={page.rightVersion}
            onChange={page.onChange}
            onLinesChange={(lines) => page.onChange('lines', lines)}
            onLeftVersion={page.setLeftVersion}
            onRightVersion={page.setRightVersion}
            onCancel={page.cancelEdit}
            onSubmit={page.onSubmit}
            onIssue={() => {
              void page.runTransition(page.issuePurchaseOrder);
            }}
            onClose={() => {
              void page.runTransition(page.closePurchaseOrder);
            }}
            onCancelOrder={() => {
              void page.runTransition(page.cancelPurchaseOrder);
            }}
            receiptButtonRef={page.receiptButtonRef}
            onRecordDelivery={() => page.setReceiptOpen(true)}
          />
        </div>
      ) : null}
      <ReorderDraftDialog
        open={page.reorderOpen}
        onOpenChange={page.setReorderOpen}
        onCreated={page.onReorderCreated}
        onCloseFocus={() => page.reorderRef.current?.focus()}
        onPageStatus={page.setStatus}
      />
      <GoodsReceiptDialog
        open={page.receiptOpen}
        purchaseOrderId={page.selected?.id ?? null}
        onOpenChange={page.setReceiptOpen}
        onRecorded={() => page.setStatus('success')}
        onCloseFocus={() => page.receiptButtonRef.current?.focus()}
      />
    </div>
  );
}
