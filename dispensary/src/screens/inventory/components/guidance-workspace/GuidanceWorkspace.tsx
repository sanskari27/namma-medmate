import { Button, Input, Label } from '@atoms';
import {
  downloadReorderReport,
  getInventoryAlerts,
  getInventorySettings,
  getInventoryValuation,
  isApiError,
  updateInventorySettings,
  type InventoryAlerts,
  type LowStockAlert,
  type NearExpiryAlert,
} from '@/services/inventory';
import { useCallback, useEffect, useId, useState } from 'react';
import type { PageStatus } from '../../InventoryScreen.utils';
import { mapApiStatus } from '../../InventoryScreen.utils';
import { OutletStockLevelsForm } from './OutletStockLevelsForm';

export type GuidanceWorkspaceProps = {
  allowed: boolean;
  onStatusChange: (status: PageStatus) => void;
  onStartTransfer: (productId: string) => void;
};

function formatInrFromPaise(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function GuidanceWorkspace({
  allowed,
  onStatusChange,
  onStartTransfer,
}: GuidanceWorkspaceProps) {
  const formId = useId();
  const [alerts, setAlerts] = useState<InventoryAlerts>({ lowStock: [], nearExpiry: [] });
  const [warnDays, setWarnDays] = useState('30');
  const [valuationPaise, setValuationPaise] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!allowed) {
      onStatusChange('denied');
      return;
    }
    onStatusChange('loading');
    try {
      const [alertData, settings, valuation] = await Promise.all([
        getInventoryAlerts(),
        getInventorySettings(),
        getInventoryValuation(),
      ]);
      setAlerts(alertData);
      setWarnDays(String(settings.expiryWarnDays));
      setValuationPaise(valuation.totalPurchaseValuePaise);
      const empty = alertData.lowStock.length === 0 && alertData.nearExpiry.length === 0;
      onStatusChange(empty ? 'empty' : null);
    } catch (error) {
      onStatusChange(mapApiStatus(error));
    }
  }, [allowed, onStatusChange]);

  useEffect(() => {
    void load();
  }, [load]);

  const onSaveThreshold = async () => {
    const days = Number(warnDays);
    if (!Number.isInteger(days) || days < 0) {
      onStatusChange('validation');
      return;
    }
    setBusy(true);
    try {
      const saved = await updateInventorySettings(days);
      setWarnDays(String(saved.expiryWarnDays));
      const [alertData, valuation] = await Promise.all([
        getInventoryAlerts(),
        getInventoryValuation(),
      ]);
      setAlerts(alertData);
      setValuationPaise(valuation.totalPurchaseValuePaise);
      onStatusChange('success');
    } catch (error) {
      onStatusChange(mapApiStatus(error));
    } finally {
      setBusy(false);
    }
  };

  const onDownloadCsv = async () => {
    setBusy(true);
    try {
      const blob = await downloadReorderReport();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'reorder-report.csv';
      anchor.click();
      URL.revokeObjectURL(url);
      onStatusChange('success');
    } catch (error) {
      onStatusChange(
        isApiError(error) && (error.status === 403 || error.code === 'FORBIDDEN')
          ? 'denied'
          : mapApiStatus(error),
      );
    } finally {
      setBusy(false);
    }
  };

  if (!allowed) {
    return null;
  }

  return (
    <div className="grid min-h-0 flex-1 gap-4 overflow-auto lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <section
        className="space-y-4 border border-line bg-surface p-3"
        aria-label="Guidance controls"
      >
        <div>
          <h2 className="text-sm font-semibold text-ink">Floor guidance</h2>
          <p className="text-xs text-muted">
            Near-expiry threshold, purchase-price valuation, and reorder CSV for this outlet.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${formId}-warn`}>Expiry warn days</Label>
          <div className="flex flex-wrap items-end gap-2">
            <Input
              id={`${formId}-warn`}
              inputMode="numeric"
              value={warnDays}
              onChange={(event) => setWarnDays(event.target.value)}
              disabled={busy}
              className="max-w-[8rem]"
            />
            <Button type="button" onClick={() => void onSaveThreshold()} disabled={busy}>
              Save threshold
            </Button>
          </div>
        </div>
        <p className="text-sm text-ink" aria-live="polite">
          Stock valuation (batch purchase price):{' '}
          <span className="font-mono font-medium">
            {valuationPaise == null ? '—' : formatInrFromPaise(valuationPaise)}
          </span>
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={() => void onDownloadCsv()}
          disabled={busy}
        >
          Download reorder CSV
        </Button>
        <OutletStockLevelsForm busy={busy} onBusyChange={setBusy} onStatusChange={onStatusChange} />
      </section>

      <div className="grid gap-4">
        <LowStockList items={alerts.lowStock} onStartTransfer={onStartTransfer} busy={busy} />
        <NearExpiryList items={alerts.nearExpiry} />
      </div>
    </div>
  );
}

function LowStockList({
  items,
  onStartTransfer,
  busy,
}: {
  items: LowStockAlert[];
  onStartTransfer: (productId: string) => void;
  busy: boolean;
}) {
  return (
    <section className="border border-line bg-surface p-3" aria-label="Low stock alerts">
      <h2 className="text-sm font-semibold text-ink">Low stock</h2>
      <p className="mb-2 text-xs text-muted">
        Below reorder or minimum for this outlet. Transfer when another branch has stock.
      </p>
      {items.length === 0 ? (
        <p className="text-sm text-muted">No low-stock lines on this outlet.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.productId}
              className="flex flex-wrap items-start justify-between gap-2 border border-line px-2 py-2 text-sm"
            >
              <div>
                <p className="font-medium text-ink">{item.productName}</p>
                <p className="font-mono text-xs text-muted">{item.productSku}</p>
                <p className="text-xs text-muted">
                  On hand {item.onHand}
                  {item.reorderLevel != null ? ` · reorder ${item.reorderLevel}` : ''}
                </p>
                {item.otherBranches.length > 0 ? (
                  <p className="mt-1 text-xs text-brand">
                    Available at{' '}
                    {item.otherBranches.map((b) => `${b.branchName} (${b.quantity})`).join(', ')}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-muted">No stock at other outlets.</p>
                )}
              </div>
              {item.otherBranches.length > 0 ? (
                <Button
                  type="button"
                  size="sm"
                  disabled={busy}
                  onClick={() => onStartTransfer(item.productId)}
                >
                  Start transfer
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function NearExpiryList({ items }: { items: NearExpiryAlert[] }) {
  return (
    <section className="border border-line bg-surface p-3" aria-label="Near-expiry batches">
      <h2 className="text-sm font-semibold text-ink">Near expiry</h2>
      <p className="mb-2 text-xs text-muted">
        Warned but still sellable. FEFO suggests these first at the till.
      </p>
      {items.length === 0 ? (
        <p className="text-sm text-muted">No near-expiry batches within the threshold.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={`${item.batchId}-${item.productId}`}
              className="border border-line px-2 py-2 text-sm"
            >
              <p className="font-medium text-ink">{item.productName}</p>
              <p className="font-mono text-xs text-muted">
                {item.batchNumber} · expires {item.expiresOn} · qty {item.quantity}
              </p>
              <p className="mt-1 text-xs text-warn">Near expiry — still sellable</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
