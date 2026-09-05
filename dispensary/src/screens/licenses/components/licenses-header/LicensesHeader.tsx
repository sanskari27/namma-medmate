import { Button, Reveal } from '@atoms';
import type { Ref } from 'react';

export type LicensesHeaderProps = {
  addButtonRef?: Ref<HTMLButtonElement>;
  denied?: boolean;
  onAdd: () => void;
};

export function LicensesHeader({ addButtonRef, denied = false, onAdd }: LicensesHeaderProps) {
  return (
    <Reveal>
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Licences</h1>
          <p className="mt-1 text-sm text-muted">
            Drug licence, GST, FSSAI, and pharmacist registration for this pharmacy.
          </p>
        </div>
        {denied ? null : (
          <Button ref={addButtonRef} type="button" onClick={onAdd}>
            File a licence
          </Button>
        )}
      </header>
    </Reveal>
  );
}
