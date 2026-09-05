import { Button, Reveal } from '@atoms';
import type { Ref } from 'react';

export type ControlledRegisterHeaderProps = {
  spreadsheetRef?: Ref<HTMLButtonElement>;
  ndpsRef?: Ref<HTMLButtonElement>;
  denied?: boolean;
  busy?: boolean;
  onSpreadsheet: () => void;
  onNdps: () => void;
};

export function ControlledRegisterHeader({
  spreadsheetRef,
  ndpsRef,
  denied = false,
  busy = false,
  onSpreadsheet,
  onNdps,
}: ControlledRegisterHeaderProps) {
  return (
    <Reveal>
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">NDPS sale book</h1>
          <p className="mt-1 text-sm text-muted">
            Who this outlet sold Schedule stock to — product, batch, Rx, patient, and pharmacist.
            Rows are not editable.
          </p>
        </div>
        {denied ? null : (
          <div className="flex flex-wrap gap-2">
            <Button
              ref={spreadsheetRef}
              type="button"
              variant="outline"
              disabled={busy}
              onClick={onSpreadsheet}
            >
              Take spreadsheet
            </Button>
            <Button ref={ndpsRef} type="button" disabled={busy} onClick={onNdps}>
              NDPS sheet
            </Button>
          </div>
        )}
      </header>
    </Reveal>
  );
}
