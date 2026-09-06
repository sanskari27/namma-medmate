import { Reveal } from '@atoms';
import {
  isApiError,
  listCashfreePayments,
  listSubscriptions,
  type AdminCashfreePayment,
  type AdminSubscription,
} from '@/services/subscriptions';
import type { RootState } from '@/store';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { CheckoutExceptionsPanel } from './components/checkout-exceptions-panel';
import { OverrideFileDialog } from './components/override-file-dialog';
import { SubscriptionsHeader } from './components/subscriptions-header';
import { SubscriptionsStatusBanner } from './components/subscriptions-status-banner';
import { TenantPlanTable } from './components/tenant-plan-table';
import { isMaster, statusCopy, type PageStatus, type PayStatus } from './SubscriptionsScreen.utils';

export default function SubscriptionsScreen() {
  const role = useSelector((s: RootState) => s.auth.user?.role);
  const allowed = isMaster(role);
  const statusId = useId();
  const findId = useId();
  const restoreRef = useRef<HTMLElement | null>(null);
  const refreshRef = useRef<HTMLButtonElement | null>(null);
  const [status, setStatus] = useState<PageStatus>(allowed ? 'loading' : 'denied');
  const [payStatus, setPayStatus] = useState<PayStatus>(allowed ? 'loading' : 'denied');
  const [items, setItems] = useState<AdminSubscription[]>([]);
  const [payments, setPayments] = useState<AdminCashfreePayment[]>([]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<AdminSubscription | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [payBusy, setPayBusy] = useState(false);

  const load = useCallback(async () => {
    if (!allowed) {
      setStatus('denied');
      return;
    }
    setStatus('loading');
    try {
      const list = await listSubscriptions();
      setItems(list);
      setStatus(list.length === 0 ? 'empty' : null);
    } catch {
      setStatus('failure');
    }
  }, [allowed]);

  const loadPayments = useCallback(async () => {
    if (!allowed) {
      setPayStatus('denied');
      return;
    }
    setPayBusy(true);
    setPayStatus('loading');
    try {
      const list = await listCashfreePayments();
      setPayments(list);
      setPayStatus(list.length === 0 ? 'empty' : 'success');
    } catch (error) {
      if (isApiError(error)) {
        if (error.status === 403) {
          setPayStatus('denied');
        } else if (error.status === 409) {
          setPayStatus('conflict');
        } else if (error.status === 400 || error.status === 422) {
          setPayStatus('validation');
        } else {
          setPayStatus('failure');
        }
      } else {
        setPayStatus('failure');
      }
    } finally {
      setPayBusy(false);
    }
  }, [allowed]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadPayments();
  }, [loadPayments]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return items;
    }
    return items.filter(
      (row) =>
        row.tenantName.toLowerCase().includes(needle) ||
        row.planCode.toLowerCase().includes(needle),
    );
  }, [items, query]);

  const mix = useMemo(() => {
    const counts: Record<string, number> = { FREE: 0, STARTER: 0, GROWTH: 0, PRO: 0 };
    for (const row of items) {
      counts[row.planCode] = (counts[row.planCode] ?? 0) + 1;
    }
    return counts;
  }, [items]);

  function openFile(row: AdminSubscription, trigger: HTMLElement) {
    restoreRef.current = trigger;
    setSelected(row);
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    restoreRef.current?.focus();
  }

  async function onRefreshCharges() {
    await loadPayments();
    refreshRef.current?.focus();
  }

  const banner = statusCopy(status);
  const showLedger = allowed && status !== 'loading' && status !== 'denied';

  return (
    <Reveal className="space-y-5">
      <SubscriptionsHeader />

      {banner ? <SubscriptionsStatusBanner statusId={statusId} banner={banner} /> : null}

      {showLedger ? (
        <TenantPlanTable
          items={items}
          visible={visible}
          mix={mix}
          query={query}
          findId={findId}
          onQuery={setQuery}
          onOpenFile={openFile}
        />
      ) : null}

      {showLedger ? (
        <CheckoutExceptionsPanel
          payStatus={payStatus === 'success' ? null : payStatus}
          items={payments}
          busy={payBusy}
          refreshRef={refreshRef}
          onRefresh={() => void onRefreshCharges()}
        />
      ) : null}

      <OverrideFileDialog
        open={dialogOpen}
        selected={selected}
        onClose={closeDialog}
        onFiled={(next) => {
          setItems(next);
          setDialogOpen(false);
          restoreRef.current?.focus();
          setStatus('success');
        }}
      />
    </Reveal>
  );
}
