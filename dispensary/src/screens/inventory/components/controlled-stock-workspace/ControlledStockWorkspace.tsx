import { Button, Input } from '@atoms';
import {
  downloadControlledStockExport,
  listControlledStock,
  type ControlledStockLine,
} from '@/services/controlledStock';
import { isApiError } from '@/services/axios';
import { Download, FileSpreadsheet, Search, ShieldAlert } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import type { PageStatus } from '../../InventoryScreen.utils';
import { mapApiStatus } from '../../InventoryScreen.utils';
import { selectInventorySyncEpoch } from '../../store';
import { InventoryOpsCard, InventoryOpsShell } from '../inventory-ops-shell';

export type ControlledStockWorkspaceProps = {
  allowed: boolean;
  activeBranchId: string | null;
  onStatusChange: (status: PageStatus) => void;
};

const SCHEDULE_TABS = [
  { id: '', label: 'All' },
  { id: 'H', label: 'H' },
  { id: 'H1', label: 'H1' },
  { id: 'X', label: 'X' },
  { id: 'NDPS', label: 'NDPS' },
] as const;

function formatIst(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function scheduleBadgeClass(schedule: string | null): string {
  if (schedule === 'NDPS' || schedule === 'X') {
    return 'border-danger/40 bg-[#fde8e8] text-danger';
  }
  if (schedule === 'H1') {
    return 'border-warn/40 bg-[#fff1e6] text-warn';
  }
  return 'border-brand/30 bg-brand-soft text-brand';
}

export function ControlledStockWorkspace({
  allowed,
  activeBranchId,
  onStatusChange,
}: ControlledStockWorkspaceProps) {
  const syncEpoch = useSelector(selectInventorySyncEpoch);
  const [rows, setRows] = useState<ControlledStockLine[]>([]);
  const [schedule, setSchedule] = useState('');
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);

  const filters = schedule ? { schedule } : {};

  const load = useCallback(async () => {
    if (!allowed) {
      onStatusChange('denied');
      return;
    }
    if (!activeBranchId) {
      setRows([]);
      onStatusChange('failure');
      return;
    }
    onStatusChange('loading');
    try {
      const items = await listControlledStock(schedule ? { schedule } : {});
      setRows(items);
      onStatusChange(items.length === 0 ? 'empty' : null);
    } catch (error) {
      onStatusChange(mapApiStatus(error));
    }
  }, [allowed, activeBranchId, onStatusChange, schedule]);

  useEffect(() => {
    void load();
  }, [load, syncEpoch]);

  const onExport = async (format: 'csv' | 'ndps') => {
    setBusy(true);
    try {
      const blob = await downloadControlledStockExport(format, filters);
      downloadBlob(blob, format === 'ndps' ? 'ndps-stock-register.csv' : 'schedule-register.csv');
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      [row.productName, row.sku, row.batchNumber, row.movementType, row.scheduleClassification]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [rows, query]);

  const ndpsCount = rows.filter((r) => r.scheduleClassification === 'NDPS').length;

  if (!allowed || !activeBranchId) {
    return null;
  }

  return (
    <InventoryOpsShell
      title="Schedule register"
      subtitle="H, H1, X, and NDPS movements on this outlet. Export inspector sheets when needed."
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <article className="flex items-start gap-3 rounded-xl border border-line/70 bg-surface px-4 py-3">
          <span
            className="inline-grid size-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand"
            aria-hidden
          >
            <ShieldAlert className="size-4" />
          </span>
          <div>
            <p className="text-xs text-muted">Movements</p>
            <p className="text-xl font-semibold tabular-nums text-ink">{rows.length}</p>
            <p className="text-xs text-muted">
              {schedule ? `schedule ${schedule}` : 'all schedules'}
            </p>
          </div>
        </article>
        <article className="flex items-start gap-3 rounded-xl border border-line/70 bg-surface px-4 py-3">
          <span
            className="inline-grid size-9 shrink-0 place-items-center rounded-lg bg-[#fde8e8] text-danger"
            aria-hidden
          >
            <ShieldAlert className="size-4" />
          </span>
          <div>
            <p className="text-xs text-muted">NDPS lines</p>
            <p className="text-xl font-semibold tabular-nums text-ink">{ndpsCount}</p>
            <p className="text-xs text-muted">in current filter</p>
          </div>
        </article>
      </div>

      <div
        role="tablist"
        aria-label="Schedule filters"
        className="flex flex-wrap items-center gap-1 border-b border-line"
      >
        {SCHEDULE_TABS.map((tab) => {
          const active = schedule === tab.id;
          return (
            <button
              key={tab.id || 'all'}
              type="button"
              role="tab"
              aria-selected={active}
              disabled={busy}
              onClick={() => setSchedule(tab.id)}
              className={`-mb-px border-b-2 px-3 py-2 text-sm transition-colors ${
                active
                  ? 'border-ink font-semibold text-ink'
                  : 'border-transparent text-muted hover:text-ink'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <label className="relative min-w-[14rem] flex-1 max-w-md">
          <span className="sr-only">Search schedule register</span>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
            aria-hidden
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pack, SKU, batch, or movement…"
            className="h-9 rounded-lg pl-9"
            disabled={busy}
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-lg"
            disabled={busy}
            onClick={() => void onExport('csv')}
          >
            <FileSpreadsheet className="size-3.5" aria-hidden />
            General CSV
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-lg"
            disabled={busy}
            onClick={() => void onExport('ndps')}
          >
            <Download className="size-3.5" aria-hidden />
            NDPS sheet
          </Button>
        </div>
      </div>

      <InventoryOpsCard title="Movements">
        <div className="overflow-auto">
          <table className="w-full min-w-[52rem] border-collapse text-left text-sm">
            <thead className="sticky top-0 z-10 bg-brand-soft/80 text-[11px] uppercase tracking-wide text-muted backdrop-blur-sm">
              <tr>
                <th className="px-3 py-2.5 font-semibold">When (IST)</th>
                <th className="px-3 py-2.5 font-semibold">Type</th>
                <th className="px-3 py-2.5 font-semibold">Pack</th>
                <th className="px-3 py-2.5 font-semibold">Schedule</th>
                <th className="px-3 py-2.5 font-semibold">Batch</th>
                <th className="px-3 py-2.5 font-semibold">Qty</th>
                <th className="px-3 py-2.5 font-semibold">On hand after</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-muted">
                    {rows.length === 0
                      ? 'No schedule movements on this outlet yet.'
                      : 'No movements match this search.'}
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr key={row.id} className="border-b border-line/60 last:border-b-0">
                    <td className="px-3 py-2.5 font-mono text-xs text-ink">
                      {formatIst(row.occurredAt)}
                    </td>
                    <td className="px-3 py-2.5 text-ink">{row.movementType}</td>
                    <td className="px-3 py-2.5">
                      <p className="font-medium text-ink">{row.productName}</p>
                      <p className="font-mono text-xs text-muted">{row.sku}</p>
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${scheduleBadgeClass(
                          row.scheduleClassification,
                        )}`}
                      >
                        {row.scheduleClassification ?? '—'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs text-ink">
                      {row.batchNumber ?? '—'}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-ink">{row.quantity}</td>
                    <td className="px-3 py-2.5 font-mono text-ink">{row.balanceAfter}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </InventoryOpsCard>
    </InventoryOpsShell>
  );
}
