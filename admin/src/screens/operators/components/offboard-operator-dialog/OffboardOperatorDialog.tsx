import { Button } from '@atoms';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@molecules';
import type { HqOperator } from '@/services/staff';
import { useEffect, useRef } from 'react';

interface OffboardOperatorDialogProps {
  operator: HqOperator;
  open: boolean;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function OffboardOperatorDialog({
  operator,
  open,
  busy,
  onOpenChange,
  onConfirm,
}: OffboardOperatorDialogProps) {
  const restoreRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) {
      restoreRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
    } else {
      restoreRef.current?.focus();
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined}>
        <DialogTitle>Remove operator access?</DialogTitle>
        <DialogDescription>
          {operator.displayName} will no longer be able to sign in to HQ. Historical records remain.
        </DialogDescription>
        <p className="mt-2 font-mono text-xs text-muted">{operator.email}</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={busy} onClick={() => void onConfirm()}>
            {busy ? 'Removing access' : 'Remove access'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
