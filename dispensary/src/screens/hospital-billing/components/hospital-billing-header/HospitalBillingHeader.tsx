import { Button } from '@atoms';
import { HOSPITAL_BILLING_CONTENT } from '../../HospitalBillingScreen.content';

export function HospitalBillingHeader({
  accountBusy,
  pricesBusy,
  accountDisabled,
  pricesDisabled,
  onSaveAccount,
  onSavePrices,
}: {
  accountBusy: boolean;
  pricesBusy: boolean;
  accountDisabled: boolean;
  pricesDisabled: boolean;
  onSaveAccount: (trigger: HTMLButtonElement) => void;
  onSavePrices: (trigger: HTMLButtonElement) => void;
}) {
  return (
    <header className="hb-header">
      <div>
        <h1 className="font-serif text-xl text-ink">{HOSPITAL_BILLING_CONTENT.title}</h1>
        <p className="mt-1 text-sm text-muted">{HOSPITAL_BILLING_CONTENT.subtitle}</p>
      </div>
      <div className="flex flex-wrap gap-2">
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
      </div>
    </header>
  );
}
