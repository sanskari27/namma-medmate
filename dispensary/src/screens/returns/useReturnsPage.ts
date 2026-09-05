import { isApiError } from '@/services/axios';
import { getSalesInvoice, listSalesInvoices, type SalesInvoice } from '@/services/salesInvoices';
import {
  createSalesReturn,
  listSalesReturns,
  previewSalesReturn,
  type SalesReturn,
  type SalesReturnRefundMode,
  type SalesReturnSummary,
} from '@/services/salesReturns';
import type { RootState } from '@/store';
import { FormEvent, useCallback, useEffect, useId, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  apiStatusHint,
  hasSalesAccess,
  mapApiStatus,
  matchCompletedInvoice,
  selectedReturnLines,
  type LineDraft,
  type PageStatus,
} from './ReturnsScreen.utils';

export function useReturnsPage() {
  const user = useSelector((state: RootState) => state.auth.user);
  const statusId = useId();
  const allowed = hasSalesAccess(user?.modules);

  const [status, setStatus] = useState<PageStatus>(allowed ? 'loading' : 'denied');
  const [statusHint, setStatusHint] = useState<string | null>(null);
  const [returns, setReturns] = useState<SalesReturnSummary[]>([]);
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [query, setQuery] = useState('');
  const [invoice, setInvoice] = useState<SalesInvoice | null>(null);
  const [qtyByLine, setQtyByLine] = useState<LineDraft>({});
  const [reason, setReason] = useState('');
  const [refundMode, setRefundMode] = useState<SalesReturnRefundMode>('CASH');
  const [preview, setPreview] = useState<SalesReturn | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (keepStatus?: PageStatus) => {
    if (!allowed) {
      setStatus('denied');
      return;
    }
    if (!keepStatus) {
      setStatus('loading');
      setStatusHint(null);
    }
    try {
      const [returnList, invoiceList] = await Promise.all([
        listSalesReturns(),
        listSalesInvoices({ status: 'COMPLETED' }),
      ]);
      setReturns(returnList.items);
      setInvoices(invoiceList.items);
      if (!keepStatus) {
        setStatus(invoiceList.items.length === 0 ? 'empty' : null);
      }
    } catch (error) {
      const mapped = isApiError(error) ? mapApiStatus(error) : 'failure';
      setStatus(mapped);
      setStatusHint(isApiError(error) ? apiStatusHint(error.code) : null);
    }
  }, [allowed]);

  useEffect(() => {
    void load();
  }, [load]);

  async function findBill() {
    if (!query.trim()) {
      setStatus('validation');
      setStatusHint('Type a collected bill number first.');
      return;
    }
    setBusy(true);
    setStatusHint(null);
    try {
      const matched = matchCompletedInvoice(invoices, query);
      const next = matched ?? (await getSalesInvoice(query.trim()));
      if (next.status !== 'COMPLETED') {
        setInvoice(null);
        setPreview(null);
        setStatus('validation');
        setStatusHint('Only a collected bill can be returned against.');
        return;
      }
      setInvoice(next);
      setQtyByLine({});
      setPreview(null);
      setStatus(null);
    } catch (error) {
      setInvoice(null);
      setPreview(null);
      const mapped = isApiError(error) ? mapApiStatus(error) : 'failure';
      setStatus(mapped === 'failure' && isApiError(error) && error.status === 404 ? 'empty' : mapped);
      setStatusHint(
        isApiError(error) && error.status === 404
          ? 'No collected bill matches that number at this outlet.'
          : isApiError(error)
            ? apiStatusHint(error.code)
            : null,
      );
    } finally {
      setBusy(false);
    }
  }

  function changeQty(lineId: string, value: string) {
    setQtyByLine((prev) => ({ ...prev, [lineId]: value }));
    setPreview(null);
  }

  async function onPreview() {
    if (!invoice) {
      setStatus('validation');
      return;
    }
    const lines = selectedReturnLines(invoice, qtyByLine);
    if (lines.length === 0 || !reason.trim()) {
      setStatus('validation');
      setStatusHint(null);
      return;
    }
    setBusy(true);
    setStatusHint(null);
    try {
      const next = await previewSalesReturn({
        salesInvoiceId: invoice.id,
        reason: reason.trim(),
        decision: 'APPROVED',
        refundMode,
        lines,
      });
      setPreview(next);
      setStatus(null);
    } catch (error) {
      setPreview(null);
      setStatus(isApiError(error) ? mapApiStatus(error) : 'failure');
      setStatusHint(isApiError(error) ? apiStatusHint(error.code) : null);
    } finally {
      setBusy(false);
    }
  }

  async function onConfirm(event: FormEvent) {
    event.preventDefault();
    if (!invoice) {
      setStatus('validation');
      return;
    }
    const lines = selectedReturnLines(invoice, qtyByLine);
    if (lines.length === 0 || !reason.trim()) {
      setStatus('validation');
      setStatusHint(null);
      return;
    }
    setBusy(true);
    setStatusHint(null);
    try {
      const recorded = await createSalesReturn({
        salesInvoiceId: invoice.id,
        reason: reason.trim(),
        decision: 'APPROVED',
        refundMode,
        idempotencyKey: crypto.randomUUID(),
        lines,
      });
      setPreview(recorded);
      setStatus('success');
      setStatusHint(null);
      await load('success');
    } catch (error) {
      setStatus(isApiError(error) ? mapApiStatus(error) : 'failure');
      setStatusHint(isApiError(error) ? apiStatusHint(error.code) : null);
    } finally {
      setBusy(false);
    }
  }

  return {
    allowed,
    status,
    statusHint,
    statusId,
    returns,
    query,
    setQuery,
    invoice,
    qtyByLine,
    reason,
    setReason,
    refundMode,
    setRefundMode,
    preview,
    busy,
    findBill,
    changeQty,
    onPreview,
    onConfirm,
  };
}
