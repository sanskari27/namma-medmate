import { Button, Reveal } from '@atoms';
import type { Ref } from 'react';

export type CustomersHeaderProps = {
  addButtonId: string;
  addButtonRef?: Ref<HTMLButtonElement>;
  denied?: boolean;
  onAdd: () => void;
};

export function CustomersHeader({
  addButtonId,
  addButtonRef,
  denied = false,
  onAdd,
}: CustomersHeaderProps) {
  return (
    <Reveal>
      <header
        className={`border-b border-line pb-3 ${
          denied ? '' : 'flex flex-wrap items-end justify-between gap-3'
        }`}
      >
        <div>
          <p className="font-mono text-xs tracking-wide text-muted">Floor CRM</p>
          <h1 className="text-2xl font-semibold text-ink">Customers</h1>
          <p className={`mt-1 text-sm text-muted ${denied ? '' : 'max-w-xl'}`}>
            {denied
              ? 'Walk-ins and regulars at this pharmacy.'
              : 'Tenant-wide profiles shared across outlets. Phone is unique for this pharmacy — look up before billing a walk-in.'}
          </p>
        </div>
        {denied ? null : (
          <Button
            ref={addButtonRef}
            id={addButtonId}
            type="button"
            onClick={onAdd}
            aria-haspopup="dialog"
          >
            Add customer
          </Button>
        )}
      </header>
    </Reveal>
  );
}
