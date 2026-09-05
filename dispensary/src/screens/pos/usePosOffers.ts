import {
  applyInvoiceOffers,
  listInvoiceOffers,
  type InvoiceOfferItem,
  type SalesInvoice,
} from '@/services/salesInvoices';
import { isApiError } from '@/services/axios';
import { useCallback, useEffect, useState } from 'react';
import { mapApiStatus, offerStatusHint, type PageStatus } from './PosScreen.utils';

type UsePosOffersArgs = {
  allowed: boolean;
  invoice: SalesInvoice | null;
  busy: boolean;
  setBusy: (busy: boolean) => void;
  setStatus: (status: PageStatus) => void;
  setStatusHint: (hint: string | null) => void;
  hydrateInvoice: (invoice: SalesInvoice) => Promise<void>;
};

export function usePosOffers({
  allowed,
  invoice,
  busy,
  setBusy,
  setStatus,
  setStatusHint,
  hydrateInvoice,
}: UsePosOffersArgs) {
  const [items, setItems] = useState<InvoiceOfferItem[]>([]);
  const [loading, setLoading] = useState(false);

  const invoiceId = invoice?.id ?? null;

  const refresh = useCallback(async () => {
    if (!allowed || !invoiceId) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const result = await listInvoiceOffers(invoiceId);
      setItems(result.items);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [allowed, invoiceId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const runApply = async () => {
    if (!invoice) {
      setStatus('validation');
      setStatusHint(offerStatusHint('validation'));
      return;
    }
    setBusy(true);
    try {
      const updated = await applyInvoiceOffers(invoice.id, { expectedVersion: invoice.version });
      await hydrateInvoice(updated);
      const applied = updated.lines.find((line) => line.offerName)?.offerName ?? items[0]?.name;
      setStatus('success');
      setStatusHint(applied ? `${applied} applied on this bill.` : 'Scheme applied on this bill.');
      await refresh();
      window.setTimeout(() => document.getElementById('pos-product-search')?.focus(), 0);
    } catch (error) {
      const next = isApiError(error) ? mapApiStatus(error) : 'failure';
      const code = isApiError(error) ? error.code : null;
      setStatus(next);
      setStatusHint(offerStatusHint(next, code) ?? offerStatusHint('failure'));
    } finally {
      setBusy(false);
    }
  };

  return {
    items,
    loading,
    runApply: () => void runApply(),
    applyDisabled: busy,
  };
}
