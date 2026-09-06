import { Button, Input, Label } from '@atoms';
import type { Ref } from 'react';

export type WhatsappProviderHeaderProps = {
  denied?: boolean;
  uniqueQuery: string;
  busy: boolean;
  rescanRef?: Ref<HTMLButtonElement>;
  onQueryChange: (value: string) => void;
  onIsolate: () => void;
  onRescan: () => void;
};

export function WhatsappProviderHeader({
  denied = false,
  uniqueQuery,
  busy,
  rescanRef,
  onQueryChange,
  onIsolate,
  onRescan,
}: WhatsappProviderHeaderProps) {
  return (
    <header className="space-y-4 border-b border-line pb-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-xl text-ink">WABA templates</h1>
          <p className="mt-1 text-sm text-muted">
            Monitor the MASTER WhatsApp number and Meta-approved structures. Tenant slots stay on
            the pharmacy.
          </p>
        </div>
        {denied ? null : (
          <Button ref={rescanRef} type="button" disabled={busy} onClick={onRescan}>
            {busy ? 'Scanning…' : 'Rescan provider'}
          </Button>
        )}
      </div>
      {denied ? null : (
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            onIsolate();
          }}
        >
          <div className="min-w-56 flex-1 space-y-1.5">
            <Label htmlFor="waba-template-filter">Template unique name</Label>
            <Input
              id="waba-template-filter"
              value={uniqueQuery}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Isolate refill_due"
            />
          </div>
          <Button type="submit" variant="outline">
            Isolate template
          </Button>
        </form>
      )}
    </header>
  );
}
