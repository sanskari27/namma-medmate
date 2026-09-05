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
      {lines.map((line, index) => {
        const draft = drafts[index];
        if (!draft) {
          return null;
        }
        return (
          <fieldset
            key={line.id}
            className="grid gap-2 border border-line bg-surface p-3"
            disabled={readOnly}
          >
            <legend className="px-1 text-sm font-medium text-ink">
              {line.productName} <span className="font-mono text-xs text-muted">{line.sku}</span>
            </legend>
            <p className="text-sm text-muted">Received {toNumber(line.quantity)}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-1">
                <Label htmlFor={`${formId}-acc-${line.id}`}>Accepted qty</Label>
                <Input
                  id={`${formId}-acc-${line.id}`}
                  value={draft.accepted}
                  onChange={(event) => onChange(line.id, { accepted: event.target.value })}
                  inputMode="decimal"
                  className="font-mono"
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor={`${formId}-rej-${line.id}`}>Rejected qty</Label>
                <Input
                  id={`${formId}-rej-${line.id}`}
                  value={draft.rejected}
                  onChange={(event) => onChange(line.id, { rejected: event.target.value })}
                  inputMode="decimal"
                  className="font-mono"
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor={`${formId}-batch-${line.id}`}>Batch number</Label>
                <Input
                  id={`${formId}-batch-${line.id}`}
                  value={draft.batchNumber}
                  onChange={(event) => onChange(line.id, { batchNumber: event.target.value })}
                  className="font-mono"
                  autoComplete="off"
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor={`${formId}-mfg-${line.id}`}>Manufactured on</Label>
                <Input
                  id={`${formId}-mfg-${line.id}`}
                  type="date"
                  value={draft.manufacturedOn}
                  onChange={(event) => onChange(line.id, { manufacturedOn: event.target.value })}
                />
              </div>
              <div className="grid gap-1 sm:col-span-2">
                <Label htmlFor={`${formId}-exp-${line.id}`}>Expires on</Label>
                <Input
                  id={`${formId}-exp-${line.id}`}
                  type="date"
                  value={draft.expiresOn}
                  onChange={(event) => onChange(line.id, { expiresOn: event.target.value })}
                />
              </div>
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}
