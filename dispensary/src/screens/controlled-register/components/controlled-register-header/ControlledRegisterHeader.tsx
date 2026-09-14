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
    <div className="nd-toolbar">
      <div>
        <h2 style={{ margin: 0 }}>NDPS sale book</h2>
        <span className="nd-muted">Who this outlet sold Schedule stock to — rows are not editable</span>
      </div>
      <div className="nd-toolbar-spacer" />
      {denied ? null : (
        <>
          <button ref={spreadsheetRef} type="button" className="nd-btn nd-btn-ghost" disabled={busy} onClick={onSpreadsheet}>
            Spreadsheet
          </button>
          <button ref={ndpsRef} type="button" className="nd-btn nd-btn-primary" disabled={busy} onClick={onNdps}>
            NDPS sheet
          </button>
        </>
      )}
    </div>
  );
}
