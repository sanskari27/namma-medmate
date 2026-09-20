import { hasHospitalAccess } from '@/libs/hospitalAccess';
import type { RootState } from '@/store';
import {
  getHospitalAccount,
  getHospitalPrices,
  isApiError,
  saveHospitalAccount,
  saveHospitalPrices,
  type HospitalAccount,
  type HospitalCreditTerms,
  type HospitalPriceList,
} from '@/services/hospital';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { HospitalAccountFields } from './components/hospital-account-fields';
import { HospitalBillingHeader } from './components/hospital-billing-header';
import { HospitalBillingStatusBanner } from './components/hospital-billing-status-banner';
import { HospitalPositionStrip } from './components/hospital-position-strip';
import { HospitalPriceListPanel } from './components/hospital-price-list-panel';
import { HospitalTermsFields } from './components/hospital-terms-fields';
import { HOSPITAL_BILLING_CONTENT } from './HospitalBillingScreen.content';
import './HospitalBillingScreen.css';
import {
  bpsToPercent,
  mapHttpStatus,
  parseRupeesInput,
  percentToBps,
  type PageStatus,
  type SaveTarget,
} from './HospitalBillingScreen.utils';

function applyAccountDraft(account: HospitalAccount) {
  return {
    institutionName: account.institutionName ?? '',
    gstin: account.gstin ?? '',
    storesContact: account.storesContact ?? '',
    billingPhone: account.billingPhone ?? '',
    billingEmail: account.billingEmail ?? '',
    creditTerms: (account.creditTerms ?? 'NET_30') as HospitalCreditTerms,
    creditLimitRupees: account.creditLimitPaise ? String(account.creditLimitPaise / 100) : '0',
    version: account.version,
  };
}

export default function HospitalBillingScreen() {
  const user = useSelector((state: RootState) => state.auth.user);
  const allowed = hasHospitalAccess(user?.modules);
  const restoreRef = useRef<HTMLElement | null>(null);
  const [status, setStatus] = useState<PageStatus>('loading');
  const [saveTarget, setSaveTarget] = useState<SaveTarget>(null);
  const [accountBusy, setAccountBusy] = useState(false);
  const [pricesBusy, setPricesBusy] = useState(false);
  const [accountConfigured, setAccountConfigured] = useState(false);
  const [accountVersion, setAccountVersion] = useState(0);
  const [creditLimitPaise, setCreditLimitPaise] = useState(0);
  const [balancePaise, setBalancePaise] = useState(0);
  const [availableCreditPaise, setAvailableCreditPaise] = useState(0);
  const [priceItems, setPriceItems] = useState<HospitalPriceList['items']>([]);
  const [institutionName, setInstitutionName] = useState('');
  const [gstin, setGstin] = useState('');
  const [storesContact, setStoresContact] = useState('');
  const [billingPhone, setBillingPhone] = useState('');
  const [billingEmail, setBillingEmail] = useState('');
  const [creditTerms, setCreditTerms] = useState<HospitalCreditTerms>('NET_30');
  const [creditLimitRupees, setCreditLimitRupees] = useState('0');
  const [uniformPercent, setUniformPercent] = useState('0');

  const hydrate = useCallback((account: HospitalAccount, prices: HospitalPriceList) => {
    const draft = applyAccountDraft(account);
    setInstitutionName(draft.institutionName);
    setGstin(draft.gstin);
    setStoresContact(draft.storesContact);
    setBillingPhone(draft.billingPhone);
    setBillingEmail(draft.billingEmail);
    setCreditTerms(draft.creditTerms);
    setCreditLimitRupees(draft.creditLimitRupees);
    setAccountVersion(draft.version);
    setAccountConfigured(account.configured);
    setCreditLimitPaise(account.creditLimitPaise);
    setBalancePaise(account.balancePaise);
    setAvailableCreditPaise(account.availableCreditPaise);
    setPriceItems(prices.items);
    setUniformPercent(bpsToPercent(prices.uniformDiscountBps));
    setStatus(account.configured ? null : 'empty');
  }, []);

  const load = useCallback(async () => {
    if (!allowed) {
      setStatus('plan_limit');
      return;
    }
    setStatus('loading');
    try {
      const account = await getHospitalAccount();
      if (!account.configured) {
        hydrate(account, { uniformDiscountBps: 0, pendingApprovalRequestId: null, items: [] });
        return;
      }
      const prices = await getHospitalPrices();
      hydrate(account, prices);
    } catch (error) {
      if (isApiError(error)) {
        setStatus(mapHttpStatus(error.status, error.code));
      } else {
        setStatus('failure');
      }
    }
  }, [allowed, hydrate]);

  useEffect(() => {
    void load();
  }, [load]);

  const formDisabled =
    !allowed || status === 'loading' || status === 'denied' || status === 'plan_limit';

  async function onSaveAccount(trigger: HTMLButtonElement) {
    restoreRef.current = trigger;
    if (!institutionName.trim()) {
      setSaveTarget('account');
      setStatus('validation');
      return;
    }
    const limitPaise = parseRupeesInput(creditLimitRupees);
    if (limitPaise == null) {
      setSaveTarget('account');
      setStatus('validation');
      return;
    }
    setAccountBusy(true);
    setSaveTarget('account');
    try {
      const saved = await saveHospitalAccount({
        institutionName: institutionName.trim(),
        gstin: gstin.trim() || null,
        storesContact: storesContact.trim() || null,
        billingPhone: billingPhone.trim() || null,
        billingEmail: billingEmail.trim() || null,
        creditTerms,
        creditLimitPaise: limitPaise,
        expectedVersion: accountConfigured ? accountVersion : null,
      });
      const prices = await getHospitalPrices();
      hydrate(saved, prices);
      setStatus('success');
    } catch (error) {
      if (isApiError(error)) {
        setStatus(mapHttpStatus(error.status, error.code));
      } else {
        setStatus('failure');
      }
    } finally {
      setAccountBusy(false);
      restoreRef.current?.focus();
    }
  }

  async function onSavePrices(trigger: HTMLButtonElement) {
    restoreRef.current = trigger;
    if (!accountConfigured) {
      setSaveTarget('prices');
      setStatus('validation');
      return;
    }
    const uniformDiscountBps = percentToBps(uniformPercent);
    if (uniformDiscountBps == null) {
      setSaveTarget('prices');
      setStatus('validation');
      return;
    }
    setPricesBusy(true);
    setSaveTarget('prices');
    try {
      const result = await saveHospitalPrices({ uniformDiscountBps });
      setPriceItems(result.priceList.items);
      setUniformPercent(bpsToPercent(result.priceList.uniformDiscountBps));
      setStatus(result.status === 'PENDING_APPROVAL' ? 'pending_approval' : 'success');
    } catch (error) {
      if (isApiError(error)) {
        setStatus(mapHttpStatus(error.status, error.code));
      } else {
        setStatus('failure');
      }
    } finally {
      setPricesBusy(false);
      restoreRef.current?.focus();
    }
  }

  return (
    <div className="hb" aria-label={HOSPITAL_BILLING_CONTENT.regionLabel}>
      <HospitalBillingHeader
        accountBusy={accountBusy}
        pricesBusy={pricesBusy}
        accountDisabled={formDisabled}
        pricesDisabled={formDisabled || !accountConfigured}
        onSaveAccount={(trigger) => void onSaveAccount(trigger)}
        onSavePrices={(trigger) => void onSavePrices(trigger)}
      />

      <HospitalBillingStatusBanner
        status={status}
        saveTarget={saveTarget}
        onDismiss={() => setStatus(accountConfigured ? null : 'empty')}
        onRetry={() => void load()}
      />

      {allowed && status !== 'loading' && status !== 'denied' && status !== 'plan_limit' ? (
        <div className="hb-grid">
          <section className="hb-panel space-y-4" aria-label="Bill-to institution">
            <HospitalAccountFields
              institutionName={institutionName}
              gstin={gstin}
              storesContact={storesContact}
              billingPhone={billingPhone}
              billingEmail={billingEmail}
              disabled={formDisabled}
              onInstitutionName={setInstitutionName}
              onGstin={setGstin}
              onStoresContact={setStoresContact}
              onBillingPhone={setBillingPhone}
              onBillingEmail={setBillingEmail}
            />
            <HospitalTermsFields
              creditTerms={creditTerms}
              creditLimitRupees={creditLimitRupees}
              disabled={formDisabled}
              onCreditTerms={setCreditTerms}
              onCreditLimitRupees={setCreditLimitRupees}
            />
            {accountConfigured ? (
              <HospitalPositionStrip
                creditLimitPaise={creditLimitPaise}
                balancePaise={balancePaise}
                availableCreditPaise={availableCreditPaise}
              />
            ) : null}
          </section>
          <HospitalPriceListPanel
            uniformPercent={uniformPercent}
            items={priceItems}
            disabled={formDisabled || !accountConfigured}
            onUniformPercent={setUniformPercent}
          />
        </div>
      ) : null}
    </div>
  );
}
