import { Download, ExternalLink, FileText, ScrollText } from 'lucide-react';
import { useState } from 'react';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '@/store';
import { downloadInvoicePrescription } from '@/services/salesInvoices';
import type { SalesOrderRow } from '@/services/salesOrders';
import { ORDERS_CONTENT } from '../../OrdersScreen.content';
import { setOrdersActionHint } from '../../store/orders.slice';

type OrdersPrescriptionCardProps = {
  row: SalesOrderRow;
};

export function OrdersPrescriptionCard({ row }: OrdersPrescriptionCardProps) {
  const dispatch = useDispatch<AppDispatch>();
  const [busy, setBusy] = useState(false);

  if (!row.hasPrescriptionAttachment) {
    if (!row.hasPrescription) return null;
    return (
      <>
        <div className="orders-pl-head">{ORDERS_CONTENT.detail.prescription}</div>
        <div className="orders-mono" style={{ fontSize: 12.5 }}>
          {row.prescriptionReference ?? '—'}
          {row.prescriptionVerified ? ' · verified' : ''}
        </div>
      </>
    );
  }

  async function loadBlob() {
    return downloadInvoicePrescription(row.id);
  }

  async function onOpen() {
    setBusy(true);
    try {
      const blob = await loadBlob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      dispatch(setOrdersActionHint(ORDERS_CONTENT.detail.prescriptionViewFail));
    } finally {
      setBusy(false);
    }
  }

  async function onDownload() {
    setBusy(true);
    try {
      const blob = await loadBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = row.prescriptionAttachmentFilename ?? 'prescription';
      link.rel = 'noopener';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      dispatch(setOrdersActionHint(ORDERS_CONTENT.detail.prescriptionViewFail));
    } finally {
      setBusy(false);
    }
  }

  const isPdf = row.prescriptionAttachmentContentType === 'application/pdf';

  return (
    <>
      <div className="orders-pl-head orders-rx-head">
        <span>{ORDERS_CONTENT.detail.prescriptionFile}</span>
        {row.prescriptionVerified ? (
          <span className="orders-pill orders-pill-green">
            <i className="d" aria-hidden />
            verified
          </span>
        ) : (
          <span className="orders-pill orders-pill-gold">
            <i className="d" aria-hidden />
            pending
          </span>
        )}
      </div>
      {row.prescriptionReference ? (
        <div className="orders-rx-ref">
          <span className="orders-mono">{row.prescriptionReference}</span>
        </div>
      ) : null}
      <div className="orders-rx-card">
        <div className="orders-rx-card-banner">
          <ScrollText size={16} strokeWidth={1.8} aria-hidden />
          <b>{ORDERS_CONTENT.detail.prescriptionCardTitle}</b>
          {isPdf ? (
            <span className="orders-rx-chip">
              <FileText size={12} strokeWidth={1.8} aria-hidden />
              PDF
            </span>
          ) : (
            <span className="orders-rx-chip">Image</span>
          )}
        </div>
        <div className="orders-rx-card-body">
          <div className="orders-rx-file-name">{row.prescriptionAttachmentFilename ?? 'prescription'}</div>
          <div className="orders-rx-card-actions">
            <button
              type="button"
              className="orders-btn orders-btn-ghost orders-btn-sm"
              disabled={busy}
              onClick={() => void onOpen()}
            >
              <ExternalLink size={13} strokeWidth={1.8} aria-hidden />
              {ORDERS_CONTENT.detail.prescriptionOpen}
            </button>
            <button
              type="button"
              className="orders-rx-dl"
              disabled={busy}
              onClick={() => void onDownload()}
            >
              <Download size={13} strokeWidth={1.8} aria-hidden />
              {ORDERS_CONTENT.detail.prescriptionDownload}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
