import { Button } from '@atoms';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@molecules';
import { HospitalWardFields } from '../hospital-ward-fields';
import { HOSPITAL_WARDS_CONTENT } from '../../HospitalWardsScreen.content';
import type { WardDraft } from '../../HospitalWardsScreen.utils';

type HospitalWardDialogProps = {
  open: boolean;
  busy: boolean;
  draft: WardDraft;
  message: string | null;
  onOpenChange: (open: boolean) => void;
  onChange: (patch: Partial<WardDraft>) => void;
  onSave: (trigger: HTMLButtonElement) => void;
};

export function HospitalWardDialog({
  open,
  busy,
  draft,
  message,
  onOpenChange,
  onChange,
  onSave,
}: HospitalWardDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby="hw-dialog-desc">
        <DialogTitle>{draft.id ? HOSPITAL_WARDS_CONTENT.editWard : HOSPITAL_WARDS_CONTENT.addWard}</DialogTitle>
        <DialogDescription id="hw-dialog-desc">
          Beds are numbered from the code prefix, for example GA-1 through GA-N.
        </DialogDescription>
        {message ? (
          <p role="alert" className="rounded-md border border-line bg-[#feecec] px-3 py-2 text-sm">
            {message}
          </p>
        ) : null}
        <HospitalWardFields draft={draft} disabled={busy} onChange={onChange} />
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
            {HOSPITAL_WARDS_CONTENT.cancelDialog}
          </Button>
          <Button type="button" disabled={busy} onClick={(event) => onSave(event.currentTarget)}>
            {HOSPITAL_WARDS_CONTENT.saveWard}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
