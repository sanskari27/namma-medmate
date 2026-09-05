import { Button, Input, Label } from '@atoms';
import { useEffect } from 'react';

interface PosAckFooterProps {
  reason: string;
  onReasonChange: (value: string) => void;
  onEvaluate: () => void;
  onComplete: () => void;
  onSave: () => void;
  onHold: () => void;
  evaluateDisabled: boolean;
  completeDisabled: boolean;
  saveDisabled: boolean;
  holdDisabled: boolean;
  busy: boolean;
  showReason: boolean;
}

export function PosAckFooter({
  reason,
  onReasonChange,
  onEvaluate,
  onComplete,
  onSave,
  onHold,
  evaluateDisabled,
  completeDisabled,
  saveDisabled,
  holdDisabled,
  busy,
  showReason,
}: PosAckFooterProps) {
  useEffect(() => {
    if (showReason) {
      document.getElementById('pos-ack-reason')?.focus();
    }
  }, [showReason]);

  return (
    <footer className="sticky bottom-0 space-y-3 border-t border-line bg-canvas/95 px-1 py-3 backdrop-blur">
      {showReason ? (
        <div className="space-y-1.5">
          <Label htmlFor="pos-ack-reason">Review reason</Label>
          <Input
            id="pos-ack-reason"
            value={reason}
            onChange={(event) => onReasonChange(event.target.value)}
            placeholder="Why is this sale proceeding after review?"
            disabled={busy}
            aria-required
          />
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onEvaluate}
          disabled={evaluateDisabled || busy}
        >
          Check draft
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onComplete}
          disabled={completeDisabled || busy}
        >
          Complete check
        </Button>
        <Button type="button" variant="outline" onClick={onHold} disabled={holdDisabled || busy}>
          Hold bill
        </Button>
        <Button type="button" onClick={onSave} disabled={saveDisabled || busy}>
          Save bill
        </Button>
      </div>
    </footer>
  );
}
