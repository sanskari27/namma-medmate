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
import {
  CalendarClock,
  Download,
  IndianRupee,
  TrendingDown,
} from 'lucide-react';
import { useCallback, useEffect, useId, useState } from 'react';
import { useSelector } from 'react-redux';
import type { PageStatus } from '../../InventoryScreen.utils';
import { mapApiStatus } from '../../InventoryScreen.utils';
import { selectInventorySyncEpoch } from '../../store';
import { InventoryOpsCard, InventoryOpsShell } from '../inventory-ops-shell';
import { OutletStockLevelsForm } from './OutletStockLevelsForm';

export type GuidanceWorkspaceProps = {
  allowed: boolean;
  onStatusChange: (status: PageStatus) => void;
  onStartTransfer: (productId: string) => void;
};

type GuidanceTab = 'low' | 'expiring' | 'settings';

function formatInrFromPaise(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function GuidanceWorkspace({
  allowed,
  onStatusChange,
  onStartTransfer,
}: GuidanceWorkspaceProps) {
  const formId = useId();
  const syncEpoch = useSelector(selectInventorySyncEpoch);
  const [alerts, setAlerts] = useState<InventoryAlerts>({ lowStock: [], nearExpiry: [] });
  const [warnDays, setWarnDays] = useState('30');
  const [valuationPaise, setValuationPaise] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<GuidanceTab>('low');

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
  }, [load, syncEpoch]);

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

  const tabs: Array<{ id: GuidanceTab; label: string }> = [
    { id: 'low', label: `Low stock · ${alerts.lowStock.length}` },
    { id: 'expiring', label: `Near expiry · ${alerts.nearExpiry.length}` },
    { id: 'settings', label: 'Thresholds & levels' },
  ];

  return (
    <InventoryOpsShell
      title="FEFO & reorder"
      subtitle="Near-expiry warnings, low-stock transfer hints, reorder CSV, and valuation."
      action={
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-lg"
          onClick={() => void onDownloadCsv()}
          disabled={busy}
        >
          <Download className="size-3.5" aria-hidden />
          Reorder CSV
        </Button>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <article className="flex items-start gap-3 rounded-xl border border-line/70 bg-surface px-4 py-3">
          <span
            className="inline-grid size-9 shrink-0 place-items-center rounded-lg bg-[#e8eef8] text-[#3b5bdb]"
            aria-hidden
          >
            <IndianRupee className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-xs text-muted">Stock valuation</p>
            <p className="truncate text-xl font-semibold tabular-nums text-ink">
              {valuationPaise == null ? '—' : formatInrFromPaise(valuationPaise)}
            </p>
            <p className="text-xs text-muted">purchase cost</p>
          </div>
        </article>
        <article className="flex items-start gap-3 rounded-xl border border-line/70 bg-surface px-4 py-3">
          <span
            className="inline-grid size-9 shrink-0 place-items-center rounded-lg bg-[#fff1e6] text-warn"
            aria-hidden
          >
            <TrendingDown className="size-4" />
          </span>
          <div>
            <p className="text-xs text-muted">Low stock</p>
            <p className="text-xl font-semibold tabular-nums text-ink">{alerts.lowStock.length}</p>
            <p className="text-xs text-muted">below reorder / min</p>
          </div>
        </article>
        <article className="flex items-start gap-3 rounded-xl border border-line/70 bg-surface px-4 py-3">
          <span
            className="inline-grid size-9 shrink-0 place-items-center rounded-lg bg-[#fde8e8] text-danger"
            aria-hidden
          >
            <CalendarClock className="size-4" />
          </span>
          <div>
            <p className="text-xs text-muted">Near expiry</p>
            <p className="text-xl font-semibold tabular-nums text-ink">
              {alerts.nearExpiry.length}
            </p>
            <p className="text-xs text-muted">within {warnDays} days</p>
          </div>
        </article>
        <article className="flex items-start gap-3 rounded-xl border border-line/70 bg-surface px-4 py-3">
          <span
            className="inline-grid size-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand"
            aria-hidden
          >
            <CalendarClock className="size-4" />
          </span>
          <div>
            <p className="text-xs text-muted">Warn threshold</p>
            <p className="text-xl font-semibold tabular-nums text-ink">{warnDays}</p>
            <p className="text-xs text-muted">days to expiry</p>
          </div>
        </article>
      </div>

      <div
        role="tablist"
        aria-label="Guidance views"
        className="flex flex-wrap items-center gap-1 border-b border-line"
      >
        {tabs.map((item) => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(item.id)}
              className={`-mb-px border-b-2 px-3 py-2 text-sm transition-colors ${
                active
                  ? 'border-ink font-semibold text-ink'
                  : 'border-transparent text-muted hover:text-ink'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {tab === 'low' ? (
        <InventoryOpsCard title="Low stock">
          <LowStockTable items={alerts.lowStock} onStartTransfer={onStartTransfer} busy={busy} />
        </InventoryOpsCard>
      ) : null}

      {tab === 'expiring' ? (
        <InventoryOpsCard title="Near expiry">
          <NearExpiryTable items={alerts.nearExpiry} />
        </InventoryOpsCard>
      ) : null}

      {tab === 'settings' ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <InventoryOpsCard title="Expiry warn days">
            <div className="space-y-3 p-4">
              <p className="text-xs text-muted">
                Batches within this many days show on Near expiry and FEFO prioritises them at the
                till.
              </p>
              <div className="flex flex-wrap items-end gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor={`${formId}-warn`}>Expiry warn days</Label>
                  <Input
                    id={`${formId}-warn`}
                    inputMode="numeric"
                    value={warnDays}
                    onChange={(event) => setWarnDays(event.target.value)}
                    disabled={busy}
                    className="max-w-[8rem] rounded-lg"
                  />
                </div>
                <Button
                  type="button"
                  className="rounded-lg"
                  onClick={() => void onSaveThreshold()}
                  disabled={busy}
                >
                  Save threshold
                </Button>
              </div>
            </div>
          </InventoryOpsCard>
          <InventoryOpsCard title="Outlet stock levels">
            <div className="p-4">
              <OutletStockLevelsForm
                busy={busy}
                onBusyChange={setBusy}
                onStatusChange={onStatusChange}
              />
            </div>
          </InventoryOpsCard>
        </div>
      ) : null}
    </InventoryOpsShell>
  );
}

function LowStockTable({
  items,
  onStartTransfer,
  busy,
}: {
  items: LowStockAlert[];
  onStartTransfer: (productId: string) => void;
  busy: boolean;
}) {
  if (items.length === 0) {
    return <p className="px-4 py-10 text-center text-sm text-muted">No low-stock lines on this outlet.</p>;
  }

  return (
    <div className="overflow-auto">
      <table className="w-full min-w-[48rem] border-collapse text-left text-sm">
        <thead className="sticky top-0 z-10 bg-brand-soft/80 text-[11px] uppercase tracking-wide text-muted backdrop-blur-sm">
          <tr>
            <th className="px-3 py-2.5 font-semibold">Product</th>
            <th className="px-3 py-2.5 font-semibold">On hand</th>
            <th className="px-3 py-2.5 font-semibold">Reorder</th>
            <th className="px-3 py-2.5 font-semibold">Other outlets</th>
            <th className="px-3 py-2.5 font-semibold" />
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.productId} className="border-b border-line/60 last:border-0">
              <td className="px-3 py-3">
                <p className="font-medium text-ink">{item.productName}</p>
                <p className="font-mono text-xs text-muted">{item.productSku}</p>
              </td>
              <td className="px-3 py-3 font-mono text-ink">{item.onHand}</td>
              <td className="px-3 py-3 font-mono text-muted">{item.reorderLevel ?? '—'}</td>
              <td className="px-3 py-3 text-xs text-muted">
                {item.otherBranches.length > 0
                  ? item.otherBranches.map((b) => `${b.branchName} (${b.quantity})`).join(', ')
                  : 'None'}
              </td>
              <td className="px-3 py-3 text-right">
                {item.otherBranches.length > 0 ? (
                  <Button
                    type="button"
                    size="sm"
                    className="rounded-lg"
                    disabled={busy}
                    onClick={() => onStartTransfer(item.productId)}
                  >
                    Start transfer
                  </Button>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function NearExpiryTable({ items }: { items: NearExpiryAlert[] }) {
  if (items.length === 0) {
    return (
      <p className="px-4 py-10 text-center text-sm text-muted">
        No near-expiry batches within the threshold.
      </p>
    );
  }

  return (
    <div className="overflow-auto">
      <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
        <thead className="sticky top-0 z-10 bg-brand-soft/80 text-[11px] uppercase tracking-wide text-muted backdrop-blur-sm">
          <tr>
            <th className="px-3 py-2.5 font-semibold">Product</th>
            <th className="px-3 py-2.5 font-semibold">Batch</th>
            <th className="px-3 py-2.5 font-semibold">Expires</th>
            <th className="px-3 py-2.5 font-semibold">Qty</th>
            <th className="px-3 py-2.5 font-semibold">Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={`${item.batchId}-${item.productId}`}
              className="border-b border-line/60 last:border-0"
            >
              <td className="px-3 py-3">
                <p className="font-medium text-ink">{item.productName}</p>
                <p className="font-mono text-xs text-muted">{item.productSku}</p>
              </td>
              <td className="px-3 py-3 font-mono text-xs text-ink">{item.batchNumber}</td>
              <td className="px-3 py-3 font-mono text-ink">{item.expiresOn}</td>
              <td className="px-3 py-3 font-mono text-ink">{item.quantity}</td>
              <td className="px-3 py-3">
                <span className="inline-flex rounded-full border border-warn/40 bg-[#fff1e6] px-2 py-0.5 text-xs font-medium text-warn">
                  Near expiry — sellable
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
