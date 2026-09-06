import { Button, Reveal } from '@atoms';
import type { Ref } from 'react';

export type CaPackHeaderProps = {
  downloadRef?: Ref<HTMLButtonElement>;
  denied?: boolean;
  busy?: boolean;
  onDownload: () => void;
};

export function CaPackHeader({
  downloadRef,
  denied = false,
  busy = false,
  onDownload,
}: CaPackHeaderProps) {
  return (
    <Reveal>
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Pack for the CA</h1>
          <p className="mt-1 text-sm text-muted">
            Categorized shop figures the CA can file from — sales, spend, GST, and dues. Not
            patient papers.
          </p>
        </div>
        {denied ? null : (
          <Button ref={downloadRef} type="button" disabled={busy} onClick={onDownload}>
            Download CA pack
          </Button>
        )}
      </header>
    </Reveal>
  );
}
