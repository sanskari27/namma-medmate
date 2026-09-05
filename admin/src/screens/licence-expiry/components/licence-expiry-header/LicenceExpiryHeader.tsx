import { Button, Input, Label } from '@atoms';
import type { Ref } from 'react';

export type LicenceExpiryHeaderProps = {
  denied?: boolean;
  tenantQuery: string;
  busy: boolean;
  rescanRef?: Ref<HTMLButtonElement>;
  onQueryChange: (value: string) => void;
  onIsolate: () => void;
  onRescan: () => void;
};

export function LicenceExpiryHeader({
  denied = false,
  tenantQuery,
  busy,
  rescanRef,
  onQueryChange,
  onIsolate,
  onRescan,
}: LicenceExpiryHeaderProps) {
  return (
    <header className="space-y-4 border-b border-line pb-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-xl text-ink">Licence expiry</h1>
          <p className="mt-1 text-sm text-muted">
            Scan drug licence, GST, FSSAI, and pharmacist papers due across tenants.
          </p>
        </div>
        {denied ? null : (
          <Button ref={rescanRef} type="button" disabled={busy} onClick={onRescan}>
            {busy ? 'Scanning…' : 'Rescan platform'}
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
            <Label htmlFor="licence-tenant-filter">Tenant name</Label>
            <Input
              id="licence-tenant-filter"
              value={tenantQuery}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Isolate one pharmacy"
            />
          </div>
          <Button type="submit" variant="outline">
            Isolate tenant
          </Button>
        </form>
      )}
    </header>
  );
}
