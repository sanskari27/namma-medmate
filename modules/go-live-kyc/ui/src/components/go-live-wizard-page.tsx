import { useState } from 'react';
import { Button, Input, Label, StatusBanner } from '@namma-medmate/shared-ui';
import { t } from '../lib/copy.ts';
import { useGoLiveKycEvents } from '../hooks/use-go-live-kyc-events.ts';
import {
  useCompleteWizardMutation,
  useGetStatusQuery,
  usePostStep2Mutation,
  usePutKycMutation,
  usePutStep1Mutation,
  usePutStep3Mutation,
  usePutStep4Mutation,
  usePutStep5Mutation,
  useRerunWizardMutation,
  type StatusData,
} from '../store/api/go-live-kyc-api.ts';

export interface GoLiveWizardPageProps {
  skipQuery?: boolean;
  error?: boolean;
  status?: StatusData;
  locationId?: string;
}

const DEFAULT_STATUS: StatusData = {
  kyc_status: 'not_submitted',
  wizard_status: 'not_started',
  kyc_reject_reason: null,
  gstin: null,
  pan: null,
  bank_account_number_masked: null,
  wizard_progress: {
    steps: {
      '1_profile': { status: 'not_started' },
      '2_opening_stock': { status: 'not_started' },
      '3_opening_books': { status: 'not_started' },
      '4_invoice': { status: 'not_started' },
      '5_first_user': { status: 'not_started' },
    },
  },
  gate: {
    allowed: false,
    kyc_status: 'not_submitted',
    wizard_status: 'not_started',
    blockers: ['GO_LIVE_KYC_INCOMPLETE', 'GO_LIVE_WIZARD_INCOMPLETE'],
  },
};

export function GoLiveWizardPage({
  skipQuery = false,
  error = false,
  status: seeded,
  locationId = '',
}: GoLiveWizardPageProps) {
  const events = useGoLiveKycEvents();
  const query = useGetStatusQuery(undefined, { skip: skipQuery || !locationId });
  const [putKyc] = usePutKycMutation();
  const [putStep1] = usePutStep1Mutation();
  const [postStep2] = usePostStep2Mutation();
  const [putStep3] = usePutStep3Mutation();
  const [putStep4] = usePutStep4Mutation();
  const [putStep5] = usePutStep5Mutation();
  const [complete] = useCompleteWizardMutation();
  const [rerun] = useRerunWizardMutation();
  const [gstin, setGstin] = useState('29ABCDE1234F1Z5');
  const [pan, setPan] = useState('ABCDE1234F');
  const [prefix, setPrefix] = useState('INV');
  const [pin, setPin] = useState('4455');
  const [printSample, setPrintSample] = useState(true);
  const [stepError, setStepError] = useState(false);
  const status = seeded ?? query.data ?? DEFAULT_STATUS;
  const showError = error || query.isError || stepError;
  const rejected = status.kyc_reject_reason;

  async function run(action: () => Promise<unknown>): Promise<void> {
    setStepError(false);
    try {
      await action();
      events.wizardUpdated(locationId);
    } catch {
      setStepError(true);
    }
  }

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold text-ink">{t('goLiveKyc.wizard.title')}</h1>
        <p className="text-muted-foreground">{t('goLiveKyc.wizard.subtitle')}</p>
      </header>
      {rejected ? (
        <StatusBanner tone="error">
          {t('goLiveKyc.wizard.rejected', { reason: rejected })}
        </StatusBanner>
      ) : null}
      {showError ? <StatusBanner tone="error">{t('goLiveKyc.wizard.error')}</StatusBanner> : null}
      {status.wizard_status === 'completed' ? (
        <Button type="button" onClick={() => void run(async () => rerun().unwrap())}>
          {t('goLiveKyc.wizard.rerun')}
        </Button>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        <Label>
          {t('goLiveKyc.fields.gstin')}
          <Input value={gstin} onChange={(event) => setGstin(event.target.value)} />
        </Label>
        <Label>
          {t('goLiveKyc.fields.pan')}
          <Input value={pan} onChange={(event) => setPan(event.target.value)} />
        </Label>
        <Label>
          {t('goLiveKyc.fields.prefix')}
          <Input value={prefix} onChange={(event) => setPrefix(event.target.value)} />
        </Label>
        <Label>
          {t('goLiveKyc.fields.pin')}
          <Input value={pin} onChange={(event) => setPin(event.target.value)} />
        </Label>
      </div>
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={printSample}
          onChange={(event) => setPrintSample(event.target.checked)}
        />
        {t('goLiveKyc.fields.printSample')}
      </label>
      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          onClick={() =>
            void run(async () =>
              putStep1({
                gstin,
                drug_licence_no: 'KA-20-123456',
                drug_licence_expiry: '2027-01-14',
                pharmacist_name: 'Anita Sharma',
                pharmacist_registration_no: 'KA-12345',
                pharmacist_registration_expiry: '2027-03-31',
                e_invoicing_enabled: false,
              }).unwrap(),
            )
          }
        >
          {t('goLiveKyc.step.1')}
        </Button>
        <Button
          type="button"
          onClick={() => void run(async () => postStep2({ zero_stock: true }).unwrap())}
        >
          {t('goLiveKyc.wizard.skipZero')}
        </Button>
        <Button
          type="button"
          onClick={() => void run(async () => putStep3({ start_at_zero: true }).unwrap())}
        >
          {t('goLiveKyc.wizard.skipBooks')}
        </Button>
        <Button
          type="button"
          onClick={() =>
            void run(async () =>
              putStep4({ invoice_prefix: prefix, print_sample_confirmed: printSample }).unwrap(),
            )
          }
        >
          {t('goLiveKyc.step.4')}
        </Button>
        <Button
          type="button"
          onClick={() =>
            void run(async () => putStep5({ owner_only: true, owner_pin: pin }).unwrap())
          }
        >
          {t('goLiveKyc.wizard.skipOwner')}
        </Button>
        <Button
          type="button"
          onClick={() =>
            void run(async () =>
              putKyc({
                gstin,
                pan,
                drug_licence_no: 'KA-20-123456',
                drug_licence_expiry: '2027-01-14',
                pharmacist_name: 'Anita Sharma',
                pharmacist_registration_no: 'KA-12345',
                pharmacist_registration_expiry: '2027-03-31',
                e_invoicing_enabled: false,
                bank_account_holder: 'Anita Sharma',
                bank_account_number: '123456789012',
                bank_ifsc: 'HDFC0001234',
              }).unwrap(),
            )
          }
        >
          {t('goLiveKyc.wizard.submitKyc')}
        </Button>
        <Button type="button" onClick={() => void run(async () => complete().unwrap())}>
          {t('goLiveKyc.wizard.complete')}
        </Button>
      </div>
    </section>
  );
}
