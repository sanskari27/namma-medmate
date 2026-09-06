import { Button, Reveal } from '@atoms';
import { ROUTES } from '@/libs/constants/routes.const';
import type { Ref } from 'react';
import { Link } from 'react-router-dom';

export type CampaignsHeaderProps = {
  addButtonRef?: Ref<HTMLButtonElement>;
  denied?: boolean;
  showCaLink?: boolean;
  onAdd: () => void;
};

export function CampaignsHeader({
  addButtonRef,
  denied = false,
  showCaLink = false,
  onAdd,
}: CampaignsHeaderProps) {
  return (
    <Reveal>
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Tag broadcasts</h1>
          <p className="mt-1 text-sm text-muted">
            Prepare a WhatsApp list from saved patient tags. Sending is a later step.
          </p>
        </div>
        {denied ? null : (
          <div className="flex flex-wrap items-center gap-2">
            {showCaLink ? (
              <Link
                to={ROUTES.ACCOUNTANT}
                className="inline-flex h-9 items-center border border-line bg-surface px-3 text-sm text-ink hover:bg-brand-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                Pack for the CA
              </Link>
            ) : null}
            <Button ref={addButtonRef} type="button" onClick={onAdd}>
              New broadcast
            </Button>
          </div>
        )}
      </header>
    </Reveal>
  );
}
