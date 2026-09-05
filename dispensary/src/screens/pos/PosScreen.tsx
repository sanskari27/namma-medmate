import { useId } from 'react';
import { PosAckFooter } from './components/pos-ack-footer';
import { PosBillTotals } from './components/pos-bill-totals';
import { PosControlledGate } from './components/pos-controlled-gate';
import { PosCustomerPicker } from './components/pos-customer-picker';
import { PosDraftLines } from './components/pos-draft-lines';
import { PosHeader } from './components/pos-header';
import { PosStatusBanner } from './components/pos-status-banner';
import { PosWarningPanel } from './components/pos-warning-panel';
import { usePosTill } from './usePosTill';

export default function PosScreen() {
  const titleId = useId();
  const statusId = useId();
  const till = usePosTill();

  if (!till.allowed) {
    return (
      <div className="space-y-4 p-4" aria-labelledby={titleId}>
        <PosHeader titleId={titleId} />
        <PosStatusBanner status="denied" statusId={statusId} />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4" aria-labelledby={titleId}>
      <PosHeader titleId={titleId} invoiceNumber={till.invoice?.invoiceNumber} />
      <PosStatusBanner
        status={till.status}
        statusId={statusId}
        invoiceNumber={till.invoice?.invoiceNumber}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <PosCustomerPicker
            query={till.customerQuery}
            onQueryChange={till.setCustomerQuery}
            customers={till.customers}
            selected={till.selectedCustomer}
            walkIn={till.walkIn}
            onSelect={till.selectCustomer}
            onClear={till.clearCustomer}
            onWalkIn={till.skipWalkIn}
            busy={till.busy}
          />
          {till.controlledDraft ? (
            <PosControlledGate
              doctors={till.doctors}
              selectedDoctorId={till.selectedDoctorId}
              onDoctorChange={till.setSelectedDoctorId}
              prescriptionVerified={till.prescriptionVerified}
              onPrescriptionVerifiedChange={till.setPrescriptionVerified}
              canDispense={till.canDispense}
              busy={till.busy}
            />
          ) : null}
          <PosDraftLines
            query={till.productQuery}
            onQueryChange={till.setProductQuery}
            catalogue={till.catalogue}
            draft={till.draft}
            onAdd={till.addProduct}
            onRemove={till.removeProduct}
            onUnitChange={till.changeUnit}
            onQuantityChange={till.changeQuantity}
            onBatchChange={till.changeBatch}
            onMrpChange={till.changeMrp}
            onSellingChange={till.changeSelling}
            onDiscountChange={till.changeDiscount}
            busy={till.busy}
          />
        </div>
        <div className="space-y-4">
          <PosBillTotals totals={till.totals} saved={Boolean(till.invoice)} />
          <PosWarningPanel
            evaluation={till.evaluation}
            productNames={Object.fromEntries(
              till.draft.map((item) => [item.product.id, item.product.name]),
            )}
          />
        </div>
      </div>
      <PosAckFooter
        reason={till.reason}
        onReasonChange={till.setReason}
        onEvaluate={till.runEvaluate}
        onComplete={till.runComplete}
        onSave={till.runSave}
        evaluateDisabled={till.draft.length === 0}
        completeDisabled={till.draft.length === 0}
        saveDisabled={till.draft.length === 0}
        busy={till.busy}
        showReason={till.showReason}
      />
    </div>
  );
}
