import { Button } from '@atoms';
import { HOSPITAL_BILLING_CONTENT } from '../../HospitalBillingScreen.content';
import type { BillingView } from '../../HospitalBillingScreen.utils';

const VIEWS: Array<{ id: BillingView; label: string }> = [
  { id: 'account', label: HOSPITAL_BILLING_CONTENT.viewAccount },
  { id: 'stock', label: HOSPITAL_BILLING_CONTENT.viewStock },
  { id: 'statement', label: HOSPITAL_BILLING_CONTENT.viewStatement },
];

export function HospitalBillingHeader({
  view,
  canStatement,
  accountBusy,
  pricesBusy,
  returnBusy,
  paymentBusy,
  reminderBusy,
  exportBusy,
  accountDisabled,
  pricesDisabled,
  actionDisabled,
  onViewChange,
  onSaveAccount,
  onSavePrices,
  onRecordReturn,
  onRecordPayment,
  onSendReminder,
  onExportCsv,
  onExportPdf,
}: {
  view: BillingView;
  canStatement: boolean;
  accountBusy: boolean;
  pricesBusy: boolean;
  returnBusy: boolean;
  paymentBusy: boolean;
  reminderBusy: boolean;
  exportBusy: boolean;
  accountDisabled: boolean;
  pricesDisabled: boolean;
  actionDisabled: boolean;
  onViewChange: (view: BillingView) => void;
  onSaveAccount: (trigger: HTMLButtonElement) => void;
  onSavePrices: (trigger: HTMLButtonElement) => void;
  onRecordReturn: (trigger: HTMLButtonElement) => void;
  onRecordPayment: (trigger: HTMLButtonElement) => void;
  onSendReminder: (trigger: HTMLButtonElement) => void;
  onExportCsv: (trigger: HTMLButtonElement) => void;
  onExportPdf: (trigger: HTMLButtonElement) => void;
}) {
  const tabs = canStatement ? VIEWS : VIEWS.filter((row) => row.id !== 'statement');

  return (
    <header className="hb-header">
      <div>
        <h1 className="font-serif text-xl text-ink">{HOSPITAL_BILLING_CONTENT.title}</h1>
        <p className="mt-1 text-sm text-muted">{HOSPITAL_BILLING_CONTENT.subtitle}</p>
        <div
          className="hb-tabs"
          role="tablist"
          aria-label={HOSPITAL_BILLING_CONTENT.workspaceLabel}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={view === tab.id}
              className="hb-tab"
              onClick={() => onViewChange(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {view === 'account' ? (
          <>
            <Button
              type="button"
              variant="outline"
              disabled={accountDisabled || accountBusy}
              aria-busy={accountBusy}
              onClick={(event) => onSaveAccount(event.currentTarget)}
            >
              {HOSPITAL_BILLING_CONTENT.saveAccount}
            </Button>
            <Button
              type="button"
              disabled={pricesDisabled || pricesBusy}
              aria-busy={pricesBusy}
              onClick={(event) => onSavePrices(event.currentTarget)}
            >
              {HOSPITAL_BILLING_CONTENT.savePrices}
            </Button>
          </>
        ) : null}
        {view === 'stock' ? (
          <Button
            type="button"
            disabled={actionDisabled || returnBusy}
            aria-busy={returnBusy}
            onClick={(event) => onRecordReturn(event.currentTarget)}
          >
            {HOSPITAL_BILLING_CONTENT.recordReturn}
          </Button>
        ) : null}
        {view === 'statement' && canStatement ? (
          <>
            <Button
              type="button"
              variant="outline"
              disabled={actionDisabled || exportBusy}
              aria-busy={exportBusy}
              onClick={(event) => onExportCsv(event.currentTarget)}
            >
              {HOSPITAL_BILLING_CONTENT.downloadExcel}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={actionDisabled || exportBusy}
              aria-busy={exportBusy}
              onClick={(event) => onExportPdf(event.currentTarget)}
            >
              {HOSPITAL_BILLING_CONTENT.downloadPdf}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={actionDisabled || reminderBusy}
              aria-busy={reminderBusy}
              onClick={(event) => onSendReminder(event.currentTarget)}
            >
              {HOSPITAL_BILLING_CONTENT.sendReminder}
            </Button>
            <Button
              type="button"
              disabled={actionDisabled || paymentBusy}
              aria-busy={paymentBusy}
              onClick={(event) => onRecordPayment(event.currentTarget)}
            >
              {HOSPITAL_BILLING_CONTENT.recordPayment}
            </Button>
          </>
        ) : null}
      </div>
    </header>
  );
}
