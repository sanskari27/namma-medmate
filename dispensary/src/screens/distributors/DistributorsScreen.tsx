import { DistributorDueStrip } from './components/distributor-due-strip';
import { DistributorFormPanel } from './components/distributor-form-panel';
import { DistributorLedgerPanel } from './components/distributor-ledger-panel';
import { DistributorListPanel } from './components/distributor-list-panel';
import { DistributorPaymentDialog } from './components/distributor-payment-dialog';
import { DistributorsHeader } from './components/distributors-header';
import { DistributorsStatusBanner } from './components/distributors-status-banner';
import { useDistributorsPage } from './useDistributorsPage';

export default function DistributorsScreen() {
  const page = useDistributorsPage();

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <DistributorsHeader
        addButtonId={`${page.formId}-add`}
        addButtonRef={page.addRef}
        denied={!page.allowed}
        onAdd={page.startCreate}
      />
      {page.dues ? <DistributorDueStrip dues={page.dues} /> : null}
      <DistributorsStatusBanner
        status={page.status}
        statusId={page.statusId}
        asAlert={page.status === 'denied'}
        surface={page.surface}
      />
      {page.allowed ? (
        <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(16rem,20rem)_1fr]">
          <DistributorListPanel
            formId={page.formId}
            suppliers={page.suppliers}
            selectedId={page.creating ? null : (page.selected?.id ?? null)}
            query={page.query}
            showEmptyHint={page.suppliers.length === 0 && page.status !== 'loading'}
            onQueryChange={page.setQuery}
            onSearch={page.onSearch}
            onSelect={page.selectSupplier}
          />
          <div className="flex min-h-0 flex-col gap-3">
            <DistributorFormPanel
              formId={page.formId}
              form={page.form}
              selected={page.creating ? null : page.selected}
              creating={page.creating}
              busy={page.busy}
              categories={page.categories}
              outletName={page.outletName}
              onChange={page.onChange}
              onCancel={page.cancelEdit}
              onSubmit={page.onSubmit}
            />
            {page.creating || !page.selected ? null : (
              <DistributorLedgerPanel
                ledger={page.ledger}
                loading={page.ledgerLoading}
                payButtonRef={page.payRef}
                onPay={() => {
                  page.setPayError(null);
                  page.setPayOpen(true);
                }}
              />
            )}
          </div>
        </div>
      ) : null}
      <DistributorPaymentDialog
        open={page.payOpen}
        busy={page.payBusy}
        error={page.payError}
        onOpenChange={page.setPayOpen}
        onSubmit={(input) => void page.onPay(input)}
        onCloseFocus={() => page.payRef.current?.focus()}
      />
    </div>
  );
}
