import type { DialogStatus } from './doctorDialog.types';

const COPY: Record<Exclude<DialogStatus, null>, string> = {
  loading: 'Saving doctor reference…',
  empty: 'Enter a doctor name to continue.',
  validation: 'Name is required for a doctor reference.',
  denied: 'This till cannot manage doctor references.',
  conflict: 'That registration number is already on file.',
  failure: 'Could not save the doctor. Try again.',
  success: 'Doctor reference saved.',
};

export function DoctorDialogStatus({
  status,
  statusId,
}: {
  status: DialogStatus;
  statusId: string;
}) {
  if (!status) {
    return null;
  }
  const role =
    status === 'failure' || status === 'denied' || status === 'conflict' ? 'alert' : 'status';
  return (
    <p id={statusId} role={role} className="text-sm text-muted">
      {COPY[status]}
    </p>
  );
}
