import { Button } from '@atoms';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@molecules';
import type { StaffAccount } from '@/services/staff';
import { useEffect, useRef } from 'react';

interface OffboardTillDialogProps {
  staff: StaffAccount;
  open: boolean;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function OffboardTillDialog({
  staff,
  open,
  busy,
  onOpenChange,
  onConfirm,
}: OffboardTillDialogProps) {
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
        <DialogTitle>Remove staff access?</DialogTitle>
        <DialogDescription>
          {staff.displayName} will no longer be able to sign in. Their record remains on file.
        </DialogDescription>
        <p className="mt-2 font-mono text-sm text-ink">{staff.email}</p>
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
