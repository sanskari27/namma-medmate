import { Button } from '@atoms';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@molecules/dialog/Dialog';

export type QualityCheckConfirmDialogProps = {
  open: boolean;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onCloseFocus?: () => void;
};

export function QualityCheckConfirmDialog({
  open,
  busy,
  onOpenChange,
  onConfirm,
  onCloseFocus,
}: QualityCheckConfirmDialogProps) {
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
        <DialogTitle>Accept onto floor?</DialogTitle>
        <DialogDescription>
          Accepted packs become sellable stock. Rejected packs stay off the shelf — no return is
          raised from this screen.
        </DialogDescription>
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button type="button" disabled={busy} onClick={onConfirm}>
            Confirm accept
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
