import { Button, Input, Label } from '@atoms';
import type { CustomerTag } from '@/services/customerRefills';
import { Tags } from 'lucide-react';
import { useId, useState } from 'react';

export type CustomerTagsSectionProps = {
  catalog: CustomerTag[];
  assigned: CustomerTag[];
  loading: boolean;
  busy: boolean;
  onCreateTag: (name: string) => void;
  onReplace: (tagIds: string[]) => void;
};

export function CustomerTagsSection({
  catalog,
  assigned,
  loading,
  busy,
  onCreateTag,
  onReplace,
}: CustomerTagsSectionProps) {
  const formId = useId();
  const [newName, setNewName] = useState('');
  const assignedIds = new Set(assigned.map((tag) => tag.id));

  function toggle(tagId: string) {
    const next = new Set(assignedIds);
    if (next.has(tagId)) {
      next.delete(tagId);
    } else {
      next.add(tagId);
    }
    onReplace([...next]);
  }

  function submitCreate() {
    const name = newName.trim();
    if (!name) {
      return;
    }
    onCreateTag(name);
    setNewName('');
  }

  return (
    <div className="grid gap-3 border-t border-line pt-4" aria-label="Customer tags">
      <div>
        <div className="flex items-center gap-2">
          <Tags className="size-3.5 shrink-0 text-brand" aria-hidden />
          <p className="font-mono text-[11px] tracking-wide text-muted">Customer tags</p>
        </div>
        <p className="mt-1 text-sm text-muted">
          Pharmacy-defined segments (diabetic, senior, high-value) for later campaigns.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted" role="status">
          Loading tags…
        </p>
      ) : (
        <>
          {catalog.length === 0 ? (
            <p className="text-sm text-muted">
              No tags on this pharmacy yet. Add the first segment.
            </p>
          ) : (
            <ul className="flex flex-wrap gap-1.5" aria-label="Tag catalogue">
              {catalog.map((tag) => {
                const on = assignedIds.has(tag.id);
                return (
                  <li key={tag.id}>
                    <button
                      type="button"
                      disabled={busy}
                      aria-pressed={on}
                      onClick={() => toggle(tag.id)}
                      className={
                        on
                          ? 'border border-brand bg-brand-soft px-2 py-1 text-xs font-medium text-ink'
                          : 'border border-line bg-surface px-2 py-1 text-xs text-muted hover:border-brand'
                      }
                    >
                      {tag.name}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {assigned.length > 0 ? (
            <p className="text-xs text-muted">
              On this profile:{' '}
              <span className="text-ink">{assigned.map((tag) => tag.name).join(', ')}</span>
            </p>
          ) : (
            <p className="text-xs text-muted">No tags assigned to this customer.</p>
          )}
        </>
      )}

      <div className="flex flex-wrap items-end gap-2">
        <div className="grid min-w-[12rem] flex-1 gap-1">
          <Label htmlFor={`${formId}-tag`}>New tag</Label>
          <Input
            id={`${formId}-tag`}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. diabetic"
          />
        </div>
        <Button type="button" disabled={busy || !newName.trim()} onClick={submitCreate}>
          Add tag
        </Button>
      </div>
    </div>
  );
}
