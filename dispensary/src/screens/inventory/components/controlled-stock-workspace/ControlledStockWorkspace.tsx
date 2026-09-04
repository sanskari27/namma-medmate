import { Button, Label } from '@atoms';
import {
  downloadControlledStockExport,
  listControlledStock,
  type ControlledStockLine,
} from '@/services/controlledStock';
import { isApiError } from '@/services/axios';
import { useCallback, useEffect, useId, useState } from 'react';
import type { PageStatus } from '../../InventoryScreen.utils';
import { mapApiStatus } from '../../InventoryScreen.utils';

export type ControlledStockWorkspaceProps = {
  allowed: boolean;
  activeBranchId: string | null;
  onStatusChange: (status: PageStatus) => void;
};

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

export function ControlledStockWorkspace({
  allowed,
  activeBranchId,
  onStatusChange,
}: ControlledStockWorkspaceProps) {
  const formId = useId();
  const [rows, setRows] = useState<ControlledStockLine[]>([]);
  const [schedule, setSchedule] = useState('');
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
  }, [load]);

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

  if (!allowed || !activeBranchId) {
    return null;
  }

  return (
    <div className="grid min-h-0 flex-1 gap-3 overflow-auto">
      <section
        className="flex flex-wrap items-end gap-3 border border-line bg-surface p-3"
        aria-label="Schedule register filters"
      >
        <div className="space-y-1.5">
          <Label htmlFor={`${formId}-schedule`}>Schedule</Label>
          <select
            id={`${formId}-schedule`}
            className="min-w-[10rem] rounded border border-line bg-canvas px-2 py-1.5 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            value={schedule}
            onChange={(event) => setSchedule(event.target.value)}
            disabled={busy}
          >
            <option value="">All schedules</option>
            <option value="H">H</option>
            <option value="H1">H1</option>
            <option value="X">X</option>
            <option value="NDPS">NDPS</option>
          </select>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => void onExport('csv')}
        >
          Download general CSV
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => void onExport('ndps')}
        >
          Download NDPS sheet
        </Button>
      </section>
      <section
        className="min-h-0 overflow-auto border border-line bg-surface"
        aria-label="Schedule movements"
      >
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-surface text-xs text-muted">
            <tr className="border-b border-line">
              <th className="px-3 py-2 font-medium">When (IST)</th>
              <th className="px-3 py-2 font-medium">Type</th>
              <th className="px-3 py-2 font-medium">Pack</th>
              <th className="px-3 py-2 font-medium">Batch</th>
              <th className="px-3 py-2 font-medium">Qty</th>
              <th className="px-3 py-2 font-medium">On hand after</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-line last:border-b-0">
                <td className="px-3 py-2 font-mono text-xs text-ink">
                  {formatIst(row.occurredAt)}
                </td>
                <td className="px-3 py-2 text-ink">{row.movementType}</td>
                <td className="px-3 py-2">
                  <p className="font-medium text-ink">{row.productName}</p>
                  <p className="font-mono text-xs text-muted">
                    {row.sku}
                    {row.scheduleClassification ? ` · ${row.scheduleClassification}` : ''}
                  </p>
                </td>
                <td className="px-3 py-2 font-mono text-xs text-ink">{row.batchNumber ?? '—'}</td>
                <td className="px-3 py-2 font-mono text-ink">{row.quantity}</td>
                <td className="px-3 py-2 font-mono text-ink">{row.balanceAfter}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
