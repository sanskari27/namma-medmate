import { Button, Reveal } from '@atoms';
import type { Ref } from 'react';
import { DESK_BLURB, DESK_LABEL, type DashboardDesk } from '../../DashboardScreen.utils';

export type DashboardHeaderProps = {
  desk: DashboardDesk | null;
  denied?: boolean;
  busy?: boolean;
  refreshRef?: Ref<HTMLButtonElement>;
  onRefresh: () => void;
};

export function DashboardHeader({
  desk,
  denied = false,
  busy = false,
  refreshRef,
  onRefresh,
}: DashboardHeaderProps) {
  const title = desk ? DESK_LABEL[desk] : 'Today at this outlet';
  const blurb = desk ? DESK_BLURB[desk] : 'Open a desk assigned on your floor roles.';
  return (
    <Reveal>
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{title}</h1>
          <p className="mt-1 text-sm text-muted">{blurb}</p>
        </div>
        {denied ? null : (
          <Button
            ref={refreshRef}
            type="button"
            variant="outline"
            disabled={busy}
            onClick={onRefresh}
          >
            Refresh this desk
          </Button>
        )}
      </header>
    </Reveal>
  );
}
