import { Button, Reveal } from '@atoms';
import { Link } from 'react-router-dom';
import type { Ref } from 'react';
import { ROUTES } from '@/libs/constants/routes.const';

export type CustomReportsHeaderProps = {
  spreadsheetRef?: Ref<HTMLButtonElement>;
  pdfRef?: Ref<HTMLButtonElement>;
  denied?: boolean;
  planGate?: boolean;
  busy?: boolean;
  onSpreadsheet: () => void;
  onPdf: () => void;
};

export function CustomReportsHeader({
  spreadsheetRef,
  pdfRef,
  denied = false,
  planGate = false,
  busy = false,
  onSpreadsheet,
  onPdf,
}: CustomReportsHeaderProps) {
  return (
    <Reveal>
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Build a report</h1>
          <p className="mt-1 text-sm text-muted">
            Pick columns, dates, and this outlet. Download a sheet or print when you need it.
            {planGate ? ' Growth unlocks this builder.' : ''}
          </p>
          {planGate ? (
            <Link
              to={ROUTES.SUBSCRIPTION}
              className="mt-2 inline-block text-sm font-medium text-brand underline-offset-2 hover:underline"
            >
              Open the plan
            </Link>
          ) : null}
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
              Download spreadsheet
            </Button>
            <Button ref={pdfRef} type="button" disabled={busy} onClick={onPdf}>
              Print this report
            </Button>
          </div>
        )}
      </header>
    </Reveal>
  );
}
