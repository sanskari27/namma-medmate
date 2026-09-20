import { Button } from '@atoms';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@molecules';
import type { HospitalDoctor } from '@/services/hospital';
import { HospitalAdmitIdentityFields } from '../hospital-admit-identity-fields';
import { HospitalAdmitPayerFields } from '../hospital-admit-payer-fields';
import { HospitalAdmitStayFields } from '../hospital-admit-stay-fields';
import { HOSPITAL_WARDS_CONTENT } from '../../HospitalWardsScreen.content';
import type { AdmitDraft } from '../../HospitalWardsScreen.utils';

type Props = {
  open: boolean;
  busy: boolean;
  draft: AdmitDraft;
  doctors: HospitalDoctor[];
  message: string | null;
  onOpenChange: (open: boolean) => void;
  onChange: (patch: Partial<AdmitDraft>) => void;
  onSave: (trigger: HTMLButtonElement) => void;
};

export function HospitalAdmitDialog({
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
      <DialogContent className="max-h-[85vh] overflow-y-auto" aria-describedby="hw-admit-desc">
        <DialogTitle>{HOSPITAL_WARDS_CONTENT.admitPatient}</DialogTitle>
        <DialogDescription id="hw-admit-desc">{HOSPITAL_WARDS_CONTENT.selectBedHint}</DialogDescription>
        <HospitalAdmitIdentityFields draft={draft} disabled={busy} onChange={onChange} />
        <HospitalAdmitStayFields draft={draft} doctors={doctors} disabled={busy} onChange={onChange} />
        <HospitalAdmitPayerFields draft={draft} disabled={busy} onChange={onChange} />
        {message ? (
          <p role="alert" className="rounded-md border border-line bg-[#feecec] px-3 py-2 text-sm">
            {message}
          </p>
        ) : null}
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
            {HOSPITAL_WARDS_CONTENT.cancelDialog}
          </Button>
          <Button type="button" disabled={busy} onClick={(event) => onSave(event.currentTarget)}>
            {HOSPITAL_WARDS_CONTENT.saveAdmission}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
