import { hasHospitalAccess } from '@/libs/hospitalAccess';
import type { RootState } from '@/store';
import {
  createHospitalReturn,
  downloadHospitalStatement,
  getHospitalAccount,
  getHospitalIssue,
  getHospitalIssues,
  getHospitalPrices,
  getHospitalStatement,
  getHospitalWardStock,
  isApiError,
  recordHospitalPayment,
  saveHospitalAccount,
  saveHospitalPrices,
  sendHospitalReminder,
  type HospitalAccount,
  type HospitalCreditTerms,
  type HospitalIssue,
  type HospitalPriceList,
  type HospitalStatement,
  type HospitalWardStockItem,
} from '@/services/hospital';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import {
  billingAlertCopy,
  bpsToPercent,
  canOpenHospitalStatement,
  downloadBlob,
  mapHttpStatus,
  parseBillingView,
  parseRupeesInput,
  percentToBps,
  type BillingView,
  type PageStatus,
  type PaymentMode,
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

export function useHospitalBilling() {
  const user = useSelector((state: RootState) => state.auth.user);
  const allowed = hasHospitalAccess(user?.modules);
  const canStatement = canOpenHospitalStatement(user);
  const restoreRef = useRef<HTMLElement | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const view = parseBillingView(searchParams.get('view'));
  const [status, setStatus] = useState<PageStatus>('loading');
  const [saveTarget, setSaveTarget] = useState<SaveTarget>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [accountBusy, setAccountBusy] = useState(false);
  const [pricesBusy, setPricesBusy] = useState(false);
  const [returnBusy, setReturnBusy] = useState(false);
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [reminderBusy, setReminderBusy] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
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
  const [stockItems, setStockItems] = useState<HospitalWardStockItem[]>([]);
  const [statement, setStatement] = useState<HospitalStatement | null>(null);
  const [includePatient, setIncludePatient] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [issues, setIssues] = useState<HospitalIssue[]>([]);
  const [returnIssueId, setReturnIssueId] = useState('');
  const [returnProductId, setReturnProductId] = useState('');
  const [returnQty, setReturnQty] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState<PaymentMode>('UPI');
  const [payReference, setPayReference] = useState('');

  const setView = useCallback(
    (next: BillingView) => {
      setSearchParams(next === 'account' ? {} : { view: next });
    },
    [setSearchParams],
  );

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

  const fail = useCallback((error: unknown) => {
    if (isApiError(error)) {
      setErrorCode(error.code);
      setStatus(mapHttpStatus(error.status, error.code));
    } else {
      setErrorCode(null);
      setStatus('failure');
    }
  }, []);

  const loadAccount = useCallback(async () => {
    if (!allowed) {
      setStatus('plan_limit');
      return;
    }
    setStatus('loading');
    setErrorCode(null);
    try {
      const account = await getHospitalAccount();
      if (!account.configured) {
        hydrate(account, { uniformDiscountBps: 0, pendingApprovalRequestId: null, items: [] });
        return;
      }
      const prices = await getHospitalPrices();
      hydrate(account, prices);
    } catch (error) {
      fail(error);
    }
  }, [allowed, fail, hydrate]);

  const loadStock = useCallback(async () => {
    if (!allowed) {
      setStatus('plan_limit');
      return;
    }
    setStatus('loading');
    setErrorCode(null);
    try {
      const list = await getHospitalWardStock();
      setStockItems(list.items);
      setStatus(null);
    } catch (error) {
      fail(error);
    }
  }, [allowed, fail]);

  const includePatientRef = useRef(includePatient);
  includePatientRef.current = includePatient;

  const loadStatement = useCallback(
    async (showPatient?: boolean) => {
      if (!allowed) {
        setStatus('plan_limit');
        return;
      }
      setStatus('loading');
      setErrorCode(null);
      try {
        const next = await getHospitalStatement({
          includePatient: showPatient ?? includePatientRef.current,
        });
        setStatement(next);
        setStatus(null);
      } catch (error) {
        fail(error);
      }
    },
    [allowed, fail],
  );

  const load = useCallback(async () => {
    if (view === 'stock') {
      await loadStock();
      return;
    }
    if (view === 'statement') {
      await loadStatement();
      return;
    }
    await loadAccount();
  }, [loadAccount, loadStatement, loadStock, view]);

  useEffect(() => {
    void load();
  }, [load]);

  const formDisabled =
    !allowed || status === 'loading' || status === 'denied' || status === 'plan_limit';

  async function onSaveAccount(trigger: HTMLButtonElement) {
    restoreRef.current = trigger;
    if (!institutionName.trim()) {
      setSaveTarget('account');
      setErrorCode(null);
      setStatus('validation');
      return;
    }
    const limitPaise = parseRupeesInput(creditLimitRupees);
    if (limitPaise == null) {
      setSaveTarget('account');
      setErrorCode(null);
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
      fail(error);
    } finally {
      setAccountBusy(false);
      restoreRef.current?.focus();
    }
  }

  async function onSavePrices(trigger: HTMLButtonElement) {
    restoreRef.current = trigger;
    if (!accountConfigured) {
      setSaveTarget('prices');
      setErrorCode(null);
      setStatus('validation');
      return;
    }
    const uniformDiscountBps = percentToBps(uniformPercent);
    if (uniformDiscountBps == null) {
      setSaveTarget('prices');
      setErrorCode(null);
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
      fail(error);
    } finally {
      setPricesBusy(false);
      restoreRef.current?.focus();
    }
  }

  async function onRecordReturn(trigger: HTMLButtonElement) {
    restoreRef.current = trigger;
    setReturnIssueId('');
    setReturnProductId('');
    setReturnQty('');
    try {
      const list = await getHospitalIssues({ kind: 'ISSUES' });
      setIssues(list.items);
      setReturnOpen(true);
    } catch (error) {
      setSaveTarget('return');
      fail(error);
    }
  }

  async function onConfirmReturn() {
    const qty = Number(returnQty);
    if (!returnIssueId || !returnProductId || !Number.isFinite(qty) || qty <= 0) {
      setSaveTarget('return');
      setErrorCode(null);
      setStatus('validation');
      return;
    }
    setReturnBusy(true);
    setSaveTarget('return');
    try {
      await createHospitalReturn({
        issueId: returnIssueId,
        idempotencyKey: crypto.randomUUID(),
        lines: [{ productId: returnProductId, quantity: qty }],
      });
      const list = await getHospitalWardStock();
      setStockItems(list.items);
      setReturnOpen(false);
      setStatus('success');
    } catch (error) {
      fail(error);
    } finally {
      setReturnBusy(false);
    }
  }

  async function onConfirmPayment() {
    const amountPaise = parseRupeesInput(payAmount);
    if (amountPaise == null || amountPaise <= 0) {
      setSaveTarget('payment');
      setErrorCode(null);
      setStatus('validation');
      return;
    }
    setPaymentBusy(true);
    setSaveTarget('payment');
    try {
      await recordHospitalPayment({
        amountPaise,
        mode: payMode,
        reference: payReference.trim() || null,
        idempotencyKey: crypto.randomUUID(),
        expectedAccountVersion: statement?.accountVersion ?? null,
      });
      const next = await getHospitalStatement({ includePatient });
      setStatement(next);
      setPaymentOpen(false);
      setStatus('success');
    } catch (error) {
      fail(error);
    } finally {
      setPaymentBusy(false);
    }
  }

  async function onSendReminder(trigger: HTMLButtonElement) {
    restoreRef.current = trigger;
    setReminderBusy(true);
    setSaveTarget('reminder');
    try {
      await sendHospitalReminder();
      setStatus('success');
    } catch (error) {
      fail(error);
    } finally {
      setReminderBusy(false);
      restoreRef.current?.focus();
    }
  }

  async function onExport(format: 'csv' | 'pdf', trigger: HTMLButtonElement) {
    restoreRef.current = trigger;
    setExportBusy(true);
    setSaveTarget('statement');
    try {
      const blob = await downloadHospitalStatement(format);
      downloadBlob(blob, format === 'csv' ? 'hospital-statement.csv' : 'hospital-statement.pdf');
      setStatus('success');
    } catch (error) {
      fail(error);
    } finally {
      setExportBusy(false);
      restoreRef.current?.focus();
    }
  }

  function onIncludePatient(next: boolean) {
    setIncludePatient(next);
    void loadStatement(next);
  }

  function onRecordPayment(trigger: HTMLButtonElement) {
    restoreRef.current = trigger;
    setPayAmount('');
    setPayMode('UPI');
    setPayReference('');
    setPaymentOpen(true);
  }

  function onSelectIssue(value: string) {
    setReturnIssueId(value);
    setReturnProductId('');
    if (!value) {
      return;
    }
    void getHospitalIssue(value).then((detail) => {
      setIssues((current) => current.map((issue) => (issue.id === detail.id ? detail : issue)));
    });
  }

  function onDismiss() {
    setStatus(view === 'account' && !accountConfigured ? 'empty' : null);
  }

  const returnMessage = returnOpen ? billingAlertCopy(status, saveTarget, errorCode) : null;
  const paymentMessage = paymentOpen ? billingAlertCopy(status, saveTarget, errorCode) : null;

  const showWorkspace =
    allowed && status !== 'loading' && status !== 'denied' && status !== 'plan_limit';

  return {
    view,
    canStatement,
    status,
    saveTarget,
    errorCode,
    accountBusy,
    pricesBusy,
    returnBusy,
    paymentBusy,
    reminderBusy,
    exportBusy,
    formDisabled,
    accountConfigured,
    institutionName,
    gstin,
    storesContact,
    billingPhone,
    billingEmail,
    creditTerms,
    creditLimitRupees,
    creditLimitPaise,
    balancePaise,
    availableCreditPaise,
    uniformPercent,
    priceItems,
    stockItems,
    statement,
    includePatient,
    returnOpen,
    paymentOpen,
    issues,
    returnIssueId,
    returnProductId,
    returnQty,
    payAmount,
    payMode,
    payReference,
    showWorkspace,
    restoreRef,
    setView,
    load,
    setInstitutionName,
    setGstin,
    setStoresContact,
    setBillingPhone,
    setBillingEmail,
    setCreditTerms,
    setCreditLimitRupees,
    setUniformPercent,
    setStatus,
    setPayAmount,
    setPayMode,
    setPayReference,
    setPaymentOpen,
    setReturnProductId,
    setReturnQty,
    setReturnOpen,
    setReturnIssueId,
    onSaveAccount,
    onSavePrices,
    onRecordReturn,
    onConfirmReturn,
    onConfirmPayment,
    onSendReminder,
    onExport,
    onIncludePatient,
    onRecordPayment,
    onSelectIssue,
    onDismiss,
    returnMessage,
    paymentMessage,
  };
}

