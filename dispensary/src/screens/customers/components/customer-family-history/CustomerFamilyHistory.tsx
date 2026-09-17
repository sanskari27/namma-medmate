import { Label } from '@atoms';
import type { FamilyHistoryItem, FamilyMember } from '@/services/customerFamilies';
import { ScrollText } from 'lucide-react';
import { useId } from 'react';

export type CustomerFamilyHistoryProps = {
  familyId: string | null;
  members: FamilyMember[];
  items: FamilyHistoryItem[];
  loading: boolean;
  memberFilter: string;
  typeFilter: string;
  onMemberFilter: (value: string) => void;
  onTypeFilter: (value: string) => void;
};

const selectClassName =
  'h-9 w-full border border-line bg-surface px-2.5 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand';

export function CustomerFamilyHistory({
  familyId,
  members,
  items,
  loading,
  memberFilter,
  typeFilter,
  onMemberFilter,
  onTypeFilter,
}: CustomerFamilyHistoryProps) {
  const formId = useId();

  if (!familyId) {
    return null;
  }

  return (
    <div className="grid gap-3 border-t border-line pt-4" aria-label="Family history">
      <div>
        <div className="flex items-center gap-2">
          <ScrollText className="size-3.5 shrink-0 text-brand" aria-hidden />
          <p className="font-mono text-[11px] tracking-wide text-muted">Collective history</p>
        </div>
        <p className="mt-1 text-sm text-muted">
          Purchases and prescriptions stay tagged to each member.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="grid gap-1">
          <Label htmlFor={`${formId}-member`} className="text-xs text-muted">
            Member
          </Label>
          <select
            id={`${formId}-member`}
            className={selectClassName}
            value={memberFilter}
            onChange={(event) => onMemberFilter(event.target.value)}
          >
            <option value="">All members</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1">
          <Label htmlFor={`${formId}-type`} className="text-xs text-muted">
            Type
          </Label>
          <select
            id={`${formId}-type`}
            className={selectClassName}
            value={typeFilter}
            onChange={(event) => onTypeFilter(event.target.value)}
          >
            <option value="">All types</option>
            <option value="PURCHASE">Purchase</option>
            <option value="PRESCRIPTION">Prescription</option>
          </select>
        </div>
      </div>

      <div className="min-h-[4.5rem]">
        {loading ? (
          <p role="status" className="px-0.5 text-sm text-muted">
            Loading history…
          </p>
        ) : items.length === 0 ? (
          <div className="flex h-full min-h-[4.5rem] items-start gap-3 border border-dashed border-line bg-canvas/70 px-3 py-3">
            <ScrollText className="mt-0.5 size-4 shrink-0 text-brand/70" aria-hidden />
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink">
                No purchase or prescription history for this family yet.
              </p>
              <p className="mt-0.5 text-xs text-muted">
                Sales posted later will show here with the member who bought them.
              </p>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-line border border-line bg-canvas">
            {items.map((item) => (
              <li key={item.id} className="grid gap-1 px-3 py-2.5 text-sm">
                <p className="font-medium text-ink">{item.summary}</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                  <span className="font-medium text-ink">{item.customerName}</span>
                  <span className="font-mono text-[10px] tracking-wide uppercase text-muted">
                    {item.type}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
