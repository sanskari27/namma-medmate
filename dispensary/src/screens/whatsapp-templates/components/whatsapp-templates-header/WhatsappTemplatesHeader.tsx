import { Button, Reveal } from '@atoms';
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
    <Reveal>
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">WhatsApp slots</h1>
          <p className="mt-1 text-sm text-muted">
            Put this pharmacy's name into the approved messages. The wording stays locked.
          </p>
          {displayNumber ? (
            <p className="mt-1 font-mono text-xs text-muted">Sends from {displayNumber}</p>
          ) : null}
        </div>
        {denied ? null : (
          <Button ref={saveRef} type="button" disabled={busy} onClick={onSave}>
            {busy ? 'Saving…' : 'Save slots'}
          </Button>
        )}
      </header>
    </Reveal>
  );
}
