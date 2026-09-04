import { listCustomers, type Customer } from '@/services/customers';
import {
  assertMedicationSafetyCleared,
  evaluateMedicationSafety,
  isApiError,
  type SafetyEvaluation,
} from '@/services/medicationSafety';
import { listProducts, type Product } from '@/services/products';
import type { RootState } from '@/store';
import { useCallback, useEffect, useId, useState } from 'react';
import { useSelector } from 'react-redux';
import { PosAckFooter } from './components/pos-ack-footer';
import { PosCustomerPicker } from './components/pos-customer-picker';
import { PosDraftLines } from './components/pos-draft-lines';
import { PosHeader } from './components/pos-header';
import { PosStatusBanner } from './components/pos-status-banner';
import { PosWarningPanel } from './components/pos-warning-panel';
import { hasSalesAccess, mapApiStatus, type PageStatus } from './PosScreen.utils';

export default function PosScreen() {
  const user = useSelector((state: RootState) => state.auth.user);
  const allowed = hasSalesAccess(user?.modules);
  const titleId = useId();
  const statusId = useId();

  const [status, setStatus] = useState<PageStatus>(allowed ? 'loading' : 'denied');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [catalogue, setCatalogue] = useState<Product[]>([]);
  const [customerQuery, setCustomerQuery] = useState('');
  const [productQuery, setProductQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [draft, setDraft] = useState<Product[]>([]);
  const [evaluation, setEvaluation] = useState<SafetyEvaluation | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const loadBootstrap = useCallback(async () => {
    if (!allowed) {
      setStatus('denied');
      return;
    }
    setStatus('loading');
    try {
      const [customerItems, productItems] = await Promise.all([listCustomers(), listProducts()]);
      setCustomers(customerItems);
      setCatalogue(productItems);
      setStatus(productItems.length === 0 ? 'empty' : null);
    } catch (error) {
      setStatus(
        isApiError(error) && (error.status === 403 || error.code === 'FORBIDDEN')
          ? 'denied'
          : 'failure',
      );
    }
  }, [allowed]);

  useEffect(() => {
    void loadBootstrap();
  }, [loadBootstrap]);

  useEffect(() => {
    if (!allowed) {
      return;
    }
    const handle = window.setTimeout(() => {
      void listCustomers(customerQuery.trim() || undefined)
        .then(setCustomers)
        .catch(() => undefined);
    }, 200);
    return () => window.clearTimeout(handle);
  }, [allowed, customerQuery]);

  useEffect(() => {
    if (!allowed) {
      return;
    }
    const handle = window.setTimeout(() => {
      void listProducts(productQuery.trim() || undefined)
        .then(setCatalogue)
        .catch(() => undefined);
    }, 200);
    return () => window.clearTimeout(handle);
  }, [allowed, productQuery]);

  const runEvaluate = async () => {
    if (!selectedCustomer || draft.length === 0) {
      setStatus('validation');
      return;
    }
    setBusy(true);
    setStatus('loading');
    try {
      const result = await evaluateMedicationSafety(
        selectedCustomer.id,
        draft.map((item) => item.id),
      );
      setEvaluation(result);
      setStatus(null);
    } catch (error) {
      setStatus(isApiError(error) ? mapApiStatus(error) : 'failure');
    } finally {
      setBusy(false);
    }
  };

  const runComplete = async () => {
    if (!selectedCustomer || draft.length === 0) {
      setStatus('validation');
      return;
    }
    const warnings = evaluation?.warnings ?? [];
    if (warnings.length > 0 && !reason.trim()) {
      setStatus('validation');
      return;
    }
    setBusy(true);
    try {
      if (!evaluation) {
        const fresh = await evaluateMedicationSafety(
          selectedCustomer.id,
          draft.map((item) => item.id),
        );
        setEvaluation(fresh);
        if (fresh.warnings.length > 0 && !reason.trim()) {
          setStatus('validation');
          setBusy(false);
          return;
        }
        await assertMedicationSafetyCleared({
          customerId: selectedCustomer.id,
          productIds: draft.map((item) => item.id),
          warningKeys: fresh.warnings.map((item) => item.warningKey),
          reason: fresh.warnings.length > 0 ? reason.trim() : null,
        });
      } else {
        await assertMedicationSafetyCleared({
          customerId: selectedCustomer.id,
          productIds: draft.map((item) => item.id),
          warningKeys: warnings.map((item) => item.warningKey),
          reason: warnings.length > 0 ? reason.trim() : null,
        });
      }
      setStatus('success');
      setReason('');
    } catch (error) {
      setStatus(isApiError(error) ? mapApiStatus(error) : 'failure');
    } finally {
      setBusy(false);
    }
  };

  if (!allowed) {
    return (
      <div className="space-y-4 p-4" aria-labelledby={titleId}>
        <PosHeader titleId={titleId} />
        <PosStatusBanner status="denied" statusId={statusId} />
      </div>
    );
  }

  const showReason = Boolean(evaluation && evaluation.warnings.length > 0);

  return (
    <div className="space-y-4 p-4" aria-labelledby={titleId}>
      <PosHeader titleId={titleId} />
      <PosStatusBanner status={status} statusId={statusId} />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <PosCustomerPicker
            query={customerQuery}
            onQueryChange={setCustomerQuery}
            customers={customers}
            selected={selectedCustomer}
            onSelect={(customer) => {
              setSelectedCustomer(customer);
              setEvaluation(null);
              setStatus(null);
            }}
            onClear={() => {
              setSelectedCustomer(null);
              setEvaluation(null);
            }}
            busy={busy}
          />
          <PosDraftLines
            query={productQuery}
            onQueryChange={setProductQuery}
            catalogue={catalogue}
            draft={draft}
            onAdd={(product) => {
              setDraft((current) =>
                current.some((item) => item.id === product.id) ? current : [...current, product],
              );
              setEvaluation(null);
            }}
            onRemove={(productId) => {
              setDraft((current) => current.filter((item) => item.id !== productId));
              setEvaluation(null);
            }}
            busy={busy}
          />
        </div>
        <PosWarningPanel
          evaluation={evaluation}
          productNames={Object.fromEntries(draft.map((item) => [item.id, item.name]))}
        />
      </div>
      <PosAckFooter
        reason={reason}
        onReasonChange={setReason}
        onEvaluate={() => void runEvaluate()}
        onComplete={() => void runComplete()}
        evaluateDisabled={draft.length === 0}
        completeDisabled={draft.length === 0}
        busy={busy}
        showReason={showReason}
      />
    </div>
  );
}
