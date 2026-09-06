import { Button } from '@atoms';
import { isApiError } from '@/services/axios';
import { downloadInvoicePdf, emailInvoiceCopy, openInvoicePdf } from '@/services/salesInvoices';
import { useState } from 'react';
import { invoiceOutputHint, mapApiStatus, type PageStatus } from '../../PosScreen.utils';

interface PosInvoiceOutputProps {
  invoiceId: string | null;
  invoiceNumber: string | null;
  collected: boolean;
  walkIn: boolean;
  customerEmail: string | null;
  disabled: boolean;
}

export function PosInvoiceOutput({
  invoiceId,
  invoiceNumber,
  collected,
  walkIn,
  customerEmail,
  disabled,
}: PosInvoiceOutputProps) {
  const [status, setStatus] = useState<PageStatus>(null);
  const [lastAction, setLastAction] = useState<'print' | 'download' | 'email' | null>(null);
  const [busy, setBusy] = useState(false);
  const showEmail = collected && !walkIn;
  const message = collected
    ? (invoiceOutputHint(status, status === 'success' && lastAction === 'email' ? 'email' : null) ??
      'Print or download the A4 bill. Send a copy when this patient has email.')
    : invoiceOutputHint('empty');
  const alert =
    status === 'denied' || status === 'failure' || status === 'conflict' || status === 'validation';
  const live = alert
    ? 'alert'
    : status === 'loading' || status === 'success'
      ? 'status'
      : undefined;

  const runPdf = async (print: boolean) => {
    if (!invoiceId || !collected || disabled) {
      return;
    }
    setBusy(true);
    setLastAction(print ? 'print' : 'download');
    setStatus('loading');
    try {
      const blob = await downloadInvoicePdf(invoiceId);
      openInvoicePdf(blob, `${invoiceNumber ?? 'invoice'}.pdf`, print);
      setStatus('success');
    } catch (error) {
      setStatus(isApiError(error) ? mapApiStatus(error) : 'failure');
    } finally {
      setBusy(false);
      window.setTimeout(() => document.getElementById('pos-product-search')?.focus(), 0);
    }
  };

  const runEmail = async () => {
    if (!invoiceId || !collected || disabled || walkIn) {
      return;
    }
    if (!customerEmail) {
      setStatus('validation');
      return;
    }
    setBusy(true);
    setLastAction('email');
    setStatus('loading');
    try {
      await emailInvoiceCopy(invoiceId);
      setStatus('success');
    } catch (error) {
      setStatus(isApiError(error) ? mapApiStatus(error) : 'failure');
    } finally {
      setBusy(false);
      window.setTimeout(() => document.getElementById('pos-invoice-email')?.focus(), 0);
    }
  };

  return (
    <section className="space-y-3 rounded border border-line bg-surface p-3" aria-label="Bill copy">
      <h2 className="text-sm font-semibold text-ink">Bill copy</h2>
      <p role={live} className="text-sm text-muted">
        {status === 'loading' ? invoiceOutputHint('loading') : message}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={() => void runPdf(true)}
          disabled={!collected || disabled || busy}
        >
          Print this bill
        </Button>
        <Button
          type="button"
          onClick={() => void runPdf(false)}
          disabled={!collected || disabled || busy}
        >
          Download A4
        </Button>
        {showEmail ? (
          <Button
            id="pos-invoice-email"
            type="button"
            onClick={() => void runEmail()}
            disabled={disabled || busy}
          >
            Send bill copy
          </Button>
        ) : null}
      </div>
    </section>
  );
}
