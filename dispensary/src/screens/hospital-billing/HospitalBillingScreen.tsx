import { HospitalBillingAccountWorkspace } from './components/hospital-billing-account-workspace';
import { HospitalBillingHeader } from './components/hospital-billing-header';
import { HospitalBillingStatusBanner } from './components/hospital-billing-status-banner';
import { HospitalPaymentDialog } from './components/hospital-payment-dialog';
import { HospitalReturnDialog } from './components/hospital-return-dialog';
import { HospitalStatementWorkspace } from './components/hospital-statement-workspace';
import { HospitalWardStockWorkspace } from './components/hospital-ward-stock-workspace';
import { HOSPITAL_BILLING_CONTENT } from './HospitalBillingScreen.content';
import './HospitalBillingScreen.css';
import { useHospitalBilling } from './useHospitalBilling';

export default function HospitalBillingScreen() {
  const page = useHospitalBilling();

  return (
    <div className="hb" aria-label={HOSPITAL_BILLING_CONTENT.regionLabel}>
      <HospitalBillingHeader
        view={page.view}
        canStatement={page.canStatement}
        accountBusy={page.accountBusy}
        pricesBusy={page.pricesBusy}
        returnBusy={page.returnBusy}
        paymentBusy={page.paymentBusy}
        reminderBusy={page.reminderBusy}
        exportBusy={page.exportBusy}
        accountDisabled={page.formDisabled}
        pricesDisabled={page.formDisabled || !page.accountConfigured}
        actionDisabled={page.formDisabled}
        onViewChange={page.setView}
        onSaveAccount={(trigger) => void page.onSaveAccount(trigger)}
        onSavePrices={(trigger) => void page.onSavePrices(trigger)}
        onRecordReturn={(trigger) => void page.onRecordReturn(trigger)}
        onRecordPayment={page.onRecordPayment}
        onSendReminder={(trigger) => void page.onSendReminder(trigger)}
        onExportCsv={(trigger) => void page.onExport('csv', trigger)}
        onExportPdf={(trigger) => void page.onExport('pdf', trigger)}
      />

      <HospitalBillingStatusBanner
        status={page.status}
        saveTarget={page.saveTarget}
        errorCode={page.errorCode}
        view={page.view}
        onDismiss={page.onDismiss}
        onRetry={() => void page.load()}
      />

      {page.showWorkspace && page.view === 'account' ? (
        <HospitalBillingAccountWorkspace
          institutionName={page.institutionName}
          gstin={page.gstin}
          storesContact={page.storesContact}
          billingPhone={page.billingPhone}
          billingEmail={page.billingEmail}
          creditTerms={page.creditTerms}
          creditLimitRupees={page.creditLimitRupees}
          accountConfigured={page.accountConfigured}
          creditLimitPaise={page.creditLimitPaise}
          balancePaise={page.balancePaise}
          availableCreditPaise={page.availableCreditPaise}
          uniformPercent={page.uniformPercent}
          priceItems={page.priceItems}
          disabled={page.formDisabled}
          onInstitutionName={page.setInstitutionName}
          onGstin={page.setGstin}
          onStoresContact={page.setStoresContact}
          onBillingPhone={page.setBillingPhone}
          onBillingEmail={page.setBillingEmail}
          onCreditTerms={page.setCreditTerms}
          onCreditLimitRupees={page.setCreditLimitRupees}
          onUniformPercent={page.setUniformPercent}
        />
      ) : null}

      {page.showWorkspace && page.view === 'stock' ? (
        <HospitalWardStockWorkspace items={page.stockItems} />
      ) : null}

      {page.showWorkspace && page.view === 'statement' && page.statement ? (
        <HospitalStatementWorkspace
          statement={page.statement}
          includePatient={page.includePatient}
          onIncludePatient={page.onIncludePatient}
        />
      ) : null}

      <HospitalReturnDialog
        open={page.returnOpen}
        issues={page.issues}
        issueId={page.returnIssueId}
        productId={page.returnProductId}
        quantity={page.returnQty}
        busy={page.returnBusy}
        message={page.returnMessage}
        onIssueId={page.onSelectIssue}
        onProductId={page.setReturnProductId}
        onQuantity={page.setReturnQty}
        onClose={() => page.setReturnOpen(false)}
        onConfirm={() => void page.onConfirmReturn()}
        onCloseAutoFocus={() => page.restoreRef.current?.focus()}
      />

      <HospitalPaymentDialog
        open={page.paymentOpen}
        amountRupees={page.payAmount}
        mode={page.payMode}
        reference={page.payReference}
        busy={page.paymentBusy}
        message={page.paymentMessage}
        onAmountRupees={page.setPayAmount}
        onMode={page.setPayMode}
        onReference={page.setPayReference}
        onClose={() => page.setPaymentOpen(false)}
        onConfirm={() => void page.onConfirmPayment()}
        onCloseAutoFocus={() => page.restoreRef.current?.focus()}
      />
    </div>
  );
}
