import { Button } from '@atoms';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@molecules/dialog/Dialog';

export type StockTakeStartDialogProps = {
  open: boolean;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onCloseFocus?: () => void;
};

export function StockTakeStartDialog({
  open,
  busy,
  onOpenChange,
  onConfirm,
  onCloseFocus,
}: StockTakeStartDialogProps) {
  const close = () => {
    onOpenChange(false);
    window.setTimeout(() => onCloseFocus?.(), 0);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {
          window.setTimeout(() => onCloseFocus?.(), 0);
        }
      }}
    >
      <DialogContent className="max-w-md">
        <DialogTitle>Start physical count</DialogTitle>
        <DialogDescription>
          Book qty on this outlet freezes now. Staff can count batches and come back later. Stock
          still moves only after Adjustments sign-off.
        </DialogDescription>
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button type="button" disabled={busy} onClick={onConfirm}>
            Freeze book qty
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
