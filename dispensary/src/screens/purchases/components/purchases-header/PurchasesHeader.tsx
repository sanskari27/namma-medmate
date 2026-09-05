import { Button, Reveal } from '@atoms';
import type { Ref } from 'react';

export type PurchasesHeaderProps = {
  addButtonId: string;
  addButtonRef?: Ref<HTMLButtonElement>;
  reorderButtonId?: string;
  reorderButtonRef?: Ref<HTMLButtonElement>;
  denied?: boolean;
  onAdd: () => void;
  onReorderDraft?: () => void;
};

export function PurchasesHeader({
  addButtonId,
  addButtonRef,
  reorderButtonId,
  reorderButtonRef,
  denied = false,
  onAdd,
  onReorderDraft,
}: PurchasesHeaderProps) {
  return (
    <Reveal>
      <header
        className={`border-b border-line pb-3 ${
          denied ? '' : 'flex flex-wrap items-end justify-between gap-3'
        }`}
      >
        <div>
          <p className="font-mono text-xs tracking-wide text-muted">Outlet orders</p>
          <h1 className="text-2xl font-semibold text-ink">Purchases</h1>
          <p className={`mt-1 text-sm text-muted ${denied ? '' : 'max-w-xl'}`}>
            {denied
              ? 'Indents this outlet places with one stockist.'
              : 'One stockist per indent. Growth can draft from the reorder list. Closed or cancelled lines stay frozen.'}
          </p>
        </div>
        {denied ? null : (
          <div className="flex flex-wrap items-center gap-2">
            {onReorderDraft ? (
              <Button
                ref={reorderButtonRef}
                id={reorderButtonId}
                type="button"
                variant="outline"
                onClick={onReorderDraft}
              >
                Draft from reorder
              </Button>
            ) : null}
            <Button ref={addButtonRef} id={addButtonId} type="button" onClick={onAdd}>
              New indent
            </Button>
          </div>
        )}
      </header>
    </Reveal>
  );
}
