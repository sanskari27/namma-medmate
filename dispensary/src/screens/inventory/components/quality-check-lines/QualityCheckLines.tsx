import { Input, Label } from '@atoms';
import type { GoodsReceiptQcLine } from '@/services/goodsReceipts';
import type { QcLineDraft } from '../quality-check-workspace/QualityCheckWorkspace.utils';
import { toNumber } from '../quality-check-workspace/QualityCheckWorkspace.utils';

export type QualityCheckLinesProps = {
  formId: string;
  lines: GoodsReceiptQcLine[];
  drafts: QcLineDraft[];
  readOnly: boolean;
  onChange: (goodsReceiptLineId: string, patch: Partial<QcLineDraft>) => void;
};

export function QualityCheckLines({
  formId,
  lines,
  drafts,
  readOnly,
  onChange,
}: QualityCheckLinesProps) {
  return (
    <div className="grid gap-3">
      <h3 className="text-sm font-semibold text-ink">Line quantities</h3>
      {lines.map((line, index) => {
        const draft = drafts[index];
        if (!draft) {
          return null;
        }
        return (
          <fieldset
            key={line.id}
            className="grid gap-3 rounded-xl border border-line/70 bg-surface p-4"
            disabled={readOnly}
          >
            <legend className="px-1">
              <span className="text-sm font-medium text-ink">{line.productName}</span>{' '}
              <span className="font-mono text-xs text-muted">{line.sku}</span>
            </legend>
            <p className="text-xs text-muted">
              Received <span className="font-mono text-ink">{toNumber(line.quantity)}</span>
              {line.requiresBatchTracking ? ' · batch tracking required' : ''}
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="grid gap-1.5">
                <Label htmlFor={`${formId}-acc-${line.id}`}>Accepted qty</Label>
                <Input
                  id={`${formId}-acc-${line.id}`}
                  value={draft.accepted}
                  onChange={(event) => onChange(line.id, { accepted: event.target.value })}
                  inputMode="decimal"
                  className="rounded-lg font-mono"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor={`${formId}-rej-${line.id}`}>Rejected qty</Label>
                <Input
                  id={`${formId}-rej-${line.id}`}
                  value={draft.rejected}
                  onChange={(event) => onChange(line.id, { rejected: event.target.value })}
                  inputMode="decimal"
                  className="rounded-lg font-mono"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor={`${formId}-batch-${line.id}`}>Batch number</Label>
                <Input
                  id={`${formId}-batch-${line.id}`}
                  value={draft.batchNumber}
                  onChange={(event) => onChange(line.id, { batchNumber: event.target.value })}
                  className="rounded-lg font-mono"
                  autoComplete="off"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor={`${formId}-mfg-${line.id}`}>Manufactured on</Label>
                <Input
                  id={`${formId}-mfg-${line.id}`}
                  type="date"
                  value={draft.manufacturedOn}
                  onChange={(event) => onChange(line.id, { manufacturedOn: event.target.value })}
                  className="rounded-lg"
                />
              </div>
              <div className="grid gap-1.5 sm:col-span-2 lg:col-span-1">
                <Label htmlFor={`${formId}-exp-${line.id}`}>Expires on</Label>
                <Input
                  id={`${formId}-exp-${line.id}`}
                  type="date"
                  value={draft.expiresOn}
                  onChange={(event) => onChange(line.id, { expiresOn: event.target.value })}
                  className="rounded-lg"
                />
              </div>
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}
