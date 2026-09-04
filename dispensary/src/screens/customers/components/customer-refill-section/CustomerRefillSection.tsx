import { Button, Input, Label } from '@atoms';
import type { CustomerRefill } from '@/services/customerRefills';
import { formatDueDate } from '@/services/customerRefills';
import { Pill } from 'lucide-react';
import { useId, useState } from 'react';

export type CustomerRefillSectionProps = {
  refills: CustomerRefill[];
  loading: boolean;
  busy: boolean;
  onAdd: (input: { medicineName: string; intervalDays?: number; nextDueOn?: string }) => void;
  onUpdate: (
    refillId: string,
    input: { intervalDays: number; nextDueOn: string; expectedVersion: number },
  ) => void;
  onRemove: (refillId: string) => void;
};

export function CustomerRefillSection({
  refills,
  loading,
  busy,
  onAdd,
  onUpdate,
  onRemove,
}: CustomerRefillSectionProps) {
  const formId = useId();
  const [medicineName, setMedicineName] = useState('');
  const [intervalDays, setIntervalDays] = useState('');
  const [nextDueOn, setNextDueOn] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editInterval, setEditInterval] = useState('');
  const [editDue, setEditDue] = useState('');

  function submitAdd() {
    const name = medicineName.trim();
    if (!name) {
      return;
    }
    const interval = intervalDays.trim() ? Number(intervalDays) : undefined;
    onAdd({
      medicineName: name,
      intervalDays: interval,
      nextDueOn: nextDueOn.trim() || undefined,
    });
    setMedicineName('');
    setIntervalDays('');
    setNextDueOn('');
  }

  function startEdit(row: CustomerRefill) {
    setEditingId(row.id);
    setEditInterval(String(row.intervalDays));
    setEditDue(row.nextDueOn);
  }

  function submitEdit(row: CustomerRefill) {
    const interval = Number(editInterval);
    if (!Number.isFinite(interval) || interval <= 0 || !editDue.trim()) {
      return;
    }
    onUpdate(row.id, {
      intervalDays: interval,
      nextDueOn: editDue.trim(),
      expectedVersion: row.version,
    });
    setEditingId(null);
  }

  return (
    <div className="grid gap-3 border-t border-line pt-4" aria-label="Refill schedules">
      <div>
        <div className="flex items-center gap-2">
          <Pill className="size-3.5 shrink-0 text-brand" aria-hidden />
          <p className="font-mono text-[11px] tracking-wide text-muted">Refill schedules</p>
        </div>
        <p className="mt-1 text-sm text-muted">
          Per medicine cadence — default 30 days, customize due date on this counter.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted" role="status">
          Loading refill schedules…
        </p>
      ) : refills.length === 0 ? (
        <p className="text-sm text-muted">No refill schedules for this customer yet.</p>
      ) : (
        <ul className="grid gap-1.5">
          {refills.map((row) => (
            <li key={row.id} className="border border-line px-2.5 py-2 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-ink">{row.medicineName}</p>
                  <p className="font-mono text-xs text-muted">
                    every {row.intervalDays}d · due {formatDueDate(row.nextDueOn)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() => startEdit(row)}
                  >
                    Customize
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    onClick={() => onRemove(row.id)}
                  >
                    Remove
                  </Button>
                </div>
              </div>
              {editingId === row.id ? (
                <div className="mt-2 grid gap-2 border-t border-line pt-2 sm:grid-cols-[6rem_minmax(0,1fr)_auto]">
                  <div className="grid gap-1">
                    <Label htmlFor={`${formId}-edit-interval-${row.id}`}>Days</Label>
                    <Input
                      id={`${formId}-edit-interval-${row.id}`}
                      inputMode="numeric"
                      value={editInterval}
                      onChange={(e) => setEditInterval(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor={`${formId}-edit-due-${row.id}`}>Next due</Label>
                    <Input
                      id={`${formId}-edit-due-${row.id}`}
                      type="date"
                      value={editDue}
                      onChange={(e) => setEditDue(e.target.value)}
                    />
                  </div>
                  <div className="flex items-end gap-1.5">
                    <Button type="button" size="sm" disabled={busy} onClick={() => submitEdit(row)}>
                      Save
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={busy}
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-2 border border-dashed border-line p-2.5 sm:grid-cols-[minmax(0,1fr)_5.5rem_minmax(0,9rem)_auto]">
        <div className="grid gap-1">
          <Label htmlFor={`${formId}-medicine`}>Medicine</Label>
          <Input
            id={`${formId}-medicine`}
            value={medicineName}
            onChange={(e) => setMedicineName(e.target.value)}
            placeholder="e.g. Metformin 500"
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor={`${formId}-interval`}>Days</Label>
          <Input
            id={`${formId}-interval`}
            inputMode="numeric"
            value={intervalDays}
            onChange={(e) => setIntervalDays(e.target.value)}
            placeholder="30"
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor={`${formId}-due`}>Next due</Label>
          <Input
            id={`${formId}-due`}
            type="date"
            value={nextDueOn}
            onChange={(e) => setNextDueOn(e.target.value)}
          />
        </div>
        <div className="flex items-end">
          <Button type="button" disabled={busy || !medicineName.trim()} onClick={submitAdd}>
            Add refill
          </Button>
        </div>
      </div>
    </div>
  );
}
