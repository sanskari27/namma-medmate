import { Button } from '@atoms';
import type { CustomerFamily } from '@/services/customerFamilies';
import { UserPlus, Users } from 'lucide-react';
import { formatPhone } from '../../CustomersScreen.utils';

export type CustomerFamilySectionProps = {
  family: CustomerFamily | null;
  familyLoading: boolean;
  selectedCustomerId: string;
  linkButtonRef?: { current: HTMLButtonElement | null };
  unlinkBusy: boolean;
  onLink: () => void;
  onUnlink: (customerId: string) => void;
};

export function CustomerFamilySection({
  family,
  familyLoading,
  selectedCustomerId,
  linkButtonRef,
  unlinkBusy,
  onLink,
  onUnlink,
}: CustomerFamilySectionProps) {
  const memberCount = family?.members.length ?? 0;

  return (
    <div className="grid gap-3 border-t border-line pt-4" aria-label="Family members">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Users className="size-3.5 shrink-0 text-brand" aria-hidden />
            <p className="font-mono text-[11px] tracking-wide text-muted">Family</p>
            {memberCount > 0 ? (
              <span className="font-mono text-[11px] tabular-nums text-muted">
                {memberCount} linked
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-muted">
            Linked profiles stay separate. History rolls up below.
          </p>
        </div>
        <Button
          ref={linkButtonRef}
          type="button"
          variant="outline"
          className="h-9 shrink-0 gap-1.5"
          onClick={onLink}
          aria-haspopup="dialog"
        >
          <UserPlus className="size-3.5" aria-hidden />
          Link member
        </Button>
      </div>

      {familyLoading ? (
        <p role="status" className="px-0.5 text-sm text-muted">
          Loading family…
        </p>
      ) : !family || family.members.length === 0 ? (
        <div className="flex items-start gap-3 border border-dashed border-line bg-canvas/70 px-3 py-3">
          <Users className="mt-0.5 size-4 shrink-0 text-brand/70" aria-hidden />
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink">No family linked yet.</p>
            <p className="mt-0.5 text-xs text-muted">
              Link a dependent on this floor when they share the same household visit.
            </p>
          </div>
        </div>
      ) : (
        <ul className="divide-y divide-line border border-line bg-canvas">
          {family.members.map((member) => {
            const isCurrent = member.id === selectedCustomerId;
            return (
              <li
                key={member.id}
                className={`flex items-center justify-between gap-3 px-3 py-2.5 text-sm ${
                  isCurrent
                    ? 'border-l-2 border-l-brand bg-brand-soft/40'
                    : 'border-l-2 border-l-transparent'
                }`}
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">{member.name}</p>
                  <p className="mt-0.5 font-mono text-xs tabular-nums text-muted">
                    {formatPhone(member.phone)}
                  </p>
                </div>
                {isCurrent ? (
                  <span className="shrink-0 font-mono text-[10px] tracking-wide text-brand">
                    This card
                  </span>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-8 shrink-0 px-2 text-xs"
                    disabled={unlinkBusy}
                    onClick={() => onUnlink(member.id)}
                  >
                    Unlink
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
