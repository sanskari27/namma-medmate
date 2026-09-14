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
    <div className="rg-toolbar">
      <div>
        <h2 style={{ margin: 0 }}>Register book</h2>
        <span className="rg-muted">H1, stock, licence and purchase books for this outlet</span>
      </div>
      <div className="rg-toolbar-spacer" />
      {denied ? null : (
        <>
          <button ref={spreadsheetRef} type="button" className="rg-btn rg-btn-ghost" disabled={busy} onClick={onSpreadsheet}>
            Spreadsheet
          </button>
          <button ref={pdfRef} type="button" className="rg-btn rg-btn-primary" disabled={busy} onClick={onPdf}>
            PDF
          </button>
        </>
      )}
    </div>
  );
}
