import {
  holdSalesInvoice,
  listSalesInvoices,
  resumeSalesInvoice,
  type SalesInvoice,
} from '@/services/salesInvoices';
import { isApiError } from '@/services/axios';
import { useCallback, useEffect, useState } from 'react';
import { holdStatusHint, mapApiStatus, resumeStatusHint, type PageStatus } from './PosScreen.utils';

type UsePosHoldArgs = {
  allowed: boolean;
  invoice: SalesInvoice | null;
  busy: boolean;
  setBusy: (busy: boolean) => void;
  setStatus: (status: PageStatus) => void;
  setStatusHint: (hint: string | null) => void;
  hydrateInvoice: (invoice: SalesInvoice) => Promise<void>;
  clearOpenBill: () => void;
};

export function usePosHold({
  allowed,
  invoice,
  busy,
  setBusy,
  setStatus,
  setStatusHint,
  hydrateInvoice,
  clearOpenBill,
}: UsePosHoldArgs) {
  const [items, setItems] = useState<SalesInvoice[]>([]);
  const [loading, setLoading] = useState(allowed);

  const refreshHeld = useCallback(async () => {
    if (!allowed) {
      return;
    }
    setLoading(true);
    try {
      const result = await listSalesInvoices({ status: 'HELD' });
      setItems(result.items);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [allowed]);

  useEffect(() => {
    if (!allowed) {
      return;
    }
    void refreshHeld();
  }, [allowed, refreshHeld]);

  const runHold = async () => {
    if (!invoice || invoice.status === 'COMPLETED') {
      setStatus('validation');
      setStatusHint(holdStatusHint('validation'));
      return;
    }
    setBusy(true);
    try {
      const held = await holdSalesInvoice(invoice.id, { expectedVersion: invoice.version });
      clearOpenBill();
      setStatus('success');
      setStatusHint(`Bill ${held.invoiceNumber} held on this till.`);
      await refreshHeld();
      window.setTimeout(() => document.getElementById('pos-product-search')?.focus(), 0);
    } catch (error) {
      const next = isApiError(error) ? mapApiStatus(error) : 'failure';
      setStatus(next);
      setStatusHint(holdStatusHint(next) ?? holdStatusHint('failure'));
    } finally {
      setBusy(false);
    }
  };

  const runResume = async (id: string) => {
    const held = items.find((item) => item.id === id);
    if (!held) {
      return;
    }
    setBusy(true);
    try {
      const resumed = await resumeSalesInvoice(id, { expectedVersion: held.version });
      await hydrateInvoice(resumed);
      setStatus('success');
      setStatusHint(resumeStatusHint(resumed.invoiceNumber, resumed.revalidation ?? null));
      await refreshHeld();
      window.setTimeout(() => document.getElementById('pos-product-search')?.focus(), 0);
    } catch (error) {
      const next = isApiError(error) ? mapApiStatus(error) : 'failure';
      setStatus(next);
      setStatusHint(
        next === 'conflict'
          ? 'This bill was updated on another till. Refresh, then resume again.'
          : 'Could not resume this bill. Check the connection and try again.',
      );
    } finally {
      setBusy(false);
    }
  };

  return {
    items,
    loading,
    runHold: () => void runHold(),
    runResume: (id: string) => void runResume(id),
    holdDisabled: busy,
  };
}
