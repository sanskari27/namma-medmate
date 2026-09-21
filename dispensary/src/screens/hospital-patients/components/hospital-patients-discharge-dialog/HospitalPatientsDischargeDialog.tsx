import { Button } from '@atoms';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@molecules';
import { HOSPITAL_PATIENTS_CONTENT } from '../../HospitalPatientsScreen.content';
import type { SettleDraft } from '../../HospitalPatientsScreen.utils';
import { HospitalPatientsSettleFields } from '../hospital-patients-settle-fields';

type Props = {
  open: boolean;
  unpaidPaise: number;
  draft: SettleDraft;
  busy: boolean;
  message: string | null;
  onDraftChange: (draft: SettleDraft) => void;
  onClose: () => void;
  onConfirm: () => void;
  onCloseAutoFocus: () => void;
};

export function HospitalPatientsDischargeDialog({
  open,
  unpaidPaise,
  draft,
  busy,
  message,
  onDraftChange,
  onClose,
  onConfirm,
  onCloseAutoFocus,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        aria-describedby="hp-discharge-desc"
        className="hp-dialog"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          onCloseAutoFocus();
        }}
      >
        <DialogTitle>{HOSPITAL_PATIENTS_CONTENT.dischargeConfirmTitle}</DialogTitle>
        <DialogDescription id="hp-discharge-desc">
          {unpaidPaise > 0
            ? HOSPITAL_PATIENTS_CONTENT.dischargeHint
            : HOSPITAL_PATIENTS_CONTENT.dischargeConfirm}
        </DialogDescription>
        {message ? (
          <p className="hp-banner" role="alert" data-tone="alert">
            {message}
          </p>
        ) : null}
        {unpaidPaise > 0 ? (
          <HospitalPatientsSettleFields
            idPrefix="hp-discharge"
            draft={draft}
            disabled={busy}
            onChange={onDraftChange}
          />
        ) : null}
        <div className="hp-actions">
          <Button type="button" variant="outline" disabled={busy} onClick={onClose}>
            {HOSPITAL_PATIENTS_CONTENT.cancelDialog}
          </Button>
          <Button type="button" disabled={busy} onClick={onConfirm}>
            {HOSPITAL_PATIENTS_CONTENT.dischargeConfirm}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
