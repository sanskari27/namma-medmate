import { Button } from '@atoms';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@molecules';
import type { HospitalDoctor } from '@/services/hospital';
import { HospitalDepartmentFields } from '../hospital-department-fields';
import { HOSPITAL_DEPARTMENTS_CONTENT } from '../../HospitalDepartmentsScreen.content';
import type { DepartmentDraft } from '../../HospitalDepartmentsScreen.utils';

type Props = {
  open: boolean;
  busy: boolean;
  draft: DepartmentDraft;
  doctors: HospitalDoctor[];
  message: string | null;
  onOpenChange: (open: boolean) => void;
  onChange: (patch: Partial<DepartmentDraft>) => void;
  onSave: (trigger: HTMLButtonElement) => void;
};

export function HospitalDepartmentDialog({
  open,
  busy,
  draft,
  doctors,
  message,
  onOpenChange,
  onChange,
  onSave,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby="hd-dialog-desc">
        <DialogTitle>
          {draft.id
            ? HOSPITAL_DEPARTMENTS_CONTENT.editDepartment
            : HOSPITAL_DEPARTMENTS_CONTENT.addDepartment}
        </DialogTitle>
        <DialogDescription id="hd-dialog-desc">
          Name OPD, IPD, or diagnostic units for admissions and OPD Rx.
        </DialogDescription>
        {message ? (
          <p role="alert" className="rounded-md border border-line bg-[#feecec] px-3 py-2 text-sm">
            {message}
          </p>
        ) : null}
        <HospitalDepartmentFields draft={draft} doctors={doctors} disabled={busy} onChange={onChange} />
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
            {HOSPITAL_DEPARTMENTS_CONTENT.cancelDialog}
          </Button>
          <Button type="button" disabled={busy} onClick={(event) => onSave(event.currentTarget)}>
            {HOSPITAL_DEPARTMENTS_CONTENT.saveDepartment}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
