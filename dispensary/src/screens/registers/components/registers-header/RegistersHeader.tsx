import { Button, Reveal } from '@atoms';
import type { Ref } from 'react';

export type RegistersHeaderProps = {
  spreadsheetRef?: Ref<HTMLButtonElement>;
  pdfRef?: Ref<HTMLButtonElement>;
  denied?: boolean;
  busy?: boolean;
  onSpreadsheet: () => void;
  onPdf: () => void;
};

export function RegistersHeader({
  spreadsheetRef,
  pdfRef,
  denied = false,
  busy = false,
  onSpreadsheet,
  onPdf,
}: RegistersHeaderProps) {
  return (
    <Reveal>
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Register book</h1>
          <p className="mt-1 text-sm text-muted">
            H1, stock, licence and purchase books for this outlet — one-click spreadsheet or PDF from
            the till facts. Separate from branch numbers under Reports.
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
            <Button ref={pdfRef} type="button" disabled={busy} onClick={onPdf}>
              Take PDF
            </Button>
          </div>
        )}
      </header>
    </Reveal>
  );
}
