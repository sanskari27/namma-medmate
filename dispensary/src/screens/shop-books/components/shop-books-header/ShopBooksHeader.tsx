import { Button, Reveal } from '@atoms';
import type { Ref } from 'react';

export type ShopBooksHeaderProps = {
  spreadsheetRef?: Ref<HTMLButtonElement>;
  pdfRef?: Ref<HTMLButtonElement>;
  denied?: boolean;
  busy?: boolean;
  onSpreadsheet: () => void;
  onPdf: () => void;
};

export function ShopBooksHeader({
  spreadsheetRef,
  pdfRef,
  denied = false,
  busy = false,
  onSpreadsheet,
  onPdf,
}: ShopBooksHeaderProps) {
  return (
    <Reveal>
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Shop books</h1>
          <p className="mt-1 text-sm text-muted">
            Day book, GST for the CA, and this shop&apos;s P&amp;L from till facts. Reports stays
            the branch-numbers stub.
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
              Download spreadsheet
            </Button>
            <Button ref={pdfRef} type="button" disabled={busy} onClick={onPdf}>
              Print this book
            </Button>
          </div>
        )}
      </header>
    </Reveal>
  );
}
