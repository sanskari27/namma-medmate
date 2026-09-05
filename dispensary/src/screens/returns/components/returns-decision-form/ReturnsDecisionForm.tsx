import { Button, Input } from '@atoms';
import type { SalesReturnRefundMode } from '@/services/salesReturns';
import type { FormEvent } from 'react';

export type ReturnsDecisionFormProps = {
  reason: string;
  refundMode: SalesReturnRefundMode;
  busy: boolean;
  creditNoteDisabled: boolean;
  onReasonChange: (value: string) => void;
  onRefundModeChange: (value: SalesReturnRefundMode) => void;
  onPreview: () => void;
  onConfirm: (event: FormEvent) => void;
};

export function ReturnsDecisionForm({
  reason,
  refundMode,
  busy,
  creditNoteDisabled,
  onReasonChange,
  onRefundModeChange,
  onPreview,
  onConfirm,
}: ReturnsDecisionFormProps) {
  return (
    <form onSubmit={onConfirm} className="grid gap-3 border border-line bg-surface px-3 py-3">
      <div>
        <label htmlFor="return-reason" className="mb-1 block text-xs text-muted">
          Why is this coming back
        </label>
        <Input
          id="return-reason"
          value={reason}
          onChange={(event) => onReasonChange(event.target.value)}
          placeholder="Wrong strength, unopened, patient cancelled"
        />
      </div>
      <fieldset className="grid gap-1">
        <legend className="text-xs text-muted">Refund</legend>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="radio"
            name="refund-mode"
            value="CASH"
            checked={refundMode === 'CASH'}
            onChange={() => onRefundModeChange('CASH')}
          />
          Cash refund
        </label>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="radio"
            name="refund-mode"
            value="CREDIT_NOTE"
            checked={refundMode === 'CREDIT_NOTE'}
            disabled={creditNoteDisabled}
            onChange={() => onRefundModeChange('CREDIT_NOTE')}
          />
          Credit note on khata
        </label>
      </fieldset>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={onPreview} disabled={busy}>
          Preview refund
        </Button>
        <Button type="submit" disabled={busy}>
          Record return
        </Button>
      </div>
    </form>
  );
}
