import type { Ref } from 'react';

export type WhatsappTemplatesHeaderProps = {
  saveRef?: Ref<HTMLButtonElement>;
  denied?: boolean;
  busy?: boolean;
  displayNumber?: string | null;
  onSave: () => void;
};

export function WhatsappTemplatesHeader({
  saveRef,
  denied = false,
  busy = false,
  displayNumber,
  onSave,
}: WhatsappTemplatesHeaderProps) {
  return (
    <div className="ws-toolbar">
      <div>
        <h2 style={{ margin: 0 }}>WhatsApp slots</h2>
        <span className="ws-muted">
          Put this pharmacy's name into the approved messages. The wording stays locked.
          {displayNumber ? ` Sends from ${displayNumber}.` : ''}
        </span>
      </div>
      <div className="ws-toolbar-spacer" />
      {denied ? null : (
        <button ref={saveRef} type="button" className="ws-btn ws-btn-primary" disabled={busy} onClick={onSave}>
          {busy ? 'Saving…' : 'Save slots'}
        </button>
      )}
    </div>
  );
}
