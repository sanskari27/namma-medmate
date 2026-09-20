import { Button } from '@atoms';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@molecules';
import type { HospitalDepartment } from '@/services/hospital';
import { HospitalDoctorContactFields } from '../hospital-doctor-contact-fields';
import { HospitalDoctorIdentityFields } from '../hospital-doctor-identity-fields';
import { HospitalDoctorPracticeFields } from '../hospital-doctor-practice-fields';
import { HOSPITAL_DOCTORS_CONTENT } from '../../HospitalDoctorsScreen.content';
import type { DoctorDraft } from '../../HospitalDoctorsScreen.utils';

type Props = {
  open: boolean;
  busy: boolean;
  draft: DoctorDraft;
  departments: HospitalDepartment[];
  message: string | null;
  onOpenChange: (open: boolean) => void;
  onChange: (patch: Partial<DoctorDraft>) => void;
  onSave: (trigger: HTMLButtonElement) => void;
};

export function HospitalDoctorDialog({
  open,
  busy,
  draft,
  departments,
  message,
  onOpenChange,
  onChange,
  onSave,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto" aria-describedby="hdoc-dialog-desc">
        <DialogTitle>
          {draft.doctorId ? HOSPITAL_DOCTORS_CONTENT.editDoctor : HOSPITAL_DOCTORS_CONTENT.addDoctor}
        </DialogTitle>
        <DialogDescription id="hdoc-dialog-desc">
          {HOSPITAL_DOCTORS_CONTENT.noLoginNote}
        </DialogDescription>
        <div className="hdoc-form-grid">
          <HospitalDoctorIdentityFields draft={draft} disabled={busy} onChange={onChange} />
          <HospitalDoctorContactFields draft={draft} disabled={busy} onChange={onChange} />
          <HospitalDoctorPracticeFields
            draft={draft}
            departments={departments}
            disabled={busy}
            onChange={onChange}
          />
        </div>
        {message ? (
          <p role="alert" className="rounded-md border border-line bg-[#feecec] px-3 py-2 text-sm">
            {message}
          </p>
        ) : null}
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
            {HOSPITAL_DOCTORS_CONTENT.cancelDialog}
          </Button>
          <Button type="button" disabled={busy} onClick={(event) => onSave(event.currentTarget)}>
            {HOSPITAL_DOCTORS_CONTENT.saveDoctor}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
