import { useId } from 'react';
import { PosAckFooter } from './components/pos-ack-footer';
import { PosBillDiscount } from './components/pos-bill-discount';
import { PosCustomerPicker } from './components/pos-customer-picker';
import { PosDiscountApproval } from './components/pos-discount-approval';
import { PosDraftLines } from './components/pos-draft-lines';
import { PosGstBreakdown } from './components/pos-gst-breakdown';
import { PosHeader } from './components/pos-header';
import { PosPrescriptionPanel } from './components/pos-prescription-panel';
import { PosStatusBanner } from './components/pos-status-banner';
import { PosTenderPanel } from './components/pos-tender-panel';
import { PosTaxAdjustDialog } from './components/pos-tax-adjust-dialog';
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
        hint={till.statusHint}
      />
      <PosDiscountApproval status={till.invoice?.discountApprovalStatus} />
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
          {till.prescriptionDraft ? (
            <PosPrescriptionPanel
              lines={till.draft}
              prescriptionReference={till.prescriptionReference}
              onPrescriptionReferenceChange={till.setPrescriptionReference}
              prescriptionVerified={till.prescriptionVerified}
              onPrescriptionVerifiedChange={till.setPrescriptionVerified}
              onPrescribedQuantityChange={till.setPrescribedQuantity}
              doctors={till.doctors}
              selectedDoctorId={till.selectedDoctorId}
              onDoctorChange={till.setSelectedDoctorId}
              canDispense={till.canDispense}
              controlled={till.controlledDraft}
              lookupStatus={till.rxLookupStatus}
              lookupItems={till.rxLookupItems}
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
            onDiscountTypeChange={till.changeDiscountType}
            onTaxOverride={till.openTaxOverride}
            busy={till.busy}
          />
        </div>
        <div className="space-y-4">
          <PosGstBreakdown totals={till.totals} saved={Boolean(till.invoice)} />
          <PosBillDiscount
            billType={till.billType}
            billValue={till.billValue}
            customerGstin={till.customerGstin}
            onBillTypeChange={till.setBillType}
            onBillValueChange={till.setBillValue}
            onCustomerGstinChange={till.setCustomerGstin}
            onApply={till.runApplyPricing}
            disabled={!till.invoice || till.draft.length === 0 || till.collected}
            busy={till.busy}
          />
          {till.invoice ? (
            <PosTenderPanel
              tender={till.tender}
              preview={till.tenderPreview}
              totalPaise={till.invoice.totalPaise}
              walkIn={till.walkIn}
              hasCustomer={Boolean(till.selectedCustomer)}
              availablePaise={till.creditAvailablePaise}
              collected={till.collected}
              disabled={till.draft.length === 0}
              busy={till.busy}
              onChange={till.setTender}
              onCollect={till.runCollect}
            />
          ) : null}
          <PosWarningPanel
            evaluation={till.evaluation}
            productNames={Object.fromEntries(
              till.draft.map((item) => [item.product.id, item.product.name]),
            )}
          />
        </div>
      </div>
      <PosTaxAdjustDialog
        open={Boolean(till.taxProductId)}
        productName={till.taxProductName}
        gstRate={till.taxRate}
        reason={till.taxReason}
        onGstRateChange={till.setTaxRate}
        onReasonChange={till.setTaxReason}
        onOpenChange={(open) => {
          if (!open) {
            till.closeTaxOverride();
          }
        }}
        onSubmit={till.runTaxAdjust}
        onCloseFocus={() => document.getElementById('pos-product-search')?.focus()}
        busy={till.busy}
      />
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
