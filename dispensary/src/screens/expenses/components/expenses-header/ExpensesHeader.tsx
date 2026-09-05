import { Button, Reveal } from '@atoms';
import type { Ref } from 'react';

export type ExpensesHeaderProps = {
  addButtonRef?: Ref<HTMLButtonElement>;
  denied?: boolean;
  onAdd: () => void;
};

export function ExpensesHeader({ addButtonRef, denied = false, onAdd }: ExpensesHeaderProps) {
  return (
    <Reveal>
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Shop spend</h1>
          <p className="mt-1 text-sm text-muted">
            Rent, power, salaries, and miscellaneous for this outlet.
          </p>
        </div>
        {denied ? null : (
          <Button ref={addButtonRef} type="button" onClick={onAdd}>
            Record spend
          </Button>
        )}
      </header>
    </Reveal>
  );
}
